import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";
import { requireEditorSession } from "@/lib/apiAuth";
import { isValidFilename } from "@/lib/filename";

import matter from "gray-matter";


// セキュリティ: エラーメッセージを安全化
function getSafeErrorMessage(error: unknown): string {
    if (process.env.NODE_ENV === 'production') {
        return "An internal error occurred";
    }
    return error instanceof Error ? error.message : String(error);
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { session, response } = await requireEditorSession();
    if (!session) return response!;

    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);

    // セキュリティ: ファイル名検証
    if (!isValidFilename(decodedFilename)) {
        return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!owner || !repo) return NextResponse.json({ error: "Config missing" }, { status: 500 });

    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: `_posts/${decodedFilename}`,
        });

        if (Array.isArray(data) || !('content' in data)) {
            return NextResponse.json({ error: "File not found or is a directory" }, { status: 404 });
        }

        const rawContent = Buffer.from(data.content, "base64").toString("utf-8");
        const { data: frontmatter, content } = matter(rawContent);

        // gray-matter は YAML の日付を Date オブジェクトとしてパースすることがあるため、
        // フォームの <input type="date"> が扱える YYYY-MM-DD 文字列へ正規化する。
        // これを怠ると編集時に date が失われ、保存し直すと日付が今日にリセットされてしまう。
        const rawDate = frontmatter.date;
        const normalizedDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : "";

        return NextResponse.json({
            title: frontmatter.title || "",
            author: frontmatter.author || "",
            tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : String(frontmatter.tags || ""),
            date: normalizedDate,
            thumbnail: frontmatter.thumbnail || "",
            content: content,
            sha: data.sha
        });
    } catch (error: unknown) {
        console.error(error);
        return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { session, response } = await requireEditorSession();
    if (!session) return response!;

    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);

    // セキュリティ: ファイル名検証
    if (!isValidFilename(decodedFilename)) {
        return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const { sha } = await req.json(); // Need SHA to delete

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!owner || !repo) return NextResponse.json({ error: "Config missing" }, { status: 500 });

    try {
        await octokit.repos.deleteFile({
            owner,
            repo,
            path: `_posts/${decodedFilename}`,
            message: `Delete article ${decodedFilename} by ${session.user?.email}`,
            sha,
            committer: {
                name: session.user?.name || "Editor App",
                email: session.user?.email || "editor@example.com",
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error(error);
        return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }
}
