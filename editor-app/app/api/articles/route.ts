import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";
import matter from "gray-matter";

export const dynamic = 'force-dynamic';

// セキュリティ: エラーメッセージを安全化
function getSafeErrorMessage(error: any): string {
    if (process.env.NODE_ENV === 'production') {
        return "An internal error occurred";
    }
    return error?.message || "Unknown error";
}

export async function GET(req: Request) {
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
        const markdownFiles = data.filter(file => file.name.endsWith(".md"));

        // Fetch all contents in parallel
        const articles = await Promise.all(markdownFiles.map(async (file) => {
            try {
                const decodedName = decodeURIComponent(file.name);
                const decodedPath = decodeURIComponent(file.path);

                if (file.download_url) {
                    const contentRes = await fetch(file.download_url);
                    const contentText = await contentRes.text();
                    const { data: frontmatter } = matter(contentText);

                    return {
                        name: decodedName,
                        path: decodedPath,
                        sha: file.sha,
                        download_url: file.download_url,
                        title: frontmatter.title,
                        tags: frontmatter.tags,
                        author: frontmatter.author,
                        date: frontmatter.date,
                        thumbnail: frontmatter.thumbnail,
                        published: frontmatter.published !== false
                    };
                }
                return {
                    name: decodedName,
                    path: decodedPath,
                    sha: file.sha,
                    download_url: file.download_url,
                };
            } catch (e) {
                console.error(`Failed to fetch content for ${file.name}`, e);
                return {
                    name: decodeURIComponent(file.name),
                    path: decodeURIComponent(file.path),
                    sha: file.sha,
                    download_url: file.download_url,
                };
            }
        }));

        // Extract all unique tags and authors
        const allTags = new Set<string>();
        const allAuthors = new Set<string>();

        articles.forEach((article: any) => {
            if (article.tags) {
                const tags = Array.isArray(article.tags)
                    ? article.tags
                    : String(article.tags).split(',').map(t => t.trim());

                tags.forEach((tag: any) => {
                    if (tag) allTags.add(String(tag));
                });
            }
            if (article.author) {
                allAuthors.add(String(article.author));
            }
        });

        // Sort by date (newest first) or filename if date is missing
        articles.sort((a: any, b: any) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            if (dateA !== dateB) return dateB - dateA;
            return b.name.localeCompare(a.name);
        });

        return NextResponse.json({
            articles,
            tags: Array.from(allTags),
            authors: Array.from(allAuthors)
        });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }
}

