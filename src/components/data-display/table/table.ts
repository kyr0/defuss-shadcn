/* -- Table component --------------------------------------------- */
// The table is CSS; this module adds what a data table does on top: column
// sorting (a .table-sort button in the header, aria-sort, Intl.Collator
// numeric order), row selection (a .table-select checkbox column with a
// select-all header box - indeterminate when some are chosen, Shift+click
// for ranges), row reordering (a .table-handle grip, native Drag and Drop,
// Alt+ArrowUp / Alt+ArrowDown), the offsets of locked columns
// (data-lock-start) and the named State API (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent, textLocale } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** What table-select carries. */
interface TableSelectDetail {
  /** the selected body rows, in table order */
  rows: HTMLTableRowElement[];
  /** how many */
  count: number;
}

/** What table-reorder carries. */
interface TableReorderDetail {
  /** the row that moved */
  row: HTMLTableRowElement;
  /** its index among the body rows now */
  index: number;
}

/** What table-sort carries. */
interface TableSortDetail {
  /** the sorted column's index (its header cell's cellIndex) */
  column: number;
  /** the new direction - 'none' restores the authored order */
  direction: 'ascending' | 'descending' | 'none';
}

/** default = as authored (original order, no sort, nothing selected);
 * sorted = { column, direction }; selected = { rows: [indices] | 'all' }. */
const tableStates = ['default', 'sorted', 'selected'];

/** setState() configs per state (getState() reports the sort and the selected rows). */
export interface TableStateConfigs {
  /** As authored: the original row order, no sort, nothing selected. */
  default: {
    /** reported by getState(): the sort applied, null for none */
    sort?: { column: number; direction: 'ascending' | 'descending' } | null;
    /** reported by getState(): the indices of the selected body rows */
    selected?: number[];
  };
  /** Sorted by one column. */
  sorted: {
    /** the column's index (default 0) */
    column?: number;
    /** the direction (default ascending) */
    direction?: 'ascending' | 'descending';
    /** the sort as getState() reports it - accepted instead of column / direction */
    sort?: { column: number; direction: 'ascending' | 'descending' } | null;
    /** body rows to select as well, by index */
    selected?: number[];
  };
  /** Rows selected. */
  selected: {
    /** the body rows to select: indices, or 'all' (default [0]) */
    rows?: number[] | 'all';
    /** the same as rows (what getState() reports) */
    selected?: number[];
    /** a sort to keep while selecting */
    sort?: { column: number; direction: 'ascending' | 'descending' } | null;
  };
}

const bodyOf = (table) => table.tBodies[0];
const bodyRows = (table) => [...(bodyOf(table)?.rows ?? [])];
const rowBox = (row) => dfDollar(row).find(':scope > .table-select input[type="checkbox"]').get(0);
const headBox = (table) => dfDollar(table.tHead).find('.table-select input[type="checkbox"]').get(0);

/* -- Sorting --------------------------------------------------------------- */
/** A sortable column states its (lack of) sort: init's enhancement, which
 *  render() applies to its copy too. */
function enhanceHead(table) {
  dfDollar(table.tHead).find('.table-sort').each((_i, btn) => {
    const th = btn.closest('th');
    if (th && !th.hasAttribute('aria-sort')) th.setAttribute('aria-sort', 'none');
  });
}

function cellValue(row, col) {
  const cell = row.cells[col];
  if (!cell) return '';
  return cell.dataset.sortValue ?? cell.textContent.trim();
}
function sortBy(table, col, direction) {
  const body = bodyOf(table);
  if (!body) return;
  const lang = textLocale(table);
  const collator = new Intl.Collator(lang, { numeric: true, sensitivity: 'base' });
  const dir = direction === 'descending' ? -1 : 1;
  const rows = bodyRows(table);
  rows.sort((a, b) => {
    const x = cellValue(a, col);
    const y = cellValue(b, col);
    const nx = Number(x);
    const ny = Number(y);
    const c = x !== '' && y !== '' && Number.isFinite(nx) && Number.isFinite(ny) ? nx - ny : collator.compare(x, y);
    return c * dir;
  });
  body.append(...rows);
  [...(table.tHead?.rows[0]?.cells ?? [])].forEach((th, i) => {
    if (dfDollar(th).find('.table-sort').get(0)) th.setAttribute('aria-sort', i === col ? direction : 'none');
  });
  table._sort = { column: col, direction };
}
function unsort(table) {
  const body = bodyOf(table);
  if (body && table._original) body.append(...table._original.filter((r) => r.parentElement === body));
  dfDollar(table.tHead).find('[aria-sort]').attr('aria-sort', 'none');
  table._sort = null;
}

