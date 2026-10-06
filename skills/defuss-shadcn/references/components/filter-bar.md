---
name: Filter Bar
type: BLK
section: website
why: A GET form of native selects and checkbox chips (:has(:checked) fills them) - filters are shareable URLs; the row scrolls sideways when narrow.
when: Above product grids, listings and tables with a few filters. Many filters belong in filter-sidebar; applied ones show in active-filters.
where: dist/components/filter-bar/filter-bar.css
supportedStates: default
---

# Pattern: Filter Bar

## Native basis
A `<form method="get">` in one row: native Selects, checkbox chips (`.mk-filter-bar-chip`), a "More filters" Button with a count, and the result count; it scrolls on small screens.

Built from: [Select](select.md), [Button](button.md), [Badge](badge.md).

---

## Native Web APIs
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`CSS scroll snap`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap) - rows that snap per item

---

## Structure

```html
<div class="mk-filter-bar">
  <form action="#" method="get" aria-label="Filters">
    <select class="select" name="category" aria-label="Category"><option>All categories</option><option>Shirts</option><option>Knitwear</option></select>
    <select class="select" name="price" aria-label="Price"><option>Any price</option><option>Under €50</option><option>€50 – €100</option></select>
    <span class="mk-filter-bar-sep" aria-hidden="true"></span>
    <label class="mk-filter-bar-chip"><input type="checkbox" name="sale" checked><i data-lucide="percent"></i>On sale</label>
    <label class="mk-filter-bar-chip"><input type="checkbox" name="new">New in</label>
    <label class="mk-filter-bar-chip"><input type="checkbox" name="organic">Organic</label>
    <button class="btn" data-variant="outline" data-size="sm" type="button"><i data-lucide="sliders-horizontal"></i> More filters <span class="badge" data-variant="secondary" data-size="sm">2</span></button>
    <output class="mk-filter-bar-count">36 products</output>
  </form>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | One scrollable row |
| `data-variant="sticky"` | Sticks to the top of its scroll container with a blurred surface |
| `.mk-filter-bar-chip` | A checkbox styled as a toggle chip |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| selects | labelled (`aria-label` or `<label>`) | Each names its dimension |
| chips | real checkboxes | Announced as checked |
| count | `<output>` | Updates with the filters |

---

## Notes
- Show the result count before people apply.
