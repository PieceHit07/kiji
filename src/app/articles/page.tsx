"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import ImageGenerateModal from "@/components/ImageGenerateModal";
import { convertToNoteFormat, convertToNoteHtml, copyHtmlToClipboard } from "@/lib/export";

interface GSCData {
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

type Suggestion = "rewrite_drop" | "rewrite_opportunity" | "content_gap";

interface ArticlePerf {
  articleId: string;
  keyword: string;
  title: string;
  seoScore: number;
  wordCount: number;
  createdAt: string;
  wpPostId: number | null;
  wpUrl: string | null;
  gsc: GSCData | null;
  suggestion: Suggestion | null;
  suggestionReason: string | null;
  content?: string;
}

type FilterTab = "all" | "rewrite" | "performing";

const SUGGESTION_CONFIG: Record<Suggestion, { label: string; className: string }> = {
  rewrite_opportunity: {
    label: "改善チャンス",
    className: "bg-[var(--color-accent2-tint)] text-accent2 border-[var(--color-accent2-tint)]",
  },
  content_gap: {
    label: "CTR改善",
    className: "bg-[var(--color-warning-tint)] text-warning border-[var(--color-warning-tint)]",
  },
  rewrite_drop: {
    label: "要リライト",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticlePerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [gscConnected, setGscConnected] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [tooltipId, setTooltipId] = useState<string | null>(null);

  const [previewArticle, setPreviewArticle] = useState<ArticlePerf | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [imageModalArticle, setImageModalArticle] = useState<{ title: string; keyword: string; content: string } | null>(null);
  const [wpConnected, setWpConnected] = useState(false);
  const [wpPublishingId, setWpPublishingId] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch("/api/articles/performance");
      if (!res.ok) {
        // フォールバック: パフォーマンスAPI失敗時は通常APIを使う
        const fallback = await fetch("/api/articles");
        if (fallback.ok) {
          const data = await fallback.json();
          setArticles(
            data.map((a: any) => ({
              articleId: a.id,
              keyword: a.keyword,
              title: a.title,
              seoScore: a.seo_score,
              wordCount: a.word_count,
              createdAt: a.created_at,
              wpPostId: a.wp_post_id,
              wpUrl: a.wp_url,
              gsc: null,
              suggestion: null,
              suggestionReason: null,
            }))
          );
        }
        return;
      }
      const data = await res.json();
      setArticles(data.articles || []);
      setGscConnected(data.gscConnected || false);
      setUserPlan(data.plan || "free");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
    fetch("/api/user")
      .then((r) => r.json())
      .then((d) => setWpConnected(!!d.wordpress))
      .catch(() => {});
  }, [fetchArticles]);

