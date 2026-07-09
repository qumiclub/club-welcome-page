"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { PenSquare, LayoutDashboard, LogOut } from "lucide-react";

interface AppHeaderProps {
    userEmail?: string | null;
    /** ページ固有のアクション（例: Editorの「画像管理」ボタン）を差し込むスロット。 */
    children?: React.ReactNode;
}

const NAV_ITEMS = [
    { href: "/", label: "新規作成", icon: PenSquare },
    { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
];

/** Editor / Dashboard 共通のsticky白ヘッダー。ブランドマーク・ナビ・サインアウトを持つ。 */
export function AppHeader({ userEmail, children }: AppHeaderProps) {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-40 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-ink">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm text-white">
                        情
                    </span>
                    <span className="hidden sm:inline">情報研 記事エディタ</span>
                </Link>
                <nav className="flex items-center gap-1 text-sm font-semibold">
                    {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-1.5 rounded px-2 py-1.5 transition-colors ${isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-ink"
                                    }`}
                            >
                                <Icon size={16} />
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="flex items-center gap-3">
                {children}
                {userEmail && <span className="hidden text-sm text-slate-500 md:inline">{userEmail}</span>}
                <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-red-600"
                >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">ログアウト</span>
                </button>
            </div>
        </header>
    );
}
