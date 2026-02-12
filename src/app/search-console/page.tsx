"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface KeywordData {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Opportunity {
  keyword: string;
  position: number;
  impressions: number;
  clicks: number;
  potentialClicks: number;
  type: "improve" | "content_gap";
}

type Tab = "queries" | "opportunities" | "gaps";

export default function SearchConsolePage() {
  return (
    <Suspense>
      <SearchConsoleContent />
    </Suspense>
  );
}

function SearchConsoleContent() {
  const [tab, setTab] = useState<Tab>("queries");
  const [loading, setLoading] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [gscConnected, setGscConnected] = useState(false);
  const [gscSiteUrl, setGscSiteUrl] = useState<string>("");
  const [error, setError] = useState("");

  // Data
  const [queries, setQueries] = useState<KeywordData[]>([]);
  const [improvements, setImprovements] = useState<Opportunity[]>([]);
  const [contentGaps, setContentGaps] = useState<Opportunity[]>([]);

  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isPaid = userPlan === "business";

  // ユーザー情報取得
  useEffect(() => {
    if (session?.user) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((d) => {
          if (d.plan) setUserPlan(d.plan);
          if (d.gsc) {
            setGscConnected(true);
            setGscSiteUrl(d.gsc.siteUrl);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  // OAuth callback handling
  useEffect(() => {
    const connected = searchParams.get("connected");
    const site = searchParams.get("site");
    const oauthError = searchParams.get("error");

    if (connected === "true") {
      setGscConnected(true);
      if (site) setGscSiteUrl(site);
    }

    if (oauthError) {
      const errorMessages: Record<string, string> = {
        oauth_denied: "Google認証がキャンセルされました",
        token_exchange: "トークンの取得に失敗しました",
        no_token: "トークンが取得できませんでした",
        invalid_callback: "無効なコールバックです",
        unknown: "不明なエラーが発生しました",
      };
      setError(errorMessages[oauthError] || "エラーが発生しました");
    }
  }, [searchParams]);

  // データ取得
  const fetchData = async (type: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/gsc/data?type=${type}&days=28`);
      const data = await res.json();

      if (!res.ok) {
        if (data.reconnect) {
          setGscConnected(false);
        }
        throw new Error(data.error);
      }

      if (type === "queries") {
        setQueries(data.data || []);
      } else if (type === "opportunities") {
        setImprovements(data.data?.improve || []);
        setContentGaps(data.data?.contentGaps || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gscConnected && isPaid) {
      fetchData("queries");
      fetchData("opportunities");
    }
  }, [gscConnected, isPaid]);

  const disconnectGSC = async () => {
    try {
      await fetch("/api/gsc/connect", { method: "DELETE" });
      setGscConnected(false);
      setGscSiteUrl("");
      setQueries([]);
      setImprovements([]);
      setContentGaps([]);
    } catch {
      setError("接続解除に失敗しました");
    }
  };

  const goToArticle = (keyword: string) => {
    router.push(`/dashboard?keyword=${encodeURIComponent(keyword)}`);
  };

  const goToRewrite = (keyword: string) => {
    router.push(`/rewrite?keyword=${encodeURIComponent(keyword)}`);
  };

  const tabs = [
    { id: "queries" as Tab, label: "既存キーワード", count: queries.length },
    { id: "opportunities" as Tab, label: "改善チャンス", count: improvements.length },
    { id: "gaps" as Tab, label: "コンテンツギャップ", count: contentGaps.length },
  ];

  return (
    <div className="flex h-screen bg-bg text-text-bright">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 min-h-[56px] border-b border-border flex items-center px-7">
          <div className="text-base font-semibold text-text-bright">Search Console</div>
        </div>

        <div className="flex-1 overflow-y-auto p-7">
          <div className="max-w-6xl mx-auto">
            {/* Plan gate */}
            {!isPaid ? (
              <div className="bg-surface border border-border rounded-2xl p-8 relative overflow-hidden">
                <div className="opacity-40 pointer-events-none select-none">
                  <h2 className="text-lg font-bold mb-2">Google Search Console</h2>
                  <p className="text-sm text-text-dim mb-4">実データに基づいたSEO改善提案。</p>
                  <div className="h-48 bg-surface2 rounded-xl" />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <p className="text-sm text-text-primary font-medium mb-1">Businessプランで利用可能</p>
                  <p className="text-xs text-text-dim mb-3">Google Search Consoleのデータからキーワード改善を提案します</p>
                  <a
                    href="/pricing"
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-on-accent hover:bg-accent-dark transition-colors"
                  >
                    アップグレード
                  </a>
                </div>
              </div>
            ) : !gscConnected ? (
              <div className="bg-surface border border-border rounded-2xl p-8">
                <h2 className="text-lg font-bold text-text-bright mb-3">Google Search Consoleを接続</h2>
                <p className="text-sm text-text-dim mb-6 max-w-xl">
                  Search Consoleを接続すると、サイトの検索パフォーマンスデータを分析して、
                  SEO改善の提案やコンテンツギャップの発見ができます。
                </p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-[var(--color-bg)] rounded-xl p-4">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="text-sm font-medium text-text-primary mb-1">既存キーワード分析</div>
                    <div className="text-xs text-text-dim">現在のランキングとクリック数を確認</div>
                  </div>
                  <div className="bg-[var(--color-bg)] rounded-xl p-4">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="text-sm font-medium text-text-primary mb-1">改善チャンス発見</div>
                    <div className="text-xs text-text-dim">順位を上げればアクセス増が見込めるKW</div>
                  </div>
                  <div className="bg-[var(--color-bg)] rounded-xl p-4">
                    <div className="text-2xl mb-2">💡</div>
                    <div className="text-sm font-medium text-text-primary mb-1">コンテンツギャップ</div>
                    <div className="text-xs text-text-dim">表示はあるがコンテンツがないクエリ</div>
                  </div>
                </div>
                <a
                  href="/api/gsc/connect"
                  className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold hover:shadow-[0_4px_24px_var(--color-accent-glow)] transition-all"
                >
                  Googleアカウントで接続
                </a>
              </div>
            ) : (
              <>
                {/* Connected header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm px-3 py-1 rounded-lg font-medium bg-green-500/10 text-green-400">
                      接続済み
                    </span>
                    <span className="text-sm text-text-primary">{gscSiteUrl}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { fetchData("queries"); fetchData("opportunities"); }}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-dim hover:text-accent transition-all disabled:opacity-50"
                    >
                      {loading ? "更新中..." : "データ更新"}
                    </button>
                    <button
                      onClick={disconnectGSC}
                      className="px-3 py-1.5 rounded-lg text-xs border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      接続解除
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-surface border border-border rounded-xl p-1">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        tab === t.id
                          ? "bg-[var(--color-accent-tint)] text-accent"
                          : "text-text-dim hover:text-text-primary"
                      }`}
                    >
                      {t.label}
                      {t.count > 0 && (
                        <span className="ml-1.5 text-xs opacity-60">{t.count}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {loading && queries.length === 0 ? (
                  <div className="text-center py-16 text-text-dim">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">データを取得中...</p>
                  </div>
                ) : (
                  <>
                    {tab === "queries" && (
                      <div className="bg-surface border border-border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-4 text-text-dim font-medium">キーワード</th>
                              <th className="text-right p-4 text-text-dim font-medium w-24">順位</th>
                              <th className="text-right p-4 text-text-dim font-medium w-28">表示回数</th>
                              <th className="text-right p-4 text-text-dim font-medium w-24">クリック</th>
                              <th className="text-right p-4 text-text-dim font-medium w-20">CTR</th>
                              <th className="p-4 w-32" />
                            </tr>
                          </thead>
                          <tbody>
                            {queries.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center py-12 text-text-dim">
                                  データがありません。Search Consoleにデータが蓄積されるまで数日かかる場合があります。
                                </td>
                              </tr>
                            ) : queries.map((kw, i) => (
                              <tr key={i} className="border-b border-border last:border-0 hover:bg-white/[0.02]">
                                <td className="p-4 text-text-primary">{kw.keyword}</td>
                                <td className="p-4 text-right">
                                  <span className={`font-mono font-bold ${
                                    kw.position <= 3 ? "text-accent" : kw.position <= 10 ? "text-accent2" : "text-warning"
                                  }`}>
                                    {kw.position}
                                  </span>
                                </td>
                                <td className="p-4 text-right text-text-primary font-mono">{kw.impressions.toLocaleString()}</td>
                                <td className="p-4 text-right text-text-primary font-mono">{kw.clicks.toLocaleString()}</td>
                                <td className="p-4 text-right text-text-dim font-mono">{(kw.ctr * 100).toFixed(1)}%</td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => goToArticle(kw.keyword)}
                                    className="text-xs text-accent hover:text-accent-dark transition-colors"
                                  >
                                    記事作成 →
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {tab === "opportunities" && (
                      <div className="space-y-3">
                        {improvements.length === 0 ? (
                          <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-dim text-sm">
                            改善チャンスが見つかりませんでした。データが蓄積されるとここに表示されます。
                          </div>
                        ) : improvements.map((op, i) => (
                          <div key={i} className="bg-surface border border-border rounded-xl p-5 hover:border-[var(--color-accent-tint-border)] transition-all">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <span className="text-base font-semibold text-text-bright">{op.keyword}</span>
                                <div className="flex gap-4 mt-1 text-xs text-text-dim">
                                  <span>現在 <span className="font-mono font-bold text-warning">{op.position}位</span></span>
                                  <span>表示 <span className="font-mono">{op.impressions.toLocaleString()}</span>回</span>
                                  <span>クリック <span className="font-mono">{op.clicks}</span></span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs text-text-dim">推定流入増</div>
                                <div className="text-lg font-bold font-mono text-accent">+{op.potentialClicks}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => goToRewrite(op.keyword)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-accent-tint)] text-accent hover:bg-accent hover:text-on-accent transition-all"
                              >
                                リライト
                              </button>
                              <button
                                onClick={() => goToArticle(op.keyword)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-surface2 text-text-primary hover:text-accent transition-all"
                              >
                                新記事作成
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {tab === "gaps" && (
                      <div className="space-y-3">
                        {contentGaps.length === 0 ? (
                          <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-dim text-sm">
                            コンテンツギャップが見つかりませんでした。データが蓄積されるとここに表示されます。
                          </div>
                        ) : contentGaps.map((gap, i) => (
                          <div key={i} className="bg-surface border border-border rounded-xl p-5 hover:border-[var(--color-accent-tint-border)] transition-all">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <span className="text-base font-semibold text-text-bright">{gap.keyword}</span>
                                <div className="flex gap-4 mt-1 text-xs text-text-dim">
                                  <span>表示 <span className="font-mono">{gap.impressions.toLocaleString()}</span>回</span>
                                  <span>CTR <span className="font-mono text-red-400">{(gap.clicks / gap.impressions * 100).toFixed(1)}%</span></span>
                                  <span>順位 <span className="font-mono">{gap.position}</span></span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs text-text-dim">推定獲得可能</div>
                                <div className="text-lg font-bold font-mono text-accent2">+{gap.potentialClicks}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => goToArticle(gap.keyword)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-accent2-tint)] text-accent2 hover:bg-accent2 hover:text-on-accent transition-all"
                            >
                              この KW で記事作成
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-6 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
