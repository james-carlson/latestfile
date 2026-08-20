"use client";

import { useMemo, useRef, useState } from "react";
import { CodeBlock } from "../code-block";
import { Diagnostics } from "../diagnostics";
import { validate } from "@/lib/latestfile/validate";

const PLACEHOLDER = `latestfile_version = "0.1"
scope              = "personal"

tool "claude-code" {
  from     = "registry:anthropic/claude-code"
  provider = "anthropic"
}

profile "me" {
  role = "engineer"
}
`;

export function Checker() {
  const [src, setSrc] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const result = useMemo(() => (src.trim() ? validate(src) : null), [src]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setSrc(await f.text());
  }

  const errors = result?.diagnostics.filter((d) => d.severity === "error") ?? [];
  const warnings = result?.diagnostics.filter((d) => d.severity === "warning") ?? [];

  return (
    <div className="checker">
      <div className="checker-bar">
        <button type="button" className="linkbtn" onClick={() => fileRef.current?.click()}>
          upload a file
        </button>
        <button type="button" className="linkbtn" onClick={() => setSrc(PLACEHOLDER)}>
          load an example
        </button>
        {src && (
          <button type="button" className="linkbtn" onClick={() => setSrc("")}>
            clear
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".latestfile,.hcl,.txt,text/plain"
          onChange={onFile}
          hidden
        />
      </div>

      <textarea
        className="editor-area"
        value={src}
        onChange={(e) => setSrc(e.target.value)}
        placeholder={"Paste a Latestfile here…\n\n" + PLACEHOLDER}
        spellCheck={false}
        rows={18}
      />

      {result && (
        <div className="checker-result">
          <div className="preview-head">
            <span className={errors.length ? "status bad" : "status good"}>
              {errors.length ? `${errors.length} error${errors.length > 1 ? "s" : ""}` : "valid"}
            </span>
            {warnings.length > 0 && (
              <span className="status warn">
                {warnings.length} warning{warnings.length > 1 ? "s" : ""}
              </span>
            )}
            {result.scope && <span className="scopepill">{result.scope}</span>}
          </div>
          <Diagnostics diagnostics={result.diagnostics} />
          {result.ok && (
            <>
              <h3 className="subhead">Canonical JSON</h3>
              <p className="note" style={{ marginTop: 0 }}>
                Both forms are normative. This is the JSON your schema validates.
              </p>
              <CodeBlock code={JSON.stringify(result.json, null, 2)} language="json" />
            </>
          )}
        </div>
      )}
    </div>
  );
}
