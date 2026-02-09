"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface KeywordSuggestion {
  keyword: string;
  searchVolume: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  priority: "high" | "medium" | "low";
  longTail: string[];
  reason: string;
}

const levelColors = {
  high: { volume: "bg-green-500/15 text-green-400 border-green-500/20", competition: "bg-red-500/15 text-red-400 border-red-500/20", priority: "bg-[var(--color-accent-tint)] text-accent border-[var(--color-accent-tint-border)]" },
  medium: { volume: "bg-[var(--color-accent2-tint)] text-accent2 border-[var(--color-accent2-tint)]", competition: "bg-[var(--color-warning-tint)] text-warning border-[var(--color-warning-tint)]", priority: "bg-[var(--color-accent2-tint)] text-accent2 border-[var(--color-accent2-tint)]" },
  low: { volume: "bg-surface2 text-text-dim border-border", competition: "bg-green-500/15 text-green-400 border-green-500/20", priority: "bg-surface2 text-text-dim border-border" },
};

const levelLabels = {
  high: "高", medium: "中", low: "低",
};

export default function KeywordsPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState<KeywordSuggestion[]>([]);
  const [resultTopic, setResultTopic] = useState("");
  const [error, setError] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const handleSuggest = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError("");
    setKeywords([]);

    try {
      const res = await fetch("/api/keywords/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.needTokens) {
          setError("トークンが不足しています。トークンを購入してください。");
          return;
        }
        throw new Error(data.error || "提案の取得に失敗しました");
      }

      if (data.remaining !== undefined) {
        window.dispatchEvent(new CustomEvent("tokens-updated", { detail: { remaining: data.remaining } }));
      }

      setKeywords(data.keywords || []);
      setResultTopic(data.topic);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const goToArticle = (keyword: string) => {
    router.push(`/dashboard?keyword=${encodeURIComponent(keyword)}`);
  };

  return (
    <div className="flex h-screen bg-bg text-text-bright">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 min-h-[56px] border-b border-border flex items-center px-7">
          <div className="text-base font-semibold text-text-bright">キーワード提案</div>
        </div>

        <div className="flex-1 overflow-y-auto p-7">
          <div className="max-w-5xl mx-auto">
            {/* Input */}
            <div className="bg-surface border border-border rounded-2xl p-8 mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-accent2 to-accent bg-[length:200%_100%] animate-[gradientSlide_3s_linear_infinite]" />
              <h2 className="text-lg font-bold text-text-bright mb-2">
                キーワード提案
              </h2>
              <p className="text-sm text-text-dim mb-5">
                トピックやジャンルを入力すると、狙うべきSEOキーワードをAIが提案します。
              </p>

              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isComposing && handleSuggest()}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="例: ダイエット、プログラミング 初心者、副業"
                  className="flex-1 px-4 py-3.5 rounded-xl bg-surface2 border border-border text-text-bright text-base outline-none focus:border-accent transition-colors placeholder:text-text-dim"
                  disabled={loading}
                />
                <button
                  onClick={handleSuggest}
                  disabled={loading || !topic.trim()}
                  className="px-7 py-3.5 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold whitespace-nowrap hover:shadow-[0_4px_24px_var(--color-accent-glow)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <LoadingDots /> 提案中...
                    </span>
                  ) : (
                    "キーワードを提案（3トークン）"
                  )}
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {["ダイエット", "プログラミング 初心者", "副業 おすすめ", "転職 30代", "投資 始め方"].map(
                  (kw) => (
                    <button
                      key={kw}
                      onClick={() => setTopic(kw)}
                      className={`px-3.5 py-1.5 rounded-full text-xs border transition-all ${
                        topic === kw
                          ? "bg-[var(--color-accent-tint)] border-[var(--color-accent-tint-border)] text-accent"
                          : "bg-surface2 border-border text-text-dim hover:border-[var(--color-accent-tint-border)] hover:text-accent"
                      }`}
                    >
                      {kw}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Results */}
            {keywords.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-text-bright">
                    「{resultTopic}」の推奨キーワード（{keywords.length}件）
                  </h3>
                  <div className="flex gap-3 text-[0.7rem] text-text-dim">
                    <span>検索Vol</span>
                    <span>競合</span>
                    <span>おすすめ度</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {keywords.map((kw, i) => (
                    <div
                      key={i}
                      className="bg-surface border border-border rounded-xl p-5 hover:border-[var(--color-accent-tint-border)] transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 ${
                            kw.priority === "high" ? "bg-[var(--color-accent-tint)] text-accent" : "bg-surface2 text-text-dim"
                          }`}>
                            {i + 1}
                          </span>
                          <span className="text-base font-semibold text-text-bright truncate">
                            {kw.keyword}
                          </span>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <span className={`text-[0.65rem] px-2 py-0.5 rounded-md border font-medium ${levelColors[kw.searchVolume].volume}`}>
                            Vol {levelLabels[kw.searchVolume]}
                          </span>
                          <span className={`text-[0.65rem] px-2 py-0.5 rounded-md border font-medium ${levelColors[kw.competition].competition}`}>
                            競合 {levelLabels[kw.competition]}
                          </span>
                          <span className={`text-[0.65rem] px-2 py-0.5 rounded-md border font-medium ${levelColors[kw.priority].priority}`}>
                            {kw.priority === "high" ? "おすすめ" : kw.priority === "medium" ? "余裕あれば" : "将来的に"}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-text-dim mb-3">{kw.reason}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex gap-1.5 flex-wrap">
                          {kw.longTail?.map((lt, j) => (
                            <button
                              key={j}
                              onClick={() => goToArticle(lt)}
                              className="text-xs px-2.5 py-1 rounded-md bg-surface2 text-text-primary hover:bg-[var(--color-accent-tint)] hover:text-accent transition-all cursor-pointer"
                            >
                              {lt}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => goToArticle(kw.keyword)}
                          className="text-sm text-accent hover:text-accent-dark transition-colors font-medium flex-shrink-0 ml-3"
                        >
                          この KW で記事を作成 →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
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
