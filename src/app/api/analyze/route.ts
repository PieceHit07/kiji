import { NextRequest, NextResponse } from "next/server";
import { analyzeCompetitors } from "@/lib/analyzer";
import { generateOutline } from "@/lib/generator";

export const maxDuration = 30; // Vercel function timeout

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword } = body;

    if (!keyword || typeof keyword !== "string") {
      return NextResponse.json(
        { error: "キーワードを入力してください" },
        { status: 400 }
      );
    }

    const trimmed = keyword.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      return NextResponse.json(
        { error: "キーワードは2〜100文字で入力してください" },
        { status: 400 }
      );
    }

    // 1. 競合分析
    const analysis = await analyzeCompetitors(trimmed);

    // 2. 構成案生成
    const outline = await generateOutline(trimmed, analysis);

    // 3. レスポンス
    return NextResponse.json({
      keyword: trimmed,
      competitors: analysis.competitors.map((c) => ({
        rank: c.rank,
        title: c.title,
        url: c.url,
        wordCount: c.wordCount,
        headingCount: c.headings.filter((h) => h.tag === "h2").length,
      })),
      cooccurrence: analysis.cooccurrence.slice(0, 20),
      outline,
      seoTargets: {
        recommendedWordCount: Math.round(analysis.avgWordCount * 1.1), // 競合平均+10%
        avgWordCount: analysis.avgWordCount,
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "分析中にエラーが発生しました。再度お試しください。" },
      { status: 500 }
    );
  }
}
