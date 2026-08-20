import fs from "node:fs";
import path from "node:path";
import { Markdown } from "./markdown";
import { getProfile, recentProfiles } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const md = fs.readFileSync(
    path.join(process.cwd(), "content", "manifesto.md"),
    "utf8"
  );

  // Recently claimed namespaces are the honest demand signal: files people
  // actually made, not emails they left behind.
  const slugs = await recentProfiles(8);
  const recent = (
    await Promise.all(
      slugs.map(async (s) => {
        const r = await getProfile(s);
        return r ? { slug: s, scope: r.scope } : null;
      })
    )
  ).filter((r): r is { slug: string; scope: string } => r !== null);

  return (
    <main>
      <article className="article">
        <Markdown>{md}</Markdown>
      </article>

      <section className="cta" id="build">
        <h3>Declare your own setup</h3>
        <p>
          Pick your tools, models, and workflows. You get a valid Latestfile and a
          shareable profile at your own namespace. No account, no login.
        </p>
        <p className="btnrow">
          <a className="btn" href="/new">Build yours →</a>
          <a className="btn ghost" href="/validate">Validate a file</a>
        </p>
      </section>

      {recent.length > 0 && (
        <section className="recent">
          <h3>Recently claimed</h3>
          <ul className="recentlist">
            {recent.map((r) => (
              <li key={r.slug}>
                <a href={`/@${r.slug}`}>@{r.slug}</a>
                <span className="recentscope">{r.scope}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="foot">
        <span>Latestfile v0.1 · a draft, and I want it torn apart</span>
        <span>
          <a href="/spec">Spec</a> ·{" "}
          <a href="https://github.com/james-carlson/latestfile">GitHub</a>
        </span>
      </footer>
    </main>
  );
}
