"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";

// ─── Normalize ALL math delimiter styles → $$ / $ ────────────────────────────
// Different AI models output math differently. This catches them all:
//   \[...\]              → $$...$$   (display)
//   \(...\)              → $...$     (inline)
//   (\displaystyle ...)  → $$...$$   (bare paren display, some models)
function normalizeMath(str) {
    if (!str || typeof str !== "string") return str;
    return str
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`)
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`)
        .replace(/\(\\(?:displaystyle|textstyle)([\s\S]*?)\)/g, (_, m) => `$$\\displaystyle${m}$$`);
}

// ─── MathText: re-render a string through KaTeX (used inside table cells) ─────
function MathText({ text }) {
    if (!text || typeof text !== "string") return <>{text}</>;
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{ p: ({ children }) => <>{children}</> }}
        >
            {normalizeMath(text)}
        </ReactMarkdown>
    );
}

// ─── Walk React children, apply MathText to plain strings (for table cells) ───
function renderChildren(children) {
    if (children === null || children === undefined) return null;
    if (typeof children === "string") return <MathText text={children} />;
    if (Array.isArray(children)) return children.map((c, i) => <span key={i}>{renderChildren(c)}</span>);
    return children;
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ code }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button
            onClick={copy}
            className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all"
        >
            {copied ? "✓ Copied" : "Copy"}
        </button>
    );
}

// ─── Main Response component ──────────────────────────────────────────────────
export function Response({ children, className = "" }) {
    // Safely coerce anything → string
    const raw =
        typeof children === "string"
            ? children
            : Array.isArray(children)
                ? children.map((c) => (typeof c === "string" ? c : c?.text ?? "")).join("\n")
                : children?.text ?? String(children ?? "");

    // Normalize math delimiters BEFORE passing to ReactMarkdown
    const content = normalizeMath(raw);

    return (
        <div className={`response-root text-sm leading-relaxed ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{

                    // ── Paragraphs ────────────────────────────────────────────
                    p({ children }) {
                        return <p className="mb-3 leading-relaxed">{children}</p>;
                    },

                    // ── Headings ──────────────────────────────────────────────
                    h1({ children }) {
                        return <h1 className="text-xl font-bold mt-5 mb-2 border-b border-white/10 pb-1">{children}</h1>;
                    },
                    h2({ children }) {
                        return <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>;
                    },
                    h3({ children }) {
                        return <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>;
                    },
                    h4({ children }) {
                        return <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>;
                    },

                    // ── Lists ─────────────────────────────────────────────────
                    ul({ children }) {
                        return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>;
                    },
                    ol({ children }) {
                        return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>;
                    },
                    li({ children }) {
                        return <li className="leading-relaxed">{children}</li>;
                    },

                    // ── Blockquote ────────────────────────────────────────────
                    blockquote({ children }) {
                        return (
                            <blockquote className="border-l-4 border-white/20 pl-4 my-3 text-white/60 italic">
                                {children}
                            </blockquote>
                        );
                    },

                    // ── Horizontal rule ───────────────────────────────────────
                    hr() {
                        return <hr className="border-white/10 my-4" />;
                    },

                    // ── Links ─────────────────────────────────────────────────
                    a({ href, children }) {
                        return (
                            <a href={href} target="_blank" rel="noopener noreferrer"
                                className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors">
                                {children}
                            </a>
                        );
                    },

                    // ── Strong / Em ───────────────────────────────────────────
                    strong({ children }) {
                        return <strong className="font-semibold text-white">{children}</strong>;
                    },
                    em({ children }) {
                        return <em className="italic text-white/80">{children}</em>;
                    },

                    // ── Code blocks + inline code ─────────────────────────────
                    pre({ children }) {
                        // Strip default <pre> — SyntaxHighlighter renders its own wrapper
                        return <>{children}</>;
                    },
                    code({ node, className: cls, children, ...props }) {
                        const language = /language-(\w+)/.exec(cls || "")?.[1];
                        const raw = String(children).replace(/\n$/, "");
                        const isBlock = !!language || raw.includes("\n");

                        if (isBlock) {
                            return (
                                <div className="my-4 rounded-xl overflow-hidden border border-white/10">
                                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                                        <span className="text-xs text-white/40 font-mono">
                                            {language ?? "plaintext"}
                                        </span>
                                        <CopyButton code={raw} />
                                    </div>
                                    <SyntaxHighlighter
                                        style={oneDark}
                                        language={language ?? "text"}
                                        PreTag="div"
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: 0,
                                            background: "rgba(0,0,0,0.45)",
                                            fontSize: "0.82rem",
                                            padding: "1rem",
                                        }}
                                    >
                                        {raw}
                                    </SyntaxHighlighter>
                                </div>
                            );
                        }

                        // Inline code
                        return (
                            <code className="bg-white/10 px-1.5 py-0.5 rounded text-pink-300 font-mono text-[0.82em]" {...props}>
                                {children}
                            </code>
                        );
                    },

                    // ── Tables (with math inside cells) ──────────────────────
                    table({ children }) {
                        return (
                            <div className="overflow-x-auto my-4 rounded-xl border border-white/10">
                                <table className="w-full border-collapse text-sm">{children}</table>
                            </div>
                        );
                    },
                    thead({ children }) {
                        return <thead className="bg-white/5">{children}</thead>;
                    },
                    tbody({ children }) {
                        return <tbody className="divide-y divide-white/5">{children}</tbody>;
                    },
                    tr({ children }) {
                        return <tr className="hover:bg-white/[0.03] transition-colors">{children}</tr>;
                    },
                    th({ children }) {
                        return (
                            <th className="px-4 py-2.5 text-left font-semibold text-white/80 border-b border-white/10 whitespace-nowrap">
                                {renderChildren(children)}
                            </th>
                        );
                    },
                    td({ children }) {
                        return (
                            <td className="px-4 py-2.5 text-white/70 align-top">
                                {renderChildren(children)}
                            </td>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}