import { NextRequest, NextResponse } from "next/server";
import { generateArticle } from "@/lib/generator";
import type { OutlineItem } from "@/lib/generator";

export const maxDuration = 60; // 記事生成は時間がかかる

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, outline, cooccurrence, targetWordCount } = body;

    if (!keyword || !outline || !Array.isArray(outline)) {
      return NextResponse.json(
        { error: "必要なパラメータが不足しています" },
        { status: 400 }
      );
    }

    // バリデーション
    const validOutline: OutlineItem[] = outline.filter(
      (item: any) =>
        item.tag &&
        item.text &&
        ["h1", "h2", "h3"].includes(item.tag)
    );

    if (validOutline.length < 3) {
      return NextResponse.json(
        { error: "構成案には最低3つの見出しが必要です" },
        { status: 400 }
      );
    }

    const cooccurrenceWords: string[] = (cooccurrence || [])
      .map((w: any) => (typeof w === "string" ? w : w.word))
      .filter(Boolean);

    const target = targetWordCount || 6000;

    // 記事生成
    const article = await generateArticle(
      keyword,
      validOutline,
      cooccurrenceWords,
      target
    );

    return NextResponse.json({
      title: article.title,
      metaDescription: article.metaDescription,
      content: article.content,
      wordCount: article.wordCount,
      seoScore: article.seoScore,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "記事生成中にエラーが発生しました。再度お試しください。" },
      { status: 500 }
    );
  }
}
