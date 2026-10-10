# Episodes

<!-- Newest last. The gate appends FAIL|DONE|FINDING and keeps the last 100 entries (git keeps older ones).
Agents append `<UTC ISO> s=<session> LESSON <VAE-DIALECT>` only for a falsified HYPOTHESIS, a dead end, or a root cause.
A lesson recurring ≥2 → test | .agents/VERIFY.py rule | MEMORY line, then delete its lines. -->

2026-10-06T18:26:05Z s=c273a037 FINDING src/types/defuss-shadcn.d.ts _defaultOpen learn=none: a shared stash name across components is a latent collision only if one element hosts both; no check looks for it.
2026-10-07T05:44:47Z s=c273a037 FINDING docs examples (real findings, not fixed here) learn=none: reported to the user as follow-up; no gate runs markup-check over the docs yet.
2026-10-07T15:45:25Z s=c273a037 FINDING deck slide 17: the turning ? aliases mid-rotation (user finding) learn=none: falsifier: slide 17 mid-turn still shows stair-stepped edges on the stroke - sampling during motion was not measured, only the static 62-degree frame.
2026-10-07T16:54:31Z s=c273a037 FINDING state config reads (limitation) learn=none: typing each apply() with its StateConfigs would let tsc check it - a change across 59 components, not made here.
2026-10-08T11:24:45Z s=029d0000 FINDING src/documentation/pages/paper.mdx historical figures learn=none: an immutable study source for scripts/stat-figures.ts would let verify check them; proposed to the maintainer as a separate change
2026-10-08T12:48:18Z s=029d0000 FINDING src/documentation/pages/paper.mdx 2.5 "research into the preferences of senior developers" learn=none: needs a source from the maintainer if the paper should cite it
2026-10-08T13:30:18Z s=029d0000 DONE fp=431c90d7c6ed cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+477)
2026-10-08T13:30:18Z s=029d0000 FINDING src/components/overlays/command/command.ts + dialog/dialog.ts + feedback-status/alert-dialog/alert-dialog.ts + overlays/sheet/sheet.ts (getState() after a native open, reported against 0.9.7) learn=test: command/dialog/alert-dialog/sheet e2e assert store, getState() and data-state-name after every open and close path (tests/e2e/lib/observed-state.ts reads the st
2026-10-08T13:30:18Z s=029d0000 FINDING same four components: initial state of authored `open` markup learn=test: dialog.e2e "a dialog authored with open reports open" (failed before this change, passes after)
2026-10-08T13:30:18Z s=029d0000 FINDING same four components: componentState<HTMLDialogElement> learn=verifier: component types (tsc ratchet) gate
2026-10-08T13:30:18Z s=029d0000 FINDING README.md + src/documentation/pages/index.mdx footprint sentence learn=verifier: stats claim (README) and README <-> index commit window gates
2026-10-08T13:55:13Z s=029d0000 FAIL tests.e2e.1
2026-10-08T13:58:52Z s=029d0000 DONE fp=43b5787c28ad cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+482)
2026-10-08T13:58:52Z s=029d0000 FINDING src/components/primitives/typography/typography.css (a heading in a justified .typeset) learn=test: typography.e2e "Blocksatz never justifies a heading": the fixture heading computes justify/auto with the committed CSS and start/manual with the fix
2026-10-08T13:58:52Z s=029d0000 FINDING src/documentation/pages/paper.mdx 4.8 hypothesis sentence (maintainer request) learn=none: needs a measurement before the claim can be stated as supported by data
2026-10-08T16:13:36Z s=029d0000 DONE fp=b897d299257d cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+483)
2026-10-08T16:13:36Z s=029d0000 FINDING src/components/primitives/typography/typography.css (columns below a .typeset-span) learn=test: typography.e2e "the columns below a .typeset-span start level": failed on the previous dist (margin-block-start), passes after the rebuild
2026-10-08T18:14:05Z s=029d0000 DONE fp=0bb6082b0384 cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+486)
2026-10-08T18:14:05Z s=029d0000 FINDING src/components/charts/chart/chart.css (.chart min-inline-size) learn=test: chart.e2e "a drawn chart shrinks with a narrowing grid host": chart and svg follow an 800 -> 300px grid host
2026-10-08T18:14:05Z s=029d0000 FINDING src/documentation/pages/paper.mdx inline script (#paper-mode swap) learn=test: paper-fullscreen.e2e "it follows the OS color scheme": the swap starts checked on a dark OS and one click switches to light - failed before the docs rebuild, pa
2026-10-08T19:55:41Z s=029d0000 DONE fp=ec7f4cdf476a cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+486)
2026-10-08T20:27:53Z s=029d0000 DONE fp=a6483e1ad757 cov=74.8% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,ARCH.md(+486)
2026-10-08T20:27:53Z s=029d0000 FINDING scripts/verify.ts docs release snapshot + src/documentation/public/CNAME (the Pages custom domain) learn=verifier: docs release snapshot: OK with the file, FAILED "docs/CNAME differs ... would lose the custom domain" with docs/CNAME moved aside
2026-10-09T11:26:44Z s=029d0000 DONE fp=dc908b40f8d2 cov=74.7% paths=.claude-plugin/plugin.json,.codex-plugin/plugin.json,.github/workflows/verify.yml,AGENTS.md(+621)
2026-10-09T11:26:44Z s=029d0000 FINDING src/documentation/runtime/theme-designer.ts + pages/theme-designer.mdx + layout.css (the Theme Designer rework, maintainer request) learn=test: tests/e2e/theme-designer.e2e.ts rewritten: 21 checks over every promise above, all pass
2026-10-09T11:26:44Z s=029d0000 FINDING src/theme/utils/default-semantic-tokens.css + scripts/lib/theme-tokens.ts + runtime/theme-switcher.ts TOKEN_RE + typography.css .link (the link token) learn=test: typography.e2e "link: the primary colour, underlined 4px below the text - and a theme sets both through its tokens"
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
2026-10-10T10:12:36Z s=45f78726 DONE fp=7f9da306f928 cov=? paths=AGENTS.md,src/documentation/pages/paper.mdx
2026-10-10T10:12:36Z s=45f78726 FINDING src/documentation/pages/paper.mdx:568 S (grammar) + T (spelling) learn=none: a human's in-progress edit; minimal copy fix applied (its; subject-verb repaired, meaning kept), the file stays uncommitted as the maintainer's work
2026-10-10T10:12:36Z s=45f78726 FINDING AGENTS.md:1735-1760 (defuss-vae managed block) learn=memory: a project rule written inside the managed block is lost on the next init; it belongs outside the block
2026-10-10T10:41:43Z s=45f78726 DONE fp=eceb529a083f cov=? paths=AGENTS.md,src/documentation/pages/paper.mdx
2026-10-10T10:41:43Z s=45f78726 FINDING src/documentation/pages/paper.mdx:567 B01+S03 (5.2, maintainer draft) learn=none: doc-edit of the maintainer's draft, checked by the prose walk (4 parts, 0 findings)
2026-10-10T10:41:43Z s=45f78726 FINDING src/documentation/pages/paper.mdx:568-585 T01 (verbatim report as inline <code>) learn=none: presentation fix verified on the built page
2026-10-10T10:41:43Z s=45f78726 FINDING src/documentation/pages/paper.mdx:560 A04+L05 (section 5 intro) and ToC lines 141-144 learn=none: structure follows the headings; nothing mechanizable beyond the existing link checks
2026-10-10T10:41:43Z s=45f78726 FINDING src/documentation/pages/paper.mdx:568 B07+P06 (the 'adversarial attack' experiment) learn=none: a fact only the maintainer holds; asked, not invented
2026-10-10T10:41:43Z s=45f78726 FINDING AGENTS.md:1735-1760 (defuss-vae managed block) learn=memory: recorded in .agents/MEMORY.md (agents-md line)
2026-10-10T10:55:12Z s=45f78726 DONE fp=588a73967bfb cov=? paths=AGENTS.md,src/documentation/pages/paper.mdx
2026-10-10T10:55:12Z s=45f78726 FINDING src/documentation/pages/paper.mdx:603 B01+B07 (section 6, maintainer's new paragraph) learn=none: a report from the maintainer; attributed, not verified - pin it to projects or people if the paper should carry it as evidence
2026-10-10T10:55:12Z s=45f78726 FINDING src/documentation/pages/paper.mdx:603-604 T03 learn=none: typos in a live draft
2026-10-10T13:10:08Z s=45f78726 FAIL coverage
2026-10-10T13:27:03Z s=45f78726 FAIL coverage
2026-10-10T13:31:40Z s=45f78726 DONE fp=d2b1fb799e3c cov=74.8% paths=.oxfmtrc.json,.vscode/settings.json,AGENTS.md,Makefile(+701)
2026-10-10T13:31:40Z s=45f78726 FINDING scripts/lib/apps.ts:initHooks learn=test: tests/apps.test.ts 'sees a call a formatter wrapped'
2026-10-10T13:31:40Z s=45f78726 FINDING scripts/verify.ts dialog ownership boundary; scripts/lib/dom-discipline.ts:hasRender learn=test: tests/dom-discipline.test.ts; the dialog gate is verify's own check
2026-10-10T13:31:40Z s=45f78726 FINDING src/documentation/lib/component-api.ts (event comment walk-up, typeEntries generics depth, tidyType) learn=test: tests/component-api.test.ts (two new cases + tidyType assertions)
2026-10-10T13:31:40Z s=45f78726 FINDING src/documentation/lib/components/code-example.tsx:ICONS reader; scripts/verify.ts 'rendered pages are error-free' learn=verifier: verify gate 'rendered pages are error-free' (scripts/verify.ts §29)
2026-10-10T13:31:40Z s=45f78726 FINDING scripts/lib/format-pages.ts:keepVerbatim; scripts/format-pages.ts HTML_OPTIONS learn=test: tests/format-pages.test.ts 'keeps data scripts, pre and textarea byte for byte'
2026-10-10T13:31:40Z s=45f78726 FINDING src/documentation/pages/*.mdx (30 pages): void end tags, double </svg>, JSX braces in an html fence learn=verifier: bun run format:check (part of lint) refuses such markup
2026-10-10T13:31:40Z s=45f78726 FINDING .oxfmtrc.json; package.json format globs learn=none: documented in AGENTS.md 'Formatting'; the e2e and the theme-files-fresh gate enforce it
2026-10-10T13:31:40Z s=45f78726 FINDING tests/motion.test.ts, tests/component-schema.test.ts, tests/ui.test.ts expectations learn=none: the invariants they pin do not depend on the quote character
2026-10-10T13:31:40Z s=45f78726 FINDING pages (prose review) - src/documentation/pages/paper.mdx sections 6 and 8; AGENTS.md Formatting learn=none: prose static check + walk earlier this session (4 parts, 0 findings)
2026-10-10T13:34:12Z s=45f78726 DONE fp=490706904f8a cov=74.8% paths=.oxfmtrc.json,.vscode/settings.json,AGENTS.md,Makefile(+702)
2026-10-10T14:14:27Z s=45f78726 FAIL prose
2026-10-10T14:14:45Z s=45f78726 DONE fp=2bbc07d1d309 cov=74.8% paths=.oxfmtrc.json,.vscode/settings.json,AGENTS.md,Makefile(+703)
2026-10-10T14:20:18Z s=45f78726 DONE fp=36f90857df09 cov=74.8% paths=.oxfmtrc.json,.vscode/settings.json,AGENTS.md,Makefile(+703)
2026-10-10T16:48:31Z s=45f78726 DONE fp=bb59032b1a5a cov=74.8% paths=.oxfmtrc.json,.vscode/settings.json,AGENTS.md,Makefile(+1634)
2026-10-10T16:48:31Z s=45f78726 FINDING src/components/wysiwyg-editors/code-example/code-example.ts:buildSrcdoc (base config); src/documentation/runtime/code-example.ts learn=test: tests/e2e/site/paper-gallery.e2e.ts fails on console errors (404) - it caught the regression and pins the fix
2026-10-10T16:48:31Z s=45f78726 FINDING tests/e2e/site/theme-designer.e2e.ts:open; src/documentation/runtime/theme-designer.ts:mountApp learn=verifier: verify gate `page links resolve` + `e2e sections`; the test itself names every page through pageRel
2026-10-10T16:48:31Z s=45f78726 FINDING scripts/build-docs.ts:writePage; src/documentation/lib/plugins.ts:pageRefsPlugin learn=verifier: verify gate `page links resolve` reads every rendered page, standalone ones included
2026-10-10T16:48:31Z s=45f78726 FINDING tests/helpers.ts:openDocPage; tests/ui.test.ts selectors; tests/state-contract.test.ts fixture glob learn=test: tests/page-dirs.test.ts pins pageRel/pageHref/resolvePageRefs; ui.test.ts drives the real pages
2026-10-10T16:48:31Z s=45f78726 FINDING src/sitemap.xml; scripts/sync-docs.ts (404.html <base href="/">) learn=verifier: verify `docs release snapshot` + `page links resolve` (sitemap entries are page ids)
2026-10-10T16:48:31Z s=45f78726 FINDING scripts/format-pages.ts, scripts/stat-figures.ts, scripts/create-screenshots.ts (shebang line) learn=none: a one-off mechanical slip; `bun run figures` / the build run the scripts and fail loudly
2026-10-10T17:08:21Z s=45f78726 DONE fp=94d40e627560 cov=74.8% paths=.oxfmtrc.json,.vscode/settings.json,AGENTS.md,Makefile(+1359)
2026-10-10T17:08:21Z s=45f78726 FINDING README.md: How it works (mermaid labels) learn=verifier: vae.py prose static T07 check runs in the docs gate
2026-10-10T17:08:21Z s=45f78726 FINDING scripts/verify.ts: README ↔ index parity (pillar regex + range) learn=verifier: verify gate `README ↔ index parity` is its own check (a different bullet shape fails by name)
2026-10-10T17:08:21Z s=45f78726 FINDING scripts/lib/version-sites.ts VERSION_SITES (README citation); tests/version-sites.test.ts fixture learn=test: tests/version-sites.test.ts iterates every site including README.md
