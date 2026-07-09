/**
 * `_posts/` 配下のファイル名として安全かどうかを検証する。
 * パストラバーサル（`..`, `/`, `\`）を防ぎ、Jekyll の記事ファイルとして
 * 許容する文字（英数字・日本語・ハイフン・アンダースコア・ドット）のみ許可する。
 *
 * `api/articles/[filename]` (取得・削除) と `api/commit` (更新パス) の両方で共有する。
 */
export function isValidFilename(filename: string): boolean {
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return false;
    }
    if (!filename.endsWith(".md")) {
        return false;
    }
    // 　-〿: 日本語記号 / ぀-ゟ: ひらがな / ゠-ヿ: カタカナ / 一-龯: 漢字
    const validPattern = /^[\w　-〿぀-ゟ゠-ヿ一-龯\-_.]+$/;
    return validPattern.test(filename);
}
