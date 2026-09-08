// -- Virtual List ---------------------------------------------
// Windowed list: only the rows on screen exist in the DOM, and their elements
// are recycled as you scroll, so a list of ten rows and a list of ten million
// cost the same. Plus the named-state API so agents/tests can drive states by
// name (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); build.ts inlines it into the
// shipped .js, so this import never appears in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const _defussShadcn = defussGlobals();

const virtualListStates = ['default', 'loading', 'empty'];

/** Rows kept above and below the viewport so a fast flick never shows a gap. */
const OVERSCAN = 4;

/**
 * Browsers clamp how tall an element may be — Chrome around 33.5M px, Firefox
 * lower. A million 40px rows would need 40M px of sizer, past the cap, and the
 * end of the list would simply be unreachable. Past this threshold the sizer is
 * capped and scroll positions are mapped onto the real range instead, trading
 * scrollbar granularity (which nobody can perceive at that length) for a list
 * that actually reaches its last row.
 */
const MAX_SIZER_PX = 15_000_000;

/** Items per row: 1 is a list, more is a grid. */
const columnsOf = (list) => Math.max(1, parseInt(list.dataset.columns || '1', 10) || 1);

/** How many rows the items occupy — the unit the window is measured in. */
const rowCount = (list) => Math.ceil(list._count / columnsOf(list));

/** Total pixel height the rows would occupy if they all existed. */
const contentHeight = (list) => rowCount(list) * list._rowHeight;

/** Height given to the sizer — clamped so the browser can render it. */
const sizerHeight = (list) => Math.min(contentHeight(list), MAX_SIZER_PX);

/** scrollTop (capped space) -> offset into the full content (real space). */
function virtualOffset(list) {
  const viewport = list.clientHeight;
  const real = contentHeight(list) - viewport;
  const capped = sizerHeight(list) - viewport;
  if (real <= 0 || capped <= 0) return 0;
  return (list.scrollTop / capped) * real;
}

/** Writes the window of rows that belongs at the current scroll position. */
function render(list) {
  const rows = list._rows;
  if (!rows) return;
  const count = list._count;
  const cols = columnsOf(list);
  const total = rowCount(list);
  const rowHeight = list._rowHeight;
  const visible = Math.ceil(list.clientHeight / rowHeight) + OVERSCAN * 2;
  const offset = virtualOffset(list);
  let first = Math.max(0, Math.floor(offset / rowHeight) - OVERSCAN);
  if (first + visible > total) first = Math.max(0, total - visible);

  // grow/shrink the recycled pool to the window size
  while (rows.children.length < Math.min(visible, total)) {
    const row = document.createElement('div');
    row.className = 'virtual-list-row';
    row.setAttribute('role', cols > 1 ? 'row' : 'listitem');
    rows.appendChild(row);
  }
  while (rows.children.length > Math.min(visible, total)) {
    rows.lastElementChild.remove();
  }

  // The pool sits inside a translated wrapper: one transform per scroll frame
  // instead of one `top` write per row.
  const shift = first * rowHeight - (offset - list.scrollTop);
  rows.style.transform = `translateY(${shift}px)`;

  for (let i = 0; i < rows.children.length; i++) {
    const row = rows.children[i];
    const index = first + i;
    if (row._index === index) continue; // already showing this row — leave it be
    row._index = index;
    row.dataset.index = String(index);

    if (cols === 1) {
      row.setAttribute('aria-posinset', String(index + 1));
      row.setAttribute('aria-setsize', String(count));
      list._renderRow(row, index);
      continue;
    }

    // grid: the row holds `cols` recycled cells, and the tail row may be short
    row.setAttribute('aria-rowindex', String(index + 1));
    while (row.children.length < cols) {
      const cell = document.createElement('div');
      cell.className = 'virtual-list-cell';
      cell.setAttribute('role', 'gridcell');
      row.appendChild(cell);
    }
    for (let c = 0; c < cols; c++) {
      const cell = row.children[c];
      const itemIndex = index * cols + c;
      cell.setAttribute('aria-colindex', String(c + 1));
      if (itemIndex >= count) {
        // past the last item: keep the cell for recycling, hide it from view
        cell.hidden = true;
        cell.dataset.index = '';
        continue;
      }
      cell.hidden = false;
      cell.dataset.index = String(itemIndex);
      list._renderRow(cell, itemIndex);
    }
  }
}

/** Default row content when the consumer supplies no renderer. */
const defaultRenderRow = (row, index) => {
  row.textContent = `Row ${index + 1}`;
};

