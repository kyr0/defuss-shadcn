---
name: Virtual List
type: ATM
why: Only the rows on screen exist in the DOM and their elements are recycled, so ten rows and ten million cost the same.
when: Lists too long to render — search results, logs, pickers over large sets. Use a plain list or table when every row can exist at once.
where: dist/components/virtual-list/virtual-list.css + dist/components/virtual-list/virtual-list.js
supportedStates: default, loading, empty
---

# Pattern: Virtual List

## Native basis
A scroll container whose scrollbar length comes from a sizer element, with a
small pool of recycled row elements positioned inside it. Scrolling is the
browser's; only the window of rows is ours.

---

## Native Web APIs
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) — the visible window depends on the container's height, not only on scrolling
- [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) — one render per frame however many scroll events arrive
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) — initializes lists added after load (SPA navigation)
- [`contain: strict`](https://developer.mozilla.org/en-US/docs/Web/CSS/contain) — the browser need not look outside the list when laying out or painting
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) — reaching an end does not start scrolling the page
- [`scrollbar-gutter`](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-gutter) — no layout shift when the scrollbar appears
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) — keyboard-only focus ring on the container
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — suppresses the loading pulse
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) — Windows High Contrast Mode support

---

## Structure

The element is empty in markup — the sizer, the row pool and every row are
created by the component:

```html
<div class="virtual-list" id="results" aria-label="Search results"
     style="height: 24rem;"></div>
```

Give it data:

```js
const { virtualList } = globalThis._defussShadcn;

virtualList.setData(document.getElementById('results'), 10_000_000, (row, index) => {
  row.textContent = '';                       // rows are recycled, never fresh
  const label = document.createElement('span');
  label.textContent = `Item ${index + 1}`;
  const meta = document.createElement('span');
  meta.className = 'virtual-list-row-meta';
  meta.textContent = `#${index + 1}`;
  row.append(label, meta);
});
```

`count` may be any number the platform can hold — nothing is allocated per row.
`renderRow(rowElement, index)` fills a **recycled** element, so it must not
assume the element is empty or new.

### Grid (several items per row)

`data-columns` turns each row into a grid of cells, and the renderer is then
called once per **cell** with the **item** index:

```html
<div class="virtual-list" data-columns="3" aria-label="Icon grid"
     style="--virtual-list-row-height: 76px; height: 16rem;"></div>
```

```js
virtualList.setData(grid, 1_000_000, (cell, index) => {
  cell.textContent = '';
  const glyph = document.createElement('span');
  glyph.textContent = icons[index % icons.length];
  const label = document.createElement('span');
  label.textContent = `Icon ${index + 1}`;
  cell.append(glyph, label);
});
```

The row height must fit a whole tile — it still governs the scroll maths. A
final row with fewer items than columns hides its unused cells rather than
drawing empty tiles.

### Empty from markup

```html
<div class="virtual-list" data-empty-text="No results found"
     aria-label="Search results" style="height: 24rem;"></div>
```

---

## Variants

| Attribute | Element | Behaviour |
|-----------|---------|-----------|
| `data-empty-text` | `.virtual-list` | Message shown in the `empty` state |
| `data-count` | `.virtual-list` | Initial row count without calling `setData` (rows render as `Row N`) |
| `data-columns` | `.virtual-list` | Items per row. Above 1 the list becomes a grid: `role="grid"`, rows of `.virtual-list-cell`, renderer called per cell |

## Sizes

| `data-size` | Row height |
|-------------|-----------|
| `sm` | 32px |
| *(default)* | 40px |
| `lg` | 56px |

## Custom properties

| Property | Default | Purpose |
|----------|---------|---------|
| `--virtual-list-row-height` | `40px` | Row height. Every row is this tall — the maths depends on it |

---

## States

| State | Meaning |
|-------|---------|
| `default` | Rows are rendered. `config.index` scrolls that row into view |
| `loading` | Placeholder rows; the list is marked `aria-busy` |
| `empty` | No rows; shows `data-empty-text` |

```js
const list = document.querySelector('#results');
list.api.setState('default', { index: 9_999_990 });   // jump to a row
list.api.setState('loading');
list.api.setState('empty');
list.api.getState();                                   // → { name, config }
```

The registry globals are `_defussShadcn.virtualListApi` and
`_defussShadcn.virtualListStates`.

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `aria-label` | `.virtual-list` | Always — names the list |
| `role="list"` | `.virtual-list` | Set by the component |
| `role="listitem"` | `.virtual-list-row` | Set by the component (single column) |
| `role="grid"` / `role="row"` / `role="gridcell"` | list / row / cell | Set by the component when `data-columns` is above 1, with `aria-rowcount`, `aria-colcount`, `aria-rowindex` and `aria-colindex` |
| `aria-posinset` / `aria-setsize` | `.virtual-list-row` | Set per row — without them a screen reader would announce only the handful of rows that happen to exist |
| `aria-busy="true"` | `.virtual-list` | While in the `loading` state |

---

## Notes
- **Row height is uniform and must be known.** The scroll maths depends on it;
  a row that renders taller than `--virtual-list-row-height` is clipped.
- **Very long lists are scaled, not clamped.** Browsers cap element height
  (Chrome around 33.5M px), so ten million 40px rows cannot have a true sizer.
  Past 15M px the sizer is capped and scroll positions are mapped onto the real
  range: the last row stays reachable, and the only cost is scrollbar
  granularity nobody can perceive at that length.
- **Rows are recycled**, so `renderRow` must fully overwrite the element. Do not
  attach one-off listeners to a row — put a single delegated listener on the
  list and read `row.dataset.index`.
- The container is focusable, so arrow keys, Page Up/Down and Home/End scroll it
  natively.
- Give the container a height. With none it collapses and no rows are visible.
