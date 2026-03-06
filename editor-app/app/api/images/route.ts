import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";

// セキュリティ: エラーメッセージを安全化
function getSafeErrorMessage(error: any): string {
    if (process.env.NODE_ENV === 'production') {
        return "An internal error occurred";
    }
    return error?.message || "Unknown error";
}

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
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: "assets/images",
        });

        if (!Array.isArray(data)) {
            return NextResponse.json({ images: [] });
        }

        const images = data
            .filter((file) => file.type === "file" && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name))
            .map((file) => ({
                name: file.name,
                path: file.path,
                download_url: file.download_url,
                url: `/${file.path}`, // Relative path for Jekyll
            }));

        // Sort by name (newest might be better if we had dates, but name usually contains timestamp)
        images.reverse();

        return NextResponse.json({ images });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }
}

