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
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

/** default = as authored (original order, no sort, nothing selected);
 * sorted = { column, direction }; selected = { rows: [indices] | 'all' }. */
const tableStates = ['default', 'sorted', 'selected'];

const bodyOf = (table) => table.tBodies[0];
const bodyRows = (table) => [...(bodyOf(table)?.rows ?? [])];
const rowBox = (row) => row.querySelector(':scope > .table-select input[type="checkbox"]');
const headBox = (table) => table.tHead?.querySelector('.table-select input[type="checkbox"]');

/* -- Sorting --------------------------------------------------------------- */
function cellValue(row, col) {
  const cell = row.cells[col];
  if (!cell) return '';
  return cell.dataset.sortValue ?? cell.textContent.trim();
}
function sortBy(table, col, direction) {
  const body = bodyOf(table);
  if (!body) return;
  const lang = table.closest('[lang]')?.lang || undefined;
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
    if (th.querySelector('.table-sort')) th.setAttribute('aria-sort', i === col ? direction : 'none');
  });
  table._sort = { column: col, direction };
}
function unsort(table) {
  const body = bodyOf(table);
  if (body && table._original) body.append(...table._original.filter((r) => r.parentElement === body));
  table.tHead?.querySelectorAll('[aria-sort]').forEach((th) => th.setAttribute('aria-sort', 'none'));
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
    table.dispatchEvent(new CustomEvent('table-select', { bubbles: true, detail: { rows: selected, count: selected.length } }));
  }
}
function selectRows(table, which) {
  const rows = bodyRows(table);
  rows.forEach((row, i) => {
    const on = which === 'all' || (Array.isArray(which) && which.includes(i));
    const box = rowBox(row);
    if (box) box.checked = on;
    row.setAttribute('aria-selected', String(on));
  });
  syncSelection(table);
}

/* -- Reordering ------------------------------------------------------------ */
function announceMove(table, row) {
  table.dispatchEvent(new CustomEvent('table-reorder', { bubbles: true, detail: { row, index: bodyRows(table).indexOf(row) } }));
}
function moved(table, row) {
  // a manual order is no longer the sorted one
  table.tHead?.querySelectorAll('[aria-sort]').forEach((th) => th.setAttribute('aria-sort', 'none'));
  table._sort = null;
  announceMove(table, row);
}
function initReorder(table) {
  let dragged = null;
  const clear = () => table.querySelectorAll('[data-drop]').forEach((r) => r.removeAttribute('data-drop'));
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
    const row = table.querySelector('tbody > tr[data-drop]');
    if (!dragged || !row) return;
    e.preventDefault();
    row.parentElement.insertBefore(dragged, row.dataset.drop === 'before' ? row : row.nextSibling);
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
    row.parentElement.insertBefore(row, e.key === 'ArrowUp' ? sib : sib.nextSibling);
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
    case 'sorted':
      sortBy(table, config?.column ?? 0, config?.direction === 'descending' ? 'descending' : 'ascending');
      break;
    case 'selected':
      selectRows(table, config?.rows ?? [0]);
      break;
  }
}

/** Registry-level API; pass the table explicitly. Unknown names throw. */
export const tableApi = {
  setState(table, stateName, config = {}) {
    if (!tableStates.includes(stateName)) {
      throw new Error(`table: unknown state "${stateName}" (supported: ${tableStates.join(', ')})`);
    }
    triggerStateChange(table, stateName, config);
    table.dataset.stateName = stateName;
    table._stateConfig = config;
  },
  getState(table) {
    const selected = bodyRows(table).flatMap((r, i) => (r.getAttribute('aria-selected') === 'true' ? [i] : []));
    return { name: table.dataset.stateName || 'default', config: { ...table._stateConfig, sort: table._sort ?? null, selected } };
  },
};

df$.tableApi = tableApi;
df$.tableStates = tableStates;

function init() {
  document.querySelectorAll('table.table:not([data-init])').forEach((table) => {
    table.dataset.init = '';
    table.dataset.stateName = 'default';
    table._original = bodyRows(table);
    table._sort = null;
    table.api = {
      setState: (stateName, config) => tableApi.setState(table, stateName, config),
      getState: () => tableApi.getState(table),
    };

    // sorting: a click on a .table-sort button cycles ascending → descending → as authored
    table.tHead?.querySelectorAll('.table-sort').forEach((btn) => {
      const th = btn.closest('th');
      if (!th.hasAttribute('aria-sort')) th.setAttribute('aria-sort', 'none');
      btn.addEventListener('click', () => {
        const col = th.cellIndex;
        const now = th.getAttribute('aria-sort');
        const next = now === 'ascending' ? 'descending' : now === 'descending' ? 'none' : 'ascending';
        if (next === 'none') unsort(table);
        else sortBy(table, col, next);
        table.dataset.stateName = next === 'none' ? 'default' : 'sorted';
        table.dispatchEvent(new CustomEvent('table-sort', { bubbles: true, detail: { column: col, direction: next } }));
      });
    });
    // an authored aria-sort sorts on load
    const pre = table.tHead?.querySelector('th[aria-sort="ascending"], th[aria-sort="descending"]');
    if (pre) sortBy(table, pre.cellIndex, pre.getAttribute('aria-sort'));

    // selection
    if (table.querySelector('.table-select input[type="checkbox"]')) {
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

    if (table.querySelector('.table-handle')) initReorder(table);

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
