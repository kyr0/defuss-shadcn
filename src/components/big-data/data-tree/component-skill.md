---
name: Data Tree
type: ATM
section: big-data
why: A windowed ARIA tree - only the items on screen exist and focus stays on the tree (aria-activedescendant) - over records that name their parent; hierarchy, filtering and sorting run locally over every node through defuss-dataview.
when: Hierarchies too big for nested markup - catalogs, file systems, org charts, taxonomies - that people filter, walk with the keyboard and rearrange by dragging (also to and from Data Grids). Tree View for a small tree written as markup; Tree Grid when each node has columns.
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
- [HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) (`draggable`, `DataTransfer`, `dropEffect`) - items drag between trees and Data Grids (`data-drag` / `data-drop`), to another window or into a document
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) · [`scrollbar-gutter`](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-gutter)
- [`overflow-anchor: none`](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor) - the runtime owns the scroll position: browser scroll anchoring would follow the recycled rows and keep scrolling by itself (Firefox)
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
| `data-exclusive` | `.data-tree` | One open way: opening a branch closes every branch that is not on its way, and `reveal()` opens only the way to its record - for a navigator that follows a selection somewhere else |
| `data-tree-filter="tree-id"` (+ `data-field`) | any `<input>` | Filters that tree as you type - no listener code |
| `data-editable` | `.data-tree` | An item renames in place: double-click it, or F2 on the active item (see "Inline editing") |
| `data-edit-field` | `.data-tree` | The field an edit writes (default: the label field) |
| `data-editor` | `.data-tree` | The built-in editor (`string` by default; `enum` with `data-options`, `number` ...) |
| `data-required`, `data-min-length` / `data-max-length` / `data-pattern`, `data-message` | `.data-tree` | The rules an edited value must keep |
| `data-drag` (`"move"` / `"copy"` / both - the default) | `.data-tree` | Items drag out with everything under them - see "Drag and drop" |
| `data-drop` (`"move"` / `"copy"` / both - the default) | `.data-tree` | Dragged records drop in - see "Drag and drop" |

### Inline editing

With `data-editable` an item edits in place: double-click it, or press F2 on the active item. The editor is the
library's Input (the shared cell editors, as in the Property Grid and the Data Grid); Enter or leaving it writes, Escape
keeps the old value, and the tree's keys stay out of it. A value the rules refuse shows its message below the item.
Every edit replaces the record with a new object and runs the query again - sorted siblings take the new name's
place. `data-tree-beforeedit` (cancelable) fires first, `data-tree-edit` after.

```js
df$.shadcn.dataTree.setSource(tree, rows, {
  getEditorFn: (field, value, ctx) => null,  // an element, { el, getValue, validate?, focus?, immediate?, patch? },
                                             // null (the built-in Input) or false (this item does not edit)
  validateFn: (field, value, ctx) => null,   // a message (or false) refuses it - e.g. a name its siblings use
});
df$.shadcn.dataTree.edit(tree, 'src/app');    // reveal and edit a record
df$.shadcn.dataTree.update(tree, 'src/app', { name: 'App' });
```

