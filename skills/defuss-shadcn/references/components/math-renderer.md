---
name: Formula Rendering
type: ATM
section: math
why: The official KaTeX renderer, loaded on the first formula - visual HTML plus MathML for assistive technology from a TeX source that stays readable without JavaScript; a notation tree makes single terms selectable.
when: Display and inline mathematics in papers, docs and teaching pages - for an editable formula use math-editor, to compute with one use math-compute.
where: dist/components/math.css + dist/components/math.js (the extra bundle of the Math section - load it after all.css / all.js; per component: dist/components/math-renderer/math-renderer.css + math-renderer.js)
supportedStates: default, rendered, highlighted, error
---

# Pattern: Formula Rendering

## Native basis

A `<figure>` (display) or `<span>` (inline) holding the formula's TeX in a
`<code class="math-renderer-source">`. Without JavaScript - or before KaTeX
arrives - the TeX reads as code; with it, the official KaTeX renderer typesets
it into visual HTML plus MathML, and the source stays in the DOM, hidden.

## Native Web APIs

- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) / [`<figcaption>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption) - a display formula and its caption as one unit
- [MathML](https://developer.mozilla.org/en-US/docs/Web/MathML) - KaTeX writes a `<math>` twin of the formula that screen readers speak; the visual HTML is `aria-hidden`
- [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) - KaTeX loads only when a page has a formula
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - the selected terms' descriptions and the error message (`role="alert"`)
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - formulas added later typeset on insertion
- [`aria-pressed`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-pressed) - the term buttons report which term is selected
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) / [`@media print`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media) - the selection stays visible in high contrast; print shows the formula alone

---

## Structure

```html
<figure class="math-renderer" aria-label="The quadratic formula">
  <code class="math-renderer-source">x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}</code>
  <figcaption>The quadratic formula</figcaption>
</figure>

<p>
  The identity
  <span class="math-renderer" data-variant="inline"><code class="math-renderer-source">a^2 + b^2 = c^2</code></span>
  holds in every right triangle.
</p>
```

- The TeX goes into the `<code>` as written (escape `<` and `&` as in any
  HTML). KaTeX's supported TeX applies - see katex.org/docs/supported.
- In the `<code>` of an MDX page write the TeX inside an example fence (the
  docs never parse math themselves).

### Selectable terms

A notation tree names the terms a reader can select - each node with an `id`
becomes one selectable occurrence:

```html
<figure class="math-renderer" id="ratio" aria-label="A ratio">
  <code class="math-renderer-source">\frac{a}{b}</code>
  <script type="application/json" class="math-renderer-notation">
    {"kind":"fraction","numerator":{"kind":"symbol","value":"a","id":"num","description":"the numerator a"},
     "denominator":{"kind":"symbol","value":"b","id":"den","description":"the denominator b"}}
  </script>
</figure>
<table class="table">
  <tr data-math-for="ratio" data-math-term="num"><td>a</td><td>apples sold</td></tr>
  <tr data-math-for="ratio" data-math-term="den"><td>b</td><td>apples offered</td></tr>
</table>
```

- Node kinds: `symbol` (one Latin letter, or `alpha`, `beta`, `gamma`, `delta`,
  `epsilon`, `theta`, `lambda`, `mu`, `pi`, `rho`, `sigma`, `tau`, `phi`, `omega`,
  `infty`, `sum`, `prod`), `number` (decimal), `text`, `operator` (`+ - pm times
  = < > le ge`), `sequence` (`children`), `fraction` (`numerator`, `denominator`),
  `power` (`base`, `exponent`), `subscript` (`base`, `subscript`), `root`
  (`radicand`), `group` (`delimiter`: `parentheses`, `brackets`, `absolute`;
  `child`). Every node may carry `id`, `description` and `semanticId`.
- Ids are unique within the tree. Two `x` in one formula are two occurrences
  with two ids; a shared `semanticId` says they stand for the same thing.
- Terms with a `description` also get a term button (a keyboard path to every
  term); the description of the selection is announced in an `<output>`.
- Any element outside the formula with `data-math-for="<formula id>"` and
  `data-math-term="<term id>"` selects that term on click and carries
  `data-selected` while it is selected - a symbol table, a legend, a button.
- Raw TeX is selectable only as a whole - the component never guesses a term
  from text.

## Variants

| Variant | Behavior |
| --- | --- |
| *(none)* | A display formula: centered, scrolls sideways when wider than its column |
| `data-variant="card"` | The formula on a card panel (border, radius, card surface) |
| `data-variant="inline"` | On a `<span>` inside a sentence: text-style math on the baseline, no term buttons |

## Loading

The component ships **no KaTeX code**. The first formula on a page imports
the official ESM build and its stylesheet once:

`https://cdn.jsdelivr.net/npm/katex@0.19.0/dist/katex.mjs` +
`https://cdn.jsdelivr.net/npm/katex@0.19.0/dist/katex.min.css`

