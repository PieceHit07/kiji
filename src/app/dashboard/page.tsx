"use client";

import { useState, useCallback } from "react";

// --- Types ---
interface Competitor {
  rank: number;
  title: string;
  url: string;
  wordCount: number;
  headingCount: number;
}

interface CooccurrenceWord {
  word: string;
  score: number;
}

interface OutlineItem {
  tag: "h1" | "h2" | "h3";
  text: string;
}

interface SEOScore {
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

interface AnalysisData {
  keyword: string;
  competitors: Competitor[];
  cooccurrence: CooccurrenceWord[];
  outline: OutlineItem[];
  seoTargets: { recommendedWordCount: number; avgWordCount: number };
}

interface ArticleData {
  title: string;
  metaDescription: string;
  content: string;
  wordCount: number;
  seoScore: SEOScore;
}

// --- Steps ---
type Step = "input" | "analyzing" | "outline" | "generating" | "article";

export default function DashboardPage() {
  const [keyword, setKeyword] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [error, setError] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  // --- 分析開始 ---
  const handleAnalyze = useCallback(async () => {
    if (!keyword.trim()) return;
    setError("");
    setStep("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析に失敗しました");

      setAnalysis(data);
      setOutline(data.outline || []);
      setStep("outline");
    } catch (e: any) {
      setError(e.message);
      setStep("input");
    }
  }, [keyword]);

