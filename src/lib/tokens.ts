import { getSupabaseAdmin } from "@/lib/supabase";

// アクション別トークンコスト
export const TOKEN_COSTS = {
  generate: 10,
  rewrite: 5,
  image: 8,
  analyze: 3,
  cooccurrence: 2,
  ranking: 1,
} as const;

export type TokenAction = keyof typeof TOKEN_COSTS;

// プラン別月間トークン
const MONTHLY_TOKENS: Record<string, number> = {
  free: 20,
  pro: 300,
  business: 1000,
};

export function getMonthlyTokens(plan: string): number {
  return MONTHLY_TOKENS[plan] || 20;
}

// トークン残高を取得（月間リセット含む）
export async function getTokenBalance(email: string) {
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("plan, tokens_monthly, tokens_used, tokens_purchased, tokens_reset_at")
    .eq("email", email)
    .single();

  if (!user) {
    // usersテーブルにレコードがない → 自動作成
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);

    // Supabase Auth にユーザーを作成（トリガーでpublic.usersにも作成される）
    let userId: string | null = null;
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (authUser?.user) {
      userId = authUser.user.id;
    } else if (createError) {
      // 既にauth.usersに存在する場合、メールで検索
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existing = listData?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (existing) userId = existing.id;
    }

    if (userId) {
      // public.usersの行にemail + トークン情報を確実にセット
      await supabase
        .from("users")
        .upsert({
          id: userId,
          email,
          plan: "free",
          tokens_monthly: 20,
          tokens_used: 0,
          tokens_purchased: 0,
          tokens_reset_at: nextReset.toISOString(),
        }, { onConflict: "id" });
    }

    return {
      plan: "free",
      monthly: 20,
      used: 0,
      purchased: 0,
      remaining: 20,
      resetAt: nextReset.toISOString(),
    };
  }

  // プランと tokens_monthly の不整合を自動修正
  const expectedMonthly = getMonthlyTokens(user.plan || "free");
  if (user.tokens_monthly !== expectedMonthly) {
    await supabase
      .from("users")
      .update({ tokens_monthly: expectedMonthly })
      .eq("email", email);
    user.tokens_monthly = expectedMonthly;
  }

  // 月間リセットチェック
  const now = new Date();
  const resetAt = user.tokens_reset_at ? new Date(user.tokens_reset_at) : null;

  if (resetAt && now >= resetAt) {
    // リセット実行
    const nextReset = new Date(now);
    nextReset.setMonth(nextReset.getMonth() + 1);

    await supabase
      .from("users")
      .update({
        tokens_used: 0,
        tokens_reset_at: nextReset.toISOString(),
      })
      .eq("email", email);

    const monthly = user.tokens_monthly;
    return {
      plan: user.plan || "free",
      monthly,
      used: 0,
      purchased: user.tokens_purchased || 0,
      remaining: monthly + (user.tokens_purchased || 0),
      resetAt: nextReset.toISOString(),
    };
  }

  const monthly = user.tokens_monthly;
  const used = user.tokens_used || 0;
  const purchased = user.tokens_purchased || 0;
  const monthlyRemaining = Math.max(0, monthly - used);

  return {
    plan: user.plan || "free",
    monthly,
    used,
    purchased,
    remaining: monthlyRemaining + purchased,
    resetAt: user.tokens_reset_at,
  };
}

// トークン消費（月間→購入の順で消費）
export async function consumeTokens(
  email: string,
  action: TokenAction
): Promise<{ success: boolean; remaining: number; needTokens?: boolean }> {
  const cost = TOKEN_COSTS[action];
  const balance = await getTokenBalance(email);

  if (balance.remaining < cost) {
    return { success: false, remaining: balance.remaining, needTokens: true };
  }

  const supabase = getSupabaseAdmin();
  const monthlyRemaining = Math.max(0, balance.monthly - balance.used);

  if (monthlyRemaining >= cost) {
    // 月間トークンから消費
    await supabase
      .from("users")
      .update({ tokens_used: balance.used + cost })
      .eq("email", email);
  } else {
    // 月間の残りと購入トークンを組み合わせて消費
    const fromMonthly = monthlyRemaining;
    const fromPurchased = cost - fromMonthly;

    await supabase
      .from("users")
      .update({
        tokens_used: balance.used + fromMonthly,
        tokens_purchased: Math.max(0, balance.purchased - fromPurchased),
      })
      .eq("email", email);
  }

  return { success: true, remaining: balance.remaining - cost };
}