(pinned - never `@latest`; the fonts load relative to the stylesheet). A page
without a formula requests neither. To self-host the same build:

```html
<meta name="math-renderer-module" content="/vendor/katex/katex.mjs">
<meta name="math-renderer-css" content="/vendor/katex/katex.min.css">
```

or call `df$.shadcn.mathRenderer.load(url, css)` before formulas render.

## Security

TeX is untrusted input: KaTeX's `trust` is off, so `\href`, `\url`,
`\includegraphics` and the `\html...` commands render as errors; macros are a
fresh object per formula (a `\gdef` cannot reach the next one); expansion
(`maxExpand: 256`) and sizes (`maxSize: 20`) are bounded. A notation tree is
serialized by the component from a closed grammar, and the trust check admits
only its own `\htmlData` term markers carrying an id the tree declares.

## ARIA

| Attribute | Where | Why |
| --- | --- | --- |
| `aria-label` | the figure | names the formula; KaTeX's MathML is what screen readers read as math |
| `role="group"` + `aria-label` | `.math-renderer-terms` (generated) | the term buttons, named after the formula |
| `aria-pressed` | each term button (generated) | which term is selected |
| `role="alert"` | `.math-renderer-error` (generated) | announces a formula that could not be rendered |
| `aria-busy="true"` | the figure, while KaTeX loads | the formula is not final yet |

## Notes

- `df$.shadcn.mathRenderer.setSource(el, source)` renders another source;
  `select(el, ids)` selects terms (`[]` clears); `export(el, 'latex' |
  'mathml')` returns the clean TeX (no term markers) or KaTeX's MathML.
- Every selection change dispatches `math-select` (bubbles) with the ids,
  their semantic ids and descriptions.
- Selection never re-typesets: it marks the typeset terms, the buttons and
  the linked elements.
- Colors follow `currentColor`; selection uses `--accent` / `--ring` with an
  outline and an underline, so it does not rely on color alone.
- The output, the term buttons and the description are runtime chrome
  (`data-ce-chrome`): the HTML Preview Editor never writes them into a source.

## States

| State | Meaning |
| --- | --- |
| `default` | The TeX as text - not typeset (before KaTeX arrives, or reset) |
| `rendered` | Typeset by KaTeX; the source stays in the DOM, hidden |
| `highlighted` | Typeset, with `config.selected` marked |
| `error` | The TeX plus `<output class="math-renderer-error" role="alert">` with the message |

```js
const f = document.querySelector('#ratio');
await f.api.setState('rendered');                         // typeset (KaTeX loads once)
f.api.setState('highlighted', { selected: ['num'] });     // mark a term
f.api.setState('error', { message: 'Offline' });
f.api.getState(); // { name: 'error', config: { source, selected, message } }
```

