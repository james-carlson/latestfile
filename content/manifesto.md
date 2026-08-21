# Proposing Precision: Giving AI Usage a Spec instead of a Sentence

## *An introduction to the `latestfile`, a new way to describe AI usage.*

###### **CONTENT**
1. [The problem](#1-the-problem)
1. [The `latestfile`: describing AI usage with precision](#2-the-latestfile-describing-ai-usage-with-precision)
1. [A sample `latestfile`](#3-a-sample-latestfile)
1. [Try it out!](#4-try-it-out-make-and-publish-your-own-and-give-me-feedback)
1. [Contribute](https://github.com/james-carlson/latestfile/blob/main/CONTRIBUTING.md)

### 1. The problem

Ask a few colleagues how they use AI, and you'll likely get a different answer from each one. That's interesting given how high the stakes seem right now. 

I think the force driving focus on AI use is the associated financial cost. The tools being made available from companies competing in the space were initially free or greatly subsidized. There's a few of those products left, but that is changing. End users are getting passed more of the costs required to create the technology as it gains its footing. With more time spent reflecting on the data and dollars gone by, a lot of people think it's time to start asking some harder questions.

Today's environment is rapid -- sometimes exhausting -- technological change. Whether it's the big-name companies produce foundational models and/or frontier solutions and products, or others mixing and matching features and combinations of components and capabilities, the enormous capital investments of yesterday have  yielded a market absolutely flooded with updates, releases, and changes today. [^1] 

There's likewise pressure to stay on top of it all. Yet, given the rapid pace of change, you can't expect that answers to questions today will hold and be the same in a few months (e.g., "What's the best tool for `x`?") In most cases people read and research when they can, adopt when they have the time, and haphazardly feel their way forward.

For example, for software engineers, there are a dizzying array of choices. One can live in Cursor with autocomplete on (and privacy mode off). Another can drive Claude Code through a wall of custom and private-to-them CLAUDE.md rules. Another may prefer to paste code or questions into a ChatGPT or Codex chat window, copying the output back out.

You multiply this variance by every team, and you can start to see the question organization leaders need to be asking amid the chaos: "How do we use AI here, and what is the impact?" Shareholders and boards want to know where the returns promised are showing up. Leaders want to set policies. Ultimately, it's difficult to measure o(or improve) something you can't see.[^2] 

AI use and adoption at most companies is easily attached to a visible (and painful) indicator of its use -- financial cost. But costs tell you, in general, about the *quantity* of usage, and much less about important *qualities of* or *differentiations in* usage. We are going to need insights about impact and outcomes of AI usage, and the outputs required along the way to get there. But our means for understanding usage are frankly  pretty limited at present.

We can try to describe our usage, but blind spots show up here like other self-reported endeavors. That means that despite AI being a popular topic of conversation, the influence mechanisms at play that will partially determine *how* you use AI aren't accurately or simply communicated. Not only will it be hard to understand our  usage today in light of how we've used it before, or how'll use it in the future, but we're also hamstrung in the difficult to convey to others in our organizations or online.

Bottom line? In a lot of places, fear of missing out on the AI goldrush is the ultimate thing driving strategy. Big decisions and expenditures are primarily happening based on vibes. Policies are being set from the hip, in a vacuum absent the information that would be insightful.

We can do better.

### 2. The `latestfile`: describing AI usage with precision

So, now it's your turn to answer the question: ***"How do __you__ use AI?"***  

Have you even had enough time to articulate a good answer? What are the elements? How have you used it today? How has your usage changed over the last week? Month? Quarter? What was the impact when you picked up that new skill, downloaded that new plugin, switched over to the new product, or paid for the "pro" level of that new service? If you're thinking your answer is a bit mushy, you're probably not alone. Think of the implications: should I base important decisions off of what you tell me? Conversely, how accurate is the information you are taking in? Do you take what you see or hear with a grain of salt, or at face value, and what should you be doing?

When we spend (hopefully *invest*) our time, effort, and money into the plethora of new tools being released or updated, *precision matters*. Without a precise understanding of someone's usage, the benefits, outcomes, payoffs, and ROI -- the things we're being promised and the things we are seeking -- are impossible to accurately attribute. 

To this point, there has not been a well-defined way to do that. AI usage has no standard description, no standard schema that works across products. There are some emerging conventions for attempting to influence usage - some for certain products (e.g., `CLAUDE.md`, and `.cursorrules`) and some intended to work across products (e.g. `AGENTS.md`). Product usage from the perspective of companies offering solutions in the space is  no doubt filling up databases with adoption metrics, engagement, retention, etc. 

But ultimately, until now, there has been nothing out there that describes AI usage in the way we actually need. 

That's where the `latestfile` comes in. A `latestfile` is a declaration of how you are intending to use AI, with a description made, precisely, with a syntax format. The official spec allows description for how individual employees, teams, or organizations use AI. The starting point is allowing people describe what they *intend* to do. These are questions that are generally easy to surface: What tools are you set up for? What models do you  have access to? Which models do you use? Which features of which products are you leveraging? 

Let's make this more concrete. Here's a minimal example:

### 3. A sample `latestfile`
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
Latestfiles describe things -- precisely -- from the perspective of an actor (human or agent). The description attaches to an identity (person or agent), but also allows for different scopes or contexts of that identity's use. (e.g. "I use Claude at work and Codex at home.") 

There is an extendable list of the different constructs that currently describe AI usage. Companies can also control what appears in an official `latestfile` registry, which can provide official listings of products, services, and features (and their descriptions).

These files can also mention and relate to each other, and be composed. That means your personal file can import your org's file, so the org declares its approved tools and models once and everyone inherits them by reference. A team where everyone is using a `latestfile` has a good sense of it's members' declarations. An organization can do the same thing by developing an understanding of its teams. "How do we use AI here" turns into a query with an answer (instead of just a guess).

This initial (v0.1) of [the spec](/spec) is deliberately narrow. It just puts boundaries on the descriptions. It doesn't allow for accumulation of usage data (such as telemetry) and it doesn't allow people to articulate policies. It starts deliberately small: what people are *intending* to do. That will open the door to measure what people  *actually* do. Perhaps the standard can even eventually articulate policy and enforce what people are *allowed*  to do. All of the potential here should start in a syntax backed by standardized technical specifications about how to describe what we're doing, so we can manage the chaos and complexity we find ourselves in. It's probably  not going away soon. 

Admittedly, for most of us, the `latestfile` format will seem a bit dry. Most people don't talk in this level of precision naturally. But, by giving some thought to the important structures in our AI world, and the relationships between them, adherence to a standard format for explanation allows both us and machines to better understand what we are and aren't benefitting from.

### 4. Try it out: Make and publish your own (and give me feedback!)

The `latestfile` idea is still a draft. I'm open to change and criticism, and I am inviting feedback with the  hope you'll share your thoughts to help me refine the idea.

1. **Try it out writing your own.** I get that the process of learning the syntax and writing things out is probably a non-starter for 99%+ of the population. Especially now that we are getting used to communicating with our computers in our natural language. So I built an interface that still delivers a `latestfile` but that just leaves you what you need. It only takes a few minutes to [use the builder that writes it for you](/new)! If you're able to capture your usage (or not) is super useful feedback at this point. I would love to hear your thoughts.
1. **Claim a namespace / profile.** If you want, you can turn your file into a shareable public profile at `latest.dev/@you`. You can show colleagues and even potential employers how you use AI. The official spot you claim can become part of your `latestfile`, which has advantages for future automation.
1. **Read the spec and tell me where it's wrong.** [It's here](/spec). If a technical spec like this is your kind of thing, please give the official spec a glance, a review, or even written feedback. I can use help to do the heavy lifting there. It's complete with RFC 2119 language, so buckle up. Or fire up your agent with a good prompt. Feel free to shoot me feedback [here](/feedback).  

*— James Carlson, latest.dev*

[^1]: Ironically, these products give the environment a reinforcing loop - using the tools enables you to more quickly deliver new products and services... some of which can be used to more quickly make more products and services.
[^2]: Not that everything can or ought to be measured. Metrics can be taken too far. See an excellent recent article on this by Mike Fisher: [Seeing Like a State](https://mikefisher.substack.com/p/seeing-like-a-state).