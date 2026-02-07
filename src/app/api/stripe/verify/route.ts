import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

// Stripe Checkout完了後にプランを反映
export async function POST(request: NextRequest) {
  const session = await getServerSession();
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

    const plan = checkoutSession.metadata?.plan || "pro";
    const limits: Record<string, number> = { pro: 30, business: 9999 };

    const supabase = getSupabaseAdmin();
    await supabase
      .from("users")
      .update({
        plan,
        stripe_customer_id: checkoutSession.customer as string,
        stripe_subscription_id: checkoutSession.subscription as string,
        articles_limit: limits[plan] || 30,
      })
      .eq("email", session.user.email);

    return NextResponse.json({ plan, updated: true });
  } catch (error) {
    console.error("Stripe verify error:", error);
    return NextResponse.json({ error: "確認に失敗しました" }, { status: 500 });
  }
}
