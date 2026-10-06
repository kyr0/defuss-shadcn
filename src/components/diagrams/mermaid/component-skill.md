---
name: Mermaid
type: ATM
section: diagrams
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
and edges, `--muted` clusters, `--accent` notes, `--font-sans` type ...),
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

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type MermaidState = 'default' | 'rendered' | 'error'</code> - `setState(name, config)` takes the config of the state it names (`MermaidStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The source, shown as text (not rendered, or reset). No config. |
| `rendered` | The SVG, rendered from the source (setState renders it again); the source stays in the DOM, hidden. No config. |
| `error` | The source plus the error message (an output with role="alert"). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>the message shown (default: "This diagram could not be rendered."); getState() reports the live one</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends MermaidState&gt;(name: S, config?: MermaidStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MermaidStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: MermaidState; config: MermaidStateConfigs[MermaidState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: MermaidState; config: MermaidStateConfigs[MermaidState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: MermaidState; config: MermaidStateConfigs[MermaidState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: MermaidState; config: MermaidStateConfigs[MermaidState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: MermaidState; config: MermaidStateConfigs[MermaidState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.mermaidApi.setState&lt;S extends MermaidState&gt;(el: HTMLElement, name: S, config?: MermaidStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MermaidStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.mermaidApi.getState(el: HTMLElement): { name: MermaidState; config: MermaidStateConfigs[MermaidState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: MermaidState; config: MermaidStateConfigs[MermaidState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.mermaidApi.render(state: { name: MermaidState; config: MermaidStateConfigs[MermaidState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: MermaidState; config: MermaidStateConfigs[MermaidState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.mermaidApi.store(el: HTMLElement): Store&lt;{ name: MermaidState; config: MermaidStateConfigs[MermaidState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: MermaidState; config: MermaidStateConfigs[MermaidState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.mermaidApi.commit&lt;S extends MermaidState&gt;(el: HTMLElement, name: S, config?: MermaidStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>MermaidStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.mermaidStates: MermaidState[]</code> | The declared states, 'default' first: <code>default</code>, <code>rendered</code>, <code>error</code>. |

### `df$.shadcn.mermaid`

| Member | Description |
|---|---|
| <code>load(url?: string): Promise&lt;MermaidLike&gt;</code> | Import the official Mermaid ESM once. `url` overrides the source (a self-hosted copy of the same build); without it: &lt;meta name= "mermaid-module"&gt;, else the pinned jsDelivr build. A failed import can be retried (the next call imports again). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>url?</code></td><td><code>string</code></td><td>a module URL to import instead (same build, self-hosted)</td></tr></table> <b>Returns</b> <code>Promise&lt;MermaidLike&gt;</code> - the Mermaid module, imported once per URL |
| <code>render(fig: HTMLElement): Promise&lt;boolean&gt;</code> | Render one diagram from its source (queued). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>fig</code></td><td><code>HTMLElement</code></td><td>the .mermaid-diagram figure</td></tr></table> <b>Returns</b> <code>Promise&lt;boolean&gt;</code> - true when the SVG rendered, false when the source failed (the figure shows the error) |
| <code>renderAll(): Promise&lt;boolean[]&gt;</code> | Render every diagram on the page again. <b>Returns</b> <code>Promise&lt;boolean[]&gt;</code> - one result per diagram, in page order - true where it rendered |
| <code>theme(el: Element): Record&lt;string, unknown&gt;</code> | Mermaid "base" themeVariables from the tokens the figure resolves. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>Element</code></td><td>the element whose computed tokens (colors, fonts, radius) the theme reads</td></tr></table> <b>Returns</b> <code>Record&lt;string, unknown&gt;</code> - Mermaid themeVariables: colors as hex, the font family |
| <code>url: string</code> | The pinned official Mermaid build the component loads (never @latest). |

### Types

| Type | Description |
|---|---|
| `MermaidLike` | The part of the official Mermaid module this component uses. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>initialize</code></td><td><code>(config: Record&lt;string, unknown&gt;) =&gt; void</code></td><td>set Mermaid's global config (the component passes the theme it derived from the tokens)</td></tr><tr><td><code>render</code></td><td><code>(id: string, text: string) =&gt; Promise&lt;{ svg: string; bindFunctions?: (el: Element) =&gt; void }&gt;</code></td><td>render a diagram source to SVG markup under a unique id</td></tr></table> |

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
