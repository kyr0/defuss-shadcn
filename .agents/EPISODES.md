# Episodes

<!-- Newest last. The gate appends FAIL|DONE|FINDING and keeps the last 100 entries (git keeps older ones).
Agents append `<UTC ISO> s=<session> LESSON <VAE-DIALECT>` only for a falsified HYPOTHESIS, a dead end, or a root cause.
A lesson recurring ≥2 → test | .agents/VERIFY.py rule | MEMORY line, then delete its lines. -->

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
2026-10-07T09:44:20Z s=c273a037 DONE fp=d544bdc71b5c cov=75.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+1451)
2026-10-07T09:44:20Z s=c273a037 FINDING src/components/primitives/typography .typeset (initial, captions, groups, leading) learn=test: typography.e2e: 7 new typeset checks (initial gap + capitals, lead variants, leading/tracking values, gaps, caption counters, groups, columns).
2026-10-07T09:44:20Z s=c273a037 FINDING separators: reuse, not a new one learn=test: separator.e2e "data-line=none"; typography.e2e gaps check includes a .separator.
2026-10-07T09:44:20Z s=c273a037 FINDING src/components/papers/paper/paper.css spacing + .paper-section.typeset learn=verifier: verify design tokens + paper.e2e (phone padding 40px → 0px); full-paper probe: no overflow at 1280 / 390 px.
2026-10-07T09:44:20Z s=c273a037 FINDING src/components/chat/session data-animate fade | slide + .session-token learn=test: session.e2e "data-animate" (transition properties per row, from-keyframe sides, tokens, reduced motion = none); 2 consecutive green runs.
2026-10-07T09:44:20Z s=c273a037 FINDING docs: session replay, VAE report swap + typeset, gallery papers learn=test: paper-gallery.e2e (12 checks, expectation for the capitals lead updated); prose check 0 findings on 21 files.
2026-10-07T09:44:20Z s=c273a037 FINDING system-in-numbers deck: two diagram slides + four skill slides learn=none: screenshots of slides 8, 9, 12, 14 inspected (tmp/papers/deck-*.png: both diagrams fit their frames after a full play); no page error; the unit test on the deck
2026-10-07T09:47:28Z s=c273a037 DONE fp=d4e966da9eb5 cov=75.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+1452)
2026-10-07T10:39:57Z s=c273a037 DONE fp=848b9ae1a76e cov=75.9% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+1454)
2026-10-07T10:39:57Z s=c273a037 FINDING src/components/diagrams/diagram draw() rebuilds (user: arrows flicker, animate twice) learn=test: diagram.e2e "a redraw within a step keeps the current wire": redraw mid-step → entered, 0 running animations, opacity 1 (fails on the old code: the animation re
2026-10-07T10:39:57Z s=c273a037 FINDING typography .typeset-group (subgrid, cards, divided, middle) learn=test: typography.e2e "figure groups": captions level, 1px lines wide and stacked, cards framed, and containerType normal / contain none pinned so containment cannot c
2026-10-07T10:39:57Z s=c273a037 FINDING statistics: section bundles + unit test files learn=test: tests/stats.test.ts (summary + passthrough; empty → zeros); verify's stat figures and stats.json fresh gates.
2026-10-07T10:39:57Z s=c273a037 FINDING index page prose learn=test: documentation.e2e CDN note; verify stats claim + README ↔ index gates (README footprint updated with it).
2026-10-07T10:39:57Z s=c273a037 FINDING deck: slide 4 (five splits), 10 (unit test files), 12-15 (cards, pitch text), 16 (defuss-vae + skills map) learn=none: renders of slides 4, 10, 12, 16 inspected (tmp/papers/deck-*.png); no page error; e2e covers the docs page only through the sandbox attributes.
2026-10-07T10:39:57Z s=c273a037 FINDING probe tooling (process) learn=none: why Playwright judged the elements unstable is not established; no product code depends on it.
2026-10-07T10:39:57Z s=c273a037 FINDING AGENTS.md "Work packages before a verify run" (user request) learn=none: a process rule; the gate cannot count pipeline runs. Prose check 0 findings.
2026-10-07T10:39:57Z s=c273a037 FINDING WebGL anti-aliasing (user request: FXAA for presentations) learn=none: grep over src/ (ts, tsx, mdx); any flicker on the CSS decks would need a named slide to measure.
2026-10-07T12:20:09Z s=c273a037 FAIL prose
2026-10-07T12:39:22Z s=c273a037 DONE fp=af96bf098461 cov=74.7% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+1478)
2026-10-07T12:39:22Z s=c273a037 FINDING src/components/wysiwyg-editors/editorjs (new component) learn=test: editorjs.e2e: 16 checks (builds requested exactly once from node_modules, never @latest; round trip byte-equal; bold / marker / inline code / heading / paragrap
2026-10-07T12:39:22Z s=c273a037 FINDING src/components/application/doc-comments (new component) learn=test: doc-comments.e2e: 13 checks (marks across <b>, 3rd occurrence, gone text; order by document position; reply nesting; escaped Markdown; mark / card / nav selecti
2026-10-07T12:39:22Z s=c273a037 FINDING scaffold-document-editor (new app) + scaffold-lean learn=test: scaffold-document-editor.e2e: 12 checks on app-document-editor.html with the builds served offline; scaffold-lean: 7/7 apps render as on the whole system (docum
2026-10-07T12:39:22Z s=c273a037 FINDING src/types/defuss-shadcn.d.ts stash name (self-found) learn=verifier: verify's component types ratchet: every file at baseline 0 again.
2026-10-07T12:39:22Z s=c273a037 FINDING README / index footprint learn=verifier: verify's stats claim, CSS-only stat, README ↔ index parity and commit window gates.
2026-10-07T15:45:25Z s=c273a037 DONE fp=232df28ad216 cov=74.7% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+1482)
2026-10-07T15:45:25Z s=c273a037 FINDING Document Editor: dark mode, toolbar toggles, sidebar (user findings) learn=test: editorjs.e2e: "toggles report the caret" (H1 presses nothing; bold only inside <b>) and "dark mode" (popover, search, + button: dark surface, light text, pixels
2026-10-07T15:45:25Z s=c273a037 FINDING Illustrative Diagram wires: lag, jump, snap on slides (user finding) learn=test: diagram.e2e: "a redraw within a step keeps the current wire element" (same element, same Animation objects, advanced, no stale) and "a node mid enter-animation"
2026-10-07T15:45:25Z s=c273a037 FINDING deck slide 4, index statistics, Standalone HTML, Anatomy page learn=test: tests/ui.test.ts index test (whole-KiB cards, no sentence); verify stats claim (README), README ↔ index parity + commit window, stat figures; slide 4 and index 
2026-10-07T15:45:25Z s=c273a037 FINDING deck slide 17: the turning ? aliases mid-rotation (user finding) learn=none: falsifier: slide 17 mid-turn still shows stair-stepped edges on the stroke - sampling during motion was not measured, only the static 62-degree frame.
2026-10-07T15:46:15Z s=c273a037 DONE fp=440412d0f3e1 cov=74.7% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+1483)
2026-10-07T15:46:15Z s=c273a037 FINDING every JS component (state configs) learn=verifier: verify's API docs gate fails without the map, on a state it lacks or adds, an undescribed state or field, and a declared field the code never names (tests/compo
2026-10-07T16:54:00Z s=c273a037 DONE fp=98f4febdc092 cov=74.7% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+1483)
2026-10-07T16:54:00Z s=c273a037 FINDING src/shared/component-state.ts (el.api / registry) learn=verifier: the API docs gate runs memberGaps over the shared members on every component.
2026-10-07T16:54:00Z s=c273a037 FINDING src/components/otp-input/component-skill.md learn=verifier: legacy namespace gate covers the docs agents read.
2026-10-07T16:54:00Z s=c273a037 FINDING diagram: slide 9 (the proof loop) flickered at ~3 Hz (user finding) learn=test: diagram.e2e "a redraw of an unchanged diagram is idempotent" (labels and padding equal across two draws, 0 draws in 1.5 s idle); deck probe: 0 draws in 7 s on s
