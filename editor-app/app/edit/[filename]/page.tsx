"use client";

import Editor from "@/components/Editor";
import { use, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import matter from "gray-matter";

export default function EditPage({ params }: { params: Promise<{ filename: string }> }) {
    const { data: session } = useSession();
    const { filename } = use(params);

    const [initialData, setInitialData] = useState<{
        title: string;
        author: string;
        tags: string;
        content: string;
        sha: string;
        filename: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (session && filename) {
            fetchArticle();
        }
    }, [session, filename]);

    const fetchArticle = async () => {
        try {
            const res = await fetch(`/api/articles/${filename}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch article");
            }

            // Parse frontmatter
            const { data: frontmatter, content } = matter(data.content);

            setInitialData({
                title: frontmatter.title || "",
                author: frontmatter.author || "",
                tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.join(", ") : String(frontmatter.tags || ""),
                content: content,
                sha: data.sha,
                filename: filename,
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <button onClick={() => signIn()} className="px-4 py-2 bg-blue-600 text-white rounded">
                    Sign In
                </button>
            </div>
        );
    }

    if (loading) return <div className="p-8">Loading...</div>;
    if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

    return <Editor initialData={initialData} />;
}
