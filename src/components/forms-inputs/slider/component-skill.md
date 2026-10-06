---
name: Slider
type: ATM
section: forms-inputs
why: Native range input with styled track and thumb - keyboard and announcement are built in.
when: Continuous numeric values or ranges - volume, price bounds.
where: dist/components/slider/slider.css + dist/components/slider/slider.js
supportedStates: default, disabled
---

# Pattern: Slider

## Native basis
`<input type="range">` - native range input with built-in keyboard, touch, and assistive technology support.

---

## Native Web APIs
- [`<input type="range">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range) - native range control with keyboard and touch support
- [`::-webkit-slider-thumb`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-slider-thumb) - custom thumb styling (WebKit/Blink)
- [`::-webkit-slider-runnable-track`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-slider-runnable-track) - custom track styling (WebKit/Blink)
- [`::-moz-range-thumb`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-moz-range-thumb) - custom thumb styling (Firefox)
- [`::-moz-range-track`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-moz-range-track) - custom track styling (Firefox)
- [`::-moz-range-progress`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-moz-range-progress) - filled portion of track (Firefox)
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - displays computed/live result value
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - hover state color derivation
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses animations for motion-sensitive users
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - Windows High Contrast Mode support
- [WAI-ARIA Slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) - canonical keyboard and ARIA reference

---

## Structure

### Default
```html
<input class="slider" type="range" min="0" max="100" value="50">
```

### With label
```html
<label class="label" for="volume">Volume</label>
<input class="slider" type="range" id="volume" min="0" max="100" value="50">
```

### With label and value display
```html
<div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;">
  <label class="label" for="temp" style="margin:0;">Temperature</label>
  <output class="text-sm text-muted-foreground" style="font-family:var(--font-mono);" for="temp">0.5</output>
</div>
<input class="slider" type="range" id="temp" min="0" max="1" step="0.1" value="0.5">
```

### With steps
```html
<input class="slider" type="range" min="0" max="100" step="25" value="50">
```

### With steps and marks
```html
<input class="slider" type="range" min="0" max="100" step="25" value="50">
<div class="slider-marks" aria-hidden="true">
  <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
</div>
```

`.slider-marks` is a CSS-only tick scale, the slider's next sibling (or a
`.slider-range`'s): one child per step, zero-width flex items spread over the
thumb-centre travel so each tick sits exactly under its step. The child's text
is the label - leave it empty for an unlabeled tick. `aria-hidden="true"`: the
input already announces its value (use `data-unit` for units). It follows the
slider's `data-size` as its next sibling; elsewhere give it the same
`data-size`. (`.slider-scale` only labels the two ends; reach for
`.slider-marks` when every step needs a tick under the thumb.)

### Vertical
```html
<input class="slider" type="range" data-orientation="vertical" min="0" max="100" value="50">
```

### Disabled
```html
<input class="slider" type="range" min="0" max="100" value="50" disabled>
```

---

### Colors
```html
<input class="slider" type="range" data-tone="success">                      <!-- success / warning / info / destructive -->
<input class="slider" type="range" style="--slider-color: oklch(0.6 0.22 300)"> <!-- any color -->
```

### Icons, emojis, value and scale
```html
<div class="slider-field">
  <span class="slider-icon" aria-hidden="true">🌙</span>
  <input class="slider" type="range" id="bright" value="40" data-unit="percent" aria-label="Brightness">
  <span class="slider-icon" aria-hidden="true">☀️</span>
  <output class="slider-value" for="bright">40%</output>
</div>
<div class="slider-scale"><span>0%</span><span>100%</span></div>
```

### Units
`data-unit` (any Intl unit: `celsius`, `percent`, `kilometer-per-hour`,
`megabyte` ...; `data-unit-display="long"` spells it out) or `data-currency`
(`EUR`, `USD` ...) formats the value - in the element's `lang` - into every
`<output for="id">` and into `aria-valuetext`, so a screen reader says
"21 °C", not "21". Fraction digits follow `step`.

### Emoji thumb
```html
<input class="slider" type="range" data-thumb-emoji="😫 😕 😐 🙂 😄">
```
One emoji, or a space-separated list picked by the value. slider.js draws
it into `--slider-thumb-image` (any image works there) and sets
`data-thumb="emoji"` (no ring, 2rem).

### Range (two thumbs)
```html
<div class="slider-range" data-currency="EUR" data-min-gap="50" role="group" aria-label="Price">
  <input class="slider" type="range" id="min" min="0" max="1000" value="200" aria-label="Minimum price">
  <input class="slider" type="range" id="max" min="0" max="1000" value="800" aria-label="Maximum price">
</div>
<output for="min max"></output>  <!-- "€200 – €800" (Intl formatRange) -->
```
- Two native range inputs on one track: only the thumbs take the pointer,
  each keeps its keyboard, label and State API.
- The low value never passes the high one; `data-min-gap` keeps a distance.
- `data-size`, `data-tone`, `data-unit` / `data-currency` on the
  `.slider-range` apply to both inputs.
- RTL: the fill (single and range) runs right to left.

## Data attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-orientation` | `vertical` | Renders as a vertical slider |
| `data-tone` | `success`, `warning`, `info`, `destructive` | Fill + thumb ring color (`--slider-color` for any color) |
| `data-unit` / `data-currency` | an Intl unit / an ISO currency | Formats `output[for]` + `aria-valuetext` |
| `data-thumb-emoji` | one emoji or a list | Emoji thumb (sets `data-thumb="emoji"`) |
| `data-min-gap` | a number | On `.slider-range`: the smallest distance between the thumbs |
| `data-size` | `xs` ... `xl` | On `.slider-marks` placed apart from its slider: keeps the ticks aligned to that size |

---

## Keyboard

All keyboard interaction is provided natively by `<input type="range">`.

| Key | Action |
|-----|--------|
| `Right Arrow` / `Up Arrow` | Increase value by one step |
| `Left Arrow` / `Down Arrow` | Decrease value by one step |
| `Home` | Set to minimum value |
| `End` | Set to maximum value |
| `Page Up` | Increase by larger step (browser-defined) |
| `Page Down` | Decrease by larger step (browser-defined) |

---

## Sizes

| `data-size` | Track height | Thumb |
|-------------|--------------|-------|
| `xs` | 0.25rem | 0.75rem |
| `sm` | 0.375rem | 1rem |
| `md` | 0.5rem | 1.25rem |
| *(none)* | 0.5rem | 1.25rem |
| `lg` | 0.625rem | 1.5rem |
| `xl` | 0.75rem | 1.75rem |

Track thickness and thumb diameter scale together (the WebKit thumb margin re-centers per step); `md` equals the unsized default.

---
## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `role="slider"` | `<input>` | Implicit from `type="range"` - do not add manually |
| `aria-valuenow` | `<input>` | Implicit from `value` attribute |
| `aria-valuemin` | `<input>` | Implicit from `min` attribute |
| `aria-valuemax` | `<input>` | Implicit from `max` attribute |
| `aria-valuetext` | `<input>` | Custom human-readable value (e.g., "50%", "Medium") |
| `aria-orientation` | `<input>` | Set to `vertical` for vertical sliders |
| `aria-label` | `<input>` | Accessible name when no visible `<label>` exists |
| `for` | `<label>` | Associates label with the slider input |
| `for` | `<output>` | Associates output display with the slider input |

---

## States

Declared states: `default` (enabled; `{ value }` config presets the position)
· `disabled` (native `disabled` attribute - greyed and inert).

```js
document.querySelector('#volume').api.setState('disabled');
document.querySelector('#volume').api.getState(); // { name: 'disabled', config: { value: '75' } }
```

The api is bound per input; the registry global is
`df$.shadcn.sliderApi` / `df$.shadcn.sliderStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type SliderState = 'default' | 'disabled'</code> - `setState(name, config)` takes the config of the state it names (`SliderStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Enabled. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number \| string</code></td><td>the value to set (the range input's value); getState() reports it</td></tr></table> |
| `disabled` | Disabled - not draggable, dimmed. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number \| string</code></td><td>the value to set; getState() reports it</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends SliderState&gt;(name: S, config?: SliderStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>SliderStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: SliderState; config: SliderStateConfigs[SliderState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: SliderState; config: SliderStateConfigs[SliderState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: SliderState; config: SliderStateConfigs[SliderState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: SliderState; config: SliderStateConfigs[SliderState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: SliderState; config: SliderStateConfigs[SliderState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.sliderApi.setState&lt;S extends SliderState&gt;(el: HTMLElement, name: S, config?: SliderStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>SliderStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.sliderApi.getState(el: HTMLElement): { name: SliderState; config: SliderStateConfigs[SliderState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: SliderState; config: SliderStateConfigs[SliderState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.sliderApi.render(state: { name: SliderState; config: SliderStateConfigs[SliderState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: SliderState; config: SliderStateConfigs[SliderState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.sliderApi.store(el: HTMLElement): Store&lt;{ name: SliderState; config: SliderStateConfigs[SliderState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: SliderState; config: SliderStateConfigs[SliderState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.sliderApi.commit&lt;S extends SliderState&gt;(el: HTMLElement, name: S, config?: SliderStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>SliderStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.sliderStates: SliderState[]</code> | The declared states, 'default' first: <code>default</code>, <code>disabled</code>. |

## Notes

- **Filled track**: Firefox uses `::-moz-range-progress` natively. WebKit/Blink requires a `linear-gradient` on the track with a `--slider-value` custom property set by JS.
- **JS initialization**: `slider.js` sets `--slider-value` on each `.slider` element and updates it on `input` events. This powers the filled track gradient in WebKit.
- **Vertical**: Uses `writing-mode: vertical-lr; direction: rtl` to render vertically across all browsers. Add `data-orientation="vertical"` to activate.
- **Value display**: Use `<output for="slider-id">` to show the current value. Wire the update in your own script or inline `oninput`.
- **`accent-color`**: Set as a CSS fallback for browsers that don't fully support custom styling pseudo-elements.
- **Step attribute**: Use `step` to control increment granularity. Omit for continuous (default step is 1).
- **Form integration**: Native `<input type="range">` submits its value with forms automatically when given a `name` attribute.
