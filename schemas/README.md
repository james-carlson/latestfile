# Latestfile JSON Schema

`latestfile-v0.1.schema.json` is a JSON Schema (Draft 2020-12) describing
the canonical JSON form of a Latestfile. It validates the structural
shape of a file: required top-level fields, the value space of `scope`,
the identifier pattern for block names, the URI pattern for `from` and
`context.import`, and the semver-constraint pattern for `version`. It
does **not** perform semantic validation. The Latestfile specification
is the source of truth; this schema is a derived artifact.

## Usage

The canonical form is JSON. Files written in HCL2 native syntax MUST be
converted to the HCL2 JSON equivalent before schema validation.

With [`ajv-cli`](https://github.com/ajv-validator/ajv-cli):

```sh
ajv validate \
  --spec=draft2020 \
  -s schemas/latestfile-v0.1.schema.json \
  -d examples/personal/.latestfile.json
```

With Python `jsonschema`:

```python
import json
from jsonschema import Draft202012Validator

schema = json.load(open("schemas/latestfile-v0.1.schema.json"))
instance = json.load(open("examples/personal/.latestfile.json"))
Draft202012Validator(schema).validate(instance)
```

## What the Schema Validates

- The top-level object has the required fields `latestfile_version` and
  `scope`.
- `latestfile_version` matches `^[0-9]+\.[0-9]+$` (MAJOR.MINOR).
- `scope` is one of `"personal"`, `"team"`, `"org"`, `"project"`.
- The recognised top-level block-type containers — `tool`, `model`,
  `workflow`, `instructions`, `context`, `profile` — are objects when
  present.
- Block names (the keys inside each block-type container) match the
  identifier pattern `^[a-zA-Z][a-zA-Z0-9_-]*$`.
- Reserved fields on each block type have the expected primitive type
  (string, array of string references, etc.).
- `from` and `context.import` values match the `registry:` URI pattern.
- `version` values on `tool` and `model` blocks match the
  semver-constraint pattern.
- Unknown top-level fields and unknown fields within known blocks are
  permitted (`additionalProperties: true`), matching the spec's
  forward-compatibility rule that parsers MUST tolerate unknown fields
  and unknown block types.

## What the Schema Does NOT Validate (Semantic Validation Required)

A separate semantic validator is required for full spec conformance.
The schema deliberately leaves the following out of scope.

- **Cross-block reference resolution.** Fields such as `workflow.uses`,
  `instructions.applies_to`, `context.tools`, `context.models`, and
  `profile.contexts` are validated as arrays of strings, but the schema
  does not check that each reference resolves to a block defined in the
  file. A semantic validator must parse each reference, locate the
  target block by type and name, and report unresolved or circular
  references as validation errors.
- **Registry resolution.** A `from` or `context.import` value is
  validated against the URI pattern but the schema never contacts a
  registry. A semantic validator MAY resolve registry URIs to fetch
  imported Latestfiles or vendor entity definitions; failures are
  reported per the spec's Error Handling section.
- **Vendor field schemas.** Tool and model blocks accept arbitrary
  vendor-defined fields. The spec allows vendors to publish JSON Schemas
  for those fields at the registry, and tooling MAY validate against
  them. This federation is out of scope for the core schema; vendor
  fields are unconstrained here.
- **Scope-conditional content rules.** The spec's Scope and File
  Location section imposes rules that depend on the value of `scope`:
  - `personal` and `team` MUST contain exactly one `profile` block.
  - `org` MAY contain at most one `profile` block.
  - `project` MUST NOT contain `context` or `profile` blocks.

  These rules could be expressed with `if`/`then`/`else`, but the schema
  keeps the structural layer flat and defers them to semantic
  validation.
- **`org.` prefix rules.** Inside a `context` block, references using
  the `org.` prefix (e.g., `org.tool.<name>`) are only valid when the
  block declares an `import`. References themselves are strings to the
  schema; a semantic validator must inspect each `context` and reject
  `org.` references when no `import` is present.
- **File-level concerns.** Project Latestfile discovery (locating
  `.latestfile` at the repository root), HCL2-to-JSON conversion, and
  trust decisions about imported files are all outside the schema.

## Relationship to the Spec

The specification at
`docs/superpowers/specs/2026-05-15-latestfile-design.md` is the source
of truth. This schema is a derived artifact intended to catch the
largest, cheapest class of errors — structural malformation — at the
boundary of a toolchain. Where the schema and the spec disagree, the
spec governs and the schema is the bug.

## Version

This schema validates Latestfile v0.1. Subsequent MINOR revisions
within the 0.x line will be backwards-compatible with this schema's
permitted shapes; a MAJOR bump will ship as a new schema file.
