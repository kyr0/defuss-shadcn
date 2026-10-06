---
name: Table
type: ATM
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

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.tableApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.tableStates` = `default`, `sorted`, `selected`.

### Events

| Event | `detail` | Description |
|---|---|---|
| `table-reorder` | `row`, `index` | Fires after a row is moved (drag or keyboard) - the row and its new index. |
| `table-select` | `rows`, `count` | Fires when the selection changes - the selected rows and how many. |
| `table-sort` | `column`, `direction` | Fires when a column is sorted - the column and the direction (ascending, descending, none). |

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
