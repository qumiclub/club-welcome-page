"use client";

import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });
import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/Skeleton";
import { SignInPrompt } from "@/components/SignInPrompt";

function EditorSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-8 w-56" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-7 w-28" />
                    <Skeleton className="h-7 w-20" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                    <div className="bg-white p-4 rounded shadow space-y-2">
                        <Skeleton className="h-9 w-full" />
                        <div className="flex gap-2">
                            <Skeleton className="h-9 flex-1" />
                            <Skeleton className="h-9 flex-1" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-14 flex-1" />
                        <Skeleton className="h-14 flex-[2]" />
                    </div>
                    <Skeleton className="h-64 w-full" />
                    <div className="flex gap-2">
                        <Skeleton className="h-12 flex-1" />
                        <Skeleton className="h-12 flex-1" />
                    </div>
                </div>
                <Skeleton className="h-[28rem] w-full lg:h-full" />
            </div>
        </div>
    );
}

export default function EditPage({ params }: { params: Promise<{ filename: string }> }) {
    const { data: session } = useSession();
    const { filename: rawFilename } = use(params);
    const filename = decodeURIComponent(rawFilename);

    const [initialData, setInitialData] = useState<{
        title: string;
        author: string;
        tags: string;
        content: string;
        sha: string;
        filename: string;
        date: string;
        thumbnail: string;
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

            setInitialData({
                title: data.title || "",
                author: data.author || "",
                tags: Array.isArray(data.tags) ? data.tags.join(", ") : String(data.tags || ""),
                content: data.content,
                sha: data.sha,
                filename: filename,
                date: data.date || "",
                thumbnail: data.thumbnail || "",
            });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return <SignInPrompt message="記事を編集するにはログインが必要です。" />;
    }

    if (loading) return <EditorSkeleton />;
    if (error) return <div className="p-8 text-red-600">エラー: {error}</div>;

    return <Editor initialData={initialData} />;
}
