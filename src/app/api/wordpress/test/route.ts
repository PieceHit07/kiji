import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("plan")
    .eq("email", session.user.email)
    .single();

  if (!user || (user.plan !== "pro" && user.plan !== "business")) {
    return NextResponse.json(
      { error: "WordPress連携はPro/Businessプラン限定です" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { siteUrl, username, appPassword } = body;

  if (!siteUrl || !username || !appPassword) {
    return NextResponse.json(
      { error: "全項目を入力してください" },
      { status: 400 }
    );
  }

  // URLを正規化
  const normalizedUrl = siteUrl.replace(/\/+$/, "");

  try {
    const credentials = Buffer.from(`${username}:${appPassword}`).toString("base64");
    const res = await fetch(`${normalizedUrl}/wp-json/wp/v2/users/me`, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401) {
        return NextResponse.json(
          { error: "認証に失敗しました。ユーザー名またはアプリケーションパスワードを確認してください" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `WordPress APIエラー: ${res.status} ${text.slice(0, 100)}` },
        { status: 400 }
      );
    }

    const wpUser = await res.json();

    // 接続成功 → Supabaseに保存
    await supabase
      .from("users")
      .update({
        wp_site_url: normalizedUrl,
        wp_username: username,
        wp_app_password: appPassword,
      })
      .eq("email", session.user.email);

    return NextResponse.json({
      success: true,
      siteName: wpUser.name || username,
      siteUrl: normalizedUrl,
    });
  } catch (error) {
    console.error("WordPress connection test error:", error);
    return NextResponse.json(
      { error: "接続に失敗しました。サイトURLを確認してください" },
      { status: 400 }
    );
  }
}

// WordPress接続を解除
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  await supabase
    .from("users")
    .update({
      wp_site_url: null,
      wp_username: null,
      wp_app_password: null,
    })
    .eq("email", session.user.email);

  return NextResponse.json({ success: true });
}