/* -- Selection ------------------------------------------------------------- */
function syncSelection(table, announce = true) {
  const rows = bodyRows(table);
  const boxes = rows.map(rowBox).filter(Boolean);
  rows.forEach((row) => {
    const box = rowBox(row);
    if (box) row.setAttribute('aria-selected', String(box.checked));
  });
  const head = headBox(table);
  if (head) {
    const on = boxes.filter((b) => b.checked).length;
    head.checked = boxes.length > 0 && on === boxes.length;
    head.indeterminate = on > 0 && on < boxes.length;
  }
  if (announce) {
    const selected = rows.filter((r) => r.getAttribute('aria-selected') === 'true');
    // Fires when the selection changes - the selected rows and how many.
    table.dispatchEvent(new CustomEvent<TableSelectDetail>('table-select', { bubbles: true, detail: { rows: selected, count: selected.length } }));
  }
}
function selectRows(table, which) {
  const rows = bodyRows(table);
  rows.forEach((row, i) => {
    const on = which === 'all' || (Array.isArray(which) && which.includes(i));
    // only a selectable row (it has a select box) carries aria-selected -
    // a plain table's rows have no selection state to announce
    const box = rowBox(row);
    if (!box) return;
    box.checked = on;
    row.setAttribute('aria-selected', String(on));
  });
  syncSelection(table);
}

/* -- Reordering ------------------------------------------------------------ */
function announceMove(table, row) {
  // Fires after a row is moved (drag or keyboard) - the row and its new index.
  table.dispatchEvent(new CustomEvent<TableReorderDetail>('table-reorder', { bubbles: true, detail: { row, index: bodyRows(table).indexOf(row) } }));
}
function moved(table, row) {
  // a manual order is no longer the sorted one
  dfDollar(table.tHead).find('[aria-sort]').attr('aria-sort', 'none');
  table._sort = null;
  announceMove(table, row);
}
function initReorder(table) {
  let dragged = null;
  const clear = () => dfDollar(table).find('[data-drop]').toArray().forEach((r) => r.removeAttribute('data-drop'));
  // a row drags only from its grip - text in the other cells stays selectable
  table.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest?.('.table-handle');
    if (handle) handle.closest('tr').draggable = true;
  });
  table.addEventListener('dragstart', (e) => {
    const row = e.target.closest?.('tbody > tr');
    if (!row || !row.draggable) return;
    dragged = row;
    row.dataset.dragging = '';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', row.cells[1]?.textContent.trim() ?? '');
  });
  table.addEventListener('dragover', (e) => {
    const row = e.target.closest?.('tbody > tr');
    if (!dragged || !row || row === dragged) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const r = row.getBoundingClientRect();
    const where = e.clientY - r.top < r.height / 2 ? 'before' : 'after';
    if (row.dataset.drop !== where) {
      clear();
      row.dataset.drop = where;
    }
  });
  table.addEventListener('drop', (e) => {
    const row = dfDollar(table).find('tbody > tr[data-drop]').get(0);
    if (!dragged || !row) return;
    e.preventDefault();
    const ref = row.dataset.drop === 'before' ? row : row.nextSibling;
    if (ref) dfDollar(ref).before(dragged);
    else dfDollar(row.parentElement).append(dragged);
    clear();
    moved(table, dragged);
  });
  table.addEventListener('dragend', () => {
    if (dragged) {
      delete dragged.dataset.dragging;
      dragged.draggable = false;
    }
    dragged = null;
    clear();
  });
  // keyboard: Alt+ArrowUp / Alt+ArrowDown on anything in the row
  table.addEventListener('keydown', (e) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    const row = e.target.closest?.('tbody > tr');
    if (!row) return;
    e.preventDefault();
    const sib = e.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling;
    if (!sib) return;
    const ref = e.key === 'ArrowUp' ? sib : sib.nextSibling;
    if (ref) dfDollar(ref).before(row);
    else dfDollar(row.parentElement).append(row);
    e.target.focus();
    moved(table, row);
  });
}

/* -- Locked columns: offsets of the 2nd / 3rd locked column ------------------ */
function measureLocks(table) {
  const n = parseInt(table.dataset.lockStart || '0', 10);
  if (n < 2) return;
  const first = table.rows[0];
  if (!first) return;
  for (let i = 1; i < n; i++) table.style.setProperty(`--table-lock-${i}`, `${first.cells[i - 1]?.getBoundingClientRect().width ?? 0}px`);
}

