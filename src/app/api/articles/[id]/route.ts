import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

// 単一記事取得
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // user_idを取得
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  return NextResponse.json(data);
}
