# Acceptance criteria: introducing a formatter into a verified repository

Status: VERIFIED in this repository (commits below); proposed to defuss-vae as the
general rule set for a "formatting package". Written for the plugin's maintainers,
not as a PR.

Evidence: commit `cb0203e2` (the package: oxfmt, the fence formatter, the parser
fixes, the reformatted tree) and `4ed6a2c1` (the paper page, formatted with it).
Session 2026-10-10. Every criterion below failed at least once on the way and names
the failure that made it a criterion.

## A. What "formatted" means

- **AC-A1 Formatted is the checked property, not a maximum line length.** The check
  is `formatter --check` inside `make lint`; lines a formatter cannot break (long
  selectors, strings) stay long. Evidence: 335 component lines and 5,891 page lines
  remain over 120 after formatting; oxlint has no `max-len`. Files: `package.json`
  (`format`, `format:check`), `Makefile`, `.oxfmtrc.json`.
- **AC-A2 One width, one quote policy per language, each decision recorded with the
  failure that decided it.** TS single quotes; CSS double quotes (1,957 flipped lines,
  tests pinning double-quoted selectors, sheets that describe double-quoted markup);
  scripts inside html fences single quotes (a UI test looks for `df$('#sa-dialog')`).
  Evidence: the `Formatting` section of `AGENTS.md`; the oxfmt `overrides` block.
- **AC-A3 Scope exclusions are explicit and each has a mechanical reason.**
  Generated files (the theme presets build.ts rewrites: the check flagged six right
  after a build) and vendored byte-pinned regions (`qr-code.ts`, whose e2e pins length
  and SHA-256 of its vendored block). Evidence: `.oxfmtrc.json` `ignorePatterns`, the
  `src/theme/utils/*.css` glob.

## B. Proofs a reformat must deliver

- **AC-B1 Shipped bytes.** Every minified artifact is byte-identical to the previous
  build, or the exception is named and explained. Evidence: 7 of 7 changed `.min.*`
  equal modulo the spaces inside a legacy `clip: rect(0, 0, 0, 0)` (lightningcss passes
  the value through); the per-app component sets in `dist/stats.json` equal.
- **AC-B2 Every scanner that reads source as text is run against the formatted
  syntax, and each one that broke gets a test.** Eight broke here: `apps.ts`
  initHooks (a wrapped `dfDollar<T>(` call dropped dialog.js from an app bundle),
  verify's dialog-ownership regex, `dom-discipline.ts` hasRender (`Object.assign(` at a
  line end), `component-api.ts` three times (event comment above a brace-less `if`,
  generics over several lines, a union's leading `|`), `docs-ssg.ts` exampleFence
  (longer fences), `stat-figures.ts` (a figure on its own line), the code-example icon
  reader (unquoted object keys). Evidence: `tests/apps.test.ts`,
  `tests/dom-discipline.test.ts`, `tests/component-api.test.ts`,
  `tests/format-pages.test.ts`, `tests/stat-figures.test.ts`.
- **AC-B3 Read the output, not the exit code.** An SSG that renders an error
  boundary's text into the page exits 0: 369 pages shipped `FATAL ERROR: [JsxError]`
  in their toolbars and only one e2e noticed, as a 320px overflow of the error text.
  Evidence: verify gate 29 `rendered pages are error-free` (`scripts/verify.ts`).
- **AC-B4 Markup formatting is proven DOM-equivalent with the browser's parser on
  real inputs**, comparing elements, attributes, text, embedded CSS through the CSSOM;
  a probe over every page applies the parser's own rules (the dropped newline after
  `<pre>`, whitespace between SVG shapes, style normalization) before it reports.
  Evidence: `tests/format-pages.test.ts` (three real pages), the all-pages probe
  (tmp/, a `vae:probe`, not committed): 30 residual units, all classified.
- **AC-B5 Idempotence.** `--write` runs to a fixpoint; one `--check` pass is stable
  afterwards. Evidence: Prettier's member-chain breaking oscillated on two pages and
  once needed more than three passes; the CLI iterates up to eight and reports a page
  that never settles.
- **AC-B6 Verbatim regions are masked, not trusted.** Data scripts
  (`text/markdown`), `<pre>`, `<textarea>`: Prettier re-indented an Editor.js document
  (10 e2e checks) and printed a stray `>` before a `<pre>` after another element's
  closing tag (two pages). Evidence: `keepVerbatim` in `scripts/lib/format-pages.ts`
  with a minimal reproduction recorded in its comment.
- **AC-B7 Whitespace sensitivity is strict for HTML a stylesheet may render inline.**
  The default (`css`) assumes a tag's default display; a `<div>` styled inline-block
  renders the newline it adds (a 320px overflow), a contenteditable block's text
  starts with its indentation (Markdown shortcuts stopped matching). Evidence:
  `HTML_OPTIONS` in `scripts/format-pages.ts`.
- **AC-B8 Prose in MDX is never hard-wrapped by a tool.** MDX parses JSX children as
  Markdown (a wrapped line starting with `- ` becomes a list) and Prettier's `mdx`
  parser is MDX v1 (it rewrote a JSX comment and the build failed). Editor soft-wrap
  instead. Evidence: `.vscode/settings.json`; the probe build on Prettier-formatted
  pages.

## C. Process criteria

- **AC-C1 One pipeline run per package**, in the order build → screenshots → verify
  → tests → e2e, with a targeted check mid-package only when a fact decides the next
  edit. Evidence: three full passes were needed here (css-mode fences, strict fences,
  masked pre/textarea), each because a proof in B failed, never because of a hunch.
- **AC-C2 e2e proves the whole surface across runs.** The runner's changed-set
  selection plus the recorded passes of unchanged files cover all 258 files: 254 +
  58 + 59 across three runs. Evidence: `.cache/e2e-manifest.json`.
- **AC-C3 A hang guard that trips under the gate's own load is widened with its
  evidence, not disabled.** Evidence: `tests/code-example.test.ts` (6 s → 9 s; past
  6 s × 2 twice in the gate's coverage run, 1.5 s alone).
- **AC-C4 The markup repair is part of the package and listed.** A formatter that
  refuses what a browser repairs silently is a parser-level check of every example:
  183 void end tags, two double `</svg>`, JSX braces in an html fence. Evidence:
  commit `cb0203e2`, 30 pages.

## D. For defuss-vae to generalize

- A `format` verb next to `lint` in the layout, with `format:check` inside `lint`
  (AC-A1), and STACKS.md defaults: oxfmt for JS/TS/CSS; Markdown/MDX prose excluded
  (AC-B8).
- A gate rule "every scanner over source text has a test with the formatted syntax"
  cannot be mechanized; what can: AC-B1 (`cmp` of minified artifacts against HEAD,
  exceptions listed), AC-B3 (the rendered output grep), AC-B5 (`--check` after
  `--write` must pass).
- Two plugin findings from this session, outside the criteria: the gate's stdout is
  cut at about 8 KB, so with 705 reviewed paths the attestation template was only
  readable from `tmp/vae/<session>/gate.txt` and a stdout capture; and the gate's
  coverage run follows a full `test:run` back to back, which is where the hang guard
  tripped (AC-C3).
