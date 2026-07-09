const DEFAULT_REPO = "club-welcome-page";

/**
 * Markdown内の画像 src を、プレビューで実際に表示できる URL に変換する。
 *
 * - Jekyll の `{{ site.baseurl }}` プレースホルダーを除去する
 * - `/assets/images/...` のようなリポジトリ相対パスは、環境変数
 *   `NEXT_PUBLIC_GITHUB_OWNER` / `NEXT_PUBLIC_GITHUB_REPO` から組み立てた
 *   GitHub Raw の絶対URLに書き換える
 *
 * owner が未設定の場合は組織名のハードコードを避けるため変換をスキップし、
 * 相対パスのまま返す（Next.js アプリ単体では表示できないが、誤ったリポジトリを
 * 決め打ちするより安全）。
 */
export function resolveImageSrc(src: string | undefined | null): string {
    if (!src) return "";

    let resolved = src.replace(/\{\{\s*site\.baseurl\s*\}\}/g, "");

    if (resolved.startsWith("/assets/images/")) {
        const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
        const repo = process.env.NEXT_PUBLIC_GITHUB_REPO || DEFAULT_REPO;
        if (owner) {
            resolved = `https://raw.githubusercontent.com/${owner}/${repo}/main${resolved}`;
        }
    }

    return resolved;
}
