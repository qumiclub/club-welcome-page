import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Octokit } from "@octokit/rest";
import matter from "gray-matter";
import { NextResponse } from "next/server";

// セキュリティ: エラーメッセージを安全化
function getSafeErrorMessage(error: any): string {
    if (process.env.NODE_ENV === 'production') {
        return "An internal error occurred";
    }
    return error?.message || "Unknown error";
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { title, author, tags, content, sha, filename, published, date, thumbnail } = await req.json();

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
        }

        // Create frontmatter
        const frontmatter: any = {
            layout: "article",
            title,
            author,
            tags,
            date: date || new Date().toISOString(),
        };

        if (thumbnail) {
            frontmatter.thumbnail = thumbnail;
        }

        // Only add published: false if explicitly set to false (Draft)
        // If true or undefined, we omit it (defaults to true in Jekyll) or set to true
        if (published === false) {
            frontmatter.published = false;
        }

        const fileContent = matter.stringify(content, frontmatter);

        // Initialize Octokit
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });

        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;

        if (!owner || !repo) {
            return NextResponse.json({ error: "GitHub configuration missing" }, { status: 500 });
        }

        // Determine path
        let path = "";
        if (filename) {
            // Updating existing file
            path = `_posts/${filename}`;
        } else {
            // Creating new file
            const dateStr = new Date().toISOString().split('T')[0];
            const safeTitle = title.replace(/[^a-z0-9\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\-_]/gi, '-');
            path = `_posts/${dateStr}-${safeTitle}.md`;
        }

        // Commit to GitHub
        const response = await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `${filename ? 'Update' : 'Add'} article: ${title} by ${session.user?.email}`,
            content: Buffer.from(fileContent).toString('base64'),
            sha, // Required for updates
            committer: {
                name: session.user?.name || "Editor App",
                email: session.user?.email || "editor@example.com",
            },
        });

        return NextResponse.json({ success: true, path, sha: response.data.content?.sha });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }
}

