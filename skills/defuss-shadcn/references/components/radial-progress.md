---
name: Radial Progress
type: ATM
section: feedback-status
why: A conic-gradient masked to a ring plus a typed @property draws the arc with no SVG; the optional script makes it state - tones, percent / x of n / template labels, step jumps or a linear glide, and reset / step / play buttons.
when: A percentage of a known total that must read at a glance with the number inside it; a linear bar takes progress, an unknown total can spin (indeterminate) or take spinner.
where: dist/components/radial-progress/radial-progress.css + dist/components/radial-progress/radial-progress.js
supportedStates: default, indeterminate, complete
---

# Pattern: Radial Progress

## Native basis

A `<div>` carrying the ARIA progressbar role, not `<progress>`: the ring must
hold visible text in its center, and `<progress>` discards child content in
supporting browsers (it is the no-support fallback) while its rendering lives
in vendor pseudo-elements that cannot be masked into a ring. So the semantics
are supplied explicitly (`role="progressbar"` with `aria-valuenow` /
`aria-valuemin` / `aria-valuemax`), and the visual is pure CSS: one
`conic-gradient` masked down to an annulus.

---

## Native Web APIs

- [`role="progressbar"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/progressbar_role) - ARIA progressbar semantics on a plain element that can own visible child text
- [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) - registers a private `--_rp-value` copy of `--value` as a `<number>` so a value change interpolates instead of snapping
- [`conic-gradient()`](https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/conic-gradient) - paints the arc directly from `--value`
- [`mask`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask) - cuts the filled disc down to a ring of `--thickness`
- [`cos()`](https://developer.mozilla.org/en-US/docs/Web/CSS/cos) / [`sin()`](https://developer.mozilla.org/en-US/docs/Web/CSS/sin) - place the leading round cap on the stroke centerline as a pure function of `--value`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses the value tween
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - thickens the stroke and darkens the track
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - repaints the ring with `Highlight` / `GrayText` in Windows High Contrast Mode

---

## Structure

```html
<div
  class="radial-progress"
  role="progressbar"
  aria-valuenow="70"
  aria-valuemin="0"
  aria-valuemax="100"
  style="--value:70"
>70%</div>
```

With `radial-progress.js` loaded, `aria-valuenow` alone is enough - the
script derives `--value` and the label from it (the example's inline
`--value` and text are the CSS-only fallback). Without the script, keep
`aria-valuenow`, `--value` and the text in sync yourself: the label is
decoration, the ARIA attribute is what assistive technology announces.

### Custom properties (the public API)

| Property      | Default              | Purpose                                     |
|---------------|----------------------|---------------------------------------------|
| `--value`     | `0`                  | Completion, `0` to `100` (unitless). Required.  |
| `--size`      | `5rem`               | Outer diameter of the ring.                  |
| `--thickness` | `calc(var(--size) / 10)` | Stroke width of the ring.                |

```html
<!-- 12rem ring with a hairline stroke -->
<div class="radial-progress" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100"
     style="--value:60;--size:12rem;--thickness:2px">60%</div>
```

---

## Tones (`data-tone`)

| Value | Arc + label |
|-------|-------------|
| *(none)* | `--primary` |
| `success` | green (literal oklch - no token exists) |
| `warning` | amber |
| `info` | blue |
| `destructive` | `--destructive` |
| `auto` | follows the value: `data-level` low (< 34 %) destructive, mid amber, high green |

Any other color: `style="--progress-color: …"`. The older `data-variant`
values still work: `default`, `secondary` (muted - the low-emphasis ring),
`destructive`, `success`.

## Labels

The script writes the label from `aria-valuenow` / `aria-valuemax` - into a
`.radial-progress-value` child, or into the ring itself when it holds plain
text (an icon or other markup inside is left alone).

| Attribute (on the ring) | Label |
|-------------------------|-------|
| *(none)* / `data-format="percent"` | `70%` |
| `data-format="fraction"` | `3 / 8` |
| `data-format="value"` | `3` |
| `data-template="…"` | `{value}`, `{max}`, `{percent}` filled in, e.g. `{value} km` |
| `data-indeterminate="…"` | the text while there is no value (default `…`) |

```html
<div class="radial-progress" data-format="fraction" role="progressbar" aria-label="Workouts"
     aria-valuenow="4" aria-valuemin="0" aria-valuemax="5">
  <span class="radial-progress-value"></span>
  <span class="radial-progress-caption">workouts</span>
</div>
```

A fraction or template is also written to `aria-valuetext`.

## Commands

The same vocabulary as progress - on a `<button commandfor="ring-id" command="--…">`
or as a `progress:<name>` event on the ring: `--increment` / `--decrement`
(by `data-step`, default a tenth of max), `--reset`, `--play` (linear to max
over `data-duration` ms, default 3000), `--pause`, `--complete`,
`--indeterminate`.

---

## Sizes

| `data-size` | Diameter | Label size |
|-------------|----------|------------|
| _(none)_    | `5rem`   | `0.875rem` |
| `sm`        | `3.5rem` | `0.75rem`  |
| `lg`        | `8rem`   | `1.25rem`  |

`data-size` is a shorthand for the common cases; any other diameter is
`style="--size:…"`.

```html
<div class="radial-progress" data-size="sm" role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100" style="--value:40">40%</div>
<div class="radial-progress" data-size="lg" role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100" style="--value:40">40%</div>
```

---

## ARIA

| Attribute            | Value                | Notes                                                        |
|----------------------|----------------------|--------------------------------------------------------------|
| `role`               | `progressbar`        | Required: the `<div>` has no implicit semantics              |
| `aria-valuenow`      | `0` to `100`         | Required; mirror whatever `--value` is set to                 |
| `aria-valuemin`      | `0`                  | Required for an explicit range                                |
| `aria-valuemax`      | `100`                | Required for an explicit range                                |
| `aria-label`         | text                 | Name the measure ("Storage used") when no visible label sits next to it |
| `aria-labelledby`    | id                   | Alternative when a nearby heading already names it            |
| `aria-valuetext`     | text                 | Only when the number needs a unit ("7 of 10 seats")           |

Omit `aria-valuenow` only for a genuinely indeterminate progressbar; this
component has no indeterminate presentation, so use `spinner` for that case.

---

## States

| State | Meaning |
|-------|---------|
| `default` | Determinate. `{ value }` jumps there, `{ value, duration }` glides there linearly (ms); no config restores the authored value; `{ max }` changes the total |
| `indeterminate` | `aria-valuenow` removed - a quarter arc spins |
| `complete` | Value = max (`{ duration }` glides there); `progress:completed` fires |

The state name follows the value. `aria-valuenow` is the source of truth: the
script derives `--value` (0-100 of the arc), the label and `data-level`
from it, and repaints when it is written directly.

```js
const ring = document.querySelector('.radial-progress');
ring.api.setState('default', { value: 40 });                 // jump
ring.api.setState('default', { value: 90, duration: 1500 });  // glide
ring.api.getState(); // { name: 'default', config: { value: 90, max: 100, percent: 0.9 } }
```

Every change fires `progress:change` (`detail: { value, max, percent }`).
Without the script the ring is CSS-only: set `--value` (0-100) inline and it
tweens there over 600 ms through the registered `--_rp-value`.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type RadialProgressState = 'default' | 'indeterminate' | 'complete'</code> - `setState(name, config)` takes the config of the state it names (`RadialProgressStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Determinate; no config restores the authored value. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number \| null</code></td><td>the value to show (clamped to 0..max); getState() reports it</td></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>ms to glide there linearly (default: jump)</td></tr><tr><td><code>max?</code></td><td><code>number</code></td><td>a new total (aria-valuemax); getState() reports it</td></tr><tr><td><code>percent?</code></td><td><code>number \| null</code></td><td>reported by getState(): value / max, 0 to 1 (null while indeterminate)</td></tr></table> |
| `indeterminate` | No value: aria-valuenow removed, a quarter arc spins. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number \| null</code></td><td>reported by getState(): null</td></tr><tr><td><code>max?</code></td><td><code>number</code></td><td>reported by getState(): the total</td></tr><tr><td><code>percent?</code></td><td><code>number \| null</code></td><td>reported by getState(): value / max, 0 to 1 (null while indeterminate)</td></tr></table> |
| `complete` | The value at max - progress:completed fires. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>ms to glide to max (default: jump)</td></tr><tr><td><code>max?</code></td><td><code>number</code></td><td>a new total</td></tr><tr><td><code>value?</code></td><td><code>number \| null</code></td><td>reported by getState(): max</td></tr><tr><td><code>percent?</code></td><td><code>number \| null</code></td><td>reported by getState(): value / max, 0 to 1 (null while indeterminate)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends RadialProgressState&gt;(name: S, config?: RadialProgressStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>RadialProgressStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: RadialProgressState; config: RadialProgressStateConfigs[RadialProgressState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: RadialProgressState; config: RadialProgressStateConfigs[RadialProgressState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: RadialProgressState; config: RadialProgressStateConfigs[RadialProgressState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: RadialProgressState; config: RadialProgressStateConfigs[RadialProgressState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: RadialProgressState; config: RadialProgressStateConfigs[RadialProgressState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.radialProgressApi.setState&lt;S extends RadialProgressState&gt;(el: HTMLElement, name: S, config?: RadialProgressStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>RadialProgressStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.radialProgressApi.getState(el: HTMLElement): { name: RadialProgressState; config: RadialProgressStateConfigs[RadialProgressState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: RadialProgressState; config: RadialProgressStateConfigs[RadialProgressState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.radialProgressApi.render(state: { name: RadialProgressState; config: RadialProgressStateConfigs[RadialProgressState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: RadialProgressState; config: RadialProgressStateConfigs[RadialProgressState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.radialProgressApi.store(el: HTMLElement): Store&lt;{ name: RadialProgressState; config: RadialProgressStateConfigs[RadialProgressState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: RadialProgressState; config: RadialProgressStateConfigs[RadialProgressState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.radialProgressApi.commit&lt;S extends RadialProgressState&gt;(el: HTMLElement, name: S, config?: RadialProgressStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>RadialProgressStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.radialProgressStates: RadialProgressState[]</code> | The declared states, 'default' first: <code>default</code>, <code>indeterminate</code>, <code>complete</code>. |

### Events

| Event | Description |
|---|---|
| `progress:change` | Fires when the value changes - value, max and the fraction done (0 to 1). <code>detail</code>: <code>ProgressChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>number</code></td><td>the value (the --value custom property)</td></tr><tr><td><code>max</code></td><td><code>number</code></td><td>the max (data-max, default 100)</td></tr><tr><td><code>percent</code></td><td><code>number</code></td><td>value / max, 0 to 1</td></tr></table> |
| `progress:completed` | Fires once when the value reaches max. No <code>detail</code>. |

### Types

| Type | Description |
|---|---|
| `ProgressChangeDetail` | What progress:change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>number</code></td><td>the value (the --value custom property)</td></tr><tr><td><code>max</code></td><td><code>number</code></td><td>the max (data-max, default 100)</td></tr><tr><td><code>percent</code></td><td><code>number</code></td><td>value / max, 0 to 1</td></tr></table> |

---

## Notes

- **`--value` itself is never registered** - only the private `--_rp-value`
  copy is. A global `@property --value` would re-type every other `--value`
  on the page (the countdown's digits use one) and any consumer's own.
- **Why not `<progress>`**: the ring's whole point is the number in the middle;
  `<progress>`' child text is fallback-only content and its bar lives in
  vendor pseudo-elements that cannot be masked into an annulus. Use the linear
  `progress` component whenever no centered label is needed.
- **Keep the label and `aria-valuenow` in sync** when running CSS-only - they
  are two independent writes there; the script makes `aria-valuenow` the only one.
- **Jumps vs glides**: a jump (no `duration`) still eases over 600 ms through
  the CSS tween while the number updates at once; a scripted glide paints every
  frame itself (`data-running` switches the CSS tween off) so number and arc
  move together. With `prefers-reduced-motion` both land immediately.
- **Sits on the text baseline** (`vertical-align: middle`), so it composes
  inline in table cells and stat rows without a wrapper.
- **Content-box sizing**: `--size` is the drawn diameter, so `padding` on the
  element grows the label area without distorting the ring.
- **Nothing is clipped**: any child content (an icon, `.badge`, a two-line
  label) is centered by `place-content: center`; keep it inside
  `--size - 2 × --thickness` or it will overlap the stroke.
- **Composition**: pair with `.card` + `.statistic` for dashboard tiles, the
  way the linear `progress` component does.
