"use client";

import { useState } from "react";
import Link from "next/link";

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
    high: "bg-[rgba(0,229,160,0.15)] text-[#00e5a0] border-[rgba(0,229,160,0.3)]",
    medium: "bg-[rgba(0,196,255,0.1)] text-[#00c4ff] border-[rgba(0,196,255,0.2)]",
    low: "bg-[#181822] text-[#d0d0dc] border-white/[0.06]",
  };

  return (
    <div className="min-h-screen bg-[#08080d] text-[#f0f0f6]">
      {/* Header */}
      <header className="h-14 border-b border-white/[0.06] flex items-center px-7">
        <Link href="/dashboard" className="font-mono text-xl font-bold tracking-wider">
          Kiji<span className="text-[#00e5a0]">.</span>
        </Link>
        <span className="ml-4 text-sm text-[#6e6e82]">/ 共起語チェッカー</span>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-2">共起語チェッカー</h1>
        <p className="text-[#6e6e82] mb-8">
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
            className="flex-1 px-4 py-3 rounded-xl bg-[#111119] border border-white/[0.06] text-[#f0f0f6] outline-none focus:border-[#00e5a0] transition-colors"
            disabled={loading}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !keyword.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-br from-[#00e5a0] to-[#00c88a] text-[#08080d] font-semibold disabled:opacity-50"
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
          <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">
                「{keyword}」の共起語・関連語
              </h2>
              <span className="text-sm text-[#6e6e82]">{words.length}件</span>
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

            <div className="mt-6 pt-4 border-t border-white/[0.06] flex gap-4 text-xs text-[#6e6e82]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00e5a0]"></span>
                重要度：高
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00c4ff]"></span>
                重要度：中
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6e6e82]"></span>
                重要度：低
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
