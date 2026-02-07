"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#08080d] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold font-mono text-red-400 mb-4">500</h1>
        <p className="text-[#6e6e82] text-lg mb-8">
          エラーが発生しました
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-gradient-to-br from-[#00e5a0] to-[#00c88a] text-[#08080d] font-semibold text-sm"
        >
          もう一度試す
        </button>
      </div>
    </div>
  );
}
