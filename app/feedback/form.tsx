"use client";

import { useState } from "react";

export function FeedbackForm({ context }: { context?: string }) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, name, email, website, context }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send that.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setError("Network error — try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="claim done">
        <h3>Got it</h3>
        <p>
          Thanks — this goes straight to me. If you left an email I&apos;ll reply,
          and if you didn&apos;t, I&apos;m still reading it.
        </p>
        <p className="btnrow">
          <a className="btn ghost" href="/new">Build a Latestfile</a>
          <a className="btn ghost" href="/spec">Read the spec</a>
        </p>
      </div>
    );
  }

  return (
    <form className="feedbackform" onSubmit={submit}>
      {context && (
        <p className="note" style={{ marginTop: 0 }}>
          About: <code>{context}</code>
        </p>
      )}
      <label>
        <span>What would you change?</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          required
          placeholder="Where the spec is wrong, where the composition model breaks down, what the builder wouldn't let you say…"
        />
      </label>
      <div className="fieldrow">
        <label>
          <span>Name (optional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <span>Email (optional, only if you want a reply)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
      </div>
      {/* Honeypot: hidden from people, tempting to bots. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
      />
      {error && <p className="claimnote bad">{error}</p>}
      <button className="btn" type="submit" disabled={state === "sending" || !message.trim()}>
        {state === "sending" ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
