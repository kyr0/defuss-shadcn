---
name: Badge
type: ATM
section: data-display
why: Pure-CSS <span> chip with emphasis variants - nothing to wire up.
when: Short status, version, or count labels next to content - not for actions.
where: dist/components/badge/badge.css
supportedStates: default
---

# Pattern: Badge

## Native basis
`<span>` element. No interactivity required - pure visual indicator.

---

## Native Web APIs
- [`<span>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span) - inline container for phrasing content

---

## Structure

```html
<span class="badge" data-variant="default">Badge</span>
```

---

## Variants

| `data-variant` | Purpose                           |
|----------------|-----------------------------------|
| `default`      | Primary background, high emphasis  |
| `secondary`    | Secondary background, medium       |
| `destructive`  | Destructive background, warnings   |
| `outline`      | Border only, low emphasis          |

```html
<span class="badge" data-variant="default">New</span>
<span class="badge" data-variant="secondary">Draft</span>
<span class="badge" data-variant="destructive">Beta</span>
<span class="badge" data-variant="outline">v0.1.0</span>
```

---

## Sizes

| `data-size` | Font size | Padding | Height (line-height) |
|-------------|-----------|---------|----------------------|
| `xs` | 0.5625rem | 0 0.375rem | 1.125rem |
| `sm` | 0.625rem | 0.0625rem 0.5rem | 1.25rem |
| `md` | 0.6875rem | 0.125rem 0.625rem | 1.5rem |
| *(none)* | 0.6875rem | 0.125rem 0.625rem | 1.5rem |
| `lg` | 0.8125rem | 0.1875rem 0.75rem | 1.75rem |
| `xl` | 0.9375rem | 0.25rem 0.875rem | 2rem |

`md` matches the unsized default, so the full five-step scale is pinnable on any component.

---
## Accessibility

- Use descriptive text content - badges are read inline by screen readers.
- If the badge is purely decorative, add `aria-hidden="true"`.

## Notes

- A badge keeps its label on one line and does not shrink in a flex row (`white-space: nowrap`, `flex-shrink: 0`, as in shadcn/ui). Keep labels short; in a row of badges, let the **container** wrap (`flex-wrap` on a `.card-footer` or any flex parent) instead of the badges.
- Sticker placement (a "BETA" tag over a logo or avatar): wrap the logo in a `position: relative` container, pin the badge to a corner with `position: absolute` and tilt it with the individual `rotate` property (e.g. `rotate: 12deg`) - placement is per-instance inline style, the component ships no positioning classes.
