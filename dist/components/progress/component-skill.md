---
name: Progress
type: ATM
why: Native <progress value max> - semantics and rendering come free; <output for> readouts, tones and a small State API make it a live, resettable, animatable bar.
when: Completion of a task with a known total (an unknown total: omit the value, or take the spinner). A percentage that must sit inside a ring takes radial-progress.
where: dist/components/progress/progress.css + dist/components/progress/progress.js
supportedStates: default, indeterminate, complete
---

# Progress

## Native basis

`<progress value max>` with CSS styling for the track and the fill. The
optional `progress.js` keeps `<output class="progress-value" for="id">`
readouts in sync with the value, animates value changes, answers button
commands and exposes the State API. Without it the bar still works - the
readouts just keep their authored text.

## Native Web APIs

- [`<progress>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) - native progress indicator (implicit `progressbar` role, value / max)
- [`<output for>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - the live readout, bound to the bar by id
- [Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API) - `commandfor` + custom `command="--reset"` buttons drive the bar without script (a click fallback covers older browsers)
- [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - percent and numbers in the locale of the text (nearest `[lang]`, else `en`)
- [`::-webkit-progress-bar`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-progress-bar) / [`::-webkit-progress-value`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-progress-value) - track and fill (WebKit)
- [`::-moz-progress-bar`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-moz-progress-bar) - fill (Firefox)
- [`clip-path`](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path) - the two-color label inside the bar
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the inside label picks a readable color for the bar's tone
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - no stripe / sweep motion, value changes jump instead of gliding
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - Highlight fill on Canvas

## Structure

```html
<!-- A bar -->
<progress class="progress" value="66" max="100">66%</progress>

<!-- Indeterminate (no value attribute) -->
<progress class="progress" max="100">Loading...</progress>

<!-- A field: label + live readout + bar -->
<div class="progress-field">
  <div class="progress-header">
    <span class="progress-label" id="up-label">Uploading photos</span>
    <output class="progress-value" for="up"></output>
  </div>
  <progress class="progress" id="up" value="66" max="100" aria-labelledby="up-label"></progress>
  <span class="progress-hint">About 2 minutes left</span>
</div>

<!-- The readout inside the bar -->
<div class="progress-field" data-label="inside">
  <progress class="progress" id="imp" value="45" max="100" aria-label="Import"></progress>
  <output class="progress-value" for="imp"></output>
</div>

<!-- Buttons that drive the bar - no script of your own -->
<progress class="progress" id="job" value="30" max="100" data-step="10" data-duration="4000" aria-label="Job"></progress>
<button class="btn" commandfor="job" command="--increment">+ 10%</button>
<button class="btn" commandfor="job" command="--play">Play</button>
<button class="btn" commandfor="job" command="--reset">Reset</button>
```

### Readouts (`<output class="progress-value">`)

| Attribute | Text |
|-----------|------|
| *(none)* / `data-format="percent"` | `66%` (Intl percent) |
| `data-format="fraction"` | `3 / 8` |
| `data-format="value"` | `3` |
| `data-template="…"` | the template with `{value}`, `{max}` and `{percent}` filled in, e.g. `{value} of {max} files · {percent}` |
| `data-indeterminate="…"` | the text while the bar has no value (default `…`) |

An output is bound by `for="bar-id"`; inside a `.progress-field` an output
without `for` binds to the field's bar. A fraction or template is also written
to the bar's `aria-valuetext`.

## Tones (`data-tone`)

| Value | Fill |
|-------|------|
| *(none)* | `--primary` |
| `success` | green (literal oklch - no token exists) |
| `warning` | amber |
| `info` | blue |
| `destructive` | `--destructive` |
| `auto` | follows the value: `data-level` low (< 34 %) destructive, mid amber, high green |

Any other color: `style="--progress-color: …"`. `data-striped` adds diagonal
bands over the fill, `data-striped="animated"` moves them.

## Sizes

| `data-size` | Bar height |
|-------------|------------|
| `xs` | 0.25rem |
| `sm` | 0.375rem |
| `md` | 0.5rem |
| *(none)* | 0.5rem (1.25rem with `data-label="inside"`) |
| `lg` | 0.75rem (1.5rem inside) |
| `xl` | 1rem (1.75rem inside) |

## Commands

On a `<button commandfor="bar-id" command="--…">`, or as a `progress:<name>`
event dispatched on the bar:

| Command | Effect |
|---------|--------|
| `--increment` / `--decrement` | Jump by `data-step` (default a tenth of max) |
| `--reset` | Jump to 0 |
| `--play` | Glide linearly to max over `data-duration` ms (default 3000; the rest of it from a partial bar; a full bar starts over) |
| `--pause` | Hold a glide where it is |
| `--complete` | Jump to max |
| `--indeterminate` | Remove the value (the sweep) |

## Accessibility

| Element | Attribute |
|---------|-----------|
| `<progress>` | `aria-label` or `aria-labelledby` - name the task |
| `<progress>` | `aria-valuetext` - written by the script for fraction / template readouts |
| `<output>` | `for` - binds the readout; its text is the visible value |

- `<progress>` is natively accessible - screen readers announce the value.
- The text content inside `<progress>` is the fallback for non-supporting browsers.
- The inside label is purely visual duplication of the output text (the `::after` copy).

## States

| State | Meaning |
|-------|---------|
| `default` | Determinate. `{ value }` jumps there, `{ value, duration }` glides there linearly (ms); no config restores the authored value; `{ max }` changes the total |
| `indeterminate` | The value removed - the moving sweep |
| `complete` | Value = max (`{ duration }` glides there); `progress:completed` fires |

The state name follows the value: reaching max by any route makes it
`complete`, a value below max makes it `default` again.

```js
const bar = document.querySelector('#up');
bar.api.setState('default', { value: 40 });                  // jump
bar.api.setState('default', { value: 90, duration: 1500 });   // glide
bar.api.setState('complete');
bar.api.getState(); // { name: 'complete', config: { value: 100, max: 100, percent: 1 } }
```

Every change fires `progress:change` (`detail: { value, max, percent }`) on the
bar. Writing `bar.value` directly also repaints the readouts.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ProgressState = 'default' | 'indeterminate' | 'complete'</code> - `setState(name, config)` takes the config of the state it names (`ProgressStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Determinate; no config restores the authored value. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number \| null</code></td><td>the value to show (clamped to 0..max); getState() reports it</td></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>ms to glide there linearly (default: jump)</td></tr><tr><td><code>max?</code></td><td><code>number</code></td><td>a new total; getState() reports it</td></tr><tr><td><code>percent?</code></td><td><code>number \| null</code></td><td>reported by getState(): value / max, 0 to 1 (null while indeterminate)</td></tr></table> |
| `indeterminate` | No value - the moving sweep. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number \| null</code></td><td>reported by getState(): null</td></tr><tr><td><code>max?</code></td><td><code>number</code></td><td>reported by getState(): the total</td></tr><tr><td><code>percent?</code></td><td><code>number \| null</code></td><td>reported by getState(): value / max, 0 to 1 (null while indeterminate)</td></tr></table> |
| `complete` | The value at max - progress:completed fires. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>ms to glide to max (default: jump)</td></tr><tr><td><code>max?</code></td><td><code>number</code></td><td>a new total</td></tr><tr><td><code>value?</code></td><td><code>number \| null</code></td><td>reported by getState(): max</td></tr><tr><td><code>percent?</code></td><td><code>number \| null</code></td><td>reported by getState(): value / max, 0 to 1 (null while indeterminate)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ProgressState&gt;(name: S, config?: ProgressStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ProgressStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ProgressState; config: ProgressStateConfigs[ProgressState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ProgressState; config: ProgressStateConfigs[ProgressState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ProgressState; config: ProgressStateConfigs[ProgressState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ProgressState; config: ProgressStateConfigs[ProgressState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ProgressState; config: ProgressStateConfigs[ProgressState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.progressApi.setState&lt;S extends ProgressState&gt;(el: HTMLElement, name: S, config?: ProgressStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ProgressStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.progressApi.getState(el: HTMLElement): { name: ProgressState; config: ProgressStateConfigs[ProgressState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ProgressState; config: ProgressStateConfigs[ProgressState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.progressApi.render(state: { name: ProgressState; config: ProgressStateConfigs[ProgressState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ProgressState; config: ProgressStateConfigs[ProgressState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.progressApi.store(el: HTMLElement): Store&lt;{ name: ProgressState; config: ProgressStateConfigs[ProgressState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ProgressState; config: ProgressStateConfigs[ProgressState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.progressApi.commit&lt;S extends ProgressState&gt;(el: HTMLElement, name: S, config?: ProgressStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ProgressStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.progressStates: ProgressState[]</code> | The declared states, 'default' first: <code>default</code>, <code>indeterminate</code>, <code>complete</code>. |

### Events

| Event | Description |
|---|---|
| `progress:change` | Fires when the value changes - value, max and the fraction done (0 to 1). <code>detail</code>: <code>ProgressChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>number</code></td><td>the &lt;progress&gt; value</td></tr><tr><td><code>max</code></td><td><code>number</code></td><td>its max</td></tr><tr><td><code>percent</code></td><td><code>number</code></td><td>value / max, 0 to 1</td></tr></table> |
| `progress:completed` | Fires once when the value reaches max. No <code>detail</code>. |

### Types

| Type | Description |
|---|---|
| `ProgressChangeDetail` | What progress:change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>number</code></td><td>the &lt;progress&gt; value</td></tr><tr><td><code>max</code></td><td><code>number</code></td><td>its max</td></tr><tr><td><code>percent</code></td><td><code>number</code></td><td>value / max, 0 to 1</td></tr></table> |

## Notes

- **Steps vs glide**: the bar itself has no CSS transition - a jump is a jump.
  Smooth movement is the `duration` config / `--play`, a time-based linear
  interpolation whose readout counts every frame.
- With `prefers-reduced-motion: reduce` a glide jumps straight to its target.
- Put the readout **inside** only on a bar tall enough for text - the field
  raises the default height to 1.25rem.
- For a percentage inside a ring use `radial-progress`.
