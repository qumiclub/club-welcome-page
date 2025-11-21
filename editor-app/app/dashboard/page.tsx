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
}

export default function Dashboard() {
    const { data: session } = useSession();
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                                    <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {articles.map((article) => (
                                    <tr key={article.sha} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-4 text-gray-800">{article.name}</td>
                                        <td className="p-4 flex justify-end gap-3">
                                            <Link
                                                href={`/edit/${article.name}`}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Edit"
                                            >
                                                <Edit size={20} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(article.name, article.sha)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Delete"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {articles.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="p-8 text-center text-gray-500">
                                            No articles found. Create one!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
