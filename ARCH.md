# ARCH - How this framework scales with AI

`defuss-shadcn` is built for an era where **coding agents do the work**. The
scaling bottleneck is no longer writing components - it is *trusting* them.
This repo solves trust with a closed loop: every artifact an agent produces
passes through mechanical quality gates designed by a human senior software engineer, and the gates talk back to the AI agent in the form of executable instructions. An agent can reach "done" only by satisfying every gate; the goal is unreachable any other way.

The method has five parts.

## 1. AGENTS.md - the philosophy/instruction layer

[`AGENTS.md`](AGENTS.md) tells a coding agent **how to work, what to
implement where, and why**: the native-web-platform-first rules (`<dialog>`,
popover, `:has()`, `@starting-style` - no libraries, no frameworks), the
component folder contract, the State API shape, the token boundary rule,
docs structure, and the authoring conventions. It is *teaching* - prose a
model reads before and while it works. Prose, however, is advisory: an agent
can misread it, skip it, or claim compliance. That is exactly what the next
layer is for.

## 2. The deterministic verifier - an authority layer

[`scripts/verify.ts`](scripts/verify.ts) is a custom, code-implemented audit
of everything prose cannot guarantee: **41 check groups** over the shipped
tree - skills exist (with discovery frontmatter), doc pages exist, tokens are
tweakcn-compatible, snippets match source, dist is a 1:1 build of src, every
declared state has a screenshot/skill/doc/e2e artifact, cross-page imports are
complete, links resolve, paths are portable, the working tree is committed, the
committed version has a changelog entry carrying its commit hash (AGENTS.md
"Changelog"), the generated dist/SKILL.md agent index matches the skills,
and more. Each
check reads the *actual* files and computes the truth; nothing is taken on
word.

Two properties make the verifier the loop's backbone:

- **It is the build gate.** `bun run build` compiles and then runs the
  verifier; `make build` runs the full pipeline ending in it plus the test
  suites. A build cannot "pass" while the verifier fails - there is no
  flag that skips it.
- **Its failure output is a repair instruction for the agent.** Every check
  prints, right after its failures, a `fix:` line naming the exact command,
  file, or template to apply - e.g. `fix: per component: 1) add fixture +
  test per tests/e2e/accordion.e2e.{ts,fixture.html}, 2) bun run e2e`. The
  verifier does not merely reject; it converts any agent into a
  self-correcting one. The agent's job reduces to: *edit → run → do what
  the output says → repeat.*
- **Because it is authoritative, its instructions *generate* missing
  artifacts.** The checks are coverage requirements, not style nits: add a
  component and the gates immediately demand its doc page, skill, State-API
  states, screenshots per state, and e2e pair - each with a `fix:` line
  naming the template to copy. The agent is therefore *triggered to write
  new tests* (and docs, and fixtures) it never planned to write: the task
  list comes from the verifier, not from the agent's memory of the
  conventions. This is how this repo's own test suite grew - the e2e rollout
  was nothing but a green-then-red-then-green walk down the
  `e2e smoke tests: tests/e2e/{name}.e2e.ts missing` list until all 55
  pairs existed and the ratchet could be promoted to a hard gate. Coverage
  is self-propagating: a future agent cannot silently skip a test, because
  "test missing" is itself a build failure with instructions attached.

## 3. AGENTS.md defers: verifier output is authoritative

AGENTS.md stresses that when prose and verifier disagree, **the verifier
wins** - its `fix:` lines are the work queue, and the legacy "warn-ratchet"
lists it still tolerates are migration debt it names explicitly, not license
to ignore it. The two files are one system: prose explains the *why*, the
verifier enforces the *what*, and prose points at the verifier as the final
word (`bun run verify` is the single "am I done?" question).

## 4. The surrounding gates - suppressing hallucination, AI slop and overstating claims

The verifier checks *consistency*. The loop wraps it with gates that check
*behavior, quality, and appearance*:

