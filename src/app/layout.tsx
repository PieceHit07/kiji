import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Kiji — AIがSEO記事を自動生成",
  description:
    "キーワードを入れるだけ。競合分析から記事生成、WordPress投稿まで一気通貫。",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://kiji.app"),
  openGraph: {
    title: "Kiji — AIがSEO記事を自動生成",
    description:
      "キーワードを入れるだけ。競合分析から記事生成、WordPress投稿まで一気通貫。",
    siteName: "Kiji",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kiji — AIがSEO記事を自動生成",
    description:
      "キーワードを入れるだけ。競合分析から記事生成、WordPress投稿まで一気通貫。",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
