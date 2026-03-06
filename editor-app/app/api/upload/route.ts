import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";

// セキュリティ: 許可するMIMEタイプ
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
];

// セキュリティ: ファイルサイズ制限 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // セキュリティ: MIMEタイプ検証
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({
                error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG"
            }, { status: 400 });
        }

        // セキュリティ: ファイルサイズ検証
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({
                error: "File too large. Maximum size: 5MB"
            }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const content = buffer.toString("base64");

        const timestamp = new Date().getTime();
        const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        const path = `assets/images/${filename}`;

        // Initialize Octokit
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });

        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;

        if (!owner || !repo) {
            return NextResponse.json({ error: "GitHub configuration missing" }, { status: 500 });
        }

        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `Upload image: ${filename} by ${session.user?.email}`,
            content,
            committer: {
                name: session.user?.name || "Editor App",
                email: session.user?.email || "editor@example.com",
            },
        });

        // Return the relative path for Jekyll
        return NextResponse.json({ url: `/assets/images/${filename}` });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }
}
