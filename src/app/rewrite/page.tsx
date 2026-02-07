"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";

function RewriteContent() {
  const searchParams = useSearchParams();
  const articleId = searchParams.get("id");

  const [originalContent, setOriginalContent] = useState("");
  const [rewrittenContent, setRewrittenContent] = useState("");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wordCount, setWordCount] = useState({ original: 0, rewritten: 0 });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (articleId) {
      fetch(`/api/articles/${articleId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((article) => {
          if (article) {
            setOriginalContent(article.content);
            const textOnly = article.content.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
            setWordCount((prev) => ({ ...prev, original: textOnly.length }));
          }
        })
        .catch(() => {});
    }
  }, [articleId]);

  const handleRewrite = async () => {
    if (!originalContent.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: originalContent,
          instruction: instruction || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRewrittenContent(data.content);
      setWordCount((prev) => ({ ...prev, rewritten: data.wordCount }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyHtml = (content: string) => {
    navigator.clipboard.writeText(content);
    alert("HTMLをコピーしました");
  };

  const saveArticle = async () => {
    if (!rewrittenContent) return;

    const titleMatch = rewrittenContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const title = titleMatch ? titleMatch[1] : "リライト記事";

    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: "リライト",
          title,
          content: rewrittenContent,
          word_count: wordCount.rewritten,
          seo_score: 80,
        }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      alert("記事を保存しました");
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-2">記事リライト</h1>
      <p className="text-[#6e6e82] mb-6">
        既存の記事をAIでリライトして品質を向上させます
      </p>

      {/* Instruction */}
      <div className="mb-6">
        <label className="text-sm text-[#6e6e82] block mb-2">
          リライト指示（任意）
        </label>
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="例：もっとカジュアルな文体にして、具体例を増やす"
          className="w-full px-4 py-3 rounded-xl bg-[#111119] border border-white/[0.06] text-[#f0f0f6] outline-none focus:border-[#00e5a0] transition-colors"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">元の記事</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#6e6e82]">
                {wordCount.original.toLocaleString()}文字
              </span>
              <button
                onClick={() => setEditMode(!editMode)}
                className="text-xs px-2 py-1 rounded bg-[#181822] border border-white/[0.06] text-[#6e6e82] hover:text-[#00e5a0] hover:border-[rgba(0,229,160,0.2)] transition-all"
              >
                {editMode ? "プレビュー" : "HTML編集"}
              </button>
            </div>
          </div>
          {editMode ? (
            <textarea
              value={originalContent}
              onChange={(e) => {
                setOriginalContent(e.target.value);
                const textOnly = e.target.value.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
                setWordCount((prev) => ({ ...prev, original: textOnly.length }));
              }}
              placeholder="リライトする記事のHTMLを貼り付けてください..."
              className="w-full h-[500px] px-4 py-3 rounded-xl bg-[#111119] border border-white/[0.06] text-[#d0d0dc] text-sm font-mono outline-none focus:border-[#00e5a0] transition-colors resize-none"
            />
          ) : (
            <div className="w-full h-[500px] px-4 py-3 rounded-xl bg-[#111119] border border-white/[0.06] text-[#d0d0dc] text-sm overflow-auto">
              {originalContent ? (
                <div
                  className="prose-dark"
                  dangerouslySetInnerHTML={{ __html: originalContent }}
                />
              ) : (
                <p className="text-[#6e6e82]">
                  「HTML編集」をクリックしてHTMLを貼り付けてください
                </p>
              )}
            </div>
          )}
        </div>

        {/* Rewritten */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">リライト後</h2>
            {rewrittenContent && (
              <span className="text-xs text-[#6e6e82]">
                {wordCount.rewritten.toLocaleString()}文字
                {wordCount.original > 0 && (
                  <span
                    className={`ml-2 ${
                      wordCount.rewritten > wordCount.original
                        ? "text-[#00e5a0]"
                        : "text-[#ffaa2c]"
                    }`}
                  >
                    ({wordCount.rewritten > wordCount.original ? "+" : ""}
                    {Math.round(
                      ((wordCount.rewritten - wordCount.original) /
                        wordCount.original) *
                        100
                    )}
                    %)
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="w-full h-[500px] px-4 py-3 rounded-xl bg-[#111119] border border-white/[0.06] text-[#d0d0dc] text-sm overflow-auto">
            {rewrittenContent ? (
              <div
                className="prose-dark"
                dangerouslySetInnerHTML={{ __html: rewrittenContent }}
              />
            ) : (
              <p className="text-[#6e6e82]">
                リライト結果がここに表示されます
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-8">
        <button
          onClick={handleRewrite}
          disabled={loading || !originalContent.trim()}
          className="px-8 py-3 rounded-xl bg-gradient-to-br from-[#00e5a0] to-[#00c88a] text-[#08080d] font-semibold disabled:opacity-50"
        >
          {loading ? "リライト中..." : "✨ リライトする"}
        </button>
        {rewrittenContent && (
          <>
            <button
              onClick={saveArticle}
              className="px-6 py-3 rounded-xl bg-[#181822] border border-white/[0.06] text-[#d0d0dc] font-semibold hover:border-[rgba(0,229,160,0.2)] hover:text-[#00e5a0] transition-all"
            >
              💾 保存
            </button>
            <button
              onClick={() => copyHtml(rewrittenContent)}
              className="px-6 py-3 rounded-xl bg-[#181822] border border-white/[0.06] text-[#d0d0dc] font-semibold hover:border-[rgba(0,229,160,0.2)] hover:text-[#00e5a0] transition-all"
            >
              📋 HTMLコピー
            </button>
          </>
        )}
      </div>

      <style jsx global>{`
        .prose-dark h1 { font-size: 1.4rem; font-weight: 700; color: #f0f0f6; margin: 0 0 12px; }
        .prose-dark h2 { font-size: 1.1rem; font-weight: 600; color: #f0f0f6; margin: 20px 0 8px; padding-left: 10px; border-left: 3px solid #00e5a0; }
        .prose-dark h3 { font-size: 1rem; font-weight: 600; color: #d0d0dc; margin: 16px 0 6px; }
        .prose-dark p { font-size: 0.875rem; color: #d0d0dc; margin-bottom: 12px; line-height: 1.7; }
      `}</style>
    </>
  );
}

export default function RewritePage() {
  return (
    <div className="flex h-screen bg-[#08080d] text-[#f0f0f6]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<div className="text-[#6e6e82]">読み込み中...</div>}>
            <RewriteContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
