/**
 * Kiji - Competitor Analysis Engine
 *
 * 1. Brave Search API で上位10件を取得
 * 2. 各URLのHTMLを取得し、見出し・文字数を解析
 * 3. 共起語を抽出
 */

export interface CompetitorResult {
  rank: number;
  title: string;
  url: string;
  snippet: string;
  wordCount: number;
  headings: { tag: string; text: string }[];
}

export interface AnalysisResult {
  competitors: CompetitorResult[];
  cooccurrence: { word: string; score: number }[];
  avgWordCount: number;
  allHeadings: { tag: string; text: string; frequency: number }[];
}

// --- Brave Search API ---
export async function searchBrave(
  keyword: string,
  count: number = 10
): Promise<{ title: string; url: string; snippet: string }[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    return getDemoSearchResults(keyword);
  }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(keyword)}&count=${count}&country=jp`;

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!res.ok) {
      console.error("Brave Search API error:", res.status);
      return getDemoSearchResults(keyword);
    }

    const data = await res.json();
    const items = data.web?.results || [];

    return items.map((item: { title?: string; url?: string; description?: string }) => ({
      title: item.title || "",
      url: item.url || "",
      snippet: item.description || "",
    }));
  } catch (e) {
    console.error("Brave Search error:", e);
    return getDemoSearchResults(keyword);
  }
}

// --- HTML解析（見出し抽出 + 文字数カウント） ---
export async function analyzeUrl(
  url: string
): Promise<{ wordCount: number; headings: { tag: string; text: string }[] }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Kiji/1.0; +https://kiji.ai)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { wordCount: 0, headings: [] };

    const html = await res.text();
    return parseHtml(html);
  } catch {
    return { wordCount: 0, headings: [] };
  }
}

function parseHtml(html: string): {
  wordCount: number;
  headings: { tag: string; text: string }[];
} {
  const headings: { tag: string; text: string }[] = [];

  // 見出し抽出（正規表現ベース - cheerio不要で軽量）
  const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (text) {
      headings.push({ tag, text });
    }
  }

  // 本文テキスト抽出（scriptとstyleを除去）
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const textContent = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, "")
    .trim();

  return {
    wordCount: textContent.length, // 日本語は文字数ベース
    headings,
  };
}

// --- 共起語抽出 ---
export function extractCooccurrence(
  competitors: CompetitorResult[],
  keyword: string
): { word: string; score: number }[] {
  // 全競合記事の見出しテキストを結合
  const allText = competitors
    .flatMap((c) => c.headings.map((h) => h.text))
    .join(" ");

  // キーワードの各単語を除外リストに
  const kwWords = keyword.split(/\s+/);
  const stopWords = new Set([
    ...kwWords,
    "の",
    "は",
    "が",
    "を",
    "に",
    "で",
    "と",
    "も",
    "や",
    "する",
    "ある",
    "いる",
    "こと",
    "もの",
    "ため",
    "よう",
    "など",
    "から",
    "まで",
    "について",
    "とは",
    "できる",
    "なる",
    "れる",
    "られる",
    "おすすめ",
    "方法",
    "解説",
    "紹介",
    "まとめ",
    "ランキング",
    "比較",
    "選び方",
    "ポイント",
    "注意点",
    "メリット",
    "デメリット",
    "徹底",
    "完全",
    "ガイド",
    "保存版",
    "最新",
  ]);

  // 2〜8文字のカタカナ・漢字・英字の連続を抽出
  const wordRegex = /[一-龥ぁ-んァ-ヴa-zA-Zａ-ｚＡ-Ｚ]{2,8}/g;
  const wordCount = new Map<string, number>();

  let m;
  while ((m = wordRegex.exec(allText)) !== null) {
    const word = m[0];
    if (!stopWords.has(word) && !stopWords.has(word.toLowerCase())) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  }

  // スコア順にソート
  return Array.from(wordCount.entries())
    .map(([word, count]) => ({ word, score: count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}

// --- 全体の分析フロー ---
export async function analyzeCompetitors(
  keyword: string
): Promise<AnalysisResult> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  const isDemo = !apiKey;

  let competitors: CompetitorResult[];

  if (isDemo) {
    // API未設定時はデモデータを使用（URL解析不要）
    competitors = getDemoCompetitors(keyword);
  } else {
    // 1. 検索
    const searchResults = await searchBrave(keyword, 10);

    // API失敗でデモURLが返された場合はデモ競合データを使う
    const isUsingDemoUrls = searchResults.some((r) =>
      r.url.startsWith("https://example.com")
    );

    if (isUsingDemoUrls) {
      competitors = getDemoCompetitors(keyword);
    } else {
      // 2. 各URLを並列で解析（最大5件同時）
      competitors = [];

      for (let i = 0; i < searchResults.length; i += 5) {
        const batch = searchResults.slice(i, i + 5);
        const analyses = await Promise.all(
          batch.map((r) => analyzeUrl(r.url))
        );

        for (let j = 0; j < batch.length; j++) {
          competitors.push({
            rank: i + j + 1,
            title: batch[j].title,
            url: batch[j].url,
            snippet: batch[j].snippet,
            wordCount: analyses[j].wordCount,
            headings: analyses[j].headings,
          });
        }
      }
    }
  }

  // 3. 共起語
  const cooccurrence = extractCooccurrence(competitors, keyword);

  // 4. 平均文字数
  const validCounts = competitors
    .map((c) => c.wordCount)
    .filter((c) => c > 500);
  const avgWordCount =
    validCounts.length > 0
      ? Math.round(
          validCounts.reduce((a, b) => a + b, 0) / validCounts.length
        )
      : 5000;

  // 5. 頻出見出しパターン
  const headingMap = new Map<string, number>();
  for (const c of competitors) {
    for (const h of c.headings) {
      const key = `${h.tag}:${h.text}`;
      headingMap.set(key, (headingMap.get(key) || 0) + 1);
    }
  }
  const allHeadings = Array.from(headingMap.entries())
    .map(([key, frequency]) => {
      const [tag, ...textParts] = key.split(":");
      return { tag, text: textParts.join(":"), frequency };
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 50);

  return { competitors, cooccurrence, avgWordCount, allHeadings };
}

// --- デモデータ（API未設定時） ---
function getDemoSearchResults(keyword: string) {
  // デモモードではURL解析をスキップするためダミーURLを使用
  return [
    {
      title: `【2026年最新】${keyword}の完全ガイド｜初心者が今すぐやるべきこと`,
      url: "https://example.com/1",
      snippet: `${keyword}について初心者向けに基本から解説。`,
    },
    {
      title: `${keyword}とは？基本から実践まで徹底解説`,
      url: "https://example.com/2",
      snippet: `${keyword}の基本を網羅的に解説します。`,
    },
    {
      title: `初心者でもできる${keyword}15選｜無料ツールも紹介`,
      url: "https://example.com/3",
      snippet: `${keyword}の具体的な方法を15個紹介。`,
    },
    {
      title: `${keyword}で最初にやるべき7つのこと【保存版】`,
      url: "https://example.com/4",
      snippet: `${keyword}の優先順位を解説。`,
    },
    {
      title: `${keyword}の基本と効果が出るまでの期間`,
      url: "https://example.com/5",
      snippet: `${keyword}の効果と期間について。`,
    },
  ];
}

// --- デモ用の競合データ（API未設定時にリアルなデータを返す） ---
function getDemoCompetitors(keyword: string): CompetitorResult[] {
  const kw = keyword.split(/\s+/);
  const main = kw[0] || keyword;
  const sub = kw[1] || "";

  return [
    {
      rank: 1,
      title: `【2026年最新】${keyword}の完全ガイド｜初心者が今すぐやるべきこと`,
      url: "https://example.com/1",
      snippet: `${keyword}について初心者向けに基本から解説。`,
      wordCount: 8500,
      headings: [
        { tag: "h2", text: `${keyword}とは？基本概念を理解しよう` },
        { tag: "h3", text: `${main}の定義と重要性` },
        { tag: "h3", text: `なぜ今${keyword}が注目されているのか` },
        { tag: "h2", text: `${keyword}を始める前に知っておくべきこと` },
        { tag: "h3", text: `必要なツールと準備` },
        { tag: "h3", text: `初心者がよくやる失敗パターン` },
        { tag: "h2", text: `${keyword}の具体的なやり方5ステップ` },
        { tag: "h3", text: `ステップ1：目標設定とキーワード選定` },
        { tag: "h3", text: `ステップ2：競合リサーチと分析` },
        { tag: "h3", text: `ステップ3：コンテンツの作成` },
        { tag: "h3", text: `ステップ4：内部対策と技術的な最適化` },
        { tag: "h3", text: `ステップ5：効果測定と改善` },
        { tag: "h2", text: `${keyword}に役立つおすすめツール` },
        { tag: "h2", text: `${keyword}の成功事例` },
        { tag: "h2", text: `まとめ：${keyword}で成果を出すコツ` },
      ],
    },
    {
      rank: 2,
      title: `${keyword}とは？基本から実践まで徹底解説`,
      url: "https://example.com/2",
      snippet: `${keyword}の基本を網羅的に解説します。`,
      wordCount: 7200,
      headings: [
        { tag: "h2", text: `${keyword}の基礎知識` },
        { tag: "h3", text: `${main}の仕組みと特徴` },
        { tag: "h3", text: `${sub || main}との関連性` },
        { tag: "h2", text: `${keyword}の実践テクニック` },
        { tag: "h3", text: `効果的なキーワード選定の方法` },
        { tag: "h3", text: `コンテンツSEOの基本` },
        { tag: "h3", text: `被リンク獲得の戦略` },
        { tag: "h2", text: `${keyword}でよくある質問` },
        { tag: "h2", text: `${keyword}の最新トレンド` },
        { tag: "h2", text: `まとめ` },
      ],
    },
    {
      rank: 3,
      title: `初心者でもできる${keyword}15選｜無料ツールも紹介`,
      url: "https://example.com/3",
      snippet: `${keyword}の具体的な方法を15個紹介。`,
      wordCount: 6800,
      headings: [
        { tag: "h2", text: `${keyword}で重要な要素とは` },
        { tag: "h3", text: `検索エンジンの評価基準` },
        { tag: "h3", text: `ユーザー体験の重要性` },
        { tag: "h2", text: `${keyword}のおすすめ施策15選` },
        { tag: "h3", text: `タイトルタグの最適化` },
        { tag: "h3", text: `メタディスクリプションの書き方` },
        { tag: "h3", text: `見出し構造の設計` },
        { tag: "h3", text: `内部リンクの最適化` },
        { tag: "h3", text: `画像のalt属性設定` },
        { tag: "h2", text: `無料で使えるおすすめツール5選` },
        { tag: "h3", text: `Google Search Console` },
        { tag: "h3", text: `Google Analytics` },
        { tag: "h2", text: `まとめ：${keyword}は継続が大事` },
      ],
    },
    {
      rank: 4,
      title: `${keyword}で最初にやるべき7つのこと【保存版】`,
      url: "https://example.com/4",
      snippet: `${keyword}の優先順位を解説。`,
      wordCount: 5500,
      headings: [
        { tag: "h2", text: `${keyword}の全体像を把握する` },
        { tag: "h2", text: `サイト構造を最適化する` },
        { tag: "h3", text: `サイトマップの作成` },
        { tag: "h3", text: `URL設計のポイント` },
        { tag: "h2", text: `質の高いコンテンツを作る` },
        { tag: "h3", text: `検索意図を理解する` },
        { tag: "h3", text: `E-E-A-Tを意識した執筆` },
        { tag: "h2", text: `テクニカルSEOの基本` },
        { tag: "h2", text: `効果測定の方法` },
        { tag: "h2", text: `まとめ` },
      ],
    },
    {
      rank: 5,
      title: `${keyword}の基本と効果が出るまでの期間`,
      url: "https://example.com/5",
      snippet: `${keyword}の効果と期間について。`,
      wordCount: 4800,
      headings: [
        { tag: "h2", text: `${keyword}とは何か` },
        { tag: "h2", text: `${keyword}の効果が出るまでの期間` },
        { tag: "h3", text: `短期的に効果が出る施策` },
        { tag: "h3", text: `長期的に取り組む施策` },
        { tag: "h2", text: `${keyword}の費用対効果` },
        { tag: "h3", text: `自社で行う場合のコスト` },
        { tag: "h3", text: `外注する場合の相場` },
        { tag: "h2", text: `${keyword}の今後の展望` },
        { tag: "h2", text: `まとめ` },
      ],
    },
  ];
}
