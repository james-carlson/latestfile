import { getProfile } from "@/lib/store";

// Serves the raw Latestfile as plain text so it can be curl'd, diffed, or
// piped into tooling. SPEC.md § Registry describes published Latestfiles being
// resolvable by namespace; this is the read half of that, without the
// publishing protocol the spec defers.

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const decoded = decodeURIComponent(handle);
  if (!decoded.startsWith("@")) {
    return new Response("Not found\n", { status: 404 });
  }
  const record = await getProfile(decoded.slice(1).toLowerCase());
  if (!record) return new Response("Not found\n", { status: 404 });

  return new Response(record.hcl, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `inline; filename=".latestfile"`,
    },
  });
}
