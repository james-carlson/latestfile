import type { ReactElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";

// Flatten a heading's children (which may include <code>, <em>, etc.) to plain
// text so we can slug it.
function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  const el = node as ReactElement<{ children?: ReactNode }>;
  return textOf(el?.props?.children);
}

// GitHub's heading-anchor algorithm, so in-document links resolve the same way
// here as they do when the manifesto is read on GitHub.
function slug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function heading(Tag: "h2" | "h3" | "h4") {
  return function Heading({ children }: { children?: ReactNode }) {
    return <Tag id={slug(textOf(children))}>{children}</Tag>;
  };
}

// Server component: renders markdown and routes fenced code blocks through the
// client-side CodeBlock (syntax highlight + copy button). Inline code and
// unlanguaged blocks fall back to plain <pre>/<code>.
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: heading("h2"),
        h3: heading("h3"),
        h4: heading("h4"),
        pre({ children }) {
          const el = children as ReactElement<{
            className?: string;
            children?: string;
          }>;
          const className = el?.props?.className ?? "";
          const match = /language-(\w+)/.exec(className);
          const code = String(el?.props?.children ?? "").replace(/\n$/, "");
          if (!match) return <pre>{children}</pre>;
          return <CodeBlock code={code} language={match[1]} />;
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
