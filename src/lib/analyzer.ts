/**
 * Kiji - Competitor Analysis Engine
 *
 * 1. Google Custom Search API で上位10件を取得
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

// --- Google Custom Search ---
export async function searchGoogle(
  keyword: string,
  count: number = 10
): Promise<{ title: string; url: string; snippet: string }[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !engineId) {
    return getDemoSearchResults(keyword);
  }

  const results: { title: string; url: string; snippet: string }[] = [];

  // Google CSE は1回10件まで。10件以上はページネーション
  for (let start = 1; start <= count; start += 10) {
    const num = Math.min(10, count - start + 1);
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${encodeURIComponent(keyword)}&gl=jp&lr=lang_ja&num=${num}&start=${start}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error("Google Search API error:", res.status);
      return getDemoSearchResults(keyword);
    }

    const data = await res.json();
    const items = data.items || [];

    for (const item of items) {
      results.push({
        title: item.title || "",
        url: item.link || "",
        snippet: item.snippet || "",
      });
    }
  }

  return results;
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
  // 1. 検索
  const searchResults = await searchGoogle(keyword, 10);

  // 2. 各URLを並列で解析（最大5件同時）
  const competitors: CompetitorResult[] = [];

  // 5件ずつバッチ処理
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
