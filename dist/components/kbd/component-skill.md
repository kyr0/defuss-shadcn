---
name: Kbd
type: ATM
why: Native <kbd>, and a combination is <kbd> nested inside <kbd> exactly as the HTML spec prescribes — the markup already says "these keys together".
when: Showing a shortcut — in a menu item, a tooltip, a command palette row, or prose. Not for code, which is inline-code.
where: dist/components/kbd/kbd.css
supportedStates: default
---

# Pattern: Kbd

## Native basis
The `<kbd>` element, which means "user input from a keyboard". For a
combination the spec nests them: an outer `<kbd>` for the chord, one inner
`<kbd>` per key. That is why this component needs no wrapper `<div>` and no
JavaScript — the meaning is in the elements.

---

## Native Web APIs
- [`<kbd>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd) — keyboard input; nested for key combinations, as the spec describes
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) — the border inside a button is derived from the button's own text colour
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) — solid foreground border and text when asked
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) — Windows High Contrast Mode support

---

## Structure

### One key

```html
<kbd class="kbd">Esc</kbd>
```

### A combination

```html
<kbd class="kbd-group">
  <kbd class="kbd">⌘</kbd>
  <kbd class="kbd">K</kbd>
</kbd>
```

The outer `<kbd>` is the chord and carries no key styling of its own.

### With a "+" between keys

```html
<kbd class="kbd-group" data-separator>
  <kbd class="kbd">Ctrl</kbd>
  <kbd class="kbd">Shift</kbd>
  <kbd class="kbd">P</kbd>
</kbd>
```

### In a control

```html
<button class="btn" data-variant="outline">
  Search
  <kbd class="kbd" data-size="sm">⌘K</kbd>
</button>
```

Inside a button, a command item or a dropdown item the key drops its own
background and borrows the control's text colour, so it never out-shouts the
label.

---

## Variants

| Attribute | Element | Behaviour |
|-----------|---------|-----------|
| `data-separator` | `.kbd-group` | Draws a `+` in the gap between keys |

## Sizes

| `data-size` | Key size |
|-------------|----------|
| `sm` | 1.125rem — for use inside buttons and menu items |
| *(default)* | 1.375rem |
| `lg` | 1.75rem |

## Custom properties

| Property | Default | Purpose |
|----------|---------|---------|
| `--kbd-size` | `1.375rem` | Minimum width and height of a key; `data-size` sets it |

---

## States

Kbd is CSS-only and has no scripted state: `default` is its only state.

---

## ARIA

None. `<kbd>` already carries the meaning, and a key's label is its text
content. Do not add `role` or `aria-label` — spelling out "Command K" in an
`aria-label` would be read *instead of* the keys and usually reads worse.

If the shortcut is decoration beside a control that already announces its own
action, hide it: `<kbd class="kbd" aria-hidden="true">⌘K</kbd>`.

---

## Notes
- Use it for keys, not for code — inline code is `.inline-code` on `<code>`.
- Write the symbol you want read: `⌘`, `⇧`, `⌥`, `Ctrl`, `Enter`, `Esc`. The
  component does not translate between platforms; pick per platform if you need
  to.
- The thicker bottom border is what makes a rectangle read as a key. It is one
  declaration, and removing it removes the whole effect.
- A key sitting inside a button inherits that button's colour, so it stays
  legible on every variant without a rule per variant.
