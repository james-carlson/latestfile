# Latestfile Specification — Design Document

**Version:** 0.1 draft  
**Home:** latest.dev  
**Status:** Pre-RFC

---

## Overview

Latestfile is an open specification for declaring how a developer, team, or organization uses AI in their development workflow. It is a **profile/identity artifact** — it describes the actor, not a project. A Latestfile travels with the person or org, not the codebase.

The format uses HCL-inspired named entity blocks: typed, named resources with cross-references between them. Files are human-readable, machine-parseable, diffable, and version-controlled.

The v1 deliverable is this specification (an RFC). No tooling, registry implementation, builder UI, or analytics layer is in scope for v1.

---

## Motivation

AI-assisted development is becoming central to how software is built, but there is no standard way to declare an AI setup in a form that travels with the developer or organization. Existing artifacts — dotfiles, CLAUDE.md, Cursor settings, MDM policies, CI rules — each capture a slice, but none describe the whole picture in a portable, diffable format.

Latestfile is a portable declaration of how a person, team, or organization uses AI in development. The v1 deliverable is the file format itself. Downstream uses — sharing, validation, comparison, rendering, outcomes correlation — are enabled by the format but are not delivered by this specification.

---

## Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## Core Concepts

### Portable Declaration

A Latestfile is a portable declaration of an AI development setup — which tools, which models, which workflows, which instructions. Unlike repo-level config (a `package.json`, a `.cursorrules`) which describes a project, a Latestfile describes the actor and travels with them across projects.

This positions Latestfile alongside, not in place of, existing configuration artifacts. CLAUDE.md, `.cursorrules`, IDE settings, MDM policies, and CI rules each remain authoritative for their domains. A Latestfile *references* those artifacts (e.g., via the `instructions` block) and declares the higher-level shape of a setup: who uses what, with which models, in which workflows.

### Composition Over Inheritance

Latestfiles compose. An individual's Latestfile can import an org's Latestfile via a named context. The org file defines what the org provides — its approved tools, models, workflows, and instructions. The individual file describes their personal baseline. The composed result — identity plus context — is the effective setup for a given situation.

### Contexts

A single individual operates in multiple contexts: at home with personal tools, at work with enterprise tools and org-provided resources. Contexts are named compositions within a personal Latestfile that reference external org or team files.

### Composition Model

Two scopes compose at runtime when tooling reads Latestfiles:

| Scope | Provides |
|---|---|
| Personal | Baseline identity — tools, models, workflows, contexts, instructions |
| Org / Team (imported via `context.import`) | Approved tools, models, workflows, enterprise context |

The composition rules:

1. A personal Latestfile is the entry point. Tooling resolves the active `context` (e.g., `home`, `work`) to determine which entities are in scope.
2. If the active context declares an `import`, the imported org/team Latestfile is layered in. Entities declared in the org file are referenced via `org.*` and combine with the personal set declared in the context.
3. In v0.1, no level overrides the vendor field values of entities defined at another level. A `tool` block's vendor config (e.g., `privacy_mode`) is authoritative wherever the block is defined. Whether to allow context-level overrides is an open question for future versions (see below).

---

## File Format

### Scope and File Location

A Latestfile is self-describing via a REQUIRED top-level `scope` field. The spec does not prescribe where personal, team, or org Latestfiles live in version control — that is the author's choice. Identity for sharing and importing comes from the registry (see Registry section), not from file location. Project Latestfiles are the one exception: they live in the codebase they describe and are discovered by convention (see Project-Level Discovery below).

```hcl
latestfile_version = "0.1"
scope              = "personal"   # | "team" | "org" | "project"
```

The `scope` field MUST be one of `"personal"`, `"team"`, `"org"`, or `"project"`. The scope determines what content is valid in the file (see Entity Types).

