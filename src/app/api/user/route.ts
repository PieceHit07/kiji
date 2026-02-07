import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

// ユーザー情報取得（プラン等）
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("plan, articles_limit, articles_this_month")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return NextResponse.json({
      plan: "free",
      articles_limit: 3,
      articles_this_month: 0,
    });
  }

  return NextResponse.json(user);
}
