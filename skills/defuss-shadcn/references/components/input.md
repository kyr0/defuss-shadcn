---
name: Input
type: ATM
why: Native text inputs - validation via :user-invalid, autofill and keyboards via inputmode/autocomplete.
when: Short single-line text; multi-line text takes textarea instead.
where: dist/components/input/input.css
supportedStates: default
---

# Pattern: Input

## Native basis
`<input>` element. Browser provides built-in validation, autofill, and accessibility.
Also covers `<textarea>` with auto-grow via `field-sizing: content`.

---

## Native Web APIs
- [`<input>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input) - native form control with built-in validation and autofill
- [`<textarea>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea) - multi-line text input
- [`field-sizing: content`](https://developer.mozilla.org/en-US/docs/Web/CSS/field-sizing) - auto-growing textarea without JavaScript
- [`:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid) - native validation styling after user interaction
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus ring styling
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses focus/hover transitions
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - thicker borders for high-contrast preference
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - Windows High Contrast Mode with system colors

---

## Structure

### Basic
```html
<label class="label" for="email">Email</label>
<input class="input" type="email" id="email" placeholder="you@example.com">
```

### With description
```html
<div>
  <label class="label" for="username">Username</label>
  <input class="input" type="text" id="username" placeholder="kyr0" aria-describedby="username-desc">
  <p class="field-description" id="username-desc">Choose a unique username for your account.</p>
</div>
```

### Required
```html
<label class="label" for="name">
  Name <span aria-hidden="true" class="text-destructive">*</span>
</label>
<input class="input" type="text" id="name" required placeholder="Jane Doe">
```

### Invalid
```html
<label class="label" for="bad-email">Email</label>
<input class="input" type="email" id="bad-email" aria-invalid="true" aria-describedby="bad-email-err" value="not-an-email">
<p class="field-error" id="bad-email-err">Please enter a valid email address.</p>
```

### Input group (icons, text and buttons inside the field)
Wrap the `.input` in `.input-group`. The group draws the field frame (border,
radius, focus ring, invalid / readonly / disabled surfaces) and the input
inside goes frameless. **DOM order is the placement**: an addon before the
`.input` sits at the start, one after it at the end - start and end combine
freely, and any addon width works with no padding to tune.

| Addon | Element | Use |
| --- | --- | --- |
| `.input-group-icon` | `<svg aria-hidden="true">` / `<i data-lucide>` | Decorative icon (search, mail) |
| `.input-group-text` | `<span>` | Static text: protocol, domain, unit - not part of the submitted value |
| `.input-group-button` | `<button type="button" aria-label="…">` | An in-field action: copy, show/hide password, clear, open a picker |

Sizes go on the group (`data-size="xs|sm|md|lg|xl"`, same ladder as `.input`).

```html
<!-- leading icon -->
<div class="input-group">
  <svg class="input-group-icon" aria-hidden="true" viewBox="0 0 24 24">…</svg>
  <input class="input" type="search" placeholder="Search..." aria-label="Search">
</div>

<!-- trailing action: copy a readonly value -->
<div class="input-group">
  <input class="input" type="text" id="api-key" readonly value="sk-1234567890abcdef">
  <button type="button" class="input-group-button" aria-label="Copy API key">
    <svg aria-hidden="true" viewBox="0 0 24 24">…</svg>
  </button>
</div>

<!-- show / hide password: the button flips type and aria-pressed -->
<div class="input-group">
  <input class="input" type="password" id="password" autocomplete="current-password">
  <button type="button" class="input-group-button" aria-label="Show password" aria-pressed="false">
    <svg aria-hidden="true" viewBox="0 0 24 24">…</svg>
  </button>
</div>

<!-- text addons -->
<div class="input-group">
  <span class="input-group-text">https://</span>
  <input class="input" type="text" aria-label="Subdomain">
  <span class="input-group-text">.example.com</span>
</div>
```

The behaviour of a button (copying with `navigator.clipboard.writeText`,
flipping `type` + `aria-pressed`, clearing the value and returning focus) is a
few lines of page script - the component ships the layout and states only.

### File
```html
<label class="label" for="avatar">Picture</label>
<input class="input" type="file" id="avatar">
```

### Password
```html
<label class="label" for="password">Password</label>
<input class="input" type="password" id="password" placeholder="Enter your password">
```

### Readonly
```html
<label class="label" for="api-key">API Key</label>
<input class="input" type="text" id="api-key" readonly value="sk-1234567890abcdef">
```

### With button
```html
<div style="display:flex;gap:0.5rem;">
  <input class="input" type="search" placeholder="Search...">
  <button class="btn" data-variant="default">Search</button>
</div>
```

### Textarea (auto-grow)
```html
<label class="label" for="message">Message</label>
<textarea class="input" id="message" placeholder="Your message..."></textarea>
```

---

## Sizes

| `data-size` | Height    | Padding       | Font size    |
|-------------|-----------|---------------|--------------|
| `xs`        | `1.75rem` | `0 0.5rem`    | `0.75rem`    |
| `sm`        | `2rem`    | `0 0.625rem`  | `0.8125rem`  |
| `md` *(default)* | `2.25rem` | `0 0.75rem`   | `0.875rem`   |
| `lg`        | `2.75rem` | `0 1rem`      | `1rem`       |
| `xl`        | `3.25rem` | `0 1.25rem`   | `1.125rem`   |

---

## States

| State | How to apply | Visual |
|-------|-------------|--------|
| Default | - | Border `--input`, shadow-xs |
| Focus | Native `:focus` | Ring `--ring` with glow |
| Disabled | `disabled` attribute | Muted surface + muted text inside the full-strength border (no opacity fade), not-allowed cursor |
| Readonly | `readonly` attribute | Muted background, 70% opacity, no focus ring change |
| Invalid | `aria-invalid="true"` | Border `--destructive`, red ring on focus |
| Required | `required` attribute | Works with native validation |

---

## ARIA

| Attribute | When | Value |
|-----------|------|-------|
| `id` + `for` | Always | Links label to input |
| `aria-invalid="true"` | Validation error | Marks input as invalid |
| `aria-describedby` | Has description or error | Points to description/error element |
| `required` | Required field | Native browser validation |
| `type` | Always | Use semantic types: `email`, `tel`, `url`, `search`, `password`, `number` |

---

## Validation timing

When does a field turn red? Three sources, from loudest to quietest:

| Source | Shows | Use |
| --- | --- | --- |
| `aria-invalid="true"` | Always, immediately | The page's own verdict: custom rules, server errors |
| `:user-invalid` (browser checks: `required`, `type="email"`, `pattern`, `min`/`max`...) inside a `<form>` | Once the user leaves a changed field | Default native feedback |
| same, inside `<form data-validate="submit">` | Only after the page stamps `data-submitted` on the form (a submit attempt) | "Check when they're finished" - leaving a half-typed field is not an error |

- **A text field outside any `<form>` is never judged automatically** (`.input`, `textarea.input`, `.textarea`, `.input-group`): there is nothing to submit, so a half-typed value is not an error. Use `aria-invalid` if such a field must show one.
- `data-validate="submit"` needs two listeners on the form: a *capturing* `invalid` listener (the browser blocked the submit) and a `submit` listener (it passed), each setting `data-submitted`; clear it on `reset`.
- **Custom validation** (your rule, your message, your moment): `<form data-validate="submit" novalidate>`; on `submit`, `preventDefault()`, stamp `data-submitted`, run each rule, and for a failing field set `setCustomValidity(message)`, `aria-invalid="true"` and the text of its `.field-error` (linked with `aria-describedby`), then focus the first failure. After that first attempt, re-check a field on `input` so an error clears the moment it is fixed. Rules the browser can't know - a taken username, two fields that must agree, a code in a set shape - live here.
- Date, select and checkbox fields keep the native timing outside forms (their value is complete or empty - never half-typed) and follow `data-validate="submit"` inside one.

## Notes

- Always pair inputs with `<label>` using matching `for`/`id`
- Use `type="file"` for file inputs - styled via the `.input` class
- Textarea auto-grows via `field-sizing: content` - zero JavaScript
- Use `readonly` for non-editable values the user can still select/copy
- For hidden labels, use `sr-only` class on the label element
- Use semantic `type` values (`email`, `tel`, `url`, `search`, `password`, `number`) for mobile keyboards and validation
