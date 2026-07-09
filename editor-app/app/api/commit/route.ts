import { Octokit } from "@octokit/rest";
import matter from "gray-matter";
import { NextResponse } from "next/server";
import { requireEditorSession } from "@/lib/apiAuth";
import { isValidFilename } from "@/lib/filename";

// セキュリティ: エラーメッセージを安全化
function getSafeErrorMessage(error: unknown): string {
    if (process.env.NODE_ENV === 'production') {
        return "An internal error occurred";
    }
    return error instanceof Error ? error.message : String(error);
}

interface ArticleFrontmatter {
    layout: string;
    title: string;
    author: string;
    tags: unknown;
    date: string;
    thumbnail?: string;
    published?: false;
}

/**
 * 新規記事のファイルパスが既存ファイルと衝突していないか確認し、衝突していれば
 * `-2`, `-3`, ... `-10` のサフィックスを付けて空いているパスを探す。
 * （同日に同じタイトルの記事を作ると、常に同じファイル名になり上書き事故が起きていたため）
 */
async function findAvailablePath(
    octokit: Octokit,
    owner: string,
    repo: string,
    basePath: string
): Promise<string> {
    const exists = async (path: string): Promise<boolean> => {
        try {
            await octokit.repos.getContent({ owner, repo, path });
            return true;
        } catch (error: unknown) {
            const status = (error as { status?: number } | null)?.status;
            if (status === 404) return false;
            throw error;
        }
    };

    if (!(await exists(basePath))) {
        return basePath;
    }

    const withoutExt = basePath.slice(0, -3); // ".md" を除去
    for (let i = 2; i <= 10; i++) {
        const candidate = `${withoutExt}-${i}.md`;
        if (!(await exists(candidate))) {
            return candidate;
        }
    }

    // 10件まで衝突するのは通常起こり得ないが、念のためタイムスタンプでフォールバック
    return `${withoutExt}-${Date.now()}.md`;
}

export async function POST(req: Request) {
    const { session, response } = await requireEditorSession();
    if (!session) return response!;

    try {
        const { title, author, tags, content, sha, filename, published, date, thumbnail } = await req.json();

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
        }

        // Create frontmatter
        const frontmatter: ArticleFrontmatter = {
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
            // デコードして二重エンコードを防止
            let decodedFilename: string;
            try {
                decodedFilename = decodeURIComponent(filename);
            } catch {
                decodedFilename = filename;
            }

            // セキュリティ: 更新パスにもファイル名検証を適用（パストラバーサル封じ）。
            // 新規作成パスにはこの検証が無かった一方、更新パスはユーザー入力のfilenameを
            // そのままGitHubパスへ埋め込んでいたため抜け穴になっていた。
            if (!isValidFilename(decodedFilename)) {
                return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
            }

            path = `_posts/${decodedFilename}`;
        } else {
            // Creating new file: フォームの日付をファイル名の日付プレフィックスに使う。
            // 以前は常に「今日」の日付が使われており、フォームでdateを過去/未来に
            // 変更してもファイル名（ひいてはJekyllの公開日判定）に反映されなかった。
            const validDatePattern = /^\d{4}-\d{2}-\d{2}$/;
            const dateStr =
                typeof date === "string" && validDatePattern.test(date)
                    ? date
                    : new Date().toISOString().split('T')[0];
            const safeTitle = title.replace(/[^a-z0-9\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\-_]/gi, '-');
            const basePath = `_posts/${dateStr}-${safeTitle}.md`;

            // 同日・同タイトルのファイル名衝突（上書き事故）を防ぐため、既存ファイルの有無を
            // 確認しながら -2, -3, ... -10 のサフィックスでデデュープする。
            path = await findAvailablePath(octokit, owner, repo, basePath);
        }

        // Commit to GitHub
        const commitResult = await octokit.repos.createOrUpdateFileContents({
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

        return NextResponse.json({ success: true, path, sha: commitResult.data.content?.sha });
    } catch (error: unknown) {
        console.error(error);
        return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }
}

