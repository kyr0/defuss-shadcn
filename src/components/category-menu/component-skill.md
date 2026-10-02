---
name: Category Menu
type: BLK
why: A <nav> of links with aria-current - each category has its own URL; the variants are layout only. No script.
when: Blog, shop and help-center category navigation. Facets that combine are filter-bar; page sections are contents.
where: dist/components/category-menu/category-menu.css
supportedStates: default
---

# Pattern: Category Menu

## Native basis
A `<nav aria-label="Categories">` with a list of links - an icon, the name and a count - and `aria-current="page"` on the current one.

---

## Native Web APIs
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - a navigation landmark
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current page / step / item
- [`CSS scroll snap`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap) - rows that snap per item

---

## Structure

```html
<nav class="mk-category-menu" aria-label="Categories">
  <ul>
    <li><a href="#" aria-current="page"><i data-lucide="layout-grid"></i><span>All</span><small>248</small></a></li>
    <li><a href="#"><i data-lucide="box"></i><span>Product</span><small>64</small></a></li>
    <li><a href="#"><i data-lucide="code"></i><span>Engineering</span><small>81</small></a></li>
    <li><a href="#"><i data-lucide="pen-tool"></i><span>Design</span><small>47</small></a></li>
    <li><a href="#"><i data-lucide="building-2"></i><span>Company</span><small>31</small></a></li>
    <li><a href="#"><i data-lucide="book-open"></i><span>Guides</span><small>25</small></a></li>
  </ul>
</nav>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Underlined tabs on a rule, scrolling sideways when narrow |
| `data-variant="pills"` | Pills; the current one filled |
| `data-variant="vertical"` | A sidebar list with counts |
| `data-variant="tiles"` | Icon tiles in a grid |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| current | `aria-current="page"` | Announced |
| counts | text in the link | Read with the name |

---

## Notes
- Five to eight categories; put the rest under "More".
