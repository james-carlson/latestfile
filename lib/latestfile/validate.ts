// Validator for Latestfile v0.1.
//
// SPEC.md draws a hard line between two error classes, and this module honours it:
//   - Parse errors halt immediately and report one location (see lib/hcl).
//   - Validation errors are collected in full before reporting, so a user fixes
//     everything in one pass instead of playing whack-a-mole.
//
// Unknown block types and unknown fields are never errors — the spec requires
// parsers to tolerate them for forward compatibility — but they are surfaced as
// warnings where they are most likely typos.

import { parse, ParseError, refsIn, type Attr, type Block, type HclValue, type Ref } from "@/lib/hcl/parse";

export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  severity: Severity;
  /** Stable machine-readable identifier, e.g. "undefined-reference". */
  code: string;
  message: string;
  line: number;
  col: number;
  hint?: string;
}

export interface ValidationResult {
  /** True when there are no diagnostics of severity "error". */
  ok: boolean;
  diagnostics: Diagnostic[];
  /** Canonical JSON form. Present whenever the file parsed. */
  json?: Record<string, unknown>;
  scope?: string;
  /** Parsed blocks, for rendering. Present whenever the file parsed. */
  blocks?: Block[];
}

export const SCOPES = ["personal", "team", "org", "project"] as const;
export type Scope = (typeof SCOPES)[number];

