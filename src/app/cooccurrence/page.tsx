"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

interface CooccurrenceWord {
  word: string;
  importance: "high" | "medium" | "low";
}

export default function CooccurrencePage() {
  const [keyword, setKeyword] = useState("");
  const [words, setWords] = useState<CooccurrenceWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/cooccurrence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setWords(data.words || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const importanceColor = {
    high: "bg-[var(--color-accent-tint)] text-accent border-[var(--color-accent-tint-border)]",
    medium: "bg-[var(--color-accent2-tint)] text-accent2 border-[var(--color-accent2-tint)]",
    low: "bg-surface2 text-text-primary border-border",
  };

  return (
    <div className="flex h-screen bg-bg text-text-bright">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">共起語チェッカー</h1>
        <p className="text-text-dim mb-8">
          キーワードを入力すると、SEO記事に含めるべき共起語・関連語をAIが提案します
        </p>

        {/* Search */}
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isComposing && handleSearch()}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="キーワードを入力（例：SEO対策）"
            className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-text-bright outline-none focus:border-accent transition-colors"
            disabled={loading}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !keyword.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold disabled:opacity-50"
          >
            {loading ? "検索中..." : "共起語を取得"}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {words.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">
                「{keyword}」の共起語・関連語
              </h2>
              <span className="text-sm text-text-dim">{words.length}件</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {words.map((w, i) => (
                <span
                  key={i}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${importanceColor[w.importance]}`}
                >
                  {w.word}
                </span>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border flex gap-4 text-xs text-text-dim">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                重要度：高
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent2"></span>
                重要度：中
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-text-dim"></span>
                重要度：低
              </span>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
