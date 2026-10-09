# Episodes

<!-- Newest last. The gate appends FAIL|DONE|FINDING and keeps the last 100 entries (git keeps older ones).
Agents append `<UTC ISO> s=<session> LESSON <VAE-DIALECT>` only for a falsified HYPOTHESIS, a dead end, or a root cause.
A lesson recurring ≥2 → test | .agents/VERIFY.py rule | MEMORY line, then delete its lines. -->

2026-10-06T14:07:19Z s=c273a037 FINDING package.json packageManager (bun@1.3.9) learn=none: CI itself is the check - setup-bun reads the version from package.json, so a mismatch fails stats.json fresh on the next run.
2026-10-06T14:15:59Z s=c273a037 FINDING vitest.config.ts / tests/helpers.ts timeouts learn=none: the CI run itself; CI=1 locally passes the diagram test with the scaled limits.
2026-10-06T16:43:45Z s=c273a037 FINDING scripts/lib/type-baseline.ts (re-keyed) learn=none: the re-key script refused any changed count; the ratchet itself guards the future.
2026-10-06T18:26:05Z s=c273a037 FINDING src/types/defuss-shadcn.d.ts _defaultOpen learn=none: a shared stash name across components is a latent collision only if one element hosts both; no check looks for it.
2026-10-06T18:26:05Z s=c273a037 FINDING src/documentation/pages/paper.mdx section 5.9 learn=none: claim precision is a reading judgment; prose check 0 findings, the figures cite their sources.
2026-10-07T04:38:45Z s=c273a037 FINDING AGENTS.md "One owner per concern, explicit contracts" learn=none: a recommendation, not a gate; only the path-ownership part could be enforced by verify, and that was offered, not built.
2026-10-07T04:38:45Z s=c273a037 FINDING src/documentation/pages/paper.mdx section 10 (user corrections) learn=none: the figures cite the transcript; claim precision is a reading judgment beyond the prose check.
2026-10-07T04:38:45Z s=c273a037 FINDING src/documentation/pages/paper.mdx Figures 7 + 8 learn=none: inspected in light and dark screenshots (tmp/fig7-*.png, tmp/fig8-*.png); paper.e2e checks only that every chart mounts.
2026-10-07T05:44:47Z s=c273a037 FINDING docs examples (real findings, not fixed here) learn=none: reported to the user as follow-up; no gate runs markup-check over the docs yet.
2026-10-07T05:44:47Z s=c273a037 FINDING tmp edit script corrupted markup-check.ts (process) learn=none: tsc + the unit tests + both calibrations reran green on the repaired file.
2026-10-07T07:03:44Z s=c273a037 FINDING known sandbox noise (not fixed) learn=none: production serves the docs assets from jsDelivr (CORS *); not verified in this session.
2026-10-07T09:44:20Z s=c273a037 FINDING system-in-numbers deck: two diagram slides + four skill slides learn=none: screenshots of slides 8, 9, 12, 14 inspected (tmp/papers/deck-*.png: both diagrams fit their frames after a full play); no page error; the unit test on the deck
2026-10-07T10:39:57Z s=c273a037 FINDING deck: slide 4 (five splits), 10 (unit test files), 12-15 (cards, pitch text), 16 (defuss-vae + skills map) learn=none: renders of slides 4, 10, 12, 16 inspected (tmp/papers/deck-*.png); no page error; e2e covers the docs page only through the sandbox attributes.
2026-10-07T10:39:57Z s=c273a037 FINDING probe tooling (process) learn=none: why Playwright judged the elements unstable is not established; no product code depends on it.
2026-10-07T10:39:57Z s=c273a037 FINDING AGENTS.md "Work packages before a verify run" (user request) learn=none: a process rule; the gate cannot count pipeline runs. Prose check 0 findings.
2026-10-07T10:39:57Z s=c273a037 FINDING WebGL anti-aliasing (user request: FXAA for presentations) learn=none: grep over src/ (ts, tsx, mdx); any flicker on the CSS decks would need a named slide to measure.
2026-10-07T15:45:25Z s=c273a037 FINDING deck slide 17: the turning ? aliases mid-rotation (user finding) learn=none: falsifier: slide 17 mid-turn still shows stair-stepped edges on the stroke - sampling during motion was not measured, only the static 62-degree frame.
2026-10-07T16:54:31Z s=c273a037 FINDING state config reads (limitation) learn=none: typing each apply() with its StateConfigs would let tsc check it - a change across 59 components, not made here.
2026-10-07T17:29:50Z s=c273a037 FINDING src/components/code-example/code-example.ts vpApplyAll (self-review) learn=none: no fixture shows a stage whose scrollbar flips the justify decision; the order is documented inline.
2026-10-07T17:29:50Z s=c273a037 FINDING 59 src/components/*/*.ts StateConfigs + diagram.ts draw() learn=none: lint is non-blocking by project rule (AGENTS.md: no --deny-warnings), so only the clean-log discipline catches a new warning.
2026-10-07T17:29:50Z s=c273a037 FINDING slides 11-15 layout (user request) learn=none: renders of slides 10, 11 (after its entrances), 12 and 15 inspected (tmp/papers/deck-*.png); documentation e2e green.
2026-10-07T17:57:06Z s=c273a037 FINDING src/documentation/pages/paper.mdx section 5.6 (self-review) learn=none: claim precision is a reading judgment; the prose catalog review is the check, no program can.
2026-10-07T17:57:06Z s=c273a037 FINDING src/documentation/pages/paper.mdx sections 6, 7, 5.7, 12 learn=none: a reading judgment; no mechanical check distinguishes an anecdote from a result.
2026-10-07T17:57:06Z s=c273a037 FINDING session figures supplied by the user (not written) learn=none: the figure came from a person, not a check; the paper cites the transcript as its source.
2026-10-07T18:29:19Z s=029d0000 FINDING src/documentation/pages/paper.mdx section 2 (B09) learn=none: a version pin in prose; no check can tell which release a page describes
2026-10-07T18:29:19Z s=029d0000 FINDING src/documentation/pages/paper.mdx sections 5.1, 5.5, Figures 3-6, Table 2 (B09) learn=none: historical figures are dated snapshots by design; current figures are already data-stat elements the stat figures gate checks
2026-10-07T18:29:19Z s=029d0000 FINDING src/documentation/pages/paper.mdx Results tiles + 5.1 (L03) learn=none: the two sources are both correct for their dates; dating the record is the fix, not a rule
2026-10-07T18:29:19Z s=029d0000 FINDING src/documentation/pages/paper.mdx section 12 item 1 (T04) learn=none: section cross-references in prose are a reading judgment
2026-10-07T18:29:19Z s=029d0000 FINDING src/documentation/pages/paper.mdx sections 2.1, 2.3, 5.2 (B02) learn=none: claim scope against a source is a reading judgment (walk + catalog)
2026-10-07T18:29:19Z s=029d0000 FINDING src/documentation/pages/paper.mdx section 3 (B01) learn=none: external sources; no local check applies
2026-10-07T20:40:09Z s=029d0000 FINDING src/documentation/pages/paper.mdx sections 1-12 (B01, B02, L01, P06, R04, A01, S03) learn=none: claim scope and falsifier logic are reading judgments; the report states that the static check and the walk do not catch them
2026-10-07T20:40:09Z s=029d0000 FINDING src/documentation/pages/paper.mdx section elements (data-lead=smallcaps) learn=none: whether a font has real small caps is not detectable in CSS or by a static check; the Typography option stays available for fonts that have them
2026-10-07T20:40:09Z s=029d0000 FINDING src/components/data-display/qr-code/qr-code.ts encodeGeometry/applyMarkup (security review) learn=none: no finding to encode
2026-10-08T08:03:04Z s=029d0000 FINDING docs/paper.html:92, docs/full-paper.html:111 (hygiene.probes) <- src/documentation/pages/paper.mdx section 2.1 learn=none: the plugin has no per-path exclude for its built-in probe rule; a page citing the tag literally is a reading matter, and the gate itself caught it
2026-10-08T08:03:04Z s=029d0000 FINDING scripts/deploy.sh clean-tree check and step 4b; .gitignore learn=none: deploy.sh has no test harness (it pushes and releases); the throwaway-repo probe exercised the exact git commands, and the next release runs the script end to e
2026-10-08T08:03:04Z s=029d0000 FINDING release v0.9.7 commits 3c7f27f7, c2e16120 (version sites, changelog, docs/ snapshot) learn=none: the release pipeline and its gates are the check; nothing new to encode
2026-10-08T11:24:45Z s=029d0000 FINDING src/documentation/pages/paper.mdx (whole report, per paper-edit-handoff/EDITING_INSTRUCTIONS.md) learn=none: an editorial rewrite against a specification; the structure probe is a one-off for this revision
2026-10-08T11:24:45Z s=029d0000 FINDING src/documentation/pages/paper.mdx historical figures learn=none: an immutable study source for scripts/stat-figures.ts would let verify check them; proposed to the maintainer as a separate change
2026-10-08T11:24:45Z s=029d0000 FINDING src/documentation/pages/paper.mdx sections 2.2, 3, 5.2, 5.3 (evidence added beyond the handoff) learn=none: recovered records cited in the text
2026-10-08T11:24:45Z s=029d0000 FINDING src/documentation/pages/paper.mdx Figure 1 (paper-edit-handoff/figures/general_feedback.json) learn=none: a visual judgment on rendered output
2026-10-08T11:24:45Z s=029d0000 FINDING tests/ui.test.ts "diagram component: the CodeExample card pauses on a step..." learn=none: hang guards, not speed assertions (vitest.config.ts); speed has its own checks
2026-10-08T11:24:45Z s=029d0000 FINDING vitest.config.ts TIMEOUT_SCALE (coverage runs) + tests/code-example.test.ts "typing in a text editor..." + tests/helpers.ts comment learn=none: hang guards are not speed assertions (vitest.config.ts); the debounce behavior (sync without change or blur) is still asserted
2026-10-08T11:24:45Z s=029d0000 FINDING .git/info/exclude (local, untracked): paper-edit-handoff/ learn=none: a local workspace decision, reported to the maintainer
2026-10-08T12:14:02Z s=029d0000 FINDING .github/workflows/verify.yml learn=none: CI configuration
2026-10-08T12:48:18Z s=029d0000 FINDING src/documentation/pages/paper.mdx round 3 (maintainer request 2026-10-08: 4.1 boxes, 4.2 timeline, 2.2 conversation, 4.4 diff, before/after tables, section 5 title, 2.5, signed colors, "-", new section 7) learn=none: an editorial change checked by the structure, prose and render probes of this revision
2026-10-08T12:48:18Z s=029d0000 FINDING src/documentation/pages/paper.mdx 4.1 + ARCH.md:32 (verifier check count) learn=none: a dated study value with its method, like the other frozen figures
2026-10-08T12:48:18Z s=029d0000 FINDING src/documentation/pages/paper.mdx sections 2.5 and 7 (claims about defuss-vae 0.8.0) learn=none: claims checked once against the pinned package version the paper names
2026-10-08T12:48:18Z s=029d0000 FINDING src/documentation/pages/paper.mdx 2.5 "research into the preferences of senior developers" learn=none: needs a source from the maintainer if the paper should cite it
2026-10-08T12:48:18Z s=029d0000 FINDING src/documentation/pages/paper.mdx Figure 5 (splice) + Figures 2/5 and Tables 3-6 (render decisions) learn=none: one-off edit scripts in tmp/; the probes caught it before the build was attested
2026-10-08T13:30:18Z s=029d0000 DONE fp=431c90d7c6ed cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+477)
2026-10-08T13:30:18Z s=029d0000 FINDING src/components/overlays/command/command.ts + dialog/dialog.ts + feedback-status/alert-dialog/alert-dialog.ts + overlays/sheet/sheet.ts (getState() after a native open, reported against 0.9.7) learn=test: command/dialog/alert-dialog/sheet e2e assert store, getState() and data-state-name after every open and close path (tests/e2e/lib/observed-state.ts reads the st
2026-10-08T13:30:18Z s=029d0000 FINDING same four components: initial state of authored `open` markup learn=test: dialog.e2e "a dialog authored with open reports open" (failed before this change, passes after)
2026-10-08T13:30:18Z s=029d0000 FINDING same four components: componentState<HTMLDialogElement> learn=verifier: component types (tsc ratchet) gate
2026-10-08T13:30:18Z s=029d0000 FINDING src/components/*/{command,dialog,alert-dialog,sheet}/component-skill.md ## States learn=none: docs and e2e describe the same surface (AGENTS.md "Docs <-> E2E parity")
2026-10-08T13:30:18Z s=029d0000 FINDING src/documentation/pages/paper.mdx 2.4 + section 7, ARCH.md:83 (memory links, maintainer request) learn=none: an editorial correction against the repository's own files
2026-10-08T13:30:18Z s=029d0000 FINDING .agents/MEMORY.md (3 entries over the 240-character cap) learn=memory: the next wrap consolidates them; reported to the maintainer
2026-10-08T13:30:18Z s=029d0000 FINDING src/documentation/pages/paper.mdx Table 4 "Files in the component folders" learn=none: a label clarification; the count was right
2026-10-08T13:30:18Z s=029d0000 FINDING README.md + src/documentation/pages/index.mdx footprint sentence learn=verifier: stats claim (README) and README <-> index commit window gates
2026-10-08T13:55:13Z s=029d0000 FAIL tests.e2e.1
2026-10-08T13:58:52Z s=029d0000 DONE fp=43b5787c28ad cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+482)
2026-10-08T13:58:52Z s=029d0000 FINDING src/components/primitives/typography/typography.css (a heading in a justified .typeset) learn=test: typography.e2e "Blocksatz never justifies a heading": the fixture heading computes justify/auto with the committed CSS and start/manual with the fix (tmp/typo-r
2026-10-08T13:58:52Z s=029d0000 FINDING tests/e2e/code-example-firefox.e2e.ts boot wait learn=none: a test-precondition fix; the component is unchanged
2026-10-08T13:58:52Z s=029d0000 FINDING src/documentation/pages/paper.mdx Table 7 + 4.8 (prices, maintainer request) learn=none: a dated price snapshot with its source and access date
2026-10-08T13:58:52Z s=029d0000 FINDING src/documentation/pages/paper.mdx 4.8 hypothesis sentence (maintainer request) learn=none: needs a measurement before the claim can be stated as supported by data
2026-10-08T13:58:52Z s=029d0000 FINDING src/documentation/pages/paper.mdx Table 5 (maintainer request) learn=none: presentation
2026-10-08T16:13:36Z s=029d0000 DONE fp=b897d299257d cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+483)
2026-10-08T16:13:36Z s=029d0000 FINDING src/components/primitives/typography/typography.css (columns below a .typeset-span) learn=test: typography.e2e "the columns below a .typeset-span start level": failed on the previous dist (margin-block-start), passes after the rebuild
2026-10-08T16:13:36Z s=029d0000 FINDING src/documentation/pages/paper.mdx two-column trial (maintainer request) learn=none: a layout trial the maintainer judges visually
2026-10-08T16:13:36Z s=029d0000 FINDING src/documentation/pages/paper.mdx 2.3 (VERIFY.py and verify.ts) learn=none: a dated count with its source
2026-10-08T16:13:36Z s=029d0000 FINDING src/documentation/pages/paper.mdx Table 7 caption (maintainer request) learn=none: the maintainer's statement; this session cannot see the plan's usage
2026-10-08T18:14:05Z s=029d0000 DONE fp=0bb6082b0384 cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+486)
2026-10-08T18:14:05Z s=029d0000 FINDING src/components/charts/chart/chart.css (.chart min-inline-size) learn=test: chart.e2e "a drawn chart shrinks with a narrowing grid host": chart and svg follow an 800 -> 300px grid host
2026-10-08T18:14:05Z s=029d0000 FINDING src/documentation/pages/paper.mdx inline script (#paper-mode swap) learn=test: paper-fullscreen.e2e "it follows the OS color scheme": the swap starts checked on a dark OS and one click switches to light - failed before the docs rebuild, pa
2026-10-08T19:55:41Z s=029d0000 DONE fp=ec7f4cdf476a cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+486)
2026-10-08T19:55:41Z s=029d0000 FINDING commit 640d2a97 (scope after the push) learn=none: a re-attestation of an unchanged tree
2026-10-08T20:27:53Z s=029d0000 DONE fp=a6483e1ad757 cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+486)
2026-10-08T20:27:53Z s=029d0000 FINDING scripts/verify.ts docs release snapshot + src/documentation/public/CNAME (the Pages custom domain) learn=verifier: docs release snapshot: OK with the file, FAILED "docs/CNAME differs ... would lose the custom domain" with docs/CNAME moved aside
2026-10-08T20:27:53Z s=029d0000 FINDING v0.9.8 release (scripts/deploy.sh run) learn=none: a remote commit during a release; deploy.sh fails closed on a rejected push
2026-10-09T11:26:44Z s=029d0000 DONE fp=dc908b40f8d2 cov=74.7% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+621)
2026-10-09T11:26:44Z s=029d0000 FINDING site.ts, theme-designer.ts, theme-switcher.ts comments learn=none: comments
2026-10-09T11:26:44Z s=029d0000 FINDING src/documentation/lib/components/deck-rail.tsx JSDoc learn=none: comment
2026-10-09T11:26:44Z s=029d0000 FINDING why-comments (theme-switcher.ts TOKEN_RE, build-docs.ts deck page, deck-rail.tsx JSDoc) learn=none: comments
2026-10-09T11:26:44Z s=029d0000 FINDING src/documentation/runtime/theme-designer.ts + pages/theme-designer.mdx + layout.css (the Theme Designer rework, maintainer request) learn=test: tests/e2e/theme-designer.e2e.ts rewritten: 21 checks over every promise above, all pass
2026-10-09T11:26:44Z s=029d0000 FINDING src/theme/utils/default-semantic-tokens.css + scripts/lib/theme-tokens.ts + runtime/theme-switcher.ts TOKEN_RE + typography.css .link (the link token) learn=test: typography.e2e "link: the primary colour, underlined 4px below the text - and a theme sets both through its tokens"
2026-10-09T11:26:44Z s=029d0000 FINDING src/documentation/pages/*.mdx (302 bare anchors), DocLink, arch-md.ts, deck-rail.tsx learn=none: a mechanical sweep, checked by the build and verify
2026-10-09T11:26:44Z s=029d0000 FINDING src/documentation/pages/anatomy.mdx section 5 (maintainer request) learn=none: documentation checked against the shared layer
2026-10-09T11:26:44Z s=029d0000 FINDING src/documentation/pages/system-in-numbers.mdx slides 8, 9, 11, 16 (maintainer request) learn=none: a visual layout checked by screenshot
2026-10-09T11:26:44Z s=029d0000 FINDING deck-rail.tsx + runtime/site.ts + build-docs.ts (the rail Fullscreen button) learn=test: documentation.e2e "the deck rail's Fullscreen button": the button at the caption's end, the iframe fullscreen, the deck 0..viewport width, focused
2026-10-09T11:26:44Z s=029d0000 FINDING README.md + index.mdx footprint; theming.mdx designer text; AGENTS.md designer contract learn=verifier: stats claim (README), README <-> index commit window, prose static check
2026-10-09T14:23:54Z s=029d0000 DONE fp=e8c070c248c7 cov=74.7% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+621)
2026-10-09T14:23:54Z s=029d0000 FINDING src/documentation/public/css/layout.css .td-tabs (the Theme Designer flicker, maintainer report) learn=test: theme-designer.e2e 'a settings tab switch keeps the block's height - the preview below does not move' (5 tabs) and the scaffold-tabs check
2026-10-09T14:23:54Z s=029d0000 FINDING theme-designer.mdx/.ts + layout.css (Fullscreen, condensed intro, maintainer request) learn=test: theme-designer.e2e 'Fullscreen: the designer alone fills the screen, with its own light / dark toggle'
2026-10-09T14:23:54Z s=029d0000 FINDING src/documentation/pages/system-in-numbers.mdx slide 2 and the cover learn=verifier: stat figures gate
2026-10-09T15:23:36Z s=029d0000 FAIL tests.integration.1
2026-10-09T15:39:45Z s=029d0000 DONE fp=eb8bf0dd5664 cov=74.7% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+643)
2026-10-09T15:39:45Z s=029d0000 FINDING src/shared/render.ts:settleTemplates, renderModel; src/components/data-display/teaser/teaser.ts:applyMarkup learn=test: teaser.e2e assertRenderContract compares render() with the fixture file byte for byte, template content included; 'inert in the template' checks the live templa
2026-10-09T15:39:45Z s=029d0000 FINDING src/documentation/pages/teaser.mdx, src/documentation/lib/components/deck-rail.tsx, teaser component-skill.md, tests/e2e/teaser.e2e-fixture.html learn=test: teaser.e2e asserts the played #t-basic keeps aria-label 'The quarterly report'
2026-10-09T15:39:45Z s=029d0000 FINDING src/theme/utils/shapes.css :where(.aura):has(> [data-played]) learn=test: tests/shapes.test.ts expects padding 3px on a played aura; documentation.e2e checks the rail height within 2px across the swap; teaser.e2e expects ['none','3px'
2026-10-09T15:39:45Z s=029d0000 FINDING src/components/data-display/teaser/teaser.css &[data-played] learn=test: documentation.e2e checks the rail height across the swap; a shrunk 16:9 frame fails it
2026-10-09T15:39:45Z s=029d0000 FINDING shapes.css vs teaser.css (cascade layers) learn=test: tests/shapes.test.ts 'aura: around content that has played' pins animation none + background none
