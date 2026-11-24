---
name: Data Grid
type: ATM
section: big-data
why: One scroll container with a sticky head and a windowed body - only the rows on screen exist, sticky columns need no JS - while every query (multisort, column filters, pages) runs locally over all rows through defuss-dataview.
when: Tables of thousands to millions of records that people sort, filter, arrange (move, lock, hide, resize columns), select by row (with checkboxes), cell range or column, copy to and paste from a spreadsheet, drag rows between grids and trees, page through or load as they scroll; with parents (data-parent-field) a tree grid. A plain table when every row can exist at once; a virtual list for one column.
where: dist/components/data-grid/data-grid.css + dist/components/data-grid/data-grid.js
supportedStates: default, loading, empty
---

# Pattern: Data Grid

## Native basis
An ARIA [grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) (or
[treegrid](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/)) of `div`s: ONE
scroll container - the grid element itself - holds a `position: sticky` head and a body whose height
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
- [`mask`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask) - menu, sort and pager icons are masks over `currentColor`
- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - the column menu: top layer, light dismiss, Escape
- [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - the menu hangs from the arrow it opened from and flips where there is no room
- [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) + [`setPointerCapture()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - one code path for mouse, pen and touch: drag a header, drag an edge, hold a header
- [`touch-action`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) / [`pointer: coarse`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer) - a finger drags an edge without scrolling; the arrow, the edge and the menu items grow for fingers
- [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - `data-format="number" | "currency:EUR" | "percent"` cells
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - the window and the sticky offsets follow the container
- [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - one render per frame however many scroll events arrive
- [`overflow-anchor: none`](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor) - the runtime owns the scroll position: browser scroll anchoring would follow the recycled rows and keep scrolling by itself (Firefox)
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - initializes grids added after load
- [Clipboard events](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent) (`copy` / `paste` + `DataTransfer`) - Ctrl / Cmd + C puts the selection on the clipboard as tab-separated values and an HTML table, Ctrl / Cmd + V reads text back - no permission prompt, also in a sandboxed frame
- [HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) (`draggable`, `DataTransfer`, `dropEffect`) - rows drag between grids and Data Trees (`data-drag` / `data-drop`), to another window or into a spreadsheet
- [WAI-ARIA grid / treegrid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) - `aria-rowcount`, `aria-rowindex`, `aria-colindex`, `aria-sort`, `aria-selected`, `aria-level`, `aria-expanded`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

Author the head; the component builds the filter row, the row pool, the
footer and each header's tools (the menu arrow, the resize edge), and the
records come from JavaScript:

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

// its query source: the records, cached queries, and aggregation over the rows its filters match - a chart
// bound to it (df$.shadcn.chart.bind with follow: grid) groups exactly what the grid shows
const source = dataGrid.source(grid);
source.aggregate({ filters: grid.store.value.config.filters }, { groupBy: 'region' }); // { rows, matchedRows, totalRows }

// the starting query, and where the view is kept (a kept view wins over the starting query)
dataGrid.setSource(grid, rows, {
  query: { sorters: [{ field: 'date', direction: 'desc' }] },
  persist: { area: 'local', prefix: 'my-app' },   // key my-app:data-grid:<id>; or { key } / { area: 'none' }
});
```

### Arranging columns

Every header carries an arrow at its end that opens the **column menu**: Sort
ascending / Sort descending, a **Lock column** checkbox, a **Columns** list
with a checkbox per column (shown or hidden; the last shown one stays) and
**Reset columns** (the authored order, lock, visibility and widths). A press
on a header that moves **drags the column** to another place - a marker shows
the gap it lands in; dropped among the locked columns it locks, past them it
unlocks. The **end edge of a header resizes** its column (a double click gives
it its authored width again). Right click opens the menu too.

**Touch**: a tap sorts; a finger that **rests** on a header (about half a
second) lifts the column - drag it, or let go where it is for the menu; the
end edge drags at once. On coarse pointers the arrow, the edge and the menu
items are larger.

The arrangement is the query - `columns` (every field in order), `hidden`,
`widths` (px) and `locked` - so code sets it like any other key, and it is
kept with the view:

```js
dataGrid.query(grid, { columns: ['id', 'amount', 'customer', 'region'], hidden: ['region'], widths: { customer: 240 } });
dataGrid.resetColumns(grid);   // what "Reset columns" does
```

The view (sort, filters, the columns' order, lock, visibility and widths, open rows) is kept **for the session by
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
| `data-select="single"` / `"multiple"` | `.data-grid` | Turns selection on: click / Space select; multiple: Ctrl/Meta toggles, Shift selects a range |
| `data-select-model="row"` (default) / `"checkbox"` / `"cell"` / `"column"` / `"row column"` | `.data-grid` | What a click, a key or a drag selects - see "Selection models" |
| `data-drag` (`"move"` / `"copy"` / both - the default) | `.data-grid` | Rows drag out, to another grid, a Data Tree or a spreadsheet - see "Drag and drop" |
| `data-drop` (`"move"` / `"copy"` / both - the default) | `.data-grid` | Dragged records drop in - see "Drag and drop" |
| `data-parent-field` / `data-id-field` | `.data-grid` | A tree grid |
| `data-persist="session\|local\|none"` | `.data-grid` | Where the view (sort, filters, the columns' arrangement, open rows) is kept: session storage (the default), local storage, or nowhere |
| `data-persist-prefix` | `.data-grid` | The generated key's start (default `defuss-shadcn:<page path>`; the key is `<prefix>:data-grid:<id>`) |
| `data-persist-key` | `.data-grid` | The whole key - e.g. one view shared by several pages |
| `data-empty-text` | `.data-grid` | Shown in the `empty` state |
| `data-field` | `.data-grid-header` | The record field of the column (required) |
| `data-type="number"` | `.data-grid-header` | Right-aligned, tabular figures, numeric filter |
| `data-format` | `.data-grid-header` | `number` · `currency:EUR` · `percent` · `date`; `""` = raw value |
| `data-width` | `.data-grid-header` | A grid track: `9rem`, `minmax(8rem, 1fr)` (default) |
| `data-filter="text" \| "number" \| "select"` | `.data-grid-header` | A filter input in the filter row; select options from `data-options="A,B"` or the data |
| `data-locked` | `.data-grid-header` | Locked from the start; the column menu locks / unlocks at runtime |
| `hidden` | `.data-grid-header` | Hidden from the start; the column menu shows it |
| `data-sort="asc\|desc"` | `.data-grid-header` | The starting sort (several headers: a multisort in column order) |
| `data-sort-field` | `.data-grid-header` | Sort this column by another field (a priority by its rank, not its label) |
| `data-sortable="false"` / `data-lockable="false"` / `data-hideable="false"` / `data-movable="false"` / `data-resizable="false"` | `.data-grid-header` | Opt a column out of sorting, locking, hiding, moving or resizing |
| `data-editable` | `.data-grid-header` | The column edits in place (see "Inline editing") |
| `data-editor` | `.data-grid-header` | The built-in editor: `string`, `number`, `boolean`, `enum` (choices from `data-options`), `color`, `date`, `text` - default: `number` for `data-type="number"`, else from the value |
| `data-required`, `data-min` / `data-max` / `data-integer` / `data-step`, `data-min-length` / `data-max-length` / `data-pattern`, `data-message` | `.data-grid-header` | The rules an edited value must keep (`data-message` replaces the broken rule's message) |
| `data-readonly` | `.data-grid` | No column edits |

### Selection models

`data-select` turns selection on, `data-select-model` says what a click, a key or a drag selects. Every model
is plain config - `selected` (row ids), `selectedColumns` (fields), `selectedRanges` (rectangles between two
cells, each a record id and a field) - so a page stores, sets and follows it like the rest of the query.

| Model | Click / tap | Keys | Drag |
|-------|-------------|------|------|
| `row` (default) | a row; Shift: the range from the last one; Ctrl / Cmd: toggle | Space toggles, Shift+Space a range, Shift+Arrow Up / Down extends | the rows it crosses |
| `checkbox` | the rows, as `row` does; a row's checkbox toggles its row (Shift: the range to it); the head's checkbox selects every row of the query (a tree grid: the rows its open branches show) or - all were - none (mixed while some are) | as `row` | the rows it crosses |
| `cell` | a cell; Shift: the rectangle to it; Ctrl / Cmd: add or remove a cell | the arrows select the cell they reach, Shift+arrows extend the rectangle, Space toggles | the rectangle it spans, like Excel |
| `column` | a cell or a header: its column; Shift: a range; Ctrl / Cmd: toggle | Space toggles, Shift+Arrow Left / Right extends | the columns it crosses |
| `row column` | a cell: its row; a header: its column - one kind at a time | Space: the row, Ctrl / Cmd+Space: the column, Shift+arrows extend either | the rows it crosses |

Ctrl / Cmd + A selects everything the model selects. In the column models a header click selects instead of
sorting - sort from the column menu or with Enter. Past an edge a drag scrolls on. A finger scrolls the grid; a
finger that rests on a cell for about half a second drags a selection instead.

The `checkbox` model puts the system's Checkbox (`checkbox.css` beside the grid's sheet) in a column of its own in
front of the rows - first whatever the
column order, sticky while the rest scrolls sideways, before a tree grid's indentation - and one in the head. Its
cells (`.data-grid-check`) are hidden from assistive technology: each row's `aria-selected` says what the box shows,
and Space selects from the keyboard. Switching `data-select-model` (or `data-select`, `data-drag`) on a live grid draws
it again.

Hover is a soft neutral tint (in the column models the whole column under the pointer); a selected cell is a
mid tint of `--primary` with a 2px `--primary` line along the edges of its region (`data-edge`), so hover and
selection never look alike. A selected cell under the pointer - the cell, its column or its row, by model - takes a
deeper tint of `--primary` and keeps its line: more selected, never the soft hover.

```js
grid.api.setState('default', { selectedRanges: [{ from: { id: 1, field: 'name' }, to: { id: 5, field: 'qty' } }] });
df$.shadcn.dataGrid.selectAll(grid);    // every row, column or cell - what Ctrl / Cmd + A does
```

### Copy and paste

**Ctrl / Cmd + C** copies the selection the way Excel and Google Sheets read it: tab-separated values, one line
per row, a value quoted when it holds a tab, a line break or a quote, plus an HTML table of the same values (Google
Docs, Word). Numbers stay plain and a date column's day is `YYYY-MM-DD`. What is copied: the selected rows with every
shown column, every row of the query with the selected columns, or the rows and columns the ranges touch (a cell
outside them stays empty). `data-grid-copy` follows; `df$.shadcn.dataGrid.copyText(grid)` returns the same text for a
page's own Copy button.

**Ctrl / Cmd + V** pastes text into editable columns (`data-editable`), and only into the selected cells:

- one selected cell is where the pasted block starts, and the block is selected afterwards;
- otherwise only the selected cells change - the selected rows from the first column, the selected columns from
  the first row, each range from its corner;
- a one-line clipboard fills every selected row, a one-column one every selected column; anything else lands once,
  in order, and what does not fit is cut.

Every value passes the column's editor type (numbers also in the grid's locale - `1,234.5`, `12 %`; booleans
`true` / `yes` / `1`; an option matched without case), its rules and `validateFn`, and `data-grid-beforeedit` may
cancel it. Cells of columns that do not edit are skipped. Everything is written at once, then `data-grid-edit`
fires per cell and `data-grid-paste` with the counts and the refused values.

```js
const { written, skipped, refused } = df$.shadcn.dataGrid.paste(grid, 'Bolt\t12\nNut\t40');
```

### Drag and drop

`data-drag` lets rows drag out, `data-drop` lets records drop in - between two grids, a grid and a Data Tree (a tree
grid's rows bring everything under them), within one grid, or out to a spreadsheet. The browser's Drag and Drop API
carries the drag; its effect is what the source allows (`data-drag`) and the target takes (`data-drop`): `move`,
`copy` or both, where Alt / Option or Ctrl held during the drag copies and anything else moves.

- A drag from a selected row carries every selected row (query order); from any other row, that row - selected at
  the press. With `data-drag` a row never sweeps a range: select with clicks, Shift and the keys.
- A line shows where the rows would land: before or after the row under the pointer, at the end below the last;
  in a tree grid the middle of a row frames it - the records become its children, and it opens.
- A dropped record keeps its id unless the target holds it already or the drop copies: then it gets a new one
  (numbers: after the largest, text: `id-2`, `id-3` ...) and its children follow it. A move onto the rows it moves,
  or into what lies under them, goes nowhere.
- The target writes once, selects what came and fires `data-grid-drop`; a move takes the records out of their source
  first; the source fires `data-grid-dragend`. `data-grid-beforedrop` (cancelable) refuses a drop - e.g. records of
  the wrong kind.
- The drag also carries the rows as tab-separated values and an HTML table (`text/plain`, `text/html`) - a drop into
  a spreadsheet or a document pastes them - and as JSON (`application/x-defuss-records+json`): a grid in another
  window copies them.
- Keyboard users need another way: `insert(grid, records, at)` and `remove(grid, ids)` write what a drop writes -
  wire them to buttons ("Move to Sprint").

```html
<div class="data-grid" id="backlog" aria-label="Backlog" data-select="multiple" data-drag data-drop>…</div>
<div class="data-grid" id="sprint" aria-label="Sprint" data-select="multiple" data-select-model="checkbox" data-drag data-drop="move">…</div>
```

```js
const { dataGrid } = df$.shadcn;
const ids = dataGrid.selected(backlog).map((r) => r.id);
dataGrid.insert(sprint, dataGrid.remove(backlog, ids));     // what a drag does, from a button
```

### Inline editing

A column with `data-editable` edits in place: double-click a cell, or press Enter / F2 on it. Enter or leaving the cell
writes the value, Escape keeps the old one, Tab moves to the next editable cell (then the next row). The editors are
the shared cell editors - the library's Input, a number Input, Switch, Select, colour and date inputs, Textarea - the
same as the Property Grid's. A value the rules refuse shows its message under the cell and the editor stays.

Every edit replaces the record in the source with a new object and runs the query again, so the sort and the filters
place it again (the focus goes with it). `data-grid-beforeedit` (cancelable) fires first, `data-grid-edit` after.

```js
df$.shadcn.dataGrid.setSource(grid, rows, {
  getEditorFn: (field, value, ctx) => null,   // an element, { el, getValue, validate?, focus?, immediate?, patch? },
                                              // null (the built-in editor) or false (this cell does not edit)
  validateFn: (field, value, ctx) => null,    // a message (or false) refuses the value - across fields: ctx.record
});
df$.shadcn.dataGrid.edit(grid, 42, 'price');   // open a record's cell
df$.shadcn.dataGrid.update(grid, 42, { price: 9.5 }); // write from script (data-grid-edit per field)
```

`ctx` = `{ record, field, type, rules, grid }`. A custom editor's `patch()` returns more fields to write in the same
edit (a record editor).

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
key to change it): `{ filters, sorters, locked, columns, hidden, widths,
page, expanded, collapsed, selected, selectedColumns, selectedRanges }` - dataview's own filter (`{ field, op, value }`) and sorter
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
`df$.shadcn.dataGrid` has `setSource`, `query`, `rows`, `source`, `selected`,
`selectAll`, `clearSelection`, `expandAll`, `collapseAll`, `resetColumns`.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type DataGridState = 'default' | 'loading' | 'empty'</code> - `setState(name, config)` takes the config of the state it names (`DataGridStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The rows of the query; a query nothing matches lands in empty. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a tree grid shows a match with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the sort order - several sorters sort by each in turn</td></tr><tr><td><code>locked?</code></td><td><code>string[]</code></td><td>the fields of the locked columns - they stick at the start, in column order</td></tr><tr><td><code>columns?</code></td><td><code>string[]</code></td><td>every field in the order the reader arranged (locked columns still come first)</td></tr><tr><td><code>hidden?</code></td><td><code>string[]</code></td><td>the fields of the hidden columns</td></tr><tr><td><code>widths?</code></td><td><code>Record&lt;string, number&gt;</code></td><td>the widths in px of the columns the reader resized (the rest keep data-width)</td></tr><tr><td><code>page?</code></td><td><code>number</code></td><td>the page shown, 0-based (data-paging="pages")</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid: the ids of the open rows</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid, while filtering: the rows the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the selected rows (data-select-model "row" - the default -, "checkbox" and "row column")</td></tr><tr><td><code>selectedColumns?</code></td><td><code>string[]</code></td><td>the fields of the selected columns (data-select-model "column" and "row column")</td></tr><tr><td><code>selectedRanges?</code></td><td><code>DataGridRange[]</code></td><td>the selected cell ranges (data-select-model "cell")</td></tr></table> |
| `loading` | Busy: skeleton rows, aria-busy - a grid without records (or waiting for load()) starts here. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a tree grid shows a match with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the sort order - several sorters sort by each in turn</td></tr><tr><td><code>locked?</code></td><td><code>string[]</code></td><td>the fields of the locked columns - they stick at the start, in column order</td></tr><tr><td><code>columns?</code></td><td><code>string[]</code></td><td>every field in the order the reader arranged (locked columns still come first)</td></tr><tr><td><code>hidden?</code></td><td><code>string[]</code></td><td>the fields of the hidden columns</td></tr><tr><td><code>widths?</code></td><td><code>Record&lt;string, number&gt;</code></td><td>the widths in px of the columns the reader resized (the rest keep data-width)</td></tr><tr><td><code>page?</code></td><td><code>number</code></td><td>the page shown, 0-based (data-paging="pages")</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid: the ids of the open rows</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid, while filtering: the rows the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the selected rows (data-select-model "row" - the default -, "checkbox" and "row column")</td></tr><tr><td><code>selectedColumns?</code></td><td><code>string[]</code></td><td>the fields of the selected columns (data-select-model "column" and "row column")</td></tr><tr><td><code>selectedRanges?</code></td><td><code>DataGridRange[]</code></td><td>the selected cell ranges (data-select-model "cell")</td></tr></table> |
| `empty` | No rows: the data-empty-text shows. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a tree grid shows a match with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the sort order - several sorters sort by each in turn</td></tr><tr><td><code>locked?</code></td><td><code>string[]</code></td><td>the fields of the locked columns - they stick at the start, in column order</td></tr><tr><td><code>columns?</code></td><td><code>string[]</code></td><td>every field in the order the reader arranged (locked columns still come first)</td></tr><tr><td><code>hidden?</code></td><td><code>string[]</code></td><td>the fields of the hidden columns</td></tr><tr><td><code>widths?</code></td><td><code>Record&lt;string, number&gt;</code></td><td>the widths in px of the columns the reader resized (the rest keep data-width)</td></tr><tr><td><code>page?</code></td><td><code>number</code></td><td>the page shown, 0-based (data-paging="pages")</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid: the ids of the open rows</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid, while filtering: the rows the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the selected rows (data-select-model "row" - the default -, "checkbox" and "row column")</td></tr><tr><td><code>selectedColumns?</code></td><td><code>string[]</code></td><td>the fields of the selected columns (data-select-model "column" and "row column")</td></tr><tr><td><code>selectedRanges?</code></td><td><code>DataGridRange[]</code></td><td>the selected cell ranges (data-select-model "cell")</td></tr></table> |

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
| <code>setSource(target: string \| HTMLElement, rows: DataviewRow[], options: DataGridOptions = {}): void</code> | Hand the grid its records. Options: idField ('id'), parentIdField (a tree grid; or data-parent-field), cells ({ field: (el, record, meta) }) custom cell content, load(offset, size) returning a Promise&lt;records[]&gt; for data-paging="infinite" from a remote source, query ({ sorters, filters, locked, ... }) the starting query, persist ({ area: 'session' \| 'local' \| 'none', prefix, key }) where the view is kept - a kept view wins over the starting query. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr><tr><td><code>rows</code></td><td><code>DataviewRow[]</code></td><td>the records (a tree grid: a flat list linked by parent id)</td></tr><tr><td><code>options</code></td><td><code>DataGridOptions</code> = <code>{}</code></td><td>fields, custom cells, a remote loader, the starting view and its persistence</td></tr></table> |
| <code>query(target: string \| HTMLElement, patch: DataGridQuery): void</code> | Merge into the query: { filters?, sorters?, locked?, page?, expanded?, selected? }. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr><tr><td><code>patch</code></td><td><code>DataGridQuery</code></td><td>the query keys to change</td></tr></table> |
| <code>rows(target: string \| HTMLElement): DataviewRow[]</code> | The records the query shows. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> <b>Returns</b> <code>DataviewRow[]</code> - the records in query order, every page |
| <code>source(target: string \| HTMLElement): DataSource&lt;DataviewRow&gt; \| undefined</code> | The grid's query source: its records, the cached query and aggregation over them (source.aggregate(query, spec)) - a chart that groups what the grid's filters match reads this, not a second copy of the records. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> <b>Returns</b> <code>DataSource&lt;DataviewRow&gt; \| undefined</code> - its source, undefined before setSource() |
| <code>selected(target: string \| HTMLElement): DataviewRow[]</code> | The selected records. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> <b>Returns</b> <code>DataviewRow[]</code> - the selected records, in source order |
| <code>selectAll(target: string \| HTMLElement): void</code> | Select everything the selection model selects: every row the query shows (all pages), every shown column (data-select-model="column"), or every cell (data-select-model="cell") - what Ctrl / Cmd + A does. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> |
| <code>clearSelection(target: string \| HTMLElement): void</code> | Select nothing: no row, no column, no cell. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> |
| <code>copyText(target: string \| HTMLElement): string</code> | The selection as a spreadsheet reads it - what Ctrl / Cmd + C copies: tab-separated values, a line a row, a value quoted when it holds a tab, a line break or a quote. The selected rows with every shown column, every row of the query with the selected columns, or the rows and columns the cell ranges touch (a cell outside them empty). Numbers stay plain, a date column's day is YYYY-MM-DD. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> <b>Returns</b> <code>string</code> - the text, '' when nothing is selected |
| <code>paste(target: string \| HTMLElement, text: string): DataGridPasteDetail</code> | Paste tab-separated values (from Excel, Google Sheets or a grid) into the selection - what Ctrl / Cmd + V does. Only selected cells change, except a single selected cell, where the block starts (and is selected after). A one-line clipboard fills every selected row, a one-column one every selected column; otherwise the values land once, in order. Cells of columns that do not edit are skipped; every value passes the column's rules and validateFn, and data-grid-beforeedit may cancel it. One write, then data-grid-edit per cell and data-grid-paste. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>tab-separated values, a line a row</td></tr></table> <b>Returns</b> <code>DataGridPasteDetail</code> - how many cells were written and skipped, and the values refused with the reason |
| <code>expandAll(target: string \| HTMLElement): void</code> | Tree grid: open every branch. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> |
| <code>collapseAll(target: string \| HTMLElement): void</code> | Tree grid: close every branch (while filtering: the ways to the matches too). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> |
| <code>resetColumns(target: string \| HTMLElement): void</code> | Back to the authored columns: their order, lock (data-locked), visibility (hidden) and widths (data-width) - what the column menu's "Reset columns" does. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> |
| <code>edit(target: string \| HTMLElement, id: DataviewJsonValue, field: string): boolean</code> | Open the editor of a record's cell (an editable column - data-editable on its header). The record is scrolled into view first. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr><tr><td><code>id</code></td><td><code>DataviewJsonValue</code></td><td>the record's id</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the column's field</td></tr></table> <b>Returns</b> <code>boolean</code> - false when the cell does not edit (no such record shown, a column without data-editable, getEditorFn answered false) |
| <code>commit(target: string \| HTMLElement): boolean</code> | Commit the open editor. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - false when its value is refused (the editor stays open with the message); true otherwise |
| <code>cancel(target: string \| HTMLElement): void</code> | Close the open editor without writing. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr></table> |
| <code>update(target: string \| HTMLElement, id: DataviewJsonValue, patch: DataviewRow): DataviewRow \| null</code> | Write new values into one record - what an edit writes, from script (a custom cell's own control, a form beside the grid). The record is replaced by a new object; the query runs again. Fires data-grid-edit per field. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr><tr><td><code>id</code></td><td><code>DataviewJsonValue</code></td><td>the record's id</td></tr><tr><td><code>patch</code></td><td><code>DataviewRow</code></td><td>the fields to change and their new values</td></tr></table> <b>Returns</b> <code>DataviewRow \| null</code> - the new record, null when no record has that id |
| <code>insert(target: string \| HTMLElement, records: DataviewRow[], at: DataGridDropAt = { id: null, place: 'end' }): DataviewRow[] \| null</code> | Insert records - what a drop writes, from script (a button that moves the selected rows to another grid, the keyboard's way to do what a drag does). They land where at says, in their order; a record whose id the grid already holds gets a new one (numbers: after the largest, text: "id-2" ...). In a tree grid records may bring their children (linked by parent id among themselves); the others take the place's parent - into a record: it. No event fires - the page asked for it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records to insert</td></tr><tr><td><code>at</code></td><td><code>DataGridDropAt</code> = <code>{ id: null, place: 'end' }</code></td><td>where: beside a record ({ id, place: 'before' \| 'after' }), into one (a tree grid: 'into'), or at the end (the default)</td></tr></table> <b>Returns</b> <code>DataviewRow[] \| null</code> - the records as inserted (with their ids), null when the place is no record of the grid |
| <code>remove(target: string \| HTMLElement, ids: DataviewJsonValue[]): DataviewRow[]</code> | Take records out - what a move takes out of the grid it leaves. In a tree grid everything under them goes with them. The selection keeps what is left. No event fires - the page asked for it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .data-grid element or its selector</td></tr><tr><td><code>ids</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the records to take out</td></tr></table> <b>Returns</b> <code>DataviewRow[]</code> - the records taken out (a tree grid: with the ones under them), in source order |

### Events

| Event | Description |
|---|---|
| `data-grid-activate` | Fires on Enter on a row - its record and its position in the query. <code>detail</code>: <code>DataGridActivateDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the row's record</td></tr><tr><td><code>index</code></td><td><code>number</code></td><td>its position in the query (every page)</td></tr></table> |
| `data-grid-beforedrop` | Fires before dropped records are written - cancel it to refuse them (the drag ends without a change). <code>detail</code>: <code>DataGridBeforeDropDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records as they will be inserted (new ids where a copy or a taken id needs one)</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' (they leave their source) or 'copy'</td></tr><tr><td><code>source</code></td><td><code>HTMLElement \| null</code></td><td>the component they come from (a grid, a tree; this grid when they move within it); null from another document</td></tr><tr><td><code>at</code></td><td><code>DataGridDropAt</code></td><td>where they land</td></tr></table> |
| `data-grid-beforeedit` | Fires before an edited value is written - cancelable: preventDefault() keeps the old value. <code>detail</code>: <code>DataGridBeforeEditDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record as it is</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the column's field</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the value about to be written</td></tr><tr><td><code>oldValue</code></td><td><code>unknown</code></td><td>the value it holds now</td></tr></table> |
| `data-grid-copy` | Fires after Ctrl / Cmd + C put the selection on the clipboard - the text and its size. <code>detail</code>: <code>DataGridCopyDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the tab-separated values put on the clipboard (an HTML table of them beside it)</td></tr><tr><td><code>rows</code></td><td><code>number</code></td><td>how many rows were copied</td></tr><tr><td><code>columns</code></td><td><code>number</code></td><td>how many columns were copied</td></tr></table> |
| `data-grid-dragend` | Fires on the grid rows were dragged from, once a drop took them - on a move they have left it. <code>detail</code>: <code>DataGridDragEndDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records dragged (on a move they have left this grid)</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' or 'copy'</td></tr><tr><td><code>target</code></td><td><code>HTMLElement</code></td><td>the component that took them</td></tr></table> |
| `data-grid-drop` | Fires after dropped records were written into the grid - as inserted, with new ids where they needed one. <code>detail</code>: <code>DataGridDropDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records as they were inserted</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' or 'copy'</td></tr><tr><td><code>source</code></td><td><code>HTMLElement \| null</code></td><td>the component they came from; null from another document</td></tr><tr><td><code>at</code></td><td><code>DataGridDropAt</code></td><td>where they landed</td></tr></table> |
| `data-grid-edit` | Fires after an edited value was written - the new record, the field, the new and the old value. <code>detail</code>: <code>DataGridEditDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record as it is now (a new object - the old one is never mutated)</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the column's field</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the value written</td></tr><tr><td><code>oldValue</code></td><td><code>unknown</code></td><td>the value it held</td></tr></table> |
| `data-grid-paste` | Fires after a paste - how many cells it wrote, how many do not edit, and the values refused with the reason. <code>detail</code>: <code>DataGridPasteDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>written</code></td><td><code>number</code></td><td>the cells whose value changed</td></tr><tr><td><code>skipped</code></td><td><code>number</code></td><td>the cells of the target that do not edit (no data-editable, or getEditorFn answered false)</td></tr><tr><td><code>refused</code></td><td><code>DataGridPasteRefusal[]</code></td><td>the values refused, with the reason</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `DataGridActivateDetail` | What data-grid-activate carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the row's record</td></tr><tr><td><code>index</code></td><td><code>number</code></td><td>its position in the query (every page)</td></tr></table> |
| `DataGridBeforeDropDetail` | What data-grid-beforedrop carries - cancel it to refuse the drop. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records as they will be inserted (new ids where a copy or a taken id needs one)</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' (they leave their source) or 'copy'</td></tr><tr><td><code>source</code></td><td><code>HTMLElement \| null</code></td><td>the component they come from (a grid, a tree; this grid when they move within it); null from another document</td></tr><tr><td><code>at</code></td><td><code>DataGridDropAt</code></td><td>where they land</td></tr></table> |
| `DataGridBeforeEditDetail` | What data-grid-beforeedit carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record as it is</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the column's field</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the value about to be written</td></tr><tr><td><code>oldValue</code></td><td><code>unknown</code></td><td>the value it holds now</td></tr></table> |
| `DataGridCellRef` | A cell: a record and a column. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>DataviewJsonValue</code></td><td>the record's id</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the column's field</td></tr></table> |
| `DataGridCopyDetail` | What data-grid-copy carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the tab-separated values put on the clipboard (an HTML table of them beside it)</td></tr><tr><td><code>rows</code></td><td><code>number</code></td><td>how many rows were copied</td></tr><tr><td><code>columns</code></td><td><code>number</code></td><td>how many columns were copied</td></tr></table> |
| `DataGridDragEndDetail` | What data-grid-dragend carries - on the grid the records were dragged from. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records dragged (on a move they have left this grid)</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' or 'copy'</td></tr><tr><td><code>target</code></td><td><code>HTMLElement</code></td><td>the component that took them</td></tr></table> |
| `DataGridDropAt` | Where records land in a grid: beside a record (before / after), into it (a tree grid: as its children), or at the end. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>DataviewJsonValue \| null</code></td><td>the record the records land beside or into; null at the end</td></tr><tr><td><code>place</code></td><td><code>DropPlace</code></td><td>'before', 'after', 'into' (a tree grid) or 'end'</td></tr></table> |
| `DataGridDropDetail` | What data-grid-drop carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>records</code></td><td><code>DataviewRow[]</code></td><td>the records as they were inserted</td></tr><tr><td><code>effect</code></td><td><code>DropEffect</code></td><td>'move' or 'copy'</td></tr><tr><td><code>source</code></td><td><code>HTMLElement \| null</code></td><td>the component they came from; null from another document</td></tr><tr><td><code>at</code></td><td><code>DataGridDropAt</code></td><td>where they landed</td></tr></table> |
| `DataGridEditContext` | Where an edit happens - what getEditorFn and validateFn receive. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record being edited (unchanged until the edit commits)</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the column's field</td></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the type the value edits as (data-editor, else the column's data-type, else the value's)</td></tr><tr><td><code>rules</code></td><td><code>EditorRules</code></td><td>the column's rules (data-required, data-min, data-max, data-integer, data-pattern, data-options)</td></tr><tr><td><code>grid</code></td><td><code>HTMLElement</code></td><td>the grid element</td></tr></table> |
| `DataGridEditDetail` | What data-grid-edit carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record as it is now (a new object - the old one is never mutated)</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the column's field</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the value written</td></tr><tr><td><code>oldValue</code></td><td><code>unknown</code></td><td>the value it held</td></tr></table> |
| `DataGridOptions` | What setSource() takes besides the records. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>getEditorFn?</code></td><td><code>(field: string, value: unknown, ctx: DataGridEditContext) =&gt; HTMLElement \| CellEditor \| null \| false</code></td><td>an editor for a cell of an editable column: an element or a CellEditor ({ el, getValue, validate?, focus?, immediate?, multiline?, ownsEnter? }); null: the built-in one; false: this cell does not edit</td></tr><tr><td><code>validateFn?</code></td><td><code>(field: string, value: unknown, ctx: DataGridEditContext) =&gt; string \| false \| null \| undefined</code></td><td>refuse a value: return a message, or false for a generic one; anything else accepts it</td></tr><tr><td><code>idField?</code></td><td><code>string</code></td><td>the id field (default 'id', or data-id-field)</td></tr><tr><td><code>parentIdField?</code></td><td><code>string</code></td><td>a tree grid: the parent-id field (or data-parent-field)</td></tr><tr><td><code>cells?</code></td><td><code>Record&lt;string, (el: HTMLElement, record: DataviewRow, meta: DataGridRowMeta) =&gt; void&gt;</code></td><td>custom cell content per field: fill the cell's content element</td></tr><tr><td><code>load?</code></td><td><code>(offset: number, size: number) =&gt; Promise&lt;DataviewRow[]&gt;</code></td><td>data-paging="infinite" from a remote source: the next records from offset (an empty answer ends the loading)</td></tr><tr><td><code>query?</code></td><td><code>DataGridQuery</code></td><td>the starting query (a kept view wins over it)</td></tr><tr><td><code>persist?</code></td><td><code>ViewPersistence</code></td><td>where the view is kept between visits (default: session storage under a generated key)</td></tr></table> |
| `DataGridPasteDetail` | What a paste did - what paste() returns and data-grid-paste carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>written</code></td><td><code>number</code></td><td>the cells whose value changed</td></tr><tr><td><code>skipped</code></td><td><code>number</code></td><td>the cells of the target that do not edit (no data-editable, or getEditorFn answered false)</td></tr><tr><td><code>refused</code></td><td><code>DataGridPasteRefusal[]</code></td><td>the values refused, with the reason</td></tr></table> |
| `DataGridPasteRefusal` | A pasted value the grid did not write. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>DataviewJsonValue</code></td><td>the record's id</td></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the column's field</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the pasted text</td></tr><tr><td><code>message</code></td><td><code>string</code></td><td>why: the broken rule's message, 'Not a number', 'Not one of ...', or 'Cancelled' (data-grid-beforeedit)</td></tr></table> |
| `DataGridQuery` | The grid's query - its state config (merged on every query()). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters over every record (a tree grid shows a match with its ancestors)</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the sort order - several sorters sort by each in turn</td></tr><tr><td><code>locked?</code></td><td><code>string[]</code></td><td>the fields of the locked columns - they stick at the start, in column order</td></tr><tr><td><code>columns?</code></td><td><code>string[]</code></td><td>every field in the order the reader arranged (locked columns still come first)</td></tr><tr><td><code>hidden?</code></td><td><code>string[]</code></td><td>the fields of the hidden columns</td></tr><tr><td><code>widths?</code></td><td><code>Record&lt;string, number&gt;</code></td><td>the widths in px of the columns the reader resized (the rest keep data-width)</td></tr><tr><td><code>page?</code></td><td><code>number</code></td><td>the page shown, 0-based (data-paging="pages")</td></tr><tr><td><code>expanded?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid: the ids of the open rows</td></tr><tr><td><code>collapsed?</code></td><td><code>DataviewJsonValue[]</code></td><td>tree grid, while filtering: the rows the user closed again</td></tr><tr><td><code>selected?</code></td><td><code>DataviewJsonValue[]</code></td><td>the ids of the selected rows (data-select-model "row" - the default -, "checkbox" and "row column")</td></tr><tr><td><code>selectedColumns?</code></td><td><code>string[]</code></td><td>the fields of the selected columns (data-select-model "column" and "row column")</td></tr><tr><td><code>selectedRanges?</code></td><td><code>DataGridRange[]</code></td><td>the selected cell ranges (data-select-model "cell")</td></tr></table> |
| `DataGridRange` | A rectangle of cells: every cell between two corners, wherever the query places their records and the reader arranged their columns (a corner the query does not show drops the range). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>from</code></td><td><code>DataGridCellRef</code></td><td>the corner the selection started at</td></tr><tr><td><code>to</code></td><td><code>DataGridCellRef</code></td><td>the opposite corner</td></tr></table> |
| `DataGridRowMeta` | Where a record sits - what a custom cell receives. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>depth</code></td><td><code>number</code></td><td>tree grid: 0 for a root row</td></tr><tr><td><code>hasChildren</code></td><td><code>boolean</code></td><td>tree grid: whether it has child rows</td></tr><tr><td><code>isExpanded</code></td><td><code>boolean</code></td><td>tree grid: whether its children show</td></tr><tr><td><code>isMatch</code></td><td><code>boolean</code></td><td>whether it matches the filters (false for an ancestor shown for a match)</td></tr><tr><td><code>isSelected</code></td><td><code>boolean</code></td><td>whether it is selected</td></tr><tr><td><code>parentId</code></td><td><code>DataviewJsonValue \| null</code></td><td>tree grid: its parent's id, null for a root</td></tr></table> |

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `aria-label` | `.data-grid` | Always - names the grid (the component moves it to the viewport, the grid element) |
| `role="grid"` / `"treegrid"` | `.data-grid-viewport` | Set by the component (`treegrid` with `data-parent-field`): the grid holds the rows only - the footer's status and pager and the column menu stay outside it |
| `aria-rowcount` / `aria-colcount` | `.data-grid-viewport` | Set: every row of the query + the header (and filter) rows |
| `aria-multiselectable="true"` | `.data-grid-viewport` | With `data-select="multiple"` |
| `aria-busy="true"` | `.data-grid-viewport` | In `loading` |
| `role="columnheader"` + `aria-sort` | `.data-grid-header` | Set; `data-sort-index` numbers a multisort |
| `role="row"` + `aria-rowindex` | `.data-grid-row` | Set: the header row 1, the filter row 2, each recycled row against its real position |
| `role="gridcell"` + `aria-colindex` | `.data-grid-cell` | Set |
| `aria-selected` | `.data-grid-row` | The row models (`row`, `checkbox`, `row column`) |
| `aria-hidden="true"` | `.data-grid-check` | The `checkbox` model's cells: the row's `aria-selected` says it, Space selects |
| `aria-selected` | `.data-grid-cell` | The `cell`, `column` and `row column` models |
| `aria-selected` | `.data-grid-header` | The column models (`column`, `row column`) |
| `aria-level` / `aria-expanded` | `.data-grid-row` | Tree grid |
| `aria-haspopup="menu"` + `aria-expanded` + `aria-label` | `.data-grid-menu-button` | Set: the header's menu arrow |
| `role="menu"` · `menuitemradio` (sort) · `menuitemcheckbox` + `aria-checked` (lock, each column) · `role="group"` (Columns) | `.data-grid-menu` | Set: the column menu |
| `role="separator"` + `aria-orientation="vertical"` + `aria-label` | `.data-grid-resizer` | Set: a header's resize edge |

Keyboard (APG grid): arrows move cell by cell (Up from the first row reaches
the header), Home / End the row's ends, Ctrl+Home / Ctrl+End the first / last
row, Page Up / Down a screen, Space selects (Shift: a range), Shift with a movement key
extends the selection (see "Selection models"), Ctrl / Cmd + A selects everything, Ctrl / Cmd + C copies and
Ctrl / Cmd + V pastes, Enter on a header sorts (Shift+Enter adds it), Enter on a row fires `data-grid-activate`. Tree
grid, first column: Arrow Right opens, Arrow Left closes or goes to the parent.
On a header: Alt+Arrow Down (or the context-menu key) opens its menu - Arrow
Up / Down, Home / End move, Enter / Space pick, Escape or Tab close and return
to the header -, Alt+Shift+Arrow Left / Right moves the column, Alt+Arrow Left
/ Right makes it 16px narrower / wider.

---

## Notes
- **Row height is uniform and known** (`--data-grid-row-height`, px). A cell
  that renders taller is clipped.
- **Controls in custom cells** (a field, a checkbox, a select, a button) keep
  their clicks and their keys: the grid neither selects the row nor moves its
  focus for them - a field types spaces and moves its caret, Space ticks a box.
- **A range is held by its corner records and fields** - sort or move columns and it spans what lies between them
  now; a filter that hides a corner drops the range.
- **A filter is case-insensitive** - text matches anywhere, numbers take `>`
  `>=` `<` `<=` `=` `!=` (`> 100`), a select matches exactly. All filters combine.
- **Multisort**: a click sorts by that column alone (ascending, then descending, then off);
  Shift+click adds it to the sort (or cycles it in place).
- **Locking moves the column into the sticky group** at the start (column
  order kept) - the head and every row reorder together.
- **A hidden column keeps its filter** - the rows it filters stay filtered
  while it is hidden; show it to change the filter.
- **The tree grid's toggle sits in the first shown column** - move or hide the
  first column and the next one carries it.
- **The menu is one popover per grid**, in the top layer: a grid with
  `overflow: hidden` around it does not clip it. Without CSS anchor
  positioning it is placed once under the arrow.
- **Rows are recycled** - put one delegated listener on the grid and read the
  record through `df$.shadcn.dataGrid.rows(grid)[row.dataset.index]`, or listen
  to `data-grid-activate`.
- **Queries scan every row once** - 100,000 rows filter and multisort in tens of
  milliseconds; the result is cached until the query or the rows change, so
  scrolling and selecting never re-run it.
- **Computed columns, totals and reports** come from
  [defuss-dataview/compute](https://www.npmjs.com/package/defuss-dataview)
  (`browser-compute.mjs`), not from the grid: a `rows` plan projects records
  into the columns a grid shows, an `aggregate` plan over
  `df$.shadcn.dataGrid.rows(grid)` (what the filters match) gives totals or
  groups - hand groups to a second grid, or levels of groups linked by a parent
  id to a tree grid. The docs page shows all three.
