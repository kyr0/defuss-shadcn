---
name: Radial Progress
type: ATM
why: A conic-gradient masked to a ring plus a typed @property — the arc animates itself, no JS and no SVG.
when: Percentage of a known total that must read at a glance with the number inside it; a linear bar takes progress, unknown totals take spinner.
where: dist/components/radial-progress/radial-progress.css
supportedStates: default
---

# Pattern: Radial Progress

## Native basis

A `<div>` carrying the ARIA progressbar role, not `<progress>`: the ring must
hold visible text in its center, and `<progress>` discards child content in
supporting browsers (it is the no-support fallback) while its rendering lives
in vendor pseudo-elements that cannot be masked into a ring. So the semantics
are supplied explicitly — `role="progressbar"` with `aria-valuenow` /
`aria-valuemin` / `aria-valuemax` — and the visual is pure CSS: one
`conic-gradient` masked down to an annulus.

---

## Native Web APIs

- [`role="progressbar"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/progressbar_role) — ARIA progressbar semantics on a plain element that can own visible child text
- [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) — registers `--value` as a `<number>` so a value change interpolates instead of snapping
- [`conic-gradient()`](https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/conic-gradient) — paints the arc directly from `--value`
- [`mask`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask) — cuts the filled disc down to a ring of `--thickness`
- [`cos()`](https://developer.mozilla.org/en-US/docs/Web/CSS/cos) / [`sin()`](https://developer.mozilla.org/en-US/docs/Web/CSS/sin) — place the leading round cap on the stroke centerline as a pure function of `--value`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — suppresses the value tween
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) — thickens the stroke and darkens the track
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) — repaints the ring with `Highlight` / `GrayText` in Windows High Contrast Mode

---

## Structure

```html
<div
  class="radial-progress"
  role="progressbar"
  aria-valuenow="70"
  aria-valuemin="0"
  aria-valuemax="100"
  style="--value:70"
>70%</div>
```

The element's text content is free-form — a percentage, a fraction, an icon.
Keep `aria-valuenow` in sync with `--value`; the label is decoration, the ARIA
attribute is what assistive technology announces.

### Custom properties (the public API)

| Property      | Default              | Purpose                                     |
|---------------|----------------------|---------------------------------------------|
| `--value`     | `0`                  | Completion, `0`–`100` (unitless). Required.  |
| `--size`      | `5rem`               | Outer diameter of the ring.                  |
| `--thickness` | `calc(var(--size) / 10)` | Stroke width of the ring.                |

```html
<!-- 12rem ring with a hairline stroke -->
<div class="radial-progress" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100"
     style="--value:60;--size:12rem;--thickness:2px">60%</div>
```

---

## Variants

| `data-variant` | Purpose                                              |
|----------------|------------------------------------------------------|
| `default`      | Primary arc — the standard indicator                 |
| `secondary`    | Muted arc, low emphasis (secondary metric, sidebar)  |
| `destructive`  | Over-quota / failing threshold                       |
| `success`      | Completed or healthy threshold                       |

The variant sets `color`, which paints both the arc and the label — one
declaration recolors the whole component.

```html
<div class="radial-progress" data-variant="default"     role="progressbar" aria-valuenow="70" aria-valuemin="0" aria-valuemax="100" style="--value:70">70%</div>
<div class="radial-progress" data-variant="secondary"   role="progressbar" aria-valuenow="70" aria-valuemin="0" aria-valuemax="100" style="--value:70">70%</div>
<div class="radial-progress" data-variant="destructive" role="progressbar" aria-valuenow="95" aria-valuemin="0" aria-valuemax="100" style="--value:95">95%</div>
<div class="radial-progress" data-variant="success"     role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="--value:100">100%</div>
```

---

## Sizes

| `data-size` | Diameter | Label size |
|-------------|----------|------------|
| _(none)_    | `5rem`   | `0.875rem` |
| `sm`        | `3.5rem` | `0.75rem`  |
| `lg`        | `8rem`   | `1.25rem`  |

`data-size` is a shorthand for the common cases; any other diameter is
`style="--size:…"`.

```html
<div class="radial-progress" data-size="sm" role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100" style="--value:40">40%</div>
<div class="radial-progress" data-size="lg" role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100" style="--value:40">40%</div>
```

---

## ARIA

| Attribute            | Value                | Notes                                                        |
|----------------------|----------------------|--------------------------------------------------------------|
| `role`               | `progressbar`        | Required — the `<div>` has no implicit semantics              |
| `aria-valuenow`      | `0`–`100`            | Required; mirror whatever `--value` is set to                 |
| `aria-valuemin`      | `0`                  | Required for an explicit range                                |
| `aria-valuemax`      | `100`                | Required for an explicit range                                |
| `aria-label`         | text                 | Name the measure ("Storage used") when no visible label sits next to it |
| `aria-labelledby`    | id                   | Alternative when a nearby heading already names it            |
| `aria-valuetext`     | text                 | Only when the number needs a unit ("7 of 10 seats")           |

Omit `aria-valuenow` only for a genuinely indeterminate progressbar — this
component has no indeterminate presentation, so use `spinner` for that case.

---

## States

| State     | Meaning                                                        |
|-----------|----------------------------------------------------------------|
| `default` | The only state — the ring renders whatever `--value` it is given |

CSS-only component: there is no `.js` file and no State API object. The value
is data, not state — set it by writing `--value` (and `aria-valuenow`):

```js
const ring = document.querySelector('.radial-progress');
ring.style.setProperty('--value', 82);
ring.setAttribute('aria-valuenow', '82');
```

Because `--value` is registered with `@property`, that assignment tweens over
600ms instead of snapping — no animation code required.

---

## Notes

- **Why not `<progress>`** — the ring's whole point is the number in the middle;
  `<progress>`' child text is fallback-only content and its bar lives in
  vendor pseudo-elements that cannot be masked into an annulus. Use the linear
  `progress` component whenever no centered label is needed.
- **Keep the label and `aria-valuenow` in sync.** They are two independent
  writes; a mismatch is a silent accessibility bug.
- **Sits on the text baseline** (`vertical-align: middle`), so it composes
  inline in table cells and stat rows without a wrapper.
- **Content-box sizing** — `--size` is the drawn diameter, so `padding` on the
  element grows the label area without distorting the ring.
- **Nothing is clipped**: any child content (an icon, `.badge`, a two-line
  label) is centered by `place-content: center`; keep it inside
  `--size - 2 × --thickness` or it will overlap the stroke.
- **Composition** — pair with `.card` + `.statistic` for dashboard tiles, the
  way the linear `progress` component does.
