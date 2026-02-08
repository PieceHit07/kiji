"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import ImageGenerateModal from "@/components/ImageGenerateModal";
import { convertToNoteFormat } from "@/lib/export";

interface Article {
  id: string;
  keyword: string;
  title: string;
  word_count: number;
  seo_score: number;
  created_at: string;
  content?: string;
  wp_post_id?: number | null;
  wp_url?: string | null;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [imageModalArticle, setImageModalArticle] = useState<{title: string; keyword: string; content: string} | null>(null);
  const [wpConnected, setWpConnected] = useState(false);
  const [wpPublishingId, setWpPublishingId] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch("/api/articles");
      if (!res.ok) return;
      const data = await res.json();
      setArticles(data);
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

  const openPreview = async (article: Article) => {
    if (article.content) {
      setPreviewArticle(article);
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/articles/${article.id}`);
      if (!res.ok) return;
      const full = await res.json();
      setPreviewArticle({ ...article, content: full.content });
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
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // ignore
    }
  };

  const copyHtml = async (article: Article) => {
    let content = article.content;
    if (!content) {
      const res = await fetch(`/api/articles/${article.id}`);
      if (!res.ok) return;
      const full = await res.json();
      content = full.content;
    }
    navigator.clipboard.writeText(content!);
    alert("HTMLをコピーしました");
  };

  const openImageModal = async (article: Article) => {
    let content = article.content;
    if (!content) {
      const res = await fetch(`/api/articles/${article.id}`);
      if (!res.ok) return;
      const full = await res.json();
      content = full.content;
    }
    setImageModalArticle({ title: article.title, keyword: article.keyword, content: content! });
  };

  const publishToWP = async (article: Article) => {
    setWpPublishingId(article.id);
    try {
      const res = await fetch("/api/wordpress/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id }),
      });
      const data = await res.json();
      if (data.success) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === article.id
              ? { ...a, wp_post_id: data.wpPostId, wp_url: data.wpUrl }
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

  const copyNote = async (article: Article) => {
    let content = article.content;
    if (!content) {
      const res = await fetch(`/api/articles/${article.id}`);
      if (!res.ok) return;
      const full = await res.json();
      content = full.content;
    }
    const noteText = convertToNoteFormat(content!);
    navigator.clipboard.writeText(noteText);
    alert("note用テキストをコピーしました");
  };

  return (
    <div className="flex h-screen bg-bg text-text-bright">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
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

        {loading ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <p className="text-text-dim">読み込み中...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <p className="text-text-dim mb-4">まだ記事がありません</p>
            <Link
              href="/dashboard"
              className="text-accent hover:underline"
            >
              最初の記事を作成する →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <div
                key={article.id}
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
                    {article.wp_post_id && (
                      <a
                        href={article.wp_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        WP
                      </a>
                    )}
                    <span
                      className={`text-sm font-bold px-2 py-1 rounded ${
                        article.seo_score >= 80
                          ? "bg-[var(--color-accent-tint)] text-accent"
                          : article.seo_score >= 60
                          ? "bg-[var(--color-accent2-tint)] text-accent2"
                          : "bg-[var(--color-warning-tint)] text-warning"
                      }`}
                    >
                      {article.seo_score}点
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-text-dim mb-4">
                  <span>{article.word_count.toLocaleString()}文字</span>
                  <span>
                    {new Date(article.created_at).toLocaleDateString("ja-JP")}
                  </span>
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
                    href={`/rewrite?id=${article.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent2-tint)] hover:text-accent2 transition-all"
                  >
                    リライト
                  </Link>
                  {wpConnected && (
                    <button
                      onClick={() => publishToWP(article)}
                      disabled={wpPublishingId === article.id}
                      className="px-3 py-1.5 rounded-lg text-xs bg-surface2 border border-border text-text-primary hover:border-blue-500/30 hover:text-blue-400 transition-all disabled:opacity-50"
                    >
                      {wpPublishingId === article.id
                        ? "投稿中..."
                        : article.wp_post_id
                          ? "WP更新"
                          : "WPに投稿"}
                    </button>
                  )}
                  <button
                    onClick={() => deleteArticle(article.id)}
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
                  <span>{previewArticle.word_count.toLocaleString()}文字</span>
                  <span>{new Date(previewArticle.created_at).toLocaleDateString("ja-JP")}</span>
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
                onClick={() => {
                  const noteText = convertToNoteFormat(previewArticle.content!);
                  navigator.clipboard.writeText(noteText);
                  alert("note用テキストをコピーしました");
                }}
                className="px-4 py-2 rounded-lg text-sm bg-surface2 border border-border text-text-primary hover:border-[var(--color-accent2-tint)] hover:text-accent2 transition-all"
              >
                note用
              </button>
              <Link
                href={`/rewrite?id=${previewArticle.id}`}
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