| Scope | Content Constraints |
|---|---|
| `personal` | `tool`, `model`, `workflow`, `instructions`, `context` blocks valid. MUST contain exactly one `profile` block. |
| `team` | `tool`, `model`, `workflow`, `instructions`, `context` blocks valid. MUST contain exactly one `profile` block. |
| `org` | `tool`, `model`, `workflow`, `instructions`, `context` blocks valid. MAY contain at most one `profile` block. |
| `project` | `tool`, `model`, `workflow`, `instructions` blocks valid. MUST NOT contain `context` or `profile` blocks. |

A project Latestfile describes the project-side AI setup: which CLAUDE.md / .cursorrules / AGENTS.md the project provides, which tools or models are recommended for working in this codebase, and which workflows apply. It does not declare an actor, and it does not compose other Latestfiles — composition happens at the actor (personal/team/org) level.

### Project-Level Discovery

Project Latestfiles are the one exception to "file location is the author's choice." Because a project Latestfile describes a specific codebase, tooling that operates inside a codebase MUST discover it by checking for `.latestfile` at the repository root. The repository root is identified as the nearest enclosing directory containing a `.git` directory. Tooling MUST NOT walk past the repository root in search of a project-level Latestfile.

Example project Latestfile:

```hcl
latestfile_version = "0.1"
scope              = "project"

instructions "claude-code" {
  source = "./CLAUDE.md"
}

instructions "cursor" {
  source = "./.cursorrules"
}

workflow "tdd" {
  description = "This project follows test-driven development"
}
```

### Version Declaration

Every Latestfile MUST begin with a version declaration:

```hcl
latestfile_version = "0.1"
```

The value MUST be a string matching the pattern `^[0-9]+\.[0-9]+$` — two non-negative integers separated by a period, `MAJOR.MINOR`. The spec deliberately does not use full semver: clarification-only updates ship as errata against an existing `MAJOR.MINOR` version rather than as a patch bump. See the Versioning and Evolution section for what triggers a MAJOR vs. MINOR increment.

Parsers MUST tolerate unknown fields and unknown block types — they MUST NOT halt or error on them. This ensures forward compatibility as the spec evolves. Validators SHOULD warn when they encounter unknown block types or unknown fields within known blocks, since these are most often typos (e.g., `wrkflow` instead of `workflow`) rather than forward-compat extensions.

### Identifiers

Block names (the quoted label after the block type) MUST match the pattern `[a-zA-Z][a-zA-Z0-9_-]*`. Names containing hyphens MUST use bracket syntax in reference expressions:

```hcl
tool "claude-code" { ... }

# Reference using quoted syntax when name contains hyphens
uses = [tool["claude-code"]]

# Reference using dot syntax when name is alphanumeric/underscore only
uses = [tool.cursor]
```

Parsers MUST support both reference forms.

### Error Handling

A conformant parser MUST distinguish between two error classes:

- **Parse error** — the file is not valid syntax (malformed block, unclosed brace, invalid assignment). Parsers MUST halt and report the location.
- **Validation error** — the file is syntactically valid but violates a normative constraint (undefined reference, reserved field used as vendor field, content disallowed at the declared `scope`). Parsers SHOULD collect and report all validation errors before halting.

Unknown block types and unknown fields within known blocks are NOT parse or validation errors. Parsers MUST tolerate them. Validators SHOULD report them as warnings to surface typos.

---

## Entity Types

The spec defines seven first-class resource types. Each is a named block. Duplicate block names within the same type are a validation error.

### `tool`

An AI tool in use. The `from`, `version`, and `provider` fields are reserved. All other fields are vendor-defined and MAY be validated against the vendor's published schema at `latest.dev/registry` (see Registry section).

```hcl
tool "claude-code" {
  from     = "registry:anthropic/claude-code"
  version  = ">=1.0"
  provider = "anthropic"
}

tool "cursor" {
  from         = "registry:anysphere/cursor"
  version      = ">=0.45"
  provider     = "anysphere"
  autocomplete = true
  privacy_mode = false
}
```

