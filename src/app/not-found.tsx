import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#08080d] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold font-mono text-[#00e5a0] mb-4">404</h1>
        <p className="text-[#6e6e82] text-lg mb-8">
          ページが見つかりませんでした
        </p>
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-xl bg-gradient-to-br from-[#00e5a0] to-[#00c88a] text-[#08080d] font-semibold text-sm"
        >
          ダッシュボードに戻る
        </Link>
      </div>
    </div>
  );
}
