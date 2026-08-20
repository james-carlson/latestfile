import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CodeBlock } from "../../../code-block";
import { findRegistryEntry } from "@/lib/latestfile/registry";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ namespace: string; entry: string }>;
}): Promise<Metadata> {
  const { namespace, entry } = await params;
  const e = findRegistryEntry(namespace, entry);
  if (!e) return { title: "Not found" };
  return {
    title: `${e.label} — Latestfile registry`,
    description: `The canonical registry definition for ${e.label} (${e.provider}).`,
  };
}

export default async function EntryPage({
  params,
}: {
  params: Promise<{ namespace: string; entry: string }>;
}) {
  const { namespace, entry } = await params;
  const e = findRegistryEntry(namespace, entry);
  if (!e) notFound();

  const block =
    e.kind === "tool"
      ? `tool "${e.name}" {\n  from     = "${e.from}"\n  provider = "${e.provider}"\n}`
      : `model "${e.name}" {\n  from     = "${e.from}"\n  provider = "${e.provider}"\n}`;

  return (
    <main>
      <p className="note" style={{ marginBottom: "1.5rem" }}>
        <a href="/registry">← registry</a> · {e.kind} definition
      </p>
      <header className="phead">
        <div className="phead-top">
          <h1>{e.label}</h1>
          <span className="scopepill">{e.kind}</span>
        </div>
        <p className="phead-sub">
          published by <code>{e.namespace}</code>
          {e.note && <> · {e.note}</>}
        </p>
      </header>

      <section className="psec">
        <h2>Reference it like this</h2>
        <p className="note" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
          Drop this into your Latestfile, or let{" "}
          <a href="/new">the builder</a> write it for you.
        </p>
        <CodeBlock code={block} language="hcl" />
      </section>

      <section className="psec">
        <h2>The URI</h2>
        <p className="note" style={{ marginTop: 0 }}>
          <code>{e.from}</code> — a <code>registry:</code> URI with the host
          omitted, so it defaults to <code>latest.dev</code>. Parsers are not
          required to resolve it; an unreachable registry is not a validation
          error.
        </p>
      </section>

      <section className="cta">
        <h3>Is this wrong?</h3>
        <p>
          Vendors should own these definitions. This one is seeded, so if the
          details are off or the vendor fields should be different, say so.
        </p>
        <p className="btnrow">
          <a className="btn" href={`/feedback?about=registry:${e.namespace}/${e.entry}`}>
            Correct this entry
          </a>
        </p>
      </section>
    </main>
  );
}
