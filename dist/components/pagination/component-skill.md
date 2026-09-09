---
name: Pagination
type: ATM
why: Numbered page links in a nav > ul with aria-current="page" on the active page.
when: Splitting long lists or tables across pages.
where: dist/components/pagination/pagination.css
supportedStates: default
---

# Pagination

## Native basis

`<nav>` + `<ul>` + `<a>` links for page navigation. Pure CSS — no JavaScript required.

---

## Native Web APIs

- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) — navigation landmark for screen readers
- [`aria-current="page"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) — identifies the active page
- [`aria-disabled`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-disabled) — the only disabled API; CSS renders it non-interactive and muted
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) — keyboard-only focus ring
- [`:is()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:is) — groups the three item classes in the variant rules
- [CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) — a local size scale (`--pagination-item-size` …) so `data-size` re-declares four values instead of every rule
- [Logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) — `padding-inline`, `border-start-start-radius`, `margin-inline-start` give RTL joined groups for free
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — suppresses hover transitions
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) — thickens borders when high-contrast requested
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) — maps active page, hover and disabled to system colors

---

## Structure

```html
<nav class="pagination" aria-label="Pagination">
  <ul class="pagination-list">
    <li><a class="pagination-prev" href="#" aria-label="Go to previous page">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
      Previous
    </a></li>
    <li><a class="pagination-link" href="#">1</a></li>
    <li><a class="pagination-link pagination-active" href="#" aria-current="page">2</a></li>
    <li><a class="pagination-link" href="#">3</a></li>
    <li><span class="pagination-ellipsis" aria-hidden="true">&hellip;</span></li>
    <li><a class="pagination-next" href="#" aria-label="Go to next page">
      Next
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
    </a></li>
  </ul>
</nav>
```

### Simple (page numbers only)

```html
<nav class="pagination" aria-label="Pagination">
  <ul class="pagination-list">
    <li><a class="pagination-link" href="#">1</a></li>
    <li><a class="pagination-link pagination-active" href="#" aria-current="page">2</a></li>
    <li><a class="pagination-link" href="#">3</a></li>
    <li><a class="pagination-link" href="#">4</a></li>
    <li><a class="pagination-link" href="#">5</a></li>
  </ul>
</nav>
```

### Icons only (compact)

```html
<nav class="pagination" aria-label="Pagination">
  <ul class="pagination-list">
    <li><a class="pagination-prev" href="#" aria-label="Go to previous page" aria-disabled="true">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
    </a></li>
    <li><span style="font-size:0.875rem;color:var(--muted-foreground);padding:0 0.5rem;">Page 1 of 10</span></li>
    <li><a class="pagination-next" href="#" aria-label="Go to next page">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
    </a></li>
  </ul>
</nav>
```

### Joined (shared borders)

```html
<nav class="pagination" data-variant="joined" aria-label="Pagination">
  <ul class="pagination-list">
    <li><a class="pagination-link" href="#">1</a></li>
    <li><a class="pagination-link pagination-active" href="#" aria-current="page">2</a></li>
    <li><span class="pagination-ellipsis" aria-hidden="true">&hellip;</span></li>
    <li><a class="pagination-link" href="#">10</a></li>
  </ul>
</nav>
```

### Previous / Next only (two equal columns)

```html
<nav class="pagination" data-layout="split" data-variant="outline" aria-label="Pagination">
  <ul class="pagination-list">
    <li><a class="pagination-prev" href="#" aria-label="Go to previous page" aria-disabled="true">Previous</a></li>
    <li><a class="pagination-next" href="#" aria-label="Go to next page">Next</a></li>
  </ul>
</nav>
```

---

## Variants

Set on the `.pagination` root — every item inherits the treatment.

| `data-variant` | Visual behavior |
|-----------|---------|
| *(omitted)* / `default` | Ghost items on the page background; only the active page gets a border + surface |
| `outline` | Every item carries `var(--border)` + `var(--background)` and a `--shadow-xs`; the active page fills with `var(--accent)` |
| `joined` | `outline` with the gap collapsed: adjacent items share one border (`margin-inline-start: -1px`), inner corners are square and only the first/last item keeps its outer radius. The ellipsis joins the chain instead of floating between two groups |

