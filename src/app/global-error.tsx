"use client";

export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold font-mono text-red-400 mb-4">500</h1>
          <p className="text-text-dim text-lg mb-8">
            エラーが発生しました
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-on-accent font-semibold text-sm"
          >
            もう一度試す
          </button>
        </div>
      </body>
    </html>
  );
}