/**
 * UI side of setState: 'default' shows the rows (config `{ index }` scrolls
 * that row into view), 'loading' shows placeholder rows and marks the list
 * busy, 'empty' shows the empty message. State lives on the element.
 */
function triggerStateChange(list, stateName, config) {
  list.dataset.state = stateName;
  switch (stateName) {
    case 'default':
      list.removeAttribute('aria-busy');
      render(list);
      if (typeof config.index === 'number') {
        const item = Math.max(0, Math.min(list._count - 1, config.index));
        const real = Math.floor(item / columnsOf(list)) * list._rowHeight;
        const viewport = list.clientHeight;
        const ratio = Math.max(0, contentHeight(list) - viewport)
          ? (sizerHeight(list) - viewport) / (contentHeight(list) - viewport)
          : 0;
        list.scrollTop = real * ratio;
        render(list);
      }
      break;
    case 'loading':
      list.setAttribute('aria-busy', 'true');
      break;
    case 'empty':
      list.removeAttribute('aria-busy');
      break;
  }
}

/** Registry-level API; pass the list element explicitly. Unknown names throw. */
export const virtualListApi = {
  setState(list, stateName, config = {}) {
    if (!virtualListStates.includes(stateName)) {
      throw new Error(
        `virtual-list: unknown state "${stateName}" (supported: ${virtualListStates.join(', ')})`,
      );
    }
    triggerStateChange(list, stateName, config);
    // state lives on the ELEMENT, not the module: every instance on a page may
    // sit in a different state
    list.dataset.stateName = stateName;
    list._stateConfig = config;
  },
  getState(list) {
    return { name: list.dataset.stateName || 'default', config: list._stateConfig ?? {} };
  },
};

_defussShadcn.virtualListApi = virtualListApi;
_defussShadcn.virtualListStates = virtualListStates;

/**
 * Public imperative API (AGENTS.md "No window globals"): hand a list its data.
 * `count` may be any number the platform can hold — nothing is allocated per
 * row. `renderRow(rowElement, index)` fills a recycled element; it must not
 * assume the element is empty or new.
 */
_defussShadcn.virtualList = {
  setData(list, count, renderRow) {
    list._count = Math.max(0, Math.floor(count) || 0);
    if (renderRow) list._renderRow = renderRow;
    const sizer = list.querySelector('.virtual-list-sizer');
    if (sizer) sizer.style.height = `${sizerHeight(list)}px`;
    if (columnsOf(list) > 1) list.setAttribute('aria-rowcount', String(rowCount(list)));
    if (list._rows) {
      Array.from(list._rows.children).forEach((row) => { row._index = -1; });
    }
    virtualListApi.setState(list, list._count ? 'default' : 'empty');
  },
};

function init() {
  document.querySelectorAll('.virtual-list:not([data-init])').forEach((list) => {
    list.dataset.init = '';

    // the sizer gives the scrollbar its length; the pool rides inside it
    let sizer = list.querySelector('.virtual-list-sizer');
    if (!sizer) {
      sizer = document.createElement('div');
      sizer.className = 'virtual-list-sizer';
      list.appendChild(sizer);
    }
    let rows = sizer.querySelector('.virtual-list-rows');
    if (!rows) {
      rows = document.createElement('div');
      rows.className = 'virtual-list-rows';
      sizer.appendChild(rows);
    }

    list._rows = rows;
    list._renderRow = list._renderRow || defaultRenderRow;
    list._rowHeight =
      parseFloat(getComputedStyle(list).getPropertyValue('--virtual-list-row-height')) || 40;
    list._count = parseInt(list.dataset.count || '0', 10) || 0;

    const cols = columnsOf(list);
    list.setAttribute('role', cols > 1 ? 'grid' : 'list');
    if (cols > 1) list.setAttribute('aria-colcount', String(cols));
    if (!list.hasAttribute('tabindex')) list.tabIndex = 0; // arrow keys scroll it

    sizer.style.height = `${sizerHeight(list)}px`;

    // one render per animation frame, however many scroll events arrive
    let queued = false;
    list.addEventListener(
      'scroll',
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          if (list.dataset.state !== 'loading' && list.dataset.state !== 'empty') render(list);
        });
      },
      { passive: true },
    );

    // the visible window depends on the container height, not just scrolling
    new ResizeObserver(() => {
      if (list.dataset.state !== 'loading' && list.dataset.state !== 'empty') render(list);
    }).observe(list);

    list.api = {
      setState: (stateName, config) => virtualListApi.setState(list, stateName, config),
      getState: () => virtualListApi.getState(list),
    };

    virtualListApi.setState(list, list._count ? 'default' : 'empty');
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
