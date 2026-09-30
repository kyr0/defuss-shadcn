# defuss-shadcn

[![GitHub stars](https://img.shields.io/github/stars/kyr0/defuss-shadcn?style=flat&logo=github)](https://github.com/kyr0/defuss-shadcn)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![No dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![HTML CSS JS](https://img.shields.io/badge/stack-HTML%20·%20CSS%20·%20JS-orange)
[![npm version](https://img.shields.io/npm/v/defuss-shadcn.svg?logo=npm)](https://www.npmjs.com/package/defuss-shadcn)
[![npm downloads](https://img.shields.io/npm/dm/defuss-shadcn.svg)](https://www.npmjs.com/package/defuss-shadcn)
[![TypeScript definitions](https://img.shields.io/npm/types/defuss-shadcn.svg)](https://www.npmjs.com/package/defuss-shadcn)
[![Socket Badge](https://badge.socket.dev/npm/package/defuss-shadcn/latest)](https://socket.dev/npm/package/defuss-shadcn)

**A UI component system that scales with _(local)_ AI.** Themeable components built on semantic HTML, modern CSS, and vanilla JavaScript. No framework. No build step for consumers - `dist/` is committed and ready to use as-is. The simplest possible foundation for AI-driven prototyping.

**92 components - 42 with JavaScript, 50 CSS-only - 161.1 KiB minified + compressed - 111.4 KiB as the all.css/all.js bundle.**
50 of 92 components need no JavaScript - native HTML and modern CSS cover them entirely.
<!-- parity anchor: README ↔ index (AGENTS.md) - the footprint sentence and pillar set must match src/documentation/pages/index.mdx; commit both files together -->
The footprint is measured from the shipped `dist/` files on every build and published as
[`dist/stats.json`](dist/stats.json); `verify` fails the build if this sentence and that file disagree.

The set includes 13 marketing blocks (Site Header, Hero, Pricing, Testimonials, Blog, Footer, …) - full-page sections composed from the same tokens and primitives, all CSS-only - and a new Chat section: message rows (avatar, name, time, status, actions), bubbles (groups, tails, reactions, typing) and markers (inline status, spinners, separators).

**[Documentation & Live Demos →](https://kyr0.github.io/defuss-shadcn/)** · [Architecture (ARCH.md)](ARCH.md) · [Agent skill (SKILL.md)](skills/defuss-shadcn/SKILL.md)

The docs site dogfoods the CDN install: it loads its `all.css` / `all.js` bundle and theme from the jsDelivr CDN, the same URLs as the CDN quick start above - if it renders, the CDN install works.

Why this system exists, from the agents who built it: [ARCH.md](ARCH.md).

## What this is

A portable UI component system built on the [shadcn/ui](https://ui.shadcn.com) token model.

- **Themeable** - full shadcn semantic token model. 43 [tweakcn](https://tweakcn.com) presets ship as drop-in theme files - swap one and every component updates instantly
- **Component Skills** - every component includes a structured skill - markup, variants, sizes, density, named states, ARIA, and wiring conventions - grounded in web standards; every interactive component also ships a machine-readable `*.schema.json` contract (states, types, defaults, actions) that drives its docs controls and is verifier-enforced
- **Observable state** - interactive components expose a State API (`el.api.setState('open')`, `el.api.getState()`), so agents and tests can drive every documented state by name without knowing the implementation
- **Accessible** - built on native HTML elements and WAI-ARIA patterns (menus and menubars with nested submenus, tabs, dialogs, trees, comboboxes). Keyboard navigation, focus management, and screen reader support by default
- **Framework Free** - runs in any browser, zero dependencies, no build pipeline required

## Quick start

### Via CDN

```html
<!-- 1. Add the base: tokens + sizing/layout/accessibility utilities (a theme preset from dist/theme/ may follow) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/core.css">

<!-- 2. Add the icons -->
<script src="https://unpkg.com/lucide@1.8.0"></script>
<script>lucide.createIcons();</script>

<!-- 3a. Everything at once: the bundle (embeds the core runtime) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/all.css">
<script type="module" src="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/all.js"></script>

<!-- 3b. …or only the components you use: their CSS, then core.js + their JS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/button/button.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/dialog/dialog.css">
<script type="module" src="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/core.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/dialog/dialog.js"></script>
```

Two delivery modes, one implementation: **load core plus the components you use, or load all alone.** The core pair is `core.css` (tokens + sizing + layout + accessibility utilities) + `core.js` (the `df$` runtime: defuss-query + defuss-morph); documentation code is separate. No framework or jQuery dependency.

`core.js` installs the callable `df$` runtime (query + morph + the shared component layer at `df$.shadcn.shared`) - every component `.js` requires it, loaded first; a missing or mismatched core fails with one actionable load-order error before anything renders. `all.css` / `all.js` bundle the core runtime plus every component (minified twins: `core.min.js`, `all.min.css` + `all.min.css.map`, `all.min.js` + `all.min.js.map`). Every runtime bundle carries a per-release provenance pointer (bundled upstream versions + license hashes; full notice in `components/NOTICE.txt`). The per-component files stay available - include only what you use; their stylesheets are independent of each other.

### Via npm

In a project with a package manager and a bundler, install the package and import the same files in the same order from the app entry:

```bash
npm install defuss-shadcn   # or: bun add / pnpm add / yarn add defuss-shadcn
```

```js
import 'defuss-shadcn/dist/components/core.css'; // tokens + utilities
import 'defuss-shadcn/dist/components/all.css';  // every component's styles
import 'defuss-shadcn/dist/components/all.js';   // df$ runtime + every component's behavior
```

### For AI agents: SKILL.md

[`skills/defuss-shadcn/SKILL.md`](skills/defuss-shadcn/SKILL.md) (shipped in the npm package) packages the whole project as one Agent Skill: the exact install steps for both paths (npm or jsDelivr, no TypeScript for standalone HTML), the include order, the rules to follow, a map of every documentation page (guides + live examples, linked as MDX sources) and an index of all component skills with why/when - generated from the sources on every build. Every component skill is copied into the skill folder itself (`skills/defuss-shadcn/references/components/`), so an agent reads them right next to the SKILL.md in any install - Claude Code plugin, npm, or a skills-CLI copy - instead of searching for them.

Install it into your coding agent:

```bash
# Claude Code (native plugin marketplace)
claude plugin marketplace add kyr0/defuss-shadcn
claude plugin install defuss-shadcn@defuss-shadcn

# Codex, Cursor, Gemini CLI, GitHub Copilot, Windsurf, … (and Claude Code)
npx skills add kyr0/defuss-shadcn --skill defuss-shadcn
```

Per-agent flags, global installs and updates: [Vibe Coding / Agentic Engineering → Install as an AI Agent Skill](https://kyr0.github.io/defuss-shadcn/vibe-coding.html#install-as-an-ai-agent-skill).

### Self-hosting

Download the full system and drop it into any project. All the files are static - no build step, no dependencies. Point an AI at `dist/SKILL.md` and it has everything it needs: the library's integration guide and philosophy, an index of every component skill (type/why/when/where + supported states), CSS to include, JS to wire up, and the entire documentation site with working examples of every component.

**[Download latest (.zip)](https://github.com/kyr0/defuss-shadcn/archive/refs/heads/main.zip)**

## Built on five layers

Each component is a self-contained folder with up to five layers:

```
components/
├── core.css              ← the theme base: tokens + sizing + layout + accessibility
├── core.js               ← the runtime: defuss-morph + defuss-query + shared layer
├── all.css               ← generated bundle: every component stylesheet
├── all.js                ← generated bundle: core runtime + every component's behavior
└── dialog/
    ├── component-skill.md    ← structured skill: HTML structure, attributes, ARIA
    ├── dialog.css            ← stylesheet (uses design tokens)
    └── dialog.js             ← interaction behavior (binds to core, when needed)
```

The `all.*` bundle files (with `.min` twins and source maps) are what the
documentation site itself loads - one `<link>`, one `<script>`, everything included.

1. **Semantic tokens** - `default-semantic-tokens.css` defines every design token for the default light and dark theme. To switch themes, you just switch this file.
2. **Component CSS** - each component's stylesheet, built entirely on tokens.
3. **Semantic HTML** - native HTML elements with data attributes for variants and wiring.
4. **Vanilla JavaScript** - interaction logic, only when HTML and CSS can't express the behavior.
5. **Component skill** - a structured instruction set that documents how to build the component: markup, variants, ARIA, and wiring conventions.

Some components - like Button and Badge - are CSS-only. No JavaScript needed.

## Theming

Tokens are compatible with [tweakcn.com](https://tweakcn.com) theme exports. A theme is one plain stylesheet with `:root` + `.dark` token blocks - switching themes means switching that file.

1. **Ship it at build time** - link a theme file instead of the token file: every [tweakcn](https://tweakcn.com) preset ships generated in [`dist/theme/`](dist/theme/) (`claude.css`, `vercel.css`, …, 43 presets; regenerate with `bun run build`, gated by `verify`). Or export your own from tweakcn and replace `dist/theme/utils/default-semantic-tokens.css` - components see the same tokens either way.
2. **Switch it at runtime** - the [Theme Switcher](https://kyr0.github.io/defuss-shadcn/theme-switcher.html) component loads/unloads one `<link id="theme-css">` (the theme rides on top of the token file; no JS token objects). That's exactly what the theme picker on the documentation site does.
3. Everything updates automatically - all components, the doc site, dark mode (each theme file carries both palettes).

## Optional modules

Four standalone stylesheets live beside the token file and are opt-in - no component depends on them, and the token export stays tweakcn-pure:

- [`dist/theme/utils/sizing.css`](dist/theme/utils/sizing.css) - one numeric scale (`w-4` = four base units, `--size-*` aliases, density-aware spacing)
- [`dist/theme/utils/layout.css`](dist/theme/utils/layout.css) - small layout surface (`flex`, `grid`, `stack`, `container`, named `query` boundaries, overflow + text-flow helpers)
- [`dist/theme/utils/accessibility.css`](dist/theme/utils/accessibility.css) - screen-reader-only content (`.sr-only` / `.not-sr-only`, the clip pattern)
- [`dist/theme/utils/shapes.css`](dist/theme/utils/shapes.css) - reusable silhouettes to mix a design up (radius scale, organic / cut / notch / scoop corners, clip-path shapes, section edges, shadow scale + stylized shadows, frames, background patterns)

Load them after the tokens, before component CSS. Docs: [Sizing](https://kyr0.github.io/defuss-shadcn/sizing.html) · [Layout](https://kyr0.github.io/defuss-shadcn/layout.html) · [Shapes](https://kyr0.github.io/defuss-shadcn/shapes.html) · [Accessibility](https://kyr0.github.io/defuss-shadcn/accessibility.html)

## Components

See the **[full component list with live demos →](https://kyr0.github.io/defuss-shadcn/)**

## Design principles

### Native web platform first

Every component starts from a native HTML element or browser API. If the browser can do it, we don't write JavaScript for it.

| Instead of... | We use... |
|---------------|----------|
| JS modal with overlay div | `<dialog>` + `showModal()` + `::backdrop` |
| JS show/hide dropdowns | `popover` API |
| JS accordion toggle | `<details>` / `<summary>` |
| JS enter animations | `@starting-style` |
| Floating UI / Popper.js | CSS anchor positioning |
| JS class toggling for parent state | `:has()` selector |
| JS textarea auto-resize | `field-sizing: content` |
| Sass / Less / PostCSS | Native CSS nesting, `@layer`, container queries |

### Other principles

- **Token-driven** - every color, radius, and shadow comes from CSS custom properties
- **Dark mode automatic** - the token cascade handles it, no overrides needed
- **Variant via data attributes** - `data-variant="primary"`, not `btn-primary`

## Development

The repo now has a build step - but it is for **maintainers and coding agents only**.
`dist/` is committed, dependency-free, and usable at any time without building anything:
CDN, self-hosting, and copy-paste all work exactly as before. Just drop `dist/` into a
project, or download the `.zip`.

The toolchain exists so coding agents can **verify correctness of the implementation**,
not to produce it:

- **TypeScript** - component sources live in `src/` as `.ts`, and the entire test tree
  (Vitest suite, e2e runner, helpers) is TypeScript too, giving agents type-checkable
  contracts; the build strips types to plain JS (`noCheck`, see [`tsconfig.json`](tsconfig.json))
  so what ships is still zero-dependency vanilla JS. `bun run typecheck` (also part of
  `verify`) keeps both tooling trees strict.
- **State API** - interactive components declare their states (`const dialogStates = ['default', 'open']`)
  and expose them per element (`el.api.setState(...)` / `el.api.getState()`), plus registry
  globals for tooling. Every declared state must be covered by four artifacts - screenshot
  (light + dark), doc page, component skill, and e2e assertion - enforced by `verify`.
- **Screenshots for agents** - `bun run screenshots` renders each component (and each
  named state) to `screenshots/{light,dark}/` so an agent can *look* at what it changed;
  a content-hash manifest makes re-capture incremental.
- **E2E tests** - components are exercised in a real browser against the shipped files
  (see [Testing](#testing)); an agent can prove a change works instead of guessing
- **oxlint** - `make lint` catches dead code and mistakes instantly, in milliseconds

```bash
bun install        # install dev dependencies
bun run build      # compile src/ → dist/ (TypeScript → JS, 1:1 copy, all.css/all.js bundle)
bun run dev        # doc site at http://localhost:3000/
bun run test:run   # run the UI test suite (headless Chromium)
```

`src/` is the authoring tree (component `.ts`/css/md, plus the docs' MDX pages + TSX
components rendered by [defuss-ssg](https://github.com/kyr0/defuss)); `dist/` is the compiled output - 1:1 build
of the components/theme, plus `dist/documentation/` rendered solely by defuss-ssg, committed and the only thing that ships - every build also regenerates the
machine-readable `dist/stats.json` (component counts per type, the JS/CSS-only split, and
byte sizes raw/minified/gzipped via `make stats`). `docs/` is the generated **documentation
site** (only `dist/documentation/` + the SEO files + a `404.html` copy of `index.html` so
GitHub Pages never serves an empty page for dead links) that GitHub Pages publishes - the
pages' `../components/…` / `../theme/…` references are rewritten to the jsDelivr GitHub
CDN by the mirror ([scripts/lib/mirror.ts](scripts/lib/mirror.ts)), so docs/ carries no
copies of the component assets. Refresh with `bun run docs`, never edit it directly.

A `Makefile` wraps the common tasks: `make setup` (install deps + Playwright browsers),
`make dev`, `make test-run`, `make coverage`, `make e2e`, `make lint` (oxlint),
`make typecheck`, `make verify`, `make screenshots`, `make stats`, `make docs`. **`make build`** runs
the whole pipeline - lint → compile → bundle → minify → stats → docs SSG (defuss-ssg) → screenshots → docs-mirror → verify → tests → e2e —
the same loop CI runs.

`bun run verify` is the static consistency gate (~0.3 s, runs automatically at the end
of every build) and the contract every coding agent must satisfy. It checks, among others:

- **structure** - component skills, doc pages, the all.css/all.js bundle includes on every page, sidebar links,
  `.preview` blocks, `dist/` freshness (1:1 with `src/`), `docs/` mirror current (CDN-rewritten)
- **consistency** - inline source snippets match the real files (and are properly escaped),
  skill ↔ docs ↔ CSS variant parity, State API contract + per-state coverage across
  screenshots/docs/skill/e2e, changelog & version markers, doc command references
  (every `bun run`/`make` quoted in the docs must exist), `dist/stats.json` freshness and
  the stats claims in README/index matching the measured numbers exactly
- **quality** - token boundary rule (only tweakcn-defined `var(--*)`), undefined utility
  classes, `prefers-reduced-motion` coverage, init idempotency (double-binding guard),
  dead links (parsed with linkedom), portable paths (no machine-absolute paths),
  strict typecheck, render drift (screenshot pixels changed without input changes),
  theme sidebar contrast (every preset's nav text reaches WCAG AA on its real background)
- **hygiene** - working tree committed, so a green build is a committed build

Every failing check prints the offending files **and the exact fix** - the verifier is
the loop's authority (AGENTS.md defers to its output), so a coding agent can iterate
`edit → build → do what it says` until the goal is reached. The warn-ratchets for legacy
rollouts (State API, e2e, reduced motion) are now empty and kept as hard gates against
regressions. How this all scales without human review - and the proof-loop diagram —
are documented in [ARCH.md](ARCH.md).

## Testing

Tests exist so agents (and humans) can verify the implementation end-to-end instead of trusting it.

UI tests run in a real browser (Chromium via Playwright) with **Vitest browser mode** - no mocking. The suite in [`tests/ui.test.ts`](tests/ui.test.ts) loads the actual documentation pages from `dist/documentation/` in a same-origin iframe and drives them end-to-end: the statically-rendered chrome shell, the SPA router, dark-mode toggle, dialog open/close/focus-return, and the single-open accordion.

```bash
bun run test         # watch mode
bun run test:run     # single run
bun run test:coverage
```

The first run needs Playwright's browser: `bunx playwright install chromium`.

Each component also gets an E2E smoke test in [`tests/e2e/`](tests/e2e/): a static
fixture page using the component in **all** of its documented configurations (every
variant, size, and State API state), driven by plain Playwright against the unmodified
files in `dist/` (`bun run e2e`). This is the verification loop a coding agent runs
after touching any component - the shipped files themselves are asserted, so "it
compiles" is never mistaken for "it works". Every component ships one (the gate is
hard), and its parity rule keeps fixture, docs and code in lockstep as they change.
The documentation site itself is covered too ([`tests/e2e/documentation.e2e.ts`](tests/e2e/documentation.e2e.ts)):
the intro page renders, the SPA router navigates, and the header search opens the command palette (generated index, page + section results).

## Credits

This project began as a fork of **[shadcn-html](https://github.com/codylindley/shadcn-html)** —
credit to [Cody Lindley](https://github.com/codylindley) for the original idea and first
implementation.

Maintained by [Aron Homberg](https://aron-homberg.de) - the TypeScript build chain,
State API, and the verifier-driven quality loop ([ARCH.md](ARCH.md)) described above.

## License

Licensed under the [MIT License](LICENSE).
