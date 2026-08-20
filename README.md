# Latestfile

**An open format for declaring how a developer, team, or organization uses AI.**

Every org is now asking "how do we actually use AI here?" and nobody can answer it —
usage is scattered across editors, chat windows, personal API keys, and a pile of
`CLAUDE.md` files. There's no portable artifact for it.

A **Latestfile** is a small, readable, version-controlled file that declares how a
person, team, or org uses AI: tools, models, workflows, instructions. It **composes** —
an individual's file rolls up into a team's, a team's into the org's. Think
`package.json` or `llms.txt`, but for AI usage.

```hcl
latestfile_version = "0.1"
scope              = "personal"

tool "claude-code" {
  from     = "registry:anthropic/claude-code"
  provider = "anthropic"
}

model "claude-sonnet" {
  from     = "registry:anthropic/claude-sonnet-4-6"
  provider = "anthropic"
}

workflow "feature-development" {
  description = "Spec to PR, AI-assisted"
  uses        = [tool["claude-code"]]
  models      = [model["claude-sonnet"]]
}

profile "me" {
  role = "engineer"
}
```

v0.1 is deliberately **descriptive, not prescriptive** — it captures what's in use, not
rules or enforcement. Prescription (policy, governance) is contemplated as a separate
future spec.

## Repo contents

| Path | What |
|---|---|
| [`SPEC.md`](./SPEC.md) | The v0.1 specification |
| [`schemas/`](./schemas) | JSON Schema (2020-12) for the canonical JSON form |
| [`examples/`](./examples) | Reference Latestfiles (HCL + JSON) for each scope |
| `app/`, `content/` | The [latest.dev](https://latest.dev) landing site (Next.js) |

## Status

**v0.1 draft.** It's early and it's meant to be argued with. Open an issue with what you'd
change — especially where the composition model breaks down.

## The site

The landing page is a Next.js app.

```bash
pnpm install
pnpm dev      # http://localhost:3000
```

## License

Spec: CC BY 4.0 (proposed). Code: MIT (proposed).