| Gate | Tool | Proves |
| --- | --- | --- |
| Lint | oxlint (`bun run lint`) | src/, tests/, scripts/ stay warning-clean |
| Type-check | strict `tsc --noEmit` | tests/ and scripts/ compile |
| Unit/integration | Vitest browser mode (`bun run test:run`) | real doc pages in a real Chromium iframe behave |
| E2E | 56 standalone Playwright scripts (`bun run e2e`) | every component's documented surface - interactions, keyboard, computed CSS - plus the doc site itself (renders, SPA nav, search) |
| Screenshots | `bun run screenshots` | every declared **state × light/dark** PNG exists, is fresh vs. its input fingerprint, and the render manifest hash-detects drift |
| Git hygiene | verify check #23 | every verified byte is committed - what CI/other agents see is exactly what passed |

Screenshots close the last gap between machine checks and visual truth: they
are generated by driving each component's own `api.setState()`, hashed into
[`screenshots/manifest.json`](screenshots/manifest.json) alongside the
fingerprint of the inputs that produced them, and re-checked on every build
(stale or silently-drifted PNGs fail the build). What the loop guarantees
mechanically is therefore *proof of appearance*: for every state, a
byte-verified PNG of the shipped rendering exists and is on disk. The final
step - **a VLM reads those PNGs and reasons about whether each state looks
correct** - is the last gate, performed by the multimodal agent itself (or a
human) against the captured evidence. It is deliberately kept outside the
deterministic pipeline - model inference is non-reproducible and needs an API
key, so it cannot gate a build - but the loop's guarantee is what makes that
step trivial: the reviewer never has to wonder *which* render to look at or
whether it is current; the pipeline hands it every state, both schemes,
provably generated from the committed files. "Claims work" becomes "shown
working, to a viewer that can tell."

## The proof loop

```diagram
{
  "type": "flow",
  "eyebrow": "The proof loop",
  "title": "Trapped in the loop until the work is actually good",
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
      "meta": "edits src/",
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
      "meta": "byte-verified PNG per state",
      "col": 5,
      "row": 4,
      "step": 7
    },
    {
      "id": "review",
      "name": "Looks right?",
      "meta": "VLM / human review",
      "col": 4,
      "row": 4,
      "shape": "diamond",
      "step": 8
    },
    {
      "id": "done",
      "name": "Provably done",
      "meta": "committed · built · mirrored",
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

(The diagram is a JSON spec for the illustrative diagram component - on the docs site it plays step by step and every box and arrow can be clicked.)

(Mechanically-enforced gates end at "all gates pass"; the screenshot set is
the loop's guarantee of *evidence of appearance*. VLM reasoning over those
PNGs is the final review step - see the gate table above for why it lives
just outside the deterministic build.)

There is no exit into "done" that bypasses a gate. The agent is *trapped in
the loop until the work is actually good* - which is precisely the point:
human review does not scale to an army of agents, but a verifier that
audits every byte, speaks repair instructions, and is the only door out
does.

## 5. Human expert final review before release

The human expert only reviews the code, documentation and visual representation after all quality gates have passed and the visual evidence has been captured - right before a new version is released.

Should the human expert find any issues during this final review, the feedback is fed back into the loop, and the agents must address it before a new version can be released. If a regression or a new "unknown unknown" fail case is discovered, the human expert will either instruct the agent to add this to the AGENTS.md or let the agent implement yet another verifier logic to add a new static and deterministic quality gate, preventing the same issue from slipping through in future iterations.

As for the Agent Harness, this method has a huge advantage compared to more automated or harness-native solutions:

1. It doesn't matter what VLM model is used. As long as the model is capable enough, it can handle the task including multimodal reasoning and visual inspection of the screenshots.

2. AGENTS.md and the verifier logic are decoupled from the specific VLM model. This means that improvements or changes to the VLM model do not require modifications to the agent's instructions or the verifier, ensuring long-term maintainability and flexibility.

3. The human still has oversight over both the development process (and thus can intercept in case of errors or unexpected behavior) and the release process, ensuring that the quality gates are meaningful, implemented changes are safe and correct, and that the released version meets all of the desired standards, set by the human expert.

4. Spec-driven development is absolutely possible by simply creating plans or bug reports in the ./issues folder - decoupling the agentic engineering process from any 3rd party project management tool, while still maintaining a clear and structured workflow for the agents to follow - even in case the harness fails right in the middle of an  implementation loop.