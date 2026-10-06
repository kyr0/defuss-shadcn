---
name: Data Grid
type: ATM
section: big-data
why: One scroll container with a sticky head and a windowed body - only the rows on screen exist, sticky columns need no JS - while every query (multisort, column filters, pages) runs locally over all rows through defuss-dataview.
when: Tables of thousands to millions of records that people sort, filter, lock columns of, page through or load as they scroll; with parents (data-parent-field) a tree grid. A plain table when every row can exist at once; a virtual list for one column.
where: dist/components/data-grid/data-grid.css + dist/components/data-grid/data-grid.js
supportedStates: default, loading, empty
---

# Pattern: Data Grid

## Native basis
An ARIA [grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) (or
[treegrid](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/)) of `div`s: ONE
scroll container holds a `position: sticky` head and a body whose height
stands in for every row, with a small pool of recycled rows inside it. The
head and each row lay out the same CSS grid tracks, so they scroll sideways
together, and locked columns are `position: sticky` cells - no scroll syncing
in JS. Queries run over plain record arrays through
[defuss-dataview](https://www.npmjs.com/package/defuss-dataview) (the shared
`dataSource`, also `df$.dataview`); a query's full result is computed once and
every window or page is a slice of it.

---

## Native Web APIs
- [`position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky) - the head stays on top, locked columns stay at the start, inside one scroll container
- [CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) - head, filter row and every body row share one track template (`--data-grid-template`)
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the last locked column draws the edge the rest scrolls under
- [`mask`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask) - pin and pager icons are masks over `currentColor`
- [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - `data-format="number" | "currency:EUR" | "percent"` cells
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - the window and the sticky offsets follow the container
- [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - one render per frame however many scroll events arrive
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - initializes grids added after load
- [WAI-ARIA grid / treegrid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) - `aria-rowcount`, `aria-rowindex`, `aria-colindex`, `aria-sort`, `aria-selected`, `aria-level`, `aria-expanded`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

Author the head; the component builds the filter row, the row pool and the
footer, and the records come from JavaScript:

```html
<div class="data-grid" id="orders" aria-label="Orders" data-select="multiple"
     data-empty-text="No orders match." style="height: 28rem;">
  <div class="data-grid-viewport">
    <div class="data-grid-head">
      <div class="data-grid-row">
        <div class="data-grid-header" data-field="id" data-type="number" data-format="" data-width="6rem" data-locked>ID</div>
        <div class="data-grid-header" data-field="customer" data-width="12rem" data-filter="text">Customer</div>
        <div class="data-grid-header" data-field="region" data-width="8rem" data-filter="select" data-options="EU,US,APAC">Region</div>
        <div class="data-grid-header" data-field="amount" data-type="number" data-format="currency:EUR" data-width="9rem" data-filter="number">Amount</div>
      </div>
    </div>
    <div class="data-grid-body"></div>
  </div>
</div>
```

```js
const { dataGrid } = df$.shadcn;
dataGrid.setSource(document.getElementById('orders'), orders);   // an array of objects
```

### Tree grid (every row may have a parent)

`data-parent-field` names the field holding a row's parent id
(`data-id-field`, default `id`). The grid becomes `role="treegrid"`: the first
column indents by depth and carries the expand toggle; filters keep the
ancestors of every match and open the way to it; sorting orders siblings;
pages and infinite loading walk the visible rows.

```html
<div class="data-grid" aria-label="Files" data-parent-field="parentId" style="height: 24rem;">
  <div class="data-grid-viewport">
    <div class="data-grid-head">
      <div class="data-grid-row">
        <div class="data-grid-header" data-field="name" data-width="16rem" data-filter="text">Name</div>
        <div class="data-grid-header" data-field="size" data-type="number" data-width="8rem">Size</div>
      </div>
    </div>
    <div class="data-grid-body"></div>
  </div>
</div>
```

### Custom cells and remote pages

```js
dataGrid.setSource(grid, rows, {
  cells: {
    status: (el, record) => {           // el is a fresh .data-grid-content span
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = record.status;
      el.append(badge);
    },
  },
});

// data-paging="infinite": load(offset, size) → Promise<records[]>; [] ends it
dataGrid.setSource(logGrid, [], { load: (offset, size) => fetchPage(offset, size) });

// the starting query, and where the view is kept (a kept view wins over the starting query)
dataGrid.setSource(grid, rows, {
  query: { sorters: [{ field: 'date', direction: 'desc' }] },
  persist: { area: 'local', prefix: 'my-app' },   // key my-app:data-grid:<id>; or { key } / { area: 'none' }
});
```

The view (sort, filters, locked columns, open rows) is kept **for the session by
default** - a reload finds the grid as it was left - under a generated key
(`defuss-shadcn:<page path>:data-grid:<id>`). `data-persist` / `data-persist-prefix` /
`data-persist-key` (or `persist`) change where; the selection and the open page are per visit.

---

## Variants

| Attribute | Element | Behaviour |
|-----------|---------|-----------|
| `data-paging="virtual"` (default) | `.data-grid` | Every row of the query, windowed |
| `data-paging="pages"` | `.data-grid` | `data-page-size` rows a page, a pager in the footer; `config.page` (0-based) |
| `data-paging="infinite"` | `.data-grid` | Pages are added as the end nears - from the records, then from `load()` |
| `data-page-size` | `.data-grid` | Rows a page (default 50) |
| `data-select="single"` / `"multiple"` | `.data-grid` | Click / Space select; multiple: Ctrl/Meta toggles, Shift selects a range |
| `data-parent-field` / `data-id-field` | `.data-grid` | A tree grid |
| `data-persist="session\|local\|none"` | `.data-grid` | Where the view (sort, filters, locked columns, open rows) is kept: session storage (the default), local storage, or nowhere |
| `data-persist-prefix` | `.data-grid` | The generated key's start (default `defuss-shadcn:<page path>`; the key is `<prefix>:data-grid:<id>`) |
| `data-persist-key` | `.data-grid` | The whole key - e.g. one view shared by several pages |
| `data-empty-text` | `.data-grid` | Shown in the `empty` state |
| `data-field` | `.data-grid-header` | The record field of the column (required) |
| `data-type="number"` | `.data-grid-header` | Right-aligned, tabular figures, numeric filter |
| `data-format` | `.data-grid-header` | `number` · `currency:EUR` · `percent` · `date`; `""` = raw value |
| `data-width` | `.data-grid-header` | A grid track: `9rem`, `minmax(8rem, 1fr)` (default) |
| `data-filter="text" \| "number" \| "select"` | `.data-grid-header` | A filter input in the filter row; select options from `data-options="A,B"` or the data |
| `data-locked` | `.data-grid-header` | Locked from the start; the pin locks / unlocks at runtime |
| `data-sort="asc\|desc"` | `.data-grid-header` | The starting sort (several headers: a multisort in column order) |
| `data-sort-field` | `.data-grid-header` | Sort this column by another field (a priority by its rank, not its label) |
| `data-sortable="false"` / `data-lockable="false"` | `.data-grid-header` | Opt a column out |

## Custom properties

| Property | Default | Purpose |
|----------|---------|---------|
| `--data-grid-row-height` | `36px` | Uniform row height (px) - the scroll maths reads it |
| `--data-grid-template` | (set by the component) | The column tracks, in display order |

---

## States

| State | Meaning |
|-------|---------|
| `default` | The rows of the query - `config` IS the query (below); a query nothing matches lands in `empty` |
| `loading` | Busy: skeleton rows, `aria-busy="true"` - a grid without records (or waiting for `load()`) starts here |
| `empty` | No rows: `data-empty-text` |

The config of every state is the query, merged on each `setState` (pass a
key to change it): `{ filters, sorters, locked, page, expanded, collapsed,
selected }` - dataview's own filter (`{ field, op, value }`) and sorter
(`{ field, direction }`) shapes. It is `el.store.value.config`: subscribe to
follow it, set it to drive the grid.

```js
const grid = document.querySelector('#orders');
grid.api.setState('default', { sorters: [{ field: 'amount', direction: 'desc' }, { field: 'region' }] });
grid.api.setState('default', { filters: [{ field: 'region', op: 'eq', value: 'EU' }], page: 0 });
grid.api.setState('loading');
grid.store.subscribe((state) => console.log(state.config.selected));
df$.shadcn.dataGrid.query(grid, { locked: ['id', 'customer'] });
```

The registry globals are `df$.shadcn.dataGridApi` / `df$.shadcn.dataGridStates`;
`df$.shadcn.dataGrid` has `setSource`, `query`, `rows`, `selected`,
`expandAll`, `collapseAll`.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type DataGridState = 'default' | 'loading' | 'empty'</code> - `setState(name, config)` takes the config of the state it names (`DataGridStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The rows of the query; a query nothing matches lands in empty. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a tree grid shows a match with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the sort order - several sorters sort by each in turn</td></tr><tr><td><code>locked?</code></td><td><code>string[]</code></td><td>the fields of the locked columns, pinned to the start in this order</td></tr><tr><td><code>page?</code></td><td><code>number</code></td><td>the page shown, 0-based (data-paging="pages")</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid: the ids of the open rows</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid, while filtering: the rows the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the selected rows</td></tr></table> |
| `loading` | Busy: skeleton rows, aria-busy - a grid without records (or waiting for load()) starts here. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a tree grid shows a match with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the sort order - several sorters sort by each in turn</td></tr><tr><td><code>locked?</code></td><td><code>string[]</code></td><td>the fields of the locked columns, pinned to the start in this order</td></tr><tr><td><code>page?</code></td><td><code>number</code></td><td>the page shown, 0-based (data-paging="pages")</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid: the ids of the open rows</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid, while filtering: the rows the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the selected rows</td></tr></table> |
| `empty` | No rows: the data-empty-text shows. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a tree grid shows a match with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the sort order - several sorters sort by each in turn</td></tr><tr><td><code>locked?</code></td><td><code>string[]</code></td><td>the fields of the locked columns, pinned to the start in this order</td></tr><tr><td><code>page?</code></td><td><code>number</code></td><td>the page shown, 0-based (data-paging="pages")</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid: the ids of the open rows</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid, while filtering: the rows the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the selected rows</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends DataGridState&gt;(name: S, config?: DataGridStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DataGridStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: DataGridState; config: DataGridStateConfigs[DataGridState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: DataGridState; config: DataGridStateConfigs[DataGridState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: DataGridState; config: DataGridStateConfigs[DataGridState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: DataGridState; config: DataGridStateConfigs[DataGridState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: DataGridState; config: DataGridStateConfigs[DataGridState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.dataGridApi.setState&lt;S extends DataGridState&gt;(el: HTMLElement, name: S, config?: DataGridStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DataGridStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.dataGridApi.getState(el: HTMLElement): { name: DataGridState; config: DataGridStateConfigs[DataGridState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: DataGridState; config: DataGridStateConfigs[DataGridState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.dataGridApi.render(state: { name: DataGridState; config: DataGridStateConfigs[DataGridState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: DataGridState; config: DataGridStateConfigs[DataGridState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.dataGridApi.store(el: HTMLElement): Store&lt;{ name: DataGridState; config: DataGridStateConfigs[DataGridState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: DataGridState; config: DataGridStateConfigs[DataGridState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.dataGridApi.commit&lt;S extends DataGridState&gt;(el: HTMLElement, name: S, config?: DataGridStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>DataGridStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.dataGridStates: DataGridState[]</code> | The declared states, 'default' first: <code>default</code>, <code>loading</code>, <code>empty</code>. |

### `df$.shadcn.dataGrid`

| Member | Description |
|---|---|
| <code>setSource(target: string \| HTMLElement, rows: DataviewRow[], options: DataGridOptions = {}): void</code> | Hand the grid its records. Options: idField ('id'), parentIdField (a tree grid; or data-parent-field), cells ({ field: (el, record, meta) }) custom cell content, load(offset, size) → Promise&lt;records[]&gt; for data-paging="infinite" from a remote source, query ({ sorters, filters, locked, ... }) the starting query, persist ({ area: 'session' \| 'local' \| 'none', prefix, key }) where the view is kept - a kept view wins over the starting query. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr><tr><td><code>rows</code></td><td><code>DataviewRow[]</code></td><td>the records (a tree grid: a flat list linked by parent id)</td></tr><tr><td><code>options</code></td><td><code>DataGridOptions</code> = <code>{}</code></td><td>fields, custom cells, a remote loader, the starting view and its persistence</td></tr></table> |
| <code>query(target: string \| HTMLElement, patch: DataGridQuery): void</code> | Merge into the query: { filters?, sorters?, locked?, page?, expanded?, selected? }. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr><tr><td><code>patch</code></td><td><code>DataGridQuery</code></td><td>the query keys to change</td></tr></table> |
| <code>rows(target: string \| HTMLElement): DataviewRow[]</code> | The records the query shows. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> <b>Returns</b> <code>DataviewRow[]</code> - the records in query order, every page |
| <code>selected(target: string \| HTMLElement): DataviewRow[]</code> | The selected records. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> <b>Returns</b> <code>DataviewRow[]</code> - the selected records, in source order |
| <code>selectAll(target: string \| HTMLElement): void</code> | Select every row the query shows (data-select="multiple"). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> |
| <code>clearSelection(target: string \| HTMLElement): void</code> | Select nothing. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> |
| <code>expandAll(target: string \| HTMLElement): void</code> | Tree grid: open every branch. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> |
| <code>collapseAll(target: string \| HTMLElement): void</code> | Tree grid: close every branch (while filtering: the ways to the matches too). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `data-grid-activate` | Fires on Enter on a row - its record and its position in the query. <code>detail</code>: <code>DataGridActivateDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the row's record</td></tr><tr><td><code>index</code></td><td><code>number</code></td><td>its position in the query (every page)</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `DataGridActivateDetail` | What data-grid-activate carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the row's record</td></tr><tr><td><code>index</code></td><td><code>number</code></td><td>its position in the query (every page)</td></tr></table> |
| `DataGridOptions` | What setSource() takes besides the records. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>idField?</code></td><td><code>string</code></td><td>the id field (default 'id', or data-id-field)</td></tr><tr><td><code>parentIdField?</code></td><td><code>string</code></td><td>a tree grid: the parent-id field (or data-parent-field)</td></tr><tr><td><code>cells?</code></td><td><code>Record&lt;string, (el: HTMLElement, record: DataviewRow, meta: DataGridRowMeta) =&gt; void&gt;</code></td><td>custom cell content per field: fill the cell's content element</td></tr><tr><td><code>load?</code></td><td><code>(offset: number, size: number) =&gt; Promise&lt;DataviewRow[]&gt;</code></td><td>data-paging="infinite" from a remote source: the next records from offset (an empty answer ends the loading)</td></tr><tr><td><code>query?</code></td><td><code>DataGridQuery</code></td><td>the starting query (a kept view wins over it)</td></tr><tr><td><code>persist?</code></td><td><code>ViewPersistence</code></td><td>where the view is kept between visits (default: session storage under a generated key)</td></tr></table> |
| `DataGridQuery` | The grid's query - its state config (merged on every query()). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a tree grid shows a match with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the sort order - several sorters sort by each in turn</td></tr><tr><td><code>locked?</code></td><td><code>string[]</code></td><td>the fields of the locked columns, pinned to the start in this order</td></tr><tr><td><code>page?</code></td><td><code>number</code></td><td>the page shown, 0-based (data-paging="pages")</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid: the ids of the open rows</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid, while filtering: the rows the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the selected rows</td></tr></table> |
| `DataGridRowMeta` | Where a record sits - what a custom cell receives. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>depth</code></td><td><code>number</code></td><td>tree grid: 0 for a root row</td></tr><tr><td><code>hasChildren</code></td><td><code>boolean</code></td><td>tree grid: whether it has child rows</td></tr><tr><td><code>isExpanded</code></td><td><code>boolean</code></td><td>tree grid: whether its children show</td></tr><tr><td><code>isMatch</code></td><td><code>boolean</code></td><td>whether it matches the filters (false for an ancestor shown for a match)</td></tr><tr><td><code>isSelected</code></td><td><code>boolean</code></td><td>whether it is selected</td></tr><tr><td><code>parentId</code></td><td><code>DataviewJsonValue \| null</code></td><td>tree grid: its parent's id, null for a root</td></tr></table> |

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `aria-label` | `.data-grid` | Always - names the grid |
| `role="grid"` / `"treegrid"` | `.data-grid` | Set by the component (`treegrid` with `data-parent-field`) |
| `aria-rowcount` / `aria-colcount` | `.data-grid` | Set: every row of the query + the header (and filter) rows |
| `aria-multiselectable="true"` | `.data-grid` | With `data-select="multiple"` |
| `role="columnheader"` + `aria-sort` | `.data-grid-header` | Set; `data-sort-index` numbers a multisort |
| `role="row"` + `aria-rowindex` | `.data-grid-row` | Set per recycled row against the real position |
| `role="gridcell"` + `aria-colindex` | `.data-grid-cell` | Set |
| `aria-selected` | `.data-grid-row` | With `data-select` |
| `aria-level` / `aria-expanded` | `.data-grid-row` | Tree grid |
| `aria-busy="true"` | `.data-grid` | In `loading` |

Keyboard (APG grid): arrows move cell by cell (Up from the first row reaches
the header), Home / End the row's ends, Ctrl+Home / Ctrl+End the first / last
row, Page Up / Down a screen, Space selects (Shift: a range), Enter on a header
sorts (Shift+Enter adds it), Enter on a row fires `data-grid-activate`. Tree
grid, first column: → opens / ← closes or goes to the parent.

---

## Notes
- **Row height is uniform and known** (`--data-grid-row-height`, px). A cell
  that renders taller is clipped.
- **A filter is case-insensitive** - text matches anywhere, numbers take `>`
  `>=` `<` `<=` `=` `!=` (`> 100`), a select matches exactly. All filters combine.
- **Multisort**: a click sorts by that column alone (asc → desc → off);
  Shift+click adds it to the sort (or cycles it in place).
- **Locking moves the column into the sticky group** at the start (authored
  order kept) - the head and every row reorder together.
- **Rows are recycled** - put one delegated listener on the grid and read the
  record through `df$.shadcn.dataGrid.rows(grid)[row.dataset.index]`, or listen
  to `data-grid-activate`.
- **Queries scan every row once** - 100,000 rows filter and multisort in tens of
  milliseconds; the result is cached until the query or the rows change, so
  scrolling and selecting never re-run it.
