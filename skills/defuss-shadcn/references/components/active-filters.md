---
name: Active Filters
type: BLK
why: Each chip is a link to the same results without that filter - removal works without script, and every link says what it removes.
when: Above filtered results, under filter-bar or beside filter-sidebar.
where: dist/components/active-filters/active-filters.css
supportedStates: default
---

# Pattern: Active Filters

## Native basis
A list of links (`.mk-active-filters-chip`) whose `aria-label` says "Remove filter Color: Sand", plus a "Clear all" link; optionally a label and the count.

---

## Native Web APIs
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - a navigation landmark
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside

---

## Structure

```html
<nav class="mk-active-filters" aria-label="Active filters">
  <ul>
    <li><a class="mk-active-filters-chip" href="#" aria-label="Remove filter Category: Shirts"><span>Category:</span> Shirts <i data-lucide="x"></i></a></li>
    <li><a class="mk-active-filters-chip" href="#" aria-label="Remove filter Color: Sand"><span>Color:</span> Sand <i data-lucide="x"></i></a></li>
    <li><a class="mk-active-filters-chip" href="#" aria-label="Remove filter Price: €50 – €100"><span>Price:</span> €50 – €100 <i data-lucide="x"></i></a></li>
  </ul>
  <a class="mk-active-filters-clear" href="#">Clear all</a>
</nav>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Chips and "Clear all" |
| `data-variant="bar"` | A muted bar with a "Filters" label and the count |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| chips | `aria-label="Remove filter Color: Sand"` | Says the action and the filter |
| group | `aria-label="Active filters"` | Named list |

---

## Notes
- Remove filters in place - keep the scroll position.