/* -- State API --------------------------------------------------------------- */
function triggerStateChange(table, stateName, config) {
  switch (stateName) {
    case 'default':
      unsort(table);
      selectRows(table, []);
      break;
    case 'sorted': {
      // { column, direction } - or getState()'s { sort: { column, direction } }
      const sort = config?.sort ?? {};
      const direction = config?.direction ?? sort.direction;
      sortBy(table, config?.column ?? sort.column ?? 0, direction === 'descending' ? 'descending' : 'ascending');
      // a getState() config describes the whole state: its selection too
      if (Array.isArray(config?.selected)) selectRows(table, config.selected);
      break;
    }
    case 'selected':
      // a getState() config describes the whole state: its sort too
      if (config && 'sort' in config) {
        if (config.sort) sortBy(table, config.sort.column ?? 0, config.sort.direction === 'descending' ? 'descending' : 'ascending');
        else unsort(table);
      }
      // { rows } - or getState()'s { selected }
      selectRows(table, config?.rows ?? config?.selected ?? [0]);
      break;
  }
}

/** Registry-level API; pass the table explicitly. Unknown names throw. */
export const tableApi = componentState({
  component: 'table',
  states: tableStates,
  apply: (table, state) => triggerStateChange(table, state.name, state.config),
  read: (table, state) => {
    const selected = bodyRows(table).flatMap((r, i) => (r.getAttribute('aria-selected') === 'true' ? [i] : []));
    return { name: table.dataset.stateName || 'default', config: { ...state.config, sort: table._sort ?? null, selected } };
  },
  markup: (el, state) => {
      enhanceHead(el);
      triggerStateChange(el, state.name, state.config);
    },
});

df$.tableApi = tableApi;
df$.tableStates = tableStates;

function init() {
  dfDollar('table.table:not([data-init])').toArray().forEach((table) => {
    table.dataset.init = '';
    table.dataset.stateName = 'default';
    table._original = bodyRows(table);
    table._sort = null;
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(table, tableApi);

    // sorting: a click on a .table-sort button cycles ascending → descending → as authored
    enhanceHead(table);
    dfDollar(table.tHead).find('.table-sort').toArray().forEach((btn) => {
      const th = btn.closest('th');
      btn.addEventListener('click', () => {
        const col = th.cellIndex;
        const now = th.getAttribute('aria-sort');
        const next = now === 'ascending' ? 'descending' : now === 'descending' ? 'none' : 'ascending';
        if (next === 'none') unsort(table);
        else sortBy(table, col, next);
        table.dataset.stateName = next === 'none' ? 'default' : 'sorted';
        // Fires when a column is sorted - the column and the direction (ascending, descending, none).
        table.dispatchEvent(new CustomEvent<TableSortDetail>('table-sort', { bubbles: true, detail: { column: col, direction: next } }));
      });
    });
    // an authored aria-sort sorts on load
    const pre = dfDollar(table.tHead).find('th[aria-sort="ascending"], th[aria-sort="descending"]').get(0);
    if (pre) sortBy(table, pre.cellIndex, pre.getAttribute('aria-sort'));

    // selection
    if (dfDollar(table).find('.table-select input[type="checkbox"]').get(0)) {
      let last = null;
      table.addEventListener('click', (e) => {
        const box = e.target.closest?.('.table-select input[type="checkbox"]');
        if (!box) return;
        if (box === headBox(table)) {
          const on = box.checked;
          bodyRows(table).forEach((r) => { const b = rowBox(r); if (b && !b.disabled) b.checked = on; });
        } else {
          // Shift+click: the range from the last clicked row takes this state
          const rows = bodyRows(table);
          const row = box.closest('tr');
          if (e.shiftKey && last && rows.includes(last)) {
            const [a, b] = [rows.indexOf(last), rows.indexOf(row)].sort((x, y) => x - y);
            rows.slice(a, b + 1).forEach((r) => { const rb = rowBox(r); if (rb && !rb.disabled) rb.checked = box.checked; });
          }
          last = row;
        }
        syncSelection(table);
        table.dataset.stateName = bodyRows(table).some((r) => r.getAttribute('aria-selected') === 'true') ? 'selected' : 'default';
      });
      syncSelection(table, false);
    }

    if (dfDollar(table).find('.table-handle').get(0)) initReorder(table);

    if (table.dataset.lockStart) {
      measureLocks(table);
      // measured on the next frame: re-pinning the locked columns inside the
      // observer would change layout mid-delivery (the "ResizeObserver loop")
      let frame = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => measureLocks(table));
      }).observe(table);
    }
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
