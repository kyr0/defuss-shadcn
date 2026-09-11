# defuss-shadcn — Maintainer Instructions

Why this system exists (written by agents, for agents): [MOTIVATION.md](MOTIVATION.md).

Scratch space: throwaway scripts, probes and scaffolds go in the repo-local
`tmp/` (gitignored) — never `/tmp` or other machine-specific locations. This
keeps everything relative to the repo root (see the `portable paths` verify
check) and inspectable. **Write the file with the file-writing tool and run it
with `bun tmp/<script>.ts` from the repo root** — do not build scripts through
`python3 - <<'PY'`/heredoc rewrites, which get permission-blocked and are
harder to iterate on than editing the file directly.

Long-running commands: always run e2e tests, screenshot generation, builds and
browser tooling with a **timeout** (execute_command's `timeout` parameter, or
`--timeout`/`PAGE_TIMEOUT_MS` inside the scripts). A stalled Chromium session
must surface as a failure with output, never as an agent hanging forever.

You are working on the **defuss-shadcn** design system repo.
The consumer-facing system lives in `dist/` — **it is generated**: edit sources in
`src/` (`bun run build` compiles the components/theme `.ts` → `.js` and copies
everything else 1:1, then renders the documentation site with
[defuss-ssg](https://github.com/kyr0/defuss) from the MDX pages + TSX components in
`src/documentation/` — `bun run build:docs`, invoked under **node**, never bun).
`docs/` is also generated: **only the documentation site** (`dist/documentation/*`
— defuss-ssg output — + `robots.txt`/`sitemap.xml` + a `404.html` copy of
`index.html` so GitHub Pages never serves an empty page for dead links) published by
GitHub Pages — its pages' `../components/…` and
`../theme/…` references are rewritten to the jsDelivr GitHub CDN (shared transform in
`scripts/lib/mirror.ts`), so the mirror carries no copies of the component assets.
Refresh it with `bun run docs` (`make build` does this automatically and `verify`
fails if the mirror drifts). Never edit `docs/` directly — like `dist/`, it is
deleted and rebuilt on every `bun run docs`.
Because the docs pages load their assets from jsDelivr `@latest` (newest git tag),
a fresh release keeps serving the **previous** release's CSS/JS until jsDelivr's
cache expires (12h edge, 7d browser). After `bun run deploy`, run
`bun run purge-cdn` (`make purge-cdn`) to force `@latest` to re-resolve to the
new tag immediately.
Never edit `dist/` directly; it is deleted and rebuilt on every build.

---

## Project structure

```
defuss-shadcn/
├── dist/                              ← the distributable (drop into any project)
│   ├── SKILL.md                       ← agent entry point (generated from src/SKILL_tpl.md + skill frontmatter)
│   ├── stats.json                     ← generated size/surface summary (counts per type, JS split, byte sizes; `make stats`)
│   ├── theme/                        ← design tokens + optional standalone modules
│   │   ├── default-semantic-tokens.css        ← tokens (source of truth for colors, radius, shadows)
│   │   ├── sizing.css                         ← opt-in numeric scale (w-4 = 4 base units, --size-* aliases, density)
│   │   └── layout.css                         ← opt-in layout surface (flex, grid, stack, container, query)
│   ├── components/                    ← self-contained component folders
│   │   ├── all.css / all.js          ← generated single-file bundle (scripts/bundle.ts; + .min twins & maps from minify.ts)
│   │   └── {name}/
│   │       ├── component-skill.md      ← component skill (frontmatter + HTML structure & ARIA reference)
│   │       ├── {name}.css             ← component stylesheet (edit directly)
│   │       └── {name}.js              ← interaction JS (only for interactive components)
│   └── documentation/                 ← defuss-ssg OUTPUT (never edit): the public website
│       ├── *.html                     ← one page per component + overview pages (rendered from src/documentation/pages/*.mdx)
│       ├── css/ fonts/ images/ videos/  ← copied verbatim from src/documentation/public/
│       └── js/                        ← compiled docs runtime + generated search index
│
├── src/documentation/                 ← the defuss-ssg project (docs authoring)
│   ├── config.ts                      ← SSG config: pages → ../../dist/documentation, plugins, no-math remark set
│   ├── pages/*.mdx                    ← one page per component + overview pages (frontmatter + <DocPage> shell)
│   ├── lib/
│   │   ├── nav.ts                     ← the sidebar NAV data (single source for nav, prev/next, search index)
│   │   ├── arch-md.ts                 ← ARCH.md → .arch-prose renderer (shared by component + verify gate)
│   │   ├── plugins.ts                 ← SSG plugins: doctype, static TOC injection, search-index generation
│   │   └── components/*.tsx           ← the docs design system: DocPage, SiteHeader, SiteNav, PageHeader,
│   │                                     SkillPanel, Example(+Label/Hint/Code), Demo(+DemoCode), SourceFiles
│   │                                     (+SourceNote), StatesSection, ChangelogEntries, StatsClaim/Cards,
│   │                                     PrevNext, SiteFooter, ArchBody, PageOverlay — static, no hydration
│   ├── runtime/*.ts                   ← client JS (tsc → public/js): layout.ts (pre-paint dark/wide, SPA router,
│   │                                     palette, nav persistence, TOC tracking), site.ts (copy, code collapse,
│   │                                     viewport toolbar, tabs, swatches), themes.ts, theme-switcher.ts,
│   │                                     shiki-highlight.ts
│   ├── data/changelog.json            ← release entries (deploy.sh writes via scripts/changelog-entry.ts)
│   └── public/                        ← copied verbatim to dist/documentation/: css/ fonts/ images/ videos/
│
├── .github/
│   ├── instructions/                  ← auto-attached instruction files for Copilot
│   │   ├── documentation.instructions.md
│   │   ├── specifications.instructions.md
│   │   └── tokens.instructions.md
│   └── prompts/                       ← reusable prompt files
│       └── component-review.prompt.md
│
├── screenshots/                       ← generated PNGs per component AND per declared state, light/ + dark/ (`bun run screenshots`, gitignored) — SKILL.md maps state names to these files
├── scripts/                           ← build & maintenance scripts (no one-shot migrations)
│   ├── build.ts                       ← src/ → dist/ components+theme (tsc type-strip + sourceMap + copy 1:1; the docs tree is NOT copied — defuss-ssg renders it)
│   ├── build-docs.ts                  ← dist/documentation producer: compiles runtime → public/js, then defuss-ssg build (runs under node)
│   ├── bundle.ts                      ← dist/components/all.css (concat) + all.js (Bun.build from src .ts) single-file bundle
│   ├── minify.ts                      ← post-pass: per-component *.min.css (lightningcss) + *.min.js + *.min.js.map (oxc-minify; `make minify`)
│   ├── stats.ts                       ← post-minify pass: measures dist/components/ → dist/stats.json (`make stats`)
│   ├── lib/stats.ts                   ← stats aggregation core (pure: counts + totals, no fs/zlib)
│   ├── lib/stats-files.ts             ← dist/components/ byte+gzip measurement (writer + verify gate share it)
│   ├── verify.ts                      ← static consistency gate (runs at end of build; `bun run verify`)
│   ├── sync-docs.ts                   ← mirror dist/documentation → docs/ (CDN-rewritten; `bun run docs`)
│   ├── changelog-entry.ts             ← changelog data surgery for deploy.sh (add entry / stamp hash — the two-commit rule)
│   ├── lib/mirror.ts                  ← shared docs/ mirror transform (sync-docs + verify compare against it)
│   ├── lib/skill.ts                   ← SKILL.md generation core: frontmatter parser + index renderer (pure)
│   ├── lib/skill-files.ts             ← dist/SKILL.md index generator from src/SKILL_tpl.md + skill frontmatter (build.ts regenerates every build)
│   ├── create-screenshots.ts          ← parallel default-state screenshots for agent inspection
│   ├── lib/audit.ts                   ← undefined-utility audit (used by verify)
│   ├── lib/minify.ts                  ← derived-artifact recognition (verify 1:1 allow-list + min-twin gate; pure)
│   ├── push.sh                        ← commit + push dev → main (non-release)
│   ├── deploy.sh                      ← release: version bump, changelog, tag, GitHub release
│   └── purge-cdn.ts                   ← purge jsDelivr @latest cache for all dist assets (run after deploy)
├── tests/                             ← UI tests (Vitest browser mode + Playwright)
│   ├── helpers.ts                     ← loads real doc pages in a same-origin iframe
│   ├── ui.test.ts                     ← end-to-end tests of the actual site UI
│   └── e2e/                           ← per-component smoke tests (plain Playwright)
│       ├── run.ts                    ← `bun run e2e` runner: every *.e2e.ts file
│       ├── server.ts                 ← Bun static server exposing /dist and /tests/e2e
│       └── accordion.e2e-{fixture.html,ts}  ← fixture + test for one component
├── vitest.config.ts                   ← browser-mode test config (root = repo root)
├── Makefile                           ← setup / dev / test / e2e / build shortcuts (wrappers for bun scripts)
│
└── AGENTS.md                          ← this file (maintainer instructions)
```

---

## Critical rules

### The verifier is authoritative

`bun run verify` is the single source of truth for "is this done?". Its
output — including every `fix:` line it prints on failure — overrides any
interpretation of this file: when prose and verifier disagree, the verifier
wins and its `fix:` line is the work to do. A build is only ever as good as
its last green `verify` run; there is no flag that skips the gate. (The
warn-ratchets it still reports, e.g. `STATE_API_LEGACY`, are named migration
debt with an explicit removal path — not permission to ignore them.) The
full rationale lives in [ARCH.md](ARCH.md).

### Each component owns its dialog

`dialog.js`'s init claims plain `<dialog>` elements for backdrop-click close —
via a `dialog:not(.alert-dialog):not(.sheet):not(.command):not([data-init])`
selector. **Any component that ships its own `<dialog class="…">` with custom
behavior must be `:not()`-excluded there**, or dialog.js (loaded before every
component script on all doc pages) stamps `data-init` first and the real
owner's init silently skips the element — the docs search palette was dead
exactly this way once. `verify`'s `dialog ownership boundary` gate enforces
the exclusion list for the three dialog owners (alert-dialog, sheet, command);
extend the list in both places when a fourth appears.

The docs header search is the shipped command component itself: clicking the
input (or ⌘/Ctrl+K) opens `<dialog class="command" id="docs-palette">` (static
markup from `lib/components/site-header.tsx`), fed by the build-time index
(`lib/plugins.ts` post hook → `dist/documentation/js/search-index.js`, built
from NAV + every rendered page's `<h2>`). The trigger is click/Enter only —
never `focus`: `dialog.close()` restores focus to the opener synchronously,
which would bounce the palette open again.

### README ↔ index parity

`README.md` and `src/documentation/pages/index.mdx` describe the same system to
humans and to browser users — **when you update either, update the other in
the same commit.** They share two claims that drift independently if you
forget:

- **Pillar set** — the README intro bullets (`- **Name** — …`, under "What
  this is" and before "Quick start") and the index pillar cards
  (`<h3 class="card-title">`) must list the same set of pillars.
- **Hero sentence** — the intro paragraph wording must match
  (`"No build step for consumers — dist/ is committed and ready to use
  as-is."` once diverged to a bare `"No build step."`).
- **CDN dogfooding** — the index carries the "this site loads its assets
  from the jsDelivr CDN, exactly as README's Via CDN quick start shows — if
  it renders, the CDN install works" note, which must stay true if the CDN
  strategy in [`scripts/lib/mirror.ts`](scripts/lib/mirror.ts) ever changes.
- **CSS-only count** — the "**N of M components need no JavaScript**" line
  appears in both README.md and the index (rendered by the `CssOnlyStat`
  component from the actual tree); `verify`'s
  `README CSS-only stat` / `index CSS-only stat` gates compare it against
  the actual `src/components/` tree (a component `.ts` = ships a `.js`).
- **Stats claim** — the measured footprint sentence (total / withJs /
  withoutJs + KiB-formatted gzip sizes) appears in both files, generated
  from `dist/stats.json` by `statsClaimText()`; the index renders it via the
  `StatsClaim`/`StatsCards` components; `verify`'s `stats claim`
  gate fails when either file's sentence no longer matches the measurement.

`verify` enforces the pillar set (`README ↔ index parity`, hard gate) and the
**`README ↔ index commit window`** gate: if the two files' last-touch commits
(README.md and `src/documentation/pages/index.mdx`) are neither identical nor
within **15 minutes** of each other, the build fails as "un-synced edit" —
forcing you to land them together. Wording parity itself is yours to maintain
(no automated text diff; the window is the backstop).

### Changelog (two-commit rule)

Every version in `package.json` needs an entry in
[`src/documentation/data/changelog.json`](src/documentation/data/changelog.json)
(rendered by `lib/components/changelog-entries.tsx`) listing
**all commit messages** of that release (deploy.sh adds them via
`scripts/changelog-entry.ts`; v0.7.14 was the first release after the fork from
codylindley/shadcn-html, so its entry documents the fork). Each entry shows
either the release date badge or — once the version is actually **committed** —
the short git hash of the commit that added the entry (the entry's `hash`
field). The hash is unknowable before that commit exists, so authoring an
entry is inherently **two commits**:

1. commit the entry (with date badge),
2. commit that commit's short hash into the entry.

`verify`'s `changelog ↔ version` gate fails when the committed `package.json`
version has no entry (or a hash-less / message-less entry for that version);
its `fix:` line states the two-commit instruction. `scripts/deploy.sh`
automates the whole flow. Legacy entries (v0.7.13-alpha and earlier) keep
date-only badges — the hash requirement applies from this rule onward.

### ARCH.md ↔ architecture page sync (REQUIRED)

[`ARCH.md`](ARCH.md) is the repo's design manifesto (why the verifier is the
authority, how the proof loop works, where the human review sits). The docs
site publishes it as an Overview page: `pages/architecture.mdx` renders
`<ArchBody/>`, which converts ARCH.md to the `.arch-prose` body at SSG build
time via [`src/documentation/lib/arch-md.ts`](src/documentation/lib/arch-md.ts)
(the same renderer the gate uses).

- **When you edit ARCH.md, run `bun run build` in the same commit** — the page
  is re-rendered from it. `verify`'s `architecture ↔ ARCH.md` gate compares
  the built page's body against a fresh ARCH.md render and fails on drift,
  exactly like the SKILL.md index.
- **Never hand-edit the page body** (or its `dist/` / `docs/` copies): it is
  regenerated on every docs build; the gate would fail anyway.

### Native web platform first

Every component starts from a native HTML element or browser API. If the browser
can do it, we don't write JavaScript for it.

**HTML elements & attributes**

- Use `<dialog>` for modals — not divs with JS show/hide
- Use `popover` API for dropdowns, tooltips, toasts — not JS positioning
- Use `popover="hint"` for tooltips — not `popover="auto"` (hints don't
  close other popovers)
- Use `<details>/<summary>` for accordions — not JS toggle logic
- Use `<details name="group">` for exclusive (single-open) accordions — not
  JS that closes siblings
- Use `commandfor` / `command` attributes for declarative button→dialog/popover
  triggers — not JS click handlers that call `showModal()` or `togglePopover()`
- Use `<progress>` for completion indicators — not div-based progress bars
- Use `<meter>` for scalar values in a range — not custom gauge components
- Use `<output>` for computed/live results — not manual `aria-live` regions
- Use `inert` attribute to disable interaction on background content — not
  JS focus traps or `aria-hidden` toggling
- Use `loading="lazy"` for images/iframes — not JS lazy load libraries
- Use `autofocus` in dialogs/popovers — not JS `.focus()` calls
- Use `inputmode` for mobile keyboard hints — not separate input types
- Use `enterkeyhint` for mobile Enter key labels (`search`, `send`, `go`)
- Use `autocomplete` with proper field names — not custom autofill
- Use `<datalist>` for native type-ahead suggestions — not custom dropdowns
- Use `fetchpriority` for resource priority hints (`high`/`low`)
- Use `disabled` / `readonly` for native form states — not JS class toggling

**CSS**

- Use `@starting-style` + `transition-behavior: allow-discrete` for
  enter/exit animations on `display: none` elements — not JS class toggling
- Use CSS anchor positioning for popover placement — not Floating UI / Popper
- Use `::backdrop` + `backdrop-filter` for dialog/sheet overlays — not
  JS-managed overlay divs or canvas blur
- Use `:has()` for parent-state reactions — not JS class propagation
- Use `:focus-visible` for keyboard-only focus rings — not JS focus detection
- Use `:user-valid` / `:user-invalid` for post-interaction validation
  styling — not JS blur listeners with class toggling
- Use `field-sizing: content` for auto-growing textareas — not JS resize
- Use `oklch()` and relative color syntax for wide-gamut, derived colors — not
  hardcoded hex/hsl palettes
- Use `color-mix(in oklch, ...)` for hover/disabled color derivation — not
  Sass `darken()`/`lighten()` or hardcoded variants
- Use `light-dark()` for inline dark mode values — not media queries or
  class toggles when `color-scheme` is already set
- Use `color-scheme` property for dark mode browser defaults — not all-manual
  dark overrides on every native element
- Use `accent-color` for theming native form controls — not custom replacements
- Use `text-wrap: balance` for headings and labels — not JS text-balancing
- Use `text-wrap: pretty` for body text orphan prevention — not manual `&nbsp;`
- Use `overscroll-behavior: contain` on scroll containers inside overlays — not
  JS scroll-lock libraries
- Use `scroll-snap` for carousel/slider snap points — not JS snap calculations
- Use `scrollbar-gutter: stable` to prevent layout shift from scrollbars — not
  padding hacks
- Use individual transform properties (`rotate`, `scale`, `translate`) — not
  compound `transform` strings
- Use CSS nesting, `@layer`, container queries — not preprocessors
- Use `aspect-ratio` for intrinsic ratios — not padding-bottom hacks
- Use `content-visibility` for expand/collapse transitions — not JS lazy rendering
- Use `interpolate-size: allow-keywords` for animating to `auto` height — not
  JS measurement or `max-height` hacks
- Use `@property` for typed, animatable custom properties — not JS animation
  of CSS values
- Use scroll-driven animations (`animation-timeline: scroll()` / `view()`) for
  scroll-linked effects — not scroll listeners or IntersectionObserver
- Use View Transitions API for smooth DOM state changes — not JS crossfades
- Use `@supports` for CSS feature detection — not Modernizr or JS detection
- Use logical properties (`margin-inline`, `padding-block`) for RTL support — not
  separate LTR/RTL stylesheets
- Use subgrid for aligned child layouts — not manually synchronized columns
- Use dynamic viewport units (`dvh`, `svh`, `lvh`) — not JS `innerHeight` hacks
- Use CSS math functions (`clamp()`, `min()`, `max()`) for responsive sizing — not
  JS resize calculations
- Use `:is()` / `:where()` for selector grouping — not repeated selectors
- Use `hanging-punctuation` for optical quote alignment — not negative text-indent
- Use `@layer` + descriptive prefixed class names (`card-header`, `slider-track`) for
  style scoping — not `@scope` (generic class names lose context for AI generation)
  or Shadow DOM
- Use `@media (scripting)` for no-JS progressive enhancement — not `<noscript>` alone

**Accessibility (REQUIRED)**

- Use `prefers-reduced-motion: reduce` to suppress/simplify all animations — not
  ignoring motion preferences (this is an accessibility requirement, not optional)
- Use `prefers-contrast: more` to increase contrast when requested
- Use `forced-colors: active` to support Windows High Contrast Mode with system colors
- Use `prefers-color-scheme` for automatic dark mode defaults

**JavaScript (only when HTML/CSS cannot express it)**

- Use Web Animations API (`el.animate()`) for imperative animations — not CSS
  class toggling when JS needs to coordinate timing
- Use `Intl` APIs (`DateTimeFormat`, `NumberFormat`, `RelativeTimeFormat`,
  `ListFormat`) for locale-aware formatting — not moment.js or date-fns
- Use native Drag and Drop API for reordering — not SortableJS or drag libraries
- Use `CustomEvent` for component-to-component communication — not framework
  event systems
- Use `element.checkVisibility()` for visibility detection — not manual
  offset calculations
- Use `IntersectionObserver` for viewport-entry detection — not scroll listeners
  with `getBoundingClientRect()`
- Use `ResizeObserver` for element size changes — not window resize listeners
- Use `MutationObserver` for DOM change reactions — not polling loops
- Use `navigator.clipboard` for clipboard access — not `document.execCommand('copy')`
- Use `CloseWatcher` for platform close signals in custom UI — not manual
  Escape key listeners
- Use `AbortController` for canceling fetches/listeners — not boolean flags
- Use `FormData` for form serialization — not manual value collection loops
- Use `structuredClone()` for deep cloning — not `JSON.parse(JSON.stringify())`
- Use `ElementInternals` for custom form elements — not hidden input proxies
- Use Navigation API for SPA routing — not History API hacks

JavaScript is only for behavior that HTML and CSS cannot express: keyboard
navigation patterns, focus management, and state coordination between elements.
Use modern ECMAScript (ES modules, arrow functions, `const`/`let`, etc.) —
no libraries, no frameworks.

All `querySelectorAll` loops that add event listeners **must** guard against
double-initialization using `:not([data-init])` in the selector and setting
`element.dataset.init = ''` as the first line inside the loop.

Component JS files wrap initialization in an `init()` function, call it once,
then use a `MutationObserver` to auto-initialize new elements after SPA
navigation or dynamic DOM changes:

```js
function init() {
  document.querySelectorAll('.my-component:not([data-init])').forEach((el) => {
    el.dataset.init = '';
    el.addEventListener('click', () => { /* … */ });
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
```

For document-level event delegation (no per-element loop), use a global flag:
```js
if (!document.__myComponentInit) {
  document.__myComponentInit = true;
  document.addEventListener('click', (e) => { /* … */ });
}
```

### No window globals (REQUIRED)

Never define or read application globals on `window` — use `globalThis`, and keep
every name under the single namespace `globalThis._defussShadcn`:

```js
globalThis._defussShadcn = globalThis._defussShadcn || {};   // idempotent bootstrap
globalThis._defussShadcn.toast = { show, success, dismiss }; // public imperative API
```

- Components expose their State API as `_defussShadcn.{name}Api` / `{name}States`
  (see "State API" below); a component's additional public imperative API lives
  under `_defussShadcn.{name}` — never as a bare global. Example: the toast
  factory is `_defussShadcn.toast.show(...)`, **not** `window.toast = { … }`.
- Doc-site-only scripts (not shipped) share the same discipline under
  `_defussShadcn.docs` (theme registry, SPA hooks: `THEMES`, `applyTheme`,
  `onPageReady`, …).
- Third-party CDN globals (`lucide`, `marked`) are owned by their vendors — read
  them via `globalThis.*`; never assign to `window`.

**Why:** `window` is a browser-only alias; `globalThis` is the one canonical
global object and works unchanged in Workers and other runtimes (see the
isomorphic rule). Scoping everything under `_defussShadcn` keeps a
copy-paste/CDN-shipped system collision-free on hosts we do not control.
`scripts/verify.ts` fails the build on any `window.x =` assignment in `src/`.

### Each component is a self-contained folder

Each component at `dist/components/{name}/` contains:
- `component-skill.md` — component skill: HTML structure, attributes, ARIA, and usage notes
- `{name}.css` — the component stylesheet (edit directly)
- `{name}.js` — interaction JS (only for interactive components, edit directly)

The component skill `.md` file documents **how to build the HTML**. The `.css` and `.js` files
are the actual implementation — edit them directly, no build step needed.

### State API (REQUIRED for every JS component)

Components with a `.js` file have observable UI states (open/closed, collapsed,
selected…). Every such component must expose its states **by name** so agents and
tests can drive them without knowing the implementation:

```js
document.querySelector('#x').api.setState('open', { /* config */ });
document.querySelector('#x').api.getState(); // → { name: 'open', config: { … } }
```

**Required shape of `{name}.js`** (verify.ts enforces these markers by regex;
`accordion.ts` and `dialog.ts` are the reference implementations):

1. **Preamble** — import the shared helper (single source in
   `src/shared/state-api.ts`; `build.ts` inlines it into the shipped `.js`,
   so dist components stay isolated single files):
   ```js
   import { defussGlobals } from '../../shared/state-api.js';
   const _defussShadcn = defussGlobals();
   ```
2. **State list** — `const {name}States = ['default', …]` — `'default'` must be
   the first entry and always be one of the declared states. Every component
   starts in its `default` state unless markup declares otherwise.
3. **`triggerStateChange(el, stateName, config)`** — the only function that
   touches the DOM for a state change; `switch`/dispatch over the declared states.
4. **Registry API** — `export const {name}Api = { setState(el, name, config), getState(el) }`
   with the element passed explicitly; reject unknown state names by throwing.
   Register both globals:
   ```js
   globalThis._defussShadcn.{name}Api = {name}Api;
   globalThis._defussShadcn.{name}States = {name}States;
   ```
5. **Per-instance binding** inside `init()`, on each element the component
   initializes (state lives **on the element** — `dataset.stateName` +
   `_stateConfig` — never in module scope; 26 components share one page and each
   instance may hold a different state):
   ```js
   el.api = {
     setState: (stateName, config) => {name}Api.setState(el, stateName, config),
     getState: () => {name}Api.getState(el),
   };
   ```
6. **Document the states** in the component skill (`component-skill.md` →
   `## States` section): state names, meaning, and one `api.setState(...)` example.
7. **Every state must be visually verifiable** — four artifacts cover each
   declared state (verify.ts parses `{name}States = [...]` and checks all four):
   - **Doc page**: `pages/{name}.mdx` has a `<StatesSection>` listing
     `<code>{state}</code>` per state, AND the state-bearing demo element
     carries `data-state-demo` (the anchor `create-screenshots.ts` drives via
     `api.setState()` to capture `screenshots/{mode}/{name}-{state}.png`)
   - **Screenshots**: one PNG per state per mode (light + dark), default state
     as `{name}.png` from the first `.preview`
   - **Skill**: the state name appears in the `## States` section
   - **E2E**: the state name string appears in `{name}.e2e.ts` (a
     `setState(name)` assertion)
   Adding a state without all four fails the build.

Types for the globals live in `src/types/defuss-shadcn.d.ts` — extend it when the
contract grows; never re-declare the globals inside a component file.

`scripts/verify.ts` checks all markers for every new JS component (hard fail).
Legacy components in its `STATE_API_LEGACY` list warn only until migrated —
remove a name from the list in the same commit that migrates the component.

### Theme radius consistency (REQUIRED)

A theme is **one identity, two palettes** — light and dark are the same
theme, so its shape (`radius`) must be **identical in both modes**. If Doom64
is hard-square in dark mode it is hard-square in light mode; if ChatGPT is
pill-round in dark, light is pill-round too. A theme that only declares
`radius` in one mode silently reverts the other to the default rounding, so
toggling dark mode "changes the theme's shape" — reported (Doom64, Retro
Arcade) and now gated.

- In `src/documentation/runtime/themes.ts`, declare `radius` in **both** the
  `light` and `dark` block of every theme, with the same value.
- `verify`'s `theme radius consistency` gate fails the build otherwise.
- Same principle for **contrast**: every theme's sidebar text pairs must
  reach WCAG AA (≥ 4.5) in *both* modes — see the `theme sidebar contrast`
  gate. Re-tune one mode's color and you own both.

### Tokens are the source of truth for design values

`dist/theme/default-semantic-tokens.css` defines all CSS custom properties. These must match
the shape of tweakcn.com theme exports so themes are drop-in compatible.

The token file provides:
- Color pairs (surface + foreground) for light and dark modes
- `--radius` (base) — derived values (`--radius-sm/md/lg/xl`) are computed in the token file
- Shadow scale and composition tokens
- Font stacks (generic — overridden by doc site)
- Spacing and tracking

#### Tokens & Theme

##### Token boundary rule (CRITICAL)

**Components must only use the tokens that exist in the TweakCN export shape.**

- `default-semantic-tokens.css` defines the complete set of available CSS custom properties.
- No new custom properties may be added to `default-semantic-tokens.css` beyond what TweakCN provides.
- Components CSS (`dist/components/{name}/{name}.css`)
  must reference only these tokens via `var(--*)`.
- If a component needs a color that has no token (e.g., status colors like
  green/amber/blue), use a hardcoded CSS value directly in the component CSS.
  Do NOT invent a new `--*` token for it.

###### Why
TweakCN themes are drop-in replacements. If we add tokens that TweakCN doesn't
export, swapping a theme will leave those tokens undefined and break components.
The token file must be a pure subset of what TweakCN produces.

###### Allowed token list (exhaustive)

**Color pairs** (surface + foreground):
`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`,
`--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`,
`--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`,
`--accent-foreground`, `--destructive`, `--destructive-foreground`

**Utility tokens**: `--border`, `--input`, `--ring`

**Sidebar tokens**: `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`,
`--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`,
`--sidebar-border`, `--sidebar-ring`

**Chart tokens**: `--chart-1` through `--chart-5`

**Typography**: `--font-sans`, `--font-serif`, `--font-mono`

**Radius**: `--radius` (base), `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` (derived)

**Shadow scale**: `--shadow-2xs` through `--shadow-2xl`

**Spacing**: `--spacing`

**Tracking**: `--tracking-normal`

**Nothing else.** If a value is not on this list, it cannot be a `var(--*)` reference
in component CSS. Use a literal CSS value instead.

###### Token shape (tweakcn compatible)

`dist/theme/default-semantic-tokens.css` must match the shape of theme exports from tweakcn.com:

###### `:root` block provides:
- Color pairs: `--primary` / `--primary-foreground` (and all other semantic pairs)
- Utility tokens: `--border`, `--input`, `--ring`
- Sidebar tokens: `--sidebar`, `--sidebar-foreground`, etc.
- Chart tokens: `--chart-1` through `--chart-5`
- Font stacks: `--font-sans`, `--font-serif`, `--font-mono` (generic defaults)
- Base radius: `--radius`
- Derived radius: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` (computed from `var(--radius)`)
- Shadow scale: `--shadow-2xs` through `--shadow-2xl`
- Spacing: `--spacing`
- Tracking: `--tracking-normal`

###### `.dark` block overrides:
- All color pairs for dark mode
- Same tokens, different values

###### Derived radius values

Tweakcn themes provide `--radius` and derived values. The derived values use additive offsets:
```css
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
```

These exist as real CSS custom properties because component CSS uses `var(--radius-md)` directly.

### Documentation site architecture

The docs are a **statically rendered multi-page app**: every page is a full HTML
document produced by defuss-ssg from `pages/*.mdx` + the shared TSX components in
`lib/components/` (DocPage shell, SiteHeader, SiteNav, PrevNext, SiteFooter —
**no custom elements, no runtime chrome injection**; the TOC and § anchors are
injected at build time by `lib/plugins.ts`'s toc plugin). The doc site dev
server runs on `http://localhost:3000/` via `bun run dev` (Vite, serves `dist/`).
When testing, use the existing dev server — don't start a new one.

The client runtime (`runtime/*.ts`, compiled to `public/js/` before the SSG
build) adds the interactive behavior on top of the static markup:

- **pre-paint init** (layout.ts, synchronous in `<head>`) — dark mode + wide mode
  from localStorage/OS preference, no FOUC
- **SPA router** (layout.ts) — intercepts nav clicks, fetches the sibling page,
  swaps `<main>` innerHTML + the `.site-toc` aside, migrates page-level
  dialogs/popovers, updates title/history/active link (View Transitions
  crossfade). Chrome is never swapped, so palette/header state survives.
- **site.ts** — copy buttons, code collapse toolbar, viewport-width toolbars on
  `.demo[data-viewport]`, doc tabs, token swatches, lucide re-run, hash-link
  realign
- **themes.ts / theme-switcher.ts** — tweakcn presets + live token overrides
- **shiki-highlight.ts** — Shiki syntax highlighting (ES module, CDN)

**Sidebar nav data is centralized in `lib/nav.ts`** (NAV sections + items; the
SiteNav component renders it statically per page, prev/next and the search
index derive from the same data). To add or reorder nav links, edit that one
file — the verify `sidebar coverage` gate keeps it in sync with `pages/`.

Each rendered page loads the component bundle — one `<link rel="stylesheet" href="../components/all.css">`
in `<head>` and one `<script type="module" src="../components/all.js"></script>` at end of `<body>`
(generated by `scripts/bundle.ts`, so it always covers every component). Adding a new
component needs **no per-page import changes** — rebuilding regenerates the bundle.

---

## Adding a new component

### Reference sites (REQUIRED)

Before writing any component skill or documentation page, **fetch and review** the component on these sites:

#### Feature checklist (what to build)
1. **shadcn/ui** → `https://ui.shadcn.com/docs/components/{name}`
2. **Basecoat UI** → `https://basecoatui.com/components/{name}/`

These define the completeness bar. Every variant, size, state, and composition pattern
shown on those pages must be accounted for in the component skill and doc page — adapted
to our semantic HTML / CSS custom property / vanilla JS model. Do not copy their markup;
use them as a feature checklist.

#### Native implementation (how to build it)
3. **WAI-ARIA APG** → `https://www.w3.org/WAI/ARIA/apg/patterns/{name}/` — canonical keyboard navigation and ARIA patterns
4. **MDN Web Docs** → `https://developer.mozilla.org/` — authoritative reference for HTML elements, CSS properties, and JS APIs
5. **Open UI** → `https://open-ui.org` — W3C community group defining native component standards
6. **Base UI** → `https://base-ui.com/react/components/{name}` — headless component architecture (closest to our approach in spirit)

Always prefer native browser APIs over JS workarounds. Check MDN for the latest
support status of newer APIs (`popover`, anchor positioning, `@starting-style`, etc.).

### Steps

1. **Create the component folder** → `dist/components/{name}/`

2. **Write the component skill** → `dist/components/{name}/component-skill.md`
   - Follow the template: Native basis → Native Web APIs → Structure → Variants → Sizes → ARIA → Notes
   - Documents the HTML pattern, not CSS/JS (those are the actual files)
   - Cross-check variants, sizes, and states against the reference sites above

3. **Write the CSS** → `dist/components/{name}/{name}.css`
   - Edit directly — no build step

4. **Write the JS** (if interactive) → `dist/components/{name}/{name}.js`
   - Plain ES module — wrap initialization in an `init()` function
   - Call `init()` immediately, then add `new MutationObserver(init).observe(document, { childList: true, subtree: true });`
   - This auto-initializes new elements after SPA navigation or dynamic DOM changes
   - No `export`, no `window.onPageReady` — just the init function + MutationObserver

5. **Create the doc page** → `src/documentation/pages/{name}.mdx`
   - Copy an existing component page as template (e.g., badge.mdx) — the
     `<DocPage>` shell, `<PageHeader>`, `<SkillPanel>`, `<Example>` demos,
     `<StatesSection>` and `<SourceFiles component="{name}">` compose the page;
     no bundle imports needed (all.css / all.js come from DocPage)

6. **Update lib/nav.ts** → add the page to the `NAV` array in
   `src/documentation/lib/nav.ts` (single source for sidebar nav, prev/next,
   and the search index — the `sidebar coverage` verify gate enforces it)

7. **Rebuild** → `bun run build` regenerates the bundle AND the docs site
   (defuss-ssg renders every page; the search index post-hook picks the new
   page up automatically). The component's source listings are embedded by
   `<SourceFiles>` at build time — nothing else to sync.


# Component Skill Editing

## Reference sites (REQUIRED)

Before writing or updating any component skill, fetch and review the component:

### Feature checklist (what to build)
1. **shadcn/ui** → `https://ui.shadcn.com/docs/components/{name}`
2. **Basecoat UI** → `https://basecoatui.com/components/{name}/`

Every variant, size, state, and composition pattern shown on those pages must be
accounted for in the component skill — adapted to our semantic HTML / CSS custom property /
vanilla JS model.

### Native implementation (how to build it)
3. **WAI-ARIA APG** → `https://www.w3.org/WAI/ARIA/apg/patterns/{name}/` — canonical keyboard navigation and ARIA patterns
4. **MDN Web Docs** → `https://developer.mozilla.org/` — authoritative reference for HTML elements, CSS properties, and JS APIs
5. **Open UI** → `https://open-ui.org` — W3C community group defining native component standards
6. **Base UI** → `https://base-ui.com/react/components/{name}` — headless component architecture reference

Always prefer native browser APIs over JS workarounds. Check MDN for support
status of newer APIs (`popover`, anchor positioning, `@starting-style`, etc.).

## Component taxonomy (REQUIRED for every component)

Every component carries exactly **one** atomic-design type:

| Type | Meaning | Color (light / dark) |
| --- | --- | --- |
| `ATM` | Atom — contains **no descendant components** (arbitrary DOM inside is fine) | cyan `#06B6D4` / `#22D3EE` |
| `MOL` | Molecule — ≥1 direct child component, **all atoms** | blue `#3B82F6` / `#60A5FA` |
| `ORG` | Organism — direct children are atoms/molecules with **≥1 molecule** | violet `#8B5CF6` / `#A78BFA` |
| `BLK` | Block — a self-contained **sectional template slice** (header, hero, pricing, footer…); arbitrary nesting | amber `#F59E0B` / `#FBBF24` |
| `TPL` | Template — the **whole page/UI composition** of blocks and anything else | slate `#64748B` / `#94A3B8` |

Deterministic classifier (apply in order): role = whole composition → `TPL`; role =
sectional template slice → `BLK`; no descendant components → `ATM`; every direct child
is an atom → `MOL`; some direct child is a molecule → `ORG`; otherwise → `BLK`.

- **Descendant component** = markup of *another* component (e.g. `.btn`, `.label`) inside
  this component's root, at any DOM depth. Classes of the component's own parts
  (`.card-header`, `.toast-close`) are DOM, not components. DOM nesting never affects
  component ancestry.
- **Names never encode the type** — `Button`, never `ButtonAtom`. The type is presentation
  metadata only.
- The type is declared in the skill `type:` frontmatter (source of truth; parser in
  `scripts/lib/skill.ts`, shared contract in `scripts/lib/taxonomy.ts`) and surfaces as the
  badge in the docs **sidebar** (SiteNav reads the frontmatter at build time) and on the
  **doc page** header (PageHeader renders the same badge). `verify`'s `component type badges`
  gate fails if any of the three disagree. Badge markup is generated by the
  `TypeBadge`/`NavTypeBadge` components — never hand-write it; recolor via
  `.type-badge[data-type]` rules in `documentation/public/css/layout.css`.

## Component skill template

Component skills document **how to build the HTML** for a component. CSS and JS live in
their own files alongside the skill — edit `.css` and `.js` directly.

Every component skill **must open with a YAML frontmatter block** — it is the machine-readable
discovery layer `dist/SKILL.md` (the agent entry point) is generated from. `verify`'s
`skill frontmatter` gate fails without it, and `SKILL.md ↔ skills` fails when the generated
index lags (rebuild with `bun run build`):

```markdown
---
name: Dialog
type: MOL
why: Native <dialog> + showModal(): focus trap, Escape, ::backdrop, and inert background are browser-provided.
when: Modals for forms, detail views, or previews — unless the answer is mandatory (then alert-dialog).
where: dist/components/dialog/dialog.css + dist/components/dialog/dialog.js
supportedStates: default, open
---
```

- **name** — display name (Title Case) · **type** — its taxonomy class (see "Component taxonomy")
  · **why** — what its native basis buys · **when** — which
  use it for, and when to pick a sibling instead · **where** — the shipped files
  (`dist/components/{name}/{name}.css` + `.js` if interactive) · **supportedStates** — the exact
  State API names (matches `{name}States`, `default` first; CSS-only components: `default`).

Every component skill must include these sections in order:

0. **Frontmatter** — `name` / `type` / `why` / `when` / `where` / `supportedStates` (see above — REQUIRED)
1. **Native basis** — which HTML element/API it builds on
2. **Native Web APIs** — bulleted list of significant platform APIs with MDN links (see format below)
3. **Structure** — complete HTML markup with all attributes
4. **Variants** — variant table mapping `data-variant` values to visual behavior
5. **Sizes** — size table (if applicable)
6. **ARIA** — accessibility attributes table
7. **Notes** — edge cases, composition tips, caveats

Do NOT include CSS or JavaScript code blocks in the component skill. The `.css` and `.js` files
in the same folder are the source of truth for styles and behavior.

## Native Web APIs section format

Every component skill must include a `## Native Web APIs` section immediately after
`## Native basis`. This section lists the significant web platform APIs the component
relies on, with MDN links. Use this format:

```markdown
## Native Web APIs
- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) — native modal with focus trap and Escape-to-close
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) — entry animation starting values
```

### What to include
- HTML elements that provide core behavior (`<dialog>`, `<details>`, `<summary>`, `<progress>`, `<meter>`, `<output>`)
- HTML attributes that replace JS (`popover`, `popover="hint"`, `commandfor`/`command`, `inert`, `autofocus`, `loading="lazy"`)
- Browser APIs (`Popover API`, `showModal()`, `View Transitions API`, `Navigation API`)
- Significant CSS features (`CSS Anchor Positioning`, `@starting-style`, `::backdrop`, `::details-content`, Container Queries, `:has()`, `field-sizing: content`, `interpolate-size`, `content-visibility`, `@property`, `scroll-driven animations`, `light-dark()`, `color-mix()`)
- Accessibility features (`prefers-reduced-motion`, `prefers-contrast`, `forced-colors`)
- JS APIs used (`IntersectionObserver`, `ResizeObserver`, `MutationObserver`, `Clipboard API`, `Intl.*`, `CloseWatcher`, `AbortController`, `FormData`, `structuredClone()`)
- WAI-ARIA patterns when the component follows a specific APG pattern

### What to exclude
- Basic DOM methods (`querySelector`, `classList`, `addEventListener`)
- Standard CSS layout (`flexbox`, `grid` unless using subgrid/container queries)
- Common pseudo-classes (`:hover`, `:disabled`) unless component-defining (`:focus-visible`, `:has()`)

## CSS authoring conventions

### `@layer components`
All component CSS must be wrapped in `@layer components { ... }`. This establishes
explicit cascade priority: tokens → components → utilities. Never write component CSS
outside a layer.

### Native CSS nesting
Use `&` nesting for all related selectors. Group variants, sizes, states, and child
element styles inside the base selector:
```css
@layer components {
  .btn {
    /* base styles */
    &[data-variant="outline"] { /* ... */ }
    &[data-size="sm"] { /* ... */ }
    &:hover { /* ... */ }
    &:disabled { /* ... */ }
    & svg { /* child styles */ }
  }
}
```

### Modern CSS features (use where applicable)
- **CSS anchor positioning** — for popover/dropdown/combobox placement (`position-anchor`, `anchor()`, `position-try-fallbacks: flip-block`). No JS positioning code needed.
- **`:has()` selector** — for parent/sibling state reactions (e.g., label styling when input is focused)
- **`field-sizing: content`** — for auto-growing textareas with zero JS
- **Container queries** — for components that adapt to their container width (`container-type: inline-size`, `@container`)
- **`@starting-style`** — for enter animations on elements added to DOM or moving to top layer
- **`interpolate-size: allow-keywords`** — for smooth height-to-`auto` transitions (accordion, collapsible)
- **`content-visibility`** — for expand/collapse transitions with `allow-discrete`
- **`@property`** — for typed, animatable custom properties (progress rings, gradient transitions)
- **`color-mix(in oklch, ...)`** — for deriving hover/disabled states from token colors
- **`light-dark()`** — for inline dark mode values when `color-scheme` is set
- **`accent-color`** — for theming native form controls (checkbox, radio, range, progress)
- **Scroll-driven animations** — `animation-timeline: scroll()` / `view()` for scroll-linked effects
- **View Transitions API** — `startViewTransition()` for smooth DOM state changes
- **Logical properties** — `margin-inline`, `padding-block`, `inset-inline-start` for RTL support
- **Subgrid** — `grid-template-columns: subgrid` for child alignment to parent grid tracks
- **`:is()` / `:where()`** — selector grouping; `:where()` has zero specificity (ideal for resets)
- **`@scope`** — bounded style scoping with upper and lower boundaries (available but
  **not used in this project** — we use `@layer` + descriptive prefixed class names instead;
  see cascade-layers.html for rationale)
- **Dynamic viewport units** — `dvh`, `svh`, `lvh` for mobile browser chrome awareness
- **CSS math** — `clamp()`, `min()`, `max()`, `round()` for responsive sizing

### Accessibility CSS (REQUIRED for all components)
- **`prefers-reduced-motion: reduce`** — suppress/simplify all transitions and animations
- **`prefers-contrast: more`** — increase contrast when requested by the user
- **`forced-colors: active`** — support Windows High Contrast Mode with system colors
- **`prefers-color-scheme`** — automatic dark mode defaults from OS preference

### After editing component CSS or JS

Doc pages display each component's CSS and JS in the `#source-css` / `#source-js`
sections — embedded from the actual files by `<SourceFiles>` at docs build time.
Just rerun the docs build (`bun run build:docs` or a full `bun run build`); there is
nothing to sync (the old sync-snippets scripts are retired).

