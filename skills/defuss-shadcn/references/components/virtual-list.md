---
name: Virtual List
type: ATM
section: big-data
why: Only the rows on screen exist in the DOM and their elements are recycled, so ten rows and ten million cost the same; records behind a defuss-dataview source filter and sort locally.
when: Lists too long to render, such as search results, logs, pickers over large sets. Use a plain list or table when every row can exist at once; a Data Grid for columns, a Data Tree for a hierarchy.
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
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - the visible window depends on the container's height, not only on scrolling
- [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - one render per frame however many scroll events arrive
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - initializes lists added after load (SPA navigation)
- [`contain: strict`](https://developer.mozilla.org/en-US/docs/Web/CSS/contain) - the browser need not look outside the list when laying out or painting
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) - reaching an end does not start scrolling the page
- [`scrollbar-gutter`](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-gutter) - no layout shift when the scrollbar appears
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus ring on the container
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses the loading pulse
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - Windows High Contrast Mode support

---

## Structure

The element is empty in markup; the sizer, the row pool and every row are
created by the component:

```html
<div class="virtual-list" id="results" aria-label="Search results"
     style="height: 24rem;"></div>
```

Give it data:

```js
const { virtualList } = df$.shadcn;

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

`count` may be any number the platform can hold; nothing is allocated per row.
`renderRow(rowElement, index)` fills a **recycled** element, so it must not
assume the element is empty or new.

### Records: filter and sort locally

`setSource` hands the list an array of records instead of a count. A
[defuss-dataview](https://www.npmjs.com/package/defuss-dataview) source backs
it (the shared `dataSource`, also `df$.dataview`): filters and sorting run
over every record, and the query is the list's state config -
`el.store.value.config = { filters, sorters }`.

```js
virtualList.setSource(list, people, {
  render: (row, person, { index }) => {     // a recycled row + its record
    row.textContent = '';
    row.append(person.name);
  },
});
virtualList.query(list, { sorters: [{ field: 'age', direction: 'desc' }] });
list.store.subscribe(() => console.log(virtualList.rows(list).length, 'shown'));
```

Query controls need no listener code - point them at the list's id:

```html
<input data-virtual-list-filter="people" data-field="name" aria-label="Filter by name">
<input data-virtual-list-filter="people" data-field="age" data-kind="number" aria-label="Age, e.g. > 40">
<select data-virtual-list-sort="people" aria-label="Sort">
  <option value="">Source order</option>
  <option value="name:asc">Name A–Z</option>
  <option value="age:desc">Oldest first</option>
</select>
<div class="virtual-list" id="people" aria-label="People" style="height: 20rem;"></div>
```

Filters are case-insensitive (text matches anywhere, `data-kind="number"`
takes `> 40`, `<= 30`, `!= 0`), and several filters on one list combine. A
query nothing matches lands in `empty`.

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

The row height must fit a whole tile; it still governs the scroll maths. A
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
| `data-virtual-list-filter="id"` (+ `data-field`, `data-kind`) | any `<input>` | Filters that source-backed list as you type |
| `data-virtual-list-sort="id"` | any `<select>` | Sorts it by the option value `field:asc` / `field:desc` (`""` = source order) |

## Custom properties

| Property | Default | Purpose |
|----------|---------|---------|
| `--virtual-list-row-height` | `40px` | Row height, and the only way to set it. Every row is this tall; the scroll maths reads this value. A grid tile wants a different height from a text row, so there is no fixed size scale |

---

## States

| State | Meaning |
|-------|---------|
| `default` | Rows are rendered. `config.index` scrolls that row into view; with a source, `config.filters` / `config.sorters` are the query (a config merges - `{ index }` keeps the query) |
| `loading` | Placeholder rows; the list is marked `aria-busy` |
| `empty` | No rows; shows `data-empty-text` |

```js
const list = document.querySelector('#results');
list.api.setState('default', { index: 9_999_990 });   // jump to a row
list.api.setState('loading');
list.api.setState('empty');
list.api.getState();                                   // → { name, config }
list.store.subscribe((state) => console.log(state));   // el.store: the same state, observable
```

The registry globals are `df$.shadcn.virtualListApi` and
`df$.shadcn.virtualListStates`.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type VirtualListState = 'default' | 'loading' | 'empty'</code> - `setState(name, config)` takes the config of the state it names (`VirtualListStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Rows rendered. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>index?</code></td><td><code>number</code></td><td>scroll this row into view (a one-off: not kept in the stored config)</td></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>with a source: filters over every record</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>with a source: the order</td></tr></table> |
| `loading` | Placeholder rows; the list is aria-busy. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>with a source: filters over every record</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>with a source: the order</td></tr></table> |
| `empty` | No rows - the data-empty-text shows. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>with a source: filters over every record</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>with a source: the order</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends VirtualListState&gt;(name: S, config?: VirtualListStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>VirtualListStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: VirtualListState; config: VirtualListStateConfigs[VirtualListState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: VirtualListState; config: VirtualListStateConfigs[VirtualListState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: VirtualListState; config: VirtualListStateConfigs[VirtualListState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: VirtualListState; config: VirtualListStateConfigs[VirtualListState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: VirtualListState; config: VirtualListStateConfigs[VirtualListState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.virtualListApi.setState&lt;S extends VirtualListState&gt;(el: HTMLElement, name: S, config?: VirtualListStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>VirtualListStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.virtualListApi.getState(el: HTMLElement): { name: VirtualListState; config: VirtualListStateConfigs[VirtualListState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: VirtualListState; config: VirtualListStateConfigs[VirtualListState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.virtualListApi.render(state: { name: VirtualListState; config: VirtualListStateConfigs[VirtualListState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: VirtualListState; config: VirtualListStateConfigs[VirtualListState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.virtualListApi.store(el: HTMLElement): Store&lt;{ name: VirtualListState; config: VirtualListStateConfigs[VirtualListState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: VirtualListState; config: VirtualListStateConfigs[VirtualListState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.virtualListApi.commit&lt;S extends VirtualListState&gt;(el: HTMLElement, name: S, config?: VirtualListStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>VirtualListStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.virtualListStates: VirtualListState[]</code> | The declared states, 'default' first: <code>default</code>, <code>loading</code>, <code>empty</code>. |

### `df$.shadcn.virtualList`

| Member | Description |
|---|---|
| <code>setData(list: HTMLElement, count: number, renderRow?: (row: HTMLElement, index: number) =&gt; void): void</code> | An index range instead of records: count rows, renderRow(row, index) fills a recycled element - nothing is stored per row. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>list</code></td><td><code>HTMLElement</code></td><td>the .virtual-list element</td></tr><tr><td><code>count</code></td><td><code>number</code></td><td>how many rows (floored, at least 0; 0 shows the empty state)</td></tr><tr><td><code>renderRow?</code></td><td><code>(row: HTMLElement, index: number) =&gt; void</code></td><td>fills the recycled element of row `index`; omitted, the last one given stays</td></tr></table> |
| <code>setSource(list: HTMLElement, rows: DataviewRow[], { render, idField = 'id', query = {} }: VirtualListSourceOptions = {}): void</code> | Records instead of a count: `rows` is any array of objects, `render(el, record, { index })` fills a recycled element. Filters and multisort run over every row (defuss-dataview); `query` is the first one. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>list</code></td><td><code>HTMLElement</code></td><td>the .virtual-list element</td></tr><tr><td><code>rows</code></td><td><code>DataviewRow[]</code></td><td>the records</td></tr><tr><td><code>{ render, idField = 'id', query = {} }</code></td><td><code>VirtualListSourceOptions</code> = <code>{}</code></td><td>render, the id field and the first query</td></tr></table> |
| <code>query(list: HTMLElement, query: VirtualListQuery): void</code> | Run a query (merged into the stored one): { filters?, sorters? }. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>list</code></td><td><code>HTMLElement</code></td><td>the .virtual-list element</td></tr><tr><td><code>query</code></td><td><code>VirtualListQuery</code></td><td>the keys to change</td></tr></table> |
| <code>rows(list: HTMLElement): DataviewRow[]</code> | The rows the current query shows. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>list</code></td><td><code>HTMLElement</code></td><td>the .virtual-list element</td></tr></table> <b>Returns</b> <code>DataviewRow[]</code> - the records, in list order ([] for an index range from setData) |

### Types

| Type | Description |
|---|---|
| `VirtualListQuery` | A query over the list's records - merged into the stored one. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the order - several sorters sort by each in turn</td></tr></table> |
| `VirtualListSourceOptions` | What setSource() takes besides the records. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>render?</code></td><td><code>(el: HTMLElement, record: DataviewRow, context: { index: number }) =&gt; void</code></td><td>fill a recycled row element for a record (default: the id as text)</td></tr><tr><td><code>idField?</code></td><td><code>string</code></td><td>the id field (default 'id')</td></tr><tr><td><code>query?</code></td><td><code>VirtualListQuery</code></td><td>the first query</td></tr></table> |

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `aria-label` | `.virtual-list` | Always: names the list |
| `role="list"` | `.virtual-list` | Set by the component |
| `role="listitem"` | `.virtual-list-row` | Set by the component (single column) |
| `role="grid"` / `role="row"` / `role="gridcell"` | list / row / cell | Set by the component when `data-columns` is above 1, with `aria-rowcount`, `aria-colcount`, `aria-rowindex` and `aria-colindex` |
| `aria-posinset` / `aria-setsize` | `.virtual-list-row` | Set per row; without them a screen reader would announce only the handful of rows that happen to exist |
| `aria-busy="true"` | `.virtual-list` | While in the `loading` state |

---

## Notes
- **Row height is uniform and must be known.** The scroll maths depends on it;
  a row that renders taller than `--virtual-list-row-height` is clipped. Set it
  per instance; there is deliberately no `data-size` scale, since the right
  height depends on what a row holds.
- **Very long lists are scaled, not clamped.** Browsers cap element height
  (Chrome around 33.5M px), so ten million 40px rows cannot have a true sizer.
  Past 15M px the sizer is capped and scroll positions are mapped onto the real
  range: the last row stays reachable, and the only cost is scrollbar
  granularity nobody can perceive at that length.
- **Rows are recycled**, so `renderRow` must fully overwrite the element. Do not
  attach one-off listeners to a row; put a single delegated listener on the
  list and read `row.dataset.index`.
- The container is focusable, so arrow keys, Page Up/Down and Home/End scroll it
  natively.
- Give the container a height. With none it collapses and no rows are visible.