The `from` field is OPTIONAL. When present, it MUST use the `registry:` URI scheme: `registry:[<host>/]<namespace>[/<name>][@<version>]`. The `<host>` defaults to `latest.dev` when omitted. See the Registry section for the full URI grammar. Parsers MUST NOT require registry resolution to parse a file; a missing or unreachable registry is not a parse or validation error.

A `tool` block without `from` is valid. It declares a tool that has no canonical registry definition (e.g., a proprietary internal tool, a fork, or a tool whose vendor has not registered). Such tools have no vendor schema available, so their vendor fields cannot be validated. Tooling MAY surface this as informational signal.

The `version` field, if present, MUST be a semver constraint string.

### `model`

An AI model. The `from` and `provider` fields are reserved.

```hcl
model "claude-sonnet" {
  from     = "registry:anthropic/claude-sonnet-4-6"
  provider = "anthropic"
}

model "gpt4o" {
  from     = "registry:openai/gpt-4o"
  provider = "openai"
}
```

### `workflow`

A descriptive declaration of how AI fits into a development process. `workflow` blocks are informational in v1 — they carry no enforcement semantics. References to tools and models are for documentation and correlation purposes only.

```hcl
workflow "feature-development" {
  description = "End-to-end AI-assisted feature work"
  uses        = [tool["claude-code"], tool.cursor]
  models      = [model["claude-sonnet"]]
}

workflow "code-review" {
  description = "AI-assisted PR review"
  uses        = [tool["claude-code"]]
  models      = [model["claude-sonnet"]]
}
```

### `instructions`

A reference to AI instructions or system prompts used in this setup. Informational in v1.

```hcl
instructions "global" {
  source     = "./CLAUDE.md"
  applies_to = [tool["claude-code"]]
}
```

