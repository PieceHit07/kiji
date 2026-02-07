import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export const maxDuration = 30;

// キーワードの検索順位をチェック
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const body = await request.json();
  const { keyword, targetUrl } = body;

  if (!keyword || !targetUrl) {
    return NextResponse.json(
      { error: "キーワードとURLを入力してください" },
      { status: 400 }
    );
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "検索API未設定" }, { status: 500 });
  }

  try {
    // Brave Searchで上位20件を取得
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(keyword)}&count=20&country=jp`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "検索に失敗しました" }, { status: 500 });
    }

    const data = await res.json();
    const results = data.web?.results || [];

    // ターゲットURLのドメインを抽出
    let targetDomain: string;
    try {
      targetDomain = new URL(targetUrl).hostname.replace(/^www\./, "");
    } catch {
      return NextResponse.json({ error: "無効なURLです" }, { status: 400 });
    }

    // 順位を探す
    let position: number | null = null;
    let matchedUrl = "";
    let matchedTitle = "";

    for (let i = 0; i < results.length; i++) {
      const resultDomain = new URL(results[i].url).hostname.replace(/^www\./, "");
      if (resultDomain === targetDomain) {
        position = i + 1;
        matchedUrl = results[i].url;
        matchedTitle = results[i].title;
        break;
      }
    }

    // 上位10件のデータも返す
    const topResults = results.slice(0, 10).map((r: any, i: number) => ({
      rank: i + 1,
      title: r.title || "",
      url: r.url || "",
    }));

    return NextResponse.json({
      keyword,
      targetUrl,
      position, // null = 20位以下
      matchedUrl,
      matchedTitle,
      checkedAt: new Date().toISOString(),
      topResults,
    });
  } catch (error) {
    console.error("Ranking check error:", error);
    return NextResponse.json({ error: "順位チェックに失敗しました" }, { status: 500 });
  }
}
