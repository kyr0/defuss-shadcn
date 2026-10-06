---
name: Indicator
type: MOL
why: A positioned wrapper - pins badges, status dots or buttons to any of nine points of an element with CSS only.
when: A count on a button or tab, a status dot on an avatar or card, a "New" / "Required" tag on a box or input - for presence ON an avatar prefer .avatar-badge.
where: dist/components/indicator/indicator.css
supportedStates: default
---

# Pattern: Indicator

## Native basis

Any element wrapped in a `<div>` / `<span>` with `position: relative`; each
`.indicator-item` is `position: absolute`, centered on an anchor point of the
wrapper's edge. No JavaScript.

## Native Web APIs

- [`position: absolute`](https://developer.mozilla.org/en-US/docs/Web/CSS/position) + [`translate`](https://developer.mozilla.org/en-US/docs/Web/CSS/translate) - the item is centered on its anchor point
- [`:dir()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:dir) - start / end flip in right-to-left text
- [Attribute selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors) - one `data-position` value, read per axis (`^=` / `$=`)
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - the ping / bounce / pulse dots stand still
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - status dots keep their color

---

## Structure

```html
<div class="indicator">
  <span class="indicator-item badge" data-variant="default">New</span>
  <div class="card">…the indicated element…</div>
</div>

<!-- a status dot, pinned top-start and pinging -->
<div class="indicator">
  <span class="indicator-item indicator-dot" data-position="top-start" data-variant="success" data-animate="ping" role="img" aria-label="Online"></span>
  <button class="btn" data-variant="outline">Server</button>
</div>

<!-- a status dot inline, on its own -->
<span class="indicator-dot" data-variant="warning" role="img" aria-label="Degraded"></span> Degraded
```

The indicated element can be anything: a button, a tab trigger, an avatar,
an input, a card, an image. Several `.indicator-item`s may share one wrapper.

---

## Placement (`data-position` on `.indicator-item`)

One attribute, two axes: vertical `top` (default) / `middle` / `bottom`
and horizontal `start` / `center` / `end` (default), joined with a dash -
`top-start`, `middle-center`, `bottom-end` .... A single word sets one axis
(`start` = top-start, `bottom` = bottom-end). `start` / `end` are logical:
in RTL, start is the right edge.

| Value | Point |
| --- | --- |
| `top-start` · `top-center` · `top-end` (default) | top edge: left / middle / right |
| `middle-start` · `middle-center` · `middle-end` | vertical middle |
| `bottom-start` · `bottom-center` · `bottom-end` | bottom edge |

### Inset (`data-inset` on `.indicator-item`)

An item sits centered on the element's box corner - on a padded icon button
that is well away from the glyph. `data-inset` pulls it toward the center by
`0.5rem` per axis (`data-inset="sm"` `0.25rem`, `"lg"` `0.75rem`): a corner item
moves diagonally, an edge-center item straight in, a middle-center item not at
all. RTL-aware.

```html
<div class="indicator">
  <span class="indicator-item badge" data-variant="default" data-size="xs" data-inset>8</span>
  <button class="btn" data-variant="ghost" data-size="icon" aria-label="Cart, 8 items">…</button>
</div>
```

### Responsive

`data-position-sm` / `-md` / `-lg` / `-xl` take the same values and apply
from 40 / 48 / 64 / 80rem viewport width up (a single word overrides one
axis):

```html
<span class="indicator-item badge" data-variant="default" data-position="start" data-position-sm="center" data-position-md="end" data-position-lg="start" data-position-xl="end">Responsive</span>
```

---

## Status dot (`.indicator-dot`)

| Attribute | Values |
| --- | --- |
| `data-variant` | `neutral`, `primary`, `secondary` (`--chart-2`), `accent` (`--chart-4`), `success`, `warning`, `info`, `destructive` (alias `error`); default muted |
| `data-size` | `xs` 0.25rem · `sm` 0.375rem · `md` 0.5rem (default) · `lg` 0.75rem · `xl` 1rem |
| `data-animate` | `ping` (a ring pulses out), `bounce` (the dot hops), `pulse` (it fades in and out) |

Success / warning / info are literal colors (the token set has no such
pairs); the rest follow the theme.

---

## ARIA

| Case | Markup |
| --- | --- |
| Status dot | `role="img"` + `aria-label="Online"` - a bare span has no name |
| Count badge on a button / tab | put the count in the accessible name too (`aria-label="Inbox, 12 unread"` on the button), or keep the badge text readable |
| Decorative item | `aria-hidden="true"` |

---

## Notes

- `.indicator` is `inline-flex` and as wide as its content - it wraps the
  element, it does not stretch. Give it `w-full` (or `display: flex`) to span
  a column. A card inside has NO intrinsic width (it is a size container,
  `container-type: inline-size`) - give the indicator a width (`w-full`,
  `style="width: 20rem"`); the wrapped element fills it.
- Items never take part in layout: a big item overlaps its neighbours -
  leave room with padding or a gap.
- Color is never the only cue: pair a status dot with text where there is
  room (WCAG 1.4.1).
- Presence on an avatar has its own shaped badge: `.avatar-badge` (four
  corners via `data-position`, shape cues per state).
