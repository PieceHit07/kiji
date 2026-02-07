"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

interface RankResult {
  keyword: string;
  targetUrl: string;
  position: number | null;
  matchedUrl: string;
  matchedTitle: string;
  checkedAt: string;
  topResults: { rank: number; title: string; url: string }[];
}

interface TrackedKeyword {
  keyword: string;
  targetUrl: string;
  results: RankResult[];
}

export default function RankingPage() {
  const [keyword, setKeyword] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [tracked, setTracked] = useState<TrackedKeyword[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kiji-ranking");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedKw, setExpandedKw] = useState<string | null>(null);

  const save = (data: TrackedKeyword[]) => {
    setTracked(data);
    localStorage.setItem("kiji-ranking", JSON.stringify(data));
  };

  const checkRanking = async (kw: string, url: string) => {
    setLoading(kw);
    try {
      const res = await fetch("/api/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw, targetUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 既存のトラッキングを更新
      const updated = [...tracked];
      const idx = updated.findIndex((t) => t.keyword === kw && t.targetUrl === url);
      if (idx >= 0) {
        updated[idx].results.unshift(data);
        // 最新30件まで保持
        updated[idx].results = updated[idx].results.slice(0, 30);
      } else {
        updated.push({ keyword: kw, targetUrl: url, results: [data] });
      }
      save(updated);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(null);
    }
  };

  const addKeyword = () => {
    if (!keyword.trim() || !targetUrl.trim()) return;
    const exists = tracked.some(
      (t) => t.keyword === keyword.trim() && t.targetUrl === targetUrl.trim()
    );
    if (exists) {
      alert("既に登録済みです");
      return;
    }
    checkRanking(keyword.trim(), targetUrl.trim());
    setKeyword("");
  };

  const removeKeyword = (kw: string, url: string) => {
    save(tracked.filter((t) => !(t.keyword === kw && t.targetUrl === url)));
  };

  const refreshAll = async () => {
    for (const t of tracked) {
      await checkRanking(t.keyword, t.targetUrl);
    }
  };

  return (
    <div className="flex h-screen bg-bg text-text-bright">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold mb-2">順位トラッキング</h1>
              <p className="text-text-dim">
                キーワードの検索順位を追跡します
              </p>
            </div>
            {tracked.length > 0 && (
              <button
                onClick={refreshAll}
                disabled={loading !== null}
                className="px-4 py-2 rounded-lg bg-surface2 border border-border text-text-primary text-sm hover:border-[var(--color-accent-tint-border)] hover:text-accent transition-all disabled:opacity-50"
              >
                {loading ? "チェック中..." : "一括チェック"}
              </button>
            )}
          </div>

          {/* 追加フォーム */}
          <div className="bg-surface border border-border rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="キーワード（例: SEO対策）"
                className="px-4 py-3 rounded-xl bg-surface2 border border-border text-text-bright text-sm outline-none focus:border-accent transition-colors placeholder:text-text-dim"
              />
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="対象URL（例: https://example.com）"
                className="px-4 py-3 rounded-xl bg-surface2 border border-border text-text-bright text-sm outline-none focus:border-accent transition-colors placeholder:text-text-dim"
              />
              <button
                onClick={addKeyword}
                disabled={!keyword.trim() || !targetUrl.trim() || loading !== null}
                className="px-6 py-3 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold text-sm whitespace-nowrap disabled:opacity-50"
              >
                + 追加
              </button>
            </div>
          </div>

          {/* トラッキング一覧 */}
          {tracked.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <p className="text-text-dim">
                キーワードとURLを登録して順位チェックを始めましょう
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tracked.map((t) => {
                const latest = t.results[0];
                const prev = t.results[1];
                const diff =
                  latest && prev && latest.position && prev.position
                    ? prev.position - latest.position
                    : null;
                const isExpanded =
                  expandedKw === `${t.keyword}:${t.targetUrl}`;

                return (
                  <div
                    key={`${t.keyword}:${t.targetUrl}`}
                    className="bg-surface border border-border rounded-xl overflow-hidden"
                  >
                    {/* メイン行 */}
                    <div className="flex items-center gap-4 p-5">
                      {/* 順位 */}
                      <div className="w-16 text-center flex-shrink-0">
                        {latest?.position ? (
                          <div
                            className={`text-3xl font-bold font-mono ${
                              latest.position <= 3
                                ? "text-accent"
                                : latest.position <= 10
                                ? "text-accent2"
                                : "text-warning"
                            }`}
                          >
                            {latest.position}
                            <span className="text-xs text-text-dim">位</span>
                          </div>
                        ) : (
                          <div className="text-lg text-text-dim">圏外</div>
                        )}
                        {diff !== null && (
                          <div
                            className={`text-xs mt-1 ${
                              diff > 0
                                ? "text-accent"
                                : diff < 0
                                ? "text-red-400"
                                : "text-text-dim"
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff === 0 ? "→" : diff}
                          </div>
                        )}
                      </div>

                      {/* キーワード情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-text-bright mb-1">
                          {t.keyword}
                        </div>
                        <div className="text-xs text-text-dim truncate">
                          {t.targetUrl}
                        </div>
                        {latest && (
                          <div className="text-[0.65rem] text-text-dim mt-1">
                            最終チェック:{" "}
                            {new Date(latest.checkedAt).toLocaleString("ja-JP")}
                          </div>
                        )}
                      </div>

                      {/* アクション */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => checkRanking(t.keyword, t.targetUrl)}
                          disabled={loading !== null}
                          className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent-tint-border)] hover:text-accent transition-all disabled:opacity-50"
                        >
                          {loading === t.keyword ? "..." : "チェック"}
                        </button>
                        <button
                          onClick={() =>
                            setExpandedKw(isExpanded ? null : `${t.keyword}:${t.targetUrl}`)
                          }
                          className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent2-tint)] hover:text-accent2 transition-all"
                        >
                          {isExpanded ? "閉じる" : "詳細"}
                        </button>
                        <button
                          onClick={() => removeKeyword(t.keyword, t.targetUrl)}
                          className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-dim hover:border-red-500/20 hover:text-red-400 transition-all"
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    {/* 詳細展開 */}
                    {isExpanded && latest && (
                      <div className="border-t border-border p-5">
                        <h4 className="text-sm text-text-dim mb-3">
                          検索結果 TOP10
                        </h4>
                        <div className="space-y-1">
                          {latest.topResults.map((r) => {
                            const isTarget = new URL(r.url).hostname.replace(/^www\./, "") === new URL(t.targetUrl).hostname.replace(/^www\./, "");
                            return (
                              <div
                                key={r.rank}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                                  isTarget
                                    ? "bg-[var(--color-accent-tint)] border border-[var(--color-accent-tint-border)]"
                                    : ""
                                }`}
                              >
                                <span
                                  className={`w-6 text-center font-mono text-xs font-bold ${
                                    r.rank <= 3 ? "text-accent" : "text-text-dim"
                                  }`}
                                >
                                  {r.rank}
                                </span>
                                <span className="flex-1 truncate text-text-primary">
                                  {r.title}
                                </span>
                                {isTarget && (
                                  <span className="text-[0.65rem] text-accent bg-[var(--color-accent-tint)] px-2 py-0.5 rounded flex-shrink-0">
                                    自サイト
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* 履歴 */}
                        {t.results.length > 1 && (
                          <div className="mt-5">
                            <h4 className="text-sm text-text-dim mb-3">
                              順位推移
                            </h4>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {t.results.slice(0, 14).map((r, i) => (
                                <div
                                  key={i}
                                  className="flex flex-col items-center gap-1 min-w-[60px]"
                                >
                                  <div
                                    className={`text-lg font-bold font-mono ${
                                      r.position
                                        ? r.position <= 3
                                          ? "text-accent"
                                          : r.position <= 10
                                          ? "text-accent2"
                                          : "text-warning"
                                        : "text-text-dim"
                                    }`}
                                  >
                                    {r.position || "-"}
                                  </div>
                                  <div className="text-[0.6rem] text-text-dim">
                                    {new Date(r.checkedAt).toLocaleDateString(
                                      "ja-JP",
                                      { month: "numeric", day: "numeric" }
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
