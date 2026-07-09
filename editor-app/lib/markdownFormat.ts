/**
 * Markdownツールバー（components/editor/MarkdownToolbar.tsx）とキーボードショートカット
 * (Editor.tsx) が共有する、選択範囲を扱う純粋関数群。
 *
 * すべての関数は `{ value, selStart, selEnd }` を返す。呼び出し側は value をテキストエリアに
 * 反映した後、次のフレームで selStart/selEnd を `setSelectionRange` に渡してカーソル位置を復元する
 * （React の再レンダー後でないと selectionRange が効かないため、呼び出し側で
 * `requestAnimationFrame` を挟む）。
 */

export interface FormatResult {
    value: string;
    selStart: number;
    selEnd: number;
}

export type FormatFn = (value: string, start: number, end: number) => FormatResult;

/** 選択範囲を before/after のマーカーで囲む（例: 太字 `**text**`）。選択が無ければマーカー間にカーソルを置く。 */
export function wrapSelection(
    value: string,
    start: number,
    end: number,
    before: string,
    after: string = before
): FormatResult {
    const selected = value.slice(start, end);
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);

    if (selected.length === 0) {
        const caret = start + before.length;
        return { value: newValue, selStart: caret, selEnd: caret };
    }

    return {
        value: newValue,
        selStart: start + before.length,
        selEnd: start + before.length + selected.length,
    };
}

/** 選択範囲を含む行全体を、行頭に prefix を付けた形へ書き換える（見出し・箇条書き・引用など）。 */
export function prefixLines(value: string, start: number, end: number, prefix: string): FormatResult {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = value.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = value.length;

    const block = value.slice(lineStart, lineEnd);
    const prefixed = block
        .split("\n")
        .map((line) => prefix + line)
        .join("\n");

    const newValue = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
    return { value: newValue, selStart: lineStart, selEnd: lineStart + prefixed.length };
}

/** 選択範囲を含む行全体に連番（`1. `, `2. `, ...）を振る（順序付きリスト用）。 */
export function prefixLinesOrdered(value: string, start: number, end: number): FormatResult {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = value.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = value.length;

    const block = value.slice(lineStart, lineEnd);
    const prefixed = block
        .split("\n")
        .map((line, i) => `${i + 1}. ${line}`)
        .join("\n");

    const newValue = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
    return { value: newValue, selStart: lineStart, selEnd: lineStart + prefixed.length };
}

/** リンク記法 `[label](https://)` を挿入する。選択テキストがあればラベルとして使う。 */
export function insertLink(value: string, start: number, end: number): FormatResult {
    const selected = value.slice(start, end) || "リンクテキスト";
    const urlPlaceholder = "https://";
    const insertText = `[${selected}](${urlPlaceholder})`;
    const newValue = value.slice(0, start) + insertText + value.slice(end);

    // URL部分を選択状態にして、そのまま貼り付け/入力できるようにする。
    const urlStart = start + 1 + selected.length + 2; // `[` + selected + `](`
    const urlEnd = urlStart + urlPlaceholder.length;
    return { value: newValue, selStart: urlStart, selEnd: urlEnd };
}

/** フェンス付きコードブロックを挿入する。選択テキストがあればコード本体として使う。 */
export function insertCodeBlock(value: string, start: number, end: number): FormatResult {
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const needsLeadingNewline = before.length > 0 && !before.endsWith("\n");
    const prefix = `${needsLeadingNewline ? "\n" : ""}\`\`\`\n`;
    const suffix = "\n```\n";

    const newValue = before + prefix + selected + suffix + value.slice(end);
    const codeStart = before.length + prefix.length;
    const codeEnd = codeStart + selected.length;
    return { value: newValue, selStart: codeStart, selEnd: codeEnd };
}
