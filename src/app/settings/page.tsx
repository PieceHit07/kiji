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

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((d) => {
          setUserInfo({ plan: d.plan, tokens: d.tokens });
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

  const planLabel = userInfo?.plan === "business" ? "Business" : userInfo?.plan === "pro" ? "Pro" : "Free";
  const isPaid = userInfo?.plan === "pro" || userInfo?.plan === "business";

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