## Accuracy requirements

- All CSS values must match what the documentation site actually renders
- All class names must match the CSS selectors exactly
- Token references must use `var(--*)` — never raw color values (see token boundary rule in tokens.instructions.md)
- `<dialog>` components must include `margin: auto; position: fixed; inset: 0;` for centering (some browsers need this explicitly)

## Variant and size API (data attributes)

Components use `data-*` attributes — never CSS class modifiers — for variants and sizes.

### Rules
- **`data-variant`** for visual variations (e.g., `default`, `outline`, `ghost`, `destructive`)
- **`data-size`** for size variations (e.g., `sm`, `lg`, `icon`)
- **`data-side`**, **`data-position`**, etc. for structural variations where applicable
- **One base class** per component (`.btn`, `.badge`, `.card`) — this identifies *what* it is
- **Data attributes** express *which version* — never add modifier classes like `.btn-primary` or `.btn--ghost`
- CSS selectors combine the base class with the attribute: `.btn[data-variant="outline"]`

### Why
- Flat specificity — all selectors have equal weight, no conflicts
- Uniform API — every component follows the same pattern, easy for AI to learn
- Independent axes — variant and size combine freely without combinatorial class names
- Clean `class` attribute — no long modifier chains

### Correct
```html
<button class="btn" data-variant="destructive" data-size="lg">Delete</button>
<span class="badge" data-variant="outline">Status</span>
```

