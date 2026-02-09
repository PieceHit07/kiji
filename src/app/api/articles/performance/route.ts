import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getValidAccessToken, getExistingKeywords, GSCKeywordData } from "@/lib/gsc";

type Suggestion = "rewrite_drop" | "rewrite_opportunity" | "content_gap";

interface ArticlePerformance {
  articleId: string;
  keyword: string;
  title: string;
  seoScore: number;
  wordCount: number;
  createdAt: string;
  wpPostId: number | null;
  wpUrl: string | null;
  gsc: {
    position: number;
    clicks: number;
    impressions: number;
    ctr: number;
  } | null;
  suggestion: Suggestion | null;
  suggestionReason: string | null;
}

function matchKeyword(
  articleKeyword: string,
  gscData: GSCKeywordData[]
): GSCKeywordData | null {
  const normalized = articleKeyword.toLowerCase().trim();

  // 完全一致
  const exact = gscData.find((g) => g.keyword.toLowerCase() === normalized);
  if (exact) return exact;

  // 部分一致（記事KWがGSCクエリに含まれる）
  const partial = gscData.find((g) =>
    g.keyword.toLowerCase().includes(normalized)
  );
  if (partial) return partial;

  // 逆方向の部分一致（GSCクエリが記事KWに含まれる）
  const reverse = gscData
    .filter((g) => normalized.includes(g.keyword.toLowerCase()))
    .sort((a, b) => b.impressions - a.impressions);
  if (reverse.length > 0) return reverse[0];

  return null;
}

function getSuggestion(
  gsc: GSCKeywordData
): { type: Suggestion; reason: string } | null {
  // 順位20位以下 + 表示50回以上 → 要リライト
  if (gsc.position > 20 && gsc.impressions >= 50) {
    return {
      type: "rewrite_drop",
      reason: `現在${Math.round(gsc.position)}位。表示${gsc.impressions}回あるのに順位が低いため、リライトで改善の余地があります。`,
    };
  }

  // 順位5〜20位 + 表示100回以上 → 改善チャンス
  if (gsc.position >= 5 && gsc.position <= 20 && gsc.impressions >= 100) {
    return {
      type: "rewrite_opportunity",
      reason: `現在${Math.round(gsc.position)}位で月間${gsc.impressions}回表示。上位表示できればアクセス大幅増の見込みです。`,
    };
  }

  // CTR < 2% + 表示50回以上 → CTR改善
  if (gsc.ctr < 0.02 && gsc.impressions >= 50) {
    return {
      type: "content_gap",
      reason: `表示${gsc.impressions}回に対しCTR${(gsc.ctr * 100).toFixed(1)}%。タイトルやメタディスクリプションの改善でクリック率向上が見込めます。`,
    };
  }

  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // ユーザー情報取得
    const { data: user } = await supabase
      .from("users")
      .select("id, plan, gsc_site_url, gsc_refresh_token")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const plan = user.plan || "free";
    const isPaid = plan === "pro" || plan === "business";

    // 記事一覧取得
    const { data: articles } = await supabase
      .from("articles")
      .select("id, keyword, title, seo_score, created_at, wp_post_id, wp_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!articles || articles.length === 0) {
      return NextResponse.json({ articles: [], gscConnected: !!user.gsc_site_url, plan });
    }

    // GSCデータ取得（有料プラン + 接続済みの場合のみ）
    let gscKeywords: GSCKeywordData[] = [];
    const gscConnected = !!(user.gsc_site_url && user.gsc_refresh_token);

    if (gscConnected && isPaid) {
      try {
        const accessToken = await getValidAccessToken(session.user.email);
        if (accessToken) {
          gscKeywords = await getExistingKeywords(accessToken, user.gsc_site_url!, 28);
        }
      } catch (e) {
        console.error("GSC data fetch error:", e);
      }
    }

    // 記事とGSCデータをマッチング
    const result: ArticlePerformance[] = articles.map((a: any) => {
      const matched = a.keyword ? matchKeyword(a.keyword, gscKeywords) : null;

      let suggestion: Suggestion | null = null;
      let suggestionReason: string | null = null;

      if (matched) {
        const s = getSuggestion(matched);
        if (s) {
          suggestion = s.type;
          suggestionReason = s.reason;
        }
      }

      return {
        articleId: a.id,
        keyword: a.keyword || "",
        title: a.title || "",
        seoScore: a.seo_score?.overall || 0,
        wordCount: a.seo_score?.details?.actualWordCount || 0,
        createdAt: a.created_at,
        wpPostId: a.wp_post_id || null,
        wpUrl: a.wp_url || null,
        gsc: matched
          ? {
              position: Math.round(matched.position * 10) / 10,
              clicks: matched.clicks,
              impressions: matched.impressions,
              ctr: matched.ctr,
            }
          : null,
        suggestion,
        suggestionReason,
      };
    });

    return NextResponse.json({ articles: result, gscConnected, plan });
  } catch (error) {
    console.error("Articles performance error:", error);
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
  }
}
