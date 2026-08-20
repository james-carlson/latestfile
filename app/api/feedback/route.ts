import { NextResponse } from "next/server";
import { addFeedback } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_MESSAGE = 8000;
const MAX_FIELD = 200;

export async function POST(req: Request) {
  let body: { message?: unknown; name?: unknown; email?: unknown; context?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  // Honeypot: a real person never fills a hidden field. Accept silently so a
  // bot cannot tell it was rejected.
  if (String(body.website ?? "").trim()) {
    return NextResponse.json({ ok: true });
  }

  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Say something first." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `Keep it under ${MAX_MESSAGE} characters.` },
      { status: 413 }
    );
  }

  const email = String(body.email ?? "").trim().slice(0, MAX_FIELD);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "That email address looks off." }, { status: 400 });
  }

  await addFeedback({
    message,
    name: String(body.name ?? "").trim().slice(0, MAX_FIELD),
    email,
    context: String(body.context ?? "").trim().slice(0, MAX_FIELD),
  });

  return NextResponse.json({ ok: true });
}