### Wrong
```html
<button class="btn btn-destructive btn-lg">Delete</button>
<span class="badge badge-outline">Status</span>
```

## Reference

Check shadcn/ui (ui.shadcn.com) for the expected behavior and API of each component.
Translate React/Radix patterns into semantic HTML + vanilla JS.

---

## Linting

`make lint` (oxlint over `src/`, `tests/`, `scripts/`) reports warnings but must stay
**non-blocking** — do not configure it to fail on warnings (`--deny-warnings` is banned);
only real errors should gate CI.

Keep the log clean: fix every warning an edit introduces. For a variable that is
**known to be intentionally unused**, prefix it with `_` (e.g. `var _copyBtn = …`) —
oxlint's `no-unused-vars` accepts that convention. For intentionally unused
**caught errors**, omit the parameter entirely (`catch { … }`, ES2019) — oxlint flags
`catch (_e)` too. Do not silence warnings with ignore comments, and do not delete
code that linters flag without checking why it exists (e.g. `window.THEMES` in
`themes.ts` is a cross-file global contract — make the contract explicit instead
of removing it).

## Testing

`make help` lists the shortcuts (`setup`, `dev`, `test`, `test-run`, `coverage`, `e2e`, `lint`,
`verify`, `screenshots`, `minify`, `stats`, `build`) — they wrap the equivalent `bun run <script>` commands;
package.json stays the single source of truth. `make build` is the full pipeline:
lint → compile → bundle → minify → stats → screenshots → docs-mirror → verify → tests → e2e (it calls `scripts/build.ts` +
`scripts/bundle.ts` directly, since `bun run build` runs `verify` before screenshots could be refreshed).
`make minify` alone re-runs just the minify post-pass over `dist/components/` (every shipped `.css` gains a
`.min.css`, every `.js` a `.min.js` + `.min.js.map`; tsc already emits the readable `.js.map`). verify's
`minified artifacts` gate fails when a component ships without its twins.
`make stats` regenerates `dist/stats.json` after minify — component counts per taxonomy type, the
withJs/withoutJs split, and per-component + total byte sizes (`jsSize`/`cssSize`/`*Minified`/`*Gz`).
Deterministic (no timestamps); verify's `stats.json fresh` gate fails when it lags `dist/components/`.
Verify's **`stats claim` gate** additionally requires README.md and `src/documentation/index.html`
to state the current figures verbatim as one sentence — generated from stats.json by
`statsClaimText()` (`scripts/lib/stats.ts`): `{total} components — {withJs} with JavaScript,
{withoutJs} CSS-only — {KiB} minified + compressed`. When the numbers change, both
files change with them (parity pair) — the index renders them through the shipped Statistic
component, so the site always shows its own measured footprint.

