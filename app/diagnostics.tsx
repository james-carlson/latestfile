import type { Diagnostic } from "@/lib/latestfile/validate";

// SPEC.md § Error Handling separates parse errors (halt, one location) from
// validation errors (collect them all). Warnings and info exist because the
// spec requires parsers to *tolerate* unknown blocks and fields while
// validators SHOULD still surface them as likely typos.

const LABEL: Record<Diagnostic["severity"], string> = {
  error: "error",
  warning: "warning",
  info: "info",
};

export function Diagnostics({ diagnostics }: { diagnostics: Diagnostic[] }) {
  if (!diagnostics.length) return null;
  return (
    <ul className="diags">
      {diagnostics.map((d, i) => (
        <li key={`${d.code}-${d.line}-${d.col}-${i}`} className={`diag diag-${d.severity}`}>
          <div className="diag-head">
            <span className={`diagsev sev-${d.severity}`}>{LABEL[d.severity]}</span>
            <span className="diagloc">
              {d.line}:{d.col}
            </span>
            <span className="diagcode">{d.code}</span>
          </div>
          <p className="diag-msg">{d.message}</p>
          {d.hint && <p className="diag-hint">{d.hint}</p>}
        </li>
      ))}
    </ul>
  );
}
