# Your company has no idea how it uses AI

*A proposal for a portable AI-use declaration. Draft — feedback welcome.*

Ask ten engineers at your company how they use AI and you will get ten different answers, none of them written down anywhere you can find. One lives in Cursor with autocomplete on and privacy mode off. One drives Claude Code through a wall of custom CLAUDE.md rules. One pastes into a chat window and copies back. One quietly routes through a personal API key the security team has never heard of. Multiply that by every team, and you get the thing every leader is now asking about and nobody can answer: *how do we actually use AI here?*

This is not an idle question. It is the reason the ROI conversation has gone sour. Boards are asking where the returns are. Leaders want to set policy. Both run into the same wall: you cannot measure, guide, or improve a practice you cannot even see. AI adoption inside most organizations is invisible. It leaves no artifact. It does not travel. It cannot be diffed, compared, or reasoned about. So the strategy conversation happens on vibes, and the policy conversation happens in a vacuum.

We already solved this exact shape of problem before, several times.

## We know how to make invisible things legible

When package dependencies were an untracked mess, we got `package.json`. When infrastructure was hand-clicked in consoles, we got Terraform. When we needed machines to know what a page was about, we got `robots.txt` and `sitemap.xml`. When we wanted models to read our docs, we got `llms.txt`. None of these are clever. They are all the same move: take a practice that lived in people's heads and give it a small, portable, human-readable file that travels, diffs, and composes.

AI use has no such file. The artifacts we do have each capture a slice and stop there. CLAUDE.md and `.cursorrules` describe a project, not a person. IDE settings live on one laptop. MDM policies describe what is allowed, not what is actually used. A survey is a snapshot that is stale the moment it is collected. None of them travel with the developer across projects, and none of them compose from an individual up to a team up to an org.

## A Latestfile

So here is the proposal. A single declarative file that states how a developer, team, or organization uses AI. Not what they are allowed to do. What they actually do: which tools, which models, which workflows, which instructions. It describes the actor, so it travels with the person, not the codebase.

Here is a minimal one:

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

That is the whole idea in eight lines. It reads like config because it is config. It is version-controlled, diffable, and machine-parseable. And it composes: your personal file can import your org's file, so the org declares its approved tools and models once and every individual inherits them by reference. A team is the sum of its members' declarations. An org is the sum of its teams. Suddenly "how do we use AI here" is a query, not a guess.

The spec is deliberately narrow in v0.1. It describes; it does not prescribe. No policies, no enforcement, no mandates. That harder, more contested layer belongs in a separate document once the descriptive layer is stable and adopted. Describe first. Guide policy second. You cannot do the second without the first, and right now almost nobody has the first.

## The call

The full v0.1 spec is written and public. It uses RFC 2119 language, defines four scopes (personal, team, org, project), and specifies the composition model. It is a draft, and drafts get better with people poking at them.

Three things you can do:

1. **Read the spec.** Tell me where it is wrong. [link]
2. **Write your own Latestfile.** It takes two minutes. Here is mine, published in the open: [link]. If yours looks nothing like mine, that is the point, and I want to see it.
3. **Get a shareable profile.** I am building a generator that turns a Latestfile into a public profile page at `latest.dev/@you`, plus a registry so orgs can compose files by reference. Join the waitlist: [link]

If the artifact that made dependencies, infrastructure, and web crawling legible each became a small standard everyone quietly relies on, the artifact that makes AI use legible can too. That file does not exist yet. I think it should. Here is a first draft. Tell me what you would change.

*— [your name], latest.dev*
