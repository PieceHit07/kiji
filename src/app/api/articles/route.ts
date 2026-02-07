import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

// メールからuser_idを取得（なければAuth Admin APIで作成）
async function getUserId(email: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  // 既存ユーザー検索
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) return existing.id;

  // Supabase Auth Admin APIでユーザー作成（→ トリガーでpublic.usersにも自動作成）
  const { data: authUser, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (error) {
    console.error("Auth user creation error:", error);
    return null;
  }

  return authUser.user.id;
}

// 記事一覧取得
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const userId = await getUserId(session.user.email);
  if (!userId) {
    return NextResponse.json({ error: "ユーザー取得に失敗" }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("articles")
    .select("id, keyword, title, content, seo_score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }

  // フロントエンド用にフォーマット変換
  const formatted = (data || []).map((a: any) => ({
    id: a.id,
    keyword: a.keyword,
    title: a.title,
    word_count: a.seo_score?.details?.actualWordCount || 0,
    seo_score: a.seo_score?.overall || 0,
    created_at: a.created_at,
  }));

  return NextResponse.json(formatted);
}

// 記事保存
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const userId = await getUserId(session.user.email);
  if (!userId) {
    return NextResponse.json({ error: "ユーザー取得に失敗" }, { status: 500 });
  }

  const body = await request.json();
  const { keyword, title, meta_description, content, word_count, seo_score, seo_score_details } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  // seo_scoreをJSONBとして保存
  const scoreData = seo_score_details || {
    overall: seo_score || 0,
    details: { actualWordCount: word_count || 0 },
  };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("articles")
    .insert({
      user_id: userId,
      keyword: keyword || "",
      title,
      meta_description: meta_description || "",
      content,
      seo_score: scoreData,
      status: "published",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

// 記事削除
export async function DELETE(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const userId = await getUserId(session.user.email);
  if (!userId) {
    return NextResponse.json({ error: "ユーザー取得に失敗" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Supabase delete error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
