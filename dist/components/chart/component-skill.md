---
name: Chart
type: MOL
why: Apache ECharts does the drawing; the component is the thin token bridge - the tokens become an ECharts theme (resolved to sRGB), options may name tokens as var(--x), and theme or dark-mode switches re-theme live.
when: Any data visualization (bar/line/pie/scatter…) - declarative via data-chart JSON, imperative via df$.chart.mount(), storytelling via df$.chartStory(), one morphing chart per presentation via df$.chart.deck(). Not for single values (progress/meter) or sparkline-less stat tiles.
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
scale, axis/grid chrome, tooltip, bar radius, line width…):

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
