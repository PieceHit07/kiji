"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";

interface BatchResult {
  keyword: string;
  status: "completed" | "failed";
  articleId?: string;
  title?: string;
  seoScore?: number;
  error?: string;
}

const tonePresets = [
  { id: "default", label: "標準" },
  { id: "casual", label: "カジュアル" },
  { id: "professional", label: "専門的" },
  { id: "beginner", label: "初心者向け" },
  { id: "persuasive", label: "セールス" },
];

export default function BulkPage() {
  const [keywordsText, setKeywordsText] = useState("");
  const [selectedTone, setSelectedTone] = useState("default");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  const [userPlan, setUserPlan] = useState<string>("free");
  const [tokensRemaining, setTokensRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Processing state
  const [batchId, setBatchId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [progress, setProgress] = useState({ completed: 0, failed: 0, total: 0 });
  const [currentKeyword, setCurrentKeyword] = useState<string>("");
  const [batchDone, setBatchDone] = useState(false);

  const { data: session } = useSession();
  const abortRef = useRef(false);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((d) => {
          if (d.plan) setUserPlan(d.plan);
          if (d.tokens) setTokensRemaining(d.tokens.remaining);
        })
        .catch(() => {});
    }
  }, [session]);

  const isPaid = userPlan === "pro" || userPlan === "business";
  const keywordList = keywordsText
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k.length >= 2);
  const uniqueKeywords = Array.from(new Set(keywordList));
  const tokensRequired = uniqueKeywords.length * 13;
  const canStart = isPaid && uniqueKeywords.length >= 2 && tokensRemaining >= tokensRequired;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        const lines = text.split(/[\r\n]+/).map((l) => l.split(",")[0]?.trim()).filter(Boolean);
        setKeywordsText(lines.join("\n"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const startBatch = async () => {
    if (!canStart) return;
    setLoading(true);
    setError("");
    setResults([]);
    setProgress({ completed: 0, failed: 0, total: 0 });
    setBatchDone(false);
    abortRef.current = false;

    try {
      // 1. バッチジョブ作成
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: uniqueKeywords,
          options: { tone: selectedTone, customPrompt: customPrompt || undefined },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.needTokens) {
          setError(`トークンが不足しています（必要: ${data.required}, 残り: ${data.remaining}）`);
        } else {
          setError(data.error || "バッチジョブの作成に失敗しました");
        }
        setLoading(false);
        return;
      }

      setBatchId(data.id);
      setProgress({ completed: 0, failed: 0, total: data.totalKeywords });
      setProcessing(true);
      setLoading(false);

      // 2. クライアント駆動型処理ループ
      let done = false;
      while (!done && !abortRef.current) {
        const nextRes = await fetch(`/api/bulk/${data.id}/next`, { method: "POST" });
        const nextData = await nextRes.json();

        if (!nextRes.ok) {
          setError(nextData.error || "処理中にエラーが発生しました");
          break;
        }

        if (nextData.remaining !== undefined) {
          setTokensRemaining(nextData.remaining);
          window.dispatchEvent(new CustomEvent("tokens-updated", { detail: { remaining: nextData.remaining } }));
        }

        if (nextData.current) {
          setResults((prev) => [...prev, nextData.current]);
          setCurrentKeyword(nextData.current.keyword);
        }

        setProgress(nextData.progress);

        if (nextData.status === "completed") {
          done = true;
          setBatchDone(true);
        }
      }
    } catch (e: any) {
      setError(e.message || "エラーが発生しました");
    } finally {
      setProcessing(false);
      setLoading(false);
      setCurrentKeyword("");
    }
  };

  const cancelBatch = () => {
    abortRef.current = true;
  };

  const avgScore = results.filter((r) => r.seoScore).length > 0
    ? Math.round(results.filter((r) => r.seoScore).reduce((sum, r) => sum + (r.seoScore || 0), 0) / results.filter((r) => r.seoScore).length)
    : 0;

  return (
    <div className="flex h-screen bg-bg text-text-bright">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 min-h-[56px] border-b border-border flex items-center justify-between px-7">
          <div className="text-base font-semibold text-text-bright">一括記事生成</div>
          {isPaid && (
            <div className={`text-xs bg-surface2 px-3 py-1.5 rounded-md ${
              tokensRemaining <= 20 ? "text-warning" : "text-text-dim"
            }`}>
              残りトークン: <span className="font-bold font-mono">{tokensRemaining}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-7">
          <div className="max-w-4xl mx-auto">
            {/* Plan gate */}
            {!isPaid ? (
              <div className="bg-surface border border-border rounded-2xl p-8 relative overflow-hidden">
                <div className="opacity-40 pointer-events-none select-none">
                  <h2 className="text-lg font-bold mb-2">一括記事生成</h2>
                  <p className="text-sm text-text-dim mb-4">複数のキーワードをまとめて記事生成します。</p>
                  <div className="h-32 bg-surface2 rounded-xl" />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <p className="text-sm text-text-primary font-medium mb-1">Proプラン以上で利用可能</p>
                  <p className="text-xs text-text-dim mb-3">複数キーワードを一括で記事生成できます</p>
                  <a
                    href="/pricing"
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-on-accent hover:bg-accent-dark transition-colors"
                  >
                    アップグレード
                  </a>
                </div>
              </div>
            ) : !processing && !batchDone ? (
              <>
                {/* Input */}
                <div className="bg-surface border border-border rounded-2xl p-8 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-accent2 to-accent bg-[length:200%_100%] animate-[gradientSlide_3s_linear_infinite]" />
                  <h2 className="text-lg font-bold text-text-bright mb-2">一括記事生成</h2>
                  <p className="text-sm text-text-dim mb-5">
                    キーワードを1行1つで入力するか、CSVファイルをアップロードしてください。
                  </p>

                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <textarea
                        value={keywordsText}
                        onChange={(e) => setKeywordsText(e.target.value)}
                        placeholder={"SEO対策 初心者\nブログ 書き方\nアフィリエイト 始め方\nコンテンツマーケティング\nWordPress テーマ"}
                        rows={8}
                        className="w-full px-4 py-3 rounded-xl bg-surface2 border border-border text-text-bright text-sm outline-none focus:border-accent transition-colors placeholder:text-text-dim resize-none font-mono"
                      />
                    </div>
                    <div className="w-48 flex flex-col gap-3">
                      <label className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-accent cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <span className="text-2xl mb-1">📄</span>
                        <span className="text-xs text-text-dim text-center px-2">CSV/TXT<br />アップロード</span>
                      </label>
                      <div className="bg-surface2 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold font-mono text-accent">{uniqueKeywords.length}</div>
                        <div className="text-[0.65rem] text-text-dim">キーワード数</div>
                      </div>
                    </div>
                  </div>

                  {/* Token calculation */}
                  <div className={`flex items-center gap-4 p-3 rounded-lg mb-4 text-sm ${
                    tokensRemaining >= tokensRequired ? "bg-[var(--color-accent-tint)]" : "bg-red-500/10"
                  }`}>
                    <span className="text-text-primary">
                      {uniqueKeywords.length}件 × 13トークン = <span className="font-bold font-mono">{tokensRequired}</span>トークン
                    </span>
                    <span className="text-text-dim">|</span>
                    <span className={tokensRemaining >= tokensRequired ? "text-accent" : "text-red-400"}>
                      残り: {tokensRemaining}トークン
                      {tokensRemaining < tokensRequired && " (不足)"}
                    </span>
                  </div>

                  {/* Options toggle */}
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="text-sm text-text-dim hover:text-accent transition-colors flex items-center gap-2 mb-4"
                  >
                    <span className={`transform transition-transform ${showOptions ? "rotate-90" : ""}`}>▶</span>
                    詳細設定（トーン・カスタムプロンプト）
                  </button>

                  {showOptions && (
                    <div className="space-y-4 pt-4 border-t border-border mb-4">
                      <div>
                        <label className="text-sm text-text-dim block mb-2">文体・トーン</label>
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
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-text-dim block mb-2">カスタムプロンプト</label>
                        <textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder="全記事に適用する追加指示..."
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl bg-surface2 border border-border text-text-bright text-sm outline-none focus:border-accent transition-colors placeholder:text-text-dim resize-none"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={startBatch}
                    disabled={!canStart || loading}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold hover:shadow-[0_4px_24px_var(--color-accent-glow)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "準備中..." : `一括生成開始（${tokensRequired}トークン）`}
                  </button>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Processing / Results */}
                <div className="bg-surface border border-border rounded-2xl p-8 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-text-bright">
                      {batchDone ? "一括生成完了" : "一括生成中..."}
                    </h2>
                    {!batchDone && (
                      <button
                        onClick={cancelBatch}
                        className="px-4 py-2 rounded-lg text-sm border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        中止
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-primary">
                        {progress.completed + progress.failed} / {progress.total} 件
                      </span>
                      {!batchDone && currentKeyword && (
                        <span className="text-text-dim">
                          処理中: {currentKeyword}
                        </span>
                      )}
                    </div>
                    <div className="h-2 rounded-full bg-surface2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all duration-500"
                        style={{ width: `${progress.total > 0 ? ((progress.completed + progress.failed) / progress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  {batchDone && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-[var(--color-bg)] rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold font-mono text-accent">{progress.completed}</div>
                        <div className="text-xs text-text-dim mt-1">成功</div>
                      </div>
                      <div className="bg-[var(--color-bg)] rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold font-mono text-red-400">{progress.failed}</div>
                        <div className="text-xs text-text-dim mt-1">失敗</div>
                      </div>
                      <div className="bg-[var(--color-bg)] rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold font-mono text-accent2">{avgScore}</div>
                        <div className="text-xs text-text-dim mt-1">平均SEOスコア</div>
                      </div>
                    </div>
                  )}

                  {/* Results list */}
                  <div className="space-y-2">
                    {results.map((r, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          r.status === "completed" ? "bg-green-500/5" : "bg-red-500/5"
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          r.status === "completed" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                        }`}>
                          {r.status === "completed" ? "✓" : "✗"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-text-primary truncate">
                            {r.title || r.keyword}
                          </div>
                          <div className="text-xs text-text-dim">{r.keyword}</div>
                        </div>
                        {r.seoScore !== undefined && (
                          <span className="text-sm font-mono font-bold text-accent flex-shrink-0">
                            {r.seoScore}
                          </span>
                        )}
                        {r.error && (
                          <span className="text-xs text-red-400 flex-shrink-0">{r.error}</span>
                        )}
                      </div>
                    ))}

                    {/* Processing indicator */}
                    {!batchDone && processing && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-accent-tint)]">
                        <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0">
                          <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </span>
                        <span className="text-sm text-accent">
                          {currentKeyword ? `${currentKeyword} を生成中...` : "次のキーワードを準備中..."}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {batchDone && (
                  <div className="flex gap-3 justify-center">
                    <a
                      href="/articles"
                      className="px-6 py-3 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold hover:shadow-[0_4px_24px_var(--color-accent-glow)] transition-all"
                    >
                      記事一覧で確認
                    </a>
                    <button
                      onClick={() => {
                        setBatchId(null);
                        setProcessing(false);
                        setResults([]);
                        setProgress({ completed: 0, failed: 0, total: 0 });
                        setBatchDone(false);
                        setKeywordsText("");
                        setError("");
                      }}
                      className="px-6 py-3 rounded-xl bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent-tint-border)] hover:text-accent transition-all"
                    >
                      新しいバッチを作成
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
