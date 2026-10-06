---
name: Chart
type: MOL
section: charts
why: Apache ECharts does the drawing; the component is the thin token bridge - the tokens become an ECharts theme (resolved to sRGB), options may name tokens as var(--x), and theme or dark-mode switches re-theme live.
when: Any data visualization (bar/line/pie/scatter...) - declarative via data-chart JSON, imperative via df$.chart.mount(), storytelling via df$.chartStory(), one morphing chart per presentation via df$.chart.deck(). Not for single values (progress/meter) or sparkline-less stat tiles.
where: dist/components/chart/chart.css + dist/components/chart/chart.js
supportedStates: default
---

# Chart

## Native basis

A plain `<div class="chart">` mount rendered by [Apache ECharts](https://echarts.apache.org/)
(vendor script loaded by the page - zero echarts bytes ship in this component),
with `role="img"` + `aria-label` as the accessible surface and ECharts' own
`aria.enabled` decal/label output on top.

## Native Web APIs

- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - container-accurate resize + zero-size deferral (the chart boots once its box has real width+height)
- [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) - the entrance animation replays the first time a chart is 30% on screen (not while it mounts off-screen or during page load)
- [`matchMedia('(prefers-reduced-motion: reduce)')`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - evaluated per apply; forces `animation: false`
- [CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) - the theme adapter reads `--chart-1`..`--chart-5`, `--popover*`, `--border`, `--font-sans` and the element's own `color` / `font-family` off `getComputedStyle(el)`; `--chart-font-size` (component-local, default 13px) sets the type scale
- [`<canvas>` 2D `fillStyle`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillStyle) - one 1×1 probe converts oklch / color-mix / any CSS colour to sRGB for ECharts
- [`MutationObserver` on `<html>`/`<head>`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - dark-mode class, token overrides and theme sheet swaps re-theme every live chart (ECharts `setTheme`)
- [`role="img"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/img_role) + [`aria-label`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label) - the chart announces as one labelled graphic (WAI-ARIA)
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - auto-init of `.chart` elements added after load (SPA navigation)

## Structure

Load the vendor runtime first (once per page), then core + chart.js:

```html
<script src="https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js"></script>
```

Declarative mount - the `data-chart` JSON is the ECharts option; the
token-derived THEME supplies every default it leaves out (palette, type
scale, axis/grid chrome, tooltip, bar radius, line width...):

```html
<div class="chart" role="img" aria-label="Revenue per quarter, bar chart"
     data-chart='{"xAxis":{"type":"category","data":["Q1","Q2","Q3","Q4"]},"yAxis":{"type":"value"},"series":[{"id":"rev","type":"bar","data":[12,19,15,24]}]}'></div>
```

Imperative mount (same path, any element):

```js
const { instance, setOption, dispose } = df$.shadcn.chart.mount(el, { series: [{ type: 'line', data: [1, 3, 2] }] });
df$.shadcn.chart.instance(el); // → the stored echarts instance (or undefined)
```

Token references - any colour string may name a token (or a `color-mix()`
over tokens). It is resolved to sRGB against the element at apply time and
re-resolved after every theme or dark-mode switch:

```js
df$.shadcn.chart.mount(el, {
  series: [{ type: 'bar', data: [3, 5, 2], itemStyle: { color: 'var(--primary)' } }],
  visualMap: { inRange: { color: ['var(--muted)', 'var(--chart-2)'] } },
});
df$.shadcn.chart.color(el, '--chart-2');        // → 'rgb(…)' (e.g. inside renderItem)
df$.shadcn.chart.color(el, '--chart-2', 0.3);   // → 'rgba(…, 0.3)'
```

Storytelling - a sequence of option states driven like slides; keep
`series.id`, `data.name` and `universalTransition: true` stable across states
so ECharts morphs instead of redrawing:

```js
const story = df$.shadcn.chartStory(el, [stateA, stateB, stateC], { loop: true });
story.next(); story.prev(); story.go(2); story.index(); // → 0-based position
```

Presentation stage - ONE chart for a whole deck; slides name the state they
show and moving between chart slides morphs the chart (see the Presentation
skill for the markup):

```js
const stage = df$.shadcn.chart.deck(deckEl, {
  base: { tooltip: { trigger: 'item' } },            // merged under every state
  states: { bars: { … }, donut: { … }, dots: { … } }, // data-chart-state="bars" …
});
stage.show('donut'); stage.state(); stage.dispose();
```

States are applied with notMerge; every series defaults to
`universalTransition`; entrance and morph run at 1.5 s (a state may override
`animationDurationUpdate`). The first appearance mounts the chart so its
entrance plays on stage; returning to the same state after a non-chart slide
replays the entrance. Many-to-one morphs (dots merging into bars) use
`dataGroupId` on the source series and `groupId` on the target items with
`universalTransition: { enabled: true, divideShape: 'split' }`.

Editorial frame (optional chrome around the mount):

```html
<figure class="chart-frame">
  <h3 class="chart-title">Revenue by quarter</h3>
  <p class="chart-dek">Bar chart of quarterly revenue.</p>
  <div class="chart" role="img" aria-label="…" data-chart='{…}'></div>
  <figcaption class="chart-source">Source: annual report 2026</figcaption>
</figure>
```

## Variants

| `data-size` | Height | Use |
|-------------|--------|-----|
| _(none)_ | 20rem | default reading size |
| `sm` | 14rem | compact cards, dashboards |
| `lg` | 28rem | hero visualizations, storytelling |

## ARIA

| Attribute | Where | Purpose |
|-----------|-------|---------|
| `role="img"` | `.chart` mount | the chart is one graphic, not a DOM of bars |
| `aria-label` | `.chart` mount | the text equivalent (what + trend) - REQUIRED |
| `aria: { enabled: true }` | base option | ECharts' built-in decal + aria description output |

## States

| State | Meaning |
|-------|---------|
| `default` | the rendered surface; `api.setState('default', { option })` replaces the option wholesale (notMerge) - a bare call is a no-op |

Example: `document.querySelector('#c').api.setState('default', { option: { series: [{ type: 'bar', data: [5, 4, 3] }] } })`

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ChartState = 'default'</code> - `setState(name, config)` takes the config of the state it names (`ChartStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The rendered chart surface; a bare setState('default') changes nothing. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>option?</code></td><td><code>Option</code></td><td>a whole new ECharts option - replaces the current one (notMerge); the first one mounts the chart</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ChartState&gt;(name: S, config?: ChartStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ChartStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ChartState; config: ChartStateConfigs[ChartState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ChartState; config: ChartStateConfigs[ChartState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ChartState; config: ChartStateConfigs[ChartState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ChartState; config: ChartStateConfigs[ChartState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ChartState; config: ChartStateConfigs[ChartState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.chartApi.setState&lt;S extends ChartState&gt;(el: HTMLElement, name: S, config?: ChartStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ChartStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.chartApi.getState(el: HTMLElement): { name: ChartState; config: ChartStateConfigs[ChartState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ChartState; config: ChartStateConfigs[ChartState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.chartApi.render(state: { name: ChartState; config: ChartStateConfigs[ChartState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ChartState; config: ChartStateConfigs[ChartState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.chartApi.store(el: HTMLElement): Store&lt;{ name: ChartState; config: ChartStateConfigs[ChartState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ChartState; config: ChartStateConfigs[ChartState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.chartApi.commit&lt;S extends ChartState&gt;(el: HTMLElement, name: S, config?: ChartStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ChartStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.chartStates: ChartState[]</code> | The declared states, 'default' first: <code>default</code>. |

### `df$.shadcn.chart`

| Member | Description |
|---|---|
| <code>mount(el: HTMLElement, option: Option = {}): ChartMount</code> | Why: the one mount path (declarative and imperative converge here). The token theme goes to init(); the option carries only what the author said. The renderer is SVG (crisp at any density, selectable, small); a ResizeObserver keeps the canvas honest - never a window resize listener. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the .chart element to draw into</td></tr><tr><td><code>option</code></td><td><code>Option</code> = <code>{}</code></td><td>the first option</td></tr></table> <b>Returns</b> <code>ChartMount</code> - the instance and its setOption / dispose |
| <code>instance(el: HTMLElement): EChartsInstanceLike \| undefined</code> | The stored instance for an element. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the .chart element</td></tr></table> <b>Returns</b> <code>EChartsInstanceLike \| undefined</code> - its ECharts instance, undefined until mounted |
| <code>theme(el: HTMLElement): Option</code> | Why: the theme adapter - the chart reads the DESIGN TOKENS off its own computed style and returns an ECharts THEME object (passed to init() and setTheme()). A theme, unlike a merged base option, is only defaults: it survives setOption(..., notMerge) (stories, deck stages), applies per component type (categoryAxis/valueAxis only style axes that EXIST - no phantom axes on pies/treemaps) and per series type (bar radius, line width, pie separators). Sources: the --chart-1..5 palette (resolved to rgb; empty tokens dropped), the element's own `color` for text (so a chart inherits card, slide or page foreground; muted/axis/grid are fixed mixes of it), --popover* for the tooltip, --font-sans for type, and `--chart-font-size` (component- local, default 13px; decks raise it to artboard scale) for the type scale every size here derives from. prefers-reduced-motion disables animation. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the .chart element whose tokens and text color the theme reads</td></tr></table> <b>Returns</b> <code>Option</code> - an ECharts theme object (pass it to init or setTheme) |
| <code>color(el: HTMLElement, value: string, alpha: number = 1): string</code> | Why: page and deck options that pick token colors themselves (a highlight bar, a visualMap gradient) need ECharts-parseable colors too. Resolves a token name ('--chart-2', read off the element) or any CSS color to rgb()/rgba(), optionally at an alpha. '' when unresolvable. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the .chart element (a token resolves against its computed style)</td></tr><tr><td><code>value</code></td><td><code>string</code></td><td>a token name ('--chart-2') or any CSS color</td></tr><tr><td><code>alpha</code></td><td><code>number</code> = <code>1</code></td><td>opacity multiplier, 0 to 1</td></tr></table> <b>Returns</b> <code>string</code> - rgb() / rgba() ECharts can parse, '' when the value does not resolve |
| <code>deck(deck: HTMLElement, { base = {}, states }: { base?: Option; states: Record&lt;string, Option&gt; }): ChartDeck</code> | Why: the deck stage - ONE chart instance for a whole presentation, so every chart slide MORPHS into the next (bars → dots → donut ...) instead of cutting between separate charts. The stage is a `.chart.presentation- stage` child of the `.presentation` mount, laid out in artboard coordinates by presentation.css; slides name the state they show with data-chart-state="name". Slides without one fade the stage out - the instance keeps its last state, so the next chart slide morphs from there. Each state is deep-merged over `base` (shared chrome) and applied with notMerge, so a state is a complete surface; series default to universalTransition. The first appearance mounts the chart, so its entrance animation plays on stage - never hidden at page load. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>deck</code></td><td><code>HTMLElement</code></td><td>the .presentation element holding the .chart.presentation-stage</td></tr><tr><td><code>{ base = {}, states }</code></td><td><code>{ base?: Option; states: Record&lt;string, Option&gt; }</code></td><td>base: the chrome every state shares; states: the option of each named state</td></tr></table> <b>Returns</b> <code>ChartDeck</code> - the stage's controls |

### `df$.shadcn.chartStory`

| Member | Description |
|---|---|
| <code>df$.shadcn.chartStory(el: HTMLElement, states: Option[], { loop = false }: { loop?: boolean } = {}): ChartStory</code> | Why: data-storytelling - a sequence of option states driven like slides. go() clamps (or wraps with { loop: true }) and applies states[i] with notMerge, so each step is a full surface (the token theme persists - it is the instance's theme, not part of the option). Series default to universalTransition, so keeping series.id and data names stable across states makes ECharts MORPH instead of redrawing. An unmounted element is lazily mounted with states[0]. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the .chart element</td></tr><tr><td><code>states</code></td><td><code>Option[]</code></td><td>the option of each step, in order (at least one)</td></tr><tr><td><code>{ loop = false }</code></td><td><code>{ loop?: boolean }</code> = <code>{}</code></td><td>loop: true wraps past the ends instead of clamping</td></tr></table> <b>Returns</b> <code>ChartStory</code> - the story's controls |


### Types

| Type | Description |
|---|---|
| `ChartDeck` | Handle returned by df$.shadcn.chart.deck(). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>show</code></td><td><code>(name: string \| null) =&gt; void</code></td><td>Show a named state (morphing from the current one), or hide the stage with null.</td></tr><tr><td><code>state</code></td><td><code>() =&gt; string \| null</code></td><td>The state currently on stage (null while hidden).</td></tr><tr><td><code>dispose</code></td><td><code>() =&gt; void</code></td><td>Stop following the deck and dispose the chart.</td></tr></table> |
| `ChartMount` | Handle returned by df$.chart.mount() - the imperative lifecycle surface. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>instance</code></td><td><code>EChartsInstanceLike</code></td><td>the ECharts instance</td></tr><tr><td><code>setOption</code></td><td><code>(option: Option, notMerge?: boolean) =&gt; void</code></td><td>apply an option (token colors resolved, motion settings respected)</td></tr><tr><td><code>dispose</code></td><td><code>() =&gt; void</code></td><td>stop observing the element and release the instance</td></tr></table> |
| `ChartStory` | Handle returned by df$.shadcn.chartStory() - drive the states like slides. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>next</code></td><td><code>() =&gt; number</code></td><td>go to the next state; returns its index</td></tr><tr><td><code>prev</code></td><td><code>() =&gt; number</code></td><td>go to the previous state; returns its index</td></tr><tr><td><code>go</code></td><td><code>(i: number) =&gt; number</code></td><td>go to state i (clamped, or wrapped with loop); returns the index shown</td></tr><tr><td><code>index</code></td><td><code>() =&gt; number</code></td><td>the index shown now</td></tr></table> |
| `EChartsInstanceLike` | Minimal structural view of the vendor global (read via globalThis, never window). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>setOption</code></td><td><code>(option: Option, notMerge?: boolean) =&gt; void</code></td><td>apply an option - merged, or replacing the current one with notMerge</td></tr><tr><td><code>setTheme?</code></td><td><code>(theme: Option) =&gt; void</code></td><td>swap the theme (ECharts 6)</td></tr><tr><td><code>resize</code></td><td><code>() =&gt; void</code></td><td>fit the chart to its element's size</td></tr><tr><td><code>clear?</code></td><td><code>() =&gt; void</code></td><td>remove every series and component</td></tr><tr><td><code>dispose</code></td><td><code>() =&gt; void</code></td><td>release the instance</td></tr><tr><td><code>isDisposed?</code></td><td><code>() =&gt; boolean</code></td><td>whether dispose() ran</td></tr><tr><td><code>getOption</code></td><td><code>() =&gt; Option</code></td><td>the option as ECharts holds it now</td></tr></table> |
| `Option` | An ECharts option object - plain JSON (series, axes, legend, ...), token names allowed as colors. = <code>Record&lt;string, unknown&gt;</code> |

## Reuse boundary

Generalize **lifecycle** (mount/resize/dispose), **theme** (the token adapter)
and **story** (`chartStory` transitions) - those live here. One-off visual
metaphors (a specific race chart, a bespoke gauge) stay in page demos: they
compose this primitive with a page-owned option, never extend the component.

## Notes

- **Vendor contract**: `globalThis.echarts` must exist before a chart mounts;
  otherwise ONE actionable error names the exact `<script>` tag to add. The
  component never loads or bundles echarts itself.
- The renderer is **SVG** - crisp at any density, selectable, smaller DOM.
- **Entrance on first view**: a chart mounts immediately, but its entrance animation (a gauge sweeping from 0, bars growing) replays once the chart is first 30% visible - so it plays in view, not during page load or below the fold. Slide charts replay on slide activation instead; reduced motion skips both.
- Theme switching needs no JS: one document-level observer re-derives every
  live chart's theme (`setTheme`) and replays its options so `var(--x)`
  references re-resolve. A long merge stream (a bar race ticking
  `setOption`) stops journaling after 64 ops - its chrome still re-themes.
- Charts inside a presentation slide replay their entrance each time the
  slide becomes active.
- Empty chart tokens degrade gracefully - a theme that leaves `--chart-3`
  empty simply shortens the palette; nothing renders `undefined`.
- Axis chrome lives in the theme's `categoryAxis` / `valueAxis` entries, so
  it styles only axes the option declares - axis-less charts (treemap,
  sankey, chord, sunburst, pie, gauge) never grow phantom cartesian axes.
- Text colours derive from the element's own `color` (muted = 62%, axis
  lines = 28%, gridlines = 10% of it), so a chart on a card, a slide or the
  page always reads against its real surface.
- Zero-size hosts (hidden tabs, pre-layout swaps) defer mounting until the
  ResizeObserver sees a real box - no `Cannot read … of undefined` races.
- `chartStory` uses `notMerge` per step: each state is a complete surface.
- Unknown state names passed to `api.setState()` throw.
