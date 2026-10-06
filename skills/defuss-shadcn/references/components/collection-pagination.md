---
name: Collection Pagination
type: BLK
section: website
why: Links, not buttons - every page has a URL; the per-page choice is a GET Select. No script.
when: Under search results, tables and catalogs. An endless list uses load-more.
where: dist/components/collection-pagination/collection-pagination.css
supportedStates: default
---

# Pattern: Collection Pagination

## Native basis
A footer row: "Showing 13–24 of 248" (`<output>`), the Pagination component (links with `aria-current="page"`) and a per-page Select in a GET form.

Built from: [Pagination](pagination.md), [Select](select.md).

---

## Native Web APIs
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - a navigation landmark
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current page / step / item
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - a computed result
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<div class="mk-collection-pagination">
  <output class="mk-collection-pagination-range">Showing <strong>13–24</strong> of <strong>248</strong></output>
  <nav class="pagination" aria-label="Pagination">
    <ul class="pagination-list">
      <li><a class="pagination-prev" href="#" aria-label="Go to previous page"><i data-lucide="chevron-left"></i> Previous</a></li>
      <li><a class="pagination-link" href="#">1</a></li>
      <li><a class="pagination-link pagination-active" href="#" aria-current="page">2</a></li>
      <li><a class="pagination-link" href="#">3</a></li>
      <li><span class="pagination-ellipsis" aria-hidden="true">…</span></li>
      <li><a class="pagination-link" href="#">21</a></li>
      <li><a class="pagination-next" href="#" aria-label="Go to next page">Next <i data-lucide="chevron-right"></i></a></li>
    </ul>
  </nav>
  <form class="mk-collection-pagination-size" action="#" method="get"><label for="cp-size">Per page</label><select class="select" id="cp-size" name="per"><option>12</option><option>24</option><option>48</option></select></form>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Range left, pages center, per-page right |
| `data-variant="simple"` | Previous / next and "Page 2 of 21" |
| `data-variant="centered"` | Pages centered, the range below |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| pages | Pagination with `aria-current="page"` | Current page announced |
| range | `<output>` | Updates with the page |

---

## Notes
- Keep page URLs stable so results can be shared.
