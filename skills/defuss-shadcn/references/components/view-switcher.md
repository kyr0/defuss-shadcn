---
name: View Switcher
type: BLK
section: website
why: Radio inputs read by :has() on the shared parent switch the collection's layout - the choice is keyboard-accessible and survives as a form value.
when: Above galleries, file lists, products. Ordering is sort-control; narrowing is filter-bar.
where: dist/components/view-switcher/view-switcher.css
supportedStates: default
---

# Pattern: View Switcher

## Native basis
A wrapper (`.mk-view-switcher`) holding a radio group (`.mk-view-switcher-options`, values `grid` / `list`) and the collection (`.mk-view-switcher-collection`); `:has(input[value="list"]:checked)` turns the grid into a list.

---

## Native Web APIs
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend

---

## Structure

```html
<div class="mk-view-switcher">
  <div class="mk-view-switcher-options" role="radiogroup" aria-label="View">
    <label><input type="radio" name="vs-1" value="grid" checked><i data-lucide="layout-grid"></i><span class="sr-only">Grid</span></label>
    <label><input type="radio" name="vs-1" value="list"><i data-lucide="list"></i><span class="sr-only">List</span></label>
  </div>
  <ul class="mk-view-switcher-collection">
    <li><img src="https://picsum.photos/seed/vs-0/400/300" alt=""><span><strong>Project 1</strong><small>Updated 1 days ago</small></span></li>
    <li><img src="https://picsum.photos/seed/vs-1/400/300" alt=""><span><strong>Project 2</strong><small>Updated 2 days ago</small></span></li>
    <li><img src="https://picsum.photos/seed/vs-2/400/300" alt=""><span><strong>Project 3</strong><small>Updated 3 days ago</small></span></li>
    <li><img src="https://picsum.photos/seed/vs-3/400/300" alt=""><span><strong>Project 4</strong><small>Updated 4 days ago</small></span></li>
    <li><img src="https://picsum.photos/seed/vs-4/400/300" alt=""><span><strong>Project 5</strong><small>Updated 5 days ago</small></span></li>
    <li><img src="https://picsum.photos/seed/vs-5/400/300" alt=""><span><strong>Project 6</strong><small>Updated 6 days ago</small></span></li>
  </ul>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Icon segments (names for screen readers) |
| `data-variant="labels"` | Segments with visible text |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| options | radio group with `aria-label="View"` | Arrow keys switch |
| icons | sr-only names | "Grid", "List" |

---

## Notes
- Remember the choice (a cookie or the URL) across pages.
