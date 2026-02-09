import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { listSites } from "@/lib/gsc";

// GSC OAuthコールバック
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const email = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("GSC OAuth error:", error);
      return NextResponse.redirect(
        new URL("/search-console?error=oauth_denied", process.env.NEXTAUTH_URL!)
      );
    }

    if (!code || !email) {
      return NextResponse.redirect(
        new URL("/search-console?error=invalid_callback", process.env.NEXTAUTH_URL!)
      );
    }

    // Authorization codeをトークンに交換
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/gsc/callback`,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokenRes.status);
      return NextResponse.redirect(
        new URL("/search-console?error=token_exchange", process.env.NEXTAUTH_URL!)
      );
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(
        new URL("/search-console?error=no_token", process.env.NEXTAUTH_URL!)
      );
    }

    // サイト一覧を取得して最初のサイトを自動選択
    const sites = await listSites(access_token);
    const siteUrl = sites.length > 0 ? sites[0].siteUrl : null;

    // DBに保存
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    const supabase = getSupabaseAdmin();
    await supabase
      .from("users")
      .update({
        gsc_access_token: access_token,
        gsc_refresh_token: refresh_token,
        gsc_token_expires_at: expiresAt.toISOString(),
        gsc_site_url: siteUrl,
      })
      .eq("email", email);

    return NextResponse.redirect(
      new URL(`/search-console?connected=true${siteUrl ? `&site=${encodeURIComponent(siteUrl)}` : ""}`, process.env.NEXTAUTH_URL!)
    );
  } catch (error) {
    console.error("GSC callback error:", error);
    return NextResponse.redirect(
      new URL("/search-console?error=unknown", process.env.NEXTAUTH_URL!)
    );
  }
}
