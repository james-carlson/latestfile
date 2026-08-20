import fs from "node:fs";
import path from "node:path";
import { Markdown } from "../markdown";
import type { Metadata } from "next";
import { REPO, SPEC_ISSUE } from "@/lib/links";

export const metadata: Metadata = {
  title: "Latestfile Specification v0.1",
  description: "The Latestfile v0.1 spec — an open format for declaring AI use.",
};

export default function Spec() {
  const md = fs.readFileSync(path.join(process.cwd(), "SPEC.md"), "utf8");

  return (
    <main>
      <p className="note" style={{ marginBottom: "2rem" }}>
        <a href="/">← back</a> · v0.1 draft · also on{" "}
        <a href={REPO}>GitHub</a> ·{" "}
        <a href={SPEC_ISSUE}>tell me where it&apos;s wrong</a>
      </p>
      <article className="article">
        <Markdown>{md}</Markdown>
      </article>
    </main>
  );
}
