/**
 * Kiji - AI Outline & Article Generator
 *
 * OpenAI GPT-4o を使って:
 * 1. 競合分析データから構成案を生成
 * 2. 構成案から本文を生成
 * 3. SEOスコアを算出
 */

import type { AnalysisResult, CompetitorResult } from "./analyzer";

export interface OutlineItem {
  tag: "h1" | "h2" | "h3";
  text: string;
}

export interface GeneratedArticle {
  title: string;
  metaDescription: string;
  content: string; // HTML
  wordCount: number;
  seoScore: SEOScore;
}

export interface SEOScore {
  overall: number;
  keywordDensity: number;
  cooccurrenceCoverage: number;
  headingStructure: number;
  wordCountScore: number;
  details: {
    targetWordCount: number;
    actualWordCount: number;
    keywordCount: number;
    coveredCooccurrences: string[];
    missingCooccurrences: string[];
  };
}

// --- 構成案生成 ---
export async function generateOutline(
  keyword: string,
  analysis: AnalysisResult
): Promise<OutlineItem[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  // 競合の見出し構成をフォーマット
  const competitorSummary = analysis.competitors
    .slice(0, 5)
    .map(
      (c) =>
        `【${c.rank}位】${c.title}（${c.wordCount}字）\n` +
        c.headings
          .filter((h) => h.tag === "h2" || h.tag === "h3")
          .slice(0, 10)
          .map((h) => `  ${h.tag}: ${h.text}`)
          .join("\n")
    )
    .join("\n\n");

  const cooccurrenceText = analysis.cooccurrence
    .slice(0, 20)
    .map((w) => w.word)
    .join("、");

  const prompt = `あなたはSEO専門のコンテンツストラテジストです。

以下の競合分析データをもとに、検索1位を獲得するための記事構成案を作成してください。

【ターゲットキーワード】${keyword}

【競合上位記事の見出し構成】
${competitorSummary}

【共起語（重要度順）】
${cooccurrenceText}

【競合の平均文字数】${analysis.avgWordCount}字

以下の条件で構成案を出力してください：
- H1は1つ。ターゲットKWを含み、クリック率が高いタイトル
- H2は5〜7個。検索意図を網羅する
- H3は各H2に1〜3個。具体的で実用的な内容
- 競合にない独自の切り口を最低1つ含める
- 最初と最後のH2に必ずターゲットKWを含める

以下のJSON形式で出力（説明不要）:
{"outline":[{"tag":"h1","text":"..."},{"tag":"h2","text":"..."},{"tag":"h3","text":"..."}]}`;

  if (!apiKey) {
    return getDemoOutline(keyword);
  }

  try {
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
      console.error("OpenAI API error:", res.status);
      return getDemoOutline(keyword);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    // JSONパース（配列 or {outline: [...]} の両方に対応）
    const parsed = JSON.parse(content);
    const outline: OutlineItem[] = Array.isArray(parsed)
      ? parsed
      : parsed.outline || parsed.items || parsed.headings || [];

    // 構成案が空の場合はデモデータを返す
    if (outline.length === 0) {
      console.error("OpenAI returned empty outline, using demo data");
      return getDemoOutline(keyword);
    }

    return outline;
  } catch (e) {
    console.error("Outline generation error:", e);
    return getDemoOutline(keyword);
  }
}

// --- Tone descriptions ---
const toneDescriptions: Record<string, string> = {
  default: "です・ます調。バランスの取れた読みやすい文体",
  casual: "だ・である調を避け、「〜ですよね」「〜してみましょう」など親しみやすく砕けた口調。読者に語りかけるように",
  professional: "である調。ビジネス・専門家向けの堅い文体。専門用語を適切に使用",
  beginner: "です・ます調。専門用語を極力避け、初心者でもわかるように平易な言葉で丁寧に説明",
  persuasive: "です・ます調。「〜しませんか？」「今すぐ〜」など行動を促す説得力のある文体。ベネフィットを強調",
};

// --- Custom generation options ---
export interface GenerateOptions {
  customPrompt?: string;
  referenceUrl?: string;
  tone?: string;
}

