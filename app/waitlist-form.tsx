"use client";

import { useState } from "react";

// TODO: paste your form endpoint here to capture emails for real.
// Fastest options (pick one, ~5 min):
//   - Formspree:  "https://formspree.io/f/xxxxxxx"
//   - Tally:      swap this whole block for a Tally embed
//   - Vercel:     point at a /api/waitlist route backed by Vercel KV/Postgres
// If left empty, the form just shows a success message client-side (no capture).
const FORM_ENDPOINT = "";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    if (!FORM_ENDPOINT) {
      setState("done");
      return;
    }
    setState("sending");
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="note" style={{ fontSize: "1rem" }}>
        Thanks — you&apos;re on the list. I&apos;ll email you when the profile
        generator is ready.
      </p>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email address"
      />
      <button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "…" : "Join the waitlist"}
      </button>
      {state === "error" && (
        <p className="note">Something went wrong — try again in a moment.</p>
      )}
    </form>
  );
}
