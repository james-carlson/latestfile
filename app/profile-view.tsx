import type { Block } from "@/lib/hcl/parse";
import { registryHref } from "@/lib/latestfile/registry";
import {
  blockAttr,
  blockRefs,
  isOrgRef,
  refName,
  shortFrom,
  vendorFields,
} from "@/lib/latestfile/summary";

// Renders a validated Latestfile as a human-readable identity page.
//
// The file itself is the source of truth and stays one click away — this view
// exists because a config file is not a thing people share, and a profile is.

function Chip({ text }: { text: string }) {
  const org = isOrgRef(text);
  return (
    <span className={org ? "chip chip-org" : "chip"} title={org ? "Provided by the imported org file" : undefined}>
      {refName(text)}
      {org && <span className="chip-tag">org</span>}
    </span>
  );
}

function EntityCard({ b }: { b: Block }) {
  const provider = blockAttr(b, "provider");
  const version = blockAttr(b, "version");
  const rawFrom = blockAttr(b, "from");
  const from = shortFrom(rawFrom);
  const href = rawFrom ? registryHref(rawFrom) : null;
  const vendor = vendorFields(b);

  return (
    <li className="card">
      <div className="card-head">
        <span className="card-name">{b.name}</span>
        {provider && <span className="card-provider">{provider}</span>}
      </div>
      {(from || version) && (
        <div className="card-meta">
          {from &&
            (href ? (
              <a href={href}><code>{from}</code></a>
            ) : (
              <code>{from}</code>
            ))}
          {version && <span className="card-version">{version}</span>}
        </div>
      )}
      {vendor.length > 0 && (
        <dl className="vendor">
          {vendor.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {!from && (
        <p className="card-note">
          Not in the registry.{" "}
          <a href={`/feedback?about=${encodeURIComponent(`add:${b.name}`)}`}>
            Suggest it
          </a>
          .
        </p>
      )}
    </li>
  );
}

export function ProfileView({ blocks, scope }: { blocks: Block[]; scope: string }) {
  const by = (t: string) => blocks.filter((b) => b.type === t);
  const tools = by("tool");
  const models = by("model");
  const workflows = by("workflow");
  const instructions = by("instructions");
  const contexts = by("context");

  return (
    <div className="profile">
      {tools.length > 0 && (
        <section className="psec">
          <h2>Tools <span className="count">{tools.length}</span></h2>
          <ul className="cards">
            {tools.map((b) => <EntityCard key={b.name} b={b} />)}
          </ul>
        </section>
      )}

      {models.length > 0 && (
        <section className="psec">
          <h2>Models <span className="count">{models.length}</span></h2>
          <ul className="cards">
            {models.map((b) => <EntityCard key={b.name} b={b} />)}
          </ul>
        </section>
      )}

      {workflows.length > 0 && (
        <section className="psec">
          <h2>Workflows <span className="count">{workflows.length}</span></h2>
          <ul className="flows">
            {workflows.map((b) => {
              const uses = blockRefs(b, "uses");
              const mods = blockRefs(b, "models");
              return (
                <li key={b.name} className="flow">
                  <div className="flow-name">{b.name}</div>
                  {blockAttr(b, "description") && (
                    <p className="flow-desc">{blockAttr(b, "description")}</p>
                  )}
                  {(uses.length > 0 || mods.length > 0) && (
                    <div className="flow-refs">
                      {uses.map((r) => <Chip key={r} text={r} />)}
                      {mods.map((r) => <Chip key={r} text={r} />)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {instructions.length > 0 && (
        <section className="psec">
          <h2>Instructions <span className="count">{instructions.length}</span></h2>
          <ul className="flows">
            {instructions.map((b) => {
              const applies = blockRefs(b, "applies_to");
              const source = blockAttr(b, "source");
              return (
                <li key={b.name} className="flow">
                  <div className="flow-name">{b.name}</div>
                  {source && <p className="flow-desc"><code>{source}</code></p>}
                  {applies.length > 0 && (
                    <div className="flow-refs">
                      {applies.map((r) => <Chip key={r} text={r} />)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {contexts.length > 0 && (
        <section className="psec">
          <h2>Contexts <span className="count">{contexts.length}</span></h2>
          <ul className="flows">
            {contexts.map((b) => {
              const imp = blockAttr(b, "import");
              const t = blockRefs(b, "tools");
              const m = blockRefs(b, "models");
              return (
                <li key={b.name} className="flow">
                  <div className="flow-name">{b.name}</div>
                  {imp ? (
                    <p className="flow-desc">
                      imports <code>{imp}</code>
                      {!imp.includes("@") && (
                        <span className="warnpill" title="Unpinned imports can drift when the org file changes">
                          unpinned
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="flow-desc">Local entities only — no import.</p>
                  )}
                  {(t.length > 0 || m.length > 0) && (
                    <div className="flow-refs">
                      {t.map((r) => <Chip key={r} text={r} />)}
                      {m.map((r) => <Chip key={r} text={r} />)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tools.length === 0 && models.length === 0 && workflows.length === 0 && (
        <p className="note">
          This {scope} Latestfile declares no tools, models, or workflows yet.
        </p>
      )}
    </div>
  );
}
