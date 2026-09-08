---
name: Rating
type: MOL
why: Native radio group styled as stars — keyboard, form submission and exclusivity are the browser's, so no JavaScript.
when: Collecting or displaying a score out of five — reviews, feedback, quality scores. Use radio for a general small choice set.
where: dist/components/rating/rating.css
supportedStates: default
---

# Pattern: Rating

## Native basis
`<input type="radio">` elements sharing one `name`, wrapped in `<fieldset>`. The
radios stay in the accessibility tree and keep arrow-key navigation and form
submission; CSS draws a star over each one. The read-only form is a display
element with no inputs.

---

## Native Web APIs
- [`<input type="radio">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio) — exclusivity via shared `name`, arrow-key navigation, form submission
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) — groups the radios and propagates `disabled` to all of them
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) — fills every star up to the checked or hovered one, with no JavaScript
- [`:checked`](https://developer.mozilla.org/en-US/docs/Web/CSS/:checked) — current value
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) — keyboard-only focus ring on the star
- [`@media (hover: hover)`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover) — hover preview only where a pointer exists
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — suppresses the fill transition and star scale
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) — darkens empty stars, thickens the focus ring
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) — maps fill to `Highlight`, empty to `GrayText`

---

## Structure

### Interactive (a value the user picks)

```html
<fieldset class="rating" aria-label="Rate this product">
  <label class="rating-item">
    <input class="rating-input" type="radio" name="score" value="1" aria-label="1 star">
  </label>
  <label class="rating-item">
    <input class="rating-input" type="radio" name="score" value="2" aria-label="2 stars">
  </label>
  <label class="rating-item">
    <input class="rating-input" type="radio" name="score" value="3" aria-label="3 stars">
  </label>
  <label class="rating-item">
    <input class="rating-input" type="radio" name="score" value="4" aria-label="4 stars">
  </label>
  <label class="rating-item">
    <input class="rating-input" type="radio" name="score" value="5" aria-label="5 stars">
  </label>
</fieldset>
```

Any number of stars works — add or remove `.rating-item` elements.

### Read-only (a value you display)

```html
<div class="rating" data-readonly style="--rating-value: 3.5"
     role="img" aria-label="Rated 3.5 out of 5"></div>
```

`--rating-value` accepts fractions, so `3.5` renders a half star. The read-only
form is always five stars.

### With a value beside it

```html
<div class="rating" data-readonly style="--rating-value: 4.2"
     role="img" aria-label="Rated 4.2 out of 5"></div>
<span class="rating-value">4.2 (128 reviews)</span>
```

### Disabled

```html
<fieldset class="rating" disabled aria-label="Rating (locked)">
  <label class="rating-item">
    <input class="rating-input" type="radio" name="locked" value="1" aria-label="1 star" disabled>
  </label>
  …
</fieldset>
```

---

## Variants

| Attribute | Element | Behaviour |
|-----------|---------|-----------|
| `data-readonly` | `.rating` | Display-only: no inputs, fractional `--rating-value`, no hover preview |
| `disabled` | `<fieldset class="rating">` | Native propagation to every radio; whole control dimmed |

## Sizes

| `data-size` | Star size |
|-------------|-----------|
| `sm` | 1rem |
| *(default)* | 1.25rem |
| `lg` | 1.75rem |

## Custom properties

| Property | Default | Purpose |
|----------|---------|---------|
| `--rating-color` | `#f59e0b` | Filled star. Amber has no token in the tweakcn shape, so it is a literal — set it per instance for hearts, brand colours, etc. |
| `--rating-empty` | `var(--border)` | Unfilled star |
| `--rating-size` | `1.25rem` | Star size; `data-size` sets it |

---

## States

The rating is CSS-only and has no scripted state: `default` is its only state.
The current value lives in the checked radio, exactly as in any radio group —
read it with `form.elements.score.value`.

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `aria-label` | `.rating` | Always — names the group ("Rate this product") |
| `aria-label` | `.rating-input` | Always — "1 star", "2 stars", … so each option is announced |
| `role="img"` + `aria-label` | `.rating[data-readonly]` | Always — the read-only form is a picture of a score, and the label carries the value |

---

## Notes
- The radio is transparent and stretched over its star rather than hidden, so it
  keeps focus, keyboard and pointer behaviour; the star is drawn by CSS.
- Arrow keys move between stars and Tab reaches the group, because it is an
  ordinary radio group underneath.
- Hover preview fills up to the star under the pointer and overrides the current
  value while hovering; it is suppressed where there is no hover pointer.
- The read-only form draws two layers of five stars and clips the filled layer
  to `--rating-value`, which is why fractions work without extra markup.
- Give each interactive group its own `name`, or two ratings on one page will
  fight over the same value.
