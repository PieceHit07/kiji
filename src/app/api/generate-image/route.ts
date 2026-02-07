import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumeTokens } from "@/lib/tokens";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const tokenResult = await consumeTokens(session.user.email, "image");
    if (!tokenResult.success) {
      return NextResponse.json(
        { error: "トークンが不足しています", needTokens: true, remaining: tokenResult.remaining },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, keyword, content, styles, tone, customPrompt } = body;

    if (!title && !content) {
      return NextResponse.json(
        { error: "記事タイトルまたは内容が必要です" },
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

    // スタイルマッピング
    const styleMap: Record<string, string> = {
      minimal: "ミニマル・モダン",
      illustration: "イラスト・フラットデザイン",
      photo: "写真風・リアル",
      pop: "ポップ・カラフル",
      dark: "ダーク・シック",
      watercolor: "水彩画・アーティスティック",
    };

    const toneMap: Record<string, string> = {
      warm: "warm tones (oranges, reds, yellows)",
      cool: "cool tones (blues, greens, purples)",
      monochrome: "monochrome / grayscale",
      pastel: "soft pastel colors",
      vivid: "vivid, saturated colors",
    };

    // 選択されたスタイル（デフォルト: ミニマル、イラスト、写真風）
    const selectedStyles = (Array.isArray(styles) && styles.length > 0)
      ? styles.slice(0, 3).map((s: string) => styleMap[s] || s)
      : ["ミニマル・モダン", "イラスト・フラットデザイン", "写真風・リアル"];

    const styleCount = selectedStyles.length;
    const styleList = selectedStyles.map((s: string, i: number) => `${i + 1}) ${s}`).join(" ");
    const toneInstruction = tone && toneMap[tone] ? `\n- Color scheme: ${toneMap[tone]}` : "";
    const customInstruction = customPrompt ? `\n- ユーザーの追加指示: ${String(customPrompt).slice(0, 200)}` : "";

    // 記事内容からテキストを抽出（HTMLタグ除去）
    const plainText = (content || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1000);

    // GPT-4oでスタイル別の画像プロンプトを生成
    const promptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `あなたはブログヘッダー画像のプロンプト生成の専門家です。
記事の内容を元に、DALL-E 3用の画像プロンプトを${styleCount}つ生成してください。

ルール:
- 英語で出力
- テキストや文字は含めない（画像のみ）
- ブログヘッダーに適した横長構図
- ${styleCount}つはそれぞれ異なるスタイル: ${styleList}
- 各プロンプトは2-3文で簡潔に${toneInstruction}${customInstruction}

JSON形式で出力:
{"prompts":[${selectedStyles.map((_: string, i: number) => `"prompt${i + 1}"`).join(",")}]}`,
          },
          {
            role: "user",
            content: `タイトル: ${title || ""}
キーワード: ${keyword || ""}
内容: ${plainText}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!promptRes.ok) {
      return NextResponse.json(
        { error: "画像プロンプトの生成に失敗しました" },
        { status: 500 }
      );
    }

    const promptData = await promptRes.json();
    const promptContent = promptData.choices?.[0]?.message?.content || "{}";
    const { prompts } = JSON.parse(promptContent);

    if (!prompts || !Array.isArray(prompts) || prompts.length < styleCount) {
      return NextResponse.json(
        { error: "画像プロンプトの生成に失敗しました" },
        { status: 500 }
      );
    }

    // DALL-E 3で並列生成（n=1のみ対応のためスタイル数回呼び出し）
    const imagePromises = prompts.slice(0, styleCount).map(async (prompt: string) => {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: `Blog header image, no text, no letters, no words. ${prompt}`,
          n: 1,
          size: "1792x1024",
          quality: "standard",
          response_format: "b64_json",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("DALL-E 3 error:", err);
        return null;
      }

      const data = await res.json();
      return data.data?.[0]?.b64_json || null;
    });

    const results = await Promise.all(imagePromises);
    const images = results.filter(Boolean);

    if (images.length === 0) {
      return NextResponse.json(
        { error: "画像の生成に失敗しました。再度お試しください。" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      images,
      remaining: tokenResult.remaining,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "画像生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
