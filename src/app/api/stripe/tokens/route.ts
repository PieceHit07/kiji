import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

// トークンパック定義
const tokenPacks: Record<string, { tokens: number; price: number; name: string }> = {
  pack50: { tokens: 50, price: 500, name: "50トークンパック" },
  pack150: { tokens: 150, price: 1200, name: "150トークンパック" },
  pack500: { tokens: 500, price: 3500, name: "500トークンパック" },
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const body = await request.json();
  const { pack } = body as { pack: string };

  const selected = tokenPacks[pack];
  if (!selected) {
    return NextResponse.json({ error: "無効なパックです" }, { status: 400 });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: { name: selected.name },
            unit_amount: selected.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "tokens",
        tokens: String(selected.tokens),
        email: session.user.email,
      },
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?tokens_purchased=${selected.tokens}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Token checkout error:", error);
    return NextResponse.json({ error: "決済の作成に失敗しました" }, { status: 500 });
  }
}
