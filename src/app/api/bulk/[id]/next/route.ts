import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { consumeTokens } from "@/lib/tokens";
import { analyzeCompetitors } from "@/lib/analyzer";
import { generateOutline, generateArticle } from "@/lib/generator";

export const maxDuration = 120;

// 次のキーワードを処理
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // ユーザーID取得
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "ユーザー取得に失敗" }, { status: 500 });
    }

    // バッチジョブ取得
    const { data: batch, error: batchError } = await supabase
      .from("batch_jobs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: "バッチジョブが見つかりません" }, { status: 404 });
    }

    if (batch.status === "completed" || batch.status === "cancelled") {
      return NextResponse.json({
        status: "completed",
        progress: {
          completed: batch.completed_count,
          failed: batch.failed_count,
          total: batch.total_keywords,
        },
      });
    }

    // 次の未処理キーワードを探す
    const keywords = batch.keywords as { keyword: string; status: string }[];
    const nextIndex = keywords.findIndex((k) => k.status === "pending");

    if (nextIndex === -1) {
      // 全キーワード処理済み
      await supabase
        .from("batch_jobs")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", id);

      return NextResponse.json({
        status: "completed",
        progress: {
          completed: batch.completed_count,
          failed: batch.failed_count,
          total: batch.total_keywords,
        },
      });
    }

    const currentKeyword = keywords[nextIndex].keyword;
    const options = (batch.options || {}) as { tone?: string; customPrompt?: string };

    // トークン消費: analyze + generate
    const analyzeResult = await consumeTokens(session.user.email, "analyze");
    if (!analyzeResult.success) {
      await supabase
        .from("batch_jobs")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", id);

      return NextResponse.json(
        { error: "トークンが不足しています", needTokens: true },
        { status: 403 }
      );
    }

    const generateResult = await consumeTokens(session.user.email, "generate");
    if (!generateResult.success) {
      await supabase
        .from("batch_jobs")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", id);

      return NextResponse.json(
        { error: "トークンが不足しています", needTokens: true },
        { status: 403 }
      );
    }

    let result: { keyword: string; status: string; articleId?: string; title?: string; seoScore?: number; error?: string };

    try {
      // 1. 競合分析
      const analysis = await analyzeCompetitors(currentKeyword);

      // 2. 構成案生成
      const outline = await generateOutline(currentKeyword, analysis);

      // 3. 記事生成
      const targetWordCount = Math.round(analysis.avgWordCount * 1.2) || 6000;
      const article = await generateArticle(
        currentKeyword,
        outline,
        analysis.cooccurrence.map((w) => w.word),
        targetWordCount,
        { tone: options.tone || "default", customPrompt: options.customPrompt }
      );

      // 4. 記事保存
      const scoreData = article.seoScore || { overall: 0, details: { actualWordCount: article.wordCount || 0 } };

      const { data: savedArticle, error: saveError } = await supabase
        .from("articles")
        .insert({
          user_id: user.id,
          keyword: currentKeyword,
          title: article.title,
          meta_description: article.metaDescription,
          content: article.content,
          seo_score: scoreData,
          status: "published",
          batch_id: id,
        })
        .select("id")
        .single();

      if (saveError) {
        console.error("Article save error:", saveError);
        throw new Error("記事の保存に失敗しました");
      }

      result = {
        keyword: currentKeyword,
        status: "completed",
        articleId: savedArticle.id,
        title: article.title,
        seoScore: article.seoScore.overall,
      };
    } catch (e: any) {
      console.error(`Bulk generation error for "${currentKeyword}":`, e);
      result = {
        keyword: currentKeyword,
        status: "failed",
        error: e.message || "生成に失敗しました",
      };
    }

    // バッチジョブ更新
    const updatedKeywords = [...keywords];
    updatedKeywords[nextIndex] = { ...updatedKeywords[nextIndex], status: result.status };

    const updatedResults = [...(batch.results as any[]), result];
    const completedCount = result.status === "completed" ? batch.completed_count + 1 : batch.completed_count;
    const failedCount = result.status === "failed" ? batch.failed_count + 1 : batch.failed_count;

    const allDone = completedCount + failedCount >= batch.total_keywords;

    await supabase
      .from("batch_jobs")
      .update({
        keywords: updatedKeywords,
        results: updatedResults,
        completed_count: completedCount,
        failed_count: failedCount,
        status: allDone ? "completed" : "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // トークン残高更新イベント用
    return NextResponse.json({
      status: allDone ? "completed" : "processing",
      current: result,
      progress: {
        completed: completedCount,
        failed: failedCount,
        total: batch.total_keywords,
      },
      remaining: generateResult.remaining,
    });
  } catch (error) {
    console.error("Bulk next error:", error);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
