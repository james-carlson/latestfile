import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CodeBlock } from "../code-block";
import { ProfileView } from "../profile-view";
import { validate } from "@/lib/latestfile/validate";
import { REPO } from "@/lib/links";
import { bumpViews, getProfile, getViews } from "@/lib/store";

// A claimed namespace is served at /@<name>. The App Router treats "@foo" as a
// parallel-route slot when it is a *directory*, so the handle is captured as a
// normal dynamic segment and the "@" is checked here instead.

export const dynamic = "force-dynamic";

function parseHandle(handle: string): string | null {
  const decoded = decodeURIComponent(handle);
  if (!decoded.startsWith("@")) return null;
  const slug = decoded.slice(1).toLowerCase();
  return slug || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const slug = parseHandle(handle);
  if (!slug) return { title: "Not found" };
  const record = await getProfile(slug);
  if (!record) return { title: "Not found" };

  const title = `@${slug} — Latestfile`;
  const description = record.title
    ? `How ${record.title} uses AI: a ${record.scope}-scope Latestfile.`
    : `A ${record.scope}-scope Latestfile.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const slug = parseHandle(handle);
  if (!slug) notFound();

  const record = await getProfile(slug);
  if (!record) notFound();

  const result = validate(record.hcl);
  await bumpViews(slug);
  const views = await getViews(slug);

  const claimed = new Date(record.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main>
      <header className="phead">
        <div className="phead-top">
          <h1>@{slug}</h1>
          <span className="scopepill">{record.scope}</span>
        </div>
        {record.title && record.title !== slug && (
          <p className="phead-sub">
            profile <code>{record.title}</code>
          </p>
        )}
        <p className="note">
          Claimed {claimed} · {views} {views === 1 ? "view" : "views"} ·{" "}
          <a href={`/@${slug}/latestfile`}>raw file</a>
        </p>
      </header>

      {result.blocks && (
        <ProfileView blocks={result.blocks} scope={record.scope} />
      )}

      <section className="psec">
        <h2>The file</h2>
        <p className="note" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
          This is the whole thing — diffable, version-controllable, and portable.
          Fetch it with <code>curl latest.dev/@{slug}/latestfile</code>.
        </p>
        <CodeBlock code={record.hcl} language="hcl" />
      </section>

      <section className="cta">
        <h3>Declare your own setup</h3>
        <p>
          A Latestfile says which tools, models, and workflows you actually use.
          Build one in a couple of minutes and claim your namespace.
        </p>
        <p>
          <a className="btn" href="/new">Build yours →</a>
        </p>
      </section>

      <footer className="foot">
        <span>Latestfile v0.1 · a draft, and I want it torn apart</span>
        <span>
          <a href="/">Home</a> · <a href="/spec">Spec</a> ·{" "}
          <a href={REPO}>GitHub</a>
        </span>
      </footer>
    </main>
  );
}
