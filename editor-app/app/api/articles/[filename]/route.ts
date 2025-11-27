import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";

import matter from "gray-matter";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);

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
        return NextResponse.json({ error: error.message }, { status: 500 });
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
