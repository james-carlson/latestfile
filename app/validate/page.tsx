import type { Metadata } from "next";
import { Checker } from "./checker";

export const metadata: Metadata = {
  title: "Validate a Latestfile",
  description:
    "Check a Latestfile against the v0.1 spec — parse errors, validation errors, and warnings with line numbers.",
};

export default function ValidatePage() {
  return (
    <main>
      <p className="note" style={{ marginBottom: "1.5rem" }}>
        <a href="/">← back</a> · v0.1 rules · runs in your browser, nothing is uploaded
      </p>
      <h1 className="pagetitle">Validate a Latestfile</h1>
      <p className="pagelede">
        Paste or upload a file and get every problem at once, with line numbers.
        Don&apos;t have one yet? <a href="/new">Build one</a>.
      </p>
      <Checker />
    </main>
  );
}
