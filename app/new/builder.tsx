"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodeBlock } from "../code-block";
import { Diagnostics } from "../diagnostics";
import {
  INSTRUCTIONS_PRESETS,
  MODEL_CATALOG,
  TOOL_CATALOG,
  WORKFLOW_PRESETS,
  type CatalogEntry,
} from "@/lib/latestfile/catalog";
import {
  emptyDraft,
  toHcl,
  type Draft,
  type DraftContext,
  type DraftWorkflow,
} from "@/lib/latestfile/draft";
import { validate, type Scope } from "@/lib/latestfile/validate";

const SCOPES: { value: Scope; label: string; blurb: string }[] = [
  { value: "personal", label: "Personal", blurb: "You. Travels with you across jobs and projects." },
  { value: "team", label: "Team", blurb: "A team's shared setup. Composes into an org file." },
  { value: "org", label: "Org", blurb: "What the organisation provides and approves." },
  { value: "project", label: "Project", blurb: "A codebase's own AI setup. No actor, no contexts." },
];

const DRAFT_KEY = "latestfile:draft:v1";

/** Turns free text into a valid block identifier. */
function slugifyName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function Builder() {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft("personal"));
  const [loaded, setLoaded] = useState(false);

  // Restore an in-progress draft so a refresh does not throw away work.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...emptyDraft("personal"), ...JSON.parse(raw) });
    } catch {
      /* corrupt or unavailable storage is not worth surfacing */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* quota or private mode */
    }
  }, [draft, loaded]);

  const hcl = useMemo(() => toHcl(draft), [draft]);
  const result = useMemo(() => validate(hcl), [hcl]);

  const isProject = draft.scope === "project";
  const patch = useCallback(
    (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p })),
    []
  );

  // ---- tools & models -----------------------------------------------------

  function toggleCatalog(kind: "tools" | "models", entry: CatalogEntry) {
    setDraft((d) => {
      const list = d[kind];
      const has = list.some((x) => x.name === entry.name);
      const next = has
        ? list.filter((x) => x.name !== entry.name)
        : [...list, { name: entry.name, from: entry.from, provider: entry.provider }];
      // Dropping an entity must also drop every reference to it, or the file
      // becomes invalid the moment you uncheck something.
      if (has) return pruneRefs({ ...d, [kind]: next }, kind, entry.name);
      return { ...d, [kind]: next };
    });
  }

  function addCustom(kind: "tools" | "models", raw: string) {
    const name = slugifyName(raw);
    if (!name) return;
    setDraft((d) => {
      if (d[kind].some((x) => x.name === name)) return d;
      return { ...d, [kind]: [...d[kind], { name }] };
    });
  }

  function removeEntity(kind: "tools" | "models", name: string) {
    setDraft((d) =>
      pruneRefs({ ...d, [kind]: d[kind].filter((x) => x.name !== name) }, kind, name)
    );
  }

  // ---- workflows ----------------------------------------------------------

  function addWorkflow(w: DraftWorkflow) {
    setDraft((d) =>
      d.workflows.some((x) => x.name === w.name) ? d : { ...d, workflows: [...d.workflows, w] }
    );
  }

  function updateWorkflow(name: string, p: Partial<DraftWorkflow>) {
    setDraft((d) => ({
      ...d,
      workflows: d.workflows.map((w) => (w.name === name ? { ...w, ...p } : w)),
    }));
  }

  // ---- contexts -----------------------------------------------------------

  function updateContext(name: string, p: Partial<DraftContext>) {
    setDraft((d) => ({
      ...d,
      contexts: d.contexts.map((c) => (c.name === name ? { ...c, ...p } : c)),
    }));
  }

  const toolNames = draft.tools.map((t) => t.name);
  const modelNames = draft.models.map((m) => m.name);

  return (
    <div className="builder">
      <div className="bcol">
        <Section
          n={1}
          title="What are you describing?"
          hint="The scope decides which blocks are allowed. A project has no actor, so it gets no profile or contexts."
        >
          <div className="scopegrid">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={draft.scope === s.value ? "scopeopt on" : "scopeopt"}
                onClick={() => patch({ scope: s.value })}
              >
                <span className="scopeopt-label">{s.label}</span>
                <span className="scopeopt-blurb">{s.blurb}</span>
              </button>
            ))}
          </div>
        </Section>

        {!isProject && (
          <Section n={2} title="Who is this?" hint="Personal and team files must declare exactly one profile.">
            <div className="fieldrow">
              <label>
                <span>Profile name</span>
                <input
                  value={draft.profileName}
                  onChange={(e) => patch({ profileName: slugifyName(e.target.value) })}
                  placeholder="me"
                />
              </label>
              <label>
                <span>Role</span>
                <input
                  value={draft.role ?? ""}
                  onChange={(e) => patch({ role: e.target.value })}
                  placeholder="engineer"
                />
              </label>
            </div>
          </Section>
        )}

        <Section
          n={isProject ? 2 : 3}
          title="Which tools?"
          hint="Anything not listed can be added by hand — a tool with no registry entry is still valid."
        >
          <PickGrid
            entries={TOOL_CATALOG}
            selected={toolNames}
            onToggle={(e) => toggleCatalog("tools", e)}
          />
          <CustomAdd
            placeholder="Another tool, e.g. internal-agent"
            onAdd={(v) => addCustom("tools", v)}
          />
          <SelectedList
            names={draft.tools.filter((t) => !TOOL_CATALOG.some((c) => c.name === t.name)).map((t) => t.name)}
            onRemove={(n) => removeEntity("tools", n)}
          />
        </Section>

        <Section n={isProject ? 3 : 4} title="Which models?">
          <PickGrid
            entries={MODEL_CATALOG}
            selected={modelNames}
            onToggle={(e) => toggleCatalog("models", e)}
          />
          <CustomAdd
            placeholder="Another model, e.g. internal-llm"
            onAdd={(v) => addCustom("models", v)}
          />
          <SelectedList
            names={draft.models.filter((m) => !MODEL_CATALOG.some((c) => c.name === m.name)).map((m) => m.name)}
            onRemove={(n) => removeEntity("models", n)}
          />
        </Section>

        <Section
          n={isProject ? 4 : 5}
          title="How do you actually work?"
          hint="Workflows are descriptive in v0.1 — they record how AI fits in, they do not enforce anything."
        >
          <div className="presetrow">
            {WORKFLOW_PRESETS.filter((p) => !draft.workflows.some((w) => w.name === p.name)).map((p) => (
              <button
                key={p.name}
                type="button"
                className="preset"
                onClick={() => addWorkflow({ name: p.name, description: p.description, uses: toolNames, models: modelNames })}
              >
                + {p.name}
              </button>
            ))}
          </div>
          {draft.workflows.map((w) => (
            <div key={w.name} className="editor">
              <div className="editor-head">
                <strong>{w.name}</strong>
                <button
                  type="button"
                  className="linkbtn"
                  onClick={() => setDraft((d) => ({ ...d, workflows: d.workflows.filter((x) => x.name !== w.name) }))}
                >
                  remove
                </button>
              </div>
              <input
                className="wide"
                value={w.description ?? ""}
                onChange={(e) => updateWorkflow(w.name, { description: e.target.value })}
                placeholder="What happens in this workflow?"
              />
              <RefPicker label="Tools" options={toolNames} selected={w.uses} onChange={(v) => updateWorkflow(w.name, { uses: v })} />
              <RefPicker label="Models" options={modelNames} selected={w.models} onChange={(v) => updateWorkflow(w.name, { models: v })} />
            </div>
          ))}
        </Section>

        <Section
          n={isProject ? 5 : 6}
          title="Instructions files"
          hint="A pointer, not a copy. Parsers never read the file it points at."
        >
          <div className="presetrow">
            {INSTRUCTIONS_PRESETS.filter((p) => !draft.instructions.some((i) => i.name === p.name)).map((p) => (
              <button
                key={p.name}
                type="button"
                className="preset"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    instructions: [
                      ...d.instructions,
                      {
                        name: p.name,
                        source: p.source,
                        appliesTo: p.appliesToTool && d.tools.some((t) => t.name === p.appliesToTool) ? [p.appliesToTool] : [],
                      },
                    ],
                  }))
                }
              >
                + {p.source}
              </button>
            ))}
          </div>
          {draft.instructions.map((ins) => (
            <div key={ins.name} className="editor">
              <div className="editor-head">
                <strong>{ins.name}</strong>
                <button
                  type="button"
                  className="linkbtn"
                  onClick={() => setDraft((d) => ({ ...d, instructions: d.instructions.filter((x) => x.name !== ins.name) }))}
                >
                  remove
                </button>
              </div>
              <input
                className="wide"
                value={ins.source ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    instructions: d.instructions.map((x) => (x.name === ins.name ? { ...x, source: e.target.value } : x)),
                  }))
                }
                placeholder="./CLAUDE.md"
              />
              <RefPicker
                label="Applies to"
                options={toolNames}
                selected={ins.appliesTo}
                onChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    instructions: d.instructions.map((x) => (x.name === ins.name ? { ...x, appliesTo: v } : x)),
                  }))
                }
              />
            </div>
          ))}
        </Section>

        {!isProject && (
          <Section
            n={7}
            title="Contexts"
            hint="A context is a named composition — home vs work. Importing an org file pulls in what the org provides."
          >
            <div className="presetrow">
              {["home", "work"].filter((n) => !draft.contexts.some((c) => c.name === n)).map((n) => (
                <button
                  key={n}
                  type="button"
                  className="preset"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      contexts: [...d.contexts, { name: n, tools: toolNames, models: modelNames, orgModels: [], orgTools: [] }],
                    }))
                  }
                >
                  + {n}
                </button>
              ))}
              <CustomAdd
                placeholder="Custom context name"
                onAdd={(v) => {
                  const name = slugifyName(v);
                  if (!name) return;
                  setDraft((d) =>
                    d.contexts.some((c) => c.name === name)
                      ? d
                      : { ...d, contexts: [...d.contexts, { name, tools: [], models: [], orgModels: [], orgTools: [] }] }
                  );
                }}
              />
            </div>
            {draft.contexts.map((c) => (
              <div key={c.name} className="editor">
                <div className="editor-head">
                  <strong>{c.name}</strong>
                  <button
                    type="button"
                    className="linkbtn"
                    onClick={() => setDraft((d) => ({ ...d, contexts: d.contexts.filter((x) => x.name !== c.name) }))}
                  >
                    remove
                  </button>
                </div>
                <input
                  className="wide"
                  value={c.import ?? ""}
                  onChange={(e) => updateContext(c.name, { import: e.target.value.trim() })}
                  placeholder="Import an org file (optional): registry:acme@v1.2"
                />
                <RefPicker label="Tools" options={toolNames} selected={c.tools} onChange={(v) => updateContext(c.name, { tools: v })} />
                <RefPicker label="Models" options={modelNames} selected={c.models} onChange={(v) => updateContext(c.name, { models: v })} />
                {c.import && (
                  <CommaList
                    label="Models from the imported file"
                    value={c.orgModels}
                    onChange={(v) => updateContext(c.name, { orgModels: v })}
                    placeholder="gpt4-azure, internal-llm"
                  />
                )}
              </div>
            ))}
          </Section>
        )}
      </div>

      <div className="bcol bpreview">
        <Preview hcl={hcl} result={result} draft={draft} onReset={() => setDraft(emptyDraft(draft.scope))} />
      </div>
    </div>
  );
}

