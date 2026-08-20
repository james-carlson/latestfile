import { NextResponse } from "next/server";
import { validate } from "@/lib/latestfile/validate";
import { profileTitle } from "@/lib/latestfile/summary";
import { updateProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 64 * 1024;

export async function POST(req: Request) {
  let body: { slug?: unknown; hcl?: unknown; editToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim().toLowerCase();
  const hcl = String(body.hcl ?? "");
  const editToken = String(body.editToken ?? "");

  if (!editToken) {
    return NextResponse.json({ error: "Missing edit token." }, { status: 401 });
  }
  if (Buffer.byteLength(hcl, "utf8") > MAX_BYTES) {
    return NextResponse.json({ error: "Latestfile too large." }, { status: 413 });
  }

  const result = validate(hcl);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: "That Latestfile has validation errors, so it was not saved.",
        diagnostics: result.diagnostics.filter((d) => d.severity === "error"),
      },
      { status: 422 }
    );
  }

  const updated = await updateProfile({
    slug,
    hcl,
    scope: result.scope ?? "personal",
    title: result.blocks ? profileTitle(result.blocks) : undefined,
    editToken,
  });

  if (!updated.ok) {
    return updated.reason === "not-found"
      ? NextResponse.json({ error: `@${slug} has not been claimed.` }, { status: 404 })
      : NextResponse.json(
          { error: "That edit token does not match this namespace." },
          { status: 403 }
        );
  }

  return NextResponse.json({ slug, url: `/@${slug}` });
}
