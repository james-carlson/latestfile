import type { Metadata } from "next";
import { FeedbackForm } from "./form";
import { ISSUES_NEW } from "@/lib/links";

export const metadata: Metadata = {
  title: "Feedback on Latestfile",
  description: "Tell me where the Latestfile v0.1 draft is wrong.",
};

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ about?: string }>;
}) {
  const { about } = await searchParams;

  return (
    <main>
      <p className="note" style={{ marginBottom: "1.5rem" }}>
        <a href="/">← back</a> · v0.1 draft · no account needed
      </p>
      <h1 className="pagetitle">Tell me where this is wrong</h1>
      <p className="pagelede">
        This is a draft and I want it torn apart. The thing I most want poked at
        is the composition model — if your org&apos;s setup doesn&apos;t roll up
        cleanly into the shape the spec defines, I&apos;d rather hear it now.
      </p>
      <p className="pagelede" style={{ marginBottom: "2rem" }}>
        This form comes straight to me and stays private. If you&apos;d rather
        argue in the open — which is usually more useful for a spec —{" "}
        <a href={ISSUES_NEW}>open an issue on GitHub</a> instead.
      </p>
      <FeedbackForm context={about} />
    </main>
  );
}
