// Serves the spec's companion artifacts from the URLs the spec itself names.
//
// The JSON Schema declares `"$id": "https://latest.dev/schemas/latestfile-v0.1.schema.json"`,
// so that URL has to resolve or the $id is a lie. The examples are referenced
// from the README and implied by the spec.
//
// Contents are embedded at build time (see scripts/embed-artifacts.mjs) rather
// than read from disk, and requests are matched against a fixed table rather
// than joined onto a base directory, so there is no path to traverse out of.

import { EMBEDDED_ARTIFACTS } from "./embedded-artifacts";

/** Maps a public URL path to the repository-relative file backing it. */
export const SERVED_SCHEMAS: Record<string, string> = {
  "latestfile-v0.1.schema.json": "schemas/latestfile-v0.1.schema.json",
};

export const SERVED_EXAMPLES: Record<string, string> = {
  "personal/.latestfile": "examples/personal/.latestfile",
  "personal/.latestfile.json": "examples/personal/.latestfile.json",
  "team/latestfile": "examples/team/latestfile",
  "team/latestfile.json": "examples/team/latestfile.json",
  "org/latestfile": "examples/org/latestfile",
  "org/latestfile.json": "examples/org/latestfile.json",
  "project/.latestfile": "examples/project/.latestfile",
  "project/.latestfile.json": "examples/project/.latestfile.json",
};

export function serve(table: Record<string, string>, segments: string[]): Response {
  const file = table[segments.join("/")];
  const artifact = file ? EMBEDDED_ARTIFACTS[file] : undefined;
  if (!artifact) return new Response("Not found\n", { status: 404 });

  return new Response(artifact.body, {
    headers: {
      "content-type": artifact.contentType,
      "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      "access-control-allow-origin": "*",
    },
  });
}
