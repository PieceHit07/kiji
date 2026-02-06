-- ============================================
-- Kiji MVP - Database Schema
-- ============================================
-- Supabase の SQL Editor にこれを貼り付けて実行

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'business')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  articles_this_month INTEGER NOT NULL DEFAULT 0,
  articles_limit INTEGER NOT NULL DEFAULT 3,
  wp_site_url TEXT,
  wp_username TEXT,
  wp_app_password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 記事テーブル
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  title TEXT,
  outline JSONB DEFAULT '[]'::jsonb,
  content TEXT,
  meta_description TEXT,
  seo_score JSONB,
  competitor_data JSONB,
  cooccurrence_words JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'analyzed', 'generated', 'published')),
  wp_post_id INTEGER,
  wp_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON public.articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON public.articles(created_at DESC);

-- RLS（Row Level Security）
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view own articles"
  ON public.articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own articles"
  ON public.articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own articles"
  ON public.articles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own articles"
  ON public.articles FOR DELETE
  USING (auth.uid() = user_id);

-- 新規ユーザー作成時に自動でusersテーブルに追加するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 毎月の記事カウントリセット用（Supabase CRON or 外部ジョブ）
-- pg_cron が有効な場合:
-- SELECT cron.schedule('reset-monthly-count', '0 0 1 * *', $$
--   UPDATE public.users SET articles_this_month = 0;
-- $$);
