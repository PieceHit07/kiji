import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkBatchTokens } from "@/lib/tokens";

// バッチジョブ作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const body = await request.json();
    const { keywords, options } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length < 2) {
      return NextResponse.json(
        { error: "キーワードを2件以上入力してください" },
        { status: 400 }
      );
    }

    if (keywords.length > 50) {
      return NextResponse.json(
        { error: "一度に処理できるキーワードは50件までです" },
        { status: 400 }
      );
    }

    // 空白・重複を除去
    const trimmed = keywords.map((k: string) => k.trim()).filter((k: string) => k.length >= 2);
    const cleanKeywords = Array.from(new Set(trimmed));

    if (cleanKeywords.length < 2) {
      return NextResponse.json(
        { error: "有効なキーワードが2件以上必要です" },
        { status: 400 }
      );
    }

    // プランチェック + トークン事前確認
    const tokenCheck = await checkBatchTokens(session.user.email, cleanKeywords.length);

    if (tokenCheck.plan === "free") {
      return NextResponse.json(
        { error: "一括生成はPro/Businessプラン限定です" },
        { status: 403 }
      );
    }

    if (!tokenCheck.canProceed) {
      return NextResponse.json(
        {
          error: `トークンが不足しています（必要: ${tokenCheck.required}, 残り: ${tokenCheck.remaining}）`,
          needTokens: true,
          remaining: tokenCheck.remaining,
          required: tokenCheck.required,
        },
        { status: 403 }
      );
    }

    // ユーザーID取得
    const supabase = getSupabaseAdmin();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "ユーザー取得に失敗" }, { status: 500 });
    }

    // バッチジョブ作成
    const keywordsJson = cleanKeywords.map((k: string) => ({ keyword: k, status: "pending" }));

    const { data: batch, error } = await supabase
      .from("batch_jobs")
      .insert({
        user_id: user.id,
        status: "processing",
        total_keywords: cleanKeywords.length,
        keywords: keywordsJson,
        results: [],
        options: options || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("Batch job creation error:", error);
      return NextResponse.json({ error: "バッチジョブの作成に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({
      id: batch.id,
      totalKeywords: cleanKeywords.length,
      requiredTokens: tokenCheck.required,
    });
  } catch (error) {
    console.error("Bulk creation error:", error);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}

// バッチジョブ一覧取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "ユーザー取得に失敗" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("batch_jobs")
      .select("id, status, total_keywords, completed_count, failed_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Batch list error:", error);
      return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Bulk list error:", error);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