`ctx` = `{ record, meta, field, type, rules, tree }`. A custom editor's `patch()` writes more fields in the same edit
(a label's name and its colour).

### Drag and drop

`data-drag` lets items drag out, `data-drop` lets records drop in - within one tree (to another branch), between
trees, between a tree and a Data Grid (a Tree Grid too). An item drags with everything under it. The effect is what
the source allows (`data-drag`) and the target takes (`data-drop`): `move`, `copy` or both, where Alt / Option or
Ctrl held during the drag copies and anything else moves.

- Where it would land shows as a line at the level it lands on: the top quarter of an item drops before it, the
  bottom quarter after it (its siblings), the middle half frames it - the records become its children, and it
  opens. Below the last item they become roots.
- A dropped record keeps its id unless the target holds it already or the drop copies: then it gets a new one
  (numbers: after the largest, text: `id-2`, `id-3` ...) and its children follow it. A move into its own subtree
  goes nowhere.
- The target writes once, opens the way to the first record that came, selects it and fires `data-tree-drop`; a move
  takes the records out of their source first; the source fires `data-tree-dragend`. `data-tree-beforedrop`
  (cancelable) refuses a drop.
- The drag also carries the labels as an outline - a tab per level (`text/plain`) and nested lists (`text/html`) -
  and the records as JSON (`application/x-defuss-records+json`): a tree in another window copies them.
- Keyboard users need another way: `insert(tree, records, at)` and `remove(tree, ids)` write what a drop writes.

```html
<div class="data-tree" id="library" aria-label="Library" data-drag data-drop></div>
<div class="data-tree" id="playlist" aria-label="Playlist" data-drag data-drop="copy"></div>
```

## Custom properties

| Property | Default | Purpose |
|----------|---------|---------|
| `--data-tree-row-height` | `32px` | Uniform item height (px) - the scroll maths reads it |
| `--data-tree-indent` | `1.25rem` | Indentation per level |

---

## States

| State | Meaning |
|-------|---------|
| `default` | The visible nodes of the query; with nothing visible the state is `empty` |
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
`reveal` (opens the way to a record, selects it and scrolls it into view - a
selection made elsewhere, shown in the tree; no `data-tree-select` fires) and
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
| <code>reveal(target: string \| HTMLElement, id: DataviewJsonValue): boolean</code> | Shows a record: opens the way to it (with data-exclusive only that way - every other branch closes), selects it and scrolls it into view as the active item. No data-tree-select fires - the page asked for it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr><tr><td><code>id</code></td><td><code>DataviewJsonValue</code></td><td>the record's id</td></tr></table> <b>Returns</b> <code>boolean</code> - false when the record is unknown or a filter hides it |
| <code>source(target: string \| HTMLElement): DataSource&lt;DataviewRow&gt; \| undefined</code> | The tree's query source: its records (source.rows - every edit included) and the cached query over them. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr></table> <b>Returns</b> <code>DataSource&lt;DataviewRow&gt; \| undefined</code> - its source, undefined before setSource() |
| <code>edit(target: string \| HTMLElement, id: DataviewJsonValue): boolean</code> | Open the editor of a record's item (data-editable on the tree) - its branch opens and it scrolls into view first. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr><tr><td><code>id</code></td><td><code>DataviewJsonValue</code></td><td>the record's id</td></tr></table> <b>Returns</b> <code>boolean</code> - false when it does not edit (no such record, no data-editable, getEditorFn answered false) |
| <code>commit(target: string \| HTMLElement): boolean</code> | Commit the open editor. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - false when its value is refused (the editor stays open with the message); true otherwise |
| <code>cancel(target: string \| HTMLElement): void</code> | Close the open editor without writing. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr></table> |
| <code>update(target: string \| HTMLElement, id: DataviewJsonValue, patch: DataviewRow): DataviewRow \| null</code> | Write new values into one record from script - what an edit writes. The record is replaced by a new object; the query runs again. Fires data-tree-edit per field. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr><tr><td><code>id</code></td><td><code>DataviewJsonValue</code></td><td>the record's id</td></tr><tr><td><code>patch</code></td><td><code>DataviewRow</code></td><td>the fields to change and their new values</td></tr></table> <b>Returns</b> <code>DataviewRow \| null</code> - the new record, null when no record has that id |
| <code>selected(target: string \| HTMLElement): DataviewRow \| null</code> | The selected record. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr></table> <b>Returns</b> <code>DataviewRow \| null</code> - the record whose id is selected, null when none is |
| <code>insert(target: string \| HTMLElement, records: DataviewRow[], at: DataTreeDropAt = { id: null, place: 'end' }): DataviewRow[] \| null</code> | Insert records - what a drop writes, from script (a button that moves the selected item to another tree, the keyboard's way to do what a drag does). Records may bring their children (linked by parent id among themselves); the others take the place's parent: beside a record its parent, into a record that record, at the end none. A record whose id the tree already holds gets a new one (numbers: after the largest, text: "id-2" ...). No event fires - the page asked for it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records to insert</td></tr><tr><td><code>at</code></td><td><code>DataTreeDropAt</code> = <code>{ id: null, place: 'end' }</code></td><td>where: beside a record ({ id, place: 'before' \| 'after' }), into one ('into'), or at the end (the default: roots)</td></tr></table> <b>Returns</b> <code>DataviewRow[] \| null</code> - the records as inserted (with their ids), null when the place is no record of the tree |
| <code>remove(target: string \| HTMLElement, ids: DataviewJsonValue[]): DataviewRow[]</code> | Take records out with everything under them - what a move takes out of the tree it leaves. A selected record that goes is no longer selected. No event fires - the page asked for it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-tree element or its selector</td></tr><tr><td><code>ids</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the records to take out</td></tr></table> <b>Returns</b> <code>DataviewRow[]</code> - the records taken out (with the ones under them), in source order |

### Events

| Event | Description |
|---|---|
| `data-tree-beforedrop` | Fires before dropped records are written - cancel it to refuse them (the drag ends without a change). <code>detail</code>: <code>DataTreeBeforeDropDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records as they will be inserted (new ids where a copy or a taken id needs one)</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' (they leave their source) or 'copy'</td></tr><tr><td><code>source</code></td><td><code>HTMLElement \| null</code></td><td>the component they come from (a tree, a grid; this tree when they move within it); null from another document</td></tr><tr><td><code>at</code></td><td><code>DataTreeDropAt</code></td><td>where they land</td></tr></table> |
| `data-tree-beforeedit` | Fires before an edited value is written - cancelable: preventDefault() keeps the old value. <code>detail</code>: <code>DataTreeBeforeEditDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record as it is</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the field that edits</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the value about to be written</td></tr><tr><td><code>oldValue</code></td><td><code>unknown</code></td><td>the value it holds now</td></tr></table> |
| `data-tree-dragend` | Fires on the tree an item was dragged from, once a drop took it - on a move it has left (with its subtree). <code>detail</code>: <code>DataTreeDragEndDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records dragged - the item and everything under it (on a move they have left this tree)</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' or 'copy'</td></tr><tr><td><code>target</code></td><td><code>HTMLElement</code></td><td>the component that took them</td></tr></table> |
| `data-tree-drop` | Fires after dropped records were written into the tree - as inserted, with new ids where they needed one. <code>detail</code>: <code>DataTreeDropDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records as they were inserted</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' or 'copy'</td></tr><tr><td><code>source</code></td><td><code>HTMLElement \| null</code></td><td>the component they came from; null from another document</td></tr><tr><td><code>at</code></td><td><code>DataTreeDropAt</code></td><td>where they landed</td></tr></table> |
| `data-tree-edit` | Fires after an edited value was written - the new record, the field, the new and the old value. <code>detail</code>: <code>DataTreeEditDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record as it is now (a new object - the old one is never mutated)</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the field that edited</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the value written</td></tr><tr><td><code>oldValue</code></td><td><code>unknown</code></td><td>the value it held</td></tr></table> |
| `data-tree-select` | Fires when an item is selected (click, Enter, Space) - its record and its tree meta (depth, hasChildren ...). <code>detail</code>: <code>DataTreeSelectDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the selected record</td></tr><tr><td><code>meta</code></td><td><code>DataTreeMeta</code></td><td>where it sits in the tree</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `DataTreeBeforeDropDetail` | What data-tree-beforedrop carries - cancel it to refuse the drop. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records as they will be inserted (new ids where a copy or a taken id needs one)</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' (they leave their source) or 'copy'</td></tr><tr><td><code>source</code></td><td><code>HTMLElement \| null</code></td><td>the component they come from (a tree, a grid; this tree when they move within it); null from another document</td></tr><tr><td><code>at</code></td><td><code>DataTreeDropAt</code></td><td>where they land</td></tr></table> |
| `DataTreeBeforeEditDetail` | What data-tree-beforeedit carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record as it is</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the field that edits</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the value about to be written</td></tr><tr><td><code>oldValue</code></td><td><code>unknown</code></td><td>the value it holds now</td></tr></table> |
| `DataTreeDragEndDetail` | What data-tree-dragend carries - on the tree the records were dragged from. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records dragged - the item and everything under it (on a move they have left this tree)</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' or 'copy'</td></tr><tr><td><code>target</code></td><td><code>HTMLElement</code></td><td>the component that took them</td></tr></table> |
| `DataTreeDropAt` | Where records land in a tree: beside a record (before / after - its siblings), into it (its children), or at the end (roots). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>DataviewJsonValue \| null</code></td><td>the record the records land beside or into; null at the end</td></tr><tr><td><code>place</code></td><td><code>DropPlace</code></td><td>'before', 'after', 'into' or 'end'</td></tr></table> |
| `DataTreeDropDetail` | What data-tree-drop carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records as they were inserted</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' or 'copy'</td></tr><tr><td><code>source</code></td><td><code>HTMLElement \| null</code></td><td>the component they came from; null from another document</td></tr><tr><td><code>at</code></td><td><code>DataTreeDropAt</code></td><td>where they landed</td></tr></table> |
| `DataTreeEditContext` | Where an edit happens - what getEditorFn and validateFn receive. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record being edited (unchanged until the edit commits)</td></tr><tr><td><code>meta</code></td><td><code>DataTreeMeta</code></td><td>where it sits in the tree</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the field that edits (data-edit-field, else the label field)</td></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the type it edits as (data-editor, else from the value)</td></tr><tr><td><code>rules</code></td><td><code>EditorRules</code></td><td>the tree's rules (data-required, data-min-length, data-max-length, data-pattern)</td></tr><tr><td><code>tree</code></td><td><code>HTMLElement</code></td><td>the tree element</td></tr></table> |
| `DataTreeEditDetail` | What data-tree-edit carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record as it is now (a new object - the old one is never mutated)</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the field that edited</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the value written</td></tr><tr><td><code>oldValue</code></td><td><code>unknown</code></td><td>the value it held</td></tr></table> |
| `DataTreeMeta` | Where a record sits in the tree - what render() and data-tree-select receive. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>depth</code></td><td><code>number</code></td><td>0 for a root</td></tr><tr><td><code>hasChildren</code></td><td><code>boolean</code></td><td>whether it has child records</td></tr><tr><td><code>isExpanded</code></td><td><code>boolean</code></td><td>whether its branch is open</td></tr><tr><td><code>isMatch</code></td><td><code>boolean</code></td><td>whether it matches the filters (false for an ancestor shown for a match)</td></tr><tr><td><code>isSelected</code></td><td><code>boolean</code></td><td>whether it is the selected record</td></tr><tr><td><code>parentId</code></td><td><code>DataviewJsonValue \| null</code></td><td>its parent's id, null for a root</td></tr></table> |
| `DataTreeOptions` | What setSource() takes besides the records. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>getEditorFn?</code></td><td><code>(field: string, value: unknown, ctx: DataTreeEditContext) =&gt; HTMLElement \| CellEditor \| null \| false</code></td><td>an editor for an item (data-editable on the tree): an element or a CellEditor; null: the built-in Input; false: this item does not edit</td></tr><tr><td><code>validateFn?</code></td><td><code>(field: string, value: unknown, ctx: DataTreeEditContext) =&gt; string \| false \| null \| undefined</code></td><td>refuse a value: return a message, or false for a generic one; anything else accepts it</td></tr><tr><td><code>idField?</code></td><td><code>string</code></td><td>the id field (default 'id', or data-id-field)</td></tr><tr><td><code>parentIdField?</code></td><td><code>string</code></td><td>the parent-id field (default 'parentId', or data-parent-field)</td></tr><tr><td><code>render?</code></td><td><code>(el: HTMLElement, record: DataviewRow, meta: DataTreeMeta) =&gt; void</code></td><td>fill an item's label yourself (default: the data-label-field value as text)</td></tr><tr><td><code>query?</code></td><td><code>DataTreeQuery</code></td><td>the starting view (a kept view wins over it)</td></tr><tr><td><code>persist?</code></td><td><code>ViewPersistence</code></td><td>where the view is kept between visits (default: session storage under a generated key)</td></tr></table> |
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

Keyboard (APG tree): Up / Down Arrow move, Right Arrow opens a branch, then steps into it, Left
Arrow closes it or goes to the parent, Home / End, Page Up / Down, Enter or Space
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
- **Aggregated branches**: the records may be groups instead of raw rows - one
  [defuss-dataview/compute](https://www.npmjs.com/package/defuss-dataview)
  `aggregate` plan per level (`groupBy` one key more each), a group's key path
  its id and the path without its last key its parent; a `render` label shows
  the measures.
- Give the tree a height; with none it collapses.
