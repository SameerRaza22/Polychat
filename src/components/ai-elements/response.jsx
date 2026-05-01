"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState, useEffect } from "react";

// Normalize literal HTML tags the AI sometimes outputs as plain text
// e.g. <br>, <b>text</b>, <i>text</i> inside table cells
function normalizeHtml(str) {
    if (!str || typeof str !== "string") return str;
    return str
        .replace(/<br\s*\/?>/gi, "  \n")
        .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
        .replace(/<b>([\s\S]*?)<\/b>/gi, "**$1**")
        .replace(/<em>([\s\S]*?)<\/em>/gi, "*$1*")
        .replace(/<i>([\s\S]*?)<\/i>/gi, "*$1*")
        .replace(/<\/?[a-z][^>]*>/gi, "");
}

// Normalize math delimiters so KaTeX always catches them
function normalizeMath(str) {
    if (!str || typeof str !== "string") return str;
    return str
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`)
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`)
        .replace(/\(\\(?:displaystyle|textstyle)([\s\S]*?)\)/g, (_, m) => `$$\\displaystyle${m}$$`);
}

function normalizeContent(str) {
    return normalizeMath(normalizeHtml(str));
}

// Detect dark mode by watching the "dark" class on <html>
function useIsDark() {
    const [isDark, setIsDark] = useState(
        () => typeof window !== "undefined" && document.documentElement.classList.contains("dark")
    );
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains("dark"));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);
    return isDark;
}

// Re-render a string through KaTeX (used inside table cells)
function MathText({ text }) {
    if (!text || typeof text !== "string") return <>{text}</>;
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{ p: ({ children }) => <>{children}</> }}
        >
            {normalizeContent(text)}
        </ReactMarkdown>
    );
}

// Walk React children and apply MathText to plain strings (for table cells)
function renderChildren(children) {
    if (children === null || children === undefined) return null;
    if (typeof children === "string") return <MathText text={children} />;
    if (Array.isArray(children)) return children.map((c, i) => <span key={i}>{renderChildren(c)}</span>);
    return children;
}

// Copy button for code blocks
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
            style={{
                padding: "2px 8px",
                fontSize: "0.72rem",
                borderRadius: "6px",
                background: "var(--res-code-btn-bg)",
                color: "var(--res-code-btn-fg)",
                border: "none",
                cursor: "pointer",
                transition: "opacity 0.15s",
            }}
        >
            {copied ? "✓ Copied" : "Copy"}
        </button>
    );
}

