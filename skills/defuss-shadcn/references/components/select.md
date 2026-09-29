---
name: Select
type: ATM
why: Native <select> - the OS renders the options list, fully accessible on every platform.
when: Pick one value from a list; prefer it over custom listboxes and comboboxes. Several values from a short fixed list: select[multiple]; tags / people / long lists: combobox data-multiple; a handful of options: checkboxes.
where: dist/components/select/select.css
supportedStates: default
---

# Pattern: Select

## Native basis
`<select>` element with custom styling via `appearance: none`.

---

## Native Web APIs
- [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select) - native dropdown with keyboard navigation and form integration
- [`<optgroup>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/optgroup) - groups options with a label

---

## Structure

### Basic
The empty-value placeholder stays selectable (no `disabled`) so it doubles as
the clear/reset entry - re-choosing it empties the box again.
```html
<label class="label" for="fruit">Fruit</label>
<select class="select" id="fruit">
  <option value="" selected>Select a fruit</option>
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
  <option value="cherry">Cherry</option>
</select>
```

### With groups
```html
<select class="select" id="timezone">
  <optgroup label="Americas">
    <option>New York</option>
    <option>Los Angeles</option>
  </optgroup>
  <optgroup label="Europe">
    <option>London</option>
    <option>Paris</option>
  </optgroup>
</select>
```

---

### Multiple
```html
<label class="label" for="ship-to">Ship to</label>
<select class="select" id="ship-to" name="ship-to" multiple size="6" aria-describedby="ship-to-hint">
  <option value="at" selected>Austria</option>
  <option value="de" selected>Germany</option>
  <option value="fr">France</option>
</select>
<p id="ship-to-hint">Hold Ctrl (⌘ on Mac) to pick several.</p>
```

`multiple` turns the native select into a **list box** (all `size` rows visible - no dropdown, no chevron, auto height; chosen rows are tinted). Ctrl/⌘-click toggles an option, Shift-click / Shift+arrows pick a run, and the form submits every chosen value under the same name. The gesture is not discoverable - add a hint.

**Several choices? Pick the control by the list:**

| List | Use |
| --- | --- |
| A handful of options (2-7), all worth seeing | a group of checkboxes |
| A short fixed list, mostly desktop | `<select multiple>` (zero JavaScript) |
| Tags, people, countries - long or searchable | combobox `data-multiple` (filter, checkboxes, removable tags, hidden inputs) |

### Unavailable options
```html
<select class="select" id="size" name="size">
  <option value="" selected>Select a size</option>
  <option value="m">M</option>
  <option value="l" disabled>L - out of stock</option>
  <optgroup label="Legacy plans" disabled>…</optgroup>
</select>
```

- `disabled` on an `<option>` greys out ONE choice while the rest of the list stays usable (out of stock, not eligible) - it can't be chosen by pointer or keyboard. Put the reason in the option text so the state isn't grey-only.
- `<optgroup disabled>` switches off a whole group; `disabled` on the `<select>` switches off the entire control (and removes it from the tab order).
- Not for the placeholder: the empty `<option value="">` stays enabled so it can clear a choice (see Basic).
- In a `select[multiple]` list box, disabled options render in the muted colour; in a dropdown the OS menu greys them.

## Accessibility

- Native `<select>` provides full keyboard navigation (arrow keys, type-ahead).
- Use `<label>` with `for` for description.
- The placeholder is `<option value="" selected>` **without** `disabled`: a
  disabled placeholder can't be re-selected, so a made selection could never be
  cleared. Keep it selectable and add `required` to the `<select>` when an empty
  value must not submit - native validation then blocks submission while the
  placeholder is still the selection.

---

## Sizes

Set `data-size` on the `.select` trigger button.

| Size | Height | Use |
| --- | --- | --- |
| `xs` | 1.75rem | Dense toolbars |
| `sm` | 2rem | Dense toolbars |
| `md` *(default)* | 2.25rem | Standard forms |
| `lg` | 2.75rem | Prominent landing/form fields |
| `xl` | 3.25rem | Touch targets, kiosk UI |

```html
<button class="select" data-size="sm" aria-haspopup="listbox" aria-expanded="false">…</button>
```

## Notes

- Uses `appearance: none` with a custom chevron via `background-image` SVG.
- While the empty option is selected, the closed control renders in
  `--muted-foreground` (`:has(> option[value=""]:checked)`) so it reads as a
  placeholder; a real value restores `--foreground`.
- The dropdown list is rendered by the browser - it cannot be styled.
- For a fully custom dropdown, use the Combobox component instead.
