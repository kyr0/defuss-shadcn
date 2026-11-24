import { describe, expect, test } from 'vitest';
import { waitFor } from './helpers';

/**
 * Why: the Data Grid's selection models (row, checkbox, cell, column, row + column), its clipboard and its drag and
 * drop (between grids, into a tree grid's rows, out to a Data Tree) are public behaviors a page builds on.
 * tests/e2e/big-data/data-grid.e2e.ts drives them with a real mouse and keys; this drives the same behaviors in the
 * unit suite on the component's e2e fixture, through DOM events (synthetic drags carry a DataTransfer) and the API.
 */

type Grid = HTMLElement & { store: { value: { name: string; config: Record<string, any> } } };
type Win = Window & { df$: { shadcn: { dataGrid: Record<string, (...a: any[]) => any>; dataTree: Record<string, (...a: any[]) => any> } } };

let fixture: Promise<{ win: Win; doc: Document }> | null = null;
function open(): Promise<{ win: Win; doc: Document }> {
  fixture ??= (async () => {
    document.body.innerHTML = '';
    const frame = document.createElement('iframe');
    frame.setAttribute('style', 'position:fixed;inset:0;width:1000px;height:900px;border:0;background:#fff');
    frame.src = '/tests/e2e/big-data/data-grid.e2e-fixture.html';
    document.body.appendChild(frame);
    await waitFor(() => (frame.contentWindow as any)?.__fixtureReady === true, 'the fixture', 15000);
    return { win: frame.contentWindow as Win, doc: frame.contentDocument! };
  })();
  return fixture;
}

const tick = () => new Promise((ok) => setTimeout(ok, 30));
const rowEl = (grid: HTMLElement, index: number) => grid.querySelector(`.data-grid-rows > .data-grid-row[data-index="${index}"]`) as HTMLElement;
const cellEl = (grid: HTMLElement, index: number, col: number) => rowEl(grid, index).children[col] as HTMLElement;
const config = (grid: Grid) => grid.store.value.config;

function click(win: Window, el: Element, init: MouseEventInit = {}) {
  el.dispatchEvent(new (win as any).MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
}
function pointer(win: Window, el: Element, type: string, at: Element, init: Record<string, unknown> = {}) {
  const r = at.getBoundingClientRect();
  el.dispatchEvent(
    new (win as any).PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: r.left + r.width / 2,
      clientY: r.top + r.height / 2,
      pointerId: 9,
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerType: 'mouse',
      ...init,
    }),
  );
}
function key(win: Window, el: Element, k: string, init: KeyboardEventInit = {}) {
  el.dispatchEvent(new (win as any).KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
}

/** a drag of a row (or a tree item) onto a point of a target: dragstart, dragenter / dragover, drop, dragend */
function dragTo(win: Win, from: Element, over: Element, at: Element, f = 0.5, init: Record<string, unknown> = {}) {
  const dt = new (win as any).DataTransfer();
  const r = at.getBoundingClientRect();
  const point = { clientX: r.left + 30, clientY: r.top + r.height * f, ...init };
  const fire = (el: Element, type: string) => {
    const e = new (win as any).DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, ...point });
    el.dispatchEvent(e);
    return e;
  };
  fire(from, 'dragstart');
  fire(over, 'dragenter');
  const over1 = fire(over, 'dragover');
  const drop = over1.defaultPrevented ? fire(over, 'drop') : null;
  fire(from, 'dragend');
  return { dt, accepted: over1.defaultPrevented, dropped: !!drop?.defaultPrevented };
}

