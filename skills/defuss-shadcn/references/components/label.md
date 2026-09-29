---
name: Label
type: ATM
why: Native <label for> association - click-to-focus and announcement are free.
when: Every form control, always - never a placeholder standing in for a label.
where: dist/components/label/label.css
supportedStates: default
---

# Pattern: Label

## Native basis
`<label>` element. Browser provides built-in click-to-focus association with form controls.
The association is the `for`↔`id` pairing: the label's `for` and the control's `id`
must be the exact same string - click-to-focus and the accessible name both exist
only because of it.

---

## Native Web APIs
- [`<label>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label) - associates text with a form control via `for`/`id`
- [`:has()` selector](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - auto-detects disabled state from adjacent control
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - increases disabled-label opacity for high-contrast preference
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - Windows High Contrast Mode support with `GrayText` for disabled labels

---

## Structure

### Basic
```html
<!-- for and id are one value in two places - keep them identical -->
<label class="label" for="email">Email</label>
<input class="input" id="email" type="email">
```

### With required indicator
The red star renders automatically whenever the adjacent control is `required`
(`:has()` in the component CSS) - no span markup needed:
```html
<label class="label" for="name">Name</label>
<input class="input" id="name" type="text" required>
```

### With optional indicator
```html
<label class="label" for="bio">
  Bio <span class="label-hint">(optional)</span>
</label>
<textarea class="input" id="bio"></textarea>
```

### Disabled (explicit)
```html
<label class="label" data-disabled for="disabled-field">Disabled field</label>
<input class="input" id="disabled-field" disabled>
```

### Disabled (auto-detected)
The label auto-dims when the adjacent control is disabled - no `data-disabled` needed:
```html
<label class="label" for="auto-disabled">Auto-disabled</label>
<input class="input" id="auto-disabled" disabled>
```

### With checkbox (inline)
```html
<div class="flex items-center gap-2">
  <input class="checkbox" type="checkbox" id="terms">
  <label class="label" for="terms" style="margin:0;">Accept terms and conditions</label>
</div>
```

### With switch (inline)
```html
<div class="flex items-center gap-2">
  <input class="switch" type="checkbox" role="switch" id="airplane">
  <label class="label" for="airplane" style="margin:0;">Airplane Mode</label>
</div>
```

### Form field (label + input + description)
```html
<div>
  <label class="label" for="username">Username</label>
  <input class="input" id="username" type="text" placeholder="shadcn" aria-describedby="username-desc">
  <p class="field-description" id="username-desc">This is your public display name.</p>
</div>
```

---

## Accessibility

| Attribute | When | Value |
|-----------|------|-------|
| `for` | Always | Matches the `id` of the associated form control |

- **One value, written twice:** the label's `for` and the control's `id` must be the exact same string. A mismatch fails silently - the label renders and styles normally but no longer focuses the field or names it for assistive technology. When renaming a control's `id`, update every `for` that pointed at it.
- Clicking the label focuses the associated input - native `<label>` behavior, and the practical proof the pairing is intact.
- The required star is rendered by CSS (`:has(+ input[required])::after`) and is decorative - the native `required` attribute already conveys the requirement to assistive technology, so nothing is announced twice.
- Do not use `<label>` without a `for` attribute or a nested input.
- A `.field-description` next to the field is only visible proximity - add `aria-describedby` on the control pointing to the description's `id` so assistive tech announces it with the field.
- In `forced-colors` mode, label text maps to system `LinkText` color.

---

## Notes

- The `.label` class is intentionally minimal - it styles the label text with appropriate font size, weight, and color.
- Labels auto-detect disabled state from adjacent controls via `:has(+ :disabled)` - the explicit `data-disabled` attribute is also supported.
- For inline use with checkboxes, switches, or radios, add `style="margin:0;"` to remove the default bottom margin.
- Labels compose with Input, Textarea, Select, Checkbox, Radio, Switch, and all other form controls.
