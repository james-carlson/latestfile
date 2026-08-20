import { NextResponse } from "next/server";
import { validate } from "@/lib/latestfile/validate";
import { profileTitle } from "@/lib/latestfile/summary";
import { claimProfile, slugProblem } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Generous enough for any real Latestfile, small enough to bound abuse. */
const MAX_BYTES = 64 * 1024;

export async function POST(req: Request) {
  let body: { slug?: unknown; hcl?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim().toLowerCase();
  const hcl = String(body.hcl ?? "");

  const problem = slugProblem(slug);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (!hcl.trim()) {
    return NextResponse.json({ error: "Nothing to publish." }, { status: 400 });
  }
  if (Buffer.byteLength(hcl, "utf8") > MAX_BYTES) {
    return NextResponse.json(
      { error: `Latestfiles are limited to ${MAX_BYTES / 1024} KB.` },
      { status: 413 }
    );
  }

  // Never trust the client's claim that a file is valid — re-validate here.
  const result = validate(hcl);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: "That Latestfile has validation errors, so it was not published.",
        diagnostics: result.diagnostics.filter((d) => d.severity === "error"),
      },
      { status: 422 }
    );
  }

  const claim = await claimProfile({
    slug,
    hcl,
    scope: result.scope ?? "personal",
    title: result.blocks ? profileTitle(result.blocks) : undefined,
  });

  if (!claim.ok) {
    const status = claim.reason === "taken" ? 409 : 400;
    const error =
      claim.reason === "taken"
        ? `@${slug} is already claimed. Try another name.`
        : claim.reason === "reserved"
        ? "That name is reserved."
        : "That name is not a valid namespace.";
    return NextResponse.json({ error, reason: claim.reason }, { status });
  }

  return NextResponse.json({
    slug,
    url: `/@${slug}`,
    editToken: claim.editToken,
  });
}
