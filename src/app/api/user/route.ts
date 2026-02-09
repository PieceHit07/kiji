import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTokenBalance } from "@/lib/tokens";
import { getSupabaseAdmin } from "@/lib/supabase";

// ユーザー情報取得（プラン・トークン）
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const balance = await getTokenBalance(session.user.email);

  // WordPress・GSC接続情報を取得
  const supabase = getSupabaseAdmin();
  const { data: userData } = await supabase
    .from("users")
    .select("wp_site_url, wp_username, gsc_site_url, gsc_refresh_token")
    .eq("email", session.user.email)
    .single();

  return NextResponse.json({
    plan: balance.plan,
    tokens: {
      monthly: balance.monthly,
      used: balance.used,
      purchased: balance.purchased,
      remaining: balance.remaining,
    },
    resetAt: balance.resetAt,
    wordpress: userData?.wp_site_url
      ? { siteUrl: userData.wp_site_url, username: userData.wp_username }
      : null,
    gsc: userData?.gsc_refresh_token
      ? { siteUrl: userData.gsc_site_url }
      : null,
  });
}
