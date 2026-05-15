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

AI-assisted development is becoming central to how software is built, but there is no standard way to describe, share, or compare AI setups. A developer cannot easily communicate their setup to a colleague. An organization cannot reason about its AI posture across teams. There is no common language for correlating AI configuration choices with development outcomes.

Latestfile defines that language.

---

## Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## Core Concepts

### Identity, Not Configuration

A Latestfile describes *who you are* as an AI-augmented developer or organization — which tools you use, which models, which workflows, which policies. It is closer to a profile or identity document than a project config file.

### Composition Over Inheritance

Latestfiles compose. An individual's Latestfile can import an org's Latestfile via a named context. The org file defines what the org provides and requires; the individual file describes their personal baseline. The composed result — identity plus context — is the effective setup for a given situation.

### Contexts

A single individual operates in multiple contexts: at home with personal tools, at work with enterprise tools and org policies. Contexts are named compositions within a personal Latestfile that reference external org or team files.

---

## File Format

### File Name and Location

| Scope    | Canonical Location                                    |
|----------|-------------------------------------------------------|
| Personal | `~/.latestfile` or a personal dotfiles repo           |
| Team     | `github.com/<org>/<team>/latestfile`                 |
| Org      | `github.com/<org>/latestfile`                        |
| Project  | `<repo>/.latestfile` (optional, policies only)       |

A project-level Latestfile MUST only declare `policy` blocks. It MUST NOT declare `tool`, `model`, `workflow`, `instructions`, `context`, or `profile` blocks.

### Version Declaration

Every Latestfile MUST begin with a version declaration:

```hcl
latestfile_version = "0.1"
```

The value MUST be a string in `MAJOR.MINOR` format. Parsers MUST ignore unknown fields and unknown block types rather than error. This ensures forward compatibility as the spec evolves.

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
- **Validation error** — the file is syntactically valid but violates a normative constraint (undefined reference, reserved field used as vendor field, project-level file containing a non-`policy` block). Parsers SHOULD collect and report all validation errors before halting.

Unknown block types and unknown fields within known blocks are NOT errors. Parsers MUST silently ignore them.

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

The `from` field, if present, MUST use the `registry:` URI scheme: `registry:<namespace>/<name>`. The namespace and name MUST each match `[a-z0-9][a-z0-9-]*`. Parsers MUST NOT require registry resolution to parse a file; a missing or unreachable registry is not a parse or validation error.

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

### `policy`

A rule declaring intent about AI tool behavior. Policies are descriptive in v1 — they express intent but carry no enforcement mechanism. A future spec version may define enforcement semantics.

```hcl
policy "no-ai-on-secrets" {
  description = "AI tools cannot read secret files"
  denies      = ["**/.env*", "**/secrets/**", "**/*.pem"]
  applies_to  = [tool["claude-code"], tool.cursor]
}

policy "require-review-workflow" {
  description = "All PRs must use the code-review workflow"
  requires    = [workflow["code-review"]]
}
```

The `denies` field, if present, MUST be a list of glob patterns using the [gitignore glob syntax](https://git-scm.com/docs/gitignore#_pattern_format). Patterns are relative to the repository root when interpreted in a project context, and informational otherwise.

### `context`

A named composition of this identity with an external org or team Latestfile. The `import` field is OPTIONAL; a context without `import` describes a standalone composition using only locally defined entities.

```hcl
context "home" {
  tools  = [tool["claude-code"]]
  models = [model["claude-sonnet"]]
}

context "work" {
  import = "github.com/acme/latestfile"
  tools  = [tool["claude-code"], tool.cursor]
  models = [model["claude-sonnet"], org.model["gpt4-azure"]]
}
```

**The `import` field** MUST be a `github.com/<org>/<repo>` path pointing to a repository containing a `latestfile` file at its root. A context block MUST NOT have more than one `import` field.

**The `org.` prefix** is available only within a `context` block that declares an `import`. It accesses entities defined in the imported Latestfile. The supported forms are: `org.tool.<name>`, `org.model.<name>`, `org.workflow.<name>`, `org.policy.<name>`, `org.instructions.<name>`. Referencing `org.*` without a declared `import` is a validation error.

Context blocks describe which entities are active in that context. They do not override the configuration of referenced entities — a tool's vendor fields are defined in the `tool` block and are the same across all contexts.

### `profile`

A declaration of the person or entity this file describes. Personal and team Latestfiles SHOULD contain exactly one `profile` block. Org Latestfiles MAY omit it.

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

`latest.dev/registry` hosts two kinds of entries. The registry interface is defined here; the registry implementation is out of scope for v1.

**Core entity definitions** — canonical definitions of known tools, models, and providers. A `from = "registry:<namespace>/<name>"` field indicates that a canonical definition exists. Parsers MUST NOT require registry access to validate a file.

**Vendor schemas** — tool makers MAY publish a JSON Schema for their vendor-specific fields. When a `tool` block declares `from = "registry:anysphere/cursor"`, tooling MAY validate vendor fields against Anysphere's published schema. Vendor schema registration is opt-in. Files referencing unregistered tools are valid; their vendor fields are unvalidated.

---

## Complete Example

```hcl
latestfile_version = "0.1"

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

policy "no-ai-on-secrets" {
  description = "AI tools cannot read secret files"
  denies      = ["**/.env*", "**/secrets/**"]
  applies_to  = [tool["claude-code"], tool.cursor]
}

context "home" {
  tools  = [tool["claude-code"]]
  models = [model["claude-sonnet"]]
}

context "work" {
  import = "github.com/acme/latestfile"
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

`from`, `version`, `provider`, `description`, `applies_to`, `uses`, `models`, `import`, `source`, `denies`, `requires`, `role`, `contexts`, `tools`

---

## Security Considerations

**Path traversal.** The `instructions.source` field accepts relative file paths. Tooling that reads this field MUST resolve paths relative to the Latestfile's location and MUST NOT follow paths that escape the containing directory (e.g., `../../etc/passwd`).

**Remote URL fetching.** The `instructions.source` field accepts `https://` URLs. Tooling that fetches remote URLs MUST restrict requests to trusted origins and MUST NOT expose responses to untrusted parties. Parsers MUST NOT auto-fetch remote URLs without explicit user action.

**Registry resolution.** The `from` field uses a `registry:` URI. Tooling that resolves registry URIs MUST use HTTPS and MUST validate TLS certificates. Parsers that do not perform registry resolution are not affected.

---

## Versioning and Evolution

- The spec version is declared with `latestfile_version` at the top of every file.
- Parsers MUST silently ignore unknown block types and unknown fields within known blocks.
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
- Enforcement mechanisms for `policy` and `workflow` blocks
- Team and org aggregation tooling
- Authentication or signing of Latestfiles
- Formal ABNF grammar (deferred to v1.0 RFC)

---

## Open Questions

1. Should `context` blocks be allowed to *override* personal tool config (e.g., different privacy settings at work via vendor fields), or only add new entities?
2. Should the spec define a standard way to express AI spend or token limits at the org level?
3. How should the spec handle tools that don't have a registry entry (custom internal tools)?
4. Should `profile` be implicit (one per file) rather than a named block?
5. What is the resolution order when a personal `policy` and an imported org `policy` conflict — does org win, personal win, or is it a validation error?
6. Is one `profile` block per file required, or can a file have zero `profile` blocks (e.g., a pure org file)?
7. Should `latestfile_version` use semver or a simpler `MAJOR.MINOR` scheme?
