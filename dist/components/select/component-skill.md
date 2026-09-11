---
name: Select
type: ATM
why: Native <select> — the OS renders the options list, fully accessible on every platform.
when: Pick one value from a list; prefer it over custom listboxes and comboboxes.
where: dist/components/select/select.css
supportedStates: default
---

# Pattern: Select

## Native basis
`<select>` element with custom styling via `appearance: none`.

---

## Native Web APIs
- [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select) — native dropdown with keyboard navigation and form integration
- [`<optgroup>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/optgroup) — groups options with a label

---

## Structure

### Basic
The empty-value placeholder stays selectable (no `disabled`) so it doubles as
the clear/reset entry — re-choosing it empties the box again.
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

## Accessibility

- Native `<select>` provides full keyboard navigation (arrow keys, type-ahead).
- Use `<label>` with `for` for description.
- The placeholder is `<option value="" selected>` **without** `disabled`: a
  disabled placeholder can't be re-selected, so a made selection could never be
  cleared. Keep it selectable and add `required` to the `<select>` when an empty
  value must not submit — native validation then blocks submission while the
  placeholder is still the selection.

---

## Sizes

Set `data-size` on the `.select` trigger button.

| Size | Height | Use |
| --- | --- | --- |
| `xs` | 1.75rem | Dense toolbars |
| `sm` | 2rem | Dense toolbars |
| `md` | 2.25rem | Compact forms |
| (default) | 2.5rem | Standard forms |
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
- The dropdown list is rendered by the browser — it cannot be styled.
- For a fully custom dropdown, use the Combobox component instead.
