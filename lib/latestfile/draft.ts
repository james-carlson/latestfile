// The in-memory shape the builder edits, and the HCL serializer that turns it
// into a real Latestfile.
//
// SPEC.md lists "Builder UI for generating Latestfiles" as out of scope for the
// spec itself. This is that builder's data model: deliberately a superset of
// nothing — every field here maps to a block or attribute the spec defines.

import type { Scope } from "./validate";
import { formatRef } from "./validate";

export type VendorValue = string | number | boolean;

export interface DraftTool {
  name: string;
  from?: string;
  version?: string;
  provider?: string;
  vendor?: Record<string, VendorValue>;
}

export interface DraftModel {
  name: string;
  from?: string;
  version?: string;
  provider?: string;
  vendor?: Record<string, VendorValue>;
}

export interface DraftWorkflow {
  name: string;
  description?: string;
  /** Tool names. */
  uses: string[];
  /** Model names. */
  models: string[];
}

export interface DraftInstructions {
  name: string;
  source?: string;
  /** Tool names. */
  appliesTo: string[];
}

export interface DraftContext {
  name: string;
  /** Registry URI, e.g. registry:acme@v1.2 */
  import?: string;
  /** Tool names. */
  tools: string[];
  /** Model names. */
  models: string[];
  /** Names of models defined in the imported org file, referenced as org.model.*. */
  orgModels: string[];
  /** Names of tools defined in the imported org file, referenced as org.tool.*. */
  orgTools: string[];
}

export interface Draft {
  scope: Scope;
  profileName: string;
  role?: string;
  tools: DraftTool[];
  models: DraftModel[];
  workflows: DraftWorkflow[];
  instructions: DraftInstructions[];
  contexts: DraftContext[];
}

export function emptyDraft(scope: Scope = "personal"): Draft {
  return {
    scope,
    profileName: "me",
    role: "",
    tools: [],
    models: [],
    workflows: [],
    instructions: [],
    contexts: [],
  };
}

const SPEC_VERSION = "0.1";

/** Serializes a draft into HCL2 native syntax matching the reference examples. */
export function toHcl(draft: Draft): string {
  const out: string[] = [];
  const hasProfile = draft.scope !== "project";
  const hasContexts = draft.scope !== "project";

  out.push(alignedTop([
    ["latestfile_version", quote(SPEC_VERSION)],
    ["scope", quote(draft.scope)],
  ]));

  for (const t of draft.tools) {
    const fields: [string, string][] = [];
    if (t.from) fields.push(["from", quote(t.from)]);
    if (t.version) fields.push(["version", quote(t.version)]);
    if (t.provider) fields.push(["provider", quote(t.provider)]);
    for (const [k, v] of Object.entries(t.vendor ?? {})) fields.push([k, literal(v)]);
    out.push(block("tool", t.name, fields));
  }

  for (const m of draft.models) {
    const fields: [string, string][] = [];
    if (m.from) fields.push(["from", quote(m.from)]);
    if (m.version) fields.push(["version", quote(m.version)]);
    if (m.provider) fields.push(["provider", quote(m.provider)]);
    for (const [k, v] of Object.entries(m.vendor ?? {})) fields.push([k, literal(v)]);
    out.push(block("model", m.name, fields));
  }

  for (const w of draft.workflows) {
    const fields: [string, string][] = [];
    if (w.description) fields.push(["description", quote(w.description)]);
    if (w.uses.length) fields.push(["uses", refList("tool", w.uses)]);
    if (w.models.length) fields.push(["models", refList("model", w.models)]);
    out.push(block("workflow", w.name, fields));
  }

  for (const ins of draft.instructions) {
    const fields: [string, string][] = [];
    if (ins.source) fields.push(["source", quote(ins.source)]);
    if (ins.appliesTo.length) fields.push(["applies_to", refList("tool", ins.appliesTo)]);
    out.push(block("instructions", ins.name, fields));
  }

  if (hasContexts) {
    for (const c of draft.contexts) {
      const fields: [string, string][] = [];
      if (c.import) fields.push(["import", quote(c.import)]);
      const tools = [
        ...c.tools.map((n) => formatRef("tool", n)),
        ...c.orgTools.map((n) => `org.${formatRef("tool", n)}`),
      ];
      const models = [
        ...c.models.map((n) => formatRef("model", n)),
        ...c.orgModels.map((n) => `org.${formatRef("model", n)}`),
      ];
      if (tools.length) fields.push(["tools", `[${tools.join(", ")}]`]);
      if (models.length) fields.push(["models", `[${models.join(", ")}]`]);
      out.push(block("context", c.name, fields));
    }
  }

  if (hasProfile) {
    const fields: [string, string][] = [];
    if (draft.role) fields.push(["role", quote(draft.role)]);
    if (draft.contexts.length) {
      fields.push(["contexts", refList("context", draft.contexts.map((c) => c.name))]);
    }
    out.push(block("profile", draft.profileName || "me", fields));
  }

  return out.join("\n") + "\n";
}

function refList(type: string, names: string[]): string {
  return `[${names.map((n) => formatRef(type, n)).join(", ")}]`;
}

function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function literal(v: VendorValue): string {
  if (typeof v === "string") return quote(v);
  return String(v);
}

/** Renders `key = value` pairs with '=' aligned, matching the examples' style. */
function alignedTop(pairs: [string, string][]): string {
  const width = Math.max(...pairs.map(([k]) => k.length));
  return pairs.map(([k, v]) => `${k.padEnd(width)} = ${v}`).join("\n") + "\n";
}

function block(type: string, name: string, fields: [string, string][]): string {
  const header = `${type} ${quote(name)} {`;
  if (!fields.length) return `${header}\n}\n`;
  const width = Math.max(...fields.map(([k]) => k.length));
  const body = fields.map(([k, v]) => `  ${k.padEnd(width)} = ${v}`).join("\n");
  return `${header}\n${body}\n}\n`;
}
