"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

const plans = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    originalMonthly: null,
    originalYearly: null,
    description: "まずは試してみたい方に",
    highlight: false,
    features: [
      { label: "月間トークン", value: "20" },
      { label: "記事保存", value: "2本" },
      { label: "競合分析", value: "上位3記事" },
      { label: "AIモデル", value: "GPT-4o mini" },
      { label: "AI画像生成", value: true },
      { label: "WordPress連携", value: false },
      { label: "リライト提案", value: false },
      { label: "順位トラッキング", value: false },
      { label: "優先サポート", value: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 1980,
    yearlyPrice: 19800,
    originalMonthly: 2980,
    originalYearly: null,
    description: "本格的にSEO記事を量産したい方に",
    highlight: true,
    badge: "🎉 ローンチ記念価格",
    features: [
      { label: "月間トークン", value: "300" },
      { label: "記事保存", value: "15本" },
      { label: "競合分析", value: "上位10記事" },
      { label: "AIモデル", value: "GPT-4o" },
      { label: "AI画像生成", value: true },
      { label: "WordPress連携", value: true },
      { label: "リライト提案", value: false },
      { label: "順位トラッキング", value: false },
      { label: "優先サポート", value: false },
    ],
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 3980,
    yearlyPrice: 39800,
    originalMonthly: 4980,
    originalYearly: null,
    description: "チームで本格運用したい方に",
    highlight: false,
    badge: "🎉 ローンチ記念価格",
    features: [
      { label: "月間トークン", value: "1000" },
      { label: "記事保存", value: "30本" },
      { label: "競合分析", value: "上位10記事" },
      { label: "AIモデル", value: "GPT-4o" },
      { label: "AI画像生成", value: true },
      { label: "WordPress連携", value: true },
      { label: "リライト提案", value: true },
      { label: "順位トラッキング", value: "20KW" },
      { label: "優先サポート", value: true },
    ],
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  const handleCheckout = async (planId: string) => {
    if (planId === "free") {
      router.push("/dashboard");
      return;
    }

    if (!session) {
      signIn("google", { callbackUrl: "/pricing" });
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          billing: isYearly ? "yearly" : "monthly",
        }),
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
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-14 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-bright mb-3">
              料金プラン
            </h1>
            <p className="text-text-dim text-lg">
              あなたのニーズに合ったプランをお選びください
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <span
              className={`text-sm ${
                !isYearly ? "text-text-bright" : "text-text-dim"
              }`}
            >
              月払い
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                isYearly ? "bg-accent" : "bg-[var(--color-border-strong)]"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  isYearly ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-sm ${
                isYearly ? "text-text-bright" : "text-text-dim"
              }`}
            >
              年払い
            </span>
            <span className="text-xs text-accent bg-[var(--color-accent-tint)] px-2.5 py-1 rounded-full">
              2ヶ月分お得
            </span>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
              const original = isYearly
                ? plan.originalYearly
                : plan.originalMonthly;
              const perMonth = isYearly && plan.yearlyPrice > 0
                ? Math.round(plan.yearlyPrice / 12)
                : null;

              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-6 flex flex-col ${
                    plan.highlight
                      ? "bg-surface border-2 border-[var(--color-accent-tint-border)] shadow-[0_0_30px_var(--color-accent-glow-soft)]"
                      : "bg-surface border border-border"
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[var(--color-accent-tint)] border border-[var(--color-accent-tint-border)] text-accent text-xs font-medium whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-6 pt-2">
                    <h2
                      className={`text-xl font-bold mb-1 ${
                        plan.highlight ? "text-accent" : "text-text-bright"
                      }`}
                    >
                      {plan.name}
                    </h2>
                    <p className="text-text-dim text-sm">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    {original && (
                      <div className="text-text-dim text-sm line-through mb-1">
                        ¥{original.toLocaleString()}/{isYearly ? "年" : "月"}
                      </div>
                    )}
                    <div className="flex items-end gap-1">
                      <span className="text-text-bright text-4xl font-bold">
                        ¥{price.toLocaleString()}
                      </span>
                      <span className="text-text-dim text-sm mb-1">
                        /{isYearly ? "年" : "月"}
                      </span>
                    </div>
                    {perMonth && (
                      <div className="text-accent text-xs mt-1">
                        実質¥{perMonth.toLocaleString()}/月
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full py-3 rounded-xl font-medium text-sm mb-6 transition-colors disabled:opacity-50 ${
                      plan.highlight
                        ? "bg-accent text-on-accent hover:bg-accent-dark"
                        : "bg-[var(--color-border)] text-text-primary hover:bg-hover-strong"
                    }`}
                  >
                    {loading === plan.id
                      ? "処理中..."
                      : price === 0
                        ? "無料で始める"
                        : "このプランを選ぶ"}
                  </button>

                  {/* Features */}
                  <div className="space-y-3 flex-1">
                    {plan.features.map((feature) => (
                      <div
                        key={feature.label}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-text-dim">
                          {feature.label}
                        </span>
                        <span>
                          {feature.value === true ? (
                            <span className="text-accent">○</span>
                          ) : feature.value === false ? (
                            <span className="text-text-dim/50">×</span>
                          ) : (
                            <span className="text-text-primary font-medium">
                              {feature.value}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Token Packs */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-text-bright mb-2">追加トークン</h2>
              <p className="text-text-dim">
                月間トークンを使い切っても、追加購入で継続利用できます
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {[
                { id: "pack50", tokens: 50, price: 500, desc: "お試し" },
                { id: "pack150", tokens: 150, price: 1200, desc: "人気" },
                { id: "pack500", tokens: 500, price: 3500, desc: "お得" },
              ].map((pack) => (
                <div
                  key={pack.id}
                  className={`bg-surface border rounded-xl p-5 text-center ${
                    pack.id === "pack150"
                      ? "border-[var(--color-accent-tint-border)] shadow-[0_0_20px_var(--color-accent-glow-soft)]"
                      : "border-border"
                  }`}
                >
                  <div className="text-xs text-text-dim mb-1">{pack.desc}</div>
                  <div className="text-2xl font-bold text-text-bright mb-1">{pack.tokens}<span className="text-sm text-text-dim font-normal ml-1">トークン</span></div>
                  <div className="text-xl font-bold text-accent mb-3">¥{pack.price.toLocaleString()}</div>
                  <div className="text-[0.7rem] text-text-dim mb-4">¥{Math.round(pack.price / pack.tokens * 10)}/10トークン</div>
                  <button
                    onClick={async () => {
                      if (!session) {
                        signIn("google", { callbackUrl: "/pricing" });
                        return;
                      }
                      setLoading(pack.id);
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
                      } finally {
                        setLoading(null);
                      }
                    }}
                    disabled={loading === pack.id}
                    className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--color-border)] text-text-primary hover:bg-hover-strong transition-colors disabled:opacity-50"
                  >
                    {loading === pack.id ? "処理中..." : "購入する"}
                  </button>
                </div>
              ))}
            </div>
            <div className="text-center mt-5">
              <p className="text-xs text-text-dim">
                購入トークンは月間リセットなし（使い切るまで有効）・記事生成=10 / リライト=5 / 画像生成=8 / 分析=3 / 共起語=2 / 順位=1
              </p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-center">
            <p className="text-text-dim text-sm">
              いつでもキャンセル可能です。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
