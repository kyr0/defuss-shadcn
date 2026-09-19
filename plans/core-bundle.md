# Core Bundle Plan — `core.js` / `core.css` for the modularized path

> Status: proposal (not implemented). Companion: [defuss-query-morph-integration.md](defuss-query-morph-integration.md)
> (morph plan; its §2.1 "df$ is host-provided" is the premise this plan completes —
> `core.js` **is** the df$ provider for hosts that don't load defuss themselves).
>
> **Idea:** today consumers pick one of two extremes — the fat `all.css`/`all.js`
> bundle, or per-component files PLUS four separate theme stylesheets PLUS their own
> defuss tag. The core bundle collapses the "modularized" path into two includes:
> **`core.css`** (tokens + sizing + layout + accessibility) and **`core.js`**
> (defuss-morph + the shared JS utilities), after which a user adds only the
> `components/{name}/*` files they actually use.

## 1. Deliverables (exactly what ships)

```
dist/core/
├── core.css          ← concat: default-semantic-tokens.css, sizing.css,
│                        layout.css, accessibility.css   (fixed order, deterministic)
├── core.min.css      ← lightningcss (same pass as all.min.css)
├── core.min.css.map
├── core.js           ← Bun.build of src/core/index.ts (sourcemap 'linked')
├── core.js.map
├── core.min.js       ← oxc-minify (same pass as all.min.js)
└── core.min.js.map
```

**`core.css` content (fixed concat order, same files pick-what-you-need users link today):**

1. `theme/utils/default-semantic-tokens.css` — tokens first; everything else reads `var(--*)`
2. `theme/utils/sizing.css`
3. `theme/utils/layout.css`
4. `theme/utils/accessibility.css`

Concat is safe for the same reasons `all.css` is: `@layer` + flat specificity + tokens
resolved at runtime. (The four stay shipped individually — core is an alternative, not
a replacement.)

**`core.js` content (built, not concatenated) — `src/core/index.ts`:**

1. **defuss-morph** via the npm library entry (tree-shaken ESM, not the 19 KiB UMD) and
   explicit registration onto the callable global:

   ```ts
   // src/core/index.ts — the df$ provider for hosts that don't load defuss.
   import { morph, updateDomWithVdom, /* … */ } from 'defuss-morph';
   import { defussGlobals } from '../shared/state-api.js';   // ensures df$.shadcn

   // callable root + preserve-and-extend, byte-for-byte the UMD's contract:
   globalThis.df$ ??= Object.assign(
     (sel: string, ctx?: ParentNode) => (ctx ?? document).querySelector(sel), { /*…*/ });
   Object.assign(globalThis.df$, { morph, updateDomWithVdom, /* … */ });
   export const shadcn = defussGlobals();   // re-export for typing/bundler users
   ```

   This also settles the morph plan's open spike question (c): nothing depends on UMD
   interop — core.js registers the same surface explicitly. Load-order safety is
   preserved both ways (defuss-first: `??=` and property-assign over the existing
   callable; core-first: the UMD preserves and extends ours).
2. **The shared JS utilities** — `defussGlobals()` (`df$.shadcn` namespace ensure) and
   the `src/shared/morph.ts` accessor (§2.2 of the morph plan) so per-component files
   and third-party page code call the SAME functions. Anything future that joins
   `src/shared/` and is page-runtime code lands here; build-time-only helpers don't.

**Modular install (the new quick start):**

```html
<link rel="stylesheet" href="…/dist/core/core.css">
<script type="module" src="…/dist/core/core.js"></script>
<!-- then, pick what you need: -->
<link rel="stylesheet" href="…/dist/components/button/button.css">
<script type="module" src="…/dist/components/dialog/dialog.js"></script>
```

Hosts that already load defuss skip `core.js` (their `df$` satisfies the morph plan's
prerequisite); they lose nothing.

## 2. Build & gates

- **`scripts/bundle.ts`** already concatenates CSS and Bun.builds JS — it gains a
  second entry pair (`core.css` file list; `core.js` with `sourcemap: 'linked'`),
  writing into `dist/core/`. No new script, no new tool.
- **`scripts/minify.ts`** walks the dist tree → core files get their `.min` twins +
  maps like everything else; the `minified artifacts` gate then *enforces* them
  automatically (add `dist/core/` to its walk root set).
- **`dist 1:1` orphan gate:** `CORE_ARTIFACTS = new Set(['core/core.css', …8 files])`
  joins `BUNDLE_ARTIFACTS` in the allow-list (generated, like the all.* twins); the
  src-side counterpart `src/core/index.ts` is docs-SSG-exempt like `src/shared/`.
- **Freshness:** no new gate needed — a rebuild always regenerates core.*; byte drift
  against `docs/` is already caught by `docs mirror fresh`.

## 3. Stats (measured, published, shown)

- **`scripts/stats.ts`** measures `dist/core/` exactly like the all.* bundle (minified
  + per-file gzipped) and passes it through `aggregateStats` as a second
  `BundleStats`: `StatsDoc.core` ([`scripts/lib/stats.ts`](../scripts/lib/stats.ts) —
  mirror the existing `bundle` field + `EMPTY_BUNDLE` default; pure, so
  [`tests/stats.test.ts`](../tests/stats.test.ts) pins the passthrough in browser mode).
- **Getting Started (`index.mdx`)**: [`StatsCards`](../src/documentation/lib/components/stats-claim.tsx)
  gains a fifth Statistic card — **"Core bundle"** → `formatKiB(stats.core.totalSizeGzMinified)`
  (+ description "core.js + core.css, min+gz"). The `stats claim` *sentence* gate stays
  untouched (README parity unaffected); the existing `stats.json fresh` gate keeps the
  card honest — sizes can't drift from the tree.
- Optional (same commit if done): Installation's "pick what you need" section and the
  README modular-install snippet mention core + its numbers — README/index parity
  window applies.

## 4. Workstreams

1. **Plumbing** (½ day): `defuss-morph` dependency + `src/core/index.ts` (registration
   + re-exports, `df$`/`df$.shadcn` global types into `src/types/defuss-shadcn.d.ts`);
   `bundle.ts` core entries; `minify.ts`/`dist 1:1` allow-lists; rebuild.
2. **Stats** (¼ day): `aggregateStats` core param + `stats.ts` measurement;
   StatsCards fifth card; `tests/stats.test.ts` extension.
3. **Proof it replaces the path** (¼ day): new e2e
   `tests/e2e/core.e2e-fixture.html` + `core.e2e.ts` — loads ONLY `core.css` +
   `core.js` + two components (one CSS-only e.g. badge, one interactive e.g. dialog),
   asserts tokens live (`--primary` resolves), utilities apply (`.flex` geometry),
   `df$` callable + `df$.morph` present, and the interactive component initializes —
   the modular path is proven end-to-end without `all.js`.
4. **Docs** (¼ day): Installation + How to Use modular sections (core quick start,
   "already have defuss? skip core.js" note); README same-commit if it changes; stats
   card; rebuild → mirror.

## 5. Decisions & non-goals

- **`dist/core/`, not `dist/components/core.*`** — core is the *foundation* folder
  (CSS content is theme-side); URL `…/dist/core/core.css` reads honestly and keeps the
  components folder purely per-component.
- **No `core.*` auto-inclusion in docs pages** — the site dogfoods `all.js` (dogfooding
  claim in the index); core is a consumer-facing install mode, proven by its e2e.
- **No component trimming / no `core.{js,css}.map` for readable files beyond the four
  listed twins + maps** — same artifact discipline as the all.* bundle.
- **Dependency note:** core.js is the first shipped artifact to embed defuss-morph;
  `stats.json` + the new card make its weight visible at all times (currently ~8 KiB
  gz estimated after tree-shaking + minify — the card, not this file, is the number of
  record).
- **Deferred:** an `all.css`/`all.js` ↔ `core + Σ components` parity e2e (core.e2e's
  two-component fixture is the smoke version); a `core` taxonomy of optional sub-
  bundles (e.g. core-minus-accessibility) — YAGNI until someone asks.

## 6. Definition of done

- eight `dist/core/` artifacts generated by `bun run build`, twins enforced by the
  min-gate, orphan-gate allow-listed, verify OK;
- `stats.json` carries `core: {…}` and the Getting Started card shows it;
- `core.e2e.ts` green (tokens, utilities, callable `df$`, component init — no all.js);
- Installation/How to Use show the two-include modular path; README claim updated in
  parity if touched.