## Layouts

| `data-layout` | Behavior |
|-----------|---------|
| *(omitted)* | Centered inline row that shrinks to its content |
| `split` | Two equal columns (`grid-template-columns: 1fr 1fr`) filling the container — the prev/next-only pattern for article footers. Combines with any variant |

## Sizes

`data-size` on the `.pagination` root drives a local custom-property scale, so item box, padding, font size, icon size and radius all move together.

| `data-size` | Item box | Font | Icon | Radius |
|-----------|---------|------|------|--------|
| `sm` | 2rem | 0.8125rem | 0.875rem | `--radius-sm` |
| *(omitted)* — default | 2.25rem | 0.875rem | 1rem | `--radius-md` |
| `lg` | 2.75rem | 1rem | 1.125rem | `--radius-lg` |

Variant, layout and size are independent axes and combine freely:
`<nav class="pagination" data-variant="joined" data-size="sm">`.

---

## States

| State | Meaning |
|-------|---------|
| `default` | The only state — pagination is CSS-only and has no State API |

---

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `aria-label="Pagination"` | `<nav>` | Names the navigation region |
| `aria-current="page"` | Active link | Identifies the current page |
| `aria-label="Go to previous/next page"` | Prev/Next | Descriptive label for icon-only triggers |
| `aria-disabled="true"` | Prev/Next | Disables at page boundaries — CSS renders it muted and `pointer-events: none` |
| `aria-hidden="true"` | Ellipsis `<span>` | Hides decorative ellipsis from screen readers |

---

## Keyboard

| Key | Action |
|-----|--------|
| `Tab` | Moves focus to the next pagination link |
| `Shift + Tab` | Moves focus to the previous pagination link |
| `Enter` | Activates the focused link |

All links are native `<a>` elements — keyboard navigation works automatically.

---

## Notes

- Use `<a>` elements for page links — they support native keyboard focus and navigation.
- Mark the active page with `aria-current="page"` and the `.pagination-active` class.
- On the first page, add `aria-disabled="true"` to the Previous link. On the last page, add
  it to Next. The attribute alone is the whole API: CSS mutes the link and removes pointer
  interaction, so **never** add inline `pointer-events`/`opacity` styles alongside it. For a
  boundary link that must also leave the tab order, drop the `href` (or render a
  `<span class="pagination-prev" aria-disabled="true">`) — an `<a href>` stays focusable by
  design and `aria-disabled` deliberately does not change that.
- Use `<span class="pagination-ellipsis" aria-hidden="true">` for the "…" indicator — it's not a link.
- Chevron SVG icons are preferred over text arrows for visual consistency.
- CSS uses logical properties (`padding-inline`, `border-start-start-radius`,
  `margin-inline-start`) so joined groups round and collapse correctly in RTL with no extra rules.
- `joined` shares the visual language of the [button group](../button-group/component-skill.md)
  (negative inline margin, squared inner corners, hovered item raised via `z-index`) — reach for
  `.btn-group` when the row is *buttons*, and for `.pagination[data-variant="joined"]` when it is
  page *navigation*, because the landmark, `aria-current` and link semantics are the point.
- **Only `sm` / default / `lg` ship.** Anything smaller drops the hit target below the 24×24 CSS
  px minimum of [WCAG 2.2 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html);
  an `xl` step has no use case for a control that is never the primary action on a page.
- **No radio-input pagination.** daisyUI offers a `<input type="radio">` flavour; we deliberately
  stay with a `<nav>` of links. Pagination *navigates* — each page is a distinct URL, so links give
  middle-click/open-in-new-tab, browser history, crawlable pagination and the `navigation` landmark
  for free, and `aria-current="page"` is the correct current-item semantic. A radio group announces
  "radio button, 2 of 10, selected" and expresses a form value that is only submitted later, which is
  a different interaction. If a page genuinely needs a *form control* that picks a page number, that
  is a [select](../select/component-skill.md), not this component.
- No JavaScript required — this is a purely CSS component.
