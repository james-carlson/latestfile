// Shared helpers for turning a validated Latestfile into display data.

import type { Block } from "@/lib/hcl/parse";

export function blockAttr(b: Block, key: string): string | null {
  const a = b.attrs.find((x) => x.key === key);
  if (!a || a.value.kind !== "string") return null;
  return a.value.value;
}

export function blockRefs(b: Block, key: string): string[] {
  const a = b.attrs.find((x) => x.key === key);
  if (!a || a.value.kind !== "array") return [];
  return a.value.items
    .filter((i) => i.kind === "ref")
    .map((i) => (i.kind === "ref" ? i.ref.text : ""));
}

/** Vendor-defined fields on a tool/model block, i.e. everything non-reserved. */
export function vendorFields(b: Block): [string, string][] {
  const reserved = new Set(["from", "version", "provider"]);
  return b.attrs
    .filter((a) => !reserved.has(a.key))
    .map((a) => {
      const v = a.value;
      const text =
        v.kind === "string" ? v.value
        : v.kind === "number" ? String(v.value)
        : v.kind === "bool" ? String(v.value)
        : v.kind === "ref" ? v.ref.text
        : "…";
      return [a.key, text] as [string, string];
    });
}

/** The name of the profile block, used as the display title. */
export function profileTitle(blocks: Block[]): string | undefined {
  return blocks.find((b) => b.type === "profile")?.name;
}

/** Strips the registry: prefix for compact display. */
export function shortFrom(from: string | null): string | null {
  if (!from) return null;
  return from.replace(/^registry:/, "");
}

/** Extracts the bare entity name from a reference such as tool["claude-code"]. */
export function refName(text: string): string {
  const bracket = text.match(/\["([^"]+)"\]\s*$/);
  if (bracket) return bracket[1];
  const parts = text.split(".");
  return parts[parts.length - 1];
}

/** True when the reference points into an imported org/team file. */
export function isOrgRef(text: string): boolean {
  return text.startsWith("org.");
}
