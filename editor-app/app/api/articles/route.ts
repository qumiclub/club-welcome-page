import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";
import matter from "gray-matter";

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

        // Filter for markdown files and extract tags and authors
        const articles = [];
        const allTags = new Set<string>();
        const allAuthors = new Set<string>();

        for (const file of data) {
            if (file.name.endsWith(".md")) {
                // Fetch file content to parse frontmatter
                // Note: This might be slow if there are many files. 
                // For a small club site, it's acceptable.
                // We need to fetch content to get tags.
                // Using download_url to fetch raw content
                try {
                    if (file.download_url) {
                        const contentRes = await fetch(file.download_url);
                        const contentText = await contentRes.text();
                        const { data: frontmatter } = matter(contentText);

                        if (frontmatter.tags) {
                            const tags = Array.isArray(frontmatter.tags)
                                ? frontmatter.tags
                                : String(frontmatter.tags).split(',').map(t => t.trim());

                            tags.forEach((tag: any) => {
                                if (tag) allTags.add(String(tag));
                            });
                        }

                        if (frontmatter.author) {
                            allAuthors.add(String(frontmatter.author));
                        }

                        articles.push({
                            name: file.name,
                            path: file.path,
                            sha: file.sha,
                            download_url: file.download_url,
                            // Include frontmatter data if needed for listing
                            title: frontmatter.title,
                            tags: frontmatter.tags,
                            author: frontmatter.author
                        });
                    } else {
                        articles.push({
                            name: file.name,
                            path: file.path,
                            sha: file.sha,
                            download_url: file.download_url,
                        });
                    }
                } catch (e) {
                    console.error(`Failed to fetch content for ${file.name}`, e);
                    // Still add the file even if parsing fails
                    articles.push({
                        name: file.name,
                        path: file.path,
                        sha: file.sha,
                        download_url: file.download_url,
                    });
                }
            }
        }

        articles.reverse(); // Newest first

        return NextResponse.json({
            articles,
            tags: Array.from(allTags),
            authors: Array.from(allAuthors)
        });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
