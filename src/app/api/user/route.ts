import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTokenBalance } from "@/lib/tokens";

// ユーザー情報取得（プラン・トークン）
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const balance = await getTokenBalance(session.user.email);

  return NextResponse.json({
    plan: balance.plan,
    tokens: {
      monthly: balance.monthly,
      used: balance.used,
      purchased: balance.purchased,
      remaining: balance.remaining,
    },
    resetAt: balance.resetAt,
  });
}
