"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ImageGenerateModal from "@/components/ImageGenerateModal";
import { convertToNoteFormat } from "@/lib/export";

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

// --- Tone Presets ---
const tonePresets = [
  { id: "default", label: "標準", description: "バランスの取れた読みやすい文体" },
  { id: "casual", label: "カジュアル", description: "親しみやすく砕けた口調" },
  { id: "professional", label: "専門的", description: "ビジネス・専門家向けの堅い文体" },
  { id: "beginner", label: "初心者向け", description: "専門用語を避けたわかりやすい説明" },
  { id: "persuasive", label: "セールス", description: "行動を促す説得力のある文体" },
];

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const [keyword, setKeyword] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [error, setError] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  // Custom settings
  const [customPrompt, setCustomPrompt] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [selectedTone, setSelectedTone] = useState("default");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // WordPress
  const [wpConnected, setWpConnected] = useState(false);
  const [savedArticleId, setSavedArticleId] = useState<string | null>(null);
  const [wpPublishing, setWpPublishing] = useState(false);
  const [wpResult, setWpResult] = useState<{ type: "success" | "error"; text: string; editUrl?: string } | null>(null);

  const { data: session } = useSession();
  const autoAnalyzeRef = useRef(false);
  const searchParams = useSearchParams();

  // トークン残高を取得
  const refreshTokens = useCallback(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((d) => {
        if (d.tokens) {
          setTokensRemaining(d.tokens.remaining);
          window.dispatchEvent(new CustomEvent("tokens-updated", { detail: d.tokens }));
        }
        setWpConnected(!!d.wordpress);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (session?.user) refreshTokens();
  }, [session, refreshTokens]);

  // Stripe決済完了後にプランを反映
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId && session?.user) {
      fetch("/api/stripe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.updated) {
            window.location.href = "/dashboard";
          }
        })
        .catch(() => {});
    }
  }, [searchParams, session]);

  // 認証後にキーワードを復元して自動分析
  useEffect(() => {
    if (session && !autoAnalyzeRef.current) {
      const pendingKeyword = localStorage.getItem("kiji-pending-keyword");
      if (pendingKeyword) {
        localStorage.removeItem("kiji-pending-keyword");
        autoAnalyzeRef.current = true;
        setKeyword(pendingKeyword);
        // キーワードセット後に分析を実行
        setTimeout(() => {
          runAnalyze(pendingKeyword);
        }, 100);
      }
    }
  }, [session]);

  // --- 分析実行（キーワードを引数で受ける） ---
  const runAnalyze = useCallback(async (kw: string) => {
    setError("");
    setStep("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needTokens) {
          setShowTokenModal(true);
          setStep("input");
          return;
        }
        throw new Error(data.error || "分析に失敗しました");
      }

      refreshTokens();
      setAnalysis(data);
      setOutline(data.outline || []);
      setStep("outline");
    } catch (e: any) {
      setError(e.message);
      setStep("input");
    }
  }, [refreshTokens]);

  // --- 分析開始 ---
  const handleAnalyze = useCallback(async () => {
    if (!keyword.trim()) return;

    // 未ログインならキーワードを保存してGoogle認証へ
    if (!session) {
      localStorage.setItem("kiji-pending-keyword", keyword.trim());
      signIn("google", { callbackUrl: "/dashboard" });
      return;
    }

    runAnalyze(keyword);
  }, [keyword, session, runAnalyze]);

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
          customPrompt: customPrompt || undefined,
          referenceUrl: referenceUrl || undefined,
          tone: selectedTone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needTokens) {
          setShowTokenModal(true);
          setStep("outline");
          return;
        }
        throw new Error(data.error || "生成に失敗しました");
      }

      refreshTokens();
      setArticle(data);
      setStep("article");
    } catch (e: any) {
      setError(e.message);
      setStep("outline");
    }
  }, [analysis, outline, customPrompt, referenceUrl, selectedTone, refreshTokens]);

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
    setCustomPrompt("");
    setReferenceUrl("");
    setSelectedTone("default");
    setShowAdvanced(false);
  };

  return (
    <div className="flex h-screen bg-bg text-text-bright">
      <Sidebar />

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="h-14 min-h-[56px] border-b border-border flex items-center justify-between px-7">
          <div className="text-base font-semibold text-text-bright">
            {step === "input" && "新規記事作成"}
            {step === "analyzing" && "競合分析中..."}
            {step === "outline" && "構成案の確認・編集"}
            {step === "generating" && "記事を生成中..."}
            {step === "article" && "記事プレビュー"}
          </div>
          {tokensRemaining !== null && (
            <div className={`text-xs bg-surface2 px-3 py-1.5 rounded-md ${
              tokensRemaining <= 5 ? "text-red-400" : tokensRemaining <= 20 ? "text-warning" : "text-text-dim"
            }`}>
              <>残りトークン: <span className="font-bold font-mono">{tokensRemaining}</span></>
            </div>
          )}
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
            <div className="bg-surface border border-border rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-accent2 to-accent bg-[length:200%_100%] animate-[gradientSlide_3s_linear_infinite]" />

              <label className="text-sm text-text-dim block mb-3">
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
                  className="flex-1 px-4 py-3.5 rounded-xl bg-surface2 border border-border text-text-bright text-base outline-none focus:border-accent transition-colors placeholder:text-text-dim"
                  disabled={step === "analyzing"}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={step === "analyzing" || !keyword.trim()}
                  className="px-7 py-3.5 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold whitespace-nowrap hover:shadow-[0_4px_24px_var(--color-accent-glow)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {step === "analyzing" ? (
                    <span className="flex items-center gap-2">
                      <LoadingDots /> 分析中...
                    </span>
                  ) : (
                    "🔍 競合を分析（3トークン）"
                  )}
                </button>
              </div>

              {/* トークンコスト */}
              <div className="flex items-center gap-4 mb-5 px-1 text-[0.7rem] text-text-dim">
                <span>消費トークン:</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />分析 3</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent2 inline-block" />生成 10</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />リライト 5</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-text-dim inline-block" />共起語 2</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-text-dim inline-block" />順位 1</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent2 inline-block" />画像 8</span>
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
                          ? "bg-[var(--color-accent-tint)] border-[var(--color-accent-tint-border)] text-accent"
                          : "bg-surface2 border-border text-text-dim hover:border-[var(--color-accent-tint-border)] hover:text-accent"
                      }`}
                    >
                      {kw}
                    </button>
                  )
                )}
              </div>

              {/* 詳細設定トグル */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="mt-6 text-sm text-text-dim hover:text-accent transition-colors flex items-center gap-2"
              >
                <span className={`transform transition-transform ${showAdvanced ? "rotate-90" : ""}`}>▶</span>
                詳細設定（トーン・カスタムプロンプト）
              </button>

              {/* 詳細設定パネル */}
              {showAdvanced && (
                <div className="mt-4 space-y-5 pt-5 border-t border-border">
                  {/* トーン選択 */}
                  <div>
                    <label className="text-sm text-text-dim block mb-3">文体・トーン</label>
                    <div className="flex gap-2 flex-wrap">
                      {tonePresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setSelectedTone(preset.id)}
                          className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                            selectedTone === preset.id
                              ? "bg-[var(--color-accent-tint)] border-[var(--color-accent-tint-border)] text-accent"
                              : "bg-surface2 border-border text-text-primary hover:border-[var(--color-accent-tint-border)]"
                          }`}
                          title={preset.description}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-text-dim mt-2">
                      {tonePresets.find(p => p.id === selectedTone)?.description}
                    </p>
                  </div>

                  {/* 参考記事URL */}
                  <div>
                    <label className="text-sm text-text-dim block mb-2">
                      参考記事URL（この記事の文体を真似します）
                    </label>
                    <input
                      type="url"
                      value={referenceUrl}
                      onChange={(e) => setReferenceUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className="w-full px-4 py-3 rounded-xl bg-surface2 border border-border text-text-bright text-sm outline-none focus:border-accent2 transition-colors placeholder:text-text-dim"
                    />
                    <p className="text-xs text-text-dim mt-1">
                      URLを入力すると、その記事の口調・文体を分析して似たスタイルで執筆します
                    </p>
                  </div>

                  {/* カスタムプロンプト */}
                  <div>
                    <label className="text-sm text-text-dim block mb-2">
                      カスタムプロンプト（追加の指示）
                    </label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="例：&#10;・具体的な数字やデータを多く使って&#10;・「〜です」「〜ます」調で統一&#10;・読者に語りかけるような文体で"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-surface2 border border-border text-text-bright text-sm outline-none focus:border-accent2 transition-colors placeholder:text-text-dim resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === STEP: OUTLINE (analysis done) === */}
          {(step === "outline" || step === "generating") && analysis && (
            <>
              {/* Competitor + Cooccurrence Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {/* Competitors */}
                <div className="bg-surface border border-border rounded-xl p-6">
                  <h3 className="text-sm text-text-dim font-medium mb-4 flex items-center gap-2">
                    <ChartIcon className="w-4 h-4 text-accent" />
                    競合上位記事
                  </h3>
                  <ul>
                    {analysis.competitors.slice(0, 5).map((c) => (
                      <li key={c.rank} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 ${
                          c.rank <= 3 ? "bg-[var(--color-accent-tint)] text-accent" : "bg-surface2 text-text-dim"
                        }`}>
                          {c.rank}
                        </span>
                        <span className="text-sm text-text-primary flex-1 truncate">
                          {c.title}
                        </span>
                        <span className="text-[0.7rem] text-text-dim font-mono flex-shrink-0">
                          {c.wordCount.toLocaleString()}字
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cooccurrence */}
                <div className="bg-surface border border-border rounded-xl p-6">
                  <h3 className="text-sm text-text-dim font-medium mb-4 flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-accent" />
                    共起語・関連ワード
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.cooccurrence.map((w, i) => (
                      <span
                        key={w.word}
                        className={`px-3 py-1.5 rounded-md text-xs ${
                          i < 5
                            ? "border border-[var(--color-accent-tint-border)] text-accent"
                            : i < 10
                              ? "border border-[var(--color-accent2-tint)] text-accent2"
                              : "bg-surface2 text-text-primary"
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
                <div className="flex-1 bg-surface border border-border rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-accent">
                    {analysis.seoTargets.avgWordCount.toLocaleString()}字
                  </div>
                  <div className="text-xs text-text-dim mt-1">競合平均文字数</div>
                </div>
                <div className="flex-1 bg-surface border border-border rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-accent2">
                    {analysis.seoTargets.recommendedWordCount.toLocaleString()}字
                  </div>
                  <div className="text-xs text-text-dim mt-1">推奨文字数</div>
                </div>
                <div className="flex-1 bg-surface border border-border rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-text-bright">
                    {outline.filter((o) => o.tag === "h2").length}
                  </div>
                  <div className="text-xs text-text-dim mt-1">H2セクション数</div>
                </div>
              </div>

              {/* Outline Editor */}
              <div className="bg-surface border border-border rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-base font-semibold text-text-bright">
                    📝 構成案
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAnalyze}
                      className="px-3 py-1.5 rounded-md text-xs bg-surface2 border border-border text-text-dim hover:border-[var(--color-accent-tint-border)] hover:text-accent transition-all"
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
                            ? "bg-[var(--color-accent-tint)] text-accent"
                            : item.tag === "h2"
                              ? "bg-[var(--color-accent2-tint)] text-accent2"
                              : "bg-[var(--color-warning-tint)] text-warning"
                        }`}
                      >
                        {item.tag.toUpperCase()}
                      </span>

                      {/* Text input */}
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateOutlineItem(index, e.target.value)}
                        className={`flex-1 bg-transparent border-none outline-none text-text-primary focus:text-text-bright ${
                          item.tag === "h1" ? "text-base font-semibold" : "text-sm"
                        }`}
                      />

                      {/* Actions (visible on hover) */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => moveOutlineItem(index, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:bg-hover-subtle text-xs"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveOutlineItem(index, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:bg-hover-subtle text-xs"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => addOutlineItem(index, "h3")}
                          className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:bg-hover-subtle text-xs"
                        >
                          +
                        </button>
                        {item.tag !== "h1" && (
                          <button
                            onClick={() => removeOutlineItem(index)}
                            className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:bg-red-500/20 hover:text-red-400 text-xs"
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
                  className="px-16 py-4 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-on-accent text-lg font-bold hover:shadow-[0_8px_40px_var(--color-accent-glow)] hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-[0_4px_30px_var(--color-accent-glow)]"
                >
                  {step === "generating" ? (
                    <span className="flex items-center gap-2">
                      <LoadingDots /> 生成中...
                    </span>
                  ) : (
                    "✨ この構成で記事を生成する"
                  )}
                </button>
                <div className="text-xs text-text-dim mt-3">
                  約3分で{analysis.seoTargets.recommendedWordCount.toLocaleString()}字の記事を生成します（10トークン消費）
                </div>
              </div>
            </>
          )}

          {/* === STEP: ARTICLE === */}
          {step === "article" && article && (
            <>
              {/* SEO Score Bar */}
              <div className="grid grid-cols-[160px_1fr] gap-6 bg-surface border border-border rounded-xl p-6 mb-6 items-center max-md:grid-cols-1">
                <div className="text-center">
                  <div
                    className="w-28 h-28 rounded-full mx-auto flex items-center justify-center relative"
                    style={{
                      background: `conic-gradient(var(--color-accent) 0deg, var(--color-accent) ${article.seoScore.overall * 3.6}deg, var(--color-surface2) ${article.seoScore.overall * 3.6}deg)`,
                    }}
                  >
                    <div className="absolute inset-2 rounded-full bg-surface" />
                    <span className="relative z-10 text-3xl font-extrabold text-accent font-mono">
                      {article.seoScore.overall}
                    </span>
                  </div>
                  <div className="text-xs text-text-dim mt-3">SEOスコア</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ScoreBar label="キーワード密度" value={article.seoScore.keywordDensity} color="bg-accent" />
                  <ScoreBar label="共起語カバー率" value={article.seoScore.cooccurrenceCoverage} color="bg-accent2" />
                  <ScoreBar label="見出し構成" value={article.seoScore.headingStructure} color="bg-accent" />
                  <ScoreBar label="文字数" value={article.seoScore.wordCountScore} color="bg-warning"
                    detail={`${article.seoScore.details.actualWordCount.toLocaleString()}字 / 目安 ${article.seoScore.details.targetWordCount.toLocaleString()}字`}
                  />
                </div>
              </div>

              {/* Article Preview */}
              <div className="bg-surface border border-border rounded-xl p-8 mb-6">
                <div className="flex gap-2 mb-4 text-xs text-text-dim">
                  <span>📝 {article.wordCount.toLocaleString()}文字</span>
                  <span>・</span>
                  <span>⏱ 読了 約{Math.ceil(article.wordCount / 600)}分</span>
                  <span>・</span>
                  <span>🏷 {analysis?.keyword}</span>
                </div>

                {article.metaDescription && (
                  <div className="bg-surface2 border border-border rounded-lg p-4 mb-6 text-sm">
                    <span className="text-[0.7rem] text-text-dim block mb-1">meta description</span>
                    <span className="text-text-primary">{article.metaDescription}</span>
                  </div>
                )}

                <div
                  className="prose-dark"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                  style={{
                    lineHeight: 1.9,
                  }}
                />

              </div>

              {/* Publish Bar */}
              <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-5">
                <div>
                  <div className="font-semibold text-text-bright mb-1">記事の準備ができました ✅</div>
                  <div className="text-xs text-text-dim">保存、HTMLコピー{wpConnected ? "、WordPress投稿" : ""}ができます</div>
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/articles", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            keyword: analysis?.keyword || "",
                            title: article.title,
                            meta_description: article.metaDescription,
                            content: article.content,
                            word_count: article.wordCount,
                            seo_score: article.seoScore.overall,
                            seo_score_details: article.seoScore,
                          }),
                        });
                        if (!res.ok) throw new Error("保存に失敗しました");
                        const data = await res.json();
                        setSavedArticleId(data.id);
                        alert("記事を保存しました");
                      } catch (e: any) {
                        alert(e.message);
                      }
                    }}
                    className="px-4 py-2.5 rounded-lg text-sm bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold hover:shadow-[0_4px_20px_var(--color-accent-glow)] transition-all"
                  >
                    💾 保存
                  </button>
                  {wpConnected && (
                    <button
                      onClick={async () => {
                        setWpPublishing(true);
                        setWpResult(null);
                        try {
                          // 未保存なら先に保存
                          let artId = savedArticleId;
                          if (!artId) {
                            const saveRes = await fetch("/api/articles", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                keyword: analysis?.keyword || "",
                                title: article.title,
                                meta_description: article.metaDescription,
                                content: article.content,
                                word_count: article.wordCount,
                                seo_score: article.seoScore.overall,
                                seo_score_details: article.seoScore,
                              }),
                            });
                            if (!saveRes.ok) throw new Error("保存に失敗しました");
                            const saveData = await saveRes.json();
                            artId = saveData.id;
                            setSavedArticleId(saveData.id);
                          }
                          const res = await fetch("/api/wordpress/publish", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ articleId: artId }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setWpResult({
                              type: "success",
                              text: data.isUpdate ? "WordPressの下書きを更新しました" : "WordPressに下書き投稿しました",
                              editUrl: data.wpEditUrl,
                            });
                          } else {
                            setWpResult({ type: "error", text: data.error });
                          }
                        } catch {
                          setWpResult({ type: "error", text: "WordPress投稿に失敗しました" });
                        } finally {
                          setWpPublishing(false);
                        }
                      }}
                      disabled={wpPublishing}
                      className="px-4 py-2.5 rounded-lg text-sm bg-surface2 border border-border text-text-primary hover:border-blue-500/30 hover:text-blue-400 transition-all disabled:opacity-50"
                    >
                      {wpPublishing ? "投稿中..." : "🌐 WP下書き投稿"}
                    </button>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(article.content)}
                    className="px-4 py-2.5 rounded-lg text-sm bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent-tint-border)] hover:text-accent transition-all"
                  >
                    📋 HTMLコピー
                  </button>
                  <button
                    onClick={() => {
                      const noteText = convertToNoteFormat(article.content);
                      navigator.clipboard.writeText(noteText);
                      alert("note用テキストをコピーしました");
                    }}
                    className="px-4 py-2.5 rounded-lg text-sm bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent2-tint)] hover:text-accent2 transition-all"
                  >
                    📝 note用
                  </button>
                  <button
                    onClick={() => setShowImageModal(true)}
                    className="px-4 py-2.5 rounded-lg text-sm bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent-tint-border)] hover:text-accent transition-all"
                  >
                    🎨 ヘッダー画像
                  </button>
                </div>
              </div>

              {/* WordPress result */}
              {wpResult && (
                <div className={`mt-4 p-4 rounded-xl text-sm ${
                  wpResult.type === "success"
                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}>
                  {wpResult.text}
                  {wpResult.editUrl && (
                    <a
                      href={wpResult.editUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 underline hover:no-underline"
                    >
                      WP管理画面で確認 →
                    </a>
                  )}
                </div>
              )}

              {/* New article button */}
              <div className="text-center mt-8">
                <button
                  onClick={handleReset}
                  className="text-sm text-text-dim hover:text-accent transition-colors"
                >
                  ← 新しい記事を作成
                </button>
              </div>
            </>
          )}
        </div>

        {/* Image Generate Modal */}
        <ImageGenerateModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          title={article?.title || ""}
          keyword={keyword}
          content={article?.content || ""}
          onTokensUpdated={(remaining) => {
            setTokensRemaining(remaining);
            window.dispatchEvent(new CustomEvent("tokens-updated", { detail: { remaining } }));
          }}
        />

        {/* Token Purchase Modal */}
        {showTokenModal && (
          <div className="fixed inset-0 bg-[var(--color-backdrop)] flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-text-bright">トークンが不足しています</h3>
                <button onClick={() => setShowTokenModal(false)} className="text-text-dim hover:text-text-bright">✕</button>
              </div>
              <p className="text-sm text-text-dim mb-5">
                追加トークンを購入して、記事生成・分析を続けましょう。
              </p>
              <div className="space-y-3">
                {[
                  { id: "pack50", tokens: 50, price: 500 },
                  { id: "pack150", tokens: 150, price: 1200 },
                  { id: "pack500", tokens: 500, price: 3500 },
                ].map((pack) => (
                  <button
                    key={pack.id}
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/stripe/tokens", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ pack: pack.id }),
                        });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                        else alert(data.error || "エラーが発生しました");
                      } catch {
                        alert("エラーが発生しました");
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-surface2 border border-border hover:border-[var(--color-accent-tint-border)] transition-all group"
                  >
                    <div className="text-left">
                      <div className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                        {pack.tokens}トークン
                      </div>
                      <div className="text-xs text-text-dim">
                        ¥{Math.round(pack.price / pack.tokens * 10)}/10トークン
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-text-bright">¥{pack.price.toLocaleString()}</div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[0.7rem] text-text-dim mt-4 text-center">
                購入トークンは月間リセットなし（使い切るまで有効）
              </p>
            </div>
          </div>
        )}
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
      <div className="text-[0.7rem] text-text-dim mb-1">{label}</div>
      <div className="h-1.5 rounded bg-surface2 overflow-hidden mb-1">
        <div
          className={`h-full rounded transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-[0.7rem] text-text-primary font-mono">
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
          className="w-1.5 h-1.5 rounded-full bg-accent"
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
