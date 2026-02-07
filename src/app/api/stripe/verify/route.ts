import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMonthlyTokens } from "@/lib/tokens";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

// Stripe Checkout完了後にプラン/トークンを反映
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const { session_id } = await request.json();
  if (!session_id) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);

    // メールが一致するか確認
    if (checkoutSession.customer_email !== session.user.email &&
        checkoutSession.metadata?.email !== session.user.email) {
      return NextResponse.json({ error: "不正なセッション" }, { status: 403 });
    }

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "未決済" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (checkoutSession.metadata?.type === "tokens") {
      // トークン購入
      const tokens = parseInt(checkoutSession.metadata.tokens || "0", 10);
      if (tokens > 0) {
        const { data: user } = await supabase
          .from("users")
          .select("tokens_purchased")
          .eq("email", session.user.email)
          .single();

        await supabase
          .from("users")
          .update({
            tokens_purchased: (user?.tokens_purchased || 0) + tokens,
          })
          .eq("email", session.user.email);
      }
      return NextResponse.json({ type: "tokens", tokens, updated: true });
    }

    // プラン購入
    const plan = checkoutSession.metadata?.plan || "pro";
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);

    await supabase
      .from("users")
      .update({
        plan,
        stripe_customer_id: checkoutSession.customer as string,
        stripe_subscription_id: checkoutSession.subscription as string,
        tokens_monthly: getMonthlyTokens(plan),
        tokens_used: 0,
        tokens_reset_at: nextReset.toISOString(),
      })
      .eq("email", session.user.email);

    return NextResponse.json({ plan, updated: true });
  } catch (error) {
    console.error("Stripe verify error:", error);
    return NextResponse.json({ error: "確認に失敗しました" }, { status: 500 });
  }
}
