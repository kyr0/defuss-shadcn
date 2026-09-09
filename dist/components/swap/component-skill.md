---
name: Swap
type: ATM
why: A hidden <input type="checkbox"> inside a <label> is the whole state machine — :checked, :indeterminate and :has() pick the visible face, CSS transforms animate it.
when: Toggling between two (or three) glyphs or words in place — theme icons, play/pause, hamburger/close; use toggle or switch when the control needs a pressed button or form-field appearance.
where: dist/components/swap/swap.css
supportedStates: default
---

# Swap

## Native basis

`<label class="swap">` wrapping a hidden `<input type="checkbox">` plus two (or
three) face elements. The checkbox holds the state, the label makes the whole
control clickable and keyboard-operable, and CSS decides which face is visible.
No JavaScript.

## Native Web APIs

- [`<label>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label) — implicit labelling makes the whole control clickable and forwards activation to the checkbox
- [`<input type="checkbox">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox) — native two-state value, keyboard (Space) toggling, form participation
- [`:checked`](https://developer.mozilla.org/en-US/docs/Web/CSS/:checked) — selects the on state
- [`:indeterminate`](https://developer.mozilla.org/en-US/docs/Web/CSS/:indeterminate) — third state, set from script via `input.indeterminate = true`
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) — lets the label react to its own checkbox's state, hover and focus
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) — keyboard-only focus ring on the label
- [`rotate`](https://developer.mozilla.org/en-US/docs/Web/CSS/rotate) — individual transform property driving the `rotate` and `flip` variants
- [`backface-visibility`](https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility) — hides the reverse side of a flipping face
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — swap without animation when requested
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) — stronger outline when requested
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) — Windows High Contrast Mode via system colors

---

## Structure

```html
<label class="swap">
  <input type="checkbox" aria-label="Toggle theme">
  <span class="swap-on">ON</span>
  <span class="swap-off">OFF</span>
</label>
```

The checkbox is hidden by the component CSS (`opacity: 0`, stretched over the
label) — it stays focusable and hit-testable, so no `.sr-only` helper is needed.

Optional third face for the indeterminate state:

```html
<label class="swap">
  <input type="checkbox" id="tri" aria-label="Selection">
  <span class="swap-on">All</span>
  <span class="swap-indeterminate">Some</span>
  <span class="swap-off">None</span>
</label>
<script>document.getElementById('tri').indeterminate = true;</script>
```

---

## Variants

| `data-variant` | Behavior                                                        |
|----------------|-----------------------------------------------------------------|
| *(omitted)*    | Crossfade — the faces fade in/out in place (default)             |
| `rotate`       | Crossfade plus a ±45° rotation, as icons swing into place        |
| `flip`         | Crossfade plus a 180° rotation around the Y axis (card flip)     |

```html
<label class="swap" data-variant="rotate">…</label>
<label class="swap" data-variant="flip">…</label>
```

---

## Sizes

| `data-size`  | Minimum box | Font       | Default icon |
|--------------|-------------|------------|--------------|
| `sm`         | 2rem        | 0.75rem    | 1rem         |
| *(omitted)*  | 2.25rem     | 0.875rem   | 1.25rem      |
| `lg`         | 2.75rem     | 1.125rem   | 1.5rem       |

The box always grows to fit the widest face — the sizes only set a floor plus
the type and icon scale. Give an `<svg>` an explicit `size-*` class to opt out
of the default icon sizing.

---

## ARIA

| Attribute            | On                  | Purpose                                                     |
|----------------------|---------------------|-------------------------------------------------------------|
| `aria-label`         | `input`             | Names the control — the faces are graphics/short words       |
| `aria-hidden="true"` | face `<span>`s      | Optional: silence decorative glyphs so only the label is read |
| `aria-live="polite"` | face container      | Optional: announce the new face when it changes              |
| `disabled`           | `input`             | Native disabled state — dims the label and blocks pointers   |

- The `<label>` is not focusable; the checkbox inside it is. Space toggles it.
- Never put the state in the label text — keep `aria-label` stable and let the
  checkbox's checked value carry the state.

---

## States

Swap is CSS-only, so it declares a single State API state.

| State     | Meaning                                                   |
|-----------|-----------------------------------------------------------|
| `default` | Rendered by CSS; visual state follows the checkbox's DOM state |

```js
// CSS-only components have no api.setState — drive the checkbox instead:
document.querySelector('#theme-swap input').checked = true;   // on face
document.querySelector('#theme-swap input').indeterminate = true; // third face
```

The DOM-level state axes on top of `default`:

| Trigger                        | Visible face          |
|--------------------------------|-----------------------|
| checkbox unchecked             | `.swap-off`           |
| checkbox `:checked`            | `.swap-on`            |
| checkbox `:indeterminate`      | `.swap-indeterminate` |
| `data-active` on `.swap`       | `.swap-on` (forced, overrides the checkbox) |
| `disabled` on the checkbox     | current face, dimmed, non-interactive |

---

## Notes

- **`data-active` is for uncontrolled display**, e.g. rendering an "on" swap
  from server state without a checked checkbox. It wins over `:checked` and
  `:indeterminate`; remove it to hand control back to the checkbox.
- **`.swap-indeterminate` only shows via the IDL property** — `indeterminate`
  is not an HTML attribute, so it must be set in script.
- The faces share one grid cell (`grid-area: 1 / 1`), so they never shift the
  layout while swapping; the control sizes itself to the widest face.
- Faces are `pointer-events: none` — every click lands on the checkbox.
- Use a `<button>`-based toggle instead when the control needs `aria-pressed`
  semantics and a button surface; swap is a checkbox with two paint jobs.