describe('data grid: selection models, clipboard, drag and drop', () => {
  test('checkbox model: a box toggles its row, Shift+box a range, the head all or none; a row click just it; Space toggles; switching the model', async () => {
    const { win, doc } = await open();
    const grid = doc.getElementById('dg-check') as Grid;
    const box = (i: number) => rowEl(grid, i).querySelector('.data-grid-check .checkbox') as HTMLInputElement;
    const head = grid.querySelector('.data-grid-head .data-grid-check .checkbox') as HTMLInputElement;
    click(win, box(1));
    click(win, box(3));
    expect(config(grid).selected).toEqual([2, 4]);
    click(win, box(5), { shiftKey: true });
    expect(config(grid).selected).toEqual([2, 4, 5, 6]);
    expect([head.checked, head.indeterminate]).toEqual([false, true]);
    expect(rowEl(grid, 3).lastElementChild!.getAttribute('data-edge')).toBe('top start');
    click(win, head);
    expect(config(grid).selected.length).toBe(300);
    expect([head.checked, head.indeterminate]).toEqual([true, false]);
    click(win, head);
    expect(config(grid).selected).toEqual([]);
    cellEl(grid, 0, 1).dispatchEvent(new (win as any).PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true, pointerType: 'mouse', pointerId: 9 }));
    pointer(win, cellEl(grid, 0, 1), 'pointerup', cellEl(grid, 0, 1));
    expect(config(grid).selected).toEqual([1]);
    await tick();
    key(win, cellEl(grid, 0, 1), 'ArrowDown');
    key(win, cellEl(grid, 1, 1), ' ');
    expect(config(grid).selected).toEqual([1, 2]);
    grid.dataset.selectModel = 'row';
    await waitFor(() => !grid.querySelector('.data-grid-check'), 'the checkbox column goes');
    grid.dataset.selectModel = 'checkbox';
    await waitFor(() => !!grid.querySelector('.data-grid-rows .data-grid-check'), 'the checkbox column comes back');
    expect(grid.querySelector('.data-grid-filters > .data-grid-check')).not.toBeNull();
  });

  test('cell model: clicks, Shift and Ctrl, Shift+arrows, a sweep; copyText as TSV; paste writes the editable cells and refuses broken values; selectAll / clearSelection', async () => {
    const { win, doc } = await open();
    const grid = doc.getElementById('dg-cells') as Grid;
    const api = win.df$.shadcn.dataGrid;
    api.clearSelection(grid);
    click(win, cellEl(grid, 0, 1));
    click(win, cellEl(grid, 1, 3), { shiftKey: true });
    expect(config(grid).selectedRanges).toEqual([{ from: { id: 1, field: 'name' }, to: { id: 2, field: 'kind' } }]);
    click(win, cellEl(grid, 4, 4), { ctrlKey: true });
    expect(config(grid).selectedRanges.length).toBe(2);
    expect(api.copyText(grid).split('\n')[0]).toBe('Part 1\t0\ttool\t');
    // keys: an arrow selects the cell it reaches, Shift+arrows the rectangle
    click(win, cellEl(grid, 2, 1));
    key(win, cellEl(grid, 2, 1), 'ArrowRight', { shiftKey: true });
    key(win, cellEl(grid, 2, 2), 'ArrowDown', { shiftKey: true });
    expect(config(grid).selectedRanges).toEqual([{ from: { id: 3, field: 'name' }, to: { id: 4, field: 'qty' } }]);
    // a sweep from one cell to another
    cellEl(grid, 0, 0).dispatchEvent(new (win as any).PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true, pointerType: 'mouse', pointerId: 4, clientX: cellEl(grid, 0, 0).getBoundingClientRect().left + 5, clientY: cellEl(grid, 0, 0).getBoundingClientRect().top + 5 }));
    const to = cellEl(grid, 2, 2).getBoundingClientRect();
    grid.dispatchEvent(new (win as any).PointerEvent('pointermove', { bubbles: true, pointerId: 4, buttons: 1, pointerType: 'mouse', clientX: to.left + 10, clientY: to.top + 10 }));
    grid.dispatchEvent(new (win as any).PointerEvent('pointerup', { bubbles: true, pointerId: 4, pointerType: 'mouse', clientX: to.left + 10, clientY: to.top + 10 }));
    expect(config(grid).selectedRanges).toEqual([{ from: { id: 1, field: 'id' }, to: { id: 3, field: 'qty' } }]);
    await tick();
    // paste: one selected cell is where the block starts; Qty refuses -1
    click(win, cellEl(grid, 5, 1));
    const result = api.paste(grid, 'Nut\t7\nBolt\t-1');
    expect(result.written).toBe(3);
    expect(result.refused.map((r: any) => r.text)).toEqual(['-1']);
    expect(api.rows(grid).slice(5, 7).map((r: any) => [r.name, r.qty])).toEqual([['Nut', 7], ['Bolt', 6 * 13 % 50]]);
    api.selectAll(grid);
    expect(config(grid).selectedRanges).toEqual([{ from: { id: 1, field: 'id' }, to: { id: 300, field: 'note' } }]);
    api.clearSelection(grid);
    expect(config(grid).selectedRanges).toEqual([]);
  });

  test('column and row + column models: a header selects its column (Shift a range), the column under the pointer is marked; a cell selects its row', async () => {
    const { win, doc } = await open();
    const cols = doc.getElementById('dg-cols') as Grid;
    const header = (g: HTMLElement, f: string) => g.querySelector(`.data-grid-header[data-field="${f}"]`) as HTMLElement;
    click(win, header(cols, 'name'));
    click(win, header(cols, 'kind'), { shiftKey: true });
    expect(config(cols).selectedColumns).toEqual(['name', 'qty', 'kind']);
    expect(header(cols, 'qty').getAttribute('aria-selected')).toBe('true');
    expect(win.df$.shadcn.dataGrid.copyText(cols).split('\n')[0]).toBe('Part 1\t0\ttool');
    cellEl(cols, 2, 4).dispatchEvent(new (win as any).PointerEvent('pointerover', { bubbles: true }));
    expect(cellEl(cols, 0, 4).hasAttribute('data-hover')).toBe(true);
    const both = doc.getElementById('dg-both') as Grid;
    click(win, cellEl(both, 1, 2));
    expect([config(both).selected, config(both).selectedColumns]).toEqual([[2], []]);
    key(win, cellEl(both, 1, 2), ' ', { ctrlKey: true });
    expect(config(both).selectedColumns).toEqual(['qty']);
    expect(config(both).selected).toEqual([]);
  });

  test('drag and drop between grids: a row moves after another, Alt copies with a new id, the selected rows go together, beforedrop refuses, a grid without data-drop takes nothing', async () => {
    const { win, doc } = await open();
    const api = win.df$.shadcn.dataGrid;
    const from = doc.getElementById('dg-from') as Grid;
    const to = doc.getElementById('dg-to') as Grid;
    const ids = (g: HTMLElement) => api.rows(g).map((r: any) => r.id);
    const target = to.querySelector('.data-grid-viewport')!;
    const ends: string[] = [];
    from.addEventListener('data-grid-dragend', (e: any) => ends.push(e.detail.effect));
    const one = dragTo(win, rowEl(from, 0), target, rowEl(to, 0), 0.8);
    expect(one.dropped).toBe(true);
    expect(one.dt.getData('text/plain')).toBe('1\tTask 1\t3');
    expect(ids(to)).toEqual([101, 1, 102, 103]);
    expect(ids(from)[0]).toBe(2);
    expect(ends).toEqual(['move']);
    // Alt copies
    dragTo(win, rowEl(from, 0), target, rowEl(to, 0), 0.2, { altKey: true });
    expect(ids(to)).toEqual([104, 101, 1, 102, 103]);
    expect(ids(from)[0]).toBe(2);
    // the selected rows go together
    api.query(from, { selected: [3, 4] });
    dragTo(win, rowEl(from, 1), target, rowEl(to, 4), 0.9);
    expect(ids(to)).toEqual([104, 101, 1, 102, 103, 3, 4]);
    expect(ids(from).slice(0, 2)).toEqual([2, 5]);
    expect(config(to).selected).toEqual([3, 4]);
    // refused
    to.addEventListener('data-grid-beforedrop', (e) => e.preventDefault(), { once: true });
    dragTo(win, rowEl(from, 0), target, rowEl(to, 0));
    expect(ids(to).length).toBe(7);
    // no data-drop
    const plain = doc.getElementById('dg-check') as Grid;
    expect(dragTo(win, rowEl(from, 0), plain.querySelector('.data-grid-viewport')!, rowEl(plain, 0)).accepted).toBe(false);
    // within one grid: a move onto itself goes nowhere, before another moves it
    expect(dragTo(win, rowEl(from, 0), from.querySelector('.data-grid-viewport')!, rowEl(from, 0)).accepted).toBe(false);
    dragTo(win, rowEl(from, 2), from.querySelector('.data-grid-viewport')!, rowEl(from, 0), 0.1);
    expect(ids(from).slice(0, 3)).toEqual([6, 2, 5]);
    expect(from.querySelector('.data-grid-row-drop')).toBeNull();
  });

  test('a tree grid: rows go into another row with what lies under them, into a Data Tree item; a copy-only tree gives copies; insert() / remove()', async () => {
    const { win, doc } = await open();
    const api = win.df$.shadcn.dataGrid;
    const grid = doc.getElementById('dg-tree-dnd') as Grid;
    const tree = doc.getElementById('dt-drop') as HTMLElement;
    const rows = () => api.source(grid).rows.map((r: any) => [r.id, r.parentId]);
    const item = (i: number) => tree.querySelector(`.data-tree-items > .data-tree-item[data-index="${i}"]`) as HTMLElement;
    // Docs(0) a.txt(1) Old(2) b.txt(3) Music(4): b.txt into Music
    api.query(grid, { selected: [] });
    dragTo(win, rowEl(grid, 3), grid.querySelector('.data-grid-viewport')!, rowEl(grid, 4));
    expect(rows()).toEqual([[1, null], [2, 1], [3, 1], [5, null], [4, 5]]);
    expect(config(grid).expanded).toContain(5);
    // Docs into a.txt (under it): refused
    expect(dragTo(win, rowEl(grid, 0), grid.querySelector('.data-grid-viewport')!, rowEl(grid, 1)).accepted).toBe(false);
    // Old into the Archive's first item
    dragTo(win, rowEl(grid, 2), tree, item(0));
    expect(rows()).toEqual([[1, null], [2, 1], [5, null], [4, 5]]);
    expect(win.df$.shadcn.dataTree.source(tree).rows.map((r: any) => [r.id, r.parentId])).toEqual([['arch', null], [3, 'arch']]);
    // the Archive gives copies only
    await tick();
    dragTo(win, item(1), grid.querySelector('.data-grid-viewport')!, rowEl(grid, 0), 0.1);
    expect(rows()).toEqual([[6, null], [1, null], [2, 1], [5, null], [4, 5]]);
    expect(api.remove(grid, [5]).map((r: any) => r.id)).toEqual([5, 4]);
    expect(api.insert(grid, [{ id: 1, name: 'n' }], { id: 6, place: 'into' })!.map((r: any) => [r.id, r.parentId])).toEqual([[7, 6]]);
    expect(api.insert(grid, [{ id: 9 }], { id: 404, place: 'after' })).toBeNull();
  });
});
