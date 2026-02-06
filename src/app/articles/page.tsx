"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Article {
  id: string;
  keyword: string;
  title: string;
  wordCount: number;
  seoScore: number;
  createdAt: string;
  content: string;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("kiji-articles");
    if (saved) {
      setArticles(JSON.parse(saved));
    }
  }, []);

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

  const deleteArticle = (id: string) => {
    const updated = articles.filter((a) => a.id !== id);
    setArticles(updated);
    localStorage.setItem("kiji-articles", JSON.stringify(updated));
  };

  const copyHtml = (content: string) => {
    navigator.clipboard.writeText(content);
    alert("HTMLをコピーしました");
  };

  return (
    <div className="min-h-screen bg-[#08080d] text-[#f0f0f6]">
      {/* Header */}
      <header className="h-14 border-b border-white/[0.06] flex items-center px-7">
        <Link href="/dashboard" className="font-mono text-xl font-bold tracking-wider">
          Kiji<span className="text-[#00e5a0]">.</span>
        </Link>
        <span className="ml-4 text-sm text-[#6e6e82]">/ 記事一覧</span>
      </header>

      <main className="max-w-5xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">記事一覧</h1>
            <p className="text-[#6e6e82]">生成した記事はローカルに保存されます</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#00e5a0] to-[#00c88a] text-[#08080d] font-semibold text-sm"
          >
            + 新規作成
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-12 text-center">
            <p className="text-[#6e6e82] mb-4">まだ記事がありません</p>
            <Link
              href="/dashboard"
              className="text-[#00e5a0] hover:underline"
            >
              最初の記事を作成する →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <div
                key={article.id}
                className="bg-[#111119] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h2 className="font-semibold text-lg mb-1 line-clamp-1">
                      {article.title}
                    </h2>
                    <span className="text-xs text-[#6e6e82] bg-[#181822] px-2 py-1 rounded">
                      {article.keyword}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span
                      className={`text-sm font-bold px-2 py-1 rounded ${
                        article.seoScore >= 80
                          ? "bg-[rgba(0,229,160,0.1)] text-[#00e5a0]"
                          : article.seoScore >= 60
                          ? "bg-[rgba(0,196,255,0.1)] text-[#00c4ff]"
                          : "bg-[rgba(255,170,44,0.1)] text-[#ffaa2c]"
                      }`}
                    >
                      {article.seoScore}点
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#6e6e82] mb-4">
                  <span>{article.wordCount.toLocaleString()}文字</span>
                  <span>
                    {new Date(article.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewArticle(article)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-[#181822] border border-white/[0.06] text-[#d0d0dc] hover:border-[rgba(0,229,160,0.2)] hover:text-[#00e5a0] transition-all"
                  >
                    プレビュー
                  </button>
                  <button
                    onClick={() => copyHtml(article.content)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-[#181822] border border-white/[0.06] text-[#d0d0dc] hover:border-[rgba(0,229,160,0.2)] hover:text-[#00e5a0] transition-all"
                  >
                    HTMLコピー
                  </button>
                  <Link
                    href={`/rewrite?id=${article.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs bg-[#181822] border border-white/[0.06] text-[#d0d0dc] hover:border-[rgba(0,196,255,0.2)] hover:text-[#00c4ff] transition-all"
                  >
                    リライト
                  </Link>
                  <button
                    onClick={() => deleteArticle(article.id)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-[#181822] border border-white/[0.06] text-[#6e6e82] hover:border-red-500/20 hover:text-red-400 transition-all ml-auto"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {previewArticle && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewArticle(null)}
        >
          <div
            className="bg-[#111119] border border-white/[0.06] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div>
                <h2 className="font-semibold text-lg">{previewArticle.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-[#6e6e82]">
                  <span className="bg-[#181822] px-2 py-0.5 rounded">{previewArticle.keyword}</span>
                  <span>{previewArticle.wordCount.toLocaleString()}文字</span>
                  <span>{new Date(previewArticle.createdAt).toLocaleDateString("ja-JP")}</span>
                </div>
              </div>
              <button
                onClick={() => setPreviewArticle(null)}
                className="w-8 h-8 rounded-lg bg-[#181822] border border-white/[0.06] text-[#6e6e82] hover:text-[#f0f0f6] transition-colors flex items-center justify-center"
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
            <div className="flex items-center justify-end gap-3 p-5 border-t border-white/[0.06]">
              <button
                onClick={() => copyHtml(previewArticle.content)}
                className="px-4 py-2 rounded-lg text-sm bg-[#181822] border border-white/[0.06] text-[#d0d0dc] hover:border-[rgba(0,229,160,0.2)] hover:text-[#00e5a0] transition-all"
              >
                HTMLコピー
              </button>
              <Link
                href={`/rewrite?id=${previewArticle.id}`}
                className="px-4 py-2 rounded-lg text-sm bg-gradient-to-br from-[#00e5a0] to-[#00c88a] text-[#08080d] font-semibold"
              >
                リライト
              </Link>
            </div>
          </div>

          <style jsx global>{`
            .prose-preview h1 { font-size: 1.5rem; font-weight: 700; color: #f0f0f6; margin: 0 0 16px; }
            .prose-preview h2 { font-size: 1.2rem; font-weight: 600; color: #f0f0f6; margin: 24px 0 12px; padding-left: 12px; border-left: 3px solid #00e5a0; }
            .prose-preview h3 { font-size: 1.05rem; font-weight: 600; color: #d0d0dc; margin: 20px 0 8px; }
            .prose-preview p { font-size: 0.9rem; color: #d0d0dc; margin-bottom: 14px; line-height: 1.8; }
            .prose-preview ul, .prose-preview ol { margin: 12px 0; padding-left: 24px; color: #d0d0dc; }
            .prose-preview li { margin-bottom: 6px; line-height: 1.7; }
            .prose-preview strong { color: #f0f0f6; }
            .prose-preview a { color: #00e5a0; text-decoration: underline; }
          `}</style>
        </div>
      )}
    </div>
  );
}