export const ENTITY_TYPES = [
  "tool",
  "model",
  "workflow",
  "instructions",
  "context",
  "profile",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Reserved across ALL block types per SPEC.md § Reserved Field Names. */
export const RESERVED_FIELDS = [
  "from", "version", "provider", "description", "applies_to", "uses",
  "models", "import", "source", "role", "contexts", "tools", "scope",
] as const;

/** Which reserved fields are legitimately defined for each block type. */
const FIELDS_BY_TYPE: Record<EntityType, string[]> = {
  tool: ["from", "version", "provider"],
  model: ["from", "version", "provider"],
  workflow: ["description", "uses", "models"],
  instructions: ["source", "applies_to"],
  context: ["import", "tools", "models"],
  profile: ["role", "contexts"],
};

/**
 * Block types whose field set is closed by the spec, so an unrecognised field
 * is almost certainly a typo. `tool` and `model` are deliberately absent:
 * their non-reserved fields are vendor-defined and legal by design.
 */
const CLOSED_FIELD_TYPES: EntityType[] = ["workflow", "instructions", "context", "profile"];

/** Which entity type each reference-bearing field is expected to point at. */
const EXPECTED_REF_TYPE: Record<string, EntityType> = {
  uses: "tool",
  models: "model",
  tools: "tool",
  contexts: "context",
  applies_to: "tool",
};

const BLOCKS_BY_SCOPE: Record<Scope, EntityType[]> = {
  personal: ["tool", "model", "workflow", "instructions", "context", "profile"],
  team: ["tool", "model", "workflow", "instructions", "context", "profile"],
  org: ["tool", "model", "workflow", "instructions", "context", "profile"],
  project: ["tool", "model", "workflow", "instructions"],
};

const IDENT_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const VERSION_RE = /^[0-9]+\.[0-9]+$/;
const REGISTRY_URI_RE =
  /^registry:(?:[a-z0-9][a-z0-9.-]*[a-z0-9]\/)?[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)?(?:@[A-Za-z0-9._-]+)?$/;
const SEMVER_CONSTRAINT_RE =
  /^([<>=~^]|=>|<=|>=|~>|\^)?\s*v?[0-9]+(\.[0-9]+)?(\.[0-9]+)?([-+][A-Za-z0-9.-]+)?$/;

/** The spec version this validator implements. */
export const IMPLEMENTED_VERSION = "0.1";

export function validate(source: string): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  const add = (
    severity: Severity,
    code: string,
    message: string,
    pos: { line: number; col: number },
    hint?: string
  ) => {
    diagnostics.push({ severity, code, message, line: pos.line, col: pos.col, hint });
  };

  let parsed;
  try {
    parsed = parse(source);
  } catch (e) {
    if (e instanceof ParseError) {
      return {
        ok: false,
        diagnostics: [
          { severity: "error", code: "parse-error", message: e.message, line: e.line, col: e.col },
        ],
      };
    }
    throw e;
  }

  const { topAttrs, blocks, json } = parsed;

  // ---- Top-level attributes -------------------------------------------------

  const topByKey = new Map<string, Attr>();
  for (const a of topAttrs) {
    if (topByKey.has(a.key)) {
      add("error", "duplicate-attribute", `Duplicate top-level attribute '${a.key}'`, a);
    } else {
      topByKey.set(a.key, a);
    }
  }

  const versionAttr = topByKey.get("latestfile_version");
  if (!versionAttr) {
    add(
      "error",
      "missing-version",
      "Missing required 'latestfile_version' declaration",
      { line: 1, col: 1 },
      'Add latestfile_version = "0.1" as the first line.'
    );
  } else if (versionAttr.value.kind !== "string") {
    add("error", "invalid-version", "'latestfile_version' must be a string", versionAttr);
  } else if (!VERSION_RE.test(versionAttr.value.value)) {
    add(
      "error",
      "invalid-version",
      `'latestfile_version' must be MAJOR.MINOR, got "${versionAttr.value.value}"`,
      versionAttr
    );
  } else if (versionAttr.value.value !== IMPLEMENTED_VERSION) {
    add(
      "warning",
      "unsupported-version",
      `File declares version ${versionAttr.value.value}; this validator implements ${IMPLEMENTED_VERSION}`,
      versionAttr
    );
  }

  const scopeAttr = topByKey.get("scope");
  let scope: Scope | undefined;
  if (!scopeAttr) {
    add(
      "error",
      "missing-scope",
      "Missing required 'scope' declaration",
      { line: 1, col: 1 },
      'Add scope = "personal" (or "team", "org", "project").'
    );
  } else if (scopeAttr.value.kind !== "string") {
    add("error", "invalid-scope", "'scope' must be a string", scopeAttr);
  } else if (!(SCOPES as readonly string[]).includes(scopeAttr.value.value)) {
    add(
      "error",
      "invalid-scope",
      `'scope' must be one of ${SCOPES.join(", ")} — got "${scopeAttr.value.value}"`,
      scopeAttr
    );
  } else {
    scope = scopeAttr.value.value as Scope;
  }

  for (const a of topAttrs) {
    if (a.key !== "latestfile_version" && a.key !== "scope") {
      add(
        "warning",
        "unknown-attribute",
        `Unknown top-level attribute '${a.key}'`,
        a,
        "Tolerated for forward compatibility, but check for a typo."
      );
    }
  }

  // ---- Entity table ---------------------------------------------------------

  const table: Record<string, Map<string, Block>> = {};
  for (const t of ENTITY_TYPES) table[t] = new Map();

  for (const b of blocks) {
    const known = (ENTITY_TYPES as readonly string[]).includes(b.type);
    if (!known) {
      add(
        "warning",
        "unknown-block",
        `Unknown block type '${b.type}'`,
        b,
        "Tolerated for forward compatibility. Check the spelling against the six v0.1 entity types."
      );
      continue;
    }
    if (!IDENT_RE.test(b.name)) {
      add(
        "error",
        "invalid-identifier",
        `Block name "${b.name}" must match [a-zA-Z][a-zA-Z0-9_-]*`,
        b.namePos
      );
    }
    const bucket = table[b.type];
    if (bucket.has(b.name)) {
      const first = bucket.get(b.name)!;
      add(
        "error",
        "duplicate-block",
        `Duplicate ${b.type} block named "${b.name}" (first declared on line ${first.line})`,
        b.namePos
      );
    } else {
      bucket.set(b.name, b);
    }
  }

  // ---- Scope constraints ----------------------------------------------------

  if (scope) {
    const allowed = BLOCKS_BY_SCOPE[scope];
    for (const b of blocks) {
      if (!(ENTITY_TYPES as readonly string[]).includes(b.type)) continue;
      if (!allowed.includes(b.type as EntityType)) {
        add(
          "error",
          "block-not-allowed-in-scope",
          `A '${b.type}' block is not allowed in a ${scope}-scope Latestfile`,
          b,
          scope === "project"
            ? "A project describes a codebase, not an actor — it cannot declare contexts or a profile."
            : undefined
        );
      }
    }

    const profiles = blocks.filter((b) => b.type === "profile");
    if ((scope === "personal" || scope === "team") && profiles.length === 0) {
      add(
        "error",
        "missing-profile",
        `A ${scope}-scope Latestfile must contain exactly one profile block`,
        { line: 1, col: 1 },
        'Add a profile block, e.g. profile "me" { role = "engineer" }'
      );
    }
    if (profiles.length > 1) {
      for (const extra of profiles.slice(1)) {
        add(
          "error",
          "duplicate-profile",
          `A ${scope}-scope Latestfile must contain at most one profile block (first on line ${profiles[0].line})`,
          extra
        );
      }
    }
  }

  // ---- Per-block field checks ----------------------------------------------

  for (const b of blocks) {
    if (!(ENTITY_TYPES as readonly string[]).includes(b.type)) continue;
    const type = b.type as EntityType;
    const legit = FIELDS_BY_TYPE[type];

    const seen = new Map<string, Attr>();
    for (const a of b.attrs) {
      if (seen.has(a.key)) {
        add(
          "error",
          "duplicate-attribute",
          `Duplicate '${a.key}' field in ${type} "${b.name}" (first on line ${seen.get(a.key)!.line})`,
          a
        );
        continue;
      }
      seen.set(a.key, a);

      const isReserved = (RESERVED_FIELDS as readonly string[]).includes(a.key);
      if (isReserved && !legit.includes(a.key)) {
        add(
          "error",
          "reserved-field",
          `'${a.key}' is a reserved field name and cannot be used as a vendor field in a ${type} block`,
          a,
          `Reserved names are: ${RESERVED_FIELDS.join(", ")}`
        );
        continue;
      }
      if (!isReserved && CLOSED_FIELD_TYPES.includes(type)) {
        add(
          "warning",
          "unknown-field",
          `Unknown field '${a.key}' in ${type} "${b.name}"`,
          a,
          `Recognised fields for ${type}: ${legit.join(", ")}`
        );
      }
    }

    checkFieldTypes(type, b, seen, add);
  }

  // ---- References -----------------------------------------------------------

  checkReferences(blocks, table, add);
  checkCycles(blocks, add);

  const ok = !diagnostics.some((d) => d.severity === "error");
  return { ok, diagnostics: sortDiagnostics(diagnostics), json, scope, blocks };
}

