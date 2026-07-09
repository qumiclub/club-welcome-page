"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import SyntaxHighlighter from "react-syntax-highlighter/dist/cjs/prism";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { resolveImageSrc } from "@/lib/imageUrl";
import type { ExtraProps } from "react-markdown";
import "../../app/preview.css";

/**
 * react-markdown v10 は `ExtraProps`（`node`）のみを型として公開しているが、
 * 旧APIの `inline` フラグを実行時には引き続き渡してくる環境があるため、
 * 型定義に無いフィールドとして明示的に許容する（`any` を避けるための最小限の拡張）。
 */
// `style` は除外する: react-markdown が渡す素の`code`要素向けのCSSProperties型と、
// SyntaxHighlighterが期待するトークン別スタイルマップの型が競合するため。
type CodeRendererProps = Omit<React.ComponentPropsWithoutRef<"code">, "style"> & ExtraProps & { inline?: boolean };

interface MarkdownPreviewProps {
    title: string;
    author: string;
    tags: string;
    content: string;
}

/** Live preview pane: renders the article's Markdown body the same way the Jekyll site does. */
export function MarkdownPreview({ title, author, tags, content }: MarkdownPreviewProps) {
    const tagList = String(tags).split(",").map((t) => t.trim()).filter(Boolean);

    return (
        <div className="bg-white p-6 rounded shadow overflow-y-auto preview-container h-full">
            <h1 className="article-title">{title || "無題の記事"}</h1>
            <div className="article-meta">
                {author && <span className="author-info">{author}</span>}
                {tagList.length > 0 && (
                    <div className="article-tags ml-4">
                        {tagList.map((tag) => (
                            <span key={tag} className="tag">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <hr className="my-4" />
            <div className="main-content">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        code({ node, inline, className, children, ...props }: CodeRendererProps) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                                    {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            );
                        },
                        img: ({ node, ...props }) => {
                            const src = resolveImageSrc(props.src as string);
                            return <img {...props} alt={props.alt || ""} src={src} style={{ maxWidth: "100%" }} />;
                        },
                    }}
                >
                    {content.replace(/\{\{\s*site\.baseurl\s*\}\}/g, "")}
                </ReactMarkdown>
            </div>
        </div>
    );
}
