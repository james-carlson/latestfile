import type { Metadata } from "next";
import { entriesByNamespace } from "@/lib/latestfile/registry";
import { REGISTRY_ISSUE } from "@/lib/links";
import { getProfile, recentProfiles } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Latestfile registry",
  description:
    "Published Latestfiles and the canonical tool and model definitions a `from` field resolves to.",
};

export default async function RegistryPage() {
  const namespaces = entriesByNamespace();

  const slugs = await recentProfiles(50);
  const claimed = (
    await Promise.all(
      slugs.map(async (s) => {
        const r = await getProfile(s);
        return r ? { slug: s, scope: r.scope } : null;
      })
    )
  ).filter((r): r is { slug: string; scope: string } => r !== null);

  const entryCount = namespaces.reduce((n, [, e]) => n + e.length, 0);

  return (
    <main>
      <p className="note" style={{ marginBottom: "1.5rem" }}>
        <a href="/">← back</a> · v0.1 · resolves <code>registry:</code> URIs
      </p>
      <h1 className="pagetitle">The registry</h1>
      <p className="pagelede">
        The spec describes a registry holding two things: Latestfiles people have
        published, and the canonical tool and model definitions a <code>from</code>{" "}
        field points at. Both are below. The publishing protocol, auth, and naming
        policy are still <a href="/spec">out of scope for v0.1</a>.
      </p>

      <section className="psec">
        <h2>
          Published Latestfiles <span className="count">{claimed.length}</span>
        </h2>
        {claimed.length === 0 ? (
          <p className="note" style={{ marginTop: 0 }}>
            Nobody has claimed a namespace yet. <a href="/new">Be first</a>.
          </p>
        ) : (
          <ul className="recentlist">
            {claimed.map((c) => (
              <li key={c.slug}>
                <a href={`/@${c.slug}`}>@{c.slug}</a>
                <span className="recentscope">{c.scope}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="psec">
        <h2>
          Entity definitions <span className="count">{entryCount}</span>
        </h2>
        <p className="note" style={{ marginTop: 0, marginBottom: "1rem" }}>
          These are what <code>from = &quot;registry:anthropic/claude-code&quot;</code>{" "}
          resolves to. Vendors would own these entries; for now they are seeded so
          the references in a Latestfile actually go somewhere.
        </p>
        {namespaces.map(([ns, entries]) => (
          <div key={ns} className="nsblock">
            <h3 className="nsname">{ns}</h3>
            <ul className="cards">
              {entries.map((e) => (
                <li key={e.entry} className="card">
                  <div className="card-head">
                    <a className="card-name" href={`/registry/${e.namespace}/${e.entry}`}>
                      {e.label}
                    </a>
                    <span className="card-provider">{e.kind}</span>
                  </div>
                  <div className="card-meta">
                    <code>{e.namespace}/{e.entry}</code>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="cta">
        <h3>Something missing?</h3>
        <p>
          If you use a tool or model that isn&apos;t listed, the format still works —
          a <code>tool</code> block without a <code>from</code> field is valid. But
          tell me what&apos;s missing and I&apos;ll add it.
        </p>
        <p className="btnrow">
          <a className="btn" href={REGISTRY_ISSUE}>Suggest an entry</a>
          <a className="btn ghost" href="/new">Build a Latestfile</a>
        </p>
      </section>
    </main>
  );
}