`bun run test:run` runs the UI suite in headless Chromium (Vitest browser mode + Playwright).
First run needs `make setup` (or `bunx playwright install`).

Tests load the real pages from `dist/documentation/` inside a **same-origin iframe**
(`openDocPage()` in `tests/helpers.ts`) — Vitest browser mode has no `page.goto()`.
Interactions go through `userEvent.click()` on elements queried from the iframe's
`document` (trusted Playwright input); state is asserted by reading that same
same-origin `document` directly. `frame.getBy*()` locators work too, but Vitest's
ARIA-tree queries are slow/flaky on these very large doc pages, so prefer
`doc.querySelector` + `expect` for assertions.

When adding a component, add at least one interaction test in `tests/ui.test.ts`
covering its JS behavior (see the dialog/accordion tests as templates).

### Component E2E smoke tests (`bun run e2e`)

Per-component smoke tests live in `tests/e2e/` and run with **plain Playwright**
(no Vitest). Each component gets two files:

- `{name}.e2e-fixture.html` — uses the component **in every configuration** the
  component skill documents (all variants/sizes/states/compositions), linking the
  real files by absolute path (`/dist/theme/default-semantic-tokens.css`,
  `/dist/components/{name}/{name}.css` + `.js`). The fixture is served by
  `server.ts`, a static Bun server rooted at the repo root that exposes only
  `/dist/` and `/tests/e2e/`.
