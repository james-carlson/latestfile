# Contributing

Latestfile is a v0.1 draft. It is meant to be argued with, and the most useful
thing you can do is tell me where it breaks.

There are three different kinds of contribution here, and they work differently.

## 1. The specification

`SPEC.md`, `schemas/`, and `examples/` are the normative artifacts. Changes to
them change what "a valid Latestfile" means, so they go through discussion
first.

**Open an issue before opening a pull request.** Use the *Spec feedback*
template. A good spec issue names the section, says what the current text
requires, and describes a real setup it fails to express. Pull requests that
rewrite normative language without a discussion thread will get turned into a
discussion thread anyway.

The spec uses [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) keywords.
MUST, SHOULD, and MAY mean what they mean there, so proposals should be
explicit about which one they intend.

Two things are out of scope by design, not by oversight:

- **Policy, enforcement, and governance.** v0.1 describes what people use; it
  does not prescribe what they are allowed to use. That layer is contemplated
  as a separate companion specification. "Add enforcement" is not a v0.1 issue.
- **Anything under "Deferred to Future Versions"** in SPEC.md. Those questions
  are open on purpose, pending real friction from real users. If you have hit
  that friction, say so — that is exactly the evidence that reopens them.

The composition model is where I am least confident. If your organisation's
setup does not roll up cleanly from individual to team to org, that is the most
valuable issue you can file.

## 2. The registry

The entity definitions under `/registry` say what
`from = "registry:anthropic/claude-code"` resolves to. They are currently
seeded by me and carry **no vendor authority**. See the Implementation Status
section of SPEC.md.

To add or correct one, open an issue with the *Registry entry* template. If you
work for the vendor, say so — vendor-supplied definitions take precedence over
anything I wrote.

A `tool` or `model` block without a `from` field is valid. You never need a
registry entry to describe your setup.

## 3. The site and tooling

Everything under `app/`, `lib/`, and `scripts/` is a reference implementation:
the builder, the validator, the registry pages, and latest.dev itself.

Bugs and improvements here can go straight to a pull request. No issue needed
first.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # also regenerates lib/embedded-artifacts.ts
```

Where the implementation and SPEC.md disagree, **the specification is correct
and the implementation is the bug.**

## Licensing

The specification is CC BY 4.0; the code is MIT. By contributing you agree your
contribution is licensed the same way. See `LICENSE` and `LICENSE-SPEC`.
