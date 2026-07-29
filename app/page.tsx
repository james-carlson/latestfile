import fs from "node:fs";
import path from "node:path";
import { Markdown } from "./markdown";
import { WaitlistForm } from "./waitlist-form";

export default function Home() {
  const md = fs.readFileSync(
    path.join(process.cwd(), "content", "manifesto.md"),
    "utf8"
  );

  return (
    <main>
      <article className="article">
        <Markdown>{md}</Markdown>
      </article>

      <section className="cta" id="waitlist">
        <h3>Get a shareable profile + registry</h3>
        <p>
          I&apos;m building a generator that turns a Latestfile into a public
          profile page, plus a registry so orgs compose files by reference. Want
          in early?
        </p>
        <WaitlistForm />
        <p className="note">
          Or just start now: <a href="/spec">read the spec</a> and write your own
          Latestfile.
        </p>
      </section>

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