- `{name}.e2e.ts` — a standalone script (exits non-zero on failure) that launches
  Chromium, serves the fixture, and asserts behavior: init markers, initial state,
  applied CSS (via computed styles), each interaction, and keyboard behavior.
  `accordion.e2e.ts` is the reference template.

`tests/e2e/run.ts` globs and runs every `*.e2e.ts` in isolated child processes.
When adding a component, add both files. Interactive components follow the
`accordion.e2e.{ts,fixture.html}` template (drive `api.setState` + interactions);
CSS-only components use the shared `tests/e2e/lib/css-smoke.ts` runner — the
assertions are data (literal computed px values, pairwise-distinct token colors,
`run` escape hatch for pseudo-states), see `tests/e2e/badge.e2e.ts`.

### Legacy rollouts (complete)

Every component now ships the State API (interactive ones) and an e2e pair —
the `STATE_API_LEGACY` / e2e warn-ratchets in `scripts/verify.ts` are empty and
the checks are hard gates. New components must land compliant from day one:
source → skill `## States` + doc page (`<code>` per state + `data-state-demo`
anchor) → `bun run screenshots` → e2e fixture + test, ideally in one commit.

### Docs ↔ E2E parity (REQUIRED)

The e2e fixture and the documentation must describe the **same** component
surface, so a green pipeline means "documented == tested == shipped":

