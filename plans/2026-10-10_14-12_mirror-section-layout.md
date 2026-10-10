# One layout: the sidebar sections everywhere

Status: plan for human review (2026-10-10 14:12 UTC). Not implemented.

## Goal

`src/components/<section>/<name>/` already reads like the sidebar (verify's
`component sections` gate keeps it so). Every other tree that maps to the same
things is flat today and must mirror it:

| tree | today | target |
| --- | --- | --- |
| `src/documentation/pages/` | 386 flat `.mdx` | `pages/<section>/<slug>.mdx`; `pages/index.mdx` stays the site root |
| `dist/documentation/`, `docs/` | flat `.html` | `<section>/<slug>.html`; `index.html`, `404.html`, `css/ js/ fonts/ images/ videos/` at the root; the standalone pages beside their page (`application/app-notes.html`, `papers/full-paper.html`, `presentations/deck-*.html`) |
| `tests/e2e/` | 502 flat files (258 tests + fixtures) | `tests/e2e/<section>/<name>.e2e.ts` + fixtures for every test named after a component; the 25 site-level tests (documentation, api-docs, scaffold-*, sizing-layout, bundle, core*, section-bundles, agent-skills, qr-code-encoder, theme-designer, paper-*, kbd-docs, code-example-*, big-data-firefox) into `tests/e2e/site/` |
| `dist/apps/` | `{app}.css/.js` + min twins, 7 apps in one folder | `dist/apps/<app>/<app>.{css,js,min.css,min.js,…}` |
| `tests/*.test.ts` | 38 files, one per concern (store, schema, apps, prose...) | unchanged - they test libraries and contracts, not components; nothing to mirror (YAGNI) |

`<section>` is `sectionSlug(heading)` of the NAV section (`scripts/lib/sections.ts`),
the same function the component folders use; nested NavItem children (Animations →
Fade, Scaffolds → Messenger, Deck Gallery → 32 decks) stay in their section's
folder, two levels only. Non-component sections get folders too: `introduction/`,
`guides/` (exists), `questionnaire/` (exists), `website/` (exists).

VERIFIED[scale] BC counts: 386 pages, 981 hard-coded `href="<slug>.html…"` in pages,
390 `href:` in nav.ts, 33 flat-path sites in verify.ts, 10 scripts/lib modules and 7
docs components that join `pages/<slug>` or `<slug>.html`, 17 e2e files that open
`dist/documentation/<slug>.html`, 11 files that spell `apps/`.

## Decisions the human owns

