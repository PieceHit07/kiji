"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    plan: string;
    tokens: { remaining: number; monthly: number; used: number; purchased: number };
  } | null>(null);
  const { data: session } = useSession();

  // WordPress連携
  const [wpSiteUrl, setWpSiteUrl] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");
  const [wpConnected, setWpConnected] = useState<{ siteUrl: string; username: string } | null>(null);
  const [wpTesting, setWpTesting] = useState(false);
  const [wpMessage, setWpMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // GSC連携
  const [gscConnected, setGscConnected] = useState<{ siteUrl: string } | null>(null);
  const [gscMessage, setGscMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((d) => {
          setUserInfo({ plan: d.plan, tokens: d.tokens });
          if (d.wordpress) {
            setWpConnected(d.wordpress);
          }
          if (d.gsc) {
            setGscConnected(d.gsc);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const openPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "エラーが発生しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const testWordPress = async () => {
    setWpTesting(true);
    setWpMessage(null);
    try {
      const res = await fetch("/api/wordpress/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: wpSiteUrl, username: wpUsername, appPassword: wpAppPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setWpConnected({ siteUrl: data.siteUrl, username: wpUsername });
        setWpSiteUrl("");
        setWpUsername("");
        setWpAppPassword("");
        setWpMessage({ type: "success", text: `${data.siteName} に接続しました` });
      } else {
        setWpMessage({ type: "error", text: data.error });
      }
    } catch {
      setWpMessage({ type: "error", text: "接続に失敗しました" });
    } finally {
      setWpTesting(false);
    }
  };

  const disconnectWordPress = async () => {
    try {
      await fetch("/api/wordpress/test", { method: "DELETE" });
      setWpConnected(null);
      setWpMessage(null);
    } catch {
      setWpMessage({ type: "error", text: "解除に失敗しました" });
    }
  };

  const planLabel = userInfo?.plan === "business" ? "Business" : userInfo?.plan === "pro" ? "Pro" : "Free";
  const isPaid = userInfo?.plan === "pro" || userInfo?.plan === "business";
  const isBusiness = userInfo?.plan === "business";

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold text-text-bright mb-8">
            アカウント設定
          </h1>

          {/* Profile */}
          <div className="bg-surface border border-border rounded-xl p-6 mb-6">
            <h2 className="text-base font-semibold text-text-bright mb-4">プロフィール</h2>
            <div className="flex items-center gap-4">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-14 h-14 rounded-xl"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-xl font-bold text-on-accent">
                  {session?.user?.name?.[0] || "U"}
                </div>
              )}
              <div>
                <div className="text-text-bright font-medium">
                  {session?.user?.name || "ユーザー"}
                </div>
                <div className="text-sm text-text-dim">
                  {session?.user?.email}
                </div>
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="bg-surface border border-border rounded-xl p-6 mb-6">
            <h2 className="text-base font-semibold text-text-bright mb-4">プラン</h2>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-sm px-3 py-1 rounded-lg font-medium ${
                  userInfo?.plan === "business"
                    ? "bg-[var(--color-warning-tint)] text-warning"
                    : userInfo?.plan === "pro"
                    ? "bg-[var(--color-accent-tint)] text-accent"
                    : "bg-[var(--color-border)] text-text-dim"
                }`}>
                  {planLabel}
                </span>
                <span className="text-sm text-text-primary">プラン</span>
              </div>
            </div>

            {userInfo?.tokens && (
              <div className="grid grid-cols-3 gap-4 mb-5 p-4 bg-[var(--color-bg)] rounded-lg">
                <div className="text-center">
                  <div className={`text-xl font-bold font-mono ${
                    userInfo.tokens.remaining <= 5 ? "text-red-400" : "text-accent"
                  }`}>
                    {userInfo.tokens.remaining}
                  </div>
                  <div className="text-[0.7rem] text-text-dim mt-0.5">残りトークン</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold font-mono text-text-primary">
                    {userInfo.tokens.monthly}
                  </div>
                  <div className="text-[0.7rem] text-text-dim mt-0.5">月間上限</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold font-mono text-accent2">
                    {userInfo.tokens.purchased}
                  </div>
                  <div className="text-[0.7rem] text-text-dim mt-0.5">購入トークン</div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {isPaid && (
                <button
                  onClick={openPortal}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-text-primary hover:bg-hover-subtle transition-colors disabled:opacity-50"
                >
                  {loading ? "処理中..." : "サブスクリプション管理"}
                </button>
              )}
              {!isPaid && (
                <a
                  href="/pricing"
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent text-on-accent hover:bg-accent-dark transition-colors"
                >
                  プランをアップグレード
                </a>
              )}
              <a
                href="/tokens"
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-text-primary hover:bg-hover-subtle transition-colors"
              >
                トークン購入
              </a>
            </div>
          </div>

          {/* WordPress連携 */}
          <div className="bg-surface border border-border rounded-xl p-6 mb-6 relative">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-text-bright">WordPress連携</h2>
              {!isPaid && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-accent-tint)] text-accent font-medium">
                  Pro
                </span>
              )}
            </div>

            {!isPaid ? (
              <div className="relative">
                <div className="opacity-40 pointer-events-none select-none">
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-sm text-text-primary mb-1">サイトURL</label>
                      <div className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text-dim text-sm">
                        https://example.com
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-text-primary mb-1">ユーザー名</label>
                      <div className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text-dim text-sm">
                        admin
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-text-primary mb-1">アプリケーションパスワード</label>
                      <div className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text-dim text-sm">
                        ••••••••••••
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent text-on-accent w-fit">
                    接続テスト
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <p className="text-sm text-text-primary font-medium mb-1">Proプラン以上で利用可能</p>
                  <p className="text-xs text-text-dim mb-3">記事をWordPressに直接下書き投稿できます</p>
                  <a
                    href="/pricing"
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-on-accent hover:bg-accent-dark transition-colors"
                  >
                    アップグレード
                  </a>
                </div>
              </div>
            ) : wpConnected ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm px-3 py-1 rounded-lg font-medium bg-green-500/10 text-green-400">
                    接続済み
                  </span>
                  <span className="text-sm text-text-primary">{wpConnected.siteUrl}</span>
                </div>
                <p className="text-sm text-text-dim mb-4">
                  ユーザー: {wpConnected.username}
                </p>
                <button
                  onClick={disconnectWordPress}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  接続を解除
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-text-dim mb-4">
                  WordPressサイトを接続して、記事を下書き投稿できます。
                  WordPress管理画面 → ユーザー → アプリケーションパスワードで発行してください。
                </p>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm text-text-primary mb-1">サイトURL</label>
                    <input
                      type="url"
                      value={wpSiteUrl}
                      onChange={(e) => setWpSiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text-bright text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-primary mb-1">ユーザー名</label>
                    <input
                      type="text"
                      value={wpUsername}
                      onChange={(e) => setWpUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text-bright text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-primary mb-1">アプリケーションパスワード</label>
                    <input
                      type="password"
                      value={wpAppPassword}
                      onChange={(e) => setWpAppPassword(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text-bright text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <button
                  onClick={testWordPress}
                  disabled={wpTesting || !wpSiteUrl || !wpUsername || !wpAppPassword}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent text-on-accent hover:bg-accent-dark transition-colors disabled:opacity-50"
                >
                  {wpTesting ? "接続テスト中..." : "接続テスト"}
                </button>
              </div>
            )}

            {wpMessage && (
              <div className={`mt-4 text-sm px-3 py-2 rounded-lg ${
                wpMessage.type === "success"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}>
                {wpMessage.text}
              </div>
            )}
          </div>

          {/* Google Search Console連携 */}
          <div className="bg-surface border border-border rounded-xl p-6 mb-6 relative">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-text-bright">Search Console連携</h2>
              {!isBusiness && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-accent-tint)] text-accent font-medium">
                  Business
                </span>
              )}
            </div>

            {!isBusiness ? (
              <div className="relative">
                <div className="opacity-40 pointer-events-none select-none">
                  <p className="text-sm text-text-dim mb-4">Google Search Consoleを接続して検索パフォーマンスを分析できます。</p>
                  <div className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent text-on-accent w-fit">
                    Googleアカウントで接続
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <p className="text-sm text-text-primary font-medium mb-1">Businessプランで利用可能</p>
                  <p className="text-xs text-text-dim mb-3">検索データからSEO改善を提案します</p>
                  <a
                    href="/pricing"
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-on-accent hover:bg-accent-dark transition-colors"
                  >
                    アップグレード
                  </a>
                </div>
              </div>
            ) : gscConnected ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm px-3 py-1 rounded-lg font-medium bg-green-500/10 text-green-400">
                    接続済み
                  </span>
                  <span className="text-sm text-text-primary">{gscConnected.siteUrl}</span>
                </div>
                <div className="flex gap-3">
                  <a
                    href="/search-console"
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-text-primary hover:bg-hover-subtle transition-colors"
                  >
                    Search Consoleを開く
                  </a>
                  <button
                    onClick={async () => {
                      try {
                        await fetch("/api/gsc/connect", { method: "DELETE" });
                        setGscConnected(null);
                        setGscMessage({ type: "success", text: "Search Consoleの接続を解除しました" });
                      } catch {
                        setGscMessage({ type: "error", text: "解除に失敗しました" });
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    接続を解除
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-text-dim mb-4">
                  Google Search Consoleを接続して、検索パフォーマンスデータに基づいたSEO改善提案を受けられます。
                </p>
                <a
                  href="/api/gsc/connect"
                  className="inline-block px-4 py-2.5 rounded-xl text-sm font-medium bg-accent text-on-accent hover:bg-accent-dark transition-colors"
                >
                  Googleアカウントで接続
                </a>
              </div>
            )}

            {gscMessage && (
              <div className={`mt-4 text-sm px-3 py-2 rounded-lg ${
                gscMessage.type === "success"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}>
                {gscMessage.text}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          {isPaid && (
            <div className="bg-surface border border-red-400/20 rounded-xl p-6">
              <h2 className="text-base font-semibold text-red-400 mb-2">解約</h2>
              <p className="text-sm text-text-dim mb-4">
                サブスクリプションを解約すると、現在の請求期間の終了時にFreeプランに移行します。
                購入済みトークンはそのまま利用できます。
              </p>
              <button
                onClick={openPortal}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
              >
                {loading ? "処理中..." : "解約手続きへ"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