| Feature exists in… | Then… |
| --- | --- |
| code only | add it to the doc page **and** the e2e fixture/test |
| docs only | add an e2e check for it (it must work in the shipped files) |
| fixture only | it is undocumented — document it |
| all three | ✅ |

- The fixture `{name}.e2e-fixture.html` instantiates every configuration the
  doc page demonstrates (variants, sizes, states, compositions) — same `data-*`
  attributes, same nesting. If the doc page shows a variant, the fixture has it.
- Every State API state gets an assertion via `el.api.setState(name)` plus an
  observation of the resulting UI (computed styles / DOM flags).
- When you add a feature to a component, update **all three artifacts in the
  same commit**: source, doc page, fixture + e2e assertions. Reviewers should
  reject any of the three landing alone.

## Common pitfalls

- **Dialog/Sheet centering**: Always set `margin: auto; position: fixed; inset: 0;`
  explicitly for centered dialogs.
- **CSS drift**: If the component skill's variant/size tables don't match the `.css` file,
  update the component skill to stay in sync — the `.css` file is the source of truth for styles.
- **Bundle drift**: doc pages load the generated `../components/all.css` + `../components/all.js`
  bundle, not per-component files. After adding/removing a component, `bun run build`
  (scripts/bundle.ts) regenerates it — never edit the bundle files by hand.
