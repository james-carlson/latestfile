# Latestfile v0.1 Finalization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize the Latestfile v0.1 spec and produce the companion artifacts (JSON Schema + reference Latestfiles) that make the spec self-contained and validatable, without building any runtime tooling.

**Architecture:** The spec defines the format. The JSON Schema validates the canonical JSON representation of a Latestfile. Reference Latestfiles serve as both documentation and conformance test fixtures. All artifacts live in the same repo under `docs/superpowers/specs/`, `schemas/`, and `examples/`.

**Tech Stack:** Markdown (spec), JSON Schema 2020-12 (schema), HCL2 + canonical JSON form (Latestfile format).

**Spec source of truth:** `docs/superpowers/specs/2026-05-15-latestfile-design.md`

---

## Phase 1: Resolve Open Questions

The spec has 7 open questions. Each task here picks one, decides a v0.1 stance with the user, and either resolves the question in the spec or documents the explicit deferral.

### Task 1: Decide profile cardinality (Open Questions #4, #6)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-15-latestfile-design.md` (Profile section + Open Questions list)

- [ ] **Step 1:** Discuss with user: should personal/team files require exactly one `profile` block? Should org files require zero? Should `profile` become implicit (one per file, derived from file location)?

- [ ] **Step 2:** Update the Profile section with the decided cardinality rules using normative language (MUST/SHOULD/MAY).

- [ ] **Step 3:** Remove the resolved open questions from the Open Questions list.

- [ ] **Step 4:** Commit.

```bash
git add docs/superpowers/specs/2026-05-15-latestfile-design.md
git commit -m "Resolve profile cardinality in v0.1 spec"
```

### Task 2: Decide custom/internal tool handling (Open Question #3)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-15-latestfile-design.md` (Tool section + Open Questions list)

- [ ] **Step 1:** Discuss with user: how does the spec handle a `tool` block with no `from = "registry:..."` reference (internal tools, unregistered tools)? Default stance: tools without `from` are valid; they have no canonical definition and no vendor schema validation.

- [ ] **Step 2:** Update the Tool section to make `from` explicitly OPTIONAL, and clarify the behavior when it is omitted.

- [ ] **Step 3:** Remove the resolved open question.

- [ ] **Step 4:** Commit.

### Task 3: Decide `latestfile_version` format (Open Question #7)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-15-latestfile-design.md` (Version Declaration section + Open Questions list)

- [ ] **Step 1:** Discuss with user: stick with `MAJOR.MINOR` (currently specified) or full semver? Recommendation: stay with `MAJOR.MINOR` — it's simpler and we don't need patch-level distinctions for a spec.

- [ ] **Step 2:** Lock the decision into the Version Declaration section.

- [ ] **Step 3:** Remove the resolved open question.

- [ ] **Step 4:** Commit.

### Task 4: Decide policy conflict resolution (Open Question #5)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-15-latestfile-design.md` (Composition Model section + Open Questions list)

- [ ] **Step 1:** Discuss with user: when a personal `policy.denies` and an org `policy.requires` contradict (e.g., personal denies `db/migrations/**` but org requires `workflow.code-review` which touches migrations), who wins? Options: (a) org wins, (b) most restrictive wins (`denies` always trumps), (c) validation error.

- [ ] **Step 2:** Document the chosen rule in the Composition Model section.

- [ ] **Step 3:** Remove the resolved open question.

- [ ] **Step 4:** Commit.

### Task 5: Mark remaining questions as v0.2 deferrals

**Files:**
- Modify: `docs/superpowers/specs/2026-05-15-latestfile-design.md` (Open Questions section + cross-references)

The remaining questions after Tasks 1-4 are:
- OQ #1: Should `context` blocks override vendor field values?
- OQ #2: Standard way to express AI spend or token limits at org level?

- [ ] **Step 1:** Rename the section to "Deferred to Future Versions". Add a one-sentence rationale for each:
  - OQ #1: Defer until real users hit the constraint of context-invariant vendor fields.
  - OQ #2: Defer until tool vendors propose a standard shape (currently varies wildly per provider).

