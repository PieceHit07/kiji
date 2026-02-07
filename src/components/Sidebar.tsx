"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const { data: session } = useSession();

  useEffect(() => {
    const saved = localStorage.getItem("kiji-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((d) => { if (d.plan) setUserPlan(d.plan); })
        .catch(() => {});
    }
  }, [session]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("kiji-sidebar-collapsed", String(next));
  };

  return (
    <aside
      className={`bg-[#0c0c14] border-r border-white/[0.06] flex flex-col transition-all duration-300 max-md:hidden relative ${
        collapsed ? "w-16 min-w-[64px] p-3" : "w-56 min-w-[224px] p-5"
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-5 w-6 h-6 rounded-full bg-[#181822] border border-white/[0.1] flex items-center justify-center text-[#6e6e82] hover:text-[#00e5a0] hover:border-[rgba(0,229,160,0.3)] transition-all z-10"
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </button>

      {/* Logo */}
      <Link
        href="/dashboard"
        className={`font-mono font-bold text-[#f0f0f6] tracking-wider mb-6 ${
          collapsed ? "text-base text-center" : "text-xl"
        }`}
      >
        {collapsed ? (
          <span className="text-[#00e5a0]">K</span>
        ) : (
          <>Kiji<span className="text-[#00e5a0]">.</span></>
        )}
      </Link>

      {!collapsed && (
        <div className="text-[0.7rem] text-[#6e6e82] uppercase tracking-[2px] mb-3 px-2">
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
            ? "bg-[rgba(0,229,160,0.1)] text-[#00e5a0]"
            : "text-[#6e6e82] hover:bg-white/[0.03] hover:text-[#d0d0dc]"
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
            ? "bg-[rgba(0,229,160,0.1)] text-[#00e5a0]"
            : "text-[#6e6e82] hover:bg-white/[0.03] hover:text-[#d0d0dc]"
        }`}
      >
        <ListIcon />
        {!collapsed && <span>記事一覧</span>}
      </Link>
      <Link
        href="/rewrite"
        title="リライト"
        className={`flex items-center rounded-lg text-sm ${
          collapsed ? "justify-center px-2 py-2.5 mb-3" : "gap-2.5 px-3 py-2.5 mb-6"
        } ${
          pathname === "/rewrite"
            ? "bg-[rgba(0,229,160,0.1)] text-[#00e5a0]"
            : "text-[#6e6e82] hover:bg-white/[0.03] hover:text-[#d0d0dc]"
        }`}
      >
        <RefreshIcon />
        {!collapsed && <span>リライト</span>}
      </Link>

      {!collapsed && (
        <div className="text-[0.7rem] text-[#6e6e82] uppercase tracking-[2px] mb-3 px-2">
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
            ? "bg-[rgba(0,229,160,0.1)] text-[#00e5a0]"
            : "text-[#6e6e82] hover:bg-white/[0.03] hover:text-[#d0d0dc]"
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
            ? "bg-[rgba(0,229,160,0.1)] text-[#00e5a0]"
            : "text-[#6e6e82] hover:bg-white/[0.03] hover:text-[#d0d0dc]"
        }`}
      >
        <ChartIcon />
        {!collapsed && <span>順位トラッキング</span>}
      </Link>

      <div className="flex-1" />

      {/* Pricing Link */}
      <Link
        href="/pricing"
        title="料金プラン"
        className={`flex items-center rounded-lg text-sm mb-4 ${
          collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
        } ${
          pathname === "/pricing"
            ? "bg-[rgba(0,229,160,0.1)] text-[#00e5a0]"
            : "text-[#6e6e82] hover:bg-white/[0.03] hover:text-[#d0d0dc]"
        }`}
      >
        <CreditCardIcon />
        {!collapsed && <span>料金プラン</span>}
      </Link>

      {session?.user && (
        <div className={`pt-4 border-t border-white/[0.06] ${collapsed ? "" : "space-y-2"}`}>
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00e5a0] to-[#00c4ff] flex items-center justify-center text-xs font-bold text-[#08080d] flex-shrink-0">
                {session.user.name?.[0] || "U"}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-[#d0d0dc] truncate">
                    {session.user.name || "User"}
                  </span>
                  <span
                    className={`text-[0.6rem] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                      userPlan === "business"
                        ? "bg-[#ffaa2c]/15 text-[#ffaa2c]"
                        : userPlan === "pro"
                        ? "bg-[#00e5a0]/15 text-[#00e5a0]"
                        : "bg-white/[0.06] text-[#6e6e82]"
                    }`}
                  >
                    {userPlan === "business" ? "Business" : userPlan === "pro" ? "Pro" : "Free"}
                  </span>
                </div>
                <div className="text-[0.65rem] text-[#6e6e82] truncate">
                  {session.user.email}
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#6e6e82] hover:bg-white/[0.03] hover:text-red-400 transition-colors"
            >
              <LogoutIcon />
              ログアウト
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="ログアウト"
              className="w-full flex justify-center py-2 text-[#6e6e82] hover:text-red-400 transition-colors"
            >
              <LogoutIcon />
            </button>
          )}
        </div>
      )}
    </aside>
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

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
