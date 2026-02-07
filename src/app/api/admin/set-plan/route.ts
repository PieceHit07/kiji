import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMonthlyTokens } from "@/lib/tokens";

// 管理者メール（自分のアカウントのみ変更可能）
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  // 管理者のみ
  const isAdmin = session.user.email.toLowerCase() === ADMIN_EMAIL;
  if (!isAdmin) {
    return NextResponse.json({ error: "権限なし" }, { status: 403 });
  }

  const { plan } = await request.json();
  if (!["free", "pro", "business"].includes(plan)) {
    return NextResponse.json({ error: "無効なプラン" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const nextReset = new Date();
  nextReset.setMonth(nextReset.getMonth() + 1);

  await supabase
    .from("users")
    .update({
      plan,
      tokens_monthly: getMonthlyTokens(plan),
      tokens_used: 0,
      tokens_reset_at: nextReset.toISOString(),
    })
    .eq("email", session.user.email);

  return NextResponse.json({
    plan,
    tokens_monthly: getMonthlyTokens(plan),
    updated: true,
  });
}