The registry global is `df$.shadcn.mathRendererApi` / `df$.shadcn.mathRendererStates`;
the imperative API is `df$.shadcn.mathRenderer.{ load, serialize, setSource, select, export, url }`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type MathRendererState = 'default' | 'rendered' | 'highlighted' | 'error'</code> - `setState(name, config)` takes the config of the state it names (`MathRendererStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The TeX as text, not typeset (before KaTeX arrives, or reset). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source?</code></td><td><code>MathSource</code></td><td>what renders: `{ format: 'latex', text }`, or `{ format: 'notation', tree }` for selectable terms (default: the authored source)</td></tr><tr><td><code>selected?</code></td><td><code>string[]</code></td><td>the selected terms' ids (ids of the notation tree; raw TeX has none)</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>the error message shown in 'error' (getState() reports the live one)</td></tr></table> |
| `rendered` | Typeset by KaTeX - visual HTML plus MathML for assistive technology; the source stays in the DOM, hidden. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source?</code></td><td><code>MathSource</code></td><td>what renders: `{ format: 'latex', text }`, or `{ format: 'notation', tree }` for selectable terms (default: the authored source)</td></tr><tr><td><code>selected?</code></td><td><code>string[]</code></td><td>the selected terms' ids (ids of the notation tree; raw TeX has none)</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>the error message shown in 'error' (getState() reports the live one)</td></tr></table> |
| `highlighted` | Typeset, with the selected terms marked (`config.selected`). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source?</code></td><td><code>MathSource</code></td><td>what renders: `{ format: 'latex', text }`, or `{ format: 'notation', tree }` for selectable terms (default: the authored source)</td></tr><tr><td><code>selected?</code></td><td><code>string[]</code></td><td>the selected terms' ids (ids of the notation tree; raw TeX has none)</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>the error message shown in 'error' (getState() reports the live one)</td></tr></table> |
| `error` | The TeX plus an error message (an output with role="alert") - invalid TeX, or KaTeX could not load. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source?</code></td><td><code>MathSource</code></td><td>what renders: `{ format: 'latex', text }`, or `{ format: 'notation', tree }` for selectable terms (default: the authored source)</td></tr><tr><td><code>selected?</code></td><td><code>string[]</code></td><td>the selected terms' ids (ids of the notation tree; raw TeX has none)</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>the error message shown in 'error' (getState() reports the live one)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends MathRendererState&gt;(name: S, config?: MathRendererStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MathRendererStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: MathRendererState; config: MathRendererStateConfigs[MathRendererState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: MathRendererState; config: MathRendererStateConfigs[MathRendererState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: MathRendererState; config: MathRendererStateConfigs[MathRendererState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: MathRendererState; config: MathRendererStateConfigs[MathRendererState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: MathRendererState; config: MathRendererStateConfigs[MathRendererState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.mathRendererApi.setState&lt;S extends MathRendererState&gt;(el: HTMLElement, name: S, config?: MathRendererStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MathRendererStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.mathRendererApi.getState(el: HTMLElement): { name: MathRendererState; config: MathRendererStateConfigs[MathRendererState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: MathRendererState; config: MathRendererStateConfigs[MathRendererState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.mathRendererApi.render(state: { name: MathRendererState; config: MathRendererStateConfigs[MathRendererState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: MathRendererState; config: MathRendererStateConfigs[MathRendererState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.mathRendererApi.store(el: HTMLElement): Store&lt;{ name: MathRendererState; config: MathRendererStateConfigs[MathRendererState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: MathRendererState; config: MathRendererStateConfigs[MathRendererState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.mathRendererApi.commit&lt;S extends MathRendererState&gt;(el: HTMLElement, name: S, config?: MathRendererStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>MathRendererStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.mathRendererStates: MathRendererState[]</code> | The declared states, 'default' first: <code>default</code>, <code>rendered</code>, <code>highlighted</code>, <code>error</code>. |

### `df$.shadcn.mathRenderer`

| Member | Description |
|---|---|
| <code>load(url?: string, css?: string): Promise&lt;KatexLike&gt;</code> | Import the official KaTeX ESM and link its stylesheet - once per URL. Without arguments: &lt;meta name="math-renderer-module"&gt; / &lt;meta name="math-renderer-css"&gt;, else the pinned jsDelivr build. A failed load can be retried (the next call loads again). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>url?</code></td><td><code>string</code></td><td>a module URL to import instead (the same build, self-hosted)</td></tr><tr><td><code>css?</code></td><td><code>string</code></td><td>the stylesheet of that build (its fonts resolve relative to it)</td></tr></table> <b>Returns</b> <code>Promise&lt;KatexLike&gt;</code> - KaTeX, once the module and its stylesheet have loaded |
| <code>serialize(tree: MathNotation): MathSerialized</code> | Serialize a notation tree to TeX: clean (what a reader copies) and marked (each term with an id wrapped for selection). Only the tree's own grammar is accepted - single letters or Greek names as symbols, decimal numbers, escaped text, the listed operators - so no TeX command can be injected through it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>tree</code></td><td><code>MathNotation</code></td><td>the notation (kinds symbol, number, text, operator, sequence, fraction, power, subscript, root, group)</td></tr></table> <b>Returns</b> <code>MathSerialized</code> - the clean TeX, the marked TeX and the named terms |
| <code>setSource(el: HTMLElement \| string, source: MathSource): Promise&lt;void&gt;</code> | Render another source in a formula (the selection is cleared). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-renderer element, or a selector for it</td></tr><tr><td><code>source</code></td><td><code>MathSource</code></td><td>TeX (`{ format: 'latex', text }`) or a notation tree (`{ format: 'notation', tree }`)</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when the formula is typeset (or shows the error) |
| <code>select(el: HTMLElement \| string, ids: string[]): void</code> | Select terms of a notation formula - marked in the typeset output, on the term buttons and on linked outside elements; an empty list clears the selection. A `math-select` event reports the change. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-renderer element, or a selector for it</td></tr><tr><td><code>ids</code></td><td><code>string[]</code></td><td>occurrence ids of the formula's notation tree</td></tr></table> |
| <code>export(el: HTMLElement \| string, format: 'latex' \| 'mathml' = 'latex'): Promise&lt;string&gt;</code> | A formula as text a reader can copy: its clean TeX (no term markers), or its MathML. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-renderer element, or a selector for it</td></tr><tr><td><code>format</code></td><td><code>'latex' \| 'mathml'</code> = <code>'latex'</code></td><td>'latex' (default) or 'mathml'</td></tr></table> <b>Returns</b> <code>Promise&lt;string&gt;</code> - the TeX, or the MathML markup KaTeX writes for it |
| <code>url: string</code> | The pinned official KaTeX build the component loads (never @latest). |

### Events

| Event | Description |
|---|---|
| `math-select` | the selection changed - linked tables, descriptions and figures follow it <code>detail</code>: <code>MathSelectDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>ids</code></td><td><code>string[]</code></td><td>the selected occurrence ids</td></tr><tr><td><code>semanticIds</code></td><td><code>string[]</code></td><td>what they stand for - the notation's semanticId of each selected term that names one</td></tr><tr><td><code>descriptions</code></td><td><code>string[]</code></td><td>the selected terms' descriptions</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `KatexLike` | The part of the official KaTeX module this component uses. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>render</code></td><td><code>(tex: string, el: HTMLElement, options: KatexOptions) =&gt; void</code></td><td>typeset `tex` into `el` (replacing its content)</td></tr></table> |
| `MathRendererConfig` | A formula's state: every field optional in setState() (merged into the current one); getState() reports all. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source?</code></td><td><code>MathSource</code></td><td>what renders: `{ format: 'latex', text }`, or `{ format: 'notation', tree }` for selectable terms (default: the authored source)</td></tr><tr><td><code>selected?</code></td><td><code>string[]</code></td><td>the selected terms' ids (ids of the notation tree; raw TeX has none)</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>the error message shown in 'error' (getState() reports the live one)</td></tr></table> |
| `MathSelectDetail` | The `math-select` event's detail: the terms now selected. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>ids</code></td><td><code>string[]</code></td><td>the selected occurrence ids</td></tr><tr><td><code>semanticIds</code></td><td><code>string[]</code></td><td>what they stand for - the notation's semanticId of each selected term that names one</td></tr><tr><td><code>descriptions</code></td><td><code>string[]</code></td><td>the selected terms' descriptions</td></tr></table> |
| `MathSerialized` | A notation tree serialized to TeX. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex</code></td><td><code>string</code></td><td>clean TeX - what a reader copies</td></tr><tr><td><code>marked</code></td><td><code>string</code></td><td>TeX with the terms wrapped in \htmlData markers - what KaTeX typesets</td></tr><tr><td><code>terms</code></td><td><code>MathTerm[]</code></td><td>the named terms, in source order</td></tr></table> |
| `MathTerm` | One named term of a serialized notation tree. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the occurrence id</td></tr><tr><td><code>semanticId</code></td><td><code>string \| null</code></td><td>what it stands for (shared by every occurrence of one symbol), or null</td></tr><tr><td><code>description</code></td><td><code>string</code></td><td>its description - the term button's label (default: the id)</td></tr></table> |
