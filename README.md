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

## Try it

You don't need to write one by hand.

- **[Build one](https://latest.dev/new)** — pick your tools and models, get a valid file.
- **[Validate one](https://latest.dev/validate)** — paste or upload, get every problem with a line number. Runs in your browser.
- **[Claim a namespace](https://latest.dev/new)** — turn your file into a shareable profile at `latest.dev/@you`.

## Repo contents

| Path | What |
|---|---|
| [`SPEC.md`](./SPEC.md) | The v0.1 specification, including its Implementation Status |
| [`schemas/`](./schemas) | JSON Schema (2020-12) for the canonical JSON form |
| [`examples/`](./examples) | Reference Latestfiles (HCL + JSON) for each scope |
| `app/`, `content/` | The [latest.dev](https://latest.dev) site |
| `lib/` | Parser, validator, and registry resolution |

The specification is the point. Everything under `app/` and `lib/` is a reference
implementation of it — where the two disagree, the spec is correct and the code is
the bug.

Canonical URLs, resolvable:

- Schema: <https://latest.dev/schemas/latestfile-v0.1.schema.json>
- Examples: <https://latest.dev/examples/personal/.latestfile>
- Any published file: `curl https://latest.dev/@<namespace>/latestfile`

## Status

**v0.1 draft.** It's early and it's meant to be argued with.

Nobody is using this in production yet, including me at scale. The composition model —
personal files importing an org's file — has never been tested against a real
organisation, and that's where I most expect it to break.
[Open an issue](https://github.com/james-carlson/latestfile/issues/new/choose) with
what you'd change. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how spec changes,
registry entries, and code fixes each work.

## Running the site

```bash
pnpm install
pnpm dev      # http://localhost:3000
```

Namespace claims and feedback need a Redis-compatible store. Without one, a local
filesystem driver is used automatically, so `pnpm dev` works with no configuration.

| Variable | Purpose |
|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis (also accepts `UPSTASH_REDIS_REST_*`) |
| `FEEDBACK_KEY` | Gates `/feedback/inbox`. Unset in production means the inbox is unreachable. |

## License

Specification (`SPEC.md`, `schemas/`, `examples/`): [CC BY 4.0](./LICENSE-SPEC).
Code: [MIT](./LICENSE).
