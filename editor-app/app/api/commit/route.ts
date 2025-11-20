import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Octokit } from "@octokit/rest";
import matter from "gray-matter";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { title, author, tags, content } = await req.json();

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
        }

        // Create frontmatter
        const fileContent = matter.stringify(content, {
            layout: "article",
            title,
            author,
            tags,
            date: new Date().toISOString(), // Or just YYYY-MM-DD
        });

        // Initialize Octokit
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });

        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;

        if (!owner || !repo) {
            return NextResponse.json({ error: "GitHub configuration missing" }, { status: 500 });
        }

        // Generate filename from date and title
        const dateStr = new Date().toISOString().split('T')[0];
        const safeTitle = title.replace(/[^a-z0-9\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\-_]/gi, '-');
        const path = `_posts/${dateStr}-${safeTitle}.md`;

        // Commit to GitHub
        // First, check if file exists (to get sha for update, though we probably want to create new)
        // For simplicity, we assume creating new file. If exists, it will fail or we can handle update.
        // Let's try to create/update.

        let sha;
        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path,
            });
            if (!Array.isArray(data)) {
                sha = data.sha;
            }
        } catch (e) {
            // File doesn't exist, which is fine
        }

        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `Add article: ${title} by ${session.user?.email}`,
            content: Buffer.from(fileContent).toString('base64'),
            sha,
            committer: {
                name: session.user?.name || "Editor App",
                email: session.user?.email || "editor@example.com",
            },
        });

        return NextResponse.json({ success: true, path });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
