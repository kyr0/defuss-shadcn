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
2026-10-06T13:37:26Z s=c273a037 DONE fp=8922bfa911e6 cov=75.6% paths=.claude-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md,Makefile(+735)
2026-10-06T13:37:26Z s=c273a037 FINDING src/components/cookie-consent/cookie-consent.ts Controller learn=test: tests/state-contract.test.ts calls el.api.settled() on every bound element of every interactive fixture.
2026-10-06T13:37:26Z s=c273a037 FINDING vitest.config.ts coverage.exclude (reverted) learn=none: nothing to guard - the measurement definition is stated in .agents/VERIFY.py and the paper.
2026-10-06T13:37:26Z s=c273a037 FINDING tests/state-contract.test.ts fixture discovery learn=test: the count assertion and the typecheck gate.
2026-10-06T13:37:26Z s=c273a037 FINDING .github/workflows/verify.yml (new) learn=none: unobserved until its first run on GitHub (YAML parses; every step passes locally) - the run URL is reported after the push.
2026-10-06T14:07:19Z s=c273a037 DONE fp=a598332f5a81 cov=75.6% paths=.claude-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md,Makefile(+735)
2026-10-06T14:07:19Z s=c273a037 FINDING package.json packageManager (bun@1.3.9) learn=none: CI itself is the check - setup-bun reads the version from package.json, so a mismatch fails stats.json fresh on the next run.
2026-10-06T14:15:59Z s=c273a037 DONE fp=0fc3aba24cdf cov=75.6% paths=.claude-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md,Makefile(+737)
2026-10-06T14:15:59Z s=c273a037 FINDING vitest.config.ts / tests/helpers.ts timeouts learn=none: the CI run itself; CI=1 locally passes the diagram test with the scaled limits.
2026-10-06T14:41:07Z s=c273a037 DONE fp=fd2ca951b1e6 cov=75.6% paths=.claude-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md,Makefile(+737)
2026-10-06T15:34:51Z s=c273a037 DONE fp=94472c5f6937 cov=75.6% paths=.claude-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md,Makefile(+737)
2026-10-06T16:16:20Z s=c273a037 FAIL prose,env.example
2026-10-06T16:43:45Z s=c273a037 DONE fp=14d71d421379 cov=75.6% paths=.claude-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md,Makefile(+1480)
2026-10-06T16:43:45Z s=c273a037 FINDING src/components/<section>/<name>/ (the move) learn=verifier: verify's new component sections gate (scripts/lib/component-sections.ts) fails a component outside its section, in another section or without section:, naming t
2026-10-06T16:43:45Z s=c273a037 FINDING the move itself (process) learn=test: the link transforms are pinned in tests/skill.test.ts; verify's dist 1:1 gate compares the shipped skills and index through them.
2026-10-06T16:43:45Z s=c273a037 FINDING scripts/lib/type-baseline.ts (re-keyed) learn=none: the re-key script refused any changed count; the ratchet itself guards the future.
2026-10-06T16:46:15Z s=c273a037 DONE fp=15aa7f6de847 cov=75.7% paths=.claude-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md,Makefile(+1375)
2026-10-06T18:26:05Z s=c273a037 DONE fp=a7d10c5d0b08 cov=75.6% paths=.claude-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md,Makefile(+1378)
2026-10-06T18:26:05Z s=c273a037 FINDING src/shared/query.ts HostQuery (type root) learn=verifier: verify's component types (tsc ratchet) gate with an empty TYPE_BASELINE: any new error in any component fails.
2026-10-06T18:26:05Z s=c273a037 FINDING 45 components + component-state.ts + defuss-shadcn.d.ts (the 440 local errors) learn=verifier: the tsc ratchet (0 baseline) plus the strict typecheck; the byte comparison was a one-off probe for this change.
2026-10-06T18:26:05Z s=c273a037 FINDING scripts/lib/apps.ts initHooks learn=test: tests/apps.test.ts "sees a typed query the same (a type argument once hid dialog.js from the Notes app bundle)".
2026-10-06T18:26:05Z s=c273a037 FINDING scripts/verify.ts state API markers + dialog ownership claim learn=verifier: the gates failed by name on the typed source and pass now; verify runs on every build.
2026-10-06T18:26:05Z s=c273a037 FINDING src/components/data-display/calendar CalendarViewState (self-correction) learn=verifier: the tsc ratchet.
2026-10-06T18:26:05Z s=c273a037 FINDING src/types/defuss-shadcn.d.ts _defaultOpen learn=none: a shared stash name across components is a latent collision only if one element hosts both; no check looks for it.
2026-10-06T18:26:05Z s=c273a037 FINDING src/documentation/pages/paper.mdx section 5.9 learn=none: claim precision is a reading judgment; prose check 0 findings, the figures cite their sources.
2026-10-07T04:38:45Z s=c273a037 DONE fp=2ff6f9ea4f2d cov=75.6% paths=.claude-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md,Makefile(+1379)
2026-10-07T04:38:45Z s=c273a037 FINDING AGENTS.md "One owner per concern, explicit contracts" learn=none: a recommendation, not a gate; only the path-ownership part could be enforced by verify, and that was offered, not built.
2026-10-07T04:38:45Z s=c273a037 FINDING src/documentation/pages/paper.mdx section 10 (user corrections) learn=none: the figures cite the transcript; claim precision is a reading judgment beyond the prose check.
2026-10-07T04:38:45Z s=c273a037 FINDING src/components/papers/paper/paper.css .paper-tag[data-tag="verified"] learn=test: paper.e2e "VERIFIED is white text at >= 4.5:1, also on a theme whose chart-2 is light" - fails on the HEAD all.css (probe: 3.62 and black), passes now.
2026-10-07T04:38:45Z s=c273a037 FINDING src/documentation/pages/paper.mdx Figures 7 + 8 learn=none: inspected in light and dark screenshots (tmp/fig7-*.png, tmp/fig8-*.png); paper.e2e checks only that every chart mounts.
2026-10-07T05:44:47Z s=c273a037 DONE fp=1110eb257b5d cov=75.9% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+1419)
2026-10-07T05:44:47Z s=c273a037 FINDING skills/shadcn-{plan,theme,review} (new, generated) learn=verifier: verify's new `agent skills ↔ sources` gate (probe: a stale SKILL.md, a stray file and a TOKEN_RE drift each fail by name).
2026-10-07T05:44:47Z s=c273a037 FINDING scripts/lib/contrast.ts oklchToRgb (pre-existing bug) learn=test: tests/contrast.test.ts "gamma-encodes oklch: mid tones match the CSS Color 4 reference" (fails on the old code: 55 vs 128). The sidebar contrast gate still pass
2026-10-07T05:44:47Z s=c273a037 FINDING scripts/lib/theme-tokens.ts + theme-check.ts (new) learn=test: tests/theme-check.test.ts (THEME_TOKENS == token file, every rule, fixes reach the target, fjord passes clean); agent-skills.e2e runs the bundle under node.
2026-10-07T05:44:47Z s=c273a037 FINDING scripts/lib/markup-check.ts (new) - calibration learn=test: tests/markup-check.test.ts pins every rule and each precision fix; agent-skills.e2e: all 10 planted mistakes named, clean page passes.
2026-10-07T05:44:47Z s=c273a037 FINDING docs examples (real findings, not fixed here) learn=none: reported to the user as follow-up; no gate runs markup-check over the docs yet.
2026-10-07T05:44:47Z s=c273a037 FINDING tmp edit script corrupted markup-check.ts (process) learn=none: tsc + the unit tests + both calibrations reran green on the repaired file.
2026-10-07T05:44:47Z s=c273a037 FINDING .codex-plugin/plugin.json version 0.9.0 (pre-existing drift) learn=verifier: verify's version sites gate; tests/version-sites.test.ts lists both.
2026-10-07T05:44:47Z s=c273a037 FINDING src/skills/shadcn-theme/theme-preview.html learn=test: agent-skills.e2e "the theme preview renders the theme in light and dark, without an error".
2026-10-07T05:54:44Z s=c273a037 DONE fp=97d726be5537 cov=75.9% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+1419)
2026-10-07T07:03:44Z s=c273a037 DONE fp=8ee43161a910 cov=75.9% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+1445)
2026-10-07T07:03:44Z s=c273a037 FINDING src/components/primitives/typography .typeset (new) learn=test: typography.e2e: 4 new typeset checks (columns + rule + justify, Einzug, initial/small caps/ligatures, 44rem two columns vs 20rem one).
2026-10-07T07:03:44Z s=c273a037 FINDING src/components/papers/paper data-variant classic | minimal (new) learn=test: paper.e2e: classic, minimal and two-column checks incl. the phone padding (40px wide, 0px at 390px).
2026-10-07T07:03:44Z s=c273a037 FINDING src/components/data-display/iframe (new component) learn=test: iframe.e2e (14 checks incl. render contract; 3/3 runs green) + paper-gallery.e2e bridge checks.
2026-10-07T07:03:44Z s=c273a037 FINDING iframe.ts load + size races (self-found) learn=test: iframe.e2e: opaque-origin height via handshake, rejection without data-origins, container 300px, reduced motion; 3 consecutive green runs.
2026-10-07T07:03:44Z s=c273a037 FINDING src/shared/theme-links.ts + theme-switcher.ts (pre-existing bug) learn=test: tests/theme-links.test.ts "fetches the sidecar from the href a caller passes" (fails on the old code: 404 from the page folder); theme-switcher.e2e green.
2026-10-07T07:03:44Z s=c273a037 FINDING Paper Gallery: 10 TPL pages + parent (new) learn=test: paper-gallery.e2e drives each paper in its sandbox (12 checks); markup-check: 33 new example fences, 0 findings.
2026-10-07T07:03:44Z s=c273a037 FINDING paper-gallery.mdx card titles (self-found) learn=test: paper-gallery.e2e checks every paper is linked exactly once.
2026-10-07T07:03:44Z s=c273a037 FINDING README / index CSS-only stat + index pillar claim learn=verifier: verify's stats claim, CSS-only stat and README ↔ index gates.
2026-10-07T07:03:44Z s=c273a037 FINDING known sandbox noise (not fixed) learn=none: production serves the docs assets from jsDelivr (CORS *); not verified in this session.
