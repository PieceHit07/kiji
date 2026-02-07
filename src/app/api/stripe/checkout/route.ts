import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

// Stripeダッシュボードで作成済みの価格ID
const priceIds: Record<string, { monthly: string; yearly: string }> = {
  pro: {
    monthly: "price_1Sy4JWRQjMzw73lJHaoB3XUB",
    yearly: "price_1Sy4JXRQjMzw73lJ8nUFZbhC",
  },
  business: {
    monthly: "price_1Sy4JXRQjMzw73lJn2FYZwlN",
    yearly: "price_1Sy4JXRQjMzw73lJT1cMuTmb",
  },
};

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const body = await request.json();
  const { plan, billing } = body as { plan: string; billing: "monthly" | "yearly" };

  const prices = priceIds[plan];
  if (!prices) {
    return NextResponse.json({ error: "無効なプランです" }, { status: 400 });
  }

  const priceId = billing === "yearly" ? prices.yearly : prices.monthly;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: session.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        plan,
        billing,
        email: session.user.email,
      },
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "決済の作成に失敗しました" }, { status: 500 });
  }
}