type AddFn = (
  severity: Severity,
  code: string,
  message: string,
  pos: { line: number; col: number },
  hint?: string
) => void;

function expectString(a: Attr, label: string, add: AddFn): string | null {
  if (a.value.kind !== "string") {
    add("error", "invalid-type", `'${label}' must be a string`, a);
    return null;
  }
  return a.value.value;
}

function expectRefArray(a: Attr, label: string, add: AddFn): boolean {
  if (a.value.kind !== "array") {
    add("error", "invalid-type", `'${label}' must be a list, e.g. ${label} = [tool.cursor]`, a);
    return false;
  }
  for (const item of a.value.items) {
    if (item.kind !== "ref") {
      add(
        "error",
        "invalid-type",
        `'${label}' must contain references such as tool.cursor or tool["claude-code"], not a literal value`,
        a
      );
      return false;
    }
  }
  return true;
}

function checkFieldTypes(
  type: EntityType,
  b: Block,
  seen: Map<string, Attr>,
  add: AddFn
) {
  const from = seen.get("from");
  if (from && (type === "tool" || type === "model")) {
    const v = expectString(from, "from", add);
    if (v !== null && !REGISTRY_URI_RE.test(v)) {
      add(
        "error",
        "invalid-registry-uri",
        `'from' must be a registry URI — got "${v}"`,
        from,
        "Form: registry:[<host>/]<namespace>[/<name>][@<version>], e.g. registry:anthropic/claude-code"
      );
    }
  } else if (!from && (type === "tool" || type === "model")) {
    add(
      "info",
      "no-registry-definition",
      `${type} "${b.name}" has no 'from' field, so it has no canonical registry definition`,
      b,
      "Valid — vendor fields simply cannot be validated against a published schema."
    );
  }

  const version = seen.get("version");
  if (version && (type === "tool" || type === "model")) {
    const v = expectString(version, "version", add);
    if (v !== null && !SEMVER_CONSTRAINT_RE.test(v)) {
      add(
        "error",
        "invalid-semver",
        `'version' must be a semver constraint — got "${v}"`,
        version,
        'Examples: "1.0", ">=1.0", "~> 0.45", "^1.2.3"'
      );
    }
  }

  const provider = seen.get("provider");
  if (provider) expectString(provider, "provider", add);

  const description = seen.get("description");
  if (description) expectString(description, "description", add);

  const role = seen.get("role");
  if (role) expectString(role, "role", add);

  const source = seen.get("source");
  if (source && type === "instructions") {
    const v = expectString(source, "source", add);
    if (v !== null) {
      const isHttps = v.startsWith("https://");
      const isHttp = v.startsWith("http://");
      if (isHttp) {
        add(
          "error",
          "insecure-source",
          `'source' must use https:// — got "${v}"`,
          source
        );
      } else if (!isHttps) {
        if (v.startsWith("/")) {
          add(
            "error",
            "invalid-source",
            `'source' must be a relative path or an https:// URL — got an absolute path "${v}"`,
            source
          );
        } else if (v.split("/").includes("..")) {
          add(
            "error",
            "path-traversal",
            `'source' must not escape the Latestfile's directory — got "${v}"`,
            source,
            "SPEC.md § Security Considerations forbids paths that traverse outside the containing directory."
          );
        }
      }
    }
  }

  const imp = seen.get("import");
  if (imp && type === "context") {
    const v = expectString(imp, "import", add);
    if (v !== null) {
      if (!REGISTRY_URI_RE.test(v)) {
        add(
          "error",
          "invalid-registry-uri",
          `'import' must be a registry URI — got "${v}"`,
          imp,
          "Form: registry:[<host>/]<namespace>[/<name>][@<version>], e.g. registry:acme@v1.2"
        );
      } else if (!v.includes("@")) {
        add(
          "warning",
          "unpinned-import",
          `Import "${v}" is not pinned to a version`,
          imp,
          "Tooling resolves to the latest published version, so the composed result can drift. Pin it, e.g. " + v + "@v1.0"
        );
      }
    }
  }

  for (const field of ["uses", "models", "tools", "contexts", "applies_to"]) {
    const a = seen.get(field);
    if (a) expectRefArray(a, field, add);
  }
}

