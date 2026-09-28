---
name: Color Picker
type: ATM
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

## Notes

- The native color picker renders a full-featured dialog - no JS needed.
- The wrapper adds a styled border and displays the current value in the chosen notation.
- The color swatch is provided by the browser's native `<input type="color">`.
