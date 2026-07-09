"use client";

import React from "react";
import { Bold, Italic, Heading2, List, ListOrdered, Link2, Code, Quote, ImagePlus } from "lucide-react";
import {
    wrapSelection,
    prefixLines,
    prefixLinesOrdered,
    insertLink,
    insertCodeBlock,
} from "@/lib/markdownFormat";
import type { FormatFn } from "@/lib/markdownFormat";

interface MarkdownToolbarProps {
    /** Editor.tsx が保持するテキストエリアの選択範囲に対して、フォーマット関数を適用する。 */
    onFormat: (formatter: FormatFn) => void;
    onOpenImageManager: () => void;
}

interface ToolbarButton {
    icon: React.ElementType;
    label: string;
    action: FormatFn;
}

const BUTTONS: ToolbarButton[] = [
    { icon: Bold, label: "太字", action: (v, s, e) => wrapSelection(v, s, e, "**") },
    { icon: Italic, label: "斜体", action: (v, s, e) => wrapSelection(v, s, e, "_") },
    { icon: Heading2, label: "見出し", action: (v, s, e) => prefixLines(v, s, e, "## ") },
    { icon: List, label: "箇条書き", action: (v, s, e) => prefixLines(v, s, e, "- ") },
    { icon: ListOrdered, label: "番号付きリスト", action: (v, s, e) => prefixLinesOrdered(v, s, e) },
    { icon: Link2, label: "リンク", action: (v, s, e) => insertLink(v, s, e) },
    { icon: Code, label: "コードブロック", action: (v, s, e) => insertCodeBlock(v, s, e) },
    { icon: Quote, label: "引用", action: (v, s, e) => prefixLines(v, s, e, "> ") },
];

/** 選択範囲を装飾するMarkdown書式ツールバー。テキストエリア上部に配置する。 */
export function MarkdownToolbar({ onFormat, onOpenImageManager }: MarkdownToolbarProps) {
    return (
        <div className="flex flex-wrap items-center gap-0.5 rounded-t border border-b-0 border-slate-300 bg-slate-50 p-1">
            {BUTTONS.map(({ icon: Icon, label, action }) => (
                <button
                    key={label}
                    type="button"
                    title={label}
                    aria-label={label}
                    onClick={() => onFormat(action)}
                    className="rounded p-1.5 text-slate-600 hover:bg-slate-200 hover:text-ink"
                >
                    <Icon size={16} />
                </button>
            ))}
            <span className="mx-1 h-4 w-px bg-slate-300" aria-hidden="true" />
            <button
                type="button"
                title="画像を挿入"
                aria-label="画像を挿入"
                onClick={onOpenImageManager}
                className="rounded p-1.5 text-slate-600 hover:bg-slate-200 hover:text-ink"
            >
                <ImagePlus size={16} />
            </button>
        </div>
    );
}
