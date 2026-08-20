// The read half of the registry SPEC.md describes.
//
// SPEC.md § Registry defines two kinds of entry: published Latestfiles
// (claimed namespaces, handled in lib/store) and entity definitions — the
// canonical tool/model records a `from` field points at. The publishing
// protocol, auth, and naming policy are all explicitly out of scope for v0.1,
// so this resolves entity definitions from the seed catalog rather than from a
// database. That is enough to make `registry:anthropic/claude-code` a URL you
// can actually open, which is the part the spec could not demonstrate.

import { MODEL_CATALOG, TOOL_CATALOG, type CatalogEntry } from "./catalog";

export interface RegistryEntry extends CatalogEntry {
  kind: "tool" | "model";
  /** Publisher namespace, e.g. "anthropic". */
  namespace: string;
  /** Entry name within the namespace, e.g. "claude-code". */
  entry: string;
}

/** Parses `registry:[<host>/]<namespace>[/<name>][@<version>]`. */
export function parseRegistryUri(uri: string): {
  host: string;
  namespace: string;
  name?: string;
  version?: string;
} | null {
  if (!uri.startsWith("registry:")) return null;
  let rest = uri.slice("registry:".length);

  let version: string | undefined;
  const at = rest.lastIndexOf("@");
  if (at > 0) {
    version = rest.slice(at + 1);
    rest = rest.slice(0, at);
  }

  const parts = rest.split("/");
  // A leading segment containing a dot is a hostname, per the URI grammar.
  let host = "latest.dev";
  if (parts.length > 1 && parts[0].includes(".")) {
    host = parts.shift()!;
  }
  if (!parts[0]) return null;

  return { host, namespace: parts[0], name: parts[1], version };
}

function toEntry(kind: "tool" | "model", c: CatalogEntry): RegistryEntry | null {
  const parsed = parseRegistryUri(c.from);
  if (!parsed?.name) return null;
  return { ...c, kind, namespace: parsed.namespace, entry: parsed.name };
}

export function allRegistryEntries(): RegistryEntry[] {
  return [
    ...TOOL_CATALOG.map((c) => toEntry("tool", c)),
    ...MODEL_CATALOG.map((c) => toEntry("model", c)),
  ].filter((e): e is RegistryEntry => e !== null);
}

export function findRegistryEntry(namespace: string, entry: string): RegistryEntry | null {
  return (
    allRegistryEntries().find(
      (e) => e.namespace === namespace.toLowerCase() && e.entry === entry.toLowerCase()
    ) ?? null
  );
}

/** Groups entries by publisher, for the index page. */
export function entriesByNamespace(): [string, RegistryEntry[]][] {
  const map = new Map<string, RegistryEntry[]>();
  for (const e of allRegistryEntries()) {
    const list = map.get(e.namespace) ?? [];
    list.push(e);
    map.set(e.namespace, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** The page path a registry URI resolves to, or null if it is unresolvable. */
export function registryHref(uri: string): string | null {
  const p = parseRegistryUri(uri);
  if (!p?.name) return null;
  if (!findRegistryEntry(p.namespace, p.name)) return null;
  return `/registry/${p.namespace}/${p.name}`;
}
