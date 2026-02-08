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
    .select("id, plan, wp_site_url, wp_username, wp_app_password")
    .eq("email", session.user.email)
    .single();

  if (!user || (user.plan !== "pro" && user.plan !== "business")) {
    return NextResponse.json(
      { error: "WordPress連携はPro/Businessプラン限定です" },
      { status: 403 }
    );
  }

  if (!user.wp_site_url || !user.wp_username || !user.wp_app_password) {
    return NextResponse.json(
      { error: "WordPressが接続されていません。設定ページから接続してください" },
      { status: 400 }
    );
  }

  const { articleId } = await request.json();
  if (!articleId) {
    return NextResponse.json({ error: "記事IDが必要です" }, { status: 400 });
  }

  // 記事データ取得
  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .eq("user_id", user.id)
    .single();

  if (!article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  const credentials = Buffer.from(
    `${user.wp_username}:${user.wp_app_password}`
  ).toString("base64");

  try {
    const isUpdate = !!article.wp_post_id;
    const endpoint = isUpdate
      ? `${user.wp_site_url}/wp-json/wp/v2/posts/${article.wp_post_id}`
      : `${user.wp_site_url}/wp-json/wp/v2/posts`;

    const res = await fetch(endpoint, {
      method: isUpdate ? "PUT" : "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: article.title,
        content: article.html || article.content,
        status: "draft",
        excerpt: article.meta_description || "",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `WordPress投稿エラー: ${res.status} ${text.slice(0, 100)}` },
        { status: 400 }
      );
    }

    const wpPost = await res.json();

    // articlesテーブルを更新
    await supabase
      .from("articles")
      .update({
        wp_post_id: wpPost.id,
        wp_url: wpPost.link,
      })
      .eq("id", articleId);

    return NextResponse.json({
      success: true,
      wpPostId: wpPost.id,
      wpUrl: wpPost.link,
      wpEditUrl: `${user.wp_site_url}/wp-admin/post.php?post=${wpPost.id}&action=edit`,
      isUpdate,
    });
  } catch (error) {
    console.error("WordPress publish error:", error);
    return NextResponse.json(
      { error: "WordPress投稿に失敗しました" },
      { status: 500 }
    );
  }
}
