# Plan: print pagination - typeset breaks/keeps (Typography) + print profiles (Papers)

Goal: sensible DIN A4 print layouting with native CSS Paged Media + CSS
Fragmentation ("CSS 4" is not one release - these are independent modules;
the skill docs say so). Enhanced with the maintainer's research findings:
break/keep primitives belong to Typography, page geometry to Papers, and a
renderer-backed paginated preview is a separate, later component.

VERIFIED[repo] no `@page` / `break-before` / forced-break code exists in `src/`
today. typography.css:255-292 already owns fragmentation defaults: `orphans/
widows: 2`, `break-inside: avoid` on figure/blockquote/table/pre/.typeset-group,
`break-after: avoid` on headings (keep-with-next), `.typeset-span`
(column-span: all), `data-columns`. paper.css and mermaid.css carry
`break-inside: avoid` / `@media print` rules. So: extend the two owners, do NOT
add a third component (the findings' "Best home" column agrees).

VERIFIED[paper] the full-paper sections are `.paper-section.typeset.paper-wide`
with `data-columns="2"` (paper.mdx:401-913) - content flows through two columns
before advancing a page, so `break-before: column` is a first-class need, not a
nice-to-have.

## Scope phases

**Phase 1 (this package)**: TypesetBreak + TypesetKeep in typography.css;
PaperPrint profiles in paper.css; full-paper example uses them.

**Phase 2 (separate plan, maintainer decision first)**: `PaperPreview` - a real
paginated preview with page boundaries/numbers/guides via Paged.js or
Vivliostyle (vendored pinned ESM like editorjs, VENDOR_IMPORTS gate), the SAME
renderer driving preview and PDF export. Explicit breaks are native, but an
accurate on-screen "where does page n end" needs actual page containers -
native CSS does not expose automatic print boundaries as DOM (a ruler every
297mm would be a lie: margins, columns, keeps shift everything). Decision
needed: renderer choice + vendoring approach.

**Out of scope (documented in the skills as such)**: running heads / folios
("page n of N" - @page margin boxes are Chromium-only per MDN BCD, so
renderer-backed in Phase 2), real footnotes (`float: footnote` - Vivliostyle
only), print representations of interactive figures (per-figure future work),
baseline grid / Registerhaltigkeit (CSS Line Grid is still a draft; practical
ground is covered by typography's fixed leading multiples).

## Phase 1 design (minimum)

### Typography - breaks and keeps (`.typeset` family)

- `.typeset-break` - explicit break marker element (`<hr class="typeset-break"
  data-break="page">`; the native `<hr>` precedent is separator). Screen:
  authoring marker (dashed hairline + label, the separator "with text" pattern;
  label defaults from data-break). Print: zero-height box forcing the break -
  `display: none` would remove the box and the break with it (the pitfall the
  CSS and the e2e both pin): `block-size: 0; border: 0; visibility: hidden;`
  + pseudo-lines off.
  - `data-break="page"` (default) - `break-before: page`
  - `data-break="column"` - `break-before: column` (inside `data-columns`
    sections; the paper's two-column flow)
  - `data-break="left|right"` - duplex sheet sides
  - ALL break rules scoped to `@media print` - on screen the marker must NOT
    break the multicol layout, it only shows where the instruction sits.
- TypesetKeep:
  - `.typeset-keep` - keep-together wrapper (`break-inside: avoid-page`;
    Chromium computes it as `avoid` - document the mapping).
  - `data-break-inside="allow"` on the blocks typography keeps whole by default
    (figure/blockquote/table/pre/.typeset-group) - the findings' long-table /
    long-listing policy: short stays together, long may split.
  - `data-orphans="2|3|4"` / `data-widows="2|3|4"` on `.typeset` - widows/orphans
    become settings (default stays 2).
- Keep-with-next: already shipped (`break-after: avoid` on headings,
  typography.css:292) - documented, not duplicated.

### Papers - print profiles (`data-print` on `.paper`)

- `@page a4 { size: A4; margin: 20mm }` and `@page letter { size: Letter;
  margin: 1in }` named pages in paper.css, plus `.paper[data-print="a4"] { page:
  a4 }` / `[data-print="letter"]`. Named pages are inert until referenced - safe
  inside all.css (an unconditional `@page { size: A4 }` would hijack every
  consumer's print dialog - rejected alternative; the findings: "print presets
  should be opt-in").
- `data-binding="inner"` (with data-print): `@page a4:left` / `a4:right` margin
  asymmetry for duplex binding.
- Tokens only, `@layer components`, `forced-colors` / `prefers-contrast` where
  they apply.

UNKNOWN[support] named `@page` + `page` property and `@page :left/:right`
browser versions (Chromium/Firefox ship named pages; Safari version unobserved).
probe=`FetchURL MDN css/at-rules/page + page property` during M1 (mandatory
reference-sites step anyway); unsupported engines ignore the property - the
profile degrades to the browser default and the skill says so.

## Milestones

### M1 - typography.css + skill + page

- [ ] `src/components/primitives/typography/typography.css`: `.typeset-break`
  (+ data-break variants, print-scoped), `.typeset-keep`,
  `data-break-inside="allow"` opt-out, `data-orphans`/`data-widows`.
- [ ] `src/components/primitives/typography/component-skill.md`: the new rows
  (Native Web APIs: break-before/after/inside, orphans/widows, column breaks -
  MDN links; Notes: the display:none pitfall, avoid-page→avoid mapping,
  "CSS 4" module note).
- [ ] `src/documentation/pages/primitives/typography.mdx`: demos per variant
  (marker page/column, keep wrapper, allow-split long table), SkillPanel
  Variant rows; demo ↔ code parity by construction.
  Proof: gates `skill frontmatter`, `example fences`, `snippet sync` green at M5.

### M2 - paper.css print profiles + skill + page

- [ ] `src/components/papers/paper/paper.css`: named `@page a4`/`letter` +
  `data-print` + `data-binding="inner"` (:left/:right asymmetry).
- [ ] `src/components/papers/paper/component-skill.md` + paper.mdx: a Print
  section (code-only fence + prose; the behavior lives in the print dialog /
  PDF, which the docs cannot show inline).
- [ ] Support claims written from the M1 MDN probe, never recall.

### M3 - full-paper example integration

- [ ] paper.mdx full-paper fence: `data-print="a4"` on the article, and
  `.typeset-break` markers only where deliberate (before the References/BibTeX
  section as a page break; NOT mid-flow - forced breaks make ragged bottoms).
  Keep the existing `.paper-tools` print-hide; the fence hint names the new
  print behavior. The standalone `dist/documentation/papers/full-paper.html`
  inherits it (STANDALONE_DOCS).
  Proof: rebuilt full-paper.html contains markers; `paper-fullscreen.e2e.ts`
  green (its checks are id-based, VERIFIED they don't touch venue children
  beyond #paper-mode).

### M4 - e2e (print is observable: emulate + real PDF)

- [ ] Extend `tests/e2e/primitives/typography.e2e.{fixture.html,ts}` (docs ↔
  e2e parity): screen marker styling (dashed, muted label, centered);
  `page.emulateMedia({ media: 'print' })` → marker computed `break-before:
  page` / `column`, box collapsed (height 0 / visibility hidden);
  `.typeset-keep` computed break-inside avoid(-page); `data-break-inside=
  "allow"` computes auto; data-orphans/widows compute.
- [ ] Extend `tests/e2e/papers/paper.e2e.{fixture,ts}`:
  `page.pdf()` (headless Chromium print-to-PDF - the publishable artifact,
  consumed like a user): fixture with one marker → 2 pages (count
  `/Type /Page` non-`/Pages` hits); `data-print="a4"` and NO format arg →
  MediaBox ≈ 595.28×841.89 pt (A4 beats Chromium's Letter default - the
  discriminating assertion); marker label absent from the PDF text layer.
  HYPOTHESIS[pdf] page count / MediaBox readable by regex over the PDF buffer;
  falsifier=run the e2e once - if Chromium's serialization resists, assert via
  CDP Page.printToPDF transfer mode and say so in a plan update.

### M5 - pipeline package (one run, in order)

- [ ] `bun scripts/build.ts` + bundle + minify + stats, `bun run screenshots`
  (typography + paper pages changed → incremental re-shoot; foreground, alone -
  MEMORY.md), `bun run build:docs`, `bun run figures`.
- [ ] README.md stats-claim sentence (line 16) regenerated from fresh
  `dist/stats.json` via statsClaimText() - the KiB figures move; the CSS-only
  count (line 17) does NOT (no new component). Touch index.mdx in the SAME
  commit (README ↔ index commit-window gate).
- [ ] `vae.py prose --fix` over changed .md/.mdx, hand-fix leftovers.
- [ ] `bun run verify` → `bun run test:run` → `bun run e2e typography paper
  paper-fullscreen`. Verify is authoritative; its fix: lines amend this plan.

## Contracts touched

- typography/paper keep their single-owner roles: fragmentation defaults +
  typeset surface (typography), page geometry (paper). No new component →
  `component sections`, `sidebar coverage`, screenshot component list unchanged.
- `docs ↔ e2e parity` and `demo ↔ code parity`: every new documented option
  lands in source + page + fixture in the same commit (M1/M2/M4).
- `stats.json fresh` + `stats claim (README)`: byte sizes move (M5).
- No State API / schema / store changes: all additions are CSS.

## Risks / rollback

- Risk: `@page :left/:right` binding support gaps → inert where unsupported;
  skill states the support line from the MDN probe (M1/M2).
- Risk: markers in the docs-preview card look noisy → they are the demo; worst
  case M3 drops the markers and keeps `data-print="a4"` - M3 is separable.
- Rollback: revert the three source files + the two fixtures + README; no new
  module, nothing depends on the additions.

## Review (2026-10-11) and deviations - implemented

Probes: `tmp/print-probe*.ts` (headless Chromium via Playwright 1.63, `page.pdf()`
read back from the PDF: MediaBox, one content stream per page, the page
transform `cm` and text runs `Tm`); support lines from MDN browser-compat-data
(main, fetched 2026-10-11).

1. VERIFIED[pdf] `page.pdf()` without options prints Letter even with a named
   A4 page (612x792); `preferCSSPageSize: true` gives A4 (594.96x841.92). The
   plan's "NO format arg -> A4" assertion would have failed: the tests pass
   `preferCSSPageSize: true` (the CSS page size, as an author intends), the paper
   skill says so.
2. VERIFIED[paper] the A4 profile alone prints the full paper's sections in ONE
   column: the wide track at 170mm is 611px, two columns need 2 x 18rem + 2.5em
   = 616px (16 pages). The M3 column-flow premise only holds with a print
   scale: added `zoom: var(--paper-print-scale, 0.8)` in print for
   `.paper[data-print]` - two columns, 12 pages, everything scales together
   (font-size alone would leave the rem headings at screen size). `zoom`:
   Chrome, Firefox 126+, Safari (BCD).
3. Markers are hidden on screen by default; `data-show-breaks` on an ancestor
   shows them (the docs examples). The plan showed them always - the published
   full paper would have shown readers a "Page break" line before the citations.
4. `<div class="typeset-break">`, not `<hr>`: a page break is not a thematic
   break, and `.typeset > hr` / `.paper-section > hr` give an `<hr>` margins
   that a forced break preserves at the top of the next page.
5. `.typeset-keep` uses `break-inside: avoid`, not `avoid-page`: avoid-page
   still lets a column break split the block, and the paper flows in columns.
   (Also VERIFIED: Chromium computes `avoid-page` as `avoid-page`, not `avoid`
   as the plan stated.)
6. `@page` names carry a `paper-` prefix (`paper-a4`, `paper-a4-inner`,
   `paper-letter`, `paper-letter-inner`): page names are global like keyframes;
   the attribute values stay `a4` / `letter`.
7. VERIFIED[grid] a zero-height break box as a grid item (the `.paper`
   article) breaks the page and leaves no row gap at the top of the new page;
   `display: none` loses the break (1 page instead of 2).
8. M4: no PDF text-layer assertion (Skia writes glyph ids, not text); the
   label's absence in print is the computed `display`/`visibility`. The PDF
   checks assert page size, page count, the column break by text positions
   (falsified: without the marker the second paragraph stays in the left
   column) and the binding by the page origin (25mm / 15mm vs 20mm / 20mm).
9. `data-orphans` / `data-widows` take 3 and 4 (2 is the `.typeset` default,
   no rule needed).
10. VERIFIED[keep] (docs example screenshot) the wrapper broke the setting's
   spacing: its figure took the browser's 40px indent and its paragraph's 1em
   top margin pushed the column below a span out of level. The `.typeset`
   direct-child rules (paragraph, block gap, figure measure, headings, first
   child, the span rule, Einzug) now also reach through `.typeset-keep`, one
   selector per path; typography.e2e "keeps: ... spaced as if" failed on the
   previous dist and passes.

Support (BCD): column breaks Chromium only; `:left` / `:right` not in Firefox;
`orphans` / `widows` not in Firefox; `@page size` Safari 18.2+.

Not addressed (follow-ups): a dark theme prints its light text colours (print
from the light theme); the screenshot fingerprint's shell includes
`dist/documentation/js/` (the search index), so a new `<h2>` on any page
re-shoots every component.

Milestones M1-M4 done; M5 ran as: build.ts + bundle + minify + stats + figures
+ build:docs, the three affected e2e files, screenshots, then the vae gate.
