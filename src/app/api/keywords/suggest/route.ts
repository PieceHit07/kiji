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

    const tokenResult = await consumeTokens(session.user.email, "keywords");
    if (!tokenResult.success) {
      return NextResponse.json(
        { error: "トークンが不足しています", needTokens: true, remaining: tokenResult.remaining },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { topic } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      return NextResponse.json(
        { error: "トピックを2文字以上で入力してください" },
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

    const prompt = `あなたはSEOキーワード選定の専門家です。

以下のトピック・ニッチについて、SEO記事のターゲットキーワードとして有望なものを15個提案してください。

【トピック】${topic.trim()}

各キーワードについて以下を評価してください：
- searchVolume: 推定検索ボリューム（high/medium/low）
- competition: 競合の強さ（high/medium/low）
- priority: おすすめ度（high=今すぐ狙うべき, medium=余裕があれば, low=将来的に）
- longTail: ロングテール派生キーワード（2〜3個）
- reason: このキーワードをおすすめする理由（1文）

選定基準：
- 検索意図が明確で記事が書きやすいもの
- 競合が弱く上位表示しやすいものを優先
- ロングテールで確実にアクセスが取れるものを含める
- トピックの網羅性を意識（情報系・比較系・HOW TO系をバランスよく）

JSON形式で出力（説明不要）:
{"keywords":[{"keyword":"...", "searchVolume":"...", "competition":"...", "priority":"...", "longTail":["...","..."], "reason":"..."}]}`;

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
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("OpenAI API error:", errData);
      return NextResponse.json(
        { error: "キーワード提案の取得に失敗しました" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json({
      topic: topic.trim(),
      keywords: parsed.keywords || [],
      remaining: tokenResult.remaining,
    });
  } catch (error) {
    console.error("Keyword suggestion error:", error);
    return NextResponse.json(
      { error: "キーワード提案中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
