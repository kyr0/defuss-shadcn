# Episodes

<!-- Newest last. The gate appends FAIL|DONE|FINDING and keeps the last 100 entries (git keeps older ones).
Agents append `<UTC ISO> s=<session> LESSON <VAE-DIALECT>` only for a falsified HYPOTHESIS, a dead end, or a root cause.
A lesson recurring ≥2 → test | .agents/VERIFY.py rule | MEMORY line, then delete its lines. -->

2026-10-06T04:21:04Z s=c273a037 FAIL tests.integration.1,coverage
2026-10-06T04:24:01Z s=c273a037 FAIL coverage
2026-10-06T04:26:06Z s=c273a037 FAIL coverage
2026-10-06T04:35:21Z s=c273a037 DONE fp=0668175f4518 cov=30.2% paths=AGENTS.md,Makefile,README.md,plans/core-bundle.md(+183)
2026-10-06T04:35:21Z s=c273a037 FINDING .github/workflows/verify.yml (added by vae init) learn=verifier: .agents/VERIFY.py rule ci.no-vae-template fails if the template is re-added (proven: exit 0 now, exit 1 with the template line present).
2026-10-06T04:35:21Z s=c273a037 FINDING scripts/verify.ts:makeTargets learn=verifier: verify's own `doc command refs` gate runs the parser against the real Makefile + AGENTS.md references and passes.
2026-10-06T04:35:21Z s=c273a037 FINDING src/components/{border-layout,chart,cookie-consent,data-grid,data-tree,diagram,toast}/*.ts JSDoc learn=verifier: verify `API docs (JS components)` gate detects any hand-edited generated section.
2026-10-06T05:10:05Z s=c273a037 FAIL tests.integration.1
2026-10-06T05:32:40Z s=c273a037 FAIL tests.e2e.1
2026-10-06T06:59:28Z s=c273a037 DONE fp=d54415f7d963 cov=31.2% paths=AGENTS.md,Makefile,README.md,package.json(+310)
2026-10-06T06:59:28Z s=c273a037 FINDING src/components/tabs/tabs.ts:init learn=test: section-bundles.e2e compares data-init per element between a section load and the rest of the system (failed before, passes after).
2026-10-06T06:59:28Z s=c273a037 FINDING scripts/bundle.ts CSS comment learn=test: section-bundles.e2e renders every section in README order against the full system.
2026-10-06T06:59:28Z s=c273a037 FINDING scripts/deploy.sh (release ZIPs) learn=none: deploy.sh runs only on a real release; bash -n passes, behaviour unobserved until then.
2026-10-06T06:59:28Z s=c273a037 FINDING src/documentation/lib/component-api.ts:entriesOf learn=test: tests/component-api.test.ts "a comma inside a generic does not split a member".
2026-10-06T06:59:28Z s=c273a037 FINDING src/components/session/session.ts scroll members learn=verifier: API docs now render each argument type from the source; verify API docs + the tsc ratchet keep them true.
2026-10-06T06:59:28Z s=c273a037 FINDING src/types/defuss-shadcn.d.ts (panel / toast / win) learn=verifier: tsc -p tsconfig.components.json checks each namespace object against its declaration (missing / extra members error) - the component types ratchet.
2026-10-06T06:59:28Z s=c273a037 FINDING src/components/calendar/calendar.ts calendar:select learn=none: the gate checks that a description exists, not that it says something; reviewers judge wording.
2026-10-06T06:59:28Z s=c273a037 FINDING src/components/diagram/diagram.ts draw() learn=test: diagram.e2e "clearance" asserts >= 20px for every framed fixture diagram; a probe over all 256 framed canvases on the docs pages found 0 under 20px.
2026-10-06T07:51:05Z s=c273a037 FAIL tests.unit,coverage
2026-10-06T09:29:46Z s=c273a037 DONE fp=eabf1b45893f cov=31.6% paths=AGENTS.md,Makefile,README.md,package.json(+342)
2026-10-06T09:29:46Z s=c273a037 FINDING every JS component (state configs) learn=verifier: verify's API docs gate fails without the map, on a state it lacks or adds, an undescribed state or field, and a declared field the code never names (tests/compo
2026-10-06T09:29:46Z s=c273a037 FINDING src/shared/component-state.ts (el.api / registry) learn=verifier: the API docs gate runs memberGaps over the shared members on every component.
2026-10-06T09:29:46Z s=c273a037 FINDING src/components/otp-input/component-skill.md learn=verifier: legacy namespace gate covers the docs agents read.
2026-10-06T09:29:46Z s=c273a037 FINDING src/documentation/lib/component-api.ts typeMembers / typeEntries learn=test: tests/component-api.test.ts (17 cases) covers state contracts, quoted keys, nesting and the shared specialization.
2026-10-06T09:29:46Z s=c273a037 FINDING the previous review (process) learn=test: api-docs.e2e runs whenever src/ or scripts/ change.
2026-10-06T09:29:46Z s=c273a037 FINDING tests/e2e/sizing-layout.e2e.ts inDemo learn=test: the e2e itself: failed 1 of 2 runs before, passed 4 of 4 after.
2026-10-06T09:29:46Z s=c273a037 FINDING state config reads (limitation) learn=none: typing each apply() with its StateConfigs would let tsc check it - a change across 59 components, not made here.
2026-10-06T09:29:46Z s=c273a037 FINDING src/components/code-example/code-example.ts vpApply / vpZoomApply learn=test: code-example-docs.e2e check I traces diagram.html and fails when the bundles force as many style recalcs as there are cards (HEAD bundles: 40 for 12 - fails; no
2026-10-06T09:29:46Z s=c273a037 FINDING src/components/resizer/resizer.ts init learn=test: the same e2e check I counts forced recalcs from all.js too.
2026-10-06T09:29:46Z s=c273a037 FINDING src/components/code-example/code-example.ts vpApplyAll (self-review) learn=none: no fixture shows a stage whose scrollbar flips the justify decision; the order is documented inline.
2026-10-06T09:29:46Z s=c273a037 FINDING 59 src/components/*/*.ts StateConfigs + diagram.ts draw() learn=none: lint is non-blocking by project rule (AGENTS.md: no --deny-warnings), so only the clean-log discipline catches a new warning.
2026-10-06T09:42:50Z s=c273a037 FAIL env.example
2026-10-06T10:27:19Z s=c273a037 DONE fp=dad739255404 cov=31.6% paths=AGENTS.md,Makefile,README.md,package.json(+348)
2026-10-06T10:27:19Z s=c273a037 FINDING src/documentation/public/css/layout.css .site-sidebar (drawer) learn=test: documentation.e2e "mobile drawer" reads the winning declared height from the cascade (computed px cannot tell vh apart in emulation): fails on the old CSS ("cal
2026-10-06T10:27:19Z s=c273a037 FINDING tests/e2e/sizing-layout.e2e.ts demoBox learn=test: the e2e itself: failed once, then 3 of 3 passes.
2026-10-06T10:27:19Z s=c273a037 FINDING .env.example (missing) learn=verifier: the defuss-vae env.example check.
2026-10-06T10:27:19Z s=c273a037 FINDING src/documentation/pages/paper.mdx section 5.6 (self-review) learn=none: claim precision is a reading judgment; the prose catalog review is the check, no program can.
2026-10-06T10:27:19Z s=c273a037 FINDING src/documentation/pages/paper.mdx sections 6, 7, 5.7, 12 learn=none: a reading judgment; no mechanical check distinguishes an anecdote from a result.
2026-10-06T10:27:19Z s=c273a037 FINDING session figures supplied by the user (not written) learn=none: the figure came from a person, not a check; the paper cites the transcript as its source.
2026-10-06T10:36:18Z s=c273a037 FAIL tests.unit,tests.integration.1,tests.e2e.1,coverage
2026-10-06T10:51:22Z s=c273a037 DONE fp=cc61044c5727 cov=31.6% paths=.claude-plugin/plugin.json,AGENTS.md,Makefile,README.md(+733)
2026-10-06T10:51:22Z s=c273a037 FINDING session process (release v0.9.6) learn=memory: a second occurrence of .agents/MEMORY.md "ending a turn while a heavy background job runs"; no repo check can see a turn ending - the release now waits in the f
