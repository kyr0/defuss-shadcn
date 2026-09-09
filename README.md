# defuss-shadcn

[![GitHub stars](https://img.shields.io/github/stars/kyr0/defuss-shadcn?style=flat&logo=github)](https://github.com/kyr0/defuss-shadcn)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![No dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![HTML CSS JS](https://img.shields.io/badge/stack-HTML%20·%20CSS%20·%20JS-orange)
[![npm version](https://img.shields.io/npm/v/defuss-shadcn.svg?logo=npm)](https://www.npmjs.com/package/defuss-shadcn)
[![npm downloads](https://img.shields.io/npm/dm/defuss-shadcn.svg)](https://www.npmjs.com/package/defuss-shadcn)
[![TypeScript definitions](https://img.shields.io/npm/types/defuss-shadcn.svg)](https://www.npmjs.com/package/defuss-shadcn)
[![Socket Badge](https://badge.socket.dev/npm/package/defuss-shadcn/latest)](https://socket.dev/npm/package/defuss-shadcn)

**A UI component system that scales with _local_ AI.** Themeable components built on semantic HTML, modern CSS, and vanilla JavaScript. No framework. No build step for consumers — `dist/` is committed and ready to use as-is. The simplest possible foundation for AI-driven prototyping.

**69 components — 27 with JavaScript, 42 CSS-only — 68.6 KiB minified + compressed.**
42 of 69 components need no JavaScript — native HTML and modern CSS cover them entirely.
The footprint is measured from the shipped `dist/` files on every build and published as
[`dist/stats.json`](dist/stats.json); `verify` fails the build if this sentence and that file disagree.

The set includes 13 marketing blocks (Site Header, Hero, Pricing, Testimonials, Blog, Footer, …) — full-page sections composed from the same tokens and primitives, all CSS-only.

**[Documentation & Live Demos →](https://kyr0.github.io/defuss-shadcn/)** · [Architecture (ARCH.md)](ARCH.md) · [Agent integration guide (dist/SKILL.md)](dist/SKILL.md)

## What this is

A portable UI component system built on the [shadcn/ui](https://ui.shadcn.com) token model.

- **Themeable** — full shadcn semantic token model. Swap a [tweakcn](https://tweakcn.com) theme and every component updates instantly
- **Component Skills** — every component includes a structured skill — markup, variants, named states, ARIA, and wiring conventions — grounded in web standards
- **Observable state** — interactive components expose a State API (`el.api.setState('open')`, `el.api.getState()`), so agents and tests can drive every documented state by name without knowing the implementation
- **Accessible** — built on native HTML elements and WAI-ARIA patterns. Keyboard navigation, focus management, and screen reader support by default
- **Framework Free** — runs in any browser, zero dependencies, no build pipeline required

## Quick start

### Via CDN

```html
<!-- 1. Add a theme -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/theme/default-semantic-tokens.css">

<!-- 2. Add the icons -->
<script src="https://unpkg.com/lucide@1.8.0"></script>
<script>lucide.createIcons();</script>

<!-- 3. Select the components you want -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/button/button.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/dialog/dialog.css">
<script type="module" src="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/dialog/dialog.js"></script>
```

### Self-hosting

Download the full system and drop it into any project. All the files are static — no build step, no dependencies. Point an AI at `dist/SKILL.md` and it has everything it needs: the library's integration guide and philosophy, an index of every component skill (type/why/when/where + supported states), CSS to include, JS to wire up, and the entire documentation site with working examples of every component.

**[Download latest (.zip)](https://github.com/kyr0/defuss-shadcn/archive/refs/heads/main.zip)**

## Built on five layers

Each component is a self-contained folder with up to five layers:

```
components/
└── dialog/
    ├── component-skill.md    ← structured skill: HTML structure, attributes, ARIA
    ├── dialog.css            ← stylesheet (uses design tokens)
    └── dialog.js             ← interaction behavior (when needed)
```

1. **Semantic tokens** — `default-semantic-tokens.css` defines every design token for the default light and dark theme. To switch themes, you just switch this file.
2. **Component CSS** — each component's stylesheet, built entirely on tokens.
3. **Semantic HTML** — native HTML elements with data attributes for variants and wiring.
4. **Vanilla JavaScript** — interaction logic, only when HTML and CSS can't express the behavior.
5. **Component skill** — a structured instruction set that documents how to build the component: markup, variants, ARIA, and wiring conventions.

Some components — like Button and Badge — are CSS-only. No JavaScript needed.

## Theming

Tokens are compatible with [tweakcn.com](https://tweakcn.com) theme exports. To switch themes, you just switch the token file — that's all the theme selector in the documentation site is doing.

1. Export a theme from tweakcn.com
2. Replace the `:root` and `.dark` blocks in `dist/theme/default-semantic-tokens.css`
3. Everything updates automatically — all components, the doc site, dark mode

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

- **Token-driven** — every color, radius, and shadow comes from CSS custom properties
- **Dark mode automatic** — the token cascade handles it, no overrides needed
- **Variant via data attributes** — `data-variant="primary"`, not `btn-primary`

## Development

The repo now has a build step — but it is for **maintainers and coding agents only**.
`dist/` is committed, dependency-free, and usable at any time without building anything:
CDN, self-hosting, and copy-paste all work exactly as before. Just drop `dist/` into a
project, or download the `.zip`.

The toolchain exists so coding agents can **verify correctness of the implementation**,
not to produce it:

- **TypeScript** — component sources live in `src/` as `.ts`, and the entire test tree
  (Vitest suite, e2e runner, helpers) is TypeScript too, giving agents type-checkable
  contracts; the build strips types to plain JS (`noCheck`, see [`tsconfig.json`](tsconfig.json))
  so what ships is still zero-dependency vanilla JS. `bun run typecheck` (also part of
  `verify`) keeps both tooling trees strict.
- **State API** — interactive components declare their states (`const dialogStates = ['default', 'open']`)
  and expose them per element (`el.api.setState(...)` / `el.api.getState()`), plus registry
  globals for tooling. Every declared state must be covered by four artifacts — screenshot
  (light + dark), doc page, component skill, and e2e assertion — enforced by `verify`.
- **Screenshots for agents** — `bun run screenshots` renders each component (and each
  named state) to `screenshots/{light,dark}/` so an agent can *look* at what it changed;
  a content-hash manifest makes re-capture incremental.
- **E2E tests** — components are exercised in a real browser against the shipped files
  (see [Testing](#testing)); an agent can prove a change works instead of guessing
- **oxlint** — `make lint` catches dead code and mistakes instantly, in milliseconds

```bash
bun install        # install dev dependencies
bun run build      # compile src/ → dist/ (TypeScript → JS + copy everything else 1:1)
bun run dev        # doc site at http://localhost:3000/
bun run test:run   # run the UI test suite (headless Chromium)
```

`src/` is the authoring tree (`.ts` + html/css/md/fonts); `dist/` is its compiled, 1:1
mirror, committed and the only thing that ships — every build also regenerates the
machine-readable `dist/stats.json` (component counts per type, the JS/CSS-only split, and
byte sizes raw/minified/gzipped via `make stats`). `docs/` is the generated **documentation
site** (only `dist/documentation/` + the SEO files + a `404.html` copy of `index.html` so
GitHub Pages never serves an empty page for dead links) that GitHub Pages publishes — the
pages' `../components/…` / `../theme/…` references are rewritten to the jsDelivr GitHub
CDN by the mirror ([scripts/lib/mirror.ts](scripts/lib/mirror.ts)), so docs/ carries no
copies of the component assets. Refresh with `bun run docs`, never edit it directly.

A `Makefile` wraps the common tasks: `make setup` (install deps + Playwright browsers),
`make dev`, `make test-run`, `make coverage`, `make e2e`, `make lint` (oxlint),
`make typecheck`, `make verify`, `make screenshots`, `make stats`, `make docs`. **`make build`** runs
the whole pipeline — lint → compile → minify → stats → screenshots → docs-mirror → verify → tests → e2e —
the same loop CI runs.

`bun run verify` is the static consistency gate (~0.3 s, runs automatically at the end
of every build) and the contract every coding agent must satisfy. It checks, among others:

- **structure** — component skills, doc pages, CSS/JS imports on every page, sidebar links,
  `.preview` blocks, `dist/` freshness (1:1 with `src/`), `docs/` mirror current (CDN-rewritten)
- **consistency** — inline source snippets match the real files (and are properly escaped),
  skill ↔ docs ↔ CSS variant parity, State API contract + per-state coverage across
  screenshots/docs/skill/e2e, changelog & version markers, doc command references
  (every `bun run`/`make` quoted in the docs must exist), `dist/stats.json` freshness and
  the stats claims in README/index matching the measured numbers exactly
- **quality** — token boundary rule (only tweakcn-defined `var(--*)`), undefined utility
  classes, `prefers-reduced-motion` coverage, init idempotency (double-binding guard),
  dead links (parsed with linkedom), portable paths (no machine-absolute paths),
  strict typecheck, render drift (screenshot pixels changed without input changes),
  theme sidebar contrast (every preset's nav text reaches WCAG AA on its real background)
- **hygiene** — working tree committed, so a green build is a committed build

Every failing check prints the offending files **and the exact fix** — the verifier is
the loop's authority (AGENTS.md defers to its output), so a coding agent can iterate
`edit → build → do what it says` until the goal is reached. The warn-ratchets for legacy
rollouts (State API, e2e, reduced motion) are now empty and kept as hard gates against
regressions. How this all scales without human review — and the proof-loop diagram —
are documented in [ARCH.md](ARCH.md).

## Testing

Tests exist so agents (and humans) can verify the implementation end-to-end instead of trusting it.

UI tests run in a real browser (Chromium via Playwright) with **Vitest browser mode** — no mocking. The suite in [`tests/ui.test.ts`](tests/ui.test.ts) loads the actual documentation pages from `dist/documentation/` in a same-origin iframe and drives them end-to-end: web-component shell rendering, the SPA router, dark-mode toggle, dialog open/close/focus-return, and the single-open accordion.

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
after touching any component — the shipped files themselves are asserted, so "it
compiles" is never mistaken for "it works". Every component ships one (the gate is
hard), and its parity rule keeps fixture, docs and code in lockstep as they change.
The documentation site itself is covered too ([`tests/e2e/documentation.e2e.ts`](tests/e2e/documentation.e2e.ts)):
the intro page renders, the SPA router navigates, and the header search opens the command palette (generated index, page + section results).

## Credits

This project began as a fork of **[shadcn-html](https://github.com/codylindley/shadcn-html)** —
credit to [Cody Lindley](https://github.com/codylindley) for the original idea and first
implementation.

Maintained by [Aron Homberg](https://aron-homberg.de) — the TypeScript build chain,
State API, and the verifier-driven quality loop ([ARCH.md](ARCH.md)) described above.

## License

Licensed under the [MIT License](LICENSE).
