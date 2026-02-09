import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getValidAccessToken, getExistingKeywords, getOpportunities } from "@/lib/gsc";

// GSCデータ取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "queries";
    const days = parseInt(searchParams.get("days") || "28", 10);

    // ユーザーのGSCサイトURLを取得
    const supabase = getSupabaseAdmin();
    const { data: user } = await supabase
      .from("users")
      .select("gsc_site_url")
      .eq("email", session.user.email)
      .single();

    if (!user?.gsc_site_url) {
      return NextResponse.json(
        { error: "Search Consoleが接続されていません" },
        { status: 400 }
      );
    }

    // アクセストークン取得
    const accessToken = await getValidAccessToken(session.user.email);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Search Consoleの認証が期限切れです。再接続してください。", reconnect: true },
        { status: 401 }
      );
    }

    switch (type) {
      case "queries": {
        const keywords = await getExistingKeywords(accessToken, user.gsc_site_url, days);
        return NextResponse.json({
          siteUrl: user.gsc_site_url,
          type: "queries",
          days,
          data: keywords,
        });
      }

      case "opportunities": {
        const opportunities = await getOpportunities(accessToken, user.gsc_site_url, days);
        const improve = opportunities.filter((o) => o.type === "improve");
        const contentGaps = opportunities.filter((o) => o.type === "content_gap");
        return NextResponse.json({
          siteUrl: user.gsc_site_url,
          type: "opportunities",
          days,
          data: { improve, contentGaps },
        });
      }

      default:
        return NextResponse.json({ error: "不正なデータタイプ" }, { status: 400 });
    }
  } catch (error) {
    console.error("GSC data error:", error);
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
  }
}
