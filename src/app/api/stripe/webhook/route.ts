import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMonthlyTokens } from "@/lib/tokens";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.metadata?.email || session.customer_email;

      if (email && session.metadata?.type === "tokens") {
        // トークン購入
        const tokens = parseInt(session.metadata.tokens || "0", 10);
        if (tokens > 0) {
          const { data: user } = await supabase
            .from("users")
            .select("tokens_purchased")
            .eq("email", email)
            .single();

          await supabase
            .from("users")
            .update({
              tokens_purchased: (user?.tokens_purchased || 0) + tokens,
            })
            .eq("email", email);
        }
      } else if (email) {
        // プラン購入
        const plan = session.metadata?.plan || "pro";
        const nextReset = new Date();
        nextReset.setMonth(nextReset.getMonth() + 1);

        await supabase
          .from("users")
          .update({
            plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            tokens_monthly: getMonthlyTokens(plan),
            tokens_used: 0,
            tokens_reset_at: nextReset.toISOString(),
          })
          .eq("email", email);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await supabase
        .from("users")
        .update({
          plan: "free",
          stripe_subscription_id: null,
          tokens_monthly: 20,
          tokens_used: 0,
        })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
