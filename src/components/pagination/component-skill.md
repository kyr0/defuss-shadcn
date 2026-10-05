---
name: Pagination
type: MOL
why: Numbered page links in a nav > ol with aria-current="page" on the active page - a composition of button atoms (page/prev/next).
when: Splitting long lists or tables across pages.
where: dist/components/pagination/pagination.css
supportedStates: default
---

# Pagination

## Native basis

`<nav>` + `<ul>` + `<a>` links for page navigation. Pure CSS - no JavaScript required.

---

## Native Web APIs

- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - navigation landmark for screen readers
- [`aria-current="page"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - identifies the active page
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus ring
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses hover transitions
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - thickens borders when high-contrast requested
- [Logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) - `border-start-start-radius` / `margin-inline-start` give RTL joined groups for free
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - maps active page border and hover to system colors

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

Set on the `.pagination` nav - every cell inherits the treatment.

| `data-variant` | Visual behavior |
|-----------|---------|
| *(omitted)* | Ghost cells on the page background; only the active page gets a border + surface |
| `outline` | Every cell carries `var(--border)` + `var(--background)` and `--shadow-xs`; the active page fills with `var(--accent)` |
| `joined` | `outline` with the gap collapsed: neighbours share one border (`margin-inline-start: -1px`), inner corners are square, only the first / last cell keeps its outer radius; the ellipsis joins the chain |

## Layouts

| `data-layout` | Behavior |
|-----------|---------|
| *(omitted)* | Centered row that shrinks to its content |
| `split` | Two equal columns (`grid-template-columns: 1fr 1fr`) across the container - the previous / next pager for article footers; combines with any variant |

Variant, layout, size and density are independent axes and combine freely.

---

## Sizes

Set `data-size` on the `.pagination` nav; page links, prev/next and the ellipsis all scale.

| `data-size` | Cell height | Cell min-width | Font |
|-------------|-------------|----------------|------|
| `xs` | 1.75rem | 1.75rem | 0.75rem |
| `sm` | 2rem | 2rem | 0.8125rem |
| `md` | 2.25rem | 2.25rem | 0.875rem |
| *(none)* | 2.25rem | 2.25rem | 0.875rem |
| `lg` | 2.5rem | 2.5rem | 1rem |
| `xl` | 2.75rem | 2.75rem | 1.125rem |

---
## Density

Set `data-density` on the `.pagination` nav; only the inter-cell gap scales - the size ladder owns cell dimensions, so size and density stay independent axes (ratio `0.75` / `1` / `1.25`, matching `sizing.css`).

| Value | Effect |
| --- | --- |
| `compact` | List gap 0.125rem |
| `comfortable` | Gap 0.25rem - identical to the unsized default |
| `spacious` | Gap 0.5rem |

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `aria-label="Pagination"` | `<nav>` | Names the navigation region |
| `aria-current="page"` | Active link | Identifies the current page |
| `aria-label="Go to previous/next page"` | Prev/Next | Descriptive label for icon-only triggers |
| `aria-disabled="true"` | Prev/Next | Disables at page boundaries |
| `aria-hidden="true"` | Ellipsis `<span>` | Hides decorative ellipsis from screen readers |

---

## Keyboard

| Key | Action |
|-----|--------|
| `Tab` | Moves focus to the next pagination link |
| `Shift + Tab` | Moves focus to the previous pagination link |
| `Enter` | Activates the focused link |

All links are native `<a>` elements - keyboard navigation works automatically.

---

## Notes

- Use `<a>` elements for page links - they support native keyboard focus and navigation.
- Mark the active page with `aria-current="page"` and the `.pagination-active` class.
- On the first page, add `aria-disabled="true"` to the Previous link. On the last page, add
  it to Next. The attribute alone is the whole API: CSS mutes the link and removes pointer
  interaction, so never add inline `pointer-events` / `opacity` styles alongside it. For a
  boundary link that must also leave the tab order, drop the `href` - an `<a href>` stays
  focusable by design and `aria-disabled` deliberately does not change that.
- Use `<span class="pagination-ellipsis" aria-hidden="true">` for the "…" indicator - it's not a link.
- Chevron SVG icons are preferred over text arrows for visual consistency.
- CSS uses logical properties (`padding-inline`, `border-start-start-radius`,
  `margin-inline-start`), so joined groups round and collapse correctly in RTL.
- `joined` shares the look of the [button group](../button-group/component-skill.md) - reach for
  `.btn-group` when the row is *buttons*, for `data-variant="joined"` when it is page
  *navigation* (the landmark, `aria-current` and link semantics are the point).
- **No radio-input pagination** (daisyUI has one): pagination *navigates* - each page is a URL, so
  links give middle-click / new tab, history, crawlable pages and the `navigation` landmark, and
  `aria-current="page"` is the right current-item semantic. A control that *picks* a page number
  for a form is a [select](../select/component-skill.md).
- No JavaScript required - this is a purely CSS component.

## States

The runtime declares the single `default` state (AGENTS.md "State API"); the visible UI contract lives on the element as data attributes, which `setState('default', { … })` applies and re-renders:

```js
pager.api.setState('default', { page: 4 });
paginationApi.getState(el); // { name: 'default', config: { … current attributes … } }
```

The registry global is `df$.shadcn.paginationApi` / `df$.shadcn.PaginationStates` (camelCase).

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.paginationApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.paginationStates` = `default`.

### Events

| Event | `detail` | Description |
|---|---|---|
| `pagination-change` | `page` | Fires when the user changes the page (a link, the arrows) - the new page. |
