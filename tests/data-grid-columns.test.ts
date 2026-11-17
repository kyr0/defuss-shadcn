import { describe, expect, test } from 'vitest';
import { waitFor } from './helpers';

/**
 * Why: a reader arranges a Data Grid's columns - the menu at each header's end (sort, lock, show / hide, reset), a
 * header dragged to another place, an end edge dragged to resize, the same by keys and by a finger that rests first.
 * tests/e2e/big-data/data-grid.e2e.ts drives them with real mouse, keys and touches; this drives the same public
 * behaviors in the unit suite on the component's e2e fixture, through DOM events and the store only.
 */

type Grid = HTMLElement & { store: { value: { name: string; config: Record<string, any> } } };
type Win = Window & { df$: { shadcn: { dataGrid: Record<string, (...a: any[]) => any> } } };

async function openFixture(): Promise<{ win: Win; doc: Document; grid: Grid }> {
  document.body.innerHTML = '';
  const frame = document.createElement('iframe');
  frame.setAttribute('style', 'position:fixed;inset:0;width:1000px;height:900px;border:0;background:#fff');
  frame.src = '/tests/e2e/big-data/data-grid.e2e-fixture.html';
  document.body.appendChild(frame);
  await waitFor(() => (frame.contentWindow as any)?.__fixtureReady === true, 'the fixture', 15000);
  const doc = frame.contentDocument!;
  const grid = doc.getElementById('dg-orders') as Grid;
  const win = frame.contentWindow as Win;
  win.df$.shadcn.dataGrid.resetColumns(grid);
  win.df$.shadcn.dataGrid.query(grid, { sorters: [], filters: [] });
  return { win, doc, grid };
}

const header = (grid: HTMLElement, field: string) => grid.querySelector(`.data-grid-header[data-field="${field}"]`) as HTMLElement;
const shown = (grid: HTMLElement) =>
  [...grid.querySelectorAll<HTMLElement>('.data-grid-header:not([hidden])')].map((h) => h.dataset.field);
const menu = (grid: HTMLElement) => grid.querySelector('.data-grid-menu') as HTMLElement;
const item = (grid: HTMLElement, action: string, field?: string) =>
  menu(grid).querySelector(`[data-action="${action}"]${field ? `[data-field="${field}"]` : ''}`) as HTMLButtonElement;

function pointer(win: Window, el: Element, type: string, x: number, y: number, pointerType = 'mouse'): void {
  el.dispatchEvent(
    new (win as any).PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerType }),
  );
}

/** a press on el, moves to x, the release - as a mouse (or a finger that rests first) */
async function drag(win: Window, el: Element, toX: number, pointerType = 'mouse'): Promise<void> {
  const r = el.getBoundingClientRect();
  const y = r.top + r.height / 2;
  const x0 = r.left + Math.min(20, r.width / 2);
  pointer(win, el, 'pointerdown', x0, y, pointerType);
  if (pointerType === 'touch') await new Promise((ok) => setTimeout(ok, 550));
  for (let i = 1; i <= 6; i++) {
    pointer(win, el, 'pointermove', x0 + ((toX - x0) * i) / 6, y, pointerType);
    await new Promise((ok) => requestAnimationFrame(ok));
  }
  pointer(win, el, 'pointerup', toX, y, pointerType);
  // the click a real pointer ends in - swallowed after a drag
  el.dispatchEvent(new (win as any).MouseEvent('click', { bubbles: true }));
}

