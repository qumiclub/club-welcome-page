"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Edit, Plus } from "lucide-react";

interface Article {
    name: string;
    path: string;
    sha: string;
    download_url: string;
    published?: boolean;
}

export default function Dashboard() {
    const { data: session } = useSession();
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
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
                setError(data.error || "Failed to fetch articles");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (filename: string, sha: string) => {
        if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

        try {
            const res = await fetch(`/api/articles/${filename}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ sha }),
            });

            if (res.ok) {
                setArticles(articles.filter((a) => a.name !== filename));
            } else {
                const data = await res.json();
                alert(`Failed to delete: ${data.error}`);
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const filteredArticles = articles.filter(article =>
        article.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
    const paginatedArticles = filteredArticles.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="mb-4">Please sign in to access the dashboard.</p>
                <button
                    onClick={() => signIn()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Sign In
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        <Plus size={20} />
                        New Article
                    </Link>
                </header>

                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search articles..."
                        className="w-full p-3 border rounded shadow-sm text-gray-700"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1); // Reset to first page on search
                        }}
                    />
                </div>

                {loading ? (
                    <p>Loading articles...</p>
                ) : error ? (
                    <p className="text-red-600">{error}</p>
                ) : (
                    <div className="bg-white rounded shadow overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b">
                                    <th className="p-4 font-semibold text-gray-600">Article Name</th>
                                    <th className="p-4 font-semibold text-gray-600 text-right w-48">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedArticles.map((article) => (
                                    <tr key={article.sha} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-4 text-gray-800 break-all">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {article.name}
                                                {article.published === false && (
                                                    <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full whitespace-nowrap">
                                                        Draft
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 flex justify-end gap-3">
                                            <Link
                                                href={`/edit/${article.name}`}
                                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                                title="Edit"
                                            >
                                                <Edit size={18} />
                                                <span className="hidden sm:inline">Edit</span>
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(article.name, article.sha)}
                                                className="flex items-center gap-1 text-red-600 hover:text-red-800"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                                <span className="hidden sm:inline">Delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedArticles.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="p-8 text-center text-gray-500">
                                            {searchQuery ? 'No articles match your search.' : 'No articles found. Create one!'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 p-4 border-t bg-gray-50">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border rounded bg-white disabled:opacity-50 text-gray-700"
                                >
                                    Previous
                                </button>
                                <span className="text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 border rounded bg-white disabled:opacity-50 text-gray-700"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
