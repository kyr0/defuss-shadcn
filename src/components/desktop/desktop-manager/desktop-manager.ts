// -- Desktop Manager ----------------------------------------------
// The icon surface of a desktop: icons on a grid, selected like a classic
// desktop - a click selects one, Ctrl / Cmd adds or removes one, Shift takes
// the range, a press on an empty spot draws a rubber band that selects every
// icon it touches (Ctrl keeps the earlier ones) - moved by dragging (the whole
// selection, snapped to the grid), driven by the keyboard (arrows by place,
// Shift extends, Ctrl+A, Enter opens, Delete, F2 renames, Escape clears).
// Opening, deleting and renaming are events: the page decides what they mean.
// The selection model follows defuss-desktop's SelectionModel (MIT), rebuilt
// on Pointer Events so mouse, pen and touch draw the same band.
// VERIFIED: (desktop-manager.e2e) the band selects live while it is drawn, by mouse and by touch; a press near an
// icon is moved onto it by Chromium's touch adjustment, so the band starts on ground clear of icons.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

/** What desktop-open, desktop-select and desktop-delete carry. */
interface DesktopIconsDetail {
  /** the data-value of every icon concerned, in icon order */
  values: string[];
}

/** What desktop-rename carries. */
interface DesktopRenameDetail {
  /** the renamed icon's data-value */
  value: string;
  /** its new label */
  label: string;
}

const desktopManagerStates = ['default', 'selected'];

/** setState() configs per state. */
export interface DesktopManagerStateConfigs {
  /** No icon selected. */
  default: {};
  /** Some icons selected. */
  selected: {
    /** the data-value of every selected icon */
    values?: string[];
  };
}

/** A press must travel this far (px) before it draws a band or drags icons - a click stays a click. */
const SLOP = 4;

const resolve = (target) =>
  typeof target === 'string' ? (dfDollar('#' + CSS.escape(target)).get(0) ?? dfDollar(target).get(0)) : target;

const icons = (m: HTMLElement): HTMLElement[] => dfDollar(m).find<HTMLElement>(':scope > .desktop-icon').toArray();
const valueOf = (i: HTMLElement): string => i.dataset.value ?? dfDollar(i).find('.desktop-icon-label').text().trim();
const selectedOf = (m: HTMLElement): HTMLElement[] =>
  icons(m).filter((i) => i.getAttribute('aria-selected') === 'true');

/** The markup of a state: aria-selected on every icon. */
function applyMarkup(m, stateName, values: string[] = []) {
  const on = new Set(stateName === 'selected' ? values : []);
  for (const i of icons(m)) dfDollar(i).attr('aria-selected', on.has(valueOf(i)) ? 'true' : 'false');
}

/** UI side of setState: the icons the config names are selected, every other one is not. */
function triggerStateChange(m, stateName, config) {
  applyMarkup(m, stateName, config.values ?? []);
  const first = selectedOf(m)[0];
  if (first) setCurrent(m, first, false);
}

/** Registry-level API; pass the .desktop-manager element explicitly. Unknown names throw. */
export const desktopManagerApi = componentState({
  component: 'desktop-manager',
  states: desktopManagerStates,
  events: ['desktop-select'],
  apply: (m, state) => triggerStateChange(m, state.name, state.config),
  // the selection is the truth - clicks, the band and keys change it without setState
  read: (m) => {
    const values = selectedOf(m).map(valueOf);
    return values.length ? { name: 'selected', config: { values } } : { name: 'default', config: {} };
  },
  markup: (el, state) => applyMarkup(el, state.name, (state.config.values as string[] | undefined) ?? []),
});

df$.desktopManagerApi = desktopManagerApi;
df$.desktopManagerStates = desktopManagerStates;

/** The icon with the roving tabindex (and focus when asked). */
function setCurrent(m: HTMLElement, icon: HTMLElement, focus = true) {
  for (const i of icons(m)) i.tabIndex = i === icon ? 0 : -1;
  if (focus) icon.focus({ preventScroll: true });
}

function emit(m: HTMLElement, type: string, values: string[]) {
  m.dispatchEvent(new CustomEvent<DesktopIconsDetail>(type, { bubbles: true, detail: { values } }));
}

/** Writes a selection and tells the page (desktop-select) when it changed. */
function choose(m: HTMLElement, list: HTMLElement[]) {
  const before = selectedOf(m).map(valueOf).join('\n');
  const on = new Set(list);
  for (const i of icons(m)) i.setAttribute('aria-selected', on.has(i) ? 'true' : 'false');
  const values = selectedOf(m).map(valueOf);
  // Fires when the selection changes - by click, band, keys or setState.
  if (values.join('\n') !== before)
    m.dispatchEvent(new CustomEvent<DesktopIconsDetail>('desktop-select', { bubbles: true, detail: { values } }));
}

