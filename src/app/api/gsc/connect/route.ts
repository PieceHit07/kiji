import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getTokenBalance } from "@/lib/tokens";

// GSC OAuth開始
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
    }

    // プランチェック
    const balance = await getTokenBalance(session.user.email);
    if (balance.plan !== "business") {
      return NextResponse.json(
        { error: "Search Console連携はBusinessプラン限定です" },
        { status: 403 }
      );
    }

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/gsc/callback`,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      access_type: "offline",
      prompt: "consent",
      state: session.user.email,
    });

    return NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    );
  } catch (error) {
    console.error("GSC connect error:", error);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}

// GSC接続解除
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    await supabase
      .from("users")
      .update({
        gsc_access_token: null,
        gsc_refresh_token: null,
        gsc_token_expires_at: null,
        gsc_site_url: null,
      })
      .eq("email", session.user.email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("GSC disconnect error:", error);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
