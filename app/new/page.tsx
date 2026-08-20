import type { Metadata } from "next";
import { Builder } from "./builder";

export const metadata: Metadata = {
  title: "Build a Latestfile",
  description:
    "Pick your tools, models, and workflows and get a valid Latestfile plus a shareable profile.",
};

export default function NewPage() {
  return (
    <main>
      <p className="note" style={{ marginBottom: "1.5rem" }}>
        <a href="/">← back</a> · builds a v0.1 file · validated as you type
      </p>
      <h1 className="pagetitle">Declare how you use AI</h1>
      <p className="pagelede">
        Answer a few questions and this writes a valid Latestfile for you. Claim a
        namespace at the end and you get a shareable profile — no account, no login.
      </p>
      <Builder />
    </main>
  );
}
