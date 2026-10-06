---
name: Table
type: ATM
section: data-display
why: Semantic <table> - headers, captions and sort state stay accessible; table.js adds sorting (aria-sort, Intl.Collator), row selection, drag reordering and locked-column offsets on top.
when: Tabular data in rows and columns - from a plain list to a data grid with sort, select, reorder and actions; never div grids.
where: dist/components/table/table.css + dist/components/table/table.js
supportedStates: default, sorted, selected
---

# Table

## Native basis

`<table>` element with semantic `<thead>`, `<tbody>`, `<tfoot>`, and `<caption>`.

## Native Web APIs

- [`<table>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table) - tabular data container
- [`<thead>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/thead) - table header group
- [`<tbody>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tbody) - table body group
- [`<tfoot>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot) - table footer group
- [`<caption>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/caption) - table caption
- [`aria-sort`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-sort) - the sorted column and direction
- [`Intl.Collator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator) - numeric sorting in the locale of the text (nearest `[lang]`, else `en`)
- [HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) - row reordering
- [`position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky) - locked columns and header
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - re-measures locked-column offsets
- [`:indeterminate`](https://developer.mozilla.org/en-US/docs/Web/CSS/:indeterminate) - the select-all box for a partial selection

## Structure

```html
<div class="table-container">
  <table class="table">
    <caption class="table-caption">A list of recent invoices.</caption>
    <thead>
      <tr class="table-row">
        <th class="table-head">Invoice</th>
        <th class="table-head">Status</th>
        <th class="table-head">Method</th>
        <th class="table-head" style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr class="table-row">
        <td class="table-cell">INV001</td>
        <td class="table-cell">Paid</td>
        <td class="table-cell">Credit Card</td>
        <td class="table-cell" style="text-align:right">$250.00</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="table-row">
        <td class="table-cell" colspan="3">Total</td>
        <td class="table-cell" style="text-align:right;font-weight:600">$2,500.00</td>
      </tr>
    </tfoot>
  </table>
</div>
```

## Data table features (table.js)

### Sortable columns
```html
<th class="table-head" scope="col" aria-sort="none"><button class="table-sort" type="button">Spend</button></th>
…
<td class="table-cell" data-numeric data-sort-value="1999">€1,999.00</td>
```
A click cycles ascending → descending → the authored order; `aria-sort` on
the th draws the arrow. Text sorts with `Intl.Collator` (numeric: "Item 2"
before "Item 10", case-insensitive); `data-sort-value` gives formatted cells
(amounts, dates) a raw key. An authored `aria-sort="ascending"` sorts on
load. Fires `table-sort` (`{ column, direction }`).

### Selectable rows
```html
<th class="table-head table-select" scope="col"><input type="checkbox" class="checkbox" aria-label="Select all"></th>
…
<td class="table-cell table-select"><input type="checkbox" class="checkbox" aria-label="Select INV-001"></td>
```
The header box selects all (indeterminate when some are chosen);
Shift+click selects a range; a selected row gets `aria-selected="true"` and a
tint. Fires `table-select` (`{ rows, count }`).

### Reorderable rows
```html
<td class="table-cell table-handle"><button type="button" aria-label="Move row (Alt+Arrow keys)"><svg>…grip…</svg></button></td>
```
Drag a row by its grip (native Drag and Drop; a line shows the drop spot),
or Alt+ArrowUp / Alt+ArrowDown from anything focused in the row. A manual
order clears the sort. Fires `table-reorder` (`{ row, index }`).

### Locked columns, sticky header
`data-lock-start="1|2|3"` keeps the first columns in view while the
`.table-container` scrolls sideways (offsets measured into
`--table-lock-1/-2`), `data-lock-end="1"` the last one;
`data-sticky-header` keeps the header row (give the container a
`max-height`).

## Cells

| Attribute / class | Effect |
| --- | --- |
| `data-align="start|center|end"` | Text alignment (logical - flips in RTL) |
| `data-numeric` | End-aligned tabular figures |
| `data-valign="top"` | Top of a tall row |
| `data-nowrap` | One line |
| `.table-actions` | A narrow, end-aligned cell of buttons - always visible; `data-actions="quiet"` on the table dims them until row hover / focus (touch: full strength) |
| `.table-actions-inline` + `.table-actions-menu` + `.table-menu[popover]` | Mobile: under 40rem the inline buttons give way to one ⋯ button opening a native popover menu of `.table-menu-item`s (add `popovertarget="…" popovertargetaction="hide"` so a pick closes it); touch screens get 44px targets |
| `.table-actions > .btn[popovertarget]` + `.table-menu[popover]` | A dropdown button in the actions cell (e.g. "Actions ▾") - the menu anchors under it |
| `.table-empty` (+ `.table-empty-icon`) | The one cell of an empty table (`colspan` = all columns): icon, text, optional button - centered, muted |
| `<a>` (no class) in a `.table-cell` | A link in the text colour with a soft underline (firm on hover), the ring on focus - never the browser's blue; classed links (`.btn`) keep their own style |
| `.table-sub` | A muted second line |
| `.table-truncate` | One line with an ellipsis (`--table-truncate`, 14rem) - put the full text in `title` |
| `.table-clamp` | Two lines, then an ellipsis |
| `.table-mono` | Monospace ids / codes, one line |
| `.table-muted` | Muted text |

## States

| State | Meaning |
| --- | --- |
| `default` | As authored: original row order, no sort, nothing selected |
| `sorted` | `config.column` (index) + `config.direction` (`ascending` / `descending`) |
| `selected` | `config.rows`: row indices or `'all'` |

```js
document.querySelector('#team').api.setState('sorted', { column: 2, direction: 'descending' });
document.querySelector('#team').api.getState(); // → { name: 'sorted', config: { sort: {…}, selected: [] } }
```

`setState()` also takes `getState()`'s shape - `{ sort: { column, direction } | null,
selected: [indices] }` - and applies all of it, so `setState(name, getState().config)`
changes nothing. `render(state)` returns the authored table sorted / selected as the
state says. Only rows with a select box carry `aria-selected`.

The registry global is `df$.shadcn.tableApi` / `df$.shadcn.tableStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type TableState = 'default' | 'sorted' | 'selected'</code> - `setState(name, config)` takes the config of the state it names (`TableStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | As authored: the original row order, no sort, nothing selected. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>sort?</code></td><td><code>{ column: number; direction: 'ascending' \| 'descending' } \| null</code></td><td>reported by getState(): the sort applied, null for none</td></tr><tr><td><code>selected?</code></td><td><code>number[]</code></td><td>reported by getState(): the indices of the selected body rows</td></tr></table> |
| `sorted` | Sorted by one column. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>column?</code></td><td><code>number</code></td><td>the column's index (default 0)</td></tr><tr><td><code>direction?</code></td><td><code>'ascending' \| 'descending'</code></td><td>the direction (default ascending)</td></tr><tr><td><code>sort?</code></td><td><code>{ column: number; direction: 'ascending' \| 'descending' } \| null</code></td><td>the sort as getState() reports it - accepted instead of column / direction</td></tr><tr><td><code>selected?</code></td><td><code>number[]</code></td><td>body rows to select as well, by index</td></tr></table> |
| `selected` | Rows selected. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>rows?</code></td><td><code>number[] \| 'all'</code></td><td>the body rows to select: indices, or 'all' (default [0])</td></tr><tr><td><code>selected?</code></td><td><code>number[]</code></td><td>the same as rows (what getState() reports)</td></tr><tr><td><code>sort?</code></td><td><code>{ column: number; direction: 'ascending' \| 'descending' } \| null</code></td><td>a sort to keep while selecting</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends TableState&gt;(name: S, config?: TableStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TableStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: TableState; config: TableStateConfigs[TableState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: TableState; config: TableStateConfigs[TableState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: TableState; config: TableStateConfigs[TableState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: TableState; config: TableStateConfigs[TableState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: TableState; config: TableStateConfigs[TableState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.tableApi.setState&lt;S extends TableState&gt;(el: HTMLElement, name: S, config?: TableStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TableStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.tableApi.getState(el: HTMLElement): { name: TableState; config: TableStateConfigs[TableState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: TableState; config: TableStateConfigs[TableState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.tableApi.render(state: { name: TableState; config: TableStateConfigs[TableState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: TableState; config: TableStateConfigs[TableState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.tableApi.store(el: HTMLElement): Store&lt;{ name: TableState; config: TableStateConfigs[TableState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: TableState; config: TableStateConfigs[TableState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.tableApi.commit&lt;S extends TableState&gt;(el: HTMLElement, name: S, config?: TableStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>TableStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.tableStates: TableState[]</code> | The declared states, 'default' first: <code>default</code>, <code>sorted</code>, <code>selected</code>. |

### Events

| Event | Description |
|---|---|
| `table-reorder` | Fires after a row is moved (drag or keyboard) - the row and its new index. <code>detail</code>: <code>TableReorderDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>row</code></td><td><code>HTMLTableRowElement</code></td><td>the row that moved</td></tr><tr><td><code>index</code></td><td><code>number</code></td><td>its index among the body rows now</td></tr></table> |
| `table-select` | Fires when the selection changes - the selected rows and how many. <code>detail</code>: <code>TableSelectDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>rows</code></td><td><code>HTMLTableRowElement[]</code></td><td>the selected body rows, in table order</td></tr><tr><td><code>count</code></td><td><code>number</code></td><td>how many</td></tr></table> |
| `table-sort` | Fires when a column is sorted - the column and the direction (ascending, descending, none). <code>detail</code>: <code>TableSortDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>column</code></td><td><code>number</code></td><td>the sorted column's index (its header cell's cellIndex)</td></tr><tr><td><code>direction</code></td><td><code>'ascending' \| 'descending' \| 'none'</code></td><td>the new direction - 'none' restores the authored order</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `TableReorderDetail` | What table-reorder carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>row</code></td><td><code>HTMLTableRowElement</code></td><td>the row that moved</td></tr><tr><td><code>index</code></td><td><code>number</code></td><td>its index among the body rows now</td></tr></table> |
| `TableSelectDetail` | What table-select carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>rows</code></td><td><code>HTMLTableRowElement[]</code></td><td>the selected body rows, in table order</td></tr><tr><td><code>count</code></td><td><code>number</code></td><td>how many</td></tr></table> |
| `TableSortDetail` | What table-sort carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>column</code></td><td><code>number</code></td><td>the sorted column's index (its header cell's cellIndex)</td></tr><tr><td><code>direction</code></td><td><code>'ascending' \| 'descending' \| 'none'</code></td><td>the new direction - 'none' restores the authored order</td></tr></table> |

## Density

Set `data-density` on the `.table` root; head/cell/caption padding scales (typography unchanged - density is a whitespace policy, not a zoom).

| Value | Effect |
| --- | --- |
| `compact` | Cell padding 0.375rem 0.625rem |
| `comfortable` | Cell padding 0.75rem 1rem - identical to the unsized default |
| `spacious` | Cell padding 1rem 1.25rem |

## Accessibility

- Use `<th>` with appropriate `scope` for column/row headers - a row header is `<th class="table-cell" scope="row">`: it keeps the cell padding and aligns to the start (the UA would center a `th`)
- `<caption>` provides an accessible name for the table
- Screen readers announce table structure (rows, columns, headers)
