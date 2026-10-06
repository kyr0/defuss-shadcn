---
name: Checkbox
type: ATM
section: forms-inputs
why: Native input[type=checkbox] including the indeterminate state - themed with accent-color, no custom widget.
when: Independent on/off selections in a form, one or many at once.
where: dist/components/checkbox/checkbox.css
supportedStates: default
---

# Pattern: Checkbox

## Native basis
`<input type="checkbox">` element styled with CSS `appearance: none`.

---

## Native Web APIs
- [`<input type="checkbox">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox) - native toggle control with built-in keyboard and form support
- [`:checked`](https://developer.mozilla.org/en-US/docs/Web/CSS/:checked) - matches checked state
- [`:indeterminate`](https://developer.mozilla.org/en-US/docs/Web/CSS/:indeterminate) - matches the indeterminate (mixed) state
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus ring
- [`:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid) - post-interaction validation styling
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses transitions
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - thicker borders for high-contrast preference
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - reverts to native checkbox in Windows High Contrast Mode

---

## Structure

### Basic
```html
<div class="flex items-center gap-2">
  <input class="checkbox" type="checkbox" id="terms">
  <label class="label" for="terms" style="margin:0;">Accept terms and conditions</label>
</div>
```

### With description
```html
<div style="display:flex;align-items:flex-start;gap:0.5rem;">
  <input class="checkbox" type="checkbox" id="notify" style="margin-top:0.125rem;" aria-describedby="notify-desc">
  <div>
    <label class="label" for="notify" style="margin:0;">Enable notifications</label>
    <p class="field-description" id="notify-desc">You can enable or disable notifications at any time.</p>
  </div>
</div>
```

### Checked by default
```html
<input class="checkbox" type="checkbox" id="checked" checked>
```

### Disabled
```html
<input class="checkbox" type="checkbox" disabled>
<input class="checkbox" type="checkbox" disabled checked>
```

### Invalid
```html
<input class="checkbox" type="checkbox" aria-invalid="true" required>
```

### Checkbox group
```html
<fieldset>
  <legend>Select items to display</legend>
  <div class="flex items-center gap-2">
    <input class="checkbox" type="checkbox" id="item-1" checked>
    <label for="item-1">Item 1</label>
  </div>
  <div class="flex items-center gap-2">
    <input class="checkbox" type="checkbox" id="item-2">
    <label for="item-2">Item 2</label>
  </div>
</fieldset>
```

### Select all (parent box + group) - what the mixed state is for
A parent box above a group summarises it: **some** children ticked → mixed
(`indeterminate = true`, the dash), **all** → checked, **none** → empty.
Clicking the parent while mixed or empty ticks every child; while checked it
clears them (the browser drops the mixed flag on click and flips `checked`,
so the page only copies `parent.checked` to the children). The parent names
its children with `aria-controls` (WAI-ARIA APG mixed-checkbox pattern);
indent the children by the box width + gap (`1.625rem`) so they line up
under the parent's label. The wiring is a few lines of page script: on every
child `change`, recount and set `parent.checked` / `parent.indeterminate`;
on the parent's `change`, set every child to `parent.checked`. Run the
recount once on load so authored `checked` children show the right parent.
```html
<fieldset class="flex flex-col gap-2">
  <legend>Items to display</legend>
  <div class="checkbox-item">
    <input class="checkbox" type="checkbox" id="all" aria-controls="item-a item-b item-c">
    <label for="all">Show all items</label>
  </div>
  <div style="display:flex;flex-direction:column;gap:0.5rem;padding-inline-start:1.625rem;">
    <div class="checkbox-item">
      <input class="checkbox" type="checkbox" id="item-a" checked>
      <label for="item-a">Item A</label>
    </div>
    <div class="checkbox-item">
      <input class="checkbox" type="checkbox" id="item-b">
      <label for="item-b">Item B</label>
    </div>
    <div class="checkbox-item">
      <input class="checkbox" type="checkbox" id="item-c">
      <label for="item-c">Item C</label>
    </div>
  </div>
</fieldset>
```

---

## Keyboard

| Key     | Action                         |
| ------- | ------------------------------ |
| `Space` | Toggles checked / unchecked    |
| `Tab`   | Moves focus to the next control |

All keyboard behavior is provided natively by `<input type="checkbox">`.

---

## Accessibility

- The native `<input type="checkbox">` provides all keyboard and screen reader support.
- Use `<label>` with `for` to associate the label text.
- Use `<fieldset>` + `<legend>` for checkbox groups.
- Use `aria-invalid="true"` for validation errors.
- Point `aria-describedby` from the control to the `.field-description`'s `id` - visual proximity alone never reaches a screen reader.
- Use `indeterminate` property via JS for the indeterminate (mixed) state - screen readers announce it as "mixed" / "partially checked". A mixed parent box names its children with `aria-controls` (see "Select all").

---

## Notes

- **Gap hit area**: inside `.checkbox-item` / `.checkbox-item-block` the box's click target spans the gap to its label (a transparent `::before`), so clicking the whitespace between box and text toggles too. Keep the label after the control and link it with `for`.
- Styled with `appearance: none` and a custom checkmark via `::after` pseudo-element.
- The checkmark uses a CSS-only approach - no SVG or icon font needed.
- Indeterminate state is set via JavaScript: `checkbox.indeterminate = true;`.
- In `forced-colors: active`, the checkbox reverts to `appearance: auto` so Windows High Contrast Mode controls rendering.
