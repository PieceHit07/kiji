import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

// バッチジョブステータス取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "ユーザー取得に失敗" }, { status: 500 });
    }

    const { data: batch, error } = await supabase
      .from("batch_jobs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !batch) {
      return NextResponse.json({ error: "バッチジョブが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
      id: batch.id,
      status: batch.status,
      totalKeywords: batch.total_keywords,
      completedCount: batch.completed_count,
      failedCount: batch.failed_count,
      keywords: batch.keywords,
      results: batch.results,
      options: batch.options,
      createdAt: batch.created_at,
    });
  } catch (error) {
    console.error("Batch status error:", error);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