// --- 記事本文生成 ---
export async function generateArticle(
  keyword: string,
  outline: OutlineItem[],
  cooccurrence: string[],
  targetWordCount: number,
  options: GenerateOptions = {}
): Promise<GeneratedArticle> {
  const apiKey = process.env.OPENAI_API_KEY;
  const { customPrompt, referenceUrl, tone = "default" } = options;

  const outlineText = outline
    .map((item) => `${item.tag.toUpperCase()}: ${item.text}`)
    .join("\n");

  // トーン設定
  const toneInstruction = toneDescriptions[tone] || toneDescriptions.default;

  // 参考記事の文体分析（URLが提供された場合）
  let referenceStyleInstruction = "";
  if (referenceUrl) {
    referenceStyleInstruction = `
【参考記事の文体を真似する】
以下のURLの記事の口調・文体・表現スタイルを可能な限り真似してください：
${referenceUrl}
（記事を読み取れない場合は、一般的な良質なWebライティングの文体で執筆してください）`;
  }

  // カスタムプロンプト
  const customInstructions = customPrompt
    ? `\n【追加の指示】\n${customPrompt}`
    : "";

  const prompt = `あなたはSEOに精通したプロのWebライターです。

以下の構成案に沿って、SEOに最適化された記事本文を作成してください。

【ターゲットキーワード】${keyword}

【構成案】
${outlineText}

【含めるべき共起語】${cooccurrence.slice(0, 15).join("、")}

【目標文字数】${targetWordCount}字

【文体・トーン】${toneInstruction}
${referenceStyleInstruction}${customInstructions}

執筆ルール：
- 各H2セクションは400〜800字
- ターゲットKWはH1・最初のH2・まとめに含める（密度2〜3%）
- 共起語は自然に文中に散りばめる（カバー率80%以上を目標）
- リード文（H1直後）は読者の悩みに共感 → 記事で得られることを提示
- 各セクションの冒頭で結論を述べ、その後に解説を展開
- HTML形式で出力（h1, h2, h3, p タグ。装飾タグは不要）
- メタディスクリプション（120文字以内）を最初に <!-- meta: ... --> コメントで記載

HTML出力のみ（説明不要）:`;

  if (!apiKey) {
    return getDemoArticle(keyword, outline);
  }

  try {
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
      console.error("OpenAI API error:", res.status);
      return getDemoArticle(keyword, outline);
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || "";

    // メタディスクリプション抽出
    let metaDescription = "";
    const metaMatch = content.match(/<!--\s*meta:\s*(.*?)\s*-->/);
    if (metaMatch) {
      metaDescription = metaMatch[1];
      content = content.replace(metaMatch[0], "").trim();
    }

    // コードブロックのマークダウン記法を除去
    content = content.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "");

    // タイトル抽出
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "")
      : outline.find((o) => o.tag === "h1")?.text || keyword;

    // 文字数カウント
    const textOnly = content.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
    const wordCount = textOnly.length;

    // SEOスコア算出
    const seoScore = calculateSEOScore(
      keyword,
      content,
      cooccurrence,
      targetWordCount
    );

    return { title, metaDescription, content, wordCount, seoScore };
  } catch (e) {
    console.error("Article generation error:", e);
    return getDemoArticle(keyword, outline);
  }
}

// --- SEOスコア算出 ---
export function calculateSEOScore(
  keyword: string,
  htmlContent: string,
  cooccurrence: string[],
  targetWordCount: number
): SEOScore {
  const textContent = htmlContent.replace(/<[^>]+>/g, "");
  const actualWordCount = textContent.replace(/\s+/g, "").length;

  // キーワード密度
  const keywordRegex = new RegExp(keyword.replace(/\s+/g, "\\s*"), "gi");
  const keywordCount = (textContent.match(keywordRegex) || []).length;
  const density = actualWordCount > 0 ? (keywordCount * keyword.length) / actualWordCount * 100 : 0;
  const keywordDensity = Math.min(100, density < 1 ? density * 50 : density > 4 ? Math.max(0, 100 - (density - 4) * 20) : 100);

  // 共起語カバー率
  const topCooccurrence = cooccurrence.slice(0, 15);
  const coveredCooccurrences = topCooccurrence.filter((w) =>
    textContent.includes(w)
  );
  const missingCooccurrences = topCooccurrence.filter(
    (w) => !textContent.includes(w)
  );
  const cooccurrenceCoverage =
    topCooccurrence.length > 0
      ? Math.round((coveredCooccurrences.length / topCooccurrence.length) * 100)
      : 100;

  // 見出し構成スコア
  const h2Count = (htmlContent.match(/<h2/gi) || []).length;
  const h3Count = (htmlContent.match(/<h3/gi) || []).length;
  const hasH1 = /<h1/i.test(htmlContent);
  let headingStructure = 0;
  if (hasH1) headingStructure += 30;
  if (h2Count >= 4 && h2Count <= 8) headingStructure += 40;
  else if (h2Count >= 2) headingStructure += 25;
  if (h3Count >= 3) headingStructure += 30;
  else if (h3Count >= 1) headingStructure += 15;

  // 文字数スコア
  const wordCountRatio = actualWordCount / targetWordCount;
  const wordCountScore =
    wordCountRatio >= 0.8 && wordCountRatio <= 1.3
      ? 100
      : wordCountRatio >= 0.6
        ? 70
        : wordCountRatio >= 0.4
          ? 40
          : 20;

  // 総合スコア
  const overall = Math.round(
    keywordDensity * 0.25 +
      cooccurrenceCoverage * 0.3 +
      headingStructure * 0.25 +
      wordCountScore * 0.2
  );

  return {
    overall,
    keywordDensity: Math.round(keywordDensity),
    cooccurrenceCoverage,
    headingStructure,
    wordCountScore,
    details: {
      targetWordCount,
      actualWordCount,
      keywordCount,
      coveredCooccurrences,
      missingCooccurrences,
    },
  };
}

