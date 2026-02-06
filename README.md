# Kiji — AIがSEO記事を自動生成

キーワードを入れるだけ。競合分析から記事生成、WordPress投稿まで一気通貫。

## セットアップ

### 1. 依存パッケージをインストール

```bash
npm install
```

### 2. 環境変数を設定

```bash
cp .env.example .env.local
```

`.env.local` を開いて以下のAPIキーを設定:

| 変数 | 取得場所 |
|------|---------|
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `GOOGLE_SEARCH_API_KEY` | https://console.cloud.google.com/apis |
| `GOOGLE_SEARCH_ENGINE_ID` | https://programmablesearchengine.google.com/ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase ダッシュボード → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 |

> **Note:** APIキー未設定でもデモモードで動作します。

### 3. Supabase データベースをセットアップ

1. https://supabase.com でプロジェクトを作成
2. SQL Editor を開く
3. `supabase/schema.sql` の内容を貼り付けて実行

### 4. 開発サーバーを起動

```bash
npm run dev
```

http://localhost:3000 にアクセス

## プロジェクト構成

```
kiji/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/route.ts    # 競合分析API
│   │   │   └── generate/route.ts   # 記事生成API
│   │   ├── dashboard/page.tsx      # メインUI
│   │   ├── layout.tsx
│   │   └── globals.css
│   └── lib/
│       ├── analyzer.ts             # 競合分析エンジン
│       └── generator.ts            # AI記事生成 + SEOスコア
├── supabase/
│   └── schema.sql                  # DBスキーマ
├── .env.example
└── package.json
```

## 開発ロードマップ

- [x] Week 1: 競合分析 + 構成案生成
- [ ] Week 2: 記事本文生成 + 編集UI
- [ ] Week 3: WordPress連携 + Stripe決済
- [ ] Week 4: LP統合 + デプロイ + ローンチ
