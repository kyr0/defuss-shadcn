---
name: Color Picker
type: ATM
section: forms-inputs
why: Native <input type=color> plus a swatch popover - the browser owns the picking itself; the value shows (and submits) in the notation you need - hex, rgb, hsl or oklch.
when: A form field where the user chooses a color; use the bare native input when a popover is overkill.
where: dist/components/color-picker/color-picker.css + dist/components/color-picker/color-picker.js
supportedStates: default
---

# Pattern: Color Picker

## Native basis
`<input type="color">` element with label.

---

## Native Web APIs
- [`<input type="color">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/color) - native color picker dialog

---

## Structure

```html
<label class="label" for="bg-color">Background Color</label>
<div class="color-picker">
  <input type="color" id="bg-color" value="#6366f1">
  <span class="color-picker-value">#6366f1</span>
</div>
```

### Notation

```html
<div class="color-picker" data-format="oklch">
  <input type="color" id="brand" value="#0f766e">
  <span class="color-picker-value"></span>
  <input type="hidden" name="brand" data-color-output>        <!-- optional: submits the formatted value -->
  <select class="color-picker-format" aria-label="Colour notation">  <!-- optional: user switch -->
    <option value="hex">HEX</option><option value="rgb">RGB</option>
    <option value="hsl">HSL</option><option value="oklch">OKLCH</option>
  </select>
</div>
```

| `data-format` | Shows (for #6366f1) |
| --- | --- |
| `hex` *(default)* | `#6366f1` |
| `rgb` | `rgb(99 102 241)` |
| `hsl` | `hsl(238.7 83.5% 66.7%)` |
| `oklch` | `oklch(0.5854 0.2041 277.12)` - the notation of this system's theme tokens |

- CSS Color 4 syntax (space-separated), valid in any stylesheet. Precision is chosen so the text round-trips: pasted back into CSS it gives the picked colour (hex/rgb/hsl exactly, oklch within one 8-bit step); trailing zeros are trimmed (`hsl(0 100% 50%)`). Achromatic colours report `oklch(L 0 0)`.
- The native input always keeps `#rrggbb` (browser contract) - give it a `name` if the form needs hex too. `input[data-color-output]` inside the picker receives the formatted value (`change` fires).
- `select.color-picker-format` lets the user switch notations; changing `data-format` at runtime re-renders as well.
- The value text is `user-select: all` - one click selects it for copying.

---

## Sizes

| `data-size` | Box height | Swatch | Value font |
|-------------|------------|--------|------------|
| `xs` | 1.75rem | 1.25rem | 0.6875rem |
| `sm` | 2rem | 1.5rem | 0.75rem |
| `md` *(default)* | 2.25rem | 1.75rem | 0.8125rem |
| `lg` | 2.75rem | 2rem | 0.875rem |
| `xl` | 3.25rem | 2.5rem | 1rem |

Box heights land on the shared input ladder (`md` = 2.25rem, the typical md of `.input` / `.btn`); swatch + padding re-derive each step.

---
## States

The picker's observable state is the chosen color. Declared states:
`default` (`{ value }` presets the hex through the native input, events
fire; `{ format }` switches the notation). `getState().config` reports the
live `value` (hex), `format` and `formatted` (the value in that notation).

```js
document.querySelector('#theme-color').api.setState('default', { value: '#ff0000' });
document.querySelector('#theme-color').api.getState(); // { name: 'default', config: { value: '#ff0000' } }
```

The api is bound per wrapper; the registry global is
`df$.shadcn.colorPickerApi` / `df$.shadcn.colorPickerStates` (camelCase).

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ColorPickerState = 'default'</code> - `setState(name, config)` takes the config of the state it names (`ColorPickerStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The picker with its colour. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>string</code></td><td>the colour, #rrggbb (the native input's value)</td></tr><tr><td><code>format?</code></td><td><code>'hex' \| 'rgb' \| 'hsl' \| 'oklch'</code></td><td>the notation the field shows</td></tr><tr><td><code>formatted?</code></td><td><code>string</code></td><td>reported by getState(): the colour written in that notation</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ColorPickerState&gt;(name: S, config?: ColorPickerStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ColorPickerStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ColorPickerState; config: ColorPickerStateConfigs[ColorPickerState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ColorPickerState; config: ColorPickerStateConfigs[ColorPickerState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ColorPickerState; config: ColorPickerStateConfigs[ColorPickerState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ColorPickerState; config: ColorPickerStateConfigs[ColorPickerState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ColorPickerState; config: ColorPickerStateConfigs[ColorPickerState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.colorPickerApi.setState&lt;S extends ColorPickerState&gt;(el: HTMLElement, name: S, config?: ColorPickerStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ColorPickerStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.colorPickerApi.getState(el: HTMLElement): { name: ColorPickerState; config: ColorPickerStateConfigs[ColorPickerState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ColorPickerState; config: ColorPickerStateConfigs[ColorPickerState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.colorPickerApi.render(state: { name: ColorPickerState; config: ColorPickerStateConfigs[ColorPickerState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ColorPickerState; config: ColorPickerStateConfigs[ColorPickerState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.colorPickerApi.store(el: HTMLElement): Store&lt;{ name: ColorPickerState; config: ColorPickerStateConfigs[ColorPickerState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ColorPickerState; config: ColorPickerStateConfigs[ColorPickerState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.colorPickerApi.commit&lt;S extends ColorPickerState&gt;(el: HTMLElement, name: S, config?: ColorPickerStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ColorPickerStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.colorPickerStates: ColorPickerState[]</code> | The declared states, 'default' first: <code>default</code>. |

## Notes

- The native color picker renders a full-featured dialog - no JS needed.
- The wrapper adds a styled border and displays the current value in the chosen notation.
- The color swatch is provided by the browser's native `<input type="color">`.
