import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Kiji — AIがSEO記事を自動生成",
  description:
    "キーワードを入れるだけ。競合分析から記事生成、WordPress投稿まで一気通貫。",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://kiji-ai.app"),
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
