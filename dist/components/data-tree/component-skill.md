---
name: Data Tree
type: ATM
why: A windowed ARIA tree - only the items on screen exist and focus stays on the tree (aria-activedescendant) - over records that name their parent; hierarchy, filtering and sorting run locally over every node through defuss-dataview.
when: Hierarchies too big for nested markup - catalogs, file systems, org charts, taxonomies - that people filter and walk with the keyboard. Tree View for a small tree written as markup; Tree Grid when each node has columns.
where: dist/components/data-tree/data-tree.css + dist/components/data-tree/data-tree.js
supportedStates: default, loading, empty
---

# Pattern: Data Tree

## Native basis
A focusable scroll container with `role="tree"`: a sizer gives the scrollbar
the length of every visible node, a small pool of recycled `role="treeitem"`
elements rides inside it. Records are flat - each names its parent - and
[defuss-dataview](https://www.npmjs.com/package/defuss-dataview) turns them
into the visible list (open branches, matches with their ancestors, siblings
sorted). Focus stays on the tree; `aria-activedescendant` points at the active
item, as the [APG tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) allows.

---

## Native Web APIs
- [WAI-ARIA tree](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) - `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded`, `aria-selected`, `aria-activedescendant`
- [`contain: strict`](https://developer.mozilla.org/en-US/docs/Web/CSS/contain) - paint and layout stay inside the tree
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - the window follows the container height
- [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - one render per frame however many scroll events arrive
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - initializes trees added after load
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) · [`scrollbar-gutter`](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-gutter)
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

The element is empty in markup:

```html
<input data-tree-filter="catalog" aria-label="Filter the catalog" placeholder="Filter…">
<div class="data-tree" id="catalog" aria-label="Catalog" data-label-field="name"
     data-empty-text="No node matches." style="height: 20rem;"></div>
```

```js
// flat records: id + parentId (null for a root)
df$.shadcn.dataTree.setSource(document.getElementById('catalog'), nodes);
```

Custom labels - the renderer fills the item's `.data-tree-label` (a recycled
element: overwrite it):

```js
df$.shadcn.dataTree.setSource(tree, files, {
  render: (label, record, meta) => {
    const name = document.createElement('span');
    name.textContent = record.name;
    const size = document.createElement('span');
    size.className = 'data-tree-meta';
    size.textContent = meta.hasChildren ? '' : record.size + ' KB';
    label.append(name, size);
  },
});
```

---

## Variants

| Attribute | Element | Behaviour |
|-----------|---------|-----------|
| `data-label-field` | `.data-tree` | The field shown as the label (default `name`) |
| `data-id-field` / `data-parent-field` | `.data-tree` | The record's id / parent id fields (default `id` / `parentId`) |
| `data-persist="session\|local\|none"` | `.data-tree` | Where the view (filters, sort, open branches, selection) is kept: session storage (the default), local storage, or nowhere |
| `data-persist-prefix` | `.data-tree` | The generated key's start (default `defuss-shadcn:<page path>`; the key is `<prefix>:data-tree:<id>`) |
| `data-persist-key` | `.data-tree` | The whole key - e.g. one view shared by several pages |
| `data-empty-text` | `.data-tree` | Shown in the `empty` state |
| `data-tree-filter="tree-id"` (+ `data-field`) | any `<input>` | Filters that tree as you type - no listener code |

## Custom properties

| Property | Default | Purpose |
|----------|---------|---------|
| `--data-tree-row-height` | `32px` | Uniform item height (px) - the scroll maths reads it |
| `--data-tree-indent` | `1.25rem` | Indentation per level |

---

## States

| State | Meaning |
|-------|---------|
| `default` | The visible nodes of the query; nothing visible → `empty` |
| `loading` | Busy: placeholder rows, `aria-busy="true"` (a tree without records starts here) |
| `empty` | Nothing to show: `data-empty-text` |

The config of every state is the query, merged on each `setState`:
`{ filters, sorters, expanded, collapsed, selected }` - `expanded` lists the
open branch ids; while a filter is active every branch holding a match opens
and `collapsed` lists the ones closed again. It is `el.store.value.config`.

```js
const tree = document.querySelector('#catalog');
tree.api.setState('default', { expanded: [1, 2] });
tree.api.setState('default', { filters: [{ field: 'name', op: 'contains', value: 'berlin' }] });
tree.store.subscribe((state) => console.log('selected', state.config.selected));
df$.shadcn.dataTree.expandAll(tree);
```

Registry globals: `df$.shadcn.dataTreeApi` / `df$.shadcn.dataTreeStates`;
`df$.shadcn.dataTree` has `setSource`, `query`, `expandAll`, `collapseAll`,
`selected`. Selecting dispatches `data-tree-select` (`detail.record`).

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.dataTreeApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.dataTreeStates` = `default`, `loading`, `empty`.

### `df$.shadcn.dataTree`

| Member | Description |
|---|---|
| `setSource(target, rows, options = {})` | Hand the tree its records. Options: idField ('id'), parentIdField ('parentId', or data-parent-field), render(el, record, meta) for the label (default: the data-label-field value), query (the starting view), persist ({ area: 'session' \| 'local' \| 'none', prefix, key }). |
| `query(target, patch)` | merge into the query: { filters?, sorters?, expanded?, selected? } |
| `expandAll(target)` | Open every branch. |
| `collapseAll(target)` | Close every branch (while filtering: the ways to the matches too). |
| `selected(target)` | the selected record (or null) |

### Events

| Event | `detail` | Description |
|---|---|---|
| `data-tree-select` | `record`, `meta` | Fires when an item is selected (click, Enter, Space) - its record and its tree meta (depth, hasChildren …). |

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `aria-label` | `.data-tree` | Always - names the tree |
| `role="tree"` + `tabindex="0"` | `.data-tree` | Set by the component |
| `aria-activedescendant` | `.data-tree` | Set: the active item (focus stays on the tree) |
| `role="treeitem"` | `.data-tree-item` | Set |
| `aria-level` / `aria-setsize` / `aria-posinset` | `.data-tree-item` | Set per recycled item against the real hierarchy |
| `aria-expanded` | `.data-tree-item` | On items with children |
| `aria-selected` | `.data-tree-item` | Set |
| `aria-busy="true"` | `.data-tree` | In `loading` |

Keyboard (APG tree): ↑ / ↓ move, → opens a branch then steps into it, ←
closes it or goes to the parent, Home / End, Page Up / Down, Enter or Space
selects, `*` opens every sibling.

---

## Notes
- **Records are flat**: `{ id, parentId, … }`; a `parentId` of `null` (or one
  that names no record) is a root.
- **A filter keeps the path**: matches show with their ancestors, every branch
  on the way opens, the matches themselves are marked (`data-match`) and the
  first one becomes active.
- **Items are recycled** - never attach a listener per item; listen to
  `data-tree-select` or one delegated `click` on the tree.
- Give the tree a height; with none it collapses.
