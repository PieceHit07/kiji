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
      { label: "記事生成", value: "3本/月" },
      { label: "記事保存", value: "2本" },
      { label: "競合分析", value: "上位3記事" },
      { label: "AIモデル", value: "GPT-4o mini" },
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
      { label: "記事生成", value: "30本/月" },
      { label: "記事保存", value: "15本" },
      { label: "競合分析", value: "上位10記事" },
      { label: "AIモデル", value: "GPT-4o" },
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
      { label: "記事生成", value: "無制限" },
      { label: "記事保存", value: "30本" },
      { label: "競合分析", value: "上位10記事" },
      { label: "AIモデル", value: "GPT-4o" },
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
    <div className="flex min-h-screen bg-[#08080d]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#f0f0f6] mb-3">
              料金プラン
            </h1>
            <p className="text-[#6e6e82] text-lg">
              あなたのニーズに合ったプランをお選びください
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <span
              className={`text-sm ${
                !isYearly ? "text-[#f0f0f6]" : "text-[#6e6e82]"
              }`}
            >
              月払い
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                isYearly ? "bg-[#00e5a0]" : "bg-white/[0.1]"
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
                isYearly ? "text-[#f0f0f6]" : "text-[#6e6e82]"
              }`}
            >
              年払い
            </span>
            <span className="text-xs text-[#00e5a0] bg-[#00e5a0]/10 px-2.5 py-1 rounded-full">
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
                      ? "bg-[#111119] border-2 border-[#00e5a0]/40 shadow-[0_0_30px_rgba(0,229,160,0.08)]"
                      : "bg-[#111119] border border-white/[0.06]"
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#00e5a0]/10 border border-[#00e5a0]/30 text-[#00e5a0] text-xs font-medium whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-6 pt-2">
                    <h2
                      className={`text-xl font-bold mb-1 ${
                        plan.highlight ? "text-[#00e5a0]" : "text-[#f0f0f6]"
                      }`}
                    >
                      {plan.name}
                    </h2>
                    <p className="text-[#6e6e82] text-sm">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    {original && (
                      <div className="text-[#6e6e82] text-sm line-through mb-1">
                        ¥{original.toLocaleString()}/{isYearly ? "年" : "月"}
                      </div>
                    )}
                    <div className="flex items-end gap-1">
                      <span className="text-[#f0f0f6] text-4xl font-bold">
                        ¥{price.toLocaleString()}
                      </span>
                      <span className="text-[#6e6e82] text-sm mb-1">
                        /{isYearly ? "年" : "月"}
                      </span>
                    </div>
                    {perMonth && (
                      <div className="text-[#00e5a0] text-xs mt-1">
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
                        ? "bg-[#00e5a0] text-[#08080d] hover:bg-[#00cc8e]"
                        : "bg-white/[0.06] text-[#d0d0dc] hover:bg-white/[0.1]"
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
                        <span className="text-[#6e6e82]">
                          {feature.label}
                        </span>
                        <span>
                          {feature.value === true ? (
                            <span className="text-[#00e5a0]">○</span>
                          ) : feature.value === false ? (
                            <span className="text-[#6e6e82]/50">×</span>
                          ) : (
                            <span className="text-[#d0d0dc] font-medium">
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

          {/* Footer Note */}
          <div className="mt-12 text-center">
            <p className="text-[#6e6e82] text-sm">
              全プラン14日間の無料トライアル付き。いつでもキャンセル可能です。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
