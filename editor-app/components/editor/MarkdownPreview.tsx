"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import SyntaxHighlighter from "react-syntax-highlighter/dist/cjs/prism";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import "../../app/preview.css";

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
            <h1 className="article-title">{title || "Untitled"}</h1>
            <div className="article-meta">
                {author && <span className="author-info">By {author}</span>}
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
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                                <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                                    {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            );
                        },
                        img: ({ node, ...props }) => {
                            let src = (props.src as string) || "";
                            // Handle Jekyll baseurl
                            if (src.includes("{{ site.baseurl }}")) {
                                src = src.replace("{{ site.baseurl }}", "");
                            }
                            if (src.startsWith("/assets/images/")) {
                                // Rewrite relative path to GitHub Raw URL for preview
                                // Note: This will work as long as the repo structure is consistent
                                src = `https://raw.githubusercontent.com/${process.env.NEXT_PUBLIC_GITHUB_OWNER || "qumiclub"}/${process.env.NEXT_PUBLIC_GITHUB_REPO || "club-welcome-page"}/main${src}`;
                            }
                            return <img {...props} src={src} style={{ maxWidth: "100%" }} />;
                        },
                    }}
                >
                    {content.replace(/\{\{\s*site\.baseurl\s*\}\}/g, "")}
                </ReactMarkdown>
            </div>
        </div>
    );
}