  // --- 記事生成 ---
  const handleGenerate = useCallback(async () => {
    if (!analysis || outline.length < 3) return;
    setError("");
    setStep("generating");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: analysis.keyword,
          outline,
          cooccurrence: analysis.cooccurrence.map((w) => w.word),
          targetWordCount: analysis.seoTargets.recommendedWordCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成に失敗しました");

      setArticle(data);
      setStep("article");
    } catch (e: any) {
      setError(e.message);
      setStep("outline");
    }
  }, [analysis, outline]);

  // --- 見出し編集 ---
  const updateOutlineItem = (index: number, text: string) => {
    setOutline((prev) => prev.map((item, i) => (i === index ? { ...item, text } : item)));
  };

  const removeOutlineItem = (index: number) => {
    setOutline((prev) => prev.filter((_, i) => i !== index));
  };

  const moveOutlineItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= outline.length) return;
    setOutline((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const addOutlineItem = (afterIndex: number, tag: "h2" | "h3") => {
    setOutline((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, { tag, text: "新しい見出し" });
      return next;
    });
  };

  // --- リセット ---
  const handleReset = () => {
    setStep("input");
    setAnalysis(null);
    setOutline([]);
    setArticle(null);
    setError("");
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 min-w-[224px] bg-[#0c0c14] border-r border-white/[0.06] flex flex-col p-5 max-md:hidden">
        <div className="font-mono text-xl font-bold text-[#f0f0f6] tracking-wider mb-6">
          Kiji<span className="text-[#00e5a0]">.</span>
        </div>

        <div className="text-[0.7rem] text-[#6e6e82] uppercase tracking-[2px] mb-3 px-2">
          メイン
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm bg-[rgba(0,229,160,0.1)] text-[#00e5a0] mb-1"
        >
          <PlusIcon /> 新規記事作成
        </button>
        <a href="/articles" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#6e6e82] hover:bg-white/[0.03] hover:text-[#d0d0dc] mb-1">
          <ListIcon /> 記事一覧
        </a>
        <a href="/rewrite" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#6e6e82] hover:bg-white/[0.03] hover:text-[#d0d0dc] mb-6">
          <RefreshIcon /> リライト
        </a>

        <div className="text-[0.7rem] text-[#6e6e82] uppercase tracking-[2px] mb-3 px-2">
          ツール
        </div>
        <a href="/cooccurrence" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#6e6e82] hover:bg-white/[0.03] hover:text-[#d0d0dc] mb-1">
          <SearchIcon /> 共起語チェッカー
        </a>
        <button className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#6e6e82] hover:bg-white/[0.03] hover:text-[#d0d0dc] opacity-50 cursor-not-allowed" disabled>
          <ChartIcon /> 順位トラッキング
        </button>

        <div className="flex-1" />

        <div className="pt-4 border-t border-white/[0.06] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00e5a0] to-[#00c4ff] flex items-center justify-center text-xs font-bold text-[#08080d]">
            T
          </div>
          <div>
            <div className="text-sm text-[#d0d0dc]">田中太郎</div>
            <div className="text-[0.7rem] text-[#00e5a0]">Pro プラン</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="h-14 min-h-[56px] border-b border-white/[0.06] flex items-center justify-between px-7">
          <div className="text-base font-semibold text-[#f0f0f6]">
            {step === "input" && "新規記事作成"}
            {step === "analyzing" && "競合分析中..."}
            {step === "outline" && "構成案の確認・編集"}
            {step === "generating" && "記事を生成中..."}
            {step === "article" && "記事プレビュー"}
          </div>
          <div className="text-xs text-[#6e6e82] bg-[#181822] px-3 py-1.5 rounded-md">
            今月の利用: <span className="text-[#00e5a0] font-bold">12</span> / 30 記事
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-7">
          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* === STEP: INPUT === */}
          {(step === "input" || step === "analyzing") && (
            <div className="bg-[#111119] border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00e5a0] via-[#00c4ff] to-[#00e5a0] bg-[length:200%_100%] animate-[gradientSlide_3s_linear_infinite]" />

              <label className="text-sm text-[#6e6e82] block mb-3">
                ターゲットキーワード
              </label>
              <div className="flex gap-3 mb-5">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isComposing && handleAnalyze()}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="例: SEO対策 初心者"
                  className="flex-1 px-4 py-3.5 rounded-xl bg-[#181822] border border-white/[0.06] text-[#f0f0f6] text-base outline-none focus:border-[#00e5a0] transition-colors placeholder:text-[#6e6e82]"
                  disabled={step === "analyzing"}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={step === "analyzing" || !keyword.trim()}
                  className="px-7 py-3.5 rounded-xl bg-gradient-to-br from-[#00e5a0] to-[#00c88a] text-[#08080d] font-semibold whitespace-nowrap hover:shadow-[0_4px_24px_rgba(0,229,160,0.35)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {step === "analyzing" ? (
                    <span className="flex items-center gap-2">
                      <LoadingDots /> 分析中...
                    </span>
                  ) : (
                    "🔍 競合を分析"
                  )}
                </button>
              </div>

              {/* サジェストキーワード */}
              <div className="flex gap-2 flex-wrap">
                {["SEO対策 初心者", "ブログ 書き方", "アフィリエイト 始め方", "WordPress テーマ", "コンテンツマーケティング"].map(
                  (kw) => (
                    <button
                      key={kw}
                      onClick={() => setKeyword(kw)}
                      className={`px-3.5 py-1.5 rounded-full text-xs border transition-all ${
                        keyword === kw
                          ? "bg-[rgba(0,229,160,0.1)] border-[rgba(0,229,160,0.2)] text-[#00e5a0]"
                          : "bg-[#181822] border-white/[0.06] text-[#6e6e82] hover:border-[rgba(0,229,160,0.2)] hover:text-[#00e5a0]"
                      }`}
                    >
                      {kw}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* === STEP: OUTLINE (analysis done) === */}
          {(step === "outline" || step === "generating") && analysis && (
            <>
              {/* Competitor + Cooccurrence Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {/* Competitors */}
                <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-6">
                  <h3 className="text-sm text-[#6e6e82] font-medium mb-4 flex items-center gap-2">
                    <ChartIcon className="w-4 h-4 text-[#00e5a0]" />
                    競合上位記事
                  </h3>
                  <ul>
                    {analysis.competitors.slice(0, 5).map((c) => (
                      <li key={c.rank} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 ${
                          c.rank <= 3 ? "bg-[rgba(0,229,160,0.1)] text-[#00e5a0]" : "bg-[#181822] text-[#6e6e82]"
                        }`}>
                          {c.rank}
                        </span>
                        <span className="text-sm text-[#d0d0dc] flex-1 truncate">
                          {c.title}
                        </span>
                        <span className="text-[0.7rem] text-[#6e6e82] font-mono flex-shrink-0">
                          {c.wordCount.toLocaleString()}字
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cooccurrence */}
                <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-6">
                  <h3 className="text-sm text-[#6e6e82] font-medium mb-4 flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-[#00e5a0]" />
                    共起語・関連ワード
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.cooccurrence.map((w, i) => (
                      <span
                        key={w.word}
                        className={`px-3 py-1.5 rounded-md text-xs ${
                          i < 5
                            ? "border border-[rgba(0,229,160,0.2)] text-[#00e5a0]"
                            : i < 10
                              ? "border border-[rgba(0,196,255,0.15)] text-[#00c4ff]"
                              : "bg-[#181822] text-[#d0d0dc]"
                        }`}
                      >
                        {w.word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Info bar */}
              <div className="flex gap-3 mb-6">
                <div className="flex-1 bg-[#111119] border border-white/[0.06] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-[#00e5a0]">
                    {analysis.seoTargets.avgWordCount.toLocaleString()}字
                  </div>
                  <div className="text-xs text-[#6e6e82] mt-1">競合平均文字数</div>
                </div>
                <div className="flex-1 bg-[#111119] border border-white/[0.06] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-[#00c4ff]">
                    {analysis.seoTargets.recommendedWordCount.toLocaleString()}字
                  </div>
                  <div className="text-xs text-[#6e6e82] mt-1">推奨文字数</div>
                </div>
                <div className="flex-1 bg-[#111119] border border-white/[0.06] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-[#f0f0f6]">
                    {outline.filter((o) => o.tag === "h2").length}
                  </div>
                  <div className="text-xs text-[#6e6e82] mt-1">H2セクション数</div>
                </div>
              </div>

              {/* Outline Editor */}
              <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-base font-semibold text-[#f0f0f6]">
                    📝 構成案
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAnalyze}
                      className="px-3 py-1.5 rounded-md text-xs bg-[#181822] border border-white/[0.06] text-[#6e6e82] hover:border-[rgba(0,229,160,0.2)] hover:text-[#00e5a0] transition-all"
                    >
                      🔄 再生成
                    </button>
                  </div>
                </div>

                <ul className="space-y-1">
                  {outline.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.02] group"
                    >
                      {/* Tag badge */}
                      <span
                        className={`text-[0.65rem] font-bold font-mono px-2 py-0.5 rounded mt-1 flex-shrink-0 ${
                          item.tag === "h1"
                            ? "bg-[rgba(0,229,160,0.12)] text-[#00e5a0]"
                            : item.tag === "h2"
                              ? "bg-[rgba(0,196,255,0.12)] text-[#00c4ff]"
                              : "bg-[rgba(255,170,44,0.1)] text-[#ffaa2c]"
                        }`}
                      >
                        {item.tag.toUpperCase()}
                      </span>

                      {/* Text input */}
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateOutlineItem(index, e.target.value)}
                        className={`flex-1 bg-transparent border-none outline-none text-[#d0d0dc] focus:text-[#f0f0f6] ${
                          item.tag === "h1" ? "text-base font-semibold" : "text-sm"
                        }`}
                      />

                      {/* Actions (visible on hover) */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => moveOutlineItem(index, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-[#6e6e82] hover:bg-white/[0.05] text-xs"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveOutlineItem(index, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-[#6e6e82] hover:bg-white/[0.05] text-xs"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => addOutlineItem(index, "h3")}
                          className="w-6 h-6 rounded flex items-center justify-center text-[#6e6e82] hover:bg-white/[0.05] text-xs"
                        >
                          +
                        </button>
                        {item.tag !== "h1" && (
                          <button
                            onClick={() => removeOutlineItem(index)}
                            className="w-6 h-6 rounded flex items-center justify-center text-[#6e6e82] hover:bg-red-500/20 hover:text-red-400 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Generate Button */}
              <div className="text-center py-6">
                <button
                  onClick={handleGenerate}
                  disabled={step === "generating"}
                  className="px-16 py-4 rounded-xl bg-gradient-to-br from-[#00e5a0] to-[#00c88a] text-[#08080d] text-lg font-bold hover:shadow-[0_8px_40px_rgba(0,229,160,0.35)] hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-[0_4px_30px_rgba(0,229,160,0.2)]"
                >
                  {step === "generating" ? (
                    <span className="flex items-center gap-2">
                      <LoadingDots /> 生成中...
                    </span>
                  ) : (
                    "✨ この構成で記事を生成する"
                  )}
                </button>
                <div className="text-xs text-[#6e6e82] mt-3">
                  約3分で{analysis.seoTargets.recommendedWordCount.toLocaleString()}字の記事を生成します
                </div>
              </div>
            </>
          )}

          {/* === STEP: ARTICLE === */}
          {step === "article" && article && (
            <>
              {/* SEO Score Bar */}
              <div className="grid grid-cols-[160px_1fr] gap-6 bg-[#111119] border border-white/[0.06] rounded-xl p-6 mb-6 items-center max-md:grid-cols-1">
                <div className="text-center">
                  <div
                    className="w-28 h-28 rounded-full mx-auto flex items-center justify-center relative"
                    style={{
                      background: `conic-gradient(#00e5a0 0deg, #00e5a0 ${article.seoScore.overall * 3.6}deg, #181822 ${article.seoScore.overall * 3.6}deg)`,
                    }}
                  >
                    <div className="absolute inset-2 rounded-full bg-[#111119]" />
                    <span className="relative z-10 text-3xl font-extrabold text-[#00e5a0] font-mono">
                      {article.seoScore.overall}
                    </span>
                  </div>
                  <div className="text-xs text-[#6e6e82] mt-3">SEOスコア</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ScoreBar label="キーワード密度" value={article.seoScore.keywordDensity} color="bg-[#00e5a0]" />
                  <ScoreBar label="共起語カバー率" value={article.seoScore.cooccurrenceCoverage} color="bg-[#00c4ff]" />
                  <ScoreBar label="見出し構成" value={article.seoScore.headingStructure} color="bg-[#00e5a0]" />
                  <ScoreBar label="文字数" value={article.seoScore.wordCountScore} color="bg-[#ffaa2c]"
                    detail={`${article.seoScore.details.actualWordCount.toLocaleString()}字 / 目安 ${article.seoScore.details.targetWordCount.toLocaleString()}字`}
                  />
                </div>
              </div>

              {/* Article Preview */}
              <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-8 mb-6">
                <div className="flex gap-2 mb-4 text-xs text-[#6e6e82]">
                  <span>📝 {article.wordCount.toLocaleString()}文字</span>
                  <span>・</span>
                  <span>⏱ 読了 約{Math.ceil(article.wordCount / 600)}分</span>
                  <span>・</span>
                  <span>🏷 {analysis?.keyword}</span>
                </div>

                {article.metaDescription && (
                  <div className="bg-[#181822] border border-white/[0.04] rounded-lg p-4 mb-6 text-sm">
                    <span className="text-[0.7rem] text-[#6e6e82] block mb-1">meta description</span>
                    <span className="text-[#d0d0dc]">{article.metaDescription}</span>
                  </div>
                )}

                <div
                  className="prose-dark"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                  style={{
                    lineHeight: 1.9,
                  }}
                />

                <style jsx global>{`
                  .prose-dark h1 { font-size: 1.6rem; font-weight: 700; color: #f0f0f6; margin: 0 0 16px; line-height: 1.4; }
                  .prose-dark h2 { font-size: 1.15rem; font-weight: 600; color: #f0f0f6; margin: 32px 0 12px; padding-left: 12px; border-left: 3px solid #00e5a0; }
                  .prose-dark h3 { font-size: 1rem; font-weight: 600; color: #d0d0dc; margin: 24px 0 10px; }
                  .prose-dark p { font-size: 0.95rem; color: #d0d0dc; margin-bottom: 16px; }
                  .prose-dark ul, .prose-dark ol { padding-left: 1.5rem; margin-bottom: 16px; color: #d0d0dc; font-size: 0.95rem; }
                  .prose-dark li { margin-bottom: 4px; }
                `}</style>
              </div>

              {/* Publish Bar */}
              <div className="flex items-center justify-between bg-[#111119] border border-white/[0.06] rounded-xl p-5">
                <div>
                  <div className="font-semibold text-[#f0f0f6] mb-1">記事の準備ができました ✅</div>
                  <div className="text-xs text-[#6e6e82]">ローカルに保存、またはHTMLをコピーできます</div>
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => {
                      const saved = localStorage.getItem("kiji-articles");
                      const articles = saved ? JSON.parse(saved) : [];
                      articles.unshift({
                        id: Date.now().toString(),
                        keyword: analysis?.keyword || "",
                        title: article.title,
                        wordCount: article.wordCount,
                        seoScore: article.seoScore.overall,
                        createdAt: new Date().toISOString(),
                        content: article.content,
                      });
                      localStorage.setItem("kiji-articles", JSON.stringify(articles));
                      alert("記事を保存しました");
                    }}
                    className="px-4 py-2.5 rounded-lg text-sm bg-gradient-to-br from-[#00e5a0] to-[#00c88a] text-[#08080d] font-semibold hover:shadow-[0_4px_20px_rgba(0,229,160,0.35)] transition-all"
                  >
                    💾 保存
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(article.content)}
                    className="px-4 py-2.5 rounded-lg text-sm bg-[#181822] border border-white/[0.06] text-[#d0d0dc] hover:border-[rgba(0,229,160,0.2)] hover:text-[#00e5a0] transition-all"
                  >
                    📋 HTMLコピー
                  </button>
                </div>
              </div>

              {/* New article button */}
              <div className="text-center mt-8">
                <button
                  onClick={handleReset}
                  className="text-sm text-[#6e6e82] hover:text-[#00e5a0] transition-colors"
                >
                  ← 新しい記事を作成
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// --- Sub Components ---
function ScoreBar({
  label,
  value,
  color,
  detail,
}: {
  label: string;
  value: number;
  color: string;
  detail?: string;
}) {
  return (
    <div>
      <div className="text-[0.7rem] text-[#6e6e82] mb-1">{label}</div>
      <div className="h-1.5 rounded bg-[#181822] overflow-hidden mb-1">
        <div
          className={`h-full rounded transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-[0.7rem] text-[#d0d0dc] font-mono">
        {detail || `${value} / 100`}
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#00e5a0]"
          style={{
            animation: "bounce 0.6s infinite alternate",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes bounce {
          from { opacity: 0.3; transform: translateY(0); }
          to { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>
    </span>
  );
}

// --- Icons ---
function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={11} cy={11} r={8} />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ChartIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 4 4 5-5" />
    </svg>
  );
}

function TagIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1={7} y1={7} x2={7.01} y2={7} />
    </svg>
  );
}