  useEffect(() => {
    if (previewArticle) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [previewArticle]);

  const openPreview = async (article: ArticlePerf) => {
    if (article.content) {
      setPreviewArticle(article);
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/articles/${article.articleId}`);
      if (!res.ok) return;
      const full = await res.json();
      const updated = { ...article, content: full.content };
      setPreviewArticle(updated);
    } catch {
      // ignore
    } finally {
      setLoadingPreview(false);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("この記事を削除しますか？")) return;
    try {
      const res = await fetch(`/api/articles?id=${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setArticles((prev) => prev.filter((a) => a.articleId !== id));
    } catch {
      // ignore
    }
  };

  const copyHtml = async (article: ArticlePerf) => {
    const res = await fetch(`/api/articles/${article.articleId}`);
    if (!res.ok) return;
    const full = await res.json();
    navigator.clipboard.writeText(full.content);
    alert("HTMLをコピーしました");
  };

  const copyNote = async (article: ArticlePerf) => {
    const res = await fetch(`/api/articles/${article.articleId}`);
    if (!res.ok) return;
    const full = await res.json();
    const noteHtml = convertToNoteHtml(full.content);
    const noteText = convertToNoteFormat(full.content);
    await copyHtmlToClipboard(noteHtml, noteText);
    alert("note用テキストをコピーしました（見出し付き）");
  };

  const openImageModal = async (article: ArticlePerf) => {
    const res = await fetch(`/api/articles/${article.articleId}`);
    if (!res.ok) return;
    const full = await res.json();
    setImageModalArticle({ title: article.title, keyword: article.keyword, content: full.content });
  };

  const publishToWP = async (article: ArticlePerf) => {
    setWpPublishingId(article.articleId);
    try {
      const res = await fetch("/api/wordpress/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.articleId }),
      });
      const data = await res.json();
      if (data.success) {
        setArticles((prev) =>
          prev.map((a) =>
            a.articleId === article.articleId
              ? { ...a, wpPostId: data.wpPostId, wpUrl: data.wpUrl }
              : a
          )
        );
        alert(data.isUpdate ? "WordPressの下書きを更新しました" : "WordPressに下書き投稿しました");
      } else {
        alert(data.error || "投稿に失敗しました");
      }
    } catch {
      alert("WordPress投稿に失敗しました");
    } finally {
      setWpPublishingId(null);
    }
  };

  // フィルタリング
  const filteredArticles = articles.filter((a) => {
    if (filter === "rewrite") return a.suggestion !== null;
    if (filter === "performing") return a.gsc !== null && a.gsc.position <= 10;
    return true;
  });

  const isPaid = userPlan === "business";
  const rewriteCount = articles.filter((a) => a.suggestion !== null).length;
  const performingCount = articles.filter((a) => a.gsc !== null && a.gsc.position <= 10).length;

  return (
    <div className="flex h-screen bg-bg text-text-bright">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">記事一覧</h1>
              <p className="text-text-dim">生成した記事を管理できます</p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold text-sm"
            >
              + 新規作成
            </Link>
          </div>

          {/* Filter Tabs */}
          {!loading && articles.length > 0 && (
            <div className="flex gap-1 mb-6 bg-surface border border-border rounded-lg p-1">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-md text-sm transition-all ${
                  filter === "all"
                    ? "bg-surface2 text-text-bright font-medium"
                    : "text-text-dim hover:text-text-primary"
                }`}
              >
                すべて
                <span className="ml-1.5 text-xs opacity-60">{articles.length}</span>
              </button>
              <button
                onClick={() => setFilter("rewrite")}
                className={`px-4 py-2 rounded-md text-sm transition-all ${
                  filter === "rewrite"
                    ? "bg-surface2 text-text-bright font-medium"
                    : "text-text-dim hover:text-text-primary"
                }`}
              >
                リライト推奨
                {isPaid && rewriteCount > 0 && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
                    {rewriteCount}
                  </span>
                )}
                {!isPaid && <span className="ml-1 text-xs opacity-50">🔒</span>}
              </button>
              <button
                onClick={() => setFilter("performing")}
                className={`px-4 py-2 rounded-md text-sm transition-all ${
                  filter === "performing"
                    ? "bg-surface2 text-text-bright font-medium"
                    : "text-text-dim hover:text-text-primary"
                }`}
              >
                高パフォーマンス
                {isPaid && performingCount > 0 && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-accent-tint)] text-accent">
                    {performingCount}
                  </span>
                )}
                {!isPaid && <span className="ml-1 text-xs opacity-50">🔒</span>}
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <p className="text-text-dim">読み込み中...</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <p className="text-text-dim mb-4">まだ記事がありません</p>
              <Link href="/dashboard" className="text-accent hover:underline">
                最初の記事を作成する →
              </Link>
            </div>
          ) : (filter === "rewrite" || filter === "performing") && !isPaid ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-lg font-semibold text-text-bright mb-2">
                Business プラン限定
              </h3>
              <p className="text-text-dim text-sm mb-6 max-w-md mx-auto">
                記事パフォーマンス追跡・リライト提案は有料プランでご利用いただけます。
                Search Consoleと連携して、順位・CTRに基づく改善提案を自動で受け取れます。
              </p>
              <Link
                href="/pricing"
                className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold text-sm"
              >
                プランをアップグレード →
              </Link>
            </div>
          ) : filter === "rewrite" && !gscConnected ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-text-bright mb-2">
                Search Consoleを接続しましょう
              </h3>
              <p className="text-text-dim text-sm mb-6 max-w-md mx-auto">
                Search Consoleを接続すると、実データに基づくリライト提案が表示されます。
                順位改善・CTR向上のチャンスを自動で検出します。
              </p>
              <Link
                href="/search-console"
                className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold text-sm"
              >
                Search Consoleを接続 →
              </Link>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <p className="text-text-dim">
                {filter === "rewrite"
                  ? "リライト推奨の記事はありません"
                  : filter === "performing"
                    ? "上位10位以内の記事はまだありません"
                    : "該当する記事はありません"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <div
                  key={article.articleId}
                  className="bg-surface border border-border rounded-xl p-5 hover:border-[var(--color-border-strong)] transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h2 className="font-semibold text-lg mb-1 line-clamp-1">
                        {article.title}
                      </h2>
                      <span className="text-xs text-text-dim bg-surface2 px-2 py-1 rounded">
                        {article.keyword}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {article.wpPostId && (
                        <a
                          href={article.wpUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          WP
                        </a>
                      )}
                      {/* リライト提案バッジ */}
                      {article.suggestion && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setTooltipId(
                                tooltipId === article.articleId ? null : article.articleId
                              )
                            }
                            className={`text-xs px-2 py-1 rounded border ${SUGGESTION_CONFIG[article.suggestion].className}`}
                          >
                            {SUGGESTION_CONFIG[article.suggestion].label}
                          </button>
                          {tooltipId === article.articleId && article.suggestionReason && (
                            <div className="absolute right-0 top-8 z-20 w-72 p-3 rounded-lg bg-surface2 border border-border shadow-xl text-xs text-text-primary">
                              {article.suggestionReason}
                              <div className="mt-2">
                                <Link
                                  href={`/rewrite?id=${article.articleId}`}
                                  className="text-accent hover:underline"
                                >
                                  リライトする →
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <span
                        className={`text-sm font-bold px-2 py-1 rounded ${
                          article.seoScore >= 80
                            ? "bg-[var(--color-accent-tint)] text-accent"
                            : article.seoScore >= 60
                              ? "bg-[var(--color-accent2-tint)] text-accent2"
                              : "bg-[var(--color-warning-tint)] text-warning"
                        }`}
                      >
                        {article.seoScore}点
                      </span>
                    </div>
                  </div>

                  {/* メトリクス行 */}
                  <div className="flex items-center gap-4 text-xs text-text-dim mb-4">
                    <span>{article.wordCount.toLocaleString()}文字</span>
                    <span>
                      {new Date(article.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                    {/* GSCデータ */}
                    {article.gsc && (
                      <>
                        <span className="w-px h-3 bg-border" />
                        <span
                          className={`font-mono font-medium ${
                            article.gsc.position <= 3
                              ? "text-green-400"
                              : article.gsc.position <= 10
                                ? "text-accent"
                                : article.gsc.position <= 20
                                  ? "text-warning"
                                  : "text-red-400"
                          }`}
                        >
                          {article.gsc.position}位
                        </span>
                        <span>{article.gsc.clicks}クリック</span>
                        <span>{article.gsc.impressions.toLocaleString()}表示</span>
                        <span>CTR {(article.gsc.ctr * 100).toFixed(1)}%</span>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openPreview(article)}
                      disabled={loadingPreview}
                      className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent-tint-border)] hover:text-accent transition-all"
                    >
                      プレビュー
                    </button>
                    <button
                      onClick={() => copyHtml(article)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent-tint-border)] hover:text-accent transition-all"
                    >
                      HTMLコピー
                    </button>
                    <button
                      onClick={() => copyNote(article)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent2-tint)] hover:text-accent2 transition-all"
                    >
                      note用
                    </button>
                    <button
                      onClick={() => openImageModal(article)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent2-tint)] hover:text-accent2 transition-all"
                    >
                      ヘッダー画像
                    </button>
                    <Link
                      href={`/rewrite?id=${article.articleId}`}
                      className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent2-tint)] hover:text-accent2 transition-all"
                    >
                      リライト
                    </Link>
                    {wpConnected && (
                      <button
                        onClick={() => publishToWP(article)}
                        disabled={wpPublishingId === article.articleId}
                        className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-primary hover:border-blue-500/30 hover:text-blue-400 transition-all disabled:opacity-50"
                      >
                        {wpPublishingId === article.articleId
                          ? "投稿中..."
                          : article.wpPostId
                            ? "WP更新"
                            : "WPに投稿"}
                      </button>
                    )}
                    <button
                      onClick={() => deleteArticle(article.articleId)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-dim hover:border-red-500/20 hover:text-red-400 transition-all ml-auto"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Preview Modal */}
      {previewArticle && previewArticle.content && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewArticle(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-semibold text-lg">{previewArticle.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-dim">
                  <span className="bg-surface2 px-2 py-0.5 rounded">{previewArticle.keyword}</span>
                  <span>{previewArticle.wordCount.toLocaleString()}文字</span>
                  <span>{new Date(previewArticle.createdAt).toLocaleDateString("ja-JP")}</span>
                  {previewArticle.gsc && (
                    <>
                      <span className="w-px h-3 bg-border" />
                      <span
                        className={`font-mono font-medium ${
                          previewArticle.gsc.position <= 3
                            ? "text-green-400"
                            : previewArticle.gsc.position <= 10
                              ? "text-accent"
                              : "text-warning"
                        }`}
                      >
                        {previewArticle.gsc.position}位
                      </span>
                      <span>{previewArticle.gsc.clicks}クリック</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewArticle(null)}
                className="w-8 h-8 rounded-lg bg-surface2 border border-border text-text-dim hover:text-text-bright transition-colors flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              <div
                className="prose-preview"
                dangerouslySetInnerHTML={{ __html: previewArticle.content }}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewArticle.content!);
                  alert("HTMLをコピーしました");
                }}
                className="px-4 py-2 rounded-lg text-sm bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent-tint-border)] hover:text-accent transition-all"
              >
                HTMLコピー
              </button>
              <button
                onClick={async () => {
                  const noteHtml = convertToNoteHtml(previewArticle.content!);
                  const noteText = convertToNoteFormat(previewArticle.content!);
                  await copyHtmlToClipboard(noteHtml, noteText);
                  alert("note用テキストをコピーしました（見出し付き）");
                }}
                className="px-4 py-2 rounded-lg text-sm bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent2-tint)] hover:text-accent2 transition-all"
              >
                note用
              </button>
              <Link
                href={`/rewrite?id=${previewArticle.articleId}`}
                className="px-4 py-2 rounded-lg text-sm bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold"
              >
                リライト
              </Link>
            </div>
          </div>
        </div>
      )}

      <ImageGenerateModal
        isOpen={!!imageModalArticle}
        onClose={() => setImageModalArticle(null)}
        title={imageModalArticle?.title || ""}
        keyword={imageModalArticle?.keyword || ""}
        content={imageModalArticle?.content || ""}
      />
    </div>
  );
}