function checkReferences(
  blocks: Block[],
  table: Record<string, Map<string, Block>>,
  add: AddFn
) {
  const ORG_REFERENCEABLE = ["tool", "model", "workflow", "instructions"];

  for (const b of blocks) {
    if (!(ENTITY_TYPES as readonly string[]).includes(b.type)) continue;
    const hasImport =
      b.type === "context" && b.attrs.some((a) => a.key === "import");

    for (const a of b.attrs) {
      for (const ref of refsIn(a.value)) {
        checkRefSyntax(ref, add);
        // --- org.* cross-file references ---
        if (ref.parts[0] === "org") {
          if (b.type !== "context") {
            add(
              "error",
              "org-outside-context",
              `'${ref.text}' is only valid inside a context block`,
              ref,
              "SPEC.md § Relationships: cross-file references are permitted only via org.* within a context that declares an import."
            );
            continue;
          }
          if (!hasImport) {
            add(
              "error",
              "org-without-import",
              `'${ref.text}' requires this context to declare an 'import'`,
              ref,
              "Add an import, e.g. import = \"registry:acme@v1.2\""
            );
            continue;
          }
          if (ref.parts.length !== 3 || !ORG_REFERENCEABLE.includes(ref.parts[1])) {
            add(
              "error",
              "invalid-org-reference",
              `'${ref.text}' is not a supported org reference`,
              ref,
              "Supported forms: org.tool.<name>, org.model.<name>, org.workflow.<name>, org.instructions.<name>"
            );
          }
          // The imported file is remote, so the name itself cannot be resolved here.
          continue;
        }

        // --- local references ---
        const root = ref.parts[0];
        if (!(ENTITY_TYPES as readonly string[]).includes(root)) {
          add(
            "error",
            "unknown-reference-root",
            `'${ref.text}' does not name a known entity type`,
            ref,
            `Expected one of: ${ENTITY_TYPES.join(", ")}, or org.* inside a context with an import.`
          );
          continue;
        }
        if (ref.parts.length !== 2) {
          add(
            "error",
            "invalid-reference",
            `'${ref.text}' must be of the form ${root}.<name> or ${root}["<name>"]`,
            ref
          );
          continue;
        }
        const name = ref.parts[1];
        if (!table[root].has(name)) {
          const near = nearest(name, [...table[root].keys()]);
          add(
            "error",
            "undefined-reference",
            `'${ref.text}' refers to a ${root} that is not defined in this file`,
            ref,
            near ? `Did you mean ${formatRef(root, near)}?` : undefined
          );
          continue;
        }

        const expected = EXPECTED_REF_TYPE[a.key];
        if (expected && root !== expected) {
          add(
            "warning",
            "unexpected-reference-type",
            `'${a.key}' usually references ${expected} blocks, but '${ref.text}' is a ${root}`,
            ref
          );
        }
      }
    }
  }
}

