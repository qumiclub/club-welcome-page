import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
    });

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!owner || !repo) {
        return NextResponse.json({ error: "GitHub configuration missing" }, { status: 500 });
    }

    try {
        // List files in _posts directory
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: "_posts",
        });

        if (!Array.isArray(data)) {
            return NextResponse.json({ articles: [] });
        }

        // Filter for markdown files
        const articles = data
            .filter((file) => file.name.endsWith(".md"))
            .map((file) => ({
                name: file.name,
                path: file.path,
                sha: file.sha,
                download_url: file.download_url,
            }))
            .reverse(); // Newest first (usually)

        return NextResponse.json({ articles });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
