"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2, Pencil, Plus, Loader2, ArrowUpDown, Search } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { AppHeader } from "@/components/AppHeader";
import { SignInPrompt } from "@/components/SignInPrompt";

interface Article {
    name: string;
    path: string;
    sha: string;
    download_url: string;
    title?: string;
    author?: string;
    date?: string;
    tags?: string[] | string;
    thumbnail?: string;
    published?: boolean;
}

function toTagList(tags?: string[] | string): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
    return String(tags).split(",").map((t) => t.trim()).filter(Boolean);
}

function formatDate(date?: string): string {
    if (!date) return "-";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toISOString().split("T")[0];
}

function ArticleListSkeleton() {
    return (
        <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b bg-slate-50 p-4">
                <Skeleton className="h-4 w-32" />
            </div>
            <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4">
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex gap-3">
                            <Skeleton className="h-4 w-10" />
                            <Skeleton className="h-4 w-14" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { data: session } = useSession();
    const toast = useToast();
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingDelete, setPendingDelete] = useState<Article | null>(null);
    const [deletingName, setDeletingName] = useState<string | null>(null);
    const itemsPerPage = 10;

    useEffect(() => {
        if (session) {
            fetchArticles();
        }
    }, [session]);

    const fetchArticles = async () => {
        try {
            const res = await fetch("/api/articles");
            const data = await res.json();
            if (res.ok) {
                setArticles(data.articles);
            } else {
                setError(data.error || "記事の取得に失敗しました");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        const { name: filename, sha } = pendingDelete;
        setPendingDelete(null);
        setDeletingName(filename);

        try {
            const res = await fetch(`/api/articles/${filename}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ sha }),
            });

            if (res.ok) {
                setArticles((prev) => prev.filter((a) => a.name !== filename));
                toast.success(`「${filename}」を削除しました。`);
            } else {
                const data = await res.json();
                toast.error(`削除に失敗しました: ${data.error}`);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            toast.error(`エラー: ${message}`);
        } finally {
            setDeletingName(null);
        }
    };

    const filteredArticles = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        let list = articles;

        if (query) {
            list = list.filter((article) => {
                const tagList = toTagList(article.tags);
                const haystack = [article.name, article.title, article.author, ...tagList]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(query);
            });
        }

        return [...list].sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            if (dateA !== dateB) {
                return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
            }
            return sortOrder === "newest" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
        });
    }, [articles, searchQuery, sortOrder]);

    const totalPages = Math.max(1, Math.ceil(filteredArticles.length / itemsPerPage));
    const paginatedArticles = filteredArticles.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (!session) {
        return <SignInPrompt message="ダッシュボードを利用するにはログインが必要です。" />;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <AppHeader userEmail={session.user?.email} />

            <div className="mx-auto max-w-5xl p-4 sm:p-8">
                <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold text-ink sm:text-3xl">ダッシュボード</h1>
                    <Link
                        href="/"
                        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-white shadow-sm hover:bg-primary-dark"
                    >
                        <Plus size={20} />
                        新規作成
                    </Link>
                </header>

                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search
                            size={18}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="タイトル・著者・タグで検索..."
                            className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
                            setCurrentPage(1);
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                    >
                        <ArrowUpDown size={16} />
                        {sortOrder === "newest" ? "新しい順" : "古い順"}
                    </button>
                </div>

                {loading ? (
                    <ArticleListSkeleton />
                ) : error ? (
                    <p className="text-red-600">{error}</p>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden overflow-hidden rounded-lg bg-white shadow md:block">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b bg-slate-50 text-sm text-slate-500">
                                        <th className="p-4 font-semibold">タイトル</th>
                                        <th className="p-4 font-semibold">著者</th>
                                        <th className="p-4 font-semibold">日付</th>
                                        <th className="p-4 font-semibold">タグ</th>
                                        <th className="p-4 font-semibold text-right" style={{ width: "120px" }}>
                                            操作
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedArticles.map((article) => {
                                        const isDeleting = deletingName === article.name;
                                        const tagList = toTagList(article.tags);
                                        return (
                                            <tr key={article.sha} className="border-b last:border-0 hover:bg-slate-50">
                                                <td className="p-4 text-ink">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium" title={article.title || article.name}>
                                                            {article.title || article.name}
                                                        </span>
                                                        {article.published === false && (
                                                            <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                                                下書き
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-slate-600">{article.author || "-"}</td>
                                                <td className="p-4 font-mono text-sm text-slate-500">
                                                    {formatDate(article.date)}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {tagList.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="rounded-full bg-[#ccfbf1] px-2 py-0.5 text-xs font-medium text-[#0f766e]"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-end gap-3">
                                                        <Link
                                                            href={`/edit/${encodeURIComponent(article.name)}`}
                                                            className={`flex items-center gap-1 text-primary hover:text-primary-dark ${isDeleting ? "pointer-events-none opacity-50" : ""
                                                                }`}
                                                            title="編集"
                                                        >
                                                            <Pencil size={18} />
                                                        </Link>
                                                        <button
                                                            onClick={() => setPendingDelete(article)}
                                                            disabled={isDeleting}
                                                            className="flex items-center gap-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                                                            title="削除"
                                                        >
                                                            {isDeleting ? (
                                                                <Loader2 size={18} className="animate-spin" />
                                                            ) : (
                                                                <Trash2 size={18} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {paginatedArticles.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500">
                                                {searchQuery
                                                    ? "検索条件に一致する記事がありません。"
                                                    : "記事がありません。作成してみましょう！"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile card list */}
                        <div className="flex flex-col gap-3 md:hidden">
                            {paginatedArticles.map((article) => {
                                const isDeleting = deletingName === article.name;
                                const tagList = toTagList(article.tags);
                                return (
                                    <div key={article.sha} className="rounded-lg bg-white p-4 shadow">
                                        <div className="mb-2 flex items-start justify-between gap-2">
                                            <span className="font-semibold text-ink" title={article.title || article.name}>
                                                {article.title || article.name}
                                            </span>
                                            {article.published === false && (
                                                <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                                    下書き
                                                </span>
                                            )}
                                        </div>
                                        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                                            {article.author && <span>{article.author}</span>}
                                            <span className="font-mono">{formatDate(article.date)}</span>
                                        </div>
                                        {tagList.length > 0 && (
                                            <div className="mb-3 flex flex-wrap gap-1">
                                                {tagList.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="rounded-full bg-[#ccfbf1] px-2 py-0.5 text-xs font-medium text-[#0f766e]"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4 border-t pt-3">
                                            <Link
                                                href={`/edit/${encodeURIComponent(article.name)}`}
                                                className={`flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark ${isDeleting ? "pointer-events-none opacity-50" : ""
                                                    }`}
                                            >
                                                <Pencil size={16} />
                                                編集
                                            </Link>
                                            <button
                                                onClick={() => setPendingDelete(article)}
                                                disabled={isDeleting}
                                                className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                                            >
                                                {isDeleting ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {paginatedArticles.length === 0 && (
                                <p className="rounded-lg bg-white p-8 text-center text-slate-500 shadow">
                                    {searchQuery
                                        ? "検索条件に一致する記事がありません。"
                                        : "記事がありません。作成してみましょう！"}
                                </p>
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="mt-4 flex items-center justify-center gap-4 rounded-lg bg-white p-4 shadow">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="rounded border px-3 py-1 text-slate-700 disabled:opacity-50"
                                >
                                    前へ
                                </button>
                                <span className="text-sm text-slate-600">
                                    {currentPage} / {totalPages} ページ
                                </span>
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="rounded border px-3 py-1 text-slate-700 disabled:opacity-50"
                                >
                                    次へ
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <ConfirmDialog
                open={!!pendingDelete}
                variant="danger"
                title="記事を削除"
                message={
                    pendingDelete
                        ? `「${pendingDelete.title || pendingDelete.name}」を削除しますか？この操作は取り消せません。`
                        : ""
                }
                confirmLabel="削除する"
                cancelLabel="キャンセル"
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
