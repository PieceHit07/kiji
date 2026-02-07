"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import Sidebar from "@/components/Sidebar";

const tokenPacks = [
  { id: "pack50", tokens: 50, price: 500, desc: "お試し", articles: "記事5本分" },
  { id: "pack150", tokens: 150, price: 1200, desc: "人気", articles: "記事15本分" },
  { id: "pack500", tokens: 500, price: 3500, desc: "お得", articles: "記事50本分" },
];

const tokenCosts = [
  { action: "記事生成", cost: 10, color: "bg-accent" },
  { action: "リライト", cost: 5, color: "bg-accent2" },
  { action: "ヘッダー画像生成", cost: 8, color: "bg-accent2" },
  { action: "競合分析", cost: 3, color: "bg-warning" },
  { action: "共起語チェック", cost: 2, color: "bg-text-dim" },
  { action: "順位チェック", cost: 1, color: "bg-text-dim" },
];

export default function TokensPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [balance, setBalance] = useState<{
    remaining: number;
    monthly: number;
    used: number;
    purchased: number;
  } | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((d) => {
          if (d.tokens) setBalance(d.tokens);
        })
        .catch(() => {});
    }
  }, [session]);

  const handlePurchase = async (packId: string) => {
    if (!session) {
      signIn("google", { callbackUrl: "/tokens" });
      return;
    }
    setLoading(packId);
    try {
      const res = await fetch("/api/stripe/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: packId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "エラーが発生しました");
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-text-bright mb-3">
              トークン購入
            </h1>
            <p className="text-text-dim text-lg">
              追加トークンを購入して、記事生成・分析を続けましょう
            </p>
          </div>

          {/* Current Balance */}
          {balance && (
            <div className="bg-surface border border-border rounded-xl p-6 mb-8">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className={`text-2xl font-bold font-mono ${
                    balance.remaining <= 5 ? "text-red-400" : balance.remaining <= 20 ? "text-warning" : "text-accent"
                  }`}>
                    {balance.remaining}
                  </div>
                  <div className="text-xs text-text-dim mt-1">残りトークン</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-text-primary">
                    {balance.monthly}
                  </div>
                  <div className="text-xs text-text-dim mt-1">月間上限</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-text-primary">
                    {balance.used}
                  </div>
                  <div className="text-xs text-text-dim mt-1">今月消費済み</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-accent2">
                    {balance.purchased}
                  </div>
                  <div className="text-xs text-text-dim mt-1">購入トークン</div>
                </div>
              </div>
            </div>
          )}

          {/* Token Packs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {tokenPacks.map((pack) => (
              <div
                key={pack.id}
                className={`bg-surface border rounded-2xl p-6 text-center flex flex-col ${
                  pack.id === "pack150"
                    ? "border-[var(--color-accent-tint-border)] shadow-[0_0_30px_var(--color-accent-glow-soft)] relative"
                    : "border-border"
                }`}
              >
                {pack.id === "pack150" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[var(--color-accent-tint)] border border-[var(--color-accent-tint-border)] text-accent text-xs font-medium">
                    おすすめ
                  </div>
                )}
                <div className="text-xs text-text-dim mb-2 pt-1">{pack.desc}</div>
                <div className="text-3xl font-bold text-text-bright mb-1">
                  {pack.tokens}
                  <span className="text-sm text-text-dim font-normal ml-1">トークン</span>
                </div>
                <div className="text-xs text-text-dim mb-4">{pack.articles}</div>
                <div className="text-2xl font-bold text-accent mb-1">
                  ¥{pack.price.toLocaleString()}
                </div>
                <div className="text-[0.7rem] text-text-dim mb-5">
                  ¥{Math.round(pack.price / pack.tokens * 10)}/10トークン
                </div>
                <button
                  onClick={() => handlePurchase(pack.id)}
                  disabled={loading === pack.id}
                  className={`w-full py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 mt-auto ${
                    pack.id === "pack150"
                      ? "bg-accent text-on-accent hover:bg-accent-dark"
                      : "bg-[var(--color-border)] text-text-primary hover:bg-hover-strong"
                  }`}
                >
                  {loading === pack.id ? "処理中..." : "購入する"}
                </button>
              </div>
            ))}
          </div>

          {/* Token Cost Table */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-base font-semibold text-text-bright mb-4">トークン消費量</h3>
            <div className="space-y-3">
              {tokenCosts.map((item) => (
                <div key={item.action} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm text-text-primary">{item.action}</span>
                  </div>
                  <span className="text-sm font-mono text-text-dim">{item.cost} トークン</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border text-[0.75rem] text-text-dim">
              購入トークンは月間リセットなし（使い切るまで有効）。月間トークンが先に消費されます。
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