The `source` field MUST be a relative file path (relative to the Latestfile's location) or an `https://` URL. Parsers MUST NOT fetch remote URLs during parsing. The `source` field is informational; parsers MUST NOT read or validate the referenced file.

### `context`

A named composition of this identity with an external org or team Latestfile. The `import` field is OPTIONAL; a context without `import` describes a standalone composition using only locally defined entities.

```hcl
context "home" {
  tools  = [tool["claude-code"]]
  models = [model["claude-sonnet"]]
}

context "work" {
  import = "registry:acme@v1.2"
  tools  = [tool["claude-code"], tool.cursor]
  models = [model["claude-sonnet"], org.model["gpt4-azure"]]
}
```

**The `import` field** MUST be a registry URI of the form `registry:[<host>/]<namespace>[/<name>][@<version>]`. See the Registry section for the URI grammar. If `@<version>` is omitted, tooling SHOULD resolve to the latest published version and SHOULD warn that the import is unpinned. A context block MUST NOT have more than one `import` field.

**Import failure behavior.** If an imported Latestfile cannot be resolved (registry unreachable, namespace or name not found, version no longer published), tooling MUST treat references to `org.*` entities as unresolved validation errors. Tooling SHOULD continue parsing the rest of the file and report the import failure clearly. Tooling MAY cache resolved imports; cache invalidation is implementation-defined.

**Import trust.** The import mechanism follows the trust model of the registry transport. Tooling MUST use HTTPS for registry resolution and MUST validate TLS certificates. Signing and verification of imported Latestfiles are out of scope for v1.

**The `org.` prefix** is available only within a `context` block that declares an `import`. It accesses entities defined in the imported Latestfile. The supported forms are: `org.tool.<name>`, `org.model.<name>`, `org.workflow.<name>`, `org.instructions.<name>`. Referencing `org.*` without a declared `import` is a validation error.

Context blocks describe which entities are active in that context. They do not override the configuration of referenced entities — a tool's vendor fields are defined in the `tool` block and are the same across all contexts.

### `profile`

A declaration of the person or entity this file describes. Personal and team Latestfiles MUST contain exactly one `profile` block. Org Latestfiles MAY contain a `profile` block but MUST NOT contain more than one. Project Latestfiles MUST NOT contain a `profile` block (a project is not an actor; see File Format).

```hcl
profile "james" {
  role     = "engineer"
  contexts = [context.home, context.work]
}
```

The `role` field is a free-form string. Future spec versions MAY define a standard vocabulary.

---

## Relationships

Entities reference each other by block type and name. Dot syntax (`tool.cursor`) is valid when the name matches `[a-zA-Z][a-zA-Z0-9_]*`. Bracket syntax (`tool["claude-code"]`) MUST be used for names containing hyphens or other non-underscore non-alphanumeric characters. This rule applies to all reference forms including `org.` chain references — hyphenated entity names in imported files MUST use bracket syntax: `org.model["gpt4-azure"]`.

A reference to an undefined block is a validation error. Circular references are a validation error.

Cross-file references are ONLY permitted via the `org.` prefix within a `context` block that declares an `import`. There is no other mechanism for referencing entities across files in v1.

---

## Registry

A registry is an addressable service that hosts published Latestfiles and canonical entity definitions. `latest.dev` is the well-known public registry. Anyone — organizations, vendors, individuals — MAY operate their own registry (public or private) so long as it implements the URI resolution semantics defined here.

### URI Grammar

```
registry:[<host>/]<namespace>[/<name>][@<version>]
```

- `<host>` — optional registry hostname. Defaults to `latest.dev` when omitted. When present, MUST be a valid DNS hostname.
- `<namespace>` — REQUIRED publisher identifier. MUST match `[a-z0-9][a-z0-9-]*`.
- `<name>` — optional sub-identifier for namespaces that publish multiple Latestfiles or entity definitions. MUST match `[a-z0-9][a-z0-9-]*` when present.
- `<version>` — optional version pin. When the URI resolves to a Latestfile, MUST match the `latestfile_version` pattern (`MAJOR.MINOR`, optionally with a pre-release suffix). When the URI resolves to a tool or model, MUST be a semver-compatible version string.

Examples:

| URI | Resolves to |
|---|---|
| `registry:acme` | `latest.dev`, namespace `acme`, default Latestfile, latest version |
| `registry:acme@v1.2` | `latest.dev`, namespace `acme`, default Latestfile, version 1.2 |
| `registry:acme/engineering@v1.2` | `latest.dev`, namespace `acme`, `engineering` Latestfile, version 1.2 |
| `registry:registry.acme.com/main@v1.2` | private registry, namespace `main`, version 1.2 |
| `registry:anthropic/claude-code@1.0` | tool definition, namespace `anthropic`, name `claude-code` |

### Registry Content

A registry hosts two kinds of entries:

**Published Latestfiles** — full Latestfiles that organizations, teams, or individuals publish to make them importable. Publishing is what makes a Latestfile a stable identity that others can reference via `context.import`. Where the author keeps the source file (GitHub, GitLab, internal CMS, local disk) is unconstrained by this spec.

**Entity definitions** — canonical definitions of tools and models maintained by vendors (e.g., `registry:anthropic/claude-code`). A `from` field references one of these. Vendors MAY publish JSON Schemas for their vendor-specific fields; tooling MAY validate vendor fields against those schemas. Vendor schema registration is opt-in; files referencing unregistered tools are valid but their vendor fields are unvalidated.

### Out of Scope for v0.1

The publishing protocol, registry HTTP API, authentication, authorization, signing, and naming policy (who owns `acme` on `latest.dev`) are all out of scope for v0.1. The spec defines the URI form and the conceptual model; concrete registry implementations and their governance are deferred.

---

## Complete Example

```hcl
latestfile_version = "0.1"
scope              = "personal"

tool "claude-code" {
  from     = "registry:anthropic/claude-code"
  version  = ">=1.0"
  provider = "anthropic"
}

tool "cursor" {
  from         = "registry:anysphere/cursor"
  version      = ">=0.45"
  provider     = "anysphere"
  autocomplete = true
  privacy_mode = false
}

model "claude-sonnet" {
  from     = "registry:anthropic/claude-sonnet-4-6"
  provider = "anthropic"
}

workflow "feature-development" {
  description = "End-to-end AI-assisted feature work"
  uses        = [tool["claude-code"], tool.cursor]
  models      = [model["claude-sonnet"]]
}

workflow "code-review" {
  description = "AI-assisted PR review"
  uses        = [tool["claude-code"]]
  models      = [model["claude-sonnet"]]
}

instructions "global" {
  source     = "./CLAUDE.md"
  applies_to = [tool["claude-code"]]
}

context "home" {
  tools  = [tool["claude-code"]]
  models = [model["claude-sonnet"]]
}

context "work" {
  import = "registry:acme@v1.2"
  tools  = [tool["claude-code"], tool.cursor]
  models = [model["claude-sonnet"], org.model["gpt4-azure"]]
}

profile "james" {
  role     = "engineer"
  contexts = [context.home, context.work]
}
```

---

## Reserved Field Names

The following field names are reserved across all block types and MUST NOT be used as vendor-defined fields:

`from`, `version`, `provider`, `description`, `applies_to`, `uses`, `models`, `import`, `source`, `role`, `contexts`, `tools`, `scope`

---

## Security Considerations

**Path traversal.** The `instructions.source` field accepts relative file paths. Tooling that reads this field MUST resolve paths relative to the Latestfile's location and MUST NOT follow paths that escape the containing directory (e.g., `../../etc/passwd`).

**Remote URL fetching.** The `instructions.source` field accepts `https://` URLs. Tooling that fetches remote URLs MUST restrict requests to trusted origins and MUST NOT expose responses to untrusted parties. Parsers MUST NOT auto-fetch remote URLs without explicit user action.

**Registry resolution.** The `registry:` URI scheme is used by both `from` (in `tool` and `model` blocks) and `import` (in `context` blocks). Tooling that resolves registry URIs MUST use HTTPS and MUST validate TLS certificates. Tooling that supports private registries MUST allow operators to restrict which registry hostnames are trusted, and MUST NOT silently fall back to a public registry when a private one fails. Parsers that do not perform registry resolution are not affected.

---

## Versioning and Evolution

- The spec version is declared with `latestfile_version` at the top of every file.
- Parsers MUST tolerate unknown block types and unknown fields within known blocks. Validators SHOULD warn on them to catch typos.
- New reserved field names introduced in future spec versions will be listed in a migration guide.
- Breaking changes — removing block types, changing field semantics, tightening validation — require a major version increment.
- Additive changes — new block types, new optional fields — increment the minor version.

---

## Out of Scope for v1

The following are explicitly deferred:

- Registry implementation (the interface is defined here; the service is not)
- Builder UI for generating Latestfiles
- CLI validation tooling
- Analytics and outcomes correlation
- Policies, enforcement, and any prescription-style mechanisms (deferred to v0.2; v0.1 is purely descriptive)
- Team and org aggregation tooling
- Authentication or signing of Latestfiles
- Formal ABNF grammar (deferred to v1.0 RFC)

---

## Deferred to Future Versions

The following questions are intentionally left open in v0.1 and will be revisited in a future spec version:

1. **Context-level overrides of vendor fields** — should `context` blocks be allowed to override the vendor fields of a tool/model declared at the file level (e.g., different `privacy_mode` settings at work vs. home)? Deferred until real users hit the friction of context-invariant vendor fields. The v0.1 stance (Composition Model rule 3) is that vendor fields are authoritative wherever the entity is declared.

2. **Org-level spend and token limits** — should the spec define a standard way to express AI spend caps or token rate limits at the org level? Deferred until tool vendors converge on a common shape; current quota mechanisms vary widely per provider (per-key, per-tenant, per-deployment).