describe('data grid: arranging columns', () => {
  test('the menu: sort, lock, show / hide (never the last), reset; keys move inside it and Escape-like Tab leaves', async () => {
    const { win, grid } = await openFixture();
    const button = header(grid, 'region').querySelector('.data-grid-menu-button') as HTMLButtonElement;
    button.click();
    expect(menu(grid).matches(':popover-open')).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(menu(grid).getAttribute('aria-label')).toBe('Region column');
    item(grid, 'desc').click();
    expect(grid.store.value.config.sorters).toEqual([{ field: 'region', direction: 'desc' }]);
    expect(menu(grid).matches(':popover-open')).toBe(false);

    button.click();
    expect(item(grid, 'desc').getAttribute('aria-checked')).toBe('true');
    item(grid, 'lock').click();
    expect(grid.store.value.config.locked).toEqual(['id', 'region']);
    expect(item(grid, 'lock').getAttribute('aria-checked')).toBe('true');
    item(grid, 'lock').click();
    expect(grid.store.value.config.locked).toEqual(['id']);

    item(grid, 'show', 'customer').click();
    expect(grid.store.value.config.hidden).toEqual(['customer']);
    expect(shown(grid)).toEqual(['id', 'region', 'amount', 'status']);
    for (const f of ['id', 'amount', 'status']) item(grid, 'show', f).click();
    expect(shown(grid)).toEqual(['region']);
    expect(item(grid, 'show', 'region').disabled).toBe(true);

    // keys: arrows wrap, Home / End, Tab closes and focus goes back to the header
    item(grid, 'asc').focus();
    const key = (k: string) => (win.document.activeElement as HTMLElement).dispatchEvent(new (win as any).KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    key('ArrowUp');
    expect((win.document.activeElement as HTMLElement).dataset.action).toBe('reset');
    key('Home');
    expect((win.document.activeElement as HTMLElement).dataset.action).toBe('asc');
    key('End');
    key('ArrowDown');
    expect((win.document.activeElement as HTMLElement).dataset.action).toBe('asc');
    item(grid, 'reset').click();
    expect(shown(grid)).toEqual(['id', 'customer', 'region', 'amount', 'status']);
    expect(grid.store.value.config).toMatchObject({ hidden: [], widths: {}, locked: ['id'] });
    win.df$.shadcn.dataGrid.query(grid, { sorters: [] });
  });

  test('a mouse released outside the grid leaves no press behind; a view hiding every column shows them all', async () => {
    const { win, grid } = await openFixture();
    const r = header(grid, 'customer').getBoundingClientRect();
    pointer(win, header(grid, 'customer'), 'pointerdown', r.left + 10, r.top + 5);
    // the pointerup went elsewhere: the next move has no button down
    header(grid, 'customer').dispatchEvent(
      new (win as any).PointerEvent('pointermove', { bubbles: true, clientX: r.left + 200, clientY: r.top + 5, pointerId: 7, isPrimary: true, buttons: 0, pointerType: 'mouse' }),
    );
    expect(header(grid, 'customer').hasAttribute('data-dragging')).toBe(false);
    expect((grid as any)._press).toBeNull();
    win.df$.shadcn.dataGrid.query(grid, { hidden: ['id', 'customer', 'region', 'amount', 'status'] });
    expect(shown(grid)).toEqual(['id', 'customer', 'region', 'amount', 'status']);
    expect(grid.querySelectorAll('.data-grid-rows > .data-grid-row:first-child > .data-grid-cell').length).toBe(5);
    win.df$.shadcn.dataGrid.resetColumns(grid);
  });

  test('hiding the column the menu hangs from closes it; right click opens it', async () => {
    const { win, grid } = await openFixture();
    header(grid, 'amount').dispatchEvent(new (win as any).MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(menu(grid).matches(':popover-open')).toBe(true);
    item(grid, 'show', 'amount').click();
    expect(menu(grid).matches(':popover-open')).toBe(false);
    expect(header(grid, 'amount').hidden).toBe(true);
    win.df$.shadcn.dataGrid.resetColumns(grid);
  });

  test('a header dragged moves its column (no sort); into the locked group it locks; a finger rests first', async () => {
    const { win, grid } = await openFixture();
    const amount = header(grid, 'amount').getBoundingClientRect();
    await drag(win, header(grid, 'customer'), amount.right - 4);
    expect(grid.store.value.config.columns).toEqual(['id', 'region', 'amount', 'customer', 'status']);
    expect(grid.store.value.config.sorters).toEqual([]);
    expect(grid.querySelector('.data-grid-drop-marker')).toBeNull();

    await drag(win, header(grid, 'status'), header(grid, 'id').getBoundingClientRect().left + 4);
    expect(grid.store.value.config.locked).toEqual(['status', 'id']);

    // a finger: rests, then drags
    win.df$.shadcn.dataGrid.resetColumns(grid);
    await drag(win, header(grid, 'region'), header(grid, 'status').getBoundingClientRect().right - 4, 'touch');
    expect(grid.store.value.config.columns).toEqual(['id', 'customer', 'amount', 'status', 'region']);
    // a finger that rests and lets go opens the menu
    const r = header(grid, 'amount').getBoundingClientRect();
    pointer(win, header(grid, 'amount'), 'pointerdown', r.left + 10, r.top + 5, 'touch');
    await new Promise((ok) => setTimeout(ok, 550));
    expect(header(grid, 'amount').hasAttribute('data-pressed')).toBe(true);
    pointer(win, header(grid, 'amount'), 'pointerup', r.left + 10, r.top + 5, 'touch');
    expect(menu(grid).matches(':popover-open')).toBe(true);
    menu(grid).hidePopover();
    // a finger that moves before it rests scrolls: no drag
    pointer(win, header(grid, 'amount'), 'pointerdown', r.left + 10, r.top + 5, 'touch');
    pointer(win, header(grid, 'amount'), 'pointermove', r.left + 60, r.top + 5, 'touch');
    pointer(win, header(grid, 'amount'), 'pointerup', r.left + 60, r.top + 5, 'touch');
    expect(grid.store.value.config.columns).toEqual(['id', 'customer', 'amount', 'status', 'region']);
    win.df$.shadcn.dataGrid.resetColumns(grid);
  });

  test('the end edge resizes (a double click restores); Alt+Arrow keys resize and move; Alt+Arrow Down opens the menu', async () => {
    const { win, grid } = await openFixture();
    const handle = header(grid, 'customer').querySelector('.data-grid-resizer') as HTMLElement;
    const before = header(grid, 'customer').getBoundingClientRect().width;
    const h = handle.getBoundingClientRect();
    await drag(win, handle, h.left + h.width / 2 + 50);
    expect(grid.store.value.config.widths.customer).toBe(Math.round(before + 50));
    handle.dispatchEvent(new (win as any).MouseEvent('dblclick', { bubbles: true }));
    expect(grid.store.value.config.widths).toEqual({});

    const head = header(grid, 'customer');
    head.focus();
    (grid as any)._focus = { row: -1, col: 1 };
    const key = (k: string, mods: Record<string, boolean>) =>
      head.dispatchEvent(new (win as any).KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...mods }));
    key('ArrowRight', { altKey: true });
    expect(grid.store.value.config.widths.customer).toBe(Math.round(before) + 16);
    key('ArrowRight', { altKey: true, shiftKey: true });
    expect(grid.store.value.config.columns).toEqual(['id', 'region', 'customer', 'amount', 'status']);
    (grid as any)._focus = { row: -1, col: 2 };
    key('ArrowDown', { altKey: true });
    expect(menu(grid).matches(':popover-open')).toBe(true);
    expect((win.document.activeElement as HTMLElement).dataset.action).toBe('asc');
    menu(grid).hidePopover();
    win.df$.shadcn.dataGrid.resetColumns(grid);
  });
});