- **D1 Public URLs change** (`shadcn.defuss.org/badge.html` → `/data-display/badge.html`).
  GitHub Pages has no server redirects. Mitigation in this plan: `sync-docs` writes a
  stub at every old flat URL (`<meta http-equiv="refresh">` + `<link rel="canonical">`
  + one line of text) and `sitemap.xml` lists only the new URLs. The stubs are
  generated from the pages list, never authored, and `verify`'s `docs release
  snapshot` gate counts them. Alternative H2 (keep the outputs flat, nest only the
  inputs) avoids the URL break at the cost of the one inconsistency the request names.
  Recommendation: H1 (nest, with stubs) - the request asks for it and the stub cost is
  one generator function; cheapest falsifier of H1's risk: open three old URLs on the
  released site after the first deploy.
- **D2 `dist/apps/<app>/`** changes the full-screen pages' own asset paths only
  (nothing else consumes them: release ZIPs carry no apps - VERIFIED BC
  `grep apps scripts/lib/release-zips.ts` = ∅). No consumer break; the changelog
  entry states it.
- **D3 One rule for every tree**: a file that belongs to a component lives in the
  component's section folder; a page that belongs to no component lives in the
  folder of the NAV section that lists it; the site root holds only `index` and
  the static asset folders. The verifier enforces exactly this (M1), so no agent
  memory entry is needed - agreed, that is how the component move stuck.

## Milestones (dependency order; tick `- [x]` when the proof passes, then `verify`)

### M0 - probe the two facts the design rests on (no source edits)

- [x] **P1 defuss-ssg renders nested page folders to nested output.** HYPOTHESIS BC
  `node_modules/defuss-ssg/dist/vite-*.mjs:447` derives the route from
  `relative(pagesDir, filePath)` for ts/js pages; the mdx path is not read yet.
  Probe: copy one page to `tmp/ssg-probe/pages/actions/button.mdx` with a minimal
  config pointing `pages` there and `DOCS_OUTPUT=tmp/ssg-probe/out`, run
  `node scripts/build-docs.ts` (it honours DOCS_OUTPUT), expect
  `tmp/ssg-probe/out/actions/button.html`. Falsifier: output lands flat or the
  build refuses a subfolder → then M3 needs a route plugin in `lib/plugins.ts`.
- [x] **P2 the SPA router and the code-example sandbox survive a nested URL.** Probe
  on the P1 output: open `actions/button.html` under the e2e server, click a nav
  link, confirm `fetch(href)` resolves relative to the page (layout.ts:491) and the
  sandbox's `THEME_BASE_PLACEHOLDER = '../theme'` (runtime/code-example.ts:46)
  becomes `../../theme`. Expected: both break until M3 - the probe measures the
  exact surface, not the fix.

### M1 - the verifier states the layout first (fails on the current tree)

One owner module for page placement, mirroring `component-dirs.ts`:

- [x] `src/documentation/lib/page-dirs.ts` (new): `pageDirs(pagesRoot)` → every
  `.mdx` with `{ slug, section, file }`; `pageFile(root, slug)`; `sectionOfPage(slug)`
  derived from `NAV` (`sectionOf(href)` in nav.ts + `sectionSlug`), `index` → `''`.
  Also `pageHref(fromSlug, toSlug)`: the relative link between two pages
  (`../data-display/badge.html`, `badge.html` inside one section, `data-display/badge.html`
  from the root). Pure; `tests/page-dirs.test.ts` pins the three link shapes, the root
  index, a nested NavItem child and a slug no section lists (throws).
- [x] `scripts/verify.ts` gate **`page sections`** (next to `component sections`): every
  `pages/**/*.mdx` sits in the folder `sectionOfPage` names; a page in no folder or
  the wrong one fails with the `git mv` to run; a component page sits in its
  component's section (equal by construction, checked anyway). `fix:` line names the
  move script of M2.
- [x] gate **`e2e sections`**: `tests/e2e/<section>/<name>.e2e.ts` for every test whose
  name is a component (and its fixtures beside it); every other test under
  `tests/e2e/site/`; nothing left at `tests/e2e/` root but `run.ts`, `server.ts`,
  `lib/`, `agent-skills/`.
- [x] gate **`app bundles`** extends `artifact contract`: `dist/apps/<app>/<app>.css`
  + `.js` + min twins + maps; nothing flat in `dist/apps/`.
- [x] gate **`page links resolve`** replaces the `.html` branch of `mdExists`
  (verify.ts:1289): an `href="…html"` in a page resolves relative to the page's own
  folder to an existing page; a flat `href="badge.html"` from another section fails
  with the rewritten form. Same rule for `href:` in nav.ts (nav hrefs become
  `<section>/<slug>.html`, resolved from the root by SiteNav/PrevNext/search index
  through `pageHref`).
- [x] gates that join flat paths move to the owner: `pages/${c}.mdx missing` (126),
  `${c}.html` (771, 824, 941, 1931, 2062), `pages/${name}.mdx` (2062), screenshots'
  `${name}.html` (`scripts/lib/inputs-files.ts:47`, `create-screenshots.ts:106`).
  Proof: the gates fail on the current tree with the moves named, pass after M2.

### M2 - move everything by script (tmp/, throwaway, run once)

- [x] `tmp/move-pages.ts`: for every page, `git mv pages/<slug>.mdx
  pages/<section>/<slug>.mdx` per `sectionOfPage`; `index.mdx` stays. Prints the plan
  first (`--dry`), then runs. Proof: `page sections` gate green; `git status` shows
  renames only.
- [x] `tmp/move-e2e.ts`: same for `tests/e2e/*.e2e.ts` + `*.e2e-fixture.html` (+ the
  `tests/e2e/<name>.*` sidecars some tests keep) into `<section>/` or `site/`.
- [x] no move for `dist/`, `docs/`: both are regenerated (M3, M5).

### M3 - generation follows the owner

- [x] `scripts/lib/docs-ssg.ts`: `STANDALONE_*` file names become section-relative
  (`standaloneAppFile(slug)` → `application/app-notes.html`); `exampleFence` unchanged.
- [x] `src/documentation/lib/components/doc-page.tsx`: a `depth` from the page's
  section (`'../'` × depth) prefixes every `css/`, `js/`, `../components/`,
  `../theme/`, `../apps/` href; `index` depth 0. The `<base>` element is rejected: it
  would also rebase every `#anchor` and the sandbox `srcdoc`.
- [x] `src/documentation/runtime/layout.ts`: `currentPage` (82, 628) = the path
  relative to the docs root (`location.pathname` minus the known root prefix the
  head script records as `data-docs-root`), not `split('/').pop()`; the one literal
  `'theme-designer.html'` (166) through the nav data.
- [x] `src/documentation/runtime/code-example.ts`: the preview asset base from the
  page's `data-docs-root`, replacing the `'../theme'` placeholder; `runtime/site.ts`,
  `theme-switcher.ts` (preset `<link>` hrefs `../theme/<id>.css`) the same way.
- [x] `src/documentation/lib/plugins.ts` search index: `h: item.href` already a nav
  href → section-prefixed; `readSkillMeta(item.href…)` reads the slug through
  `page-dirs`.
- [x] `lib/components/{site-nav,prev-next,page-header,edit-page,deck-rail,declared-states,section-bundles,stats-claim}.tsx`: every joined `pages/<slug>` or `<slug>.html`
  through `pageFile` / `pageHref`.
- [x] `scripts/lib/skill-files.ts` + `src/SKILL_root_tpl.md`: the docs-page links
  (`../../src/documentation/pages/<page>.mdx`, the raw-GitHub fallback) through
  `pageFile`; `scripts/lib/agent-skills.ts`, `stats-files.ts` (templateGroups),
  `release-zips.ts`, `version-sites.ts` (PIN_GLOBS), `stat-figures.ts`,
  `format-pages.ts`, `inputs.ts`/`inputs-files.ts`: recursive page listing from the
  owner, never `readdirSync(PAGES)`.
- [x] `scripts/bundle.ts` (DIST_APPS), `scripts/minify.ts` + `lib/minify.ts`,
  `lib/stats-files.ts:measureApps`, `lib/stats.ts`, `scripts/build-docs.ts`,
  `lib/mirror.ts` (LIVE_REF must accept `(\.\./)+(components|theme|apps)/`): `dist/apps/<app>/`.
- [x] `tests/e2e/run.ts` (recursive listing), `scripts/lib/e2e-select.ts` (test path
  carries its folder; `tests/e2e-select.test.ts` pins it), `tests/e2e/server.ts`
  (already serves any `/tests/e2e/` path), `tests/e2e/lib/css-smoke.ts` and the 17 docs
  tests that open `dist/documentation/<slug>.html` → `pageHref`-derived URLs (a shared
  `docsUrl(slug)` in `tests/e2e/lib/`), `scaffold-lean.e2e.ts` → `dist/apps/<app>/`.
  Proof: `bun run e2e --list` names every file; `bun run e2e --all` green at the end.
- [x] `scripts/sync-docs.ts`: recursive copy; `sitemap.xml` from the nested page list;
  `404.html` gets `<base href="/">` (the public site is at the domain root - the only
  page allowed a base, because it is served at arbitrary depths); the redirect stubs of
  D1 from the old flat slugs; `docs release snapshot` gate (`lib/mirror.ts:unpinnedRefs`)
  counts stubs and nested pages.
- [x] `AGENTS.md`: the project tree, "Documentation site architecture", "Adding a new
  component" step 5 (`pages/<section>/{name}.mdx`), the e2e section, `dist/apps/`.
  `README.md` + `index.mdx` only if a docs URL is spelled there (VERIFIED: README
  spells none today).

### M4 - rewrite the hard-coded links by script (tmp/, run once, idempotent)

- [x] `tmp/rewrite-links.ts`: for every page, every `href="<slug>.html(#…)?"` and
  `href="app-<n>.html"` / `deck-*.html` / `full-*.html` → `pageHref(page, target)`;
  for nav.ts every `href: '<slug>.html'` → `'<section>/<slug>.html'`; reports an href
  whose slug no page owns (today's dead links surface here). Runs the fence
  formatter afterwards (`bun run format`). Proof: `page links resolve` gate green;
  `tests/links.test.ts` (lib/links.ts) extended with one page-relative case.

### M5 - loop to green, one pipeline per round

- [x] `bun scripts/build.ts && bundle && minify && stats && figures && build:docs`,
  `bun run screenshots` (all 468 re-shoot: every page path changed), `bun scripts/verify.ts`,
  `bun run test:run`, `bun run e2e --all`. Each failing gate names its fix; fixes go
  into the owner module or the tmp scripts, never by hand into moved files.
- [x] `bun run docs` must still leave `docs/` untouched (version unchanged); the
  nested snapshot and the stubs appear with the next release - the first deploy after
  this lands is the D1 falsifier.

## Contracts touched and their checks

| contract | owner | check |
| --- | --- | --- |
| page placement, page-to-page links | `lib/page-dirs.ts` | `tests/page-dirs.test.ts`, gates `page sections`, `page links resolve` |
| component placement | `lib/component-dirs.ts` (unchanged) | `component sections` |
| asset depth of a rendered page | `DocPage` (`depth`) | `cross-page imports` gate (extend: href prefix per depth), `documentation.e2e` |
| SPA navigation on nested URLs | `runtime/layout.ts` | `ui.test.ts` "SPA navigation ..." cases |
| sandbox asset base | `runtime/code-example.ts` | `code-example-docs.e2e` |
| standalone pages | `lib/docs-ssg.ts` | `scaffold-lean.e2e`, `paper-fullscreen.e2e`, deck e2e |
| e2e placement and selection | `tests/e2e/run.ts`, `lib/e2e-select.ts` | `e2e sections` gate, `tests/e2e-select.test.ts` |
| app bundles | `scripts/bundle.ts`, `lib/stats-files.ts` | `artifact contract` (+ `app bundles`), `stats.json fresh`, `scaffold-lean.e2e` |
| release snapshot | `scripts/sync-docs.ts`, `lib/mirror.ts` | `docs release snapshot` gate (stubs, nested refs) |
| skills' page links | `lib/skill-files.ts` | `root SKILL.md ↔ sources`, `markdown link integrity` |

## Risks (material only)

- Inbound links and search results to the 386 flat URLs: the stubs keep them
  working; a `301` is impossible on Pages. Rollback: `git revert` of the release
  commit restores the flat snapshot (docs/ is a snapshot by design).
- The first `bun run screenshots` after M2 re-shoots everything (≈450 s); run it alone.
- 981 links: the rewrite is mechanical, but an `href` that intentionally pointed at
  a non-page (`app-notes.html`, `#anchor` only, an external URL) must be classified by
  the script's report before the run, not after.

## Session notes (2026-10-10, before implementation)

- D1 decided by the maintainer: nested outputs, NO redirect stubs (alpha/beta). Drop the stub generator from M3; `sitemap.xml` lists the nested URLs only; `404.html` still needs `<base href="/">`.
- M0.P1 VERIFIED from source, no build needed: defuss-ssg globs `pages/**/*.mdx` and maps a page to `relative(pagesDir, file)` with `.html` (`node_modules/defuss-ssg/dist/path-*.mjs:pageSourceFileToOutputPath`), so `pages/<section>/<slug>.mdx` renders to `<section>/<slug>.html` with no plugin.
- M0.P2 read, not run: the router keys on `location.pathname.split('/').pop()` (layout.ts:82, 628); the sandbox derives the theme base from the tokens `<link>` URL (code-example.ts:147-150) and theme-switcher.ts from the same link (164, 199) - those two follow a depth-aware `<link>` automatically; `js/` and `css/` hrefs in DocPage, `site.ts:387` (`js/theme-designer.js`), `site-header.tsx` (`index.html`, `theme-designer.html`) and the 8 docs components listed in M3 do not.
- Every flat-path site was enumerated this session (see the grep lists in the plan); nothing was edited yet. Next step: M1, starting with `src/documentation/lib/page-dirs.ts` + `tests/page-dirs.test.ts`.

## Outcome (2026-10-10, implemented)

VERIFIED: every milestone above passed its proof (build → screenshots → verify →
649 unit tests → e2e, all green on the moved tree). Three steps landed differently
from the plan, each for an observed reason:

- **M4 needed no link rewrite in the pages.** Pages keep linking by page id
  (`href="badge.html"`); `resolvePageRefs` in `page-dirs.ts` resolves every page
  and asset reference at build time (`pageRefsPlugin`, first in `docsPlugins`;
  `build-docs.ts` applies it to the standalone pages too). The authored sources stay
  layout-agnostic, so a page can move sections without an edit - the `page links
  resolve` gate checks the rendered output instead.
- **No redirect stubs (D1).** Maintainer decision ("still alpha/beta; keep it
  simple"): the old flat URLs are gone with the next release. `404.html` gets
  `<base href="/">` in the snapshot only.
- **`<base>` lives in the sandbox, not the page.** An example's `images/x.png`
  resolves against `about:srcdoc`'s host page, now a section folder. The
  code-example component gained a `base` config (`<base href>` first in the preview
  head) that `runtime/code-example.ts` sets from `data-docs-root`; the shown source
  stays as authored (paper-gallery e2e, the 404 probe on `papers/paper-media.html`).
