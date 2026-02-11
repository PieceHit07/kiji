"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/components/ThemeProvider";

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null);
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const saved = localStorage.getItem("kiji-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((d) => {
          if (d.plan) setUserPlan(d.plan);
          if (d.tokens) setTokensRemaining(d.tokens.remaining);
        })
        .catch(() => {});
    }
  }, [session]);

  // 他コンポーネントからのトークン更新を受け取る
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.remaining !== undefined) setTokensRemaining(detail.remaining);
    };
    window.addEventListener("tokens-updated", handler);
    return () => window.removeEventListener("tokens-updated", handler);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("kiji-sidebar-collapsed", String(next));
  };

  return (
    <>
    <aside
      className={`bg-sidebar border-r border-border flex flex-col transition-all duration-300 max-md:hidden relative ${
        collapsed ? "w-16 min-w-[64px] p-3" : "w-56 min-w-[224px] p-5"
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-5 w-6 h-6 rounded-full bg-surface2 border border-[var(--color-border-strong)] flex items-center justify-center text-text-dim hover:text-accent hover:border-[var(--color-accent-tint-border)] transition-all z-10"
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </button>

      {/* Logo */}
      <Link
        href="/dashboard"
        className={`font-mono font-bold text-text-bright tracking-wider mb-6 ${
          collapsed ? "text-base text-center" : "text-xl"
        }`}
      >
        {collapsed ? (
          <span className="text-accent">K</span>
        ) : (
          <>Kiji<span className="text-accent">.</span></>
        )}
      </Link>

      {!collapsed && (
        <div className="text-[0.7rem] text-text-dim uppercase tracking-[2px] mb-3 px-2">
          メイン
        </div>
      )}
      <Link
        href="/dashboard"
        title="新規記事作成"
        className={`flex items-center rounded-lg text-sm mb-1 ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        } ${
          pathname === "/dashboard"
            ? "bg-[var(--color-accent-tint)] text-accent"
            : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
        }`}
      >
        <PlusIcon />
        {!collapsed && <span>新規記事作成</span>}
      </Link>
      <Link
        href="/articles"
        title="記事一覧"
        className={`flex items-center rounded-lg text-sm mb-1 ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        } ${
          pathname === "/articles"
            ? "bg-[var(--color-accent-tint)] text-accent"
            : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
        }`}
      >
        <ListIcon />
        {!collapsed && <span>記事一覧</span>}
      </Link>
      <Link
        href="/rewrite"
        title="リライト"
        className={`flex items-center rounded-lg text-sm mb-1 ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        } ${
          pathname === "/rewrite"
            ? "bg-[var(--color-accent-tint)] text-accent"
            : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
        }`}
      >
        <RefreshIcon />
        {!collapsed && <span>リライト</span>}
      </Link>
      <Link
        href="/bulk"
        title="一括生成"
        className={`flex items-center rounded-lg text-sm ${
          collapsed ? "justify-center px-2 py-2.5 mb-3" : "gap-2.5 px-3 py-2.5 mb-6"
        } ${
          pathname === "/bulk"
            ? "bg-[var(--color-accent-tint)] text-accent"
            : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
        }`}
      >
        <StackIcon />
        {!collapsed && <span>一括生成</span>}
      </Link>

      {!collapsed && (
        <div className="text-[0.7rem] text-text-dim uppercase tracking-[2px] mb-3 px-2">
          ツール
        </div>
      )}
      <Link
        href="/cooccurrence"
        title="共起語チェッカー"
        className={`flex items-center rounded-lg text-sm mb-1 ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        } ${
          pathname === "/cooccurrence"
            ? "bg-[var(--color-accent-tint)] text-accent"
            : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
        }`}
      >
        <SearchIcon />
        {!collapsed && <span>共起語チェッカー</span>}
      </Link>
      <Link
        href="/ranking"
        title="順位トラッキング"
        className={`flex items-center rounded-lg text-sm mb-1 ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        } ${
          pathname === "/ranking"
            ? "bg-[var(--color-accent-tint)] text-accent"
            : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
        }`}
      >
        <ChartIcon />
        {!collapsed && <span>順位トラッキング</span>}
      </Link>
      <Link
        href="/keywords"
        title="キーワード提案"
        className={`flex items-center rounded-lg text-sm mb-1 ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        } ${
          pathname === "/keywords"
            ? "bg-[var(--color-accent-tint)] text-accent"
            : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
        }`}
      >
        <LightbulbIcon />
        {!collapsed && <span>キーワード提案</span>}
      </Link>
      <Link
        href="/search-console"
        title="Search Console"
        className={`flex items-center rounded-lg text-sm mb-1 ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        } ${
          pathname === "/search-console"
            ? "bg-[var(--color-accent-tint)] text-accent"
            : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
        }`}
      >
        <GSCIcon />
        {!collapsed && <span>Search Console</span>}
      </Link>

      <div className="flex-1" />

      <button
        onClick={toggleTheme}
        title={theme === "dark" ? "ライトモード" : "ダークモード"}
        className={`flex items-center rounded-lg text-sm mb-1 text-text-dim hover:bg-hover-subtle hover:text-text-primary transition-colors ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        }`}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        {!collapsed && <span>{theme === "dark" ? "ライトモード" : "ダークモード"}</span>}
      </button>

      {/* Pricing Link */}
      <Link
        href="/pricing"
        title="料金プラン"
        className={`flex items-center rounded-lg text-sm mb-1 ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        } ${
          pathname === "/pricing"
            ? "bg-[var(--color-accent-tint)] text-accent"
            : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
        }`}
      >
        <CreditCardIcon />
        {!collapsed && <span>料金プラン</span>}
      </Link>
      <Link
        href="/tokens"
        title="トークン購入"
        className={`flex items-center rounded-lg text-sm mb-4 ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        } ${
          pathname === "/tokens"
            ? "bg-[var(--color-accent-tint)] text-accent"
            : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
        }`}
      >
        <TokenIcon />
        {!collapsed && <span>トークン購入</span>}
      </Link>
      <Link
        href="/settings"
        title="アカウント設定"
        className={`flex items-center rounded-lg text-sm mb-4 ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        } ${
          pathname === "/settings"
            ? "bg-[var(--color-accent-tint)] text-accent"
            : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
        }`}
      >
        <SettingsIcon />
        {!collapsed && <span>アカウント設定</span>}
      </Link>

      {session?.user && (
        <div className={`pt-4 border-t border-border ${collapsed ? "" : "space-y-2"}`}>
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "gap-2.5"
            }`}
          >
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="w-8 h-8 rounded-lg flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-xs font-bold text-on-accent flex-shrink-0">
                {session.user.name?.[0] || "U"}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-text-primary truncate">
                    {session.user.name || "User"}
                  </span>
                  {session.user.email?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase() ? (
                    <button
                      onClick={async () => {
                        const next = userPlan === "free" ? "pro" : userPlan === "pro" ? "business" : "free";
                        try {
                          const res = await fetch("/api/admin/set-plan", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ plan: next }),
                          });
                          if (res.ok) {
                            setUserPlan(next);
                            setTokensRemaining(null);
                            fetch("/api/user").then(r => r.json()).then(d => {
                              if (d.tokens) setTokensRemaining(d.tokens.remaining);
                            });
                          }
                        } catch {}
                      }}
                      className={`text-[0.6rem] px-1.5 py-0.5 rounded font-medium flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${
                        userPlan === "business"
                          ? "bg-[var(--color-warning-tint)] text-warning"
                          : userPlan === "pro"
                          ? "bg-[var(--color-accent-tint)] text-accent"
                          : "bg-[var(--color-border)] text-text-dim"
                      }`}
                      title="クリックでプラン切替（dev）"
                    >
                      {userPlan === "business" ? "Business" : userPlan === "pro" ? "Pro" : "Free"}
                    </button>
                  ) : (
                    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                      userPlan === "business"
                        ? "bg-[var(--color-warning-tint)] text-warning"
                        : userPlan === "pro"
                        ? "bg-[var(--color-accent-tint)] text-accent"
                        : "bg-[var(--color-border)] text-text-dim"
                    }`}>
                      {userPlan === "business" ? "Business" : userPlan === "pro" ? "Pro" : "Free"}
                    </span>
                  )}
                </div>
                <div className="text-[0.65rem] text-text-dim truncate">
                  {session.user.email}
                </div>
                {tokensRemaining !== null && (
                  <div className={`text-[0.6rem] font-mono mt-0.5 ${
                    tokensRemaining <= 5 ? "text-red-400" : tokensRemaining <= 20 ? "text-warning" : "text-text-dim"
                  }`}>
                    {`残り ${tokensRemaining} トークン`}
                  </div>
                )}
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-dim hover:bg-hover-subtle hover:text-red-400 transition-colors"
            >
              <LogoutIcon />
              ログアウト
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="ログアウト"
              className="w-full flex justify-center py-2 text-text-dim hover:text-red-400 transition-colors"
            >
              <LogoutIcon />
            </button>
          )}
        </div>
      )}
    </aside>

    {/* ===== Mobile Bottom Nav ===== */}
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur-xl border-t border-border md:hidden safe-bottom">
      <div className="flex items-center justify-around h-14">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${
            pathname === "/dashboard" ? "text-accent" : "text-text-dim"
          }`}
        >
          <PlusIcon />
          <span className="text-[0.6rem]">新規作成</span>
        </Link>
        <Link
          href="/articles"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${
            pathname === "/articles" ? "text-accent" : "text-text-dim"
          }`}
        >
          <ListIcon />
          <span className="text-[0.6rem]">記事一覧</span>
        </Link>
        <Link
          href="/rewrite"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${
            pathname === "/rewrite" ? "text-accent" : "text-text-dim"
          }`}
        >
          <RefreshIcon />
          <span className="text-[0.6rem]">リライト</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-text-dim"
        >
          <MenuIcon />
          <span className="text-[0.6rem]">メニュー</span>
        </button>
      </div>
    </nav>

    {/* ===== Mobile Slide Menu ===== */}
    {mobileMenuOpen && (
      <div className="fixed inset-0 z-[60] md:hidden">
        <div className="absolute inset-0 bg-[var(--color-backdrop)]" onClick={() => setMobileMenuOpen(false)} />
        <div className="absolute right-0 top-0 bottom-0 w-72 bg-sidebar border-l border-border p-5 overflow-y-auto animate-slideIn">
          <div className="flex items-center justify-between mb-6">
            <span className="font-mono font-bold text-text-bright text-lg">
              Kiji<span className="text-accent">.</span>
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:bg-hover-subtle"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="text-[0.7rem] text-text-dim uppercase tracking-[2px] mb-3 px-2">メイン</div>
          {[
            { href: "/dashboard", label: "新規記事作成", icon: <PlusIcon /> },
            { href: "/articles", label: "記事一覧", icon: <ListIcon /> },
            { href: "/rewrite", label: "リライト", icon: <RefreshIcon /> },
            { href: "/bulk", label: "一括生成", icon: <StackIcon /> },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-1 ${
                pathname === item.href
                  ? "bg-[var(--color-accent-tint)] text-accent"
                  : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="text-[0.7rem] text-text-dim uppercase tracking-[2px] mb-3 mt-6 px-2">ツール</div>
          {[
            { href: "/cooccurrence", label: "共起語チェッカー", icon: <SearchIcon /> },
            { href: "/ranking", label: "順位トラッキング", icon: <ChartIcon /> },
            { href: "/keywords", label: "キーワード提案", icon: <LightbulbIcon /> },
            { href: "/search-console", label: "Search Console", icon: <GSCIcon /> },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-1 ${
                pathname === item.href
                  ? "bg-[var(--color-accent-tint)] text-accent"
                  : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="border-t border-border mt-6 pt-4 space-y-1">
            <button
              onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-text-dim hover:bg-hover-subtle hover:text-text-primary w-full"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              <span>{theme === "dark" ? "ライトモード" : "ダークモード"}</span>
            </button>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm ${
                pathname === "/pricing" ? "text-accent" : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
              }`}
            >
              <CreditCardIcon />
              <span>料金プラン</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm ${
                pathname === "/settings" ? "text-accent" : "text-text-dim hover:bg-hover-subtle hover:text-text-primary"
              }`}
            >
              <SettingsIcon />
              <span>アカウント設定</span>
            </Link>
          </div>

          {session?.user && (
            <div className="border-t border-border mt-4 pt-4">
              <div className="flex items-center gap-2.5 px-2 mb-3">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" className="w-8 h-8 rounded-lg" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-xs font-bold text-on-accent">
                    {session?.user?.name?.[0] || "U"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm text-text-primary truncate">{session?.user?.name || "User"}</div>
                  <div className="text-[0.65rem] text-text-dim truncate">{session?.user?.email}</div>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-dim hover:bg-hover-subtle hover:text-red-400 transition-colors"
              >
                <LogoutIcon />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}

// --- Icons ---
function PlusIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={11} cy={11} r={8} />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 4 4 5-5" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function TokenIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={12} cy={12} r={10} />
      <path d="M12 6v12M8 10h8M8 14h8" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={12} cy={12} r={5} />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={12} cy={12} r={3} />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
    </svg>
  );
}

function GSCIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 20V10M18 20V4M6 20v-4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