/** Removes every reference to a deleted entity so the file stays valid. */
function pruneRefs(d: Draft, kind: "tools" | "models", name: string): Draft {
  const isTool = kind === "tools";
  return {
    ...d,
    workflows: d.workflows.map((w) => ({
      ...w,
      uses: isTool ? w.uses.filter((n) => n !== name) : w.uses,
      models: isTool ? w.models : w.models.filter((n) => n !== name),
    })),
    instructions: d.instructions.map((i) => ({
      ...i,
      appliesTo: isTool ? i.appliesTo.filter((n) => n !== name) : i.appliesTo,
    })),
    contexts: d.contexts.map((c) => ({
      ...c,
      tools: isTool ? c.tools.filter((n) => n !== name) : c.tools,
      models: isTool ? c.models : c.models.filter((n) => n !== name),
    })),
  };
}

function Section({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bsec">
      <h2>
        <span className="stepnum">{n}</span>
        {title}
      </h2>
      {hint && <p className="bhint">{hint}</p>}
      {children}
    </section>
  );
}

function PickGrid({
  entries,
  selected,
  onToggle,
}: {
  entries: CatalogEntry[];
  selected: string[];
  onToggle: (e: CatalogEntry) => void;
}) {
  return (
    <div className="pickgrid">
      {entries.map((e) => {
        const on = selected.includes(e.name);
        return (
          <button
            key={e.name}
            type="button"
            className={on ? "pick on" : "pick"}
            onClick={() => onToggle(e)}
            aria-pressed={on}
          >
            <span className="pick-label">{e.label}</span>
            {e.note && <span className="pick-note">{e.note}</span>}
          </button>
        );
      })}
    </div>
  );
}

function CustomAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  function submit() {
    if (!v.trim()) return;
    onAdd(v);
    setV("");
  }
  return (
    <div className="customadd">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
      />
      <button type="button" onClick={submit}>Add</button>
    </div>
  );
}

function SelectedList({ names, onRemove }: { names: string[]; onRemove: (n: string) => void }) {
  if (!names.length) return null;
  return (
    <div className="flow-refs" style={{ marginTop: "0.6rem" }}>
      {names.map((n) => (
        <span key={n} className="chip">
          {n}
          <button type="button" className="chipx" onClick={() => onRemove(n)} aria-label={`Remove ${n}`}>
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function RefPicker({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  if (!options.length) return null;
  return (
    <div className="refpicker">
      <span className="refpicker-label">{label}</span>
      <div className="flow-refs">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              className={on ? "chip chip-on" : "chip chip-off"}
              onClick={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
              aria-pressed={on}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CommaList({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <label className="commalist">
      <span>{label}</span>
      <input
        className="wide"
        value={value.join(", ")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => slugifyName(s))
              .filter(Boolean)
          )
        }
        placeholder={placeholder}
      />
    </label>
  );
}

function Preview({
  hcl,
  result,
  draft,
  onReset,
}: {
  hcl: string;
  result: ReturnType<typeof validate>;
  draft: Draft;
  onReset: () => void;
}) {
  const errors = result.diagnostics.filter((d) => d.severity === "error");
  const warnings = result.diagnostics.filter((d) => d.severity === "warning");
  const empty = draft.tools.length === 0 && draft.models.length === 0;

  function download() {
    const blob = new Blob([hcl], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = draft.scope === "project" || draft.scope === "personal" ? ".latestfile" : "latestfile";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="preview">
      <div className="preview-head">
        <span className={errors.length ? "status bad" : "status good"}>
          {errors.length ? `${errors.length} error${errors.length > 1 ? "s" : ""}` : "valid"}
        </span>
        {warnings.length > 0 && <span className="status warn">{warnings.length} warning{warnings.length > 1 ? "s" : ""}</span>}
        <button type="button" className="linkbtn" onClick={download}>download</button>
        <button type="button" className="linkbtn" onClick={onReset}>reset</button>
      </div>

      <CodeBlock code={hcl} language="hcl" />

      {result.diagnostics.length > 0 && <Diagnostics diagnostics={result.diagnostics} />}

      <Claim hcl={hcl} disabled={!result.ok || empty} empty={empty} />
    </div>
  );
}

function Claim({ hcl, disabled, empty }: { hcl: string; disabled: boolean; empty: boolean }) {
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "free" | "taken" | "bad">("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState<{ url: string; editToken: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!slug) {
      setStatus("idle");
      setProblem(null);
      return;
    }
    setStatus("checking");
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/available?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (mine !== seq.current) return;
        setProblem(data.problem ?? null);
        setStatus(data.available ? "free" : data.problem === "That name is already claimed." ? "taken" : "bad");
      } catch {
        if (mine === seq.current) setStatus("idle");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [slug]);

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, hcl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not publish.");
        if (res.status === 409) setStatus("taken");
        return;
      }
      try {
        localStorage.setItem(`latestfile:token:${data.slug}`, data.editToken);
      } catch {
        /* storage unavailable — the token is still shown below */
      }
      setDone({ url: data.url, editToken: data.editToken });
    } catch {
      setError("Network error — try again.");
    } finally {
      setPublishing(false);
    }
  }

  if (done) {
    return (
      <div className="claim done">
        <h3>Claimed</h3>
        <p>
          Your profile is live at <a href={done.url}>latest.dev{done.url}</a>.
        </p>
        <p className="note">
          Edit token — save this, it is the only way to update your profile and it
          is not shown again:
        </p>
        <code className="edittoken">{done.editToken}</code>
      </div>
    );
  }

  return (
    <div className="claim">
      <h3>Claim your namespace</h3>
      <p className="note" style={{ marginTop: 0 }}>
        The spec resolves <code>registry:acme</code> to namespace <code>acme</code>.
        Claiming a name here claims that namespace.
      </p>
      <div className="slugrow">
        <span className="slugprefix">latest.dev/@</span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder="yourname"
          maxLength={32}
        />
      </div>
      {problem && <p className="claimnote bad">{problem}</p>}
      {status === "free" && <p className="claimnote good">@{slug} is available.</p>}
      {empty && <p className="claimnote">Add at least one tool or model first.</p>}
      {disabled && !empty && <p className="claimnote bad">Fix the errors above before publishing.</p>}
      {error && <p className="claimnote bad">{error}</p>}
      <button
        type="button"
        className="btn"
        disabled={disabled || status !== "free" || publishing}
        onClick={publish}
      >
        {publishing ? "Publishing…" : "Publish profile"}
      </button>
    </div>
  );
}