- [ ] **Step 2:** Audit the spec for prose that references "open question for future versions" (e.g., Composition Model rule #5 mentions OQ #1, and the policy accumulation rule references OQ #5). Update each callsite to point at the now-renamed "Deferred to Future Versions" section by name rather than by number.

- [ ] **Step 3:** Commit.

---

## Phase 2: Specify HCL ↔ JSON Equivalence

The JSON Schema validates JSON. The spec uses HCL. We need to make the relationship explicit so the schema is meaningful.

### Task 6: Add Canonical JSON Representation section to spec

**Files:**
- Modify: `docs/superpowers/specs/2026-05-15-latestfile-design.md` (new section after "File Format")

- [ ] **Step 1:** Add a new section "Canonical JSON Representation" stating that Latestfiles MAY be expressed in HCL2 syntax (canonical) or HCL2's equivalent JSON form. Either form is valid. The JSON form is what the v0.1 JSON Schema validates.

- [ ] **Step 2:** Include a small example showing the same `tool` block in both HCL and JSON form.

Example to include:

```hcl
tool "claude-code" {
  from     = "registry:anthropic/claude-code"
  version  = ">=1.0"
}
```

```json
{
  "tool": {
    "claude-code": {
      "from": "registry:anthropic/claude-code",
      "version": ">=1.0"
    }
  }
}
```

- [ ] **Step 3:** Reference HCL2's syntax specification (https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md) and its JSON equivalent (https://github.com/hashicorp/hcl/blob/main/json/spec.md) so we don't reinvent the grammar.

- [ ] **Step 4:** Commit.

```bash
git add docs/superpowers/specs/2026-05-15-latestfile-design.md
git commit -m "Specify HCL2 + canonical JSON equivalence in Latestfile spec"
```

---

## Phase 3: JSON Schema

### Task 7: Create the JSON Schema skeleton

**Files:**
- Create: `schemas/latestfile-v0.1.schema.json`

- [ ] **Step 1:** Create the schema file with `$schema`, `$id`, `title`, `description`, and the top-level structure (object with `latestfile_version` and the seven block types as properties).

- [ ] **Step 2:** Set `additionalProperties: true` at the top level (forward-compat: unknown block types are tolerated).

- [ ] **Step 3:** Require `latestfile_version` and enforce its pattern as `^[0-9]+\\.[0-9]+$`.

- [ ] **Step 4:** Commit.

```bash
git add schemas/latestfile-v0.1.schema.json
git commit -m "Add JSON Schema skeleton for Latestfile v0.1"
```

### Task 8: Add `tool` block definition to schema

**Files:**
- Modify: `schemas/latestfile-v0.1.schema.json`

- [ ] **Step 1:** Define the `tool` block as a `$defs` entry. It's a map from tool name (string matching identifier pattern) to object containing reserved fields (`from`, `version`, `provider`) plus open vendor fields (`additionalProperties: true`).

- [ ] **Step 2:** Enforce: `from` matches `^registry:[a-z0-9][a-z0-9-]*\\/[a-z0-9][a-z0-9-]*$` when present; `from` is optional (resolved in Task 2).

- [ ] **Step 3:** Reference the definition from the top-level schema.

- [ ] **Step 4:** Commit.

### Task 9: Add `model`, `workflow`, `instructions`, `policy`, `context`, `profile` definitions

**Files:**
- Modify: `schemas/latestfile-v0.1.schema.json`

- [ ] **Step 1:** For each remaining block type, add a `$defs` entry following the same pattern as `tool`. Match the reserved field list in the spec.

- [ ] **Step 2:** For `context`, encode the rule that `import` is optional and that the `org.` prefix is only valid when `import` is present. (Note: JSON Schema can't fully enforce cross-field reference semantics — flag this as a validation-tier rule, not a schema rule, in a comment.)

- [ ] **Step 3:** Wire all definitions into the top-level schema.

- [ ] **Step 4:** Commit.

```bash
git add schemas/latestfile-v0.1.schema.json
git commit -m "Add all block definitions to Latestfile JSON Schema"
```

### Task 10: Document schema limitations

**Files:**
- Create: `schemas/README.md`

- [ ] **Step 1:** Write a short README explaining what the schema does and doesn't validate:

  - Validates: file shape, required fields, format of `from`/`version`/identifier patterns
  - Does not validate: cross-block reference resolution, registry resolution, vendor field schemas, policy conflicts

- [ ] **Step 2:** Note that a conformant validator (a separate, out-of-v0.1-scope tool) is required for full semantic validation.

- [ ] **Step 3:** Commit.

---

## Phase 4: Reference Latestfiles

These serve as documentation and as fixtures for validating the schema is correct. Each example should be in both HCL and JSON form.

**Note on example file naming.** Each example is placed in a subdirectory matching its scope so that the file itself uses the canonical name from the spec (no invented `.latestfile` extension). Following HCL2's convention (`.tf` and `.tf.json`), the canonical JSON form is the same basename with a `.json` suffix.

| Scope | HCL file | JSON file |
|---|---|---|
| Personal | `examples/personal/.latestfile` | `examples/personal/.latestfile.json` |
| Team | `examples/team/latestfile` | `examples/team/latestfile.json` |
| Org | `examples/org/latestfile` | `examples/org/latestfile.json` |
| Project | `examples/project/.latestfile` | `examples/project/.latestfile.json` |

### Task 11: Personal reference Latestfile (HCL + JSON)

**Files:**
- Create: `examples/personal/.latestfile`
- Create: `examples/personal/.latestfile.json`

- [ ] **Step 1:** Discuss with user: should this be James's actual setup or a generic example? Recommendation: generic example labeled "Example: Solo Engineer" so it's shareable as a template.

- [ ] **Step 2:** Write the HCL version — must include `latestfile_version`, at least one tool, one model, one workflow, one `instructions`, one policy, two contexts (one with `import`, one without), and a `profile`.

- [ ] **Step 3:** Write the JSON equivalent.

- [ ] **Step 4:** Commit.

```bash
git add examples/personal/.latestfile examples/personal/.latestfile.json
git commit -m "Add personal reference Latestfile (HCL + JSON)"
```

### Task 12: Team reference Latestfile

**Files:**
- Create: `examples/team/latestfile`
- Create: `examples/team/latestfile.json`

- [ ] **Step 1:** Write a team Latestfile (fictitious "platform-team" at "acme") — should include team-required workflows, approved tools, and team-level policies. No `profile` block (team file).

- [ ] **Step 2:** Write the JSON equivalent.

- [ ] **Step 3:** Commit.

### Task 13: Org reference Latestfile

**Files:**
- Create: `examples/org/latestfile`
- Create: `examples/org/latestfile.json`

- [ ] **Step 1:** Write an org Latestfile (fictitious "acme") — should include enterprise-account references via vendor fields (e.g., `azure_tenant`), org-wide policies, org-approved tools.

- [ ] **Step 2:** Write the JSON equivalent.

- [ ] **Step 3:** Commit.

### Task 14: Project reference Latestfile

**Files:**
- Create: `examples/project/.latestfile`
- Create: `examples/project/.latestfile.json`

- [ ] **Step 1:** Write a project-level Latestfile — policies only, demonstrating the `denies` glob pattern. Should have a comment explaining the constraint that only `policy` blocks are allowed.

- [ ] **Step 2:** Write the JSON equivalent.

- [ ] **Step 3:** Commit.

### Task 15: Validate all examples against the schema

**Depends on:** Tasks 9 (schema complete) and 11-14 (all examples written). If Phase 4 is parallelized, this task must gate on all four example tasks.

**Files:**
- All `examples/*/latestfile.json` and `examples/*/.latestfile.json` files
- `schemas/latestfile-v0.1.schema.json`

- [ ] **Step 1:** Use any JSON Schema 2020-12 validator (e.g., `jsonschema` Python CLI, `ajv-cli`) to validate each `.json` example against the schema. Run with the user's available tooling — if no CLI is available, dispatch a subagent to do the validation.

- [ ] **Step 2:** Fix any mismatches between the schema and the examples. Bias toward fixing the schema, since the examples define what real Latestfiles should look like.

- [ ] **Step 3:** Commit any fixes.

- [ ] **Step 4:** Add a note to `schemas/README.md` listing the example files validated against the schema.

---

## Phase 5: Final Review and Lock

### Task 16: Cross-reference review

**Files:**
- All files touched in this plan

- [ ] **Step 1:** Read through the spec, schema, and examples end-to-end. Confirm:
  - Every reserved field name in the spec appears in the schema
  - Every block type in the spec appears in the schema and in at least one example
  - The HCL and JSON examples are semantically equivalent
  - No section of the spec references behavior that the examples or schema don't support

- [ ] **Step 2:** Fix any drift discovered. Commit each fix as its own commit.

### Task 17: Run spec through final reviewer pass

**Files:**
- `docs/superpowers/specs/2026-05-15-latestfile-design.md`
- `schemas/latestfile-v0.1.schema.json`
- `examples/*.latestfile*`

- [ ] **Step 1:** Dispatch a subagent reviewer with full context (spec + schema + all examples). Ask for final consistency check and any remaining ambiguities.

- [ ] **Step 2:** Address any feedback. Re-dispatch if needed (max 3 iterations).

- [ ] **Step 3:** Commit any fixes.

### Task 18: Tag v0.1

**Files:**
- Modify: `docs/superpowers/specs/2026-05-15-latestfile-design.md` (Status field)

- [ ] **Step 1:** Change `**Status:** Pre-RFC` to `**Status:** v0.1 (Draft Frozen, Not Yet Published)`.

- [ ] **Step 2:** Discuss with user whether to create a git tag (`spec-v0.1`) marking the freeze point.

- [ ] **Step 3:** Commit and tag if approved.

```bash
git commit -m "Freeze Latestfile spec at v0.1 (pending launch)"
git tag spec-v0.1
```

---

## Out of Scope for This Plan

- Publishing the spec anywhere public (latest.dev domain, GitHub registry, RFC track)
- Writing a validator CLI
- Writing an HCL → JSON converter
- Building the latest.dev website
- Any "social features" or adoption infrastructure
- Resolving the deferred-to-v0.2 open questions

These are explicitly future work, to be planned separately when launch strategy is ready.

---

## Estimated Effort

- Phase 1 (open questions): ~5 short user discussions + spec edits
- Phase 2 (HCL ↔ JSON): 1 spec section
- Phase 3 (JSON Schema): 1 schema file (~150 lines) + README
- Phase 4 (reference Latestfiles): 8 files (4 in HCL, 4 in JSON)
- Phase 5 (review and lock): 1 reviewer dispatch + tag

Total: ~3-5 working sessions if done linearly. Parallelizable: Phase 4 example writing can run in parallel.
