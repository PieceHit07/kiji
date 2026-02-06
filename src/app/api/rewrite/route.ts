import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, instruction } = body;

    if (!content) {
      return NextResponse.json(
        { error: "記事内容を入力してください" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI APIキーが設定されていません" },
        { status: 500 }
      );
    }

    const defaultInstruction = instruction || "SEOを意識して、より読みやすく、情報量を増やしてリライトしてください。見出し構成は維持してください。";

    const prompt = `あなたはSEOに精通したプロのWebライターです。

以下の記事をリライトしてください。

【リライト指示】
${defaultInstruction}

【元の記事】
${content}

リライトルール：
- 見出し構成（H1, H2, H3）は基本的に維持
- 文章をより具体的で読みやすくする
- 情報の正確性を保つ
- HTML形式で出力（h1, h2, h3, p タグ）

HTML出力のみ（説明不要）:`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 8000,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "リライトに失敗しました" },
        { status: 500 }
      );
    }

    const data = await res.json();
    let rewrittenContent = data.choices?.[0]?.message?.content || "";

    // コードブロックのマークダウン記法を除去
    rewrittenContent = rewrittenContent
      .replace(/^```html?\n?/i, "")
      .replace(/\n?```$/i, "");

    // 文字数カウント
    const textOnly = rewrittenContent.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
    const wordCount = textOnly.length;

    return NextResponse.json({
      content: rewrittenContent,
      wordCount,
    });
  } catch (error) {
    console.error("Rewrite error:", error);
    return NextResponse.json(
      { error: "リライト中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
