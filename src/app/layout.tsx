import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Kiji — 上位記事を分析してSEO記事をAI自動生成",
  description:
    "上位10記事の構成・共起語を自動分析し、検索で勝てる記事をAIが生成。キーワードを入れて5分、あとは公開するだけ。",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://kiji-ai.app"),
  openGraph: {
    title: "Kiji — 上位記事を分析してSEO記事をAI自動生成",
    description:
      "上位10記事の構成・共起語を自動分析し、検索で勝てる記事をAIが生成。キーワードを入れて5分、あとは公開するだけ。",
    siteName: "Kiji",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kiji — 上位記事を分析してSEO記事をAI自動生成",
    description:
      "上位10記事の構成・共起語を自動分析し、検索で勝てる記事をAIが生成。キーワードを入れて5分、あとは公開するだけ。",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('kiji-theme');if(!t){t=window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark'}document.documentElement.setAttribute('data-theme',t)})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
