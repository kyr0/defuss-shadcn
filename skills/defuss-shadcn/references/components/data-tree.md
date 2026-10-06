---
name: Data Tree
type: ATM
section: big-data
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

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type DataTreeState = 'default' | 'loading' | 'empty'</code> - `setState(name, config)` takes the config of the state it names (`DataTreeStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The visible items of the query; nothing visible lands in empty. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a match shows with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the order of siblings</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the open branches</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>while filtering: the branches the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue \| null</code></td><td>the selected record's id, null for none</td></tr></table> |
| `loading` | Busy: placeholder rows, aria-busy - a tree without records starts here. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a match shows with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the order of siblings</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the open branches</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>while filtering: the branches the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue \| null</code></td><td>the selected record's id, null for none</td></tr></table> |
| `empty` | Nothing to show: the data-empty-text shows. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a match shows with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the order of siblings</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the open branches</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>while filtering: the branches the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue \| null</code></td><td>the selected record's id, null for none</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends DataTreeState&gt;(name: S, config?: DataTreeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DataTreeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: DataTreeState; config: DataTreeStateConfigs[DataTreeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: DataTreeState; config: DataTreeStateConfigs[DataTreeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: DataTreeState; config: DataTreeStateConfigs[DataTreeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: DataTreeState; config: DataTreeStateConfigs[DataTreeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: DataTreeState; config: DataTreeStateConfigs[DataTreeState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.dataTreeApi.setState&lt;S extends DataTreeState&gt;(el: HTMLElement, name: S, config?: DataTreeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DataTreeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.dataTreeApi.getState(el: HTMLElement): { name: DataTreeState; config: DataTreeStateConfigs[DataTreeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: DataTreeState; config: DataTreeStateConfigs[DataTreeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.dataTreeApi.render(state: { name: DataTreeState; config: DataTreeStateConfigs[DataTreeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: DataTreeState; config: DataTreeStateConfigs[DataTreeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.dataTreeApi.store(el: HTMLElement): Store&lt;{ name: DataTreeState; config: DataTreeStateConfigs[DataTreeState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: DataTreeState; config: DataTreeStateConfigs[DataTreeState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.dataTreeApi.commit&lt;S extends DataTreeState&gt;(el: HTMLElement, name: S, config?: DataTreeStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>DataTreeStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.dataTreeStates: DataTreeState[]</code> | The declared states, 'default' first: <code>default</code>, <code>loading</code>, <code>empty</code>. |

### `df$.shadcn.dataTree`

| Member | Description |
|---|---|
| <code>setSource(target: string \| HTMLElement, rows: DataviewRow[], options: DataTreeOptions = {}): void</code> | Hand the tree its records. Options: idField ('id'), parentIdField ('parentId', or data-parent-field), render(el, record, meta) for the label (default: the data-label-field value), query (the starting view), persist ({ area: 'session' \| 'local' \| 'none', prefix, key }). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr><tr><td><code>rows</code></td><td><code>DataviewRow[]</code></td><td>the records, a flat list linked by parent id</td></tr><tr><td><code>options</code></td><td><code>DataTreeOptions</code> = <code>{}</code></td><td>fields, label rendering, the starting view and its persistence</td></tr></table> |
| <code>query(target: string \| HTMLElement, patch: DataTreeQuery): void</code> | Merge into the query: { filters?, sorters?, expanded?, selected? }. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr><tr><td><code>patch</code></td><td><code>DataTreeQuery</code></td><td>the query keys to change</td></tr></table> |
| <code>expandAll(target: string \| HTMLElement): void</code> | Open every branch. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr></table> |
| <code>collapseAll(target: string \| HTMLElement): void</code> | Close every branch (while filtering: the ways to the matches too). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr></table> |
| <code>selected(target: string \| HTMLElement): DataviewRow \| null</code> | The selected record. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr></table> <b>Returns</b> <code>DataviewRow \| null</code> - the record whose id is selected, null when none is |

### Events

| Event | Description |
|---|---|
| `data-tree-select` | Fires when an item is selected (click, Enter, Space) - its record and its tree meta (depth, hasChildren ...). <code>detail</code>: <code>DataTreeSelectDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the selected record</td></tr><tr><td><code>meta</code></td><td><code>DataTreeMeta</code></td><td>where it sits in the tree</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `DataTreeMeta` | Where a record sits in the tree - what render() and data-tree-select receive. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>depth</code></td><td><code>number</code></td><td>0 for a root</td></tr><tr><td><code>hasChildren</code></td><td><code>boolean</code></td><td>whether it has child records</td></tr><tr><td><code>isExpanded</code></td><td><code>boolean</code></td><td>whether its branch is open</td></tr><tr><td><code>isMatch</code></td><td><code>boolean</code></td><td>whether it matches the filters (false for an ancestor shown for a match)</td></tr><tr><td><code>isSelected</code></td><td><code>boolean</code></td><td>whether it is the selected record</td></tr><tr><td><code>parentId</code></td><td><code>DataviewJsonValue \| null</code></td><td>its parent's id, null for a root</td></tr></table> |
| `DataTreeOptions` | What setSource() takes besides the records. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>idField?</code></td><td><code>string</code></td><td>the id field (default 'id', or data-id-field)</td></tr><tr><td><code>parentIdField?</code></td><td><code>string</code></td><td>the parent-id field (default 'parentId', or data-parent-field)</td></tr><tr><td><code>render?</code></td><td><code>(el: HTMLElement, record: DataviewRow, meta: DataTreeMeta) =&gt; void</code></td><td>fill an item's label yourself (default: the data-label-field value as text)</td></tr><tr><td><code>query?</code></td><td><code>DataTreeQuery</code></td><td>the starting view (a kept view wins over it)</td></tr><tr><td><code>persist?</code></td><td><code>ViewPersistence</code></td><td>where the view is kept between visits (default: session storage under a generated key)</td></tr></table> |
| `DataTreeQuery` | The tree's query - its state config (merged on every query()). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a match shows with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the order of siblings</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the open branches</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>while filtering: the branches the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue \| null</code></td><td>the selected record's id, null for none</td></tr></table> |
| `DataTreeSelectDetail` | What data-tree-select carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the selected record</td></tr><tr><td><code>meta</code></td><td><code>DataTreeMeta</code></td><td>where it sits in the tree</td></tr></table> |

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
