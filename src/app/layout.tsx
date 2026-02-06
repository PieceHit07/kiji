import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiji — AIがSEO記事を自動生成",
  description:
    "キーワードを入れるだけ。競合分析から記事生成、WordPress投稿まで一気通貫。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
