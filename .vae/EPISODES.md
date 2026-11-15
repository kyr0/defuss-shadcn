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
2026-10-08T13:58:52Z s=029d0000 FINDING src/documentation/pages/paper.mdx 4.8 hypothesis sentence (maintainer request) learn=none: needs a measurement before the claim can be stated as supported by data
2026-10-10T10:12:36Z s=45f78726 FINDING src/documentation/pages/paper.mdx:568 S (grammar) + T (spelling) learn=none: a human's in-progress edit; minimal copy fix applied (its; subject-verb repaired, meaning kept), the file stays uncommitted as the maintainer's work
2026-10-10T10:41:43Z s=45f78726 FINDING src/documentation/pages/paper.mdx:567 B01+S03 (5.2, maintainer draft) learn=none: doc-edit of the maintainer's draft, checked by the prose walk (4 parts, 0 findings)
2026-10-10T10:41:43Z s=45f78726 FINDING src/documentation/pages/paper.mdx:568-585 T01 (verbatim report as inline <code>) learn=none: presentation fix verified on the built page
2026-10-10T10:41:43Z s=45f78726 FINDING src/documentation/pages/paper.mdx:560 A04+L05 (section 5 intro) and ToC lines 141-144 learn=none: structure follows the headings; nothing mechanizable beyond the existing link checks
2026-10-10T10:41:43Z s=45f78726 FINDING src/documentation/pages/paper.mdx:568 B07+P06 (the 'adversarial attack' experiment) learn=none: a fact only the maintainer holds; asked, not invented
2026-10-10T10:55:12Z s=45f78726 FINDING src/documentation/pages/paper.mdx:603 B01+B07 (section 6, maintainer's new paragraph) learn=none: a report from the maintainer; attributed, not verified - pin it to projects or people if the paper should carry it as evidence
2026-10-10T10:55:12Z s=45f78726 FINDING src/documentation/pages/paper.mdx:603-604 T03 learn=none: typos in a live draft
2026-10-10T13:31:40Z s=45f78726 FINDING .oxfmtrc.json; package.json format globs learn=none: documented in AGENTS.md 'Formatting'; the e2e and the theme-files-fresh gate enforce it
2026-10-10T13:31:40Z s=45f78726 FINDING tests/motion.test.ts, tests/component-schema.test.ts, tests/ui.test.ts expectations learn=none: the invariants they pin do not depend on the quote character
2026-10-10T13:31:40Z s=45f78726 FINDING pages (prose review) - src/documentation/pages/paper.mdx sections 6 and 8; AGENTS.md Formatting learn=none: prose static check + walk earlier this session (4 parts, 0 findings)
2026-10-10T16:48:31Z s=45f78726 FINDING scripts/format-pages.ts, scripts/stat-figures.ts, scripts/create-screenshots.ts (shebang line) learn=none: a one-off mechanical slip; `bun run figures` / the build run the scripts and fail loudly
2026-10-10T17:19:53Z s=45f78726 FINDING README.md: the component list link ("Using components" → "The component folder") learn=none: a one-off text slip; verify's markdown link gate checks hrefs, not link text
2026-10-10T20:12:30Z s=45f78726 FINDING scripts/deploy.sh step 4a (git add of the changelog page) learn=none: a grep over Makefile and scripts/*.sh finds no other flat page path; a verify rule over shell scripts for `documentation/<slug>.html` would be a parser of bash 
2026-10-11T10:52:19Z s=ba000d18 FINDING src/components/papers/paper/component-skill.md:Print (print dialog page size) learn=none: a headed print dialog cannot be driven here
2026-10-11T10:52:19Z s=ba000d18 FINDING Makefile:docs-sync (maintainer commit 96c74141) learn=none: whether a forced sync is safe depends on the page content at the time; AGENTS.md already describes the risk
2026-10-11T11:56:21Z s=ba000d18 FINDING plans/document-editor-loading/output/bericht.json; plans/document-editor-loading/src/pipeline.ts:finalCustom learn=none: the maintainer's pipeline and data; only they can say whether the last-part-only output is intended
2026-10-11T11:56:21Z s=ba000d18 FINDING src/documentation/pages/application/scaffold-document-editor.mdx:#de-docs (sample) learn=none: a one-time data choice, made by the generator script
2026-10-11T15:38:33Z s=ba000d18 FINDING src/documentation/pages/application/scaffold-document-editor.mdx:restore loop (addLink) learn=none: a one-line guard on a self-written value; no recurrence mechanism beyond this page
2026-10-11T15:38:33Z s=ba000d18 FINDING src/documentation/pages/application/scaffold-document-editor.mdx:#de-open (removed) learn=none: not reproduced; the report asks the user which browser and page if the menu shows the same
2026-10-11T15:38:33Z s=ba000d18 FINDING src/documentation/pages/application/scaffold-document-editor.mdx:saveFile (showSaveFilePicker branch) learn=none: no headless way to drive the native dialog; reported to the user
2026-10-11T17:34:04Z s=ba000d18 FINDING src/documentation/pages/application/scaffold-document-editor.mdx:dragleave learn=none: Safari / Firefox and a real OS drag not driven; falsifier: in Safari the target flickers or stays after the files leave the window
2026-10-11T23:36:37Z s=ba000d18 FINDING src/components/charts/chart/chart.ts:print listener (zero-size charts) learn=none: falsifier: printing a deck page logs an ECharts size warning or leaves a chart drawn at size 0 after the print
2026-10-12T12:36:14Z s=ba000d18 FINDING src/documentation/pages/papers/paper.mdx: Figures 3, 7, 8 and Figure 6 learn=none: none: an editorial change; the render shows it
2026-10-12T12:36:14Z s=ba000d18 FINDING src/documentation/pages/papers/paper-code.mdx: print example learn=none: none: content checked against the source file
2026-10-12T20:33:40Z s=ba000d18 FINDING scripts/paper-pdf.ts learn=none: none: an on-demand tool (Chromium), not part of build or verify; its output is checked by paper-fullscreen.e2e (served, a PDF) and by eye (tmp/paper-print/left-
2026-10-12T20:33:40Z s=ba000d18 FINDING tests/e2e/site/paper-gallery.e2e.ts: Charts and Figures learn=none: one timeout, one pass: CDN latency under load is a HYPOTHESIS (falsifier: a timeout with ECharts served locally); no rule until it recurs
2026-10-12T22:35:37Z s=ba000d18 FINDING tests/e2e/lib/pdf-text.ts learn=none: tmp/pdf-text-check.ts / pdf-runs-check.ts: the same characters and marker counts per page as PDFKit on five PDFs; positions equal to PDFKit's (x) and inside its
2026-10-12T22:35:37Z s=ba000d18 FINDING src/documentation/pages/presentations/system-in-numbers.mdx: slide 17 learn=none: none: an editorial layout of one slide; the screenshot shows it
2026-10-13T01:31:46Z s=ba000d18 FINDING src/components/wysiwyg-editors/code-example/code-example.ts: relink limits learn=none: none: no example needs it; a fence that does shows its link resolving wrong in the card, and pageLinks shares resolvePageRefs' tag pattern
2026-10-13T13:56:01Z s=ba000d18 FINDING scripts/verify.ts: four linkedom passes learn=none: tmp/onepass-equivalence-probe.ts: old and new verify print byte-identical output on the clean tree and with six faults planted (dead link, dead anchor, dead cro
2026-10-13T13:56:01Z s=ba000d18 FINDING src/documentation/pages/documents/invoice.mdx: page count learn=none: none: copy, read from the printed PDF (pdfText pages = 3)
2026-10-13T13:56:01Z s=ba000d18 FINDING src/components/documents/invoice/invoice.ts: GiroCode with non-ASCII text learn=none: UNKNOWN: whether every banking app reads an ECI segment; falsifier: a German banking app scanning a code with an umlaut in the name
2026-10-13T13:56:01Z s=ba000d18 FINDING tests/e2e/run.ts vs scripts/proven.ts: two fingerprint hashers learn=none: none: kept apart on purpose; the format is three lines in each
2026-10-13T17:45:55Z s=ba000d18 FINDING src/components/math/math-renderer/math-renderer.ts paint(): an unescaped id in a selector learn=none: found by reading, not observed: an id with a quote is no documented configuration, and no rule can tell an escaped selector from a safe literal one
2026-10-13T22:27:27Z s=ba000d18 FINDING src/documentation/pages/introduction/bundles.mdx + installation.mdx + math.mdx: two `.*` in one paragraph learn=none: the docs build fails on it by name (file, line and column) before anything ships - no further rule needed
2026-10-13T22:27:27Z s=ba000d18 FINDING src/documentation/pages/introduction/installation.mdx: "this documentation site loads exactly these two files" learn=none: the page states what DocPage and extraBundlesPlugin write, and verify `cross-page imports` checks those tags on every page
2026-10-14T20:43:22Z s=ba000d18 FINDING src/components/wysiwyg-editors/visual-editor/visual-editor.ts project(): generated ids became authored learn=none: the API no longer exists (tsc and the API docs gate check the namespace); visual-editor.e2e "the markup is the whole page" covers the HTML round trip
2026-10-15T09:41:25Z s=ba000d18 FINDING src/documentation/pages/wysiwyg-editors/studio.mdx: two stylesheet readers learn=none: none - one function, covered by studio.e2e "library" (a styled .btn in a frame) and "preview" (a styled .btn in the preview)
2026-10-15T11:48:45Z s=ba000d18 FINDING src/documentation/pages/wysiwyg-editors/studio.mdx: the state grid was squeezed below the Properties learn=none: none - a proportion of the layout; studio.e2e "state" reads the grid's controls, the screenshot showed the result
2026-10-15T16:45:55Z s=ba000d18 FINDING AGENTS.md (WYSIWYG Editors, the Studio): a sentence named the removed block library (studio/blocks.json, scripts/lib/studio-blocks.ts, a `studio blocks fresh` gate) learn=none: none - prose; verify names no such gate any more
2026-10-16T03:26:51Z s=ba000d18 FINDING scripts/individual-examples.ts: the generator read the skills and pages twice, carried its clean-copy code twice and re-derived the kind format learn=none: behavior-neutral by construction, proven byte-identical; the contract has one reader again
2026-10-16T03:26:51Z s=ba000d18 FINDING scripts/lib/example-parts.ts module doc + tests/example-parts.test.ts Why: described the deleted per-page baseline learn=none: documentation drift - no mechanical check for prose about a deleted file
2026-10-18T21:10:00Z s=ba000d18 CORRECTION line 99 (typing test): the throttling HYPOTHESIS is disproved - it timed out with the card in view; VERIFIED cause = an unfocused State-control write wiped by the next state report inside the 250 ms debounce (tmp/probe-state-overwrite.ts); the test focuses the control first
2026-10-18T21:18:43Z s=ba000d18 FINDING tests/e2e/data-display/calendar.e2e.ts week start check: counted 6 outside days in a row of 3 learn=none: the check itself
2026-10-19T00:43:06Z s=ba000d18 FINDING src/shared/media.ts mediaPaint() / mediaMarkup(): every timeupdate rewrote attributes that already held their value learn=none: a performance detail with no observable contract - the e2e prove the painted values, not the number of writes
2026-10-19T00:43:06Z s=ba000d18 FINDING tests/e2e/multimedia/media-timeline.e2e.ts playing check: expected the playhead animation as soon as the state read playing learn=none: the check itself
2026-10-19T00:43:06Z s=ba000d18 FINDING tests/e2e/multimedia/video.e2e.ts: the time readout and the store subscriber order learn=none: the checks themselves
2026-10-19T12:21:49Z s=ba000d18 FINDING tests/e2e/multimedia/video.e2e.ts: the keyboard path of the captions menu pressed keys before the focus moved learn=none: the check itself
2026-10-19T12:21:49Z s=ba000d18 FINDING src/documentation/pages/papers/paper.mdx: the BibTeX hash, the cutoff wording, the timeline's number learn=none: tmp/find-fig4.ts: the reprinted PDF holds Figures 1-9 in order, Figure 4 under the timeline on page 8 (tmp/paper-png/p08.png); paper-fullscreen.e2e (captions st
2026-10-19T13:24:54Z s=ba000d18 FINDING src/documentation/pages/papers/paper.mdx Figure 4: the timeline's arrows pointed down at nothing learn=none: tmp/shot-fig4.ts (screen 1280 and 700, print) and the reprinted PDF page 8: the arrows end on the axis; paper-fullscreen.e2e (the caption stays under what it ca
2026-10-19T16:53:24Z s=ba000d18 FINDING src/documentation/pages/papers/paper.mdx abstract and section 1: the opening sentences learn=none: the rendered page and both reprinted PDFs (tmp/paper-png*/p01.png, p02.png)
2026-10-19T18:22:35Z s=ba000d18 FINDING tests/e2e/math/math-renderer.e2e.ts "many formulas ...": the font request was read once, right after the typeset settled learn=none: the check itself; two solo runs passed before and after
2026-10-19T22:20:24Z s=ba000d18 FINDING .agents/VERIFY.py test_command: the gate ran the unit suite twice learn=none: gate configuration; the replay is pinned by tests/proof.test.ts afterRun and tests/e2e/site/proven.e2e.ts
2026-10-19T22:20:24Z s=ba000d18 FINDING tests/e2e/lib/css-smoke.ts fixtureUrl: 175 CSS-only tests imported the planner learn=none: the e2e run itself: a wrong folder 404s the fixture in every css-smoke test
2026-10-19T22:20:24Z s=ba000d18 FINDING src/documentation/pages/index.mdx scaffolds table: the size cells wrapped, nowrap cells overflowed the card learn=none: a layout measured in a probe; documentation.e2e pins the requested facts (first card, new-tab links, underline, dashed ZIP, VAE link)
2026-10-20T01:40:19Z s=ba000d18 FINDING tests/e2e/site/scaffold-document-editor.e2e.ts new routing check clicked a link of the folded document list learn=none: a test of a test - the scaffold behaves as designed
2026-10-20T01:40:19Z s=ba000d18 FINDING structure: the routing + translation module and its preview fallback repeat in every scaffold learn=none: design decision, recorded in AGENTS.md
2026-10-20T02:36:32Z s=ba000d18 FINDING tests/e2e/site/website-templates.e2e.ts account: requestSubmit on the empty sign-in form learn=none: the template behaves as designed
2026-10-20T02:36:32Z s=ba000d18 FINDING security: route parameters and query values reach the DOM learn=none: reviewed: no HTML sink takes route input
2026-10-20T20:27:45Z s=ba000d18 FINDING routing.mdx show(): an archived message marked Inbox and its back link went to the inbox learn=none: probe tmp/shot-mailbox-views.ts; demo behaviour, not a shipped contract
2026-10-21T08:22:54Z s=ba000d18 FINDING src/documentation/pages/wysiwyg-editors/studio.mdx: "h1 to h4, lead and muted on Typography" and "each of the 272 shapes on Shapes" learn=none: prose
2026-11-01T21:09:31Z s=470ad3d9 FINDING scripts/create-screenshots.ts:serveDist learn=none: one static server header; the geo-map screenshots show the drawn map (inspected light and dark)
2026-11-01T21:09:31Z s=470ad3d9 FINDING src/documentation/pages/geography/geo-regions.mdx:114 (L logic) learn=none: a one-off loop bound in a docs example; no mechanical check fits
2026-11-01T23:15:51Z s=470ad3d9 FINDING vite.config.ts:docs-index (dev server) learn=none: a dev-server convenience; no gate serves the dev server
2026-11-02T01:39:08Z s=470ad3d9 FINDING src/documentation/pages/geography/geo-routing.mdx:115 (runner) + geo-map.ts:flyTo learn=none: a frame-timing race in a docs example; no deterministic reproduction for a test
2026-11-07T11:00:13Z s=5187d371 FINDING src/documentation/pages/website/portfolio-photographer.mdx:iris portrait learn=none: Documented in src/components/guides/motion/component-skill.md Notes (clip-path is not composed).
2026-11-07T11:00:13Z s=5187d371 FINDING src/documentation/pages/website/portfolio-developer.mdx:.mk-resume-header-body learn=none: Page-specific composition (a column header); the block stays row-based.
2026-11-07T11:00:13Z s=5187d371 FINDING src/documentation/pages/website/portfolio-zine.mdx:.pf-band learn=none: A property conflict between two utilities, visible in review; no gate can see it.
2026-11-07T11:00:13Z s=5187d371 FINDING tests/e2e/site/studio.e2e.ts learn=none: Flake in the alpha Studio test; cause not established - no probe was run.
2026-11-07T13:58:10Z s=5187d371 FINDING src/documentation/pages/shaders/shaders.mdx:154 B (evidence) learn=none: one-off claim, now stated as observed
2026-11-07T13:58:10Z s=5187d371 FINDING src/documentation/pages/shaders/shader-3d.mdx:12 P (precision) learn=none: text now matches EFFECTS[].cost
2026-11-07T13:58:10Z s=5187d371 FINDING src/components/shaders/shader/shader.ts:liquid-metal relief learn=none: visual defect, checked by the card screenshots; shader.e2e pins mask transparency outside the shape
2026-11-07T16:15:27Z s=5187d371 FINDING src/components/infinite-surfaces/surface/component-skill.md:Custom properties learn=none: prose values copied from CSS have no gate; a test would pin a tuned default, which the rules forbid
2026-11-07T16:15:27Z s=5187d371 FINDING src/components/shaders/shader/component-skill.md:Attributes data-interactive learn=none: the table is hand-written prose; no generator owns it
2026-11-07T19:26:14Z s=5187d371 FINDING src/components/infinite-surfaces/surface/surface.css:floor --_fa/--_fb learn=none: the flicker metric needs dozens of GPU screenshots - too slow and machine-dependent for the e2e; the fade geometry and the haze are asserted, the metric lives i
2026-11-07T19:26:14Z s=5187d371 FINDING src/components/shaders/shader/shader.ts:surface fragment horizon learn=none: a look, judged from rendered frames; no mechanical invariant
2026-11-07T19:26:14Z s=5187d371 FINDING src/components/shaders/shader/shader.ts:program() learn=none: timings are machine-bound; the e2e waits for every tile within 60 s on SwiftShader, which the old blocking compile also met
2026-11-07T23:42:58Z s=5187d371 FINDING src/components/graphs/graph-explorer/graph-explorer.ts:Explorer.mount learn=none: the e2e checks every chrome layer exists after mount, which covers it; the inline comment says why the copy stays
2026-11-08T09:51:40Z s=5187d371 FINDING src/documentation/pages/graphs/graph-edges.mdx:127,170 learn=none: whether an authored id exists depends on the generated graph; no gate reads example graphs
2026-11-08T12:32:18Z s=5187d371 FINDING src/components/graphs/graph-explorer/graph-explorer.ts:rowsView class names learn=none: a naming collision inside one stylesheet; no gate lists a component's class names
2026-11-08T12:32:18Z s=5187d371 FINDING src/documentation/pages/application/scaffold-knowledge-graph.mdx:records learn=none: how synthetic demo data looks is judged from rendered frames
2026-11-08T12:32:18Z s=5187d371 FINDING tests/e2e/site/paper-gallery.e2e.ts:Code Listings print layout learn=none: a load-dependent layout timing; not reproduced alone, so no root cause is established
2026-11-08T14:24:40Z s=5187d371 FINDING website-events-promotions.mdx: .mk-event-header-inner background learn=none: a pixel-level check of one template’s shader visibility would pin a rendering detail; the screenshot review caught it
2026-11-08T14:24:40Z s=5187d371 FINDING website-news.mdx: halftone shader on the Evening look learn=none: how a printed photo should look is judged from the rendered frame
2026-11-08T14:24:40Z s=5187d371 FINDING website-media.mdx: gallery photos and alt texts learn=none: whether an alt text matches a photo needs a human look
2026-11-08T14:24:40Z s=5187d371 FINDING showcase-records.mdx: tracklist sides learn=none: content correctness of one demo list
2026-11-08T14:24:40Z s=5187d371 FINDING tests/e2e/site/website-templates.e2e.ts:blog route learn=none: the e2e run itself showed it
2026-11-08T17:56:54Z s=5187d371 FINDING website-search-navigation / website-shop / website-account-states: sticky side columns learn=none: overlap of sticky elements is visual; no cheap mechanical check - screenshots at phone width are the evidence
2026-11-08T17:56:54Z s=5187d371 FINDING website-docs-help.mdx: Release notes / Downloads examples learn=none: a CSS authoring rule (a container queries only its descendants); caught by screenshot review
2026-11-08T17:56:54Z s=5187d371 FINDING website-shop.mdx: season banner on phones learn=none: visual contrast over a photo is not measured by a gate
2026-11-08T17:56:54Z s=5187d371 FINDING website-landing-page.mdx: header actions on phones learn=none: clipping inside an overflow-hidden header does not change the page scrollWidth, so the phone check cannot see it
2026-11-08T17:56:54Z s=5187d371 FINDING website-media.mdx: .md-stamp on phones learn=none: visual; overflow-x: clip on the root hides it from the scrollWidth check
2026-11-08T19:25:59Z s=5187d371 FINDING website-media.mdx: gallery hover learn=none: a dropped declaration is silent; the hover was checked in screenshots
2026-11-08T19:25:59Z s=5187d371 FINDING resume-entry.css: horizontal variant learn=none: a layout detail seen in a screenshot; the e2e pins the marks on one line
2026-11-08T19:25:59Z s=5187d371 FINDING collection-item.css: stack variant learn=none: paint order is visual; the e2e pins three prints and the fan-out angles
2026-11-08T20:38:33Z s=5187d371 FINDING tests/e2e/site/website-templates.e2e.ts: Media deep link learn=none: a test-order fix; the Media viewer itself is checked by the route assertion
2026-11-08T20:38:33Z s=5187d371 FINDING index.mdx, website-resume-portfolio.mdx, portfolio-photographer/neon.mdx, AGENTS.md: "always dark" learn=none: prose; no gate reads these claims
2026-11-08T20:38:33Z s=5187d371 FINDING 27 site pages + AGENTS.md: the modes marker learn=none: prose
2026-11-08T20:38:33Z s=5187d371 FINDING src/components/shaders/shader/shader.parts.md: Shader (background, 18) learn=none: verify passes either way; a size limit on parts is not established as a rule
2026-11-08T20:38:33Z s=5187d371 FINDING tests/e2e/site/studio.e2e.ts: WebKit drag learn=none: flake in the alpha Studio test
2026-11-09T06:08:51Z s=5187d371 FINDING scaffold-knowledge-graph.mdx: #kg-tree count column learn=none: visual; no measurement of column clipping exists in the e2e
2026-11-09T06:08:51Z s=5187d371 FINDING tests/e2e/site/website-templates.e2e.ts SUBPAGES: language learn=none: test-order fix
2026-11-09T06:08:51Z s=5187d371 FINDING portfolio-neon.mdx: light-mode kicker learn=none: assertBothModes measures the root text pairs, not a decorative kicker over a gradient
2026-11-09T06:08:51Z s=5187d371 FINDING showcase-observatory.mdx: Day visit in dark mode learn=none: text over a shader is not measurable by the token check
2026-11-09T06:08:51Z s=5187d371 FINDING showcase-bouldering.mdx: Granite grain learn=none: visual
2026-11-09T06:08:51Z s=5187d371 FINDING tests/e2e/site/website-templates.e2e.ts: range waits learn=none: test fix
2026-11-09T09:18:15Z s=5187d371 FINDING tests/e2e/site/scaffold-knowledge-graph.e2e.ts: cleanup learn=none: HYPOTHESIS: a setState issued while an unseen navigation lands is overridden by the landing; falsifier: a probe issuing setState mid-flight that keeps its confi
2026-11-09T13:01:40Z s=5187d371 FINDING graph-explorer.ts layerColor: the default theme's chart colours learn=none: a visual property of the default theme; the e2e checks a part carries its layer colour, not which hue it is
2026-11-09T13:39:14Z s=5187d371 FINDING graph-explorer.ts zoomPath: flight duration learn=none: a felt speed the maintainer asked for, not a contract to pin
2026-11-09T13:39:14Z s=5187d371 FINDING graph-explorer.ts nodeActions + the KG detail renderer: Bring & Go learn=none: wording
2026-11-09T15:03:39Z s=5187d371 FINDING tests/e2e/site/charts-big-data-docs.e2e.ts: the largest groups and the rest learn=none: a timing failure under load, not reproduced
2026-11-09T17:03:22Z s=5187d371 FINDING tmp edit scripts: String.replace with $$ in the replacement learn=none: already a MEMORY lesson (use split/join); a one-off script, not a project file
2026-11-09T18:13:40Z s=5187d371 FINDING src/documentation/pages/application/border-layout.mdx "Regions that fit their content": df$ before the bundle learn=none: a static check cannot tell a parse-time df$ call from one inside a handler without parsing the script (the regex scan flagged three correct scripts); the docs e
2026-11-09T21:05:30Z s=5187d371 FINDING src/documentation/pages/guides/design-language.mdx: the stacked-rows diagram was cut learn=none: diagram.e2e covers the component's layout; a spec that cuts its own canvas shows only in a picture of the page (tmp/probe-sites3.ts)
2026-11-09T22:27:37Z s=5187d371 FINDING src/documentation/pages/shaders/shaders.mdx: the carousel widened the gallery column learn=none: a docs gallery layout; the Carousel component itself is pinned by carousel.e2e
2026-11-10T01:36:31Z s=5187d371 FINDING src/components/website/article-body/article-body.css .mk-article-body-layout > .toc learn=none: a one-property layout slip; the screenshot gate shows the page
2026-11-10T01:36:31Z s=5187d371 FINDING src/components/diagrams/diagram/diagram.ts triggerStateChange: a setState of the state shown redrew everything learn=none: a cost, not a behavior: diagram.e2e passes unchanged; a timing assertion would pin a machine
2026-11-10T01:36:31Z s=5187d371 FINDING the deck "width changes and wobbles" learn=none: reported to the maintainer as not reproduced beyond the stalls
2026-11-10T01:36:31Z s=5187d371 FINDING src/components/graphs/graph-explorer/graph-explorer.css page head learn=none: placement; graph-explorer.e2e and the screenshots cover the page
2026-11-10T01:36:31Z s=5187d371 FINDING tests/e2e/site/site-links.e2e.ts website-media #/photos/4 learn=none: not reproduced alone
2026-11-10T04:49:34Z s=5187d371 FINDING the docs card: Tab completion through the Chrome extension learn=none: not a component behavior; reproduced only through the extension
2026-11-10T04:49:34Z s=5187d371 FINDING screenshots/{light,dark}/terminal-readonly.png learn=none: a capture timing of off-screen sandboxes, not the state
2026-11-10T04:49:34Z s=5187d371 FINDING unit suite (tests/*.test.ts) - no Terminal unit test learn=none: a unit test would need the live CDN
2026-11-10T04:49:34Z s=5187d371 FINDING tests/e2e/site/section-bundles.e2e.ts wysiwyg-editors learn=none: not reproduced alone
2026-11-10T07:44:47Z s=5187d371 FINDING src/documentation/runtime/docs-search.ts showStatus re-asked the query on every status event learn=none: found in review by reading; the visible result was identical, so no test observes it
2026-11-10T07:44:47Z s=5187d371 FINDING src/documentation/runtime/search-worker.ts cachedFile and a .br sent with Content-Encoding learn=none: the e2e server sends no Content-Encoding; the dev-server path was observed in the browser probe (both lanes ready on localhost:3000)
2026-11-10T07:44:47Z s=5187d371 FINDING src/documentation/runtime/search-worker.ts FUSION byLanguage (lexical 1, vector 2 for non-English) learn=none: docs-search.e2e shows a German question ranks the Dialog page first; no measurement of alternatives
2026-11-10T07:44:47Z s=5187d371 FINDING unit suite - the search worker learn=none: a unit test would need the vendors served to Vitest
2026-11-10T11:35:24Z s=5187d371 FINDING Makefile build / scripts/deploy.sh 4b / scripts/verify.ts gates 12, 12b (PNG part), 24 learn=none: a removal by decision; verify OK and 297/297 e2e without it
2026-11-10T11:35:24Z s=5187d371 FINDING AGENTS.md, README.md + index.mdx, ARCH.md, the flagship deck, state-api / architecture pages, SKILL_tpl.md learn=none: docs; documentation.e2e renders the architecture page from ARCH.md and passed
2026-11-10T11:51:47Z s=5187d371 FINDING scripts/build.ts step 2 copy filter + 2b section flatten learn=none: make build passed with the file still in src/components/graphs/; a test would have to create Finder metadata in src/, the pipeline run is the observation
2026-11-15T14:51:22Z s=5187d371 FINDING src/documentation/pages/website/showcase-framework.mdx:paintCode learn=none: a timing race inside a demo page; showcase-sites.e2e drives the form and checks the command, a stale paint was not reproduced, only reasoned
2026-11-15T14:51:22Z s=5187d371 FINDING src/documentation/pages/website/showcase-framework.mdx:.wf-hero h1 .text-rotate learn=none: a visual clip of one page's tight headline; no generic rule - the Text Rotate component is correct at normal line-heights
2026-11-15T14:51:22Z s=5187d371 FINDING src/documentation/pages/website/showcase-framework.mdx:.wf-changes .badge learn=none: a markup slip on one page, seen in screenshots
2026-11-15T20:32:19Z s=5187d371 FINDING src/documentation/pages/application/scaffold-api-docs.mdx request() learn=none: covered by the e2e sample checks for plain ids; no further rule
2026-11-15T20:32:19Z s=5187d371 FINDING src/documentation/pages/application/scaffold-api-docs.mdx sandbox() learn=none: a 100-request e2e loop costs more than it proves
