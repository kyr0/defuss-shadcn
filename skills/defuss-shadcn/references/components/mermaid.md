---
name: Mermaid
type: ATM
why: Mermaid's own <pre class="mermaid"> text becomes a token-themed SVG - the official renderer, lazy-loaded, locked to strict security; readable source without JavaScript.
when: Flowcharts, sequence, class, state, ER, Gantt and other text-defined diagrams in docs and apps - for data charts use chart (ECharts).
where: dist/components/mermaid/mermaid.css + dist/components/mermaid/mermaid.js
supportedStates: default, rendered, error
---

# Pattern: Mermaid

## Native basis

A `<figure>` holding Mermaid's own native markup - `<pre class="mermaid">` with
the diagram text. Without JavaScript (or before the renderer arrives) the
source reads as a code block; with it, the official Mermaid renderer turns it
into an SVG themed from the design tokens.

## Native Web APIs

- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) / [`<figcaption>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption) - the diagram and its caption as one unit
- [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) - the renderer is loaded only when a page has a diagram
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - new diagrams render on insertion; theme changes re-render
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) + `role="alert"` - a malformed diagram announces its error
- [Canvas `getImageData()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData) - oklch() tokens → the hex colors Mermaid parses
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) / [`@media print`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media) - high contrast and print keep the diagram whole

---

## Structure

```html
<figure class="mermaid-diagram" aria-label="How a component skill ships">
  <pre class="mermaid">
flowchart LR
  Skill --> Build
  Build --> Dist
  </pre>
  <figcaption>How a component skill ships</figcaption>
</figure>
```

- The text inside `<pre class="mermaid">` is plain Mermaid syntax - no defuss
  DSL. `<br>` in labels works (Mermaid reads the markup, entities decoded).
- A bare `<pre class="mermaid">` (Mermaid's upstream convention) is wrapped in
  the figure automatically.
- In the docs (MDX) and in `ARCH.md`, a ` ```mermaid ` fence becomes this
  figure - write the fence, not the markup.

## Loading

The component ships **no Mermaid code**. The first diagram on a page imports
the official ESM build once:

`https://cdn.jsdelivr.net/npm/mermaid@12.0.0/dist/mermaid.esm.min.mjs`

(pinned - never `@latest`). A page without a diagram never requests it. To
self-host the same build:

```html
<meta name="mermaid-module" content="/vendor/mermaid/mermaid.esm.min.mjs">
```

or call `df$.shadcn.mermaid.load(url)` before diagrams render.

## Theming

Diagrams use Mermaid's `base` theme with `themeVariables` derived from the
design tokens the figure resolves (`--card` nodes, `--muted-foreground` lines
and edges, `--muted` clusters, `--accent` notes, `--font-sans` type …),
converted to hex (Mermaid parses hex only; the tokens are `oklch()`). Dark
mode and theme switches re-render every diagram whose theme changed; a figure
inside a `.dark` scope renders dark on a light page.

## Security

`securityLevel: "strict"` is locked: HTML in labels is encoded and `click`
handlers are off. Mermaid's own `secure` list stops `%%{init}%%` directives in
a diagram from lowering it - safe for agent-authored content.

## States

| State | Meaning |
| --- | --- |
| `default` | The source, shown as text (not rendered / reset) |
| `rendered` | The SVG; the source stays in the DOM, hidden |
| `error` | The source plus `<output class="mermaid-error" role="alert">` with the message |

```js
const fig = document.querySelector('#flow');
await fig.api.setState('rendered');          // (re-)render from the source
fig.api.setState('default');                 // back to the source text
fig.api.setState('error', { message: 'Offline' });
fig.api.getState();                          // { name: 'rendered', config: {} }
```

The registry global is `df$.shadcn.mermaidApi` / `df$.shadcn.mermaidStates`;
the imperative API is `df$.shadcn.mermaid.{ load, render, renderAll, theme, url }`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.mermaidApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.mermaidStates` = `default`, `rendered`, `error`.

### `df$.shadcn.mermaid`

| Member | Description |
|---|---|
| `load(url?)` | Import the official Mermaid ESM once. `url` overrides the source (a self-hosted copy of the same build); without it: <meta name= "mermaid-module">, else the pinned jsDelivr build. A failed import can be retried (the next call imports again). |
| `render(fig)` | Render one diagram from its source (queued). Resolves true on success. |
| `renderAll()` | Render every diagram on the page again - resolves with one result per diagram. |
| `theme(el)` | Mermaid "base" themeVariables from the tokens the figure resolves. |
| `url` | The pinned official Mermaid build the component loads (never @latest). |

## ARIA

| Case | Markup |
| --- | --- |
| Name | `aria-label` on the figure - copied to the SVG (`role="img"`) |
| Title / description | Mermaid's `accTitle:` / `accDescr:` lines - rendered as the SVG's `<title>` / `<desc>` |
| Caption | `<figcaption>` - visible text for everyone |
| Error | `<output role="alert">` - announced |

## Notes

- No flash of raw markup: until the first render lands, the figure reads
  `data-state="pending"` and the source box is a quiet placeholder (text
  hidden, a soft shimmer). Without JavaScript the source reads as text; an
  error shows it; if no renderer arrives at all, it appears after 4s.
- Edit the source, never the SVG: every render starts from `<pre class="mermaid">`.
- Invalid syntax never destroys the source - the figure shows it with the error.
- Very wide diagrams scroll inside the figure; they never widen the page.
- For data charts (bars, lines, maps) use `chart` - Mermaid is for diagrams.
