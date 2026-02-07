import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumeTokens } from "@/lib/tokens";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const tokenResult = await consumeTokens(session.user.email, "cooccurrence");
    if (!tokenResult.success) {
      return NextResponse.json(
        { error: "トークンが不足しています", needTokens: true, remaining: tokenResult.remaining },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { keyword } = body;

    if (!keyword || typeof keyword !== "string") {
      return NextResponse.json(
        { error: "キーワードを入力してください" },
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

    const prompt = `あなたはSEOの専門家です。
「${keyword}」というキーワードで検索上位を獲得するために必要な共起語・関連語を30個リストアップしてください。

条件：
- 検索意図を網羅する関連キーワード
- 記事に含めるべき専門用語
- ユーザーが知りたい関連トピック
- 重要度が高い順に並べる

JSON形式で出力（説明不要）:
{"words":[{"word":"共起語1","importance":"high"},{"word":"共起語2","importance":"medium"},...]}

importanceは high/medium/low の3段階`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData?.error?.message || "共起語の取得に失敗しました";
      console.error("OpenAI API error:", errData);
      if (res.status === 401) {
        return NextResponse.json(
          { error: "OpenAI APIキーが無効です。正しいキーを設定してください。" },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: errMsg },
        { status: 500 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json({
      keyword,
      words: parsed.words || [],
    });
  } catch (error) {
    console.error("Cooccurrence error:", error);
    return NextResponse.json(
      { error: "共起語の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
