import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("email", session.user.email)
    .single();

  if (!user?.stripe_customer_id) {
    return NextResponse.json(
      { error: "サブスクリプションが見つかりません" },
      { status: 404 }
    );
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.NEXTAUTH_URL}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal session error:", error);
    return NextResponse.json(
      { error: "ポータルの作成に失敗しました" },
      { status: 500 }
    );
  }
}
