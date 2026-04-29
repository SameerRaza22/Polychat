"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Response({ children, className = "" }) {
    let text = "";

    // ✅ Safe parsing
    try {
        const parsed = JSON.parse(children || "[]");
        text = parsed.map((p) => p?.text || "").join("\n");
    } catch {
        text = children || "";
    }

    // ✅ Clean output
    const cleanText =
        typeof text === "string"
            ? text
                .replace(/\\\[(.*?)\\\]/gs, "$1")
                .replace(/\\boxed{(.*?)}/g, "$1")
                .replace(/\\text{([^}]*)}/g, "$1")
                .replace(/\\frac{([^}]*)}{([^}]*)}/g, "($1 / $2)")
                .replace(/\\cdot/g, "×")
                .replace(/\\times/g, "×")
                .replace(/\\n/g, "\n")
                .replace(/\\\\/g, "\\")
                .replace(/\n{3,}/g, "\n\n")
            : "";

    return (
        <div className={`text-sm leading-relaxed text-foreground ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    /**
                     * 🚨 CRITICAL FIX
                     * Completely override <p> so it NEVER wraps block elements
                     */
                    p: ({ children }) => <>{children}</>,

                    /**
                     * ✅ Code blocks (NO hydration issues)
                     */
                    pre: ({ children }) => (
                        <div className="bg-black/40 p-3 rounded-lg overflow-x-auto my-2">
                            {children}
                        </div>
                    ),

                    code({ inline, children }) {
                        if (inline) {
                            return (
                                <code className="bg-white/10 px-1 py-0.5 rounded text-pink-300">
                                    {children}
                                </code>
                            );
                        }

                        return <code className="text-sm">{children}</code>;
                    },

                    /**
                     * ✅ Tables
                     */
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
                            <table className="w-full border border-white/10 rounded-lg overflow-hidden">
                                {children}
                            </table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="border border-white/10 px-3 py-2 bg-white/5 text-left">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="border border-white/10 px-3 py-2">
                            {children}
                        </td>
                    ),

                    /**
                     * ✅ Headings
                     */
                    h1: ({ children }) => (
                        <h1 className="text-lg font-semibold mt-4 mb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>
                    ),

                    /**
                     * ✅ Lists
                     */
                    ul: ({ children }) => (
                        <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
                    ),
                }}
            >
                {cleanText}
            </ReactMarkdown>
        </div>
    );
}