/** Names that may be written with dot syntax, per SPEC.md § Relationships. */
const DOT_SAFE_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/**
 * SPEC.md § Identifiers and § Relationships both require bracket syntax for any
 * entity name that is not a bare [a-zA-Z][a-zA-Z0-9_]* identifier. HCL2 itself
 * permits hyphens in identifiers, so `tool.claude-code` parses cleanly and only
 * a deliberate check catches it.
 */
function checkRefSyntax(ref: Ref, add: AddFn) {
  for (let i = 0; i < ref.styles.length; i++) {
    const name = ref.parts[i + 1];
    if (ref.styles[i] === "bracket") continue;
    if (DOT_SAFE_RE.test(name)) continue;
    // The type prefix in an org.* chain is always a bare word; flag the leaf.
    add(
      "error",
      "dot-syntax-not-allowed",
      `'${ref.text}' uses dot syntax for "${name}", which is not a bare identifier`,
      ref,
      `Names containing hyphens must use bracket syntax: ${bracketed(ref, i)}`
    );
  }
}

/** Rewrites a reference with the offending segment in bracket form. */
function bracketed(ref: Ref, idx: number): string {
  let out = ref.parts[0];
  for (let i = 0; i < ref.styles.length; i++) {
    const name = ref.parts[i + 1];
    const useBracket = ref.styles[i] === "bracket" || i === idx || !DOT_SAFE_RE.test(name);
    out += useBracket ? `["${name}"]` : `.${name}`;
  }
  return out;
}

/**
 * References form a directed graph between named entities. v0.1 has no
 * legitimate reason to contain a cycle, and SPEC.md § Relationships makes one
 * a validation error.
 */
function checkCycles(blocks: Block[], add: AddFn) {
  const edges = new Map<string, { to: string; ref: Ref }[]>();
  const nodeOf = (b: Block) => `${b.type}.${b.name}`;

  for (const b of blocks) {
    if (!(ENTITY_TYPES as readonly string[]).includes(b.type)) continue;
    const out: { to: string; ref: Ref }[] = [];
    for (const a of b.attrs) {
      for (const ref of refsIn(a.value)) {
        if (ref.parts[0] === "org" || ref.parts.length !== 2) continue;
        out.push({ to: `${ref.parts[0]}.${ref.parts[1]}`, ref });
      }
    }
    edges.set(nodeOf(b), out);
  }

  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const reported = new Set<string>();

  function walk(node: string) {
    const s = state.get(node);
    if (s === "done") return;
    if (s === "visiting") return;
    state.set(node, "visiting");
    stack.push(node);
    for (const edge of edges.get(node) ?? []) {
      if (state.get(edge.to) === "visiting") {
        const start = stack.indexOf(edge.to);
        const cycle = [...stack.slice(start), edge.to].join(" → ");
        if (!reported.has(cycle)) {
          reported.add(cycle);
          add("error", "circular-reference", `Circular reference: ${cycle}`, edge.ref);
        }
        continue;
      }
      if (edges.has(edge.to)) walk(edge.to);
    }
    stack.pop();
    state.set(node, "done");
  }

  for (const node of edges.keys()) walk(node);
}

/**
 * Renders a reference in the form SPEC.md requires: dot syntax is valid only
 * when the name matches [a-zA-Z][a-zA-Z0-9_]*; anything else (notably hyphens)
 * must use bracket syntax.
 */
export function formatRef(type: string, name: string): string {
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) ? `${type}.${name}` : `${type}["${name}"]`;
}

/** Cheap edit-distance suggestion for undefined references. */
function nearest(target: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const d = levenshtein(target.toLowerCase(), c.toLowerCase());
    if (d < bestScore) {
      bestScore = d;
      best = c;
    }
  }
  const limit = Math.max(2, Math.floor(target.length / 3));
  return best !== null && bestScore <= limit ? best : null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i, ...Array(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

function sortDiagnostics(ds: Diagnostic[]): Diagnostic[] {
  return [...ds].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.line - b.line ||
      a.col - b.col
  );
}
