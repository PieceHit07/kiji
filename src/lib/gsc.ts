/**
 * Google Search Console API Client
 *
 * - OAuth token refresh
 * - Search Analytics data fetching
 * - Opportunity analysis
 */

import { getSupabaseAdmin } from "@/lib/supabase";

export interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCKeywordData {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCOpportunity {
  keyword: string;
  position: number;
  impressions: number;
  clicks: number;
  potentialClicks: number;
  type: "improve" | "content_gap";
}

// アクセストークンのリフレッシュ
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      console.error("Token refresh failed:", res.status);
      return null;
    }

    return await res.json();
  } catch (e) {
    console.error("Token refresh error:", e);
    return null;
  }
}

// 有効なアクセストークンを取得（必要に応じてリフレッシュ）
export async function getValidAccessToken(email: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("gsc_access_token, gsc_refresh_token, gsc_token_expires_at")
    .eq("email", email)
    .single();

  if (!user?.gsc_refresh_token) return null;

  // トークンの有効期限をチェック（5分余裕を持つ）
  const expiresAt = user.gsc_token_expires_at ? new Date(user.gsc_token_expires_at) : null;
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);

  if (user.gsc_access_token && expiresAt && expiresAt > now) {
    return user.gsc_access_token;
  }

  // リフレッシュ
  const result = await refreshAccessToken(user.gsc_refresh_token);
  if (!result) return null;

  const newExpires = new Date();
  newExpires.setSeconds(newExpires.getSeconds() + result.expires_in);

  await supabase
    .from("users")
    .update({
      gsc_access_token: result.access_token,
      gsc_token_expires_at: newExpires.toISOString(),
    })
    .eq("email", email);

  return result.access_token;
}

// Search Console APIでサイト一覧を取得
export async function listSites(accessToken: string): Promise<{ siteUrl: string; permissionLevel: string }[]> {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.error("GSC list sites error:", res.status);
    return [];
  }

  const data = await res.json();
  return (data.siteEntry || []).map((site: any) => ({
    siteUrl: site.siteUrl,
    permissionLevel: site.permissionLevel,
  }));
}

// Search Analytics APIでデータ取得
export async function fetchSearchAnalytics(
  accessToken: string,
  siteUrl: string,
  options: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
  }
): Promise<GSCRow[]> {
  const body: any = {
    startDate: options.startDate,
    endDate: options.endDate,
    dimensions: options.dimensions || ["query"],
    rowLimit: options.rowLimit || 500,
  };

  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    console.error("GSC search analytics error:", res.status);
    return [];
  }

  const data = await res.json();
  return (data.rows || []).map((row: any) => ({
    keys: row.keys,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

// 既存キーワード取得
export async function getExistingKeywords(
  accessToken: string,
  siteUrl: string,
  days: number = 28
): Promise<GSCKeywordData[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rows = await fetchSearchAnalytics(accessToken, siteUrl, {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    dimensions: ["query"],
    rowLimit: 500,
  });

  return rows.map((row) => ({
    keyword: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: Math.round(row.position * 10) / 10,
  }));
}

// 改善チャンスを特定
export async function getOpportunities(
  accessToken: string,
  siteUrl: string,
  days: number = 28
): Promise<GSCOpportunity[]> {
  const keywords = await getExistingKeywords(accessToken, siteUrl, days);

  const opportunities: GSCOpportunity[] = [];

  for (const kw of keywords) {
    // 5〜20位で表示回数が多いキーワード = 改善チャンス
    if (kw.position >= 5 && kw.position <= 20 && kw.impressions >= 10) {
      // 1位になった場合の推定クリック数（CTR 30%想定）
      const potentialClicks = Math.round(kw.impressions * 0.3);
      opportunities.push({
        keyword: kw.keyword,
        position: kw.position,
        impressions: kw.impressions,
        clicks: kw.clicks,
        potentialClicks,
        type: "improve",
      });
    }

    // 表示はあるがCTR低い = コンテンツギャップ
    if (kw.impressions >= 50 && kw.ctr < 0.01 && kw.position > 20) {
      const potentialClicks = Math.round(kw.impressions * 0.15);
      opportunities.push({
        keyword: kw.keyword,
        position: kw.position,
        impressions: kw.impressions,
        clicks: kw.clicks,
        potentialClicks,
        type: "content_gap",
      });
    }
  }

  return opportunities.sort((a, b) => b.potentialClicks - a.potentialClicks);
}
