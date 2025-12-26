import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";

import matter from "gray-matter";

// セキュリティ: 安全なファイル名検証
function isValidFilename(filename: string): boolean {
    // Path Traversal防止: .. や / を含む場合は拒否
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return false;
    }
    // .md で終わる必要がある
    if (!filename.endsWith('.md')) {
        return false;
    }
    // 許可する文字: 英数字、日本語、ハイフン、アンダースコア、ドット
    const validPattern = /^[\w\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\-_.]+$/;
    return validPattern.test(filename);
}

// セキュリティ: エラーメッセージを安全化
function getSafeErrorMessage(error: any): string {
    if (process.env.NODE_ENV === 'production') {
        return "An internal error occurred";
    }
    return error?.message || "Unknown error";
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

        return NextResponse.json({
            title: frontmatter.title || "",
            author: frontmatter.author || "",
            tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : String(frontmatter.tags || ""),
            content: content,
            sha: data.sha
        });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }
}
