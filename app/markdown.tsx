import type { ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";

// Server component: renders markdown and routes fenced code blocks through the
// client-side CodeBlock (syntax highlight + copy button). Inline code and
// unlanguaged blocks fall back to plain <pre>/<code>.
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
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