const hits = (a: DOMRect, b: DOMRect) =>
  !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);

/** The rubber band: from a press on an empty spot, every icon it touches is selected while it is drawn. */
function band(m: HTMLElement, down: PointerEvent) {
  const box = () => m.getBoundingClientRect();
  const base = down.ctrlKey || down.metaKey ? selectedOf(m) : [];
  const x0 = down.clientX,
    y0 = down.clientY;
  let el: HTMLElement | null = null;
  m.setPointerCapture(down.pointerId);
  const move = (e: PointerEvent) => {
    if (!el) {
      if (Math.hypot(e.clientX - x0, e.clientY - y0) < SLOP) return;
      el = document.createElement('div');
      el.className = 'desktop-manager-band';
      m.append(el);
      m.setAttribute('data-selecting', '');
    }
    const b = box();
    const left = Math.min(x0, e.clientX),
      top = Math.min(y0, e.clientY);
    const w = Math.abs(e.clientX - x0),
      h = Math.abs(e.clientY - y0);
    el.style.left = `${left - b.left + m.scrollLeft}px`;
    el.style.top = `${top - b.top + m.scrollTop}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    const r = new DOMRect(left, top, w, h);
    const inside = icons(m).filter((i) => hits(i.getBoundingClientRect(), r));
    choose(m, [...new Set([...base, ...inside])]);
  };
  const up = () => {
    m.removeEventListener('pointermove', move);
    m.removeEventListener('pointerup', up);
    m.removeEventListener('pointercancel', up);
    if (el) {
      el.remove();
      m.removeAttribute('data-selecting');
      const first = selectedOf(m)[0];
      if (first) setCurrent(m, first, false);
    } else if (!base.length) choose(m, []);
  };
  m.addEventListener('pointermove', move);
  m.addEventListener('pointerup', up);
  m.addEventListener('pointercancel', up);
}

/** The grid's cells: track sizes and gaps from the computed grid, in px. */
function grid(m: HTMLElement) {
  const cs = getComputedStyle(m);
  const rows = cs.gridTemplateRows.split(' ').filter((x) => x.endsWith('px')).length || 1;
  const cellH = parseFloat(cs.gridTemplateRows) || 80;
  const cellW = parseFloat(cs.gridAutoColumns) || 80;
  const gapY = parseFloat(cs.rowGap) || 0,
    gapX = parseFloat(cs.columnGap) || 0;
  return {
    rows,
    cellH,
    cellW,
    gapY,
    gapX,
    padT: parseFloat(cs.paddingTop) || 0,
    padL: parseFloat(cs.paddingLeft) || 0,
  };
}
const cellAt = (g, x: number, y: number) => ({
  row: Math.min(g.rows, Math.max(1, Math.floor((y - g.padT) / (g.cellH + g.gapY)) + 1)),
  col: Math.max(1, Math.floor((x - g.padL) / (g.cellW + g.gapX)) + 1),
});

/** Dragging icons: the selection follows the pointer and lands on free grid cells. */
function dragIcons(m: HTMLElement, icon: HTMLElement, down: PointerEvent) {
  const x0 = down.clientX,
    y0 = down.clientY;
  let moving = false;
  icon.setPointerCapture(down.pointerId);
  const sel = () => selectedOf(m);
  const move = (e: PointerEvent) => {
    const dx = e.clientX - x0,
      dy = e.clientY - y0;
    if (!moving && Math.hypot(dx, dy) < SLOP) return;
    moving = true;
    m.setAttribute('data-dragging', '');
    for (const i of sel()) i.style.translate = `${dx}px ${dy}px`;
  };
  const up = (e: PointerEvent) => {
    icon.removeEventListener('pointermove', move);
    icon.removeEventListener('pointerup', up);
    icon.removeEventListener('pointercancel', up);
    if (!moving) return;
    m.removeAttribute('data-dragging');
    icon._dmDragged = true;
    const g = grid(m);
    const box = m.getBoundingClientRect();
    const moved = sel();
    const taken = new Set(
      icons(m)
        .filter((i) => !moved.includes(i))
        .map((i) => {
          const c = cellAt(g, i.offsetLeft + i.offsetWidth / 2, i.offsetTop + i.offsetHeight / 2);
          return `${c.row}/${c.col}`;
        }),
    );
    for (const i of moved) {
      const r = i.getBoundingClientRect();
      let c = cellAt(g, r.left + r.width / 2 - box.left + m.scrollLeft, r.top + r.height / 2 - box.top + m.scrollTop);
      // a taken cell: the next free one down the column, then the next columns
      while (taken.has(`${c.row}/${c.col}`))
        c = c.row < g.rows ? { row: c.row + 1, col: c.col } : { row: 1, col: c.col + 1 };
      taken.add(`${c.row}/${c.col}`);
      i.style.translate = '';
      i.style.gridArea = `${c.row} / ${c.col}`;
    }
    if (e.type === 'pointercancel') return;
  };
  icon.addEventListener('pointermove', move);
  icon.addEventListener('pointerup', up);
  icon.addEventListener('pointercancel', up);
}

/** The icon nearest to `from` in a direction, by place on screen (icons may have been moved anywhere). */
function nearest(m: HTMLElement, from: HTMLElement, key: string): HTMLElement | undefined {
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2,
    ay = a.top + a.height / 2;
  let best: HTMLElement | undefined,
    bestD = Infinity;
  for (const i of icons(m)) {
    if (i === from) continue;
    const b = i.getBoundingClientRect();
    const dx = b.left + b.width / 2 - ax,
      dy = b.top + b.height / 2 - ay;
    const ahead = key === 'ArrowDown' ? dy > 1 : key === 'ArrowUp' ? dy < -1 : key === 'ArrowRight' ? dx > 1 : dx < -1;
    if (!ahead) continue;
    // along the axis counts once, across it three times: the next icon in line wins over a diagonal one
    const d =
      key === 'ArrowDown' || key === 'ArrowUp' ? Math.abs(dy) + 3 * Math.abs(dx) : Math.abs(dx) + 3 * Math.abs(dy);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** F2: the label becomes editable; Enter keeps it (desktop-rename), Escape or leaving puts the old one back. */
function rename(m: HTMLElement, icon: HTMLElement) {
  const label = dfDollar(icon).find('.desktop-icon-label').get(0) as HTMLElement | undefined;
  if (!label || label.isContentEditable) return;
  const old = label.textContent ?? '';
  label.contentEditable = 'true';
  label.focus();
  getSelection()?.selectAllChildren(label);
  const done = (keep: boolean) => {
    label.removeEventListener('keydown', key);
    label.removeEventListener('blur', blur);
    label.removeAttribute('contenteditable');
    const text = (label.textContent ?? '').trim();
    if (!keep || !text || text === old.trim()) label.textContent = old;
    else
      // Fires when an icon was renamed with F2 - its value and the new label (the page keeps the name).
      m.dispatchEvent(
        new CustomEvent<DesktopRenameDetail>('desktop-rename', {
          bubbles: true,
          detail: { value: valueOf(icon), label: text },
        }),
      );
    setCurrent(m, icon);
  };
  const key = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      done(true);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      done(false);
    }
  };
  const blur = () => done(false);
  label.addEventListener('keydown', key);
  label.addEventListener('blur', blur);
}

function bind(m: HTMLElement) {
  m.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0 || (e.target as Element).closest('[contenteditable="true"]')) return;
    const icon = (e.target as Element).closest('.desktop-icon') as HTMLElement | null;
    if (!icon || !m.contains(icon)) {
      if (e.target === m) {
        e.preventDefault();
        m.focus({ preventScroll: true });
        band(m, e);
      }
      return;
    }
    e.preventDefault();
    const sel = selectedOf(m);
    if (e.shiftKey && m._dmAnchor && m.contains(m._dmAnchor)) {
      const all = icons(m);
      const [a, b] = [all.indexOf(m._dmAnchor), all.indexOf(icon)].sort((x, y) => x - y);
      choose(m, all.slice(a, b + 1));
    } else if (e.ctrlKey || e.metaKey) {
      choose(m, sel.includes(icon) ? sel.filter((i) => i !== icon) : [...sel, icon]);
      m._dmAnchor = icon;
    } else {
      // a press on a selected icon keeps the selection: it may be the start of a drag
      if (!sel.includes(icon)) choose(m, [icon]);
      else icon._dmNarrow = sel.length > 1;
      m._dmAnchor = icon;
    }
    setCurrent(m, icon);
    if (icon.getAttribute('aria-selected') === 'true') dragIcons(m, icon, e);
  });
  // a click (no drag) on one of several selected icons narrows the selection to it
  m.addEventListener('click', (e) => {
    const icon = (e.target as Element).closest('.desktop-icon') as HTMLElement | null;
    if (!icon) return;
    if (icon._dmNarrow && !icon._dmDragged && !(e.ctrlKey || e.metaKey || e.shiftKey)) choose(m, [icon]);
    icon._dmNarrow = false;
    icon._dmDragged = false;
  });
  m.addEventListener('dblclick', (e) => {
    const icon = (e.target as Element).closest('.desktop-icon') as HTMLElement | null;
    // Fires when icons are opened - a double click, or Enter on the selection.
    if (icon) emit(m, 'desktop-open', [valueOf(icon)]);
  });
  m.addEventListener('keydown', (e) => {
    if ((e.target as Element).closest('[contenteditable="true"]')) return;
    const all = icons(m);
    const cur = (e.target as Element).closest('.desktop-icon') as HTMLElement | null;
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      choose(m, all);
      return;
    }
    if (e.key === 'Escape') {
      choose(m, []);
      return;
    }
    if (e.key === 'Enter' && selectedOf(m).length) {
      e.preventDefault();
      emit(m, 'desktop-open', selectedOf(m).map(valueOf));
      return;
    }
    if (e.key === 'Delete' && selectedOf(m).length) {
      e.preventDefault();
      // Fires when Delete is pressed on a selection - the page removes the icons, or asks first.
      emit(m, 'desktop-delete', selectedOf(m).map(valueOf));
      return;
    }
    if (e.key === 'F2' && cur) {
      e.preventDefault();
      rename(m, cur);
      return;
    }
    if (e.key === ' ' && cur) {
      e.preventDefault();
      const sel = selectedOf(m);
      if (e.ctrlKey || e.metaKey) choose(m, sel.includes(cur) ? sel.filter((i) => i !== cur) : [...sel, cur]);
      else choose(m, [cur]);
      m._dmAnchor = cur;
      return;
    }
    if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const from = cur ?? all.find((i) => i.tabIndex === 0) ?? all[0];
    if (!from) return;
    const next = cur ? nearest(m, from, e.key) : from;
    if (!next) return;
    setCurrent(m, next);
    if (e.shiftKey) {
      const anchor = m._dmAnchor && m.contains(m._dmAnchor) ? m._dmAnchor : from;
      m._dmAnchor = anchor;
      const [a, b] = [all.indexOf(anchor), all.indexOf(next)].sort((x, y) => x - y);
      choose(m, all.slice(a, b + 1));
    } else if (!(e.ctrlKey || e.metaKey)) {
      choose(m, [next]);
      m._dmAnchor = next;
    }
  });
  // focus arriving on the desktop itself goes on to the current icon
  m.addEventListener('focus', () => {
    const cur = icons(m).find((i) => i.tabIndex === 0);
    if (cur && document.activeElement === m && !m.hasAttribute('data-selecting')) cur.focus({ preventScroll: true });
  });
}

/**
 * Select icons by value (every other one is unselected).
 * @param target - the .desktop-manager element, its id or a selector
 * @param values - the data-value of each icon to select; an empty list clears the selection
 * @returns the values selected now
 */
const select = (target: string | HTMLElement, values: string[]): string[] => {
  const m = resolve(target);
  if (!m) return [];
  desktopManagerApi.setState(m, values.length ? 'selected' : 'default', values.length ? { values } : {});
  return selectedOf(m).map(valueOf);
};

/**
 * The selected icons.
 * @param target - the .desktop-manager element, its id or a selector
 * @returns their values, in icon order
 */
const selected = (target: string | HTMLElement): string[] => {
  const m = resolve(target);
  return m ? selectedOf(m).map(valueOf) : [];
};

/**
 * Lines the icons up again in their markup order (drops every place they were dragged to).
 * @param target - the .desktop-manager element, its id or a selector
 */
const arrange = (target: string | HTMLElement): void => {
  const m = resolve(target);
  if (m)
    for (const i of icons(m)) {
      i.style.gridArea = '';
      if (!i.getAttribute('style')) i.removeAttribute('style');
    }
};

/** df$.shadcn.desktopManager - select, read and arrange a desktop's icons. */
export const desktopManagerActions = { select, selected, arrange };
df$.desktopManager = desktopManagerActions;

function init() {
  dfDollar('.desktop-manager:not([data-init])')
    .toArray()
    .forEach((m) => {
      m.dataset.init = '';
      if (!m.hasAttribute('tabindex')) m.tabIndex = -1;
      const all = icons(m);
      for (const i of all) if (!i.hasAttribute('aria-selected')) i.setAttribute('aria-selected', 'false');
      const first = all.find((i) => i.getAttribute('aria-selected') === 'true') ?? all[0];
      if (first) setCurrent(m, first, false);
      bind(m);
      // el.store + el.api (AGENTS.md "State through stores")
      bindComponent(m, desktopManagerApi);
    });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
