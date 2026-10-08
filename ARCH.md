# ARCH - How this framework scales with AI

`defuss-shadcn` is built for an era where **coding agents do the work**. The
scaling bottleneck is no longer writing components - it is *trusting* them.
This repo answers with programs that talk back: a verifier and other
agent-authored control programs check the work or select the next piece of
it, and return their findings to the agent as instructions. The agent acts
on them, and it can extend those programs when a task shows a gap. Lessons
that hold become tests, verifier rules or instructions that later sessions
inherit. A human sets the goal and the acceptance criteria and reviews
before every release.

The method has five parts. The
[technical report](https://kyr0.github.io/defuss-shadcn/paper.html)
(*Verified Agentic Engineering in Practice*) describes it in general terms
and measures it on this repository.

## 1. AGENTS.md - the philosophy/instruction layer

[`AGENTS.md`](AGENTS.md) tells a coding agent **how to work, what to
implement where, and why**: the native-web-platform-first rules (`<dialog>`,
popover, `:has()`, `@starting-style` - no libraries, no frameworks), the
component folder contract, the State API shape, the token boundary rule,
docs structure, and the authoring conventions. It is *teaching* - prose a
model reads before and while it works. Prose, however, is advisory: an agent
can misread it, skip it, or claim compliance. That is what the next layer is
for.

## 2. The deterministic verifier - an authority layer

[`scripts/verify.ts`](scripts/verify.ts) is a custom, code-implemented audit
of what prose cannot guarantee: **87 checks** (distinct `check()` labels, 2026-10-08) over the
shipped tree - skills exist (with discovery frontmatter), doc pages exist,
tokens are tweakcn-compatible, snippets match source, dist is a 1:1 build of
src, every declared state has a screenshot/skill/doc/e2e artifact,
cross-page imports are complete, links resolve, paths are portable, the
committed version has a changelog entry carrying its commit hash (AGENTS.md
"Changelog"), the generated dist/SKILL.md agent index matches the skills,
and more. Each check reads the *actual* files and computes its result;
nothing is taken on word.

Three properties make the verifier the loop's backbone:

- **It is the build gate.** `bun run build` compiles and then runs the
  verifier; `make build` runs the full pipeline ending in it plus the test
  suites. A build cannot "pass" while the verifier fails - there is no flag
  that skips it.
- **Its failure output is a repair instruction for the agent.** Every check
  prints, right after its failures, a `fix:` line naming the exact command,
  file, or template to apply - e.g. `fix: per component: 1) add fixture +
  test per tests/e2e/accordion.e2e.{ts,fixture.html}, 2) bun run e2e`. The
  verifier does not merely reject; it names the agent's next step. The
  agent's job reduces to: *edit → run → do what the output says → repeat.*
- **Its instructions *generate* missing artifacts.** The checks are coverage
  requirements, not style nits: add a component and the gates demand its doc
  page, skill, State-API states, screenshots per state, and e2e pair - each
  with a `fix:` line naming the template to copy. The task list comes from
  the verifier, not from the agent's memory of the conventions. This is how
  this repo's own test suite grew - the e2e rollout was a
  green-then-red-then-green walk down the
  `e2e smoke tests: tests/e2e/{name}.e2e.ts missing` list until all 55
  pairs of the fork existed and the ratchet could be promoted to a hard gate.
  A component's e2e pair cannot be skipped without failing the build.

## 3. AGENTS.md defers: verifier output is authoritative

AGENTS.md stresses that when prose and verifier disagree, **the verifier
wins** - its `fix:` lines are the work queue, and the legacy "warn-ratchet"
lists it still tolerates are migration debt it names explicitly, not license
to ignore it. The two files are one system: prose explains the *why*, the
verifier enforces the *what*, and prose points at the verifier as the final
word (`bun run verify` is the single "am I done?" question).

The verifier is one controller among several. The
[defuss-vae](https://github.com/kyr0/defuss-vae) gate wraps it (its repair
lines read `AGENT_CMD: FIX ...`), and its document walk hands the agent one
part of a page at a time with the review rules and a `NEXT:` command. The
agent writes and extends such programs itself: a new requirement arrives
with its check (a component-sections gate for a new folder layout), and a
gap a change exposes gets one when it can be stated as a check (a
rendered-page audit after a missed API field, a source scanner taught a new
syntax). Lessons that hold across tasks become tests, verifier rules or
AGENTS.md instructions; [`.agents/MEMORY.md`](.agents/MEMORY.md) keeps the rest within a fixed
4 KiB budget, so the injected memory stays bounded while the executable
checks grow.

## 4. The surrounding gates - checking behavior, quality and appearance

The verifier checks *consistency*. The loop wraps it with gates that check
*behavior, quality, and appearance*:

| Gate | Tool | Proves |
| --- | --- | --- |
| Lint | oxlint (`bun run lint`) | src/, tests/, scripts/ stay warning-clean |
| Type-check | strict `tsc --noEmit` | tests/ and scripts/ compile |
| Unit/integration | Vitest browser mode (`bun run test:run`) | real doc pages in a real Chromium iframe behave |
| E2E | one standalone Playwright script per component and docs flow (`bun run e2e`; 254 files on 2026-10-08) | every component's documented surface - interactions, keyboard, computed CSS - plus the doc site itself (renders, SPA nav, search) |
| Screenshots | `bun run screenshots` | every declared **state × light/dark** PNG exists, is fresh vs. its input fingerprint, and the render manifest hash-detects drift |
| Git hygiene | verify check #16 (a warning) | names uncommitted changes, so a green build is not mistaken for committed work |

Screenshots close part of the gap between machine checks and visual truth:
they are generated by driving each component's own `api.setState()`, hashed
into [`screenshots/manifest.json`](screenshots/manifest.json) alongside the
fingerprint of the inputs that produced them, and re-checked on every build
(stale or silently-drifted PNGs fail the build). What the loop guarantees
mechanically is *evidence of appearance*: for every state, a current PNG of
the shipped rendering exists on disk. The agent - itself a vision-language
model - can open those PNGs through its harness, and a person can review
them. That inspection is not a gate: no step compares a screenshot with an
earlier one, and no check requires anyone to look. Judging whether a state
looks right - and taste in general - stays with review, and a stable
property a review finds can become a check of its own.

## The proof loop

```diagram
{
  "type": "flow",
  "eyebrow": "The proof loop",
  "title": "The verifier's output is the work order",
  "steps": true,
  "interactive": true,
  "autoplay": true,
  "cols": 5,
  "nodes": [
    {
      "id": "agents",
      "name": "AGENTS.md",
      "meta": "conventions · defers to the verifier",
      "col": 1,
      "row": 1,
      "step": 1
    },
    {
      "id": "agent",
      "name": "Coding agent",
      "meta": "edits src/ · extends checks",
      "col": 2,
      "row": 1,
      "tone": "accent",
      "step": 2
    },
    {
      "id": "build",
      "name": "make build",
      "meta": "the whole pipeline",
      "col": 3,
      "row": 1,
      "shape": "pill",
      "step": 3
    },
    {
      "id": "lint",
      "name": "oxlint · typecheck",
      "col": 1,
      "row": 2,
      "step": 4,
      "eyebrow": "Gate"
    },
    {
      "id": "compile",
      "name": "compile src → dist",
      "meta": "1:1 build",
      "col": 2,
      "row": 2,
      "step": 4,
      "eyebrow": "Gate"
    },
    {
      "id": "shots",
      "name": "Screenshots",
      "meta": "every state × light/dark",
      "col": 3,
      "row": 2,
      "step": 4,
      "eyebrow": "Gate"
    },
    {
      "id": "verify",
      "name": "verify.ts",
      "meta": "consistency gates · fix: lines",
      "col": 4,
      "row": 2,
      "step": 4,
      "eyebrow": "Gate"
    },
    {
      "id": "tests",
      "name": "Vitest · e2e",
      "meta": "real pages, real Chromium",
      "col": 5,
      "row": 2,
      "step": 4,
      "eyebrow": "Gate"
    },
    {
      "id": "pass",
      "name": "All gates pass?",
      "col": 5,
      "row": 3,
      "shape": "diamond",
      "step": 5
    },
    {
      "id": "order",
      "name": "Verifier output is the work order",
      "col": 4,
      "row": 3,
      "tone": "warn",
      "step": 6
    },
    {
      "id": "evidence",
      "name": "Visual evidence",
      "meta": "current PNG per state",
      "col": 5,
      "row": 4,
      "step": 7
    },
    {
      "id": "review",
      "name": "Looks right?",
      "meta": "agent inspection · human review",
      "col": 4,
      "row": 4,
      "shape": "diamond",
      "step": 8
    },
    {
      "id": "done",
      "name": "Accepted",
      "meta": "committed · reviewed before release",
      "col": 3,
      "row": 4,
      "shape": "pill",
      "tone": "ok",
      "step": 9
    }
  ],
  "edges": [
    {
      "from": "agents",
      "to": "agent",
      "label": "rules"
    },
    {
      "from": "agent",
      "to": "build",
      "label": "runs"
    },
    {
      "from": "build",
      "to": "lint"
    },
    {
      "from": "lint",
      "to": "compile"
    },
    {
      "from": "compile",
      "to": "shots"
    },
    {
      "from": "shots",
      "to": "verify"
    },
    {
      "from": "verify",
      "to": "tests"
    },
    {
      "from": "tests",
      "to": "pass"
    },
    {
      "from": "pass",
      "to": "order",
      "label": "no",
      "line": "dashed"
    },
    {
      "from": "order",
      "to": "agent",
      "label": "fix",
      "line": "dashed",
      "tone": "accent"
    },
    {
      "from": "pass",
      "to": "evidence",
      "label": "yes"
    },
    {
      "from": "evidence",
      "to": "review"
    },
    {
      "from": "review",
      "to": "agent",
      "label": "visual defect",
      "line": "dashed"
    },
    {
      "from": "review",
      "to": "done",
      "label": "yes",
      "tone": "accent"
    }
  ],
  "style": "--diagram-col-min:6.5rem;--diagram-node-w:9rem;--diagram-gap-x:2.75rem"
}
```



(The mechanically enforced gates end at "all gates pass"; the screenshot set
is the loop's *evidence of appearance*. Looking at those PNGs - by the agent
or a person - is the review step after it, and it stays outside the
deterministic build: model inference is not reproducible, and taste is not a
predicate.)

No build flag skips a gate, and the defuss-vae commit gate refuses a commit
while verification fails. A gate establishes what it encodes and nothing
more: unspecified behavior and appearance stay with review, and a defect
found there becomes a new check when it can be stated as one. Human review
does not scale to an army of agents; a verifier that audits the built
tree, speaks repair instructions and grows with each lesson takes over the
part of review that can be written down.

## 5. Human expert final review before release

The human expert reviews the code, documentation and visual representation
after all quality gates have passed and the visual evidence has been
captured - right before a new version is released.

Should the human expert find any issues during this final review, the
feedback is fed back into the loop, and the agents must address it before a
new version can be released. If a regression or a new "unknown unknown"
fail case is discovered, the human expert either instructs the agent to add
a rule to AGENTS.md or lets the agent implement another verifier check - a
new static and deterministic quality gate that keeps the same issue from
slipping through in future iterations. A finding that is a matter of
preference - an appearance the specification never stated - is the
expert's decision; the agent applies it and encodes whatever part of it can
be checked.

Why the method is built this way:

1. The instructions and the verifier are plain files, not tied to one
   model. A model capable enough to read them, edit code and inspect
   screenshots can work under them; the session transcripts recorded since
   2026-09-27 show Claude models (Opus 5.5 and Fable 5.1) in Claude Code.

2. AGENTS.md and the verifier logic are decoupled from the model: neither
   names one, so a model change does not by itself require editing the
   agent's instructions or the verifier.

3. The human keeps oversight over both the development process (and can
   intervene in case of errors or unexpected behavior) and the release
   process, so that the quality gates stay meaningful, implemented changes
   are safe and correct, and the released version meets the standards the
   human expert set.

4. Spec-driven development works by creating plans or bug reports in the
   ./issues folder - decoupling the agentic engineering process from any
   third-party project management tool, while still giving the agents a
   clear and structured workflow - even in case the harness fails in the
   middle of an implementation loop.
