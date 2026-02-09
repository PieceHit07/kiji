"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-bg text-text-bright">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold font-mono tracking-tight">
            Kiji<span className="text-accent">.</span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#how" className="text-sm text-text-dim hover:text-text-primary transition-colors hidden sm:block">
              使い方
            </a>
            <a href="#pricing" className="text-sm text-text-dim hover:text-text-primary transition-colors hidden sm:block">
              料金
            </a>
            {session ? (
              <Link
                href="/dashboard"
                className="px-4 py-1.5 rounded-lg text-sm bg-accent text-on-accent font-medium"
              >
                ダッシュボード
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 rounded-lg text-sm bg-accent text-on-accent font-medium"
              >
                始める
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.3] mb-6 tracking-tight">
            SEO記事、<br className="sm:hidden" />
            まだ手作業で<br className="hidden sm:block" />
            書いてますか？
          </h1>
          <p className="text-base sm:text-lg text-text-dim max-w-xl mb-10 leading-relaxed">
            Kijiは上位記事の構成・共起語を自動分析し、
            検索で勝てる記事をAIが生成します。
            キーワードを入れて5分、あとは公開するだけ。
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={session ? "/dashboard" : "/login"}
              className="px-7 py-3.5 rounded-xl bg-accent text-on-accent font-semibold text-sm hover:bg-accent-dark transition-colors"
            >
              無料で試す
            </Link>
            <a
              href="#how"
              className="px-7 py-3.5 rounded-xl border border-border text-text-primary font-medium text-sm hover:border-[var(--color-border-strong)] transition-colors text-center"
            >
              使い方を見る
            </a>
          </div>
          <p className="text-xs text-text-dim mt-5">
            クレジットカード不要 — Googleアカウントで登録
          </p>
        </div>
      </section>

      {/* What it does */}
      <section className="py-16 px-6 border-y border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="text-sm font-mono text-accent mb-2">01</div>
            <h3 className="font-semibold mb-2">競合を分析</h3>
            <p className="text-sm text-text-dim leading-relaxed">
              検索上位10記事の見出し構成・文字数・共起語を自動で解析。勝つために必要な情報を整理します。
            </p>
          </div>
          <div>
            <div className="text-sm font-mono text-accent mb-2">02</div>
            <h3 className="font-semibold mb-2">記事を生成</h3>
            <p className="text-sm text-text-dim leading-relaxed">
              分析データをもとに、SEOに最適化された5,000字以上の記事をGPT-4oが生成。構成案の編集も可能。
            </p>
          </div>
          <div>
            <div className="text-sm font-mono text-accent mb-2">03</div>
            <h3 className="font-semibold mb-2">そのまま公開</h3>
            <p className="text-sm text-text-dim leading-relaxed">
              WordPress連携でワンクリック投稿。note用コピーやHTML出力にも対応しています。
            </p>
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-12">使い方</h2>
          <div className="space-y-10">
            <div className="flex gap-5">
              <div className="w-8 h-8 rounded-full bg-surface2 border border-border text-sm font-mono text-text-dim flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">キーワードを入力</h3>
                <p className="text-sm text-text-dim leading-relaxed">
                  狙いたい検索キーワードを入力します。「SEOツール おすすめ」のような複合ワードもOK。
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="w-8 h-8 rounded-full bg-surface2 border border-border text-sm font-mono text-text-dim flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">構成案を確認・編集</h3>
                <p className="text-sm text-text-dim leading-relaxed">
                  競合分析の結果をもとにAIが見出し構成を提案。必要に応じて見出しの追加・削除・並び替えができます。
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="w-8 h-8 rounded-full bg-surface2 border border-border text-sm font-mono text-text-dim flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">生成して公開</h3>
                <p className="text-sm text-text-dim leading-relaxed">
                  記事が生成されたらSEOスコアを確認。WordPressへの投稿、HTMLコピー、note用コピーがワンクリックで完了します。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 他のツールとの違い */}
      <section className="py-20 px-6 border-y border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">他ツールとの違い</h2>
          <p className="text-text-dim text-sm mb-10">
            ChatGPTに「記事書いて」では上位表示できません。Kijiは検索データを使います。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-6 font-medium text-text-dim"></th>
                  <th className="py-3 px-4 font-medium text-text-dim">ChatGPT等</th>
                  <th className="py-3 px-4 font-medium text-accent">Kiji</th>
                </tr>
              </thead>
              <tbody className="text-text-dim">
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-6 text-text-primary">競合分析</td>
                  <td className="py-3 px-4">なし</td>
                  <td className="py-3 px-4 text-text-primary">上位10記事を自動分析</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-6 text-text-primary">共起語</td>
                  <td className="py-3 px-4">考慮しない</td>
                  <td className="py-3 px-4 text-text-primary">自動抽出・本文に反映</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-6 text-text-primary">見出し構成</td>
                  <td className="py-3 px-4">AIまかせ</td>
                  <td className="py-3 px-4 text-text-primary">競合ベース + 手動編集</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-6 text-text-primary">SEOスコア</td>
                  <td className="py-3 px-4">なし</td>
                  <td className="py-3 px-4 text-text-primary">100点満点で自動採点</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-6 text-text-primary">WordPress投稿</td>
                  <td className="py-3 px-4">手動コピペ</td>
                  <td className="py-3 px-4 text-text-primary">ワンクリック</td>
                </tr>
                <tr>
                  <td className="py-3 pr-6 text-text-primary">順位トラッキング</td>
                  <td className="py-3 px-4">なし</td>
                  <td className="py-3 px-4 text-text-primary">Search Console連携</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">料金</h2>
          <p className="text-text-dim text-sm mb-10">
            無料で始めて、必要になったらアップグレード。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Free */}
            <div className="rounded-xl border border-border p-6 flex flex-col">
              <div className="mb-5">
                <h3 className="font-semibold mb-1">Free</h3>
                <p className="text-xs text-text-dim">まずは試したい方に</p>
              </div>
              <div className="mb-5">
                <span className="text-2xl font-bold">¥0</span>
              </div>
              <ul className="space-y-2 text-sm text-text-dim mb-6 flex-1">
                <li>月20トークン（記事1〜2本）</li>
                <li>競合分析（上位3記事）</li>
                <li>AI画像生成</li>
              </ul>
              <Link
                href={session ? "/dashboard" : "/login"}
                className="w-full py-2.5 rounded-lg text-sm text-center font-medium bg-surface2 border border-border text-text-primary hover:bg-hover-strong transition-colors"
              >
                無料で始める
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-xl border-2 border-accent/30 p-6 flex flex-col relative">
              <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded text-xs font-medium bg-accent text-on-accent">
                おすすめ
              </div>
              <div className="mb-5">
                <h3 className="font-semibold text-accent mb-1">Pro</h3>
                <p className="text-xs text-text-dim">本格的にSEO記事を量産</p>
              </div>
              <div className="mb-5">
                <span className="text-xs text-text-dim line-through mr-2">¥2,980</span>
                <span className="text-2xl font-bold">¥1,980</span>
                <span className="text-sm text-text-dim">/月</span>
              </div>
              <ul className="space-y-2 text-sm text-text-dim mb-6 flex-1">
                <li>月300トークン（記事約20本）</li>
                <li>競合分析（上位10記事）</li>
                <li>WordPress連携</li>
                <li>一括生成・KW提案</li>
                <li>Search Console連携</li>
              </ul>
              <Link
                href="/pricing"
                className="w-full py-2.5 rounded-lg text-sm text-center font-medium bg-accent text-on-accent hover:bg-accent-dark transition-colors"
              >
                Proを始める
              </Link>
            </div>

            {/* Business */}
            <div className="rounded-xl border border-border p-6 flex flex-col">
              <div className="mb-5">
                <h3 className="font-semibold mb-1">Business</h3>
                <p className="text-xs text-text-dim">チームで本格運用</p>
              </div>
              <div className="mb-5">
                <span className="text-xs text-text-dim line-through mr-2">¥4,980</span>
                <span className="text-2xl font-bold">¥3,980</span>
                <span className="text-sm text-text-dim">/月</span>
              </div>
              <ul className="space-y-2 text-sm text-text-dim mb-6 flex-1">
                <li>月1,000トークン（記事約70本）</li>
                <li>Pro機能すべて</li>
                <li>リライト提案</li>
                <li>パフォーマンス追跡</li>
                <li>優先サポート</li>
              </ul>
              <Link
                href="/pricing"
                className="w-full py-2.5 rounded-lg text-sm text-center font-medium bg-surface2 border border-border text-text-primary hover:bg-hover-strong transition-colors"
              >
                Businessを始める
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">
            まずは1記事、無料で試してみてください。
          </h2>
          <p className="text-text-dim text-sm mb-8">
            Googleアカウントで登録するだけ。すぐに記事を生成できます。
          </p>
          <Link
            href={session ? "/dashboard" : "/login"}
            className="inline-block px-8 py-3.5 rounded-xl bg-accent text-on-accent font-semibold text-sm hover:bg-accent-dark transition-colors"
          >
            無料で始める
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-text-dim">
            <span className="font-mono font-bold text-text-primary">Kiji<span className="text-accent">.</span></span>
          </div>
          <div className="flex gap-6 text-xs text-text-dim">
            <Link href="/pricing" className="hover:text-text-primary transition-colors">料金</Link>
            <Link href="/login" className="hover:text-text-primary transition-colors">ログイン</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