// --- デモデータ ---
function getDemoOutline(keyword: string): OutlineItem[] {
  return [
    { tag: "h1", text: `【2026年版】${keyword}とは？初心者が最初にやるべき基本施策を徹底解説` },
    { tag: "h2", text: `${keyword}とは？検索エンジンの仕組みを理解しよう` },
    { tag: "h3", text: "Googleがページを評価する3つの基準" },
    { tag: "h3", text: `${keyword}で成果が出るまでの期間` },
    { tag: "h2", text: `初心者が今日からできる${keyword}7選` },
    { tag: "h3", text: "①キーワード選定の基本" },
    { tag: "h3", text: "②タイトルタグとメタディスクリプションの最適化" },
    { tag: "h3", text: "③見出し構成（H2・H3）の設計" },
    { tag: "h3", text: "④内部リンクの最適化" },
    { tag: "h3", text: "⑤モバイル対応とページ表示速度の改善" },
    { tag: "h3", text: "⑥画像のalt属性を設定する" },
    { tag: "h3", text: "⑦Googleサーチコンソールで効果を測定する" },
    { tag: "h2", text: `初心者がやりがちな${keyword}の失敗パターン` },
    { tag: "h2", text: `${keyword}に役立つ無料ツール5選` },
    { tag: "h2", text: `まとめ：初心者こそ基本を押さえれば${keyword}は成果が出る` },
  ];
}

function getDemoArticle(
  keyword: string,
  outline: OutlineItem[]
): GeneratedArticle {
  const title =
    outline.find((o) => o.tag === "h1")?.text ||
    `${keyword}完全ガイド`;

  const sections = outline
    .map((item) => {
      if (item.tag === "h1")
        return `<h1>${item.text}</h1>`;
      if (item.tag === "h2")
        return `<h2>${item.text}</h2>\n<p>この記事では「${keyword}」について、初心者の方にもわかりやすく解説していきます。${keyword}は正しい方法で取り組めば、確実に成果を出すことができます。以下で具体的な方法を見ていきましょう。</p>`;
      return `<h3>${item.text}</h3>\n<p>${item.text}は${keyword}において非常に重要なポイントです。初心者の方がまず押さえるべき基本として、この施策を最優先で実施することをおすすめします。</p>`;
    })
    .join("\n\n");

  const content = `${sections}`;
  const textOnly = content.replace(/<[^>]+>/g, "").replace(/\s+/g, "");

  return {
    title,
    metaDescription: `${keyword}の基本から実践まで初心者向けに徹底解説。今日からできる具体的な施策と無料ツールも紹介します。`,
    content,
    wordCount: textOnly.length,
    seoScore: {
      overall: 82,
      keywordDensity: 85,
      cooccurrenceCoverage: 78,
      headingStructure: 90,
      wordCountScore: 72,
      details: {
        targetWordCount: 7000,
        actualWordCount: textOnly.length,
        keywordCount: 8,
        coveredCooccurrences: ["検索エンジン", "Google", "キーワード"],
        missingCooccurrences: ["被リンク", "ドメインパワー"],
      },
    },
  };
}