// Main Response component
export function Response({ children, className = "" }) {
    const isDark = useIsDark();

    // Safely coerce anything to string
    const raw =
        typeof children === "string"
            ? children
            : Array.isArray(children)
                ? children.map((c) => (typeof c === "string" ? c : c?.text ?? "")).join("\n")
                : children?.text ?? String(children ?? "");

    const content = normalizeContent(raw);

    // All colors in one place - swap per theme
    const vars = isDark ? {
        "--res-text": "#e2e8f0",
        "--res-text-muted": "rgba(226,232,240,0.6)",
        "--res-text-strong": "#ffffff",
        "--res-heading": "#f1f5f9",
        "--res-border": "rgba(255,255,255,0.1)",
        "--res-bg-code-inline": "rgba(255,255,255,0.1)",
        "--res-code-inline-fg": "#f9a8d4",
        "--res-code-bar-bg": "rgba(255,255,255,0.05)",
        "--res-code-body-bg": "rgba(0,0,0,0.45)",
        "--res-code-btn-bg": "rgba(255,255,255,0.12)",
        "--res-code-btn-fg": "rgba(255,255,255,0.5)",
        "--res-link": "#60a5fa",
        "--res-quote-border": "rgba(255,255,255,0.2)",
        "--res-quote-text": "rgba(226,232,240,0.55)",
        "--res-hr": "rgba(255,255,255,0.1)",
        "--res-table-head-bg": "rgba(255,255,255,0.05)",
        "--res-table-td-text": "rgba(226,232,240,0.75)",
    } : {
        "--res-text": "#1e293b",
        "--res-text-muted": "#475569",
        "--res-text-strong": "#0f172a",
        "--res-heading": "#0f172a",
        "--res-border": "rgba(0,0,0,0.1)",
        "--res-bg-code-inline": "rgba(0,0,0,0.06)",
        "--res-code-inline-fg": "#db2777",
        "--res-code-bar-bg": "rgba(0,0,0,0.04)",
        "--res-code-body-bg": "#f8fafc",
        "--res-code-btn-bg": "rgba(0,0,0,0.08)",
        "--res-code-btn-fg": "#64748b",
        "--res-link": "#2563eb",
        "--res-quote-border": "rgba(0,0,0,0.15)",
        "--res-quote-text": "#64748b",
        "--res-hr": "rgba(0,0,0,0.1)",
        "--res-table-head-bg": "rgba(0,0,0,0.03)",
        "--res-table-td-text": "#334155",
    };

    return (
        <div
            className={`response-root ${className}`}
            style={{ ...vars, fontSize: "0.875rem", lineHeight: "1.7", color: "var(--res-text)" }}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{

                    p({ children }) {
                        return <p style={{ marginBottom: "0.75rem", lineHeight: "1.7", color: "var(--res-text)" }}>{children}</p>;
                    },

                    h1({ children }) {
                        return <h1 style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: "1.25rem", marginBottom: "0.5rem", borderBottom: "1px solid var(--res-border)", paddingBottom: "0.25rem", color: "var(--res-heading)" }}>{children}</h1>;
                    },
                    h2({ children }) {
                        return <h2 style={{ fontSize: "1.05rem", fontWeight: 600, marginTop: "1rem", marginBottom: "0.5rem", color: "var(--res-heading)" }}>{children}</h2>;
                    },
                    h3({ children }) {
                        return <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "0.75rem", marginBottom: "0.25rem", color: "var(--res-heading)" }}>{children}</h3>;
                    },
                    h4({ children }) {
                        return <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginTop: "0.5rem", marginBottom: "0.25rem", color: "var(--res-heading)" }}>{children}</h4>;
                    },

                    ul({ children }) {
                        return <ul style={{ listStyleType: "disc", paddingLeft: "1.25rem", margin: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.25rem" }}>{children}</ul>;
                    },
                    ol({ children }) {
                        return <ol style={{ listStyleType: "decimal", paddingLeft: "1.25rem", margin: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.25rem" }}>{children}</ol>;
                    },
                    li({ children }) {
                        return <li style={{ lineHeight: "1.7", color: "var(--res-text)" }}>{children}</li>;
                    },

                    blockquote({ children }) {
                        return <blockquote style={{ borderLeft: "4px solid var(--res-quote-border)", paddingLeft: "1rem", margin: "0.75rem 0", color: "var(--res-quote-text)", fontStyle: "italic" }}>{children}</blockquote>;
                    },

                    hr() {
                        return <hr style={{ border: "none", borderTop: "1px solid var(--res-hr)", margin: "1rem 0" }} />;
                    },

                    a({ href, children }) {
                        return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--res-link)", textDecoration: "underline", textUnderlineOffset: "2px" }}>{children}</a>;
                    },

                    strong({ children }) {
                        return <strong style={{ fontWeight: 600, color: "var(--res-text-strong)" }}>{children}</strong>;
                    },
                    em({ children }) {
                        return <em style={{ fontStyle: "italic", color: "var(--res-text-muted)" }}>{children}</em>;
                    },

                    pre({ children }) {
                        return <>{children}</>;
                    },
                    code({ node, className: cls, children, ...props }) {
                        const language = /language-(\w+)/.exec(cls || "")?.[1];
                        const raw = String(children).replace(/\n$/, "");
                        const isBlock = !!language || raw.includes("\n");

                        if (isBlock) {
                            return (
                                <div style={{ margin: "1rem 0", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--res-border)" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px", background: "var(--res-code-bar-bg)", borderBottom: "1px solid var(--res-border)" }}>
                                        <span style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "var(--res-text-muted)" }}>
                                            {language ?? "plaintext"}
                                        </span>
                                        <CopyButton code={raw} />
                                    </div>
                                    <SyntaxHighlighter
                                        style={isDark ? oneDark : oneLight}
                                        language={language ?? "text"}
                                        PreTag="div"
                                        customStyle={{ margin: 0, borderRadius: 0, background: "var(--res-code-body-bg)", fontSize: "0.82rem", padding: "1rem" }}
                                    >
                                        {raw}
                                    </SyntaxHighlighter>
                                </div>
                            );
                        }

                        return (
                            <code style={{ background: "var(--res-bg-code-inline)", padding: "1px 6px", borderRadius: "4px", color: "var(--res-code-inline-fg)", fontFamily: "monospace", fontSize: "0.82em" }} {...props}>
                                {children}
                            </code>
                        );
                    },

                    table({ children }) {
                        return (
                            <div style={{ overflowX: "auto", margin: "1rem 0", borderRadius: "12px", border: "1px solid var(--res-border)" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>{children}</table>
                            </div>
                        );
                    },
                    thead({ children }) {
                        return <thead style={{ background: "var(--res-table-head-bg)" }}>{children}</thead>;
                    },
                    tbody({ children }) {
                        return <tbody>{children}</tbody>;
                    },
                    tr({ children }) {
                        return <tr style={{ borderBottom: "1px solid var(--res-border)" }}>{children}</tr>;
                    },
                    th({ children }) {
                        return (
                            <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--res-heading)", borderBottom: "1px solid var(--res-border)", whiteSpace: "nowrap" }}>
                                {renderChildren(children)}
                            </th>
                        );
                    },
                    td({ children }) {
                        return (
                            <td style={{ padding: "10px 16px", color: "var(--res-table-td-text)", verticalAlign: "top" }}>
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