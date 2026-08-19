# Latestfile

**An open format for declaring how a person, team, or organization uses AI.**

Status: **v0.1 draft.** The spec is public so it can be argued with. Nothing here is
stable yet.

## The problem

Ask ten engineers at a company how they use AI and you get ten different answers, none
of them written down anywhere you can find. One lives in Cursor. One drives Claude Code
through a wall of custom rules. One pastes into a chat window. One routes through a
personal API key nobody knows about.

That makes the questions every organization is now asking unanswerable. You cannot
measure, guide, or set policy on a practice you cannot see. The artifacts that exist
each capture a slice and stop: `CLAUDE.md` and `.cursorrules` describe a project, not a
person; IDE settings live on one laptop; MDM policy describes what is *allowed*, not
what is *used*; a survey is stale the day it is collected.

We have solved this shape of problem before. `package.json` for dependencies, Terraform
for infrastructure, `robots.txt` for crawlers, `llms.txt` for docs. Each took a practice
that lived in people's heads and gave it a small, portable, readable file that travels,
diffs, and composes.

## The format

A Latestfile declares which tools, models, workflows, and instructions are actually in
use. It describes the **actor**, so it travels with the person rather than the codebase.

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
  uses        = [tool.claude-code]
  models      = [model.claude-sonnet]
}

profile "me" {
  role = "engineer"
}
```

It composes. A personal file can import an org's, so the org declares approved tools and
models once and individuals inherit them by reference. A team is the sum of its members'
declarations; an org is the sum of its teams. "How do we use AI here" becomes a query
instead of a guess.

**v0.1 is deliberately descriptive, not prescriptive.** No policies, no enforcement, no
mandates. That layer is harder and more contested, and it belongs in a separate document
once the descriptive layer is stable. Describe first, guide policy second. You cannot do
the second without the first.

## Layout

| Path | What it is |
|---|---|
| `docs/superpowers/specs/2026-05-15-latestfile-design.md` | The specification. Source of truth. RFC 2119 language. |
| `schemas/latestfile-v0.1.schema.json` | JSON Schema (Draft 2020-12) for the canonical JSON form. Derived artifact. |
| `schemas/README.md` | What the schema validates, and what still needs a semantic validator. |
| `examples/` | Reference Latestfiles for all four scopes, in paired HCL and JSON form. |

Four scopes are defined: `personal`, `team`, `org`, `project`.

## Validating

The canonical form is JSON. Files written in HCL2 native syntax must be converted to the
HCL2 JSON equivalent before schema validation.

```sh
ajv validate \
  --spec=draft2020 \
  -s schemas/latestfile-v0.1.schema.json \
  -d examples/personal/.latestfile.json
```

The schema catches structural malformation only. Cross-block reference resolution,
registry resolution, and scope-conditional content rules require a semantic validator.
See `schemas/README.md` for the full boundary. Where the schema and the spec disagree,
the spec governs and the schema is the bug.

## Contributing

This is a draft and drafts improve by being poked at. The most useful thing you can do is
read the spec and say where it is wrong — particularly where the composition model breaks
down. Open an issue.
