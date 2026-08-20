import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listFeedback } from "@/lib/store";

export const dynamic = "force-dynamic";

// Not linked from anywhere and excluded from indexing. Access is gated on a
// key held in FEEDBACK_KEY. Without that variable set, the page is only
// reachable in development.
export const metadata: Metadata = {
  title: "Feedback inbox",
  robots: { index: false, follow: false },
};

function authorized(key: string | undefined): boolean {
  const expected = process.env.FEEDBACK_KEY;
  if (!expected) return process.env.NODE_ENV !== "production";
  if (!key || key.length !== expected.length) return false;
  // Constant-time-ish compare; lengths already match.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ key.charCodeAt(i);
  }
  return diff === 0;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  if (!authorized(key)) notFound();

  const items = await listFeedback();

  return (
    <main>
      <p className="note" style={{ marginBottom: "1.5rem" }}>
        <a href="/">← back</a> · private · {items.length}{" "}
        {items.length === 1 ? "submission" : "submissions"}
      </p>
      <h1 className="pagetitle">Feedback inbox</h1>

      {items.length === 0 ? (
        <p className="pagelede">Nothing yet.</p>
      ) : (
        <ul className="flows">
          {items.map((f) => (
            <li key={f.id} className="flow">
              <div className="flow-name">
                {f.name || "anonymous"}
                {f.email && (
                  <>
                    {" "}
                    <a href={`mailto:${f.email}`} className="card-provider">
                      {f.email}
                    </a>
                  </>
                )}
              </div>
              <p className="note" style={{ margin: 0 }}>
                {new Date(f.createdAt).toLocaleString()}
                {f.context && (
                  <>
                    {" · "}
                    <code>{f.context}</code>
                  </>
                )}
              </p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{f.message}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
