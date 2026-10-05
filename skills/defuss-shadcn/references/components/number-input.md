---
name: Number Input
type: ATM
why: Input plus stepper buttons bound to native min/max/step and arrow-key behavior.
when: Numeric values where nudging, a bounded range, a unit or fixed decimals matter - quantity, temperature (19.0 °C), percent, weight, duration - and money with a locale-aware currency mask (data-currency + data-locale: separators, symbol side, minor unit via Intl). For a free-form range pick use slider.
where: dist/components/number-input/number-input.css + dist/components/number-input/number-input.js
supportedStates: default
---

# Pattern: Number Input

## Native basis
`<input type="number">` with custom increment/decrement buttons.

---

## Native Web APIs
- [`<input type="number">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/number) - native number input with built-in validation and step increment

---

## Structure

```html
<label class="label" for="quantity">Quantity</label>
<div class="number-input">
  <button data-action="decrement" aria-label="Decrease">−</button>
  <input type="number" id="quantity" min="0" max="100" step="1" value="1">
  <button data-action="increment" aria-label="Increase">+</button>
</div>
```

### Unit and fixed decimals

```html
<label class="label" for="temp">Temperature</label>
<div class="number-input" data-decimals="1">
  <button data-action="decrement" aria-label="Decrease">−</button>
  <input type="number" id="temp" min="-40" max="60" step="0.5" value="19">
  <label class="number-input-unit" for="temp">°C</label>
  <button data-action="increment" aria-label="Increase">+</button>
</div>
```

- **Unit:** any text - symbols, words, even an emoji (`☕ cups`) - as `<label class="number-input-unit" for="{input id}">` **after** the input (°C, %, kg, h) or **before** it (€, $). Being a second `<label>` of the input, it focuses the field on click and joins the accessible name ("Temperature °C") - no ARIA needed. It is ordinary text: it is selected and copied along with the number ("72,5 kg"). The value aligns toward the unit so both read as one.
- **Fixed decimals:** `data-decimals="N"` on the `.number-input` wrapper shows exactly N fraction digits: `19` → `19.0`, a step from 19.5 → `20.0` (native `stepUp()` alone prints `20`). Re-applied on init, after each step, on commit (blur/Enter - never while typing) and on `setState` presets. The input value stays a plain number string for form submission.

### Currency (locale-aware mask)

```html
<label class="label" for="price">Price</label>
<div class="number-input" data-currency="EUR" data-locale="de-DE">
  <input type="text" id="price" value="1234.5">          <!-- authored as a machine number -->
  <input type="hidden" name="price" data-number-output>   <!-- optional: submits 1234.5 -->
</div>
<!-- renders "1.234,50 €" (de-DE) · "$1,234.50" (en-US, USD) · "￥1,235" (ja-JP, JPY) -->
```

- `data-currency` (ISO 4217) turns the field into a masked money input driven by `Intl.NumberFormat` - use `<input type="text">` (a native number input cannot show grouping, a decimal comma or a symbol). The **locale** decides decimal and group separators, grouping style (Indian lakh: 12,34,567.80), the symbol, its side and the minor unit (EUR 2 digits, JPY 0). Locale: `data-locale`, else the nearest `[lang]`, else the browser's. `data-currency-display`: `symbol` (default) · `narrowSymbol` · `code` · `name`.
- The symbol is rendered into a `.number-input-unit` label on the locale's side (created if missing) - don't hard-code it.
- **Typing is masked live:** letters are dropped, groups appear as you type, the caret stays after the digit it followed, extra fraction digits are cut. The locale's decimal separator starts the fraction; the other of `,` / `.` does too when it is the last thing typed (a numpad `.` in de-DE). Blur pads the minor unit (`12,5` → `12,50`). Negative amounts are not supported.
- **Values:** the field shows locale text; `input[data-number-output]` inside the wrapper and `data-value` on the wrapper carry the normalised machine value (`1234.5`). `api.setState('default', { value: 1234.5 })` takes a machine number; `getState().config` reports `value` (shown), `number`, `currency`, `locale`.
- **Steppers / keys:** stepper buttons and ArrowUp/Down nudge by `data-step` (default 1), clamped to `data-min` / `data-max` - on the text input.
- **Runtime switch:** changing `data-locale` / `data-currency` / `data-currency-display` re-renders the same amount; a trip through a currency without minor unit rounds only the display, never the remembered amount.
- `inputmode` is set for you (`decimal`, or `numeric` for zero-decimal currencies).

For a simple fixed-symbol field without locale formatting, a `type="number"` input with a `.number-input-unit` label and `data-decimals="2"` still works (the browser shows the decimal separator of the page's language).

---

## Sizes

| `data-size` | Box height | Button width | Font |
|-------------|------------|--------------|------|
| `xs` | 1.75rem | 1.5rem | 0.75rem |
| `sm` | 2rem | 1.75rem | 0.8125rem |
| `md` *(default)* | 2.25rem | 2rem | 0.875rem |
| `lg` | 2.75rem | 2.25rem | 1rem |
| `xl` | 3.25rem | 2.5rem | 1.125rem |

The ladder matches `.input` / `.btn` (md = 2.25rem).

---
## States

The component's observable state is the number itself. Declared states:
`default` (enabled; `{ value }` presets it through the native input, events
fire). `getState().config.value` reports the live value. A currency field
reports the display text as `value` and the machine number as `number` -
`setState('default', { number: 1234.5 })` (or `{ value: 1234.5 }`) sets it, so
`setState('default', getState().config)` changes nothing. `render()` returns
the authored markup (the value is a property, not markup).

```js
document.querySelector('#qty').api.setState('default', { value: 5 });
document.querySelector('#qty').api.getState(); // { name: 'default', config: { value: '5' } }
```

The api is bound per wrapper; the registry global is
`df$.shadcn.numberInputApi` / `df$.shadcn.numberInputStates` (camelCase).

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.numberInputApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.numberInputStates` = `default`.

## Notes

- Every field is 4rem wide by default (it grows with `w-full` or a grid cell) - independent of `max` (Chrome would otherwise size a number input by the digit count of `max`).
- Native spinner buttons are hidden with `::-webkit-inner-spin-button`.
- Use `min`, `max`, and `step` for range constraints.
- Keyboard: arrow keys increment/decrement by step value.
