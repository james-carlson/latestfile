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

A project-level Latestfile may only declare `policy` blocks. It cannot declare tools, models, workflows, or contexts.

### Version Declaration

Every Latestfile must begin with a version declaration:

```hcl
latestfile_version = "0.1"
```

Parsers must ignore unknown fields rather than error. This ensures forward compatibility as the spec evolves.

---

## Entity Types

The spec defines seven first-class resource types. Each is a named block.

### `tool`

An AI tool in use. Core fields are reserved; all other fields are vendor-defined and validated against the vendor's published schema at `latest.dev/registry`.

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

Reserved core fields: `from`, `version`, `provider`. All other fields are vendor-owned.

### `model`

An AI model. References a canonical model definition from the registry.

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

A named description of how AI fits into a development process. References tools and models by block name.

```hcl
workflow "feature-development" {
  description = "End-to-end AI-assisted feature work"
  uses        = [tool.claude-code, tool.cursor]
  models      = [model.claude-sonnet]
}

workflow "code-review" {
  description = "AI-assisted PR review"
  uses        = [tool.claude-code]
  models      = [model.claude-sonnet]
}
```

### `instructions`

A reference to AI instructions or system prompts used in this setup. The `source` field points to a local file path or URL.

```hcl
instructions "global" {
  source      = "./CLAUDE.md"
  applies_to  = [tool.claude-code]
}
```

### `policy`

A rule governing AI tool behavior. Policies may restrict (deny) or require specific behavior.

```hcl
policy "no-ai-on-secrets" {
  description = "AI tools cannot read secret files"
  denies      = ["**/.env*", "**/secrets/**", "**/*.pem"]
  applies_to  = [tool.claude-code, tool.cursor]
}

policy "require-review-workflow" {
  description = "All PRs must use the code-review workflow"
  requires    = [workflow.code-review]
}
```

### `context`

A named composition of this identity with an external org or team Latestfile. Describes how the individual operates in a specific setting.

```hcl
context "home" {
  tools  = [tool.claude-code]
  models = [model.claude-sonnet]
}

context "work" {
  import = "github.com/acme/latestfile"
  tools  = [tool.claude-code, tool.cursor]
  models = [model.claude-sonnet, org.model.gpt4-azure]
}
```

The `import` field references an org or team Latestfile. Entities prefixed with `org.` are defined in the imported file.

### `profile`

A declaration of the person or entity this file describes.

```hcl
profile "james" {
  role     = "engineer"
  contexts = [context.home, context.work]
}
```

---

## Relationships

Entities reference each other by block type and name: `tool.claude-code`, `model.claude-sonnet`, `workflow.code-review`. References are validated at parse time — a reference to an undefined block is an error.

Org files may define entities that individuals reference with the `org.` prefix. This is the only cross-file reference mechanism in v1.

---

## Registry

`latest.dev/registry` hosts two kinds of entries:

**Core entity definitions** — canonical definitions of known tools, models, and providers. Referencing `registry:anthropic/claude-code` pulls the canonical definition so common fields don't need to be redeclared.

**Vendor schemas** — tool makers publish a JSON Schema for their vendor-specific fields. When a `tool` block references `registry:anysphere/cursor`, any fields beyond the reserved core are validated against Anysphere's published schema. Vendor schema registration is opt-in; files referencing unregistered tools are valid but vendor fields are unvalidated.

The registry interface (how vendors publish schemas, how resolution works) is defined by this spec. The registry implementation is out of scope for v1.

---

## Complete Example

```hcl
latestfile_version = "0.1"

# Tools
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

# Models
model "claude-sonnet" {
  from     = "registry:anthropic/claude-sonnet-4-6"
  provider = "anthropic"
}

# Workflows
workflow "feature-development" {
  description = "End-to-end AI-assisted feature work"
  uses        = [tool.claude-code, tool.cursor]
  models      = [model.claude-sonnet]
}

workflow "code-review" {
  description = "AI-assisted PR review"
  uses        = [tool.claude-code]
  models      = [model.claude-sonnet]
}

# Instructions
instructions "global" {
  source     = "./CLAUDE.md"
  applies_to = [tool.claude-code]
}

# Policies
policy "no-ai-on-secrets" {
  denies     = ["**/.env*", "**/secrets/**"]
  applies_to = [tool.claude-code, tool.cursor]
}

# Contexts
context "home" {
  tools  = [tool.claude-code]
  models = [model.claude-sonnet]
}

context "work" {
  import = "github.com/acme/latestfile"
  tools  = [tool.claude-code, tool.cursor]
  models = [model.claude-sonnet, org.model.gpt4-azure]
}

# Profile
profile "james" {
  role     = "engineer"
  contexts = [context.home, context.work]
}
```

---

## Reserved Field Names

The following field names are reserved across all block types and may not be used as vendor-defined fields:

`from`, `version`, `provider`, `description`, `applies_to`, `uses`, `models`, `import`, `source`, `denies`, `requires`, `role`, `contexts`

---

## Versioning and Evolution

- The spec version is declared with `latestfile_version` at the top of every file.
- Parsers must silently ignore unknown block types and unknown fields within known blocks.
- New reserved field names introduced in future versions will be listed in a migration guide.
- Breaking changes require a major version increment.

---

## Out of Scope for v1

The following are explicitly deferred:

- Registry implementation (the interface is defined here; the service is not)
- Builder UI for generating Latestfiles
- CLI validation tooling
- Analytics and outcomes correlation
- Enforcement mechanisms
- Team and org aggregation tooling
- Authentication or signing of Latestfiles

---

## Open Questions

1. Should `context` blocks be allowed to *override* personal tool config (e.g., different privacy settings at work), or only add new entities?
2. Should the spec define a standard way to express AI spend or token limits at the org level?
3. How should the spec handle tools that don't have a registry entry (custom internal tools)?
4. Should `profile` be implicit (one per file) rather than a named block?