- **SPA re-initialization**: Component JS modules use `MutationObserver` to
  auto-initialize new elements when the DOM changes — no manual re-import needed.
  Doc-site-only scripts (runtime/site.ts) re-run via `docs.onPageReady(fn)` after
  each SPA navigation.
- **Font stacks**: The system tokens use generic font stacks. The doc site overrides
  them in `public/css/docs-theme.css`. Don't put custom fonts in `default-semantic-tokens.css`.
- **Source listing drift is impossible by construction**: the `#source-css` /
  `#source-js` sections are embedded from the actual component files by
  `<SourceFiles>` at docs build time. Editing a component `.css`/`.ts` means the
  next docs build shows it — nothing to sync (verify's `snippet sync` gate
  compares the rendered listing against the file anyway).

# Documentation Pages

## Shared layout (defuss-ssg components)

The docs chrome is statically rendered per page by the TSX components in
`src/documentation/lib/components/`:

- `<DocPage>` — the whole page shell: `<html>`/`<head>` (meta/og tags from the
  page's frontmatter, the 4 synchronous head scripts, the stylesheet chain) and
  `<body>` (header, sidebar, TOC shell, footer, end-of-body scripts)
- `<SiteHeader>` / `<SiteNav>` — the fixed header and sidebar (static markup —
  the old `<site-header>`/`<site-nav>` custom elements are gone)
- `<PrevNext>` / `<SiteFooter>` — pager + footer (was runtime injection)
- The TOC aside, § heading anchors and `toc-*` ids are injected by the toc
  plugin in `lib/plugins.ts` at build time; the runtime only does the
  IntersectionObserver active tracking

**To add/remove/reorder nav links, edit `src/documentation/lib/nav.ts`.** The
`sidebar coverage` verify gate fails when a `pages/*.mdx` file isn't listed.

## Adding a component page

1. Copy an existing component page (e.g., `pages/badge.mdx`) as the template
2. Adjust the frontmatter (`title`, `description`, `slug`), the `<PageHeader>`
   intro, and the demos
3. Add the page to `lib/nav.ts`

Rebuilding (`bun run build`) re-renders every page — sidebar, prev/next, search
index, and TOC pick the page up automatically.

## Sidebar nav order

The sidebar is ordered by dependency (primitives first):
1. Overview (Introduction, Installation, Theming, Dark Mode, Data Attribute API, Cascade Layers, ES Modules, Native Web APIs, Animations, Accessibility, Component Skills, Changelog)
2. Primitives (Typography, Separator, Icon)
3. Layout (Scroll Area, Carousel, Sortable)
4. Actions (Button, Toggle, Toggle Group, Button Group, Toolbar)
5. Forms & Inputs (Label, Input, Textarea, Checkbox, Radio Group, Switch, Slider, Select, Number Input, File Input, Color Picker, Date Picker, Combobox, Form)
6. Data Display (Badge, Avatar, Card, Image, Statistic, Table, Collapsible, Timeline, Tree View, Calendar)
7. Feedback & Status (Spinner, Skeleton, Progress, Alert, Alert Dialog, Toast)
8. Overlays (Popover, Tooltip, Context Menu, Dialog, Sheet, Accordion, Command)
9. Navigation (Breadcrumb, Pagination, Steps, Tabs, Dropdown Menu, Navigation Menu)
10. Application (Sidebar)
11. Marketing (Site Header, Hero, Product Showcase, Brand Logos, Feature Details, Testimonials, Stats, Pricing, Blog, FAQ, Get In Touch, Newsletter, Site Footer) — CSS-only page sections composed from the same tokens + primitives

To reorder, edit the `NAV` array in `src/documentation/lib/nav.ts`.

## CSS and JS imports

Every page loads the single-file bundle — `<link rel="stylesheet" href="../components/all.css">`
and `<script type="module" src="../components/all.js"></script>` — which covers ALL components
(not just the page's own), so components used in demos on other pages render correctly. The
bundle is generated by `scripts/bundle.ts` from the per-component sources, which stay shipped
in `../components/{name}/{name}.css` / `.js` for pick-what-you-need installs.

## Demo ↔ code parity (REQUIRED)

Every code block that accompanies a rendered demo must show **exactly the classes
and structure that render the demo above it**. Never show code that contradicts,
simplifies away, or differs from what the reader just saw rendered — a demo whose
code doesn't reproduce it is worse than no demo (shadcn docs convention: the
demo's decorative colors/labels may be omitted from the code, but every class and
every structural element must correspond 1:1). Likewise, class families listed in
reference tables should be demonstrated somewhere on the same page, not only
tabulated. When you change a demo, change its code block in the same commit.

### The demo design system (guide pages)

Guide-page demos are authored as `<Demo>` / `<DemoCode>` components (see
`pages/container.mdx`); component-page demos as `<Example>` / `<ExampleLabel>` /
`<ExampleHint>` / `<ExampleCode>`. Without an `<ExampleCode>`/`<DemoCode>` child
the code sample is **auto-serialized from the demo children** — demo ↔ code
parity by construction. The rendered markup uses the shared `.demo-*` / `.preview`
classes in `documentation/public/css/layout.css` — never re-invent them with
inline styles:

- `.demo` — the card wrapping one example. Add `data-viewport` when resizing is
  instructive (site.js injects the Mobile/Tablet/Desktop/Full width toolbar).
- `.demo-stage` — the rendered area (scrolls internally if content exceeds it).
- `.demo-viewport` — **required child when `data-viewport` is set**; site.js
  resizes this element, so container queries and fluid layouts inside it react.
- `.demo-code` + `.demo-code-header` — the attached code area below the stage
  (also used alone inside `.demo` for standalone code blocks).
- `.demo-tile` (variants via `data-variant="secondary|accent|muted|outline"`),
  `.demo-label`, `.demo-outline`, `.demo-stripes` — visualization helpers for
  boxes, captions, dashed frames, and ruler backgrounds. Put text labels outside
  boxes too small to hold them.

```html
<div class="demo" data-viewport>
  <div class="demo-stage">
    <div class="demo-viewport">
      <div class="demo-tile w-1/2 h-6">w-1/2</div>
    </div>
  </div>
  <div class="demo-code">
    <div class="demo-code-header">HTML</div>
    <pre><code class="language-html">&lt;div class="w-1/2 h-6"&gt;w-1/2&lt;/div&gt;</code></pre>
  </div>
</div>
```

## Inline source code snippets

Each component doc page displays the component's CSS and JS in the `#source-css`
/ `#source-js` sections — `<SourceFiles component="{name}">` reads the actual
files at docs build time and embeds them (escaped) with copy buttons. There is
**no sync step**: rebuild the docs and the listings are current. Optional
`<SourceNote for="css|js">` children add prose above a listing. verify's
`snippet sync` gate compares the rendered listing against the file.

## Doc-site utility classes

The doc site uses a small, hand-written set of utility classes for layout and
spacing inside doc pages (`public/css/docs-utilities.css`). The utilities are plain
class rules — they only affect elements that explicitly opt in by using the
class name, so they cannot leak into component styles.

If you need a new utility (e.g. `mt-4`, `gap-5`), add it directly to
`public/css/docs-utilities.css`. Keep the utility set minimal — prefer inline `style`
attributes for one-off layout tweaks in demo wrappers.
