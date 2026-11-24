import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: a data grid is only useful at sizes where a table cannot render every
 * row. These checks drive a 100,000-row grid and an 11,020-row tree grid and
 * pin what the component promises: the DOM stays a window of rows, every
 * query (multisort, column filters, locked columns, pages, infinite loading,
 * selection, expand / collapse) runs over ALL rows and lives in the store's
 * config, the ARIA grid / treegrid contract holds, and the keyboard moves
 * cell by cell.
 */

const server = startServer();
const browser = await chromium.launch();
let failures = 0;

const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
};

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  const ready = async () => {
    await page.goto(`${server.url}/tests/e2e/big-data/data-grid.e2e-fixture.html`);
    await page.waitForFunction(() => (globalThis as Record<string, unknown>).__fixtureReady === true, null, { timeout: 15_000 });
    await page.waitForFunction(() => (document.querySelector('#dg-infinite') as any)?.store?.value.name === 'default', null, { timeout: 10_000 });
  };
  await ready();

  type Info = { state: string; config: any; rows: number; cells: string[][]; status: string; headers: string[] };
  const info = (sel: string): Promise<Info> =>
    page.$eval(sel, (g: any) => ({
      state: g.store.value.name,
      config: g.store.value.config,
      rows: g.querySelectorAll('.data-grid-rows > .data-grid-row').length,
      cells: [...g.querySelectorAll('.data-grid-rows > .data-grid-row')].slice(0, 3).map((r: any) => [...r.children].map((c: any) => c.textContent)),
      status: g.querySelector('.data-grid-status')?.textContent ?? '',
      headers: [...g.querySelectorAll('.data-grid-header')].map((h: any) => h.dataset.field),
    }));

  await check('data-grid.js initialized every grid (data-init, role, el.store, el.api)', async () => {
    const s = await page.$$eval('.data-grid', (gs) => gs.map((g: any) => [g.id, g.dataset.init, g.querySelector('.data-grid-viewport').getAttribute('role'), typeof g.store?.subscribe, typeof g.api?.render]));
    for (const [id, init, role, store, render] of s) {
      assert.equal(init, '', `${id}: data-init`);
      assert.equal(role, id === 'dg-tree' || id === 'dg-tree-dnd' ? 'treegrid' : 'grid', `${id}: role (on the viewport)`);
      assert.equal(store, 'function', `${id}: el.store`);
      assert.equal(render, 'function', `${id}: el.api.render`);
    }
  });

  await check('100,000 rows render as a window of a few dozen rows', async () => {
    const s = await info('#dg-orders');
    assert.ok(s.rows > 5 && s.rows < 40, `pool of ${s.rows}`);
    assert.equal(s.status, '100,000 rows');
    assert.deepEqual(s.cells[0], ['1', 'Ada A.', 'EU', '€0.00', 'open']);
    const aria = await page.$eval('#dg-orders .data-grid-viewport', (g) => [g.getAttribute('aria-rowcount'), g.getAttribute('aria-colcount'), g.getAttribute('aria-multiselectable')]);
    assert.deepEqual(aria, ['100002', '5', 'true'], 'rows + header + filter row');
  });

  await check('scrolling to the end shows the last row, with its aria-rowindex', async () => {
    await page.$eval('#dg-orders .data-grid-viewport', (v) => { v.scrollTop = v.scrollHeight; });
    await page.waitForTimeout(150);
    const last = await page.$eval('#dg-orders .data-grid-rows', (p) => {
      const rows = [...p.children] as HTMLElement[];
      const row = rows[rows.length - 1];
      return [row.children[0].textContent, row.getAttribute('aria-rowindex')];
    });
    assert.deepEqual(last, ['100000', '100002']);
    await page.$eval('#dg-orders .data-grid-viewport', (v) => { v.scrollTop = 0; });
  });

  await check('multisort: a click sorts by one column (asc → desc → off), Shift+click adds a column', async () => {
    await page.click('#dg-orders .data-grid-header[data-field="amount"]');
    let s = await info('#dg-orders');
    assert.deepEqual(s.config.sorters, [{ field: 'amount', direction: 'asc' }]);
    await page.click('#dg-orders .data-grid-header[data-field="amount"]');
    await page.click('#dg-orders .data-grid-header[data-field="region"]', { modifiers: ['Shift'] });
    s = await info('#dg-orders');
    assert.deepEqual(s.config.sorters, [{ field: 'amount', direction: 'desc' }, { field: 'region', direction: 'asc' }]);
    assert.equal(s.cells[0][3], '€999.99');
    const sort = await page.$$eval('#dg-orders .data-grid-header', (hs) => hs.map((h) => [h.dataset.field, h.getAttribute('aria-sort'), h.dataset.sortIndex ?? null]));
    assert.deepEqual(sort.find((x) => x[0] === 'amount'), ['amount', 'descending', '1']);
    assert.deepEqual(sort.find((x) => x[0] === 'region'), ['region', 'ascending', '2']);
    // a plain click sorts by this column alone, cycling on from where it is: desc → off
    await page.click('#dg-orders .data-grid-header[data-field="amount"]');
    s = await info('#dg-orders');
    assert.deepEqual(s.config.sorters, [], 'after descending, a plain click turns sorting off');
  });

  await check('column filters: text (case-insensitive), select, number operators; all combine', async () => {
    await page.fill('#dg-orders .data-grid-filter[data-field="customer"]', 'GRACE');
    await page.selectOption('#dg-orders .data-grid-filter[data-field="region"]', 'EU');
    await page.fill('#dg-orders .data-grid-filter[data-field="amount"]', '>= 990');
    await page.waitForFunction(() => (document.querySelector('#dg-orders') as any).store.value.config.filters.length === 3);
    const s = await info('#dg-orders');
    assert.deepEqual(s.config.filters, [
      { field: 'customer', op: 'contains', value: 'GRACE' },
      { field: 'region', op: 'eq', value: 'EU' },
      { field: 'amount', op: 'gte', value: 990 },
    ]);
    const all = await page.$eval('#dg-orders', (g) => (globalThis as any).df$.shadcn.dataGrid.rows(g));
    assert.ok(all.length > 0 && all.every((r: any) => /grace/i.test(r.customer) && r.region === 'EU' && r.amount >= 990), 'every row matches every filter');
    assert.match(s.status, /^[\d,]+ of 100,000 rows match$/);
  });

  await check('source(): the grid\'s own dataview source - its aggregation groups exactly the rows the filters match', async () => {
    const r = await page.$eval('#dg-orders', (g: any) => {
      const source = (globalThis as any).df$.shadcn.dataGrid.source(g);
      const shown = (globalThis as any).df$.shadcn.dataGrid.rows(g);
      const groups = source.aggregate({ filters: g.store.value.config.filters }, { groupBy: 'status' });
      return { total: source.rows.length, matched: groups.matchedRows, shown: shown.length, sum: groups.rows.reduce((n: number, x: any) => n + x.count, 0) };
    });
    assert.equal(r.total, 100000);
    assert.equal(r.matched, r.shown, 'the aggregation saw the rows the grid shows');
    assert.equal(r.sum, r.shown);
  });

  await check('nothing matches → empty (data-empty-text); clearing the filter → default', async () => {
    await page.fill('#dg-orders .data-grid-filter[data-field="customer"]', 'zzzz');
    await page.waitForFunction(() => (document.querySelector('#dg-orders') as any).store.value.name === 'empty');
    const empty = await page.$eval('#dg-orders .data-grid-body', (b) => getComputedStyle(b, '::after').content);
    assert.equal(empty, '"No orders match."');
    await page.fill('#dg-orders .data-grid-filter[data-field="customer"]', '');
    await page.fill('#dg-orders .data-grid-filter[data-field="amount"]', '');
    await page.selectOption('#dg-orders .data-grid-filter[data-field="region"]', '');
    await page.waitForFunction(() => (document.querySelector('#dg-orders') as any).store.value.config.filters.length === 0);
    assert.equal((await info('#dg-orders')).state, 'default');
  });

  // the column menu, moving, resizing (mouse, keyboard, touch) - every check leaves #dg-orders as authored
  const menuOpen = () => page.$eval('#dg-orders .data-grid-menu', (m) => m.matches(':popover-open')).catch(() => false);
  const openMenu = async (field: string) => {
    await page.click(`#dg-orders .data-grid-header[data-field="${field}"] .data-grid-menu-button`);
    assert.ok(await menuOpen(), 'the menu opens');
  };
  const menuItem = (action: string, field?: string) =>
    `#dg-orders .data-grid-menu [data-action="${action}"]${field ? `[data-field="${field}"]` : ''}`;
  const shownHeaders = () => page.$$eval('#dg-orders .data-grid-header:not([hidden])', (hs) => hs.map((h) => (h as HTMLElement).dataset.field));
  const firstRow = () => page.$eval('#dg-orders .data-grid-rows > .data-grid-row', (r) => [...r.children].map((c) => c.textContent));
  const headerBox = (field: string) => page.$eval(`#dg-orders .data-grid-header[data-field="${field}"]`, (h) => {
    const r = h.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  const resetColumns = () => page.$eval('#dg-orders', (g) => (globalThis as any).df$.shadcn.dataGrid.resetColumns(g));

  await check('column menu: lock / unlock moves a column into the sticky group; scrolling leaves it in place', async () => {
    await openMenu('status');
    const roles = await page.$$eval('#dg-orders .data-grid-menu .data-grid-menu-item', (is) => is.map((i) => [i.getAttribute('role'), (i as HTMLElement).dataset.action, i.getAttribute('aria-checked')]));
    assert.deepEqual(roles.slice(0, 3), [['menuitemradio', 'asc', 'false'], ['menuitemradio', 'desc', 'false'], ['menuitemcheckbox', 'lock', 'false']]);
    assert.equal(roles.filter((r) => r[1] === 'show').length, 5, 'a checkbox per column');
    assert.equal(await page.$eval('#dg-orders .data-grid-header[data-field="status"] .data-grid-menu-button', (b) => b.getAttribute('aria-expanded')), 'true');
    await page.click(menuItem('lock'));
    const s = await info('#dg-orders');
    assert.deepEqual(s.config.locked, ['id', 'status']);
    assert.deepEqual(s.headers, ['id', 'status', 'customer', 'region', 'amount'], 'locked first, in column order');
    assert.ok(await menuOpen(), 'a checkbox keeps the menu open');
    assert.equal(await page.$eval(menuItem('lock'), (i) => i.getAttribute('aria-checked')), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await menuOpen(), false);
    const sticky = await page.$eval('#dg-orders .data-grid-rows > .data-grid-row', (r) => [...r.children].map((c) => getComputedStyle(c).position));
    assert.deepEqual(sticky, ['sticky', 'sticky', 'static', 'static', 'static']);
    await page.$eval('#dg-orders', (g: HTMLElement) => { g.style.maxWidth = '22rem'; });
    await page.waitForTimeout(100);
    const before = await page.$eval('#dg-orders .data-grid-header[data-field="status"]', (h) => h.getBoundingClientRect().left);
    await page.$eval('#dg-orders .data-grid-viewport', (v) => { v.scrollLeft = 300; });
    await page.waitForTimeout(100);
    const after = await page.$eval('#dg-orders .data-grid-header[data-field="status"]', (h) => h.getBoundingClientRect().left);
    assert.equal(Math.round(after), Math.round(before), 'the locked column stays while the rest scrolls');
    await page.$eval('#dg-orders .data-grid-viewport', (v) => { v.scrollLeft = 0; });
    await page.$eval('#dg-orders', (g: HTMLElement) => { g.style.maxWidth = ''; });
    await openMenu('status');
    await page.click(menuItem('lock'));
    await page.keyboard.press('Escape');
    assert.deepEqual((await info('#dg-orders')).config.locked, ['id']);
  });

  await check('column menu: sort ascending / descending, the sort in force checked; the menu closes', async () => {
    await openMenu('amount');
    await page.click(menuItem('desc'));
    assert.equal(await menuOpen(), false);
    let s = await info('#dg-orders');
    assert.deepEqual(s.config.sorters, [{ field: 'amount', direction: 'desc' }]);
    assert.equal(await page.$eval('#dg-orders .data-grid-header[data-field="amount"]', (h) => h.getAttribute('aria-sort')), 'descending');
    const top = Number(s.cells[0][3].replace(/[^0-9.]/g, ''));
    const next = Number(s.cells[1][3].replace(/[^0-9.]/g, ''));
    assert.ok(top >= next, 'descending amounts');
    await openMenu('amount');
    assert.equal(await page.$eval(menuItem('desc'), (i) => i.getAttribute('aria-checked')), 'true');
    await page.click(menuItem('asc'));
    s = await info('#dg-orders');
    assert.deepEqual(s.config.sorters, [{ field: 'amount', direction: 'asc' }]);
    await page.$eval('#dg-orders', (g) => (globalThis as any).df$.shadcn.dataGrid.query(g, { sorters: [] }));
  });

  await check('column menu: hide / show columns as checkboxes; the last shown column cannot go', async () => {
    await openMenu('customer');
    await page.click(menuItem('show', 'region'));
    let s = await info('#dg-orders');
    assert.deepEqual(s.config.hidden, ['region']);
    assert.deepEqual(await shownHeaders(), ['id', 'customer', 'amount', 'status']);
    assert.equal((await firstRow()).length, 4, 'the cells follow');
    assert.equal(await page.$eval('#dg-orders .data-grid-viewport', (g) => g.getAttribute('aria-colcount')), '4');
    assert.equal(await page.$$eval('#dg-orders .data-grid-filter-cell', (c) => c.length), 4, 'the filter row follows');
    for (const f of ['id', 'amount', 'status']) await page.click(menuItem('show', f));
    assert.deepEqual(await shownHeaders(), ['customer']);
    assert.equal(await page.$eval(menuItem('show', 'customer'), (i) => (i as HTMLButtonElement).disabled), true, 'the last one stays');
    // hiding the column the menu hangs from closes the menu
    await page.click(menuItem('show', 'id'));
    await page.click(menuItem('show', 'customer'));
    assert.equal(await menuOpen(), false);
    assert.deepEqual(await shownHeaders(), ['id']);
    await resetColumns();
    s = await info('#dg-orders');
    assert.deepEqual(s.config.hidden, []);
    assert.deepEqual(await shownHeaders(), ['id', 'customer', 'region', 'amount', 'status']);
  });

  await check('drag a header (mouse): the column moves, its cells follow, the click sorts nothing; into the locked group it locks', async () => {
    const from = await headerBox('customer');
    const to = await headerBox('amount');
    await page.mouse.move(from.x + 20, from.y + from.h / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y + from.h / 2, { steps: 3 });
    assert.equal(await page.$eval('#dg-orders .data-grid-header[data-field="customer"]', (h) => h.hasAttribute('data-dragging')), true);
    assert.equal(await page.$$eval('#dg-orders .data-grid-drop-marker', (m) => m.length), 1, 'the drop marker shows');
    await page.mouse.move(to.x + to.w - 5, to.y + to.h / 2, { steps: 8 });
    await page.mouse.up();
    let s = await info('#dg-orders');
    assert.deepEqual(s.headers, ['id', 'region', 'amount', 'customer', 'status']);
    assert.deepEqual(s.config.columns, ['id', 'region', 'amount', 'customer', 'status']);
    assert.deepEqual(s.cells[0], ['1', 'EU', '\u20AC0.00', 'Ada A.', 'open']);
    assert.deepEqual(s.config.sorters, [], 'a drag is no click');
    assert.equal(await page.$$eval('#dg-orders .data-grid-drop-marker', (m) => m.length), 0);
    // to the start: into the locked group
    const st = await headerBox('status');
    const id = await headerBox('id');
    await page.mouse.move(st.x + 20, st.y + st.h / 2);
    await page.mouse.down();
    await page.mouse.move(id.x + 4, id.y + id.h / 2, { steps: 10 });
    await page.mouse.up();
    s = await info('#dg-orders');
    assert.deepEqual(s.headers.slice(0, 2), ['status', 'id']);
    assert.deepEqual(s.config.locked, ['status', 'id']);
    await resetColumns();
    s = await info('#dg-orders');
    assert.deepEqual(s.headers, ['id', 'customer', 'region', 'amount', 'status']);
    assert.deepEqual(s.config.locked, ['id']);
  });

  await check('resize (mouse): the end edge widens a column, cells follow; a double click gives it its authored width', async () => {
    const box = await headerBox('customer');
    const handle = await page.$eval('#dg-orders .data-grid-header[data-field="customer"] .data-grid-resizer', (h) => {
      const r = h.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.mouse.move(handle.x, handle.y);
    await page.mouse.down();
    await page.mouse.move(handle.x + 60, handle.y, { steps: 6 });
    await page.mouse.up();
    const s = await info('#dg-orders');
    assert.equal(s.config.widths.customer, Math.round(box.w + 60));
    assert.equal(Math.round((await headerBox('customer')).w), Math.round(box.w + 60));
    const cell = await page.$eval('#dg-orders .data-grid-rows > .data-grid-row > [data-field="customer"]', (c) => c.getBoundingClientRect().width);
    assert.equal(Math.round(cell), Math.round(box.w + 60), 'the body column follows');
    assert.deepEqual(s.config.sorters, [], 'a resize is no click');
    await page.mouse.dblclick(handle.x + 60, handle.y);
    assert.deepEqual((await info('#dg-orders')).config.widths, {});
    assert.equal(Math.round((await headerBox('customer')).w), Math.round(box.w));
  });

  await check('keyboard: Alt+Arrow Down opens the menu (first item focused, arrows move, Escape returns); Alt+Shift+Arrow moves, Alt+Arrow resizes', async () => {
    await page.focus('#dg-orders .data-grid-header[data-field="customer"]');
    await page.$eval('#dg-orders', (g: any) => { g._focus = { row: -1, col: 1 }; });
    await page.keyboard.press('Alt+ArrowDown');
    assert.ok(await menuOpen());
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.action), 'asc');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.action), 'desc');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.action), 'reset');
    await page.keyboard.press('Escape');
    assert.equal(await menuOpen(), false);
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.field), 'customer', 'focus back on its header');
    await page.keyboard.press('Alt+Shift+ArrowRight');
    let s = await info('#dg-orders');
    assert.deepEqual(s.headers, ['id', 'region', 'customer', 'amount', 'status']);
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.field), 'customer', 'focus moves with it');
    const w = (await headerBox('customer')).w;
    await page.keyboard.press('Alt+ArrowRight');
    s = await info('#dg-orders');
    assert.equal(s.config.widths.customer, Math.round(w) + 16);
    await resetColumns();
  });

  await check('touch: a tap sorts, a long press opens the menu, a long press then a drag moves the column, the edge resizes', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, hasTouch: true });
    const tp = await ctx.newPage();
    tp.on('pageerror', (e) => { failures++; console.error(`  ✗ page error (touch): ${e.message}`); });
    await tp.goto(`${server.url}/tests/e2e/big-data/data-grid.e2e-fixture.html`);
    await tp.waitForFunction(() => (globalThis as Record<string, unknown>).__fixtureReady === true, null, { timeout: 15_000 });
    const cdp = await ctx.newCDPSession(tp);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const box = (sel: string) => tp.$eval(sel, (h) => { const r = h.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const cfg = () => tp.$eval('#dg-orders', (g: any) => g.store.value.config);
    const reg = await box('#dg-orders .data-grid-header[data-field="region"]');
    // a tap
    await touch('touchStart', reg.x + 15, reg.y + reg.h / 2);
    await touch('touchEnd');
    await tp.waitForTimeout(100);
    assert.deepEqual((await cfg()).sorters, [{ field: 'region', direction: 'asc' }], 'a tap sorts');
    await tp.$eval('#dg-orders', (g) => (globalThis as any).df$.shadcn.dataGrid.query(g, { sorters: [] }));
    // a long press, released where it rests
    await touch('touchStart', reg.x + 15, reg.y + reg.h / 2);
    await tp.waitForTimeout(700);
    await touch('touchEnd');
    await tp.waitForTimeout(100);
    assert.equal(await tp.$eval('#dg-orders .data-grid-menu', (m) => m.matches(':popover-open')), true, 'a long press opens the menu');
    assert.deepEqual((await cfg()).sorters, [], 'and sorts nothing');
    await tp.keyboard.press('Escape');
    // a long press, then a drag past Amount
    const amt = await box('#dg-orders .data-grid-header[data-field="amount"]');
    await touch('touchStart', reg.x + 15, reg.y + reg.h / 2);
    await tp.waitForTimeout(700);
    for (let i = 1; i <= 8; i++) await touch('touchMove', reg.x + 15 + ((amt.x + amt.w - 5 - reg.x - 15) * i) / 8, reg.y + reg.h / 2);
    await touch('touchEnd');
    await tp.waitForTimeout(100);
    let c = await cfg();
    assert.deepEqual(c.columns, ['id', 'customer', 'amount', 'region', 'status'], 'the column moved');
    assert.deepEqual(c.sorters, []);
    assert.equal(await tp.$eval('#dg-orders .data-grid-menu', (m) => m.matches(':popover-open')), false, 'a drag opens no menu');
    // the edge: a finger drags it at once
    const st = await box('#dg-orders .data-grid-header[data-field="status"] .data-grid-resizer');
    const before = (await box('#dg-orders .data-grid-header[data-field="status"]')).w;
    await touch('touchStart', st.x + st.w / 2, st.y + st.h / 2);
    for (let i = 1; i <= 5; i++) await touch('touchMove', st.x + st.w / 2 + i * 10, st.y + st.h / 2);
    await touch('touchEnd');
    await tp.waitForTimeout(100);
    c = await cfg();
    assert.equal(c.widths.status, Math.round(before + 50));
    await tp.$eval('#dg-orders', (g) => (globalThis as any).df$.shadcn.dataGrid.resetColumns(g));
    await ctx.close();
  });

  await check('the arrangement is part of the kept view: a reload finds the columns as they were left', async () => {
    await page.$eval('#dg-orders', (g) => (globalThis as any).df$.shadcn.dataGrid.query(g, { columns: ['id', 'status', 'customer', 'region', 'amount'], hidden: ['region'], widths: { customer: 222 } }));
    await ready();
    const s = await info('#dg-orders');
    assert.deepEqual(s.headers, ['id', 'status', 'customer', 'region', 'amount']);
    assert.deepEqual(await shownHeaders(), ['id', 'status', 'customer', 'amount']);
    assert.equal(Math.round((await headerBox('customer')).w), 222);
    await resetColumns();
    assert.deepEqual(await shownHeaders(), ['id', 'customer', 'region', 'amount', 'status']);
  });

  await check('selection: click selects one, Ctrl/Meta toggles, Shift selects a range; aria-selected + status', async () => {
    const cell = (n: number) => `#dg-orders .data-grid-rows > .data-grid-row:nth-child(${n}) .data-grid-cell:nth-child(2)`;
    await page.click(cell(1));
    await page.click(cell(3), { modifiers: ['Shift'] });
    await page.click(cell(5), { modifiers: ['ControlOrMeta'] });
    const s = await info('#dg-orders');
    assert.deepEqual(s.config.selected, [1, 2, 3, 5]);
    const marks = await page.$$eval('#dg-orders .data-grid-rows > .data-grid-row', (rs) => rs.slice(0, 5).map((r) => r.getAttribute('aria-selected')));
    assert.deepEqual(marks, ['true', 'true', 'true', 'false', 'true']);
    assert.match(s.status, /4 selected$/);
    const picked = await page.$eval('#dg-orders', (g) => (globalThis as any).df$.shadcn.dataGrid.selected(g).map((r: any) => r.id));
    assert.deepEqual(picked, [1, 2, 3, 5]);
    await page.click(cell(1));
    assert.deepEqual((await info('#dg-orders')).config.selected, [1]);
  });

  await check('keyboard: arrows move cell by cell, Space selects, Enter on a header sorts, Home / End', async () => {
    await page.click('#dg-orders .data-grid-rows > .data-grid-row:nth-child(1) .data-grid-cell:nth-child(1)');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    let active = await page.evaluate(() => { const a = document.activeElement as HTMLElement; return [a.className, (a.parentElement as HTMLElement).dataset.index, a.textContent]; });
    assert.deepEqual(active, ['data-grid-cell', '1', 'Grace H.']);
    await page.keyboard.press('Space');
    assert.deepEqual((await info('#dg-orders')).config.selected, [1, 2]);
    await page.keyboard.press('End');
    active = await page.evaluate(() => [document.activeElement!.textContent, (document.activeElement!.parentElement as HTMLElement).dataset.index]);
    assert.deepEqual(active, ['paid', '1']);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.field), 'status', 'Up from the first row reaches the header');
    await page.keyboard.press('Enter');
    assert.deepEqual((await info('#dg-orders')).config.sorters, [{ field: 'status', direction: 'asc' }]);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ControlOrMeta+End');
    const lastRow = await page.evaluate(() => (document.activeElement!.parentElement as HTMLElement).dataset.index);
    assert.equal(lastRow, '99999');
  });

  // -- selection models, the clipboard, accessibility ------------------------------------------------------
  const sel = (id: string) => page.$eval(id, (g: any) => {
    const c = g.store.value.config;
    return { selected: c.selected, columns: c.selectedColumns, ranges: c.selectedRanges, status: g.querySelector('.data-grid-status').textContent };
  });
  /** the body cell at a row of the pool (1-based) and a column (1-based) */
  const at = (id: string, r: number, c: number) => `${id} .data-grid-rows > .data-grid-row:nth-child(${r}) > .data-grid-cell:nth-child(${c})`;
  const marks = (id: string) => page.$$eval(`${id} .data-grid-rows > .data-grid-row`, (rs) => rs.slice(0, 6).map((r) => [...r.children].map((c) => {
    const el = c as HTMLElement;
    return el.hasAttribute('data-selected') ? `${el.getAttribute('aria-selected')}:${el.dataset.edge ?? ''}` : el.getAttribute('aria-selected') ?? '-';
  })));
  /** every copy event on the page, as the clipboard received it */
  const copies = async () => {
    await page.waitForTimeout(50);
    return page.evaluate(() => (globalThis as any).__copies.splice(0));
  };
  const watchCopies = () => page.evaluate(() => {
    (globalThis as any).__copies = [];
    document.addEventListener('copy', (e) => (globalThis as any).__copies.push({ text: e.clipboardData?.getData('text/plain'), html: e.clipboardData?.getData('text/html') }));
  });

  await check('cell model: a click selects a cell, Shift+click the rectangle (edges on its outside only), Ctrl/Cmd+click adds a cell; cells carry aria-selected; the status counts cells', async () => {
    await page.click(at('#dg-cells', 1, 2));
    let s = await sel('#dg-cells');
    assert.deepEqual(s.ranges, [{ from: { id: 1, field: 'name' }, to: { id: 1, field: 'name' } }]);
    await page.click(at('#dg-cells', 3, 4), { modifiers: ['Shift'] });
    s = await sel('#dg-cells');
    assert.deepEqual(s.ranges, [{ from: { id: 1, field: 'name' }, to: { id: 3, field: 'kind' } }]);
    assert.match(s.status, /9 cells selected$/);
    const m = await marks('#dg-cells');
    assert.deepEqual(m[0], ['false', 'true:top start', 'true:top', 'true:top end', 'false']);
    assert.deepEqual(m[1], ['false', 'true:start', 'true:', 'true:end', 'false']);
    assert.deepEqual(m[2], ['false', 'true:bottom start', 'true:bottom', 'true:bottom end', 'false']);
    assert.equal(await page.$eval('#dg-cells .data-grid-rows > .data-grid-row', (r) => r.hasAttribute('aria-selected')), false, 'no row is selected in the cell model');
    await page.click(at('#dg-cells', 5, 1), { modifiers: ['ControlOrMeta'] });
    s = await sel('#dg-cells');
    assert.equal(s.ranges.length, 2);
    assert.match(s.status, /10 cells selected$/);
    await page.click(at('#dg-cells', 5, 1), { modifiers: ['ControlOrMeta'] });
    assert.equal((await sel('#dg-cells')).ranges.length, 1, 'Ctrl/Cmd+click on a selected cell removes it');
  });

  await check('cell model: arrows select the cell they reach, Shift+arrows extend the range, Ctrl/Cmd+A selects every cell', async () => {
    await page.click(at('#dg-cells', 2, 2));
    await page.keyboard.press('ArrowRight');
    assert.deepEqual((await sel('#dg-cells')).ranges, [{ from: { id: 2, field: 'qty' }, to: { id: 2, field: 'qty' } }]);
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowRight');
    assert.deepEqual((await sel('#dg-cells')).ranges, [{ from: { id: 2, field: 'qty' }, to: { id: 4, field: 'kind' } }]);
    await page.keyboard.press('Shift+ArrowUp');
    assert.deepEqual((await sel('#dg-cells')).ranges, [{ from: { id: 2, field: 'qty' }, to: { id: 3, field: 'kind' } }], 'Shift+Up shrinks it again');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).textContent), 'kit', 'the focus is the moving corner');
    await page.keyboard.press('ControlOrMeta+a');
    const s = await sel('#dg-cells');
    assert.deepEqual(s.ranges, [{ from: { id: 1, field: 'id' }, to: { id: 300, field: 'note' } }]);
    assert.match(s.status, /1,500 cells selected$/);
  });

  await check('a mouse sweep selects the rectangle it crosses; past the lower edge the grid scrolls on; the click after it selects nothing more', async () => {
    const a = (await (await page.$(at('#dg-cells', 2, 2)))!.boundingBox())!;
    const b = (await (await page.$(at('#dg-cells', 4, 3)))!.boundingBox())!;
    await page.mouse.move(a.x + 8, a.y + 8);
    await page.mouse.down();
    await page.mouse.move(b.x + 8, b.y + 8, { steps: 6 });
    await page.mouse.up();
    assert.deepEqual((await sel('#dg-cells')).ranges, [{ from: { id: 2, field: 'name' }, to: { id: 4, field: 'qty' } }]);
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).textContent), '39', 'the end of the sweep takes the focus');
    // past the edge
    const view = (await (await page.$('#dg-cells .data-grid-viewport'))!.boundingBox())!;
    await page.mouse.move(a.x + 8, a.y + 8);
    await page.mouse.down();
    await page.mouse.move(a.x + 8, view.y + view.height + 40, { steps: 4 });
    await page.waitForTimeout(400);
    await page.mouse.up();
    const s = await sel('#dg-cells');
    assert.ok((await page.$eval('#dg-cells .data-grid-viewport', (v) => v.scrollTop)) > 100, 'the grid scrolled');
    assert.ok((s.ranges[0].to.id as number) > 10, `the range reached row ${s.ranges[0].to.id}`);
    await page.$eval('#dg-cells .data-grid-viewport', (v) => { v.scrollTop = 0; });
    await page.waitForTimeout(100);
  });

  await check('hover is a soft neutral tint; a selected cell a stronger primary tint with a 2px primary edge - the two never look alike', async () => {
    await page.click(at('#dg-cells', 1, 2));
    await page.hover(at('#dg-cells', 3, 3));
    const look = await page.evaluate(() => {
      const g = document.querySelector('#dg-cells')!;
      const rows = g.querySelectorAll('.data-grid-rows > .data-grid-row');
      const st = (el: Element) => getComputedStyle(el);
      const plain = st(rows[5].children[3]);
      const hover = st(rows[2].children[2]);
      const picked = st(rows[0].children[1]);
      const primary = (() => { const p = document.createElement('span'); p.style.color = 'var(--primary)'; g.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })();
      return { plain: plain.backgroundColor, hover: hover.backgroundColor, picked: picked.backgroundColor, ring: picked.boxShadow, primary };
    });
    assert.notEqual(look.hover, look.plain, 'hover tints the cell');
    assert.notEqual(look.picked, look.hover, 'selected is not hover');
    assert.notEqual(look.picked, look.plain);
    assert.ok(look.ring.includes(look.primary) && /2px/.test(look.ring), `the edge: ${look.ring}`);
  });

  await check('a selected cell under the pointer is more selected - a deeper tint than selected, never the soft hover - and keeps its 2px edge (an editable one too); a hovered row deepens all its selected cells', async () => {
    const rgb = (c: string) => page.evaluate((c) => {
      const k = document.createElement('canvas').getContext('2d')!;
      k.fillStyle = c;
      k.fillRect(0, 0, 1, 1);
      return [...k.getImageData(0, 0, 1, 1).data].slice(0, 3);
    }, c);
    const far = async (a: string, b: string) => {
      const [x, y] = [await rgb(a), await rgb(b)];
      return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
    };
    const look = (sel: string) => page.$eval(sel, (c) => [getComputedStyle(c).backgroundColor, getComputedStyle(c).boxShadow]);
    // the cell model: Name is editable (its hover hint must not take the selected line)
    await page.click(at('#dg-cells', 1, 2));
    await page.mouse.move(5, 5);
    const [selected, ring] = await look(at('#dg-cells', 1, 2));
    const [plain] = await look(at('#dg-cells', 6, 3));
    await page.hover(at('#dg-cells', 6, 3));
    const [soft] = await look(at('#dg-cells', 6, 3));
    await page.hover(at('#dg-cells', 1, 2));
    const [both, bothRing] = await look(at('#dg-cells', 1, 2));
    assert.notEqual(both, soft, 'never the soft hover');
    assert.notEqual(both, selected, 'hover shows on a selected cell');
    assert.ok((await far(both, plain)) > (await far(selected, plain)), `deeper: ${both} vs ${selected}`);
    assert.ok(/2px/.test(bothRing) && bothRing.includes(ring.split(') ')[0]), `the edge stays: ${bothRing}`);
    // the row model: the row under the pointer deepens every selected cell of it
    await page.$eval('#dg-orders .data-grid-viewport', (v) => { v.scrollTop = 0; });
    await page.waitForTimeout(100);
    await page.click('#dg-orders .data-grid-rows > .data-grid-row:nth-child(1) .data-grid-cell:nth-child(2)');
    await page.mouse.move(5, 5);
    const [rowSel] = await look('#dg-orders .data-grid-rows > .data-grid-row:nth-child(1) .data-grid-cell:nth-child(2)');
    await page.hover('#dg-orders .data-grid-rows > .data-grid-row:nth-child(1) .data-grid-cell:nth-child(4)');
    const [rowBoth] = await look('#dg-orders .data-grid-rows > .data-grid-row:nth-child(1) .data-grid-cell:nth-child(2)');
    assert.notEqual(rowBoth, rowSel, 'the hovered row deepens its other selected cells too');
    await page.mouse.move(5, 5);
  });

  await check('checkbox model: a checkbox in front of every row (first, whatever the column order) and one in the head; a box toggles its row, Shift+box a range; the head selects all or none (mixed between); a row click selects just it', async () => {
    const sel = () => page.$eval('#dg-check', (g: any) => g.store.value.config.selected);
    const box = (n: number) => `#dg-check .data-grid-rows > .data-grid-row:nth-child(${n}) > .data-grid-check .checkbox`;
    const head = '#dg-check .data-grid-head > .data-grid-row:first-child > .data-grid-check .checkbox';
    const shape = await page.$eval('#dg-check', (g) => {
      const row = g.querySelector('.data-grid-rows > .data-grid-row')!;
      const check = row.lastElementChild!;
      return {
        last: check.className,
        first: check.getBoundingClientRect().left < row.children[0].getBoundingClientRect().left,
        hidden: check.getAttribute('aria-hidden'),
        head: !!g.querySelector('.data-grid-head > .data-grid-row:first-child > .data-grid-check .checkbox'),
        filter: !!g.querySelector('.data-grid-filters > .data-grid-check'),
        aligned: Math.round(g.querySelector('.data-grid-head .data-grid-header')!.getBoundingClientRect().left) === Math.round(row.children[0].getBoundingClientRect().left),
      };
    });
    assert.deepEqual(shape, { last: 'data-grid-check', first: true, hidden: 'true', head: true, filter: true, aligned: true });
    await page.click(box(2));
    await page.click(box(4));
    assert.deepEqual(await sel(), [2, 4], 'a box toggles - the others stay');
    await page.click(box(6), { modifiers: ['Shift'] });
    assert.deepEqual(await sel(), [2, 4, 5, 6]);
    await page.click(box(2));
    assert.deepEqual(await sel(), [4, 5, 6]);
    const marks = await page.$$eval('#dg-check .data-grid-rows > .data-grid-row', (rs) => rs.slice(3, 7).map((r: any) => [r.getAttribute('aria-selected'), r.lastElementChild.firstElementChild.checked, r.lastElementChild.dataset.edge ?? '', r.children[0].dataset.edge ?? '']));
    assert.deepEqual(marks, [
      ['true', true, 'top start', 'top'],
      ['true', true, 'start', ''],
      ['true', true, 'bottom start', 'bottom'],
      ['false', false, '', ''],
    ], 'the box is part of the selected rows\' frame');
    assert.deepEqual(await page.$eval(head, (b: any) => [b.checked, b.indeterminate]), [false, true], 'some: mixed');
    await page.click(head);
    assert.equal((await sel()).length, 300, 'the head selects every row of the query');
    assert.deepEqual(await page.$eval(head, (b: any) => [b.checked, b.indeterminate]), [true, false]);
    await page.click(head);
    assert.deepEqual(await sel(), []);
    await page.click('#dg-check .data-grid-rows > .data-grid-row:nth-child(3) > .data-grid-cell:nth-child(2)');
    await page.click(box(5));
    await page.click('#dg-check .data-grid-rows > .data-grid-row:nth-child(1) > .data-grid-cell:nth-child(2)');
    assert.deepEqual(await sel(), [1], 'a row click selects just it');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    assert.deepEqual(await sel(), [1, 2], 'Space toggles the focused row');
    // the model switched: the column goes, and comes back
    await page.$eval('#dg-check', (g: any) => (g.dataset.selectModel = 'row'));
    await page.waitForFunction(() => !document.querySelector('#dg-check .data-grid-check'));
    await page.$eval('#dg-check', (g: any) => (g.dataset.selectModel = 'checkbox'));
    await page.waitForFunction(() => document.querySelectorAll('#dg-check .data-grid-rows .data-grid-check').length > 3);
    // a tree grid: the box sits before the indentation
    const tree = await page.$eval('#dg-tree-dnd .data-grid-rows > .data-grid-row:nth-child(2)', (r) => r.lastElementChild!.getBoundingClientRect().right <= r.querySelector('.data-grid-toggle')!.getBoundingClientRect().left);
    assert.ok(tree, 'the checkbox comes before the tree column');
  });

  // drag a row (by its index in the query) to a point; Alt held over the target copies
  const rowAt = (sel: string, index: number) => page.locator(`${sel} .data-grid-rows > .data-grid-row[data-index="${index}"]`);
  const drag = async (from: { box: () => Promise<any> }, to: { x: number; y: number }, alt = false) => {
    const b = await from.box();
    await page.mouse.move(b.x + 60, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 70, b.y + b.height / 2 + 6, { steps: 3 });
    if (alt) await page.keyboard.down('Alt');
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await page.mouse.move(to.x, to.y + 1);
    await page.mouse.up();
    if (alt) await page.keyboard.up('Alt');
    await page.waitForTimeout(50);
  };
  const point = async (loc: any, f = 0.5) => {
    const b = await loc.boundingBox();
    return { x: b.x + 80, y: b.y + b.height * f };
  };
  const ids = (sel: string) => page.$eval(sel, (g: any) => (globalThis as any).df$.shadcn.dataGrid.rows(g).map((r: any) => r.id));

  await check('drag and drop (grids): a row moves to another grid where it lands (after a row, at the end), selected there; the selected rows go together; Alt copies with a new id; data-grid-beforedrop refuses; a grid without data-drop takes nothing; text/plain carries the cells', async () => {
    // the plain grid, the source and the target in view at once (the mouse drags in the page's viewport)
    await page.$eval('#dg-check', (g) => g.scrollIntoView({ block: 'start' }));
    await page.evaluate(() => {
      const g = globalThis as any;
      g.__drops = [];
      g.__ends = [];
      g.__texts = [];
      document.querySelector('#dg-to')!.addEventListener('data-grid-drop', (e: any) => g.__drops.push([e.detail.effect, e.detail.at, e.detail.records.map((r: any) => r.id), e.detail.source?.id]));
      document.querySelector('#dg-from')!.addEventListener('data-grid-dragend', (e: any) => g.__ends.push([e.detail.effect, e.detail.target.id]));
      document.addEventListener('dragstart', (e: any) => g.__texts.push([e.dataTransfer.getData('text/plain'), e.dataTransfer.types.includes('application/x-defuss-records+json')]));
    });
    await drag({ box: () => rowAt('#dg-from', 0).boundingBox() }, await point(rowAt('#dg-to', 0), 0.8));
    assert.deepEqual(await ids('#dg-to'), [101, 1, 102, 103]);
    assert.equal((await ids('#dg-from'))[0], 2, 'a move takes it out of its grid');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__drops[0]), ['move', { id: 101, place: 'after' }, [1], 'dg-from']);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__ends[0]), ['move', 'dg-to']);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__texts[0]), ['1\tTask 1\t3', true]);
    assert.deepEqual(await page.$eval('#dg-to', (g: any) => g.store.value.config.selected), [1], 'the dropped row is selected');
    // the selected rows go together, to the end
    await page.click('#dg-from .data-grid-rows > .data-grid-row[data-index="0"] .data-grid-cell:nth-child(2)');
    await page.click('#dg-from .data-grid-rows > .data-grid-row[data-index="2"] .data-grid-cell:nth-child(2)', { modifiers: ['Shift'] });
    const end = await page.$eval('#dg-to .data-grid-viewport', (v) => { const r = v.getBoundingClientRect(); return { x: r.left + 120, y: r.bottom - 20 }; });
    await drag({ box: () => rowAt('#dg-from', 1).boundingBox() }, end);
    assert.deepEqual(await ids('#dg-to'), [101, 1, 102, 103, 2, 3, 4]);
    assert.deepEqual((await ids('#dg-from')).slice(0, 2), [5, 6]);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__drops[1][1]), { id: null, place: 'end' });
    // Alt copies: the row stays, the copy gets an id of its own
    await drag({ box: () => rowAt('#dg-from', 0).boundingBox() }, end, true);
    assert.equal((await ids('#dg-from'))[0], 5, 'a copy leaves the row');
    const copy = await page.$eval('#dg-to', (g: any) => (globalThis as any).df$.shadcn.dataGrid.rows(g).filter((r: any) => r.title === 'Task 5'));
    assert.deepEqual(copy, [{ id: 104, title: 'Task 5', points: 7 }]);
    assert.equal((await ids('#dg-to')).at(-1), 104, 'at the end');
    // refused
    await page.evaluate(() => document.querySelector('#dg-to')!.addEventListener('data-grid-beforedrop', (e) => e.preventDefault(), { once: true }));
    await drag({ box: () => rowAt('#dg-from', 0).boundingBox() }, end);
    assert.equal((await ids('#dg-to')).length, 8, 'refused: nothing came');
    assert.equal((await ids('#dg-from'))[0], 5, 'refused: nothing left');
    // no data-drop: no drop
    await drag({ box: () => rowAt('#dg-from', 0).boundingBox() }, await point(rowAt('#dg-check', 1)));
    assert.equal((await ids('#dg-from'))[0], 5);
    assert.equal(await page.$eval('#dg-check', (g: any) => (globalThis as any).df$.shadcn.dataGrid.rows(g).length), 300);
    // within one grid: a row moves before another
    await drag({ box: () => rowAt('#dg-from', 2).boundingBox() }, await point(rowAt('#dg-from', 0), 0.2));
    assert.deepEqual((await ids('#dg-from')).slice(0, 3), [7, 5, 6]);
    assert.equal(await page.$$eval('.data-grid-row-drop', (m) => m.length), 0, 'no drop line left');
  });

  await check('drag and drop (tree grid, Data Tree): a row goes into another with everything under it; a move into its own subtree goes nowhere; a tree grid row moves into a Data Tree item; a copy-only tree gives copies with new ids', async () => {
    const tree = (sel: string) => page.$eval(sel, (g: any) => (globalThis as any).df$.shadcn.dataGrid.source(g).rows.map((r: any) => [r.id, r.parentId]));
    const item = (index: number) => page.locator(`#dt-drop .data-tree-items > .data-tree-item[data-index="${index}"]`);
    await page.$eval('#dg-tree-dnd', (g) => g.scrollIntoView({ block: 'start' }));
    // Docs(0) a.txt(1) Old(2) b.txt(3) Music(4): Old with b.txt into the Archive tree
    await drag({ box: () => rowAt('#dg-tree-dnd', 2).boundingBox() }, await point(item(0)));
    assert.deepEqual(await tree('#dg-tree-dnd'), [[1, null], [2, 1], [5, null]]);
    const archive = await page.$eval('#dt-drop', (t: any) => ({ rows: (globalThis as any).df$.shadcn.dataTree.source(t).rows.map((r: any) => [r.id, r.parentId, r.name]), selected: t.store.value.config.selected, open: t.store.value.config.expanded }));
    assert.deepEqual(archive, { rows: [['arch', null, 'Archive'], [3, 'arch', 'Old'], [4, 3, 'b.txt']], selected: 3, open: ['arch'] });
    // a.txt into Music
    await drag({ box: () => rowAt('#dg-tree-dnd', 1).boundingBox() }, await point(rowAt('#dg-tree-dnd', 2)));
    assert.deepEqual(await tree('#dg-tree-dnd'), [[1, null], [5, null], [2, 5]]);
    // Music into a.txt (under it): refused
    await drag({ box: () => rowAt('#dg-tree-dnd', 1).boundingBox() }, await point(rowAt('#dg-tree-dnd', 2)));
    assert.deepEqual(await tree('#dg-tree-dnd'), [[1, null], [5, null], [2, 5]]);
    // the Archive gives copies only (data-drag="copy"): Old comes back with new ids, b.txt under it
    await drag({ box: () => item(1).boundingBox() }, await page.$eval('#dg-tree-dnd .data-grid-viewport', (v) => { const r = v.getBoundingClientRect(); return { x: r.left + 120, y: r.bottom - 12 }; }));
    assert.deepEqual(await tree('#dg-tree-dnd'), [[1, null], [5, null], [2, 5], [6, null], [7, 6]]);
    assert.equal(await page.$eval('#dt-drop', (t: any) => (globalThis as any).df$.shadcn.dataTree.source(t).rows.length), 3, 'a copy leaves the tree as it was');
  });

  await check('insert() / remove(): what a drop writes, from script - the place, renamed ids, a subtree out', async () => {
    const out = await page.$eval('#dg-tree-dnd', (g: any) => {
      const api = (globalThis as any).df$.shadcn.dataGrid;
      const gone = api.remove(g, [6]).map((r: any) => r.id);
      const added = api.insert(g, [{ id: 1, name: 'New', kind: 'file' }], { id: 5, place: 'into' }).map((r: any) => [r.id, r.parentId]);
      const refused = api.insert(g, [{ id: 9 }], { id: 404, place: 'before' });
      return { gone, added, refused, rows: api.source(g).rows.map((r: any) => r.id) };
    });
    assert.deepEqual(out, { gone: [6, 7], added: [[6, 5]], refused: null, rows: [1, 5, 2, 6] });
  });

  await check('clipboard: Ctrl/Cmd+C copies the selection as tab-separated values and an HTML table (data-grid-copy); the focus stays on the cell', async () => {
    await watchCopies();
    await page.click(at('#dg-cells', 1, 2));
    await page.click(at('#dg-cells', 2, 4), { modifiers: ['Shift'] });
    await page.$eval('#dg-cells', (g) => g.addEventListener('data-grid-copy', (e) => ((globalThis as any).__copyDetail = (e as CustomEvent).detail), { once: true }));
    await page.keyboard.press('ControlOrMeta+c');
    const [copy] = await copies();
    assert.equal(copy.text, 'Part 1\t0\ttool\nPart 2\t13\tpart');
    assert.match(copy.html, /^<table><tbody><tr><td>Part 1<\/td><td>0<\/td><td>tool<\/td><\/tr>/);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__copyDetail), { text: copy.text, rows: 2, columns: 3 });
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'data-grid-cell', 'the focus came back');
    assert.equal(await page.$('#dg-cells .data-grid-clipboard'), null, 'the stand-in is gone');
    assert.equal(await page.$eval('#dg-cells', (g) => (globalThis as any).df$.shadcn.dataGrid.copyText(g)), copy.text, 'copyText() is the same text');
    // quoting: a value with a tab, a line break or a quote
    await page.$eval('#dg-cells', (g) => (globalThis as any).df$.shadcn.dataGrid.update(g, 1, { name: 'say "hi"\tthere' }));
    assert.equal((await page.$eval('#dg-cells', (g) => (globalThis as any).df$.shadcn.dataGrid.copyText(g))).split('\n')[0], '"say ""hi""\tthere"\t0\ttool');
    await page.$eval('#dg-cells', (g) => (globalThis as any).df$.shadcn.dataGrid.update(g, 1, { name: 'Part 1' }));
  });

  await check('clipboard: Ctrl/Cmd+V from one selected cell writes the block there and selects it; read-only columns are skipped, broken values refused (data-grid-paste)', async () => {
    // copy two rows of name / qty / kind, paste them from row 10's name
    await page.click(at('#dg-cells', 1, 2));
    await page.click(at('#dg-cells', 2, 4), { modifiers: ['Shift'] });
    await page.keyboard.press('ControlOrMeta+c');
    await page.click(at('#dg-cells', 11, 2));
    await page.$eval('#dg-cells', (g) => g.addEventListener('data-grid-paste', (e) => ((globalThis as any).__pasted = (e as CustomEvent).detail), { once: true }));
    await page.keyboard.press('ControlOrMeta+v');
    await page.waitForTimeout(50);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__pasted), { written: 6, skipped: 0, refused: [] });
    const rows = await page.$eval('#dg-cells', (g) => (globalThis as any).df$.shadcn.dataGrid.rows(g).slice(10, 12).map((r: any) => [r.id, r.name, r.qty, r.kind]));
    assert.deepEqual(rows, [[11, 'Part 1', 0, 'tool'], [12, 'Part 2', 13, 'part']]);
    assert.deepEqual((await sel('#dg-cells')).ranges, [{ from: { id: 11, field: 'name' }, to: { id: 12, field: 'kind' } }], 'the pasted block is selected');
    // the API: into a selected range only, a single value fills it; Note does not edit; a broken value is refused
    const api = await page.$eval('#dg-cells', (g) => {
      const { dataGrid } = (globalThis as any).df$.shadcn;
      dataGrid.query(g, { selectedRanges: [{ from: { id: 20, field: 'qty' }, to: { id: 22, field: 'note' } }] });
      const fill = dataGrid.paste(g, '7');
      const after = dataGrid.rows(g).slice(19, 23).map((r: any) => [r.qty, r.kind, r.note]);
      dataGrid.query(g, { selectedRanges: [{ from: { id: 30, field: 'qty' }, to: { id: 31, field: 'kind' } }] });
      const bad = dataGrid.paste(g, '-1\tgadget\n12.5\tKIT');
      const bad2 = dataGrid.rows(g).slice(29, 31).map((r: any) => [r.qty, r.kind]);
      return { fill, after, bad, bad2 };
    });
    assert.equal(api.fill.written, 3, 'qty in three rows');
    assert.equal(api.fill.skipped, 3, 'Note does not edit');
    assert.equal(api.fill.refused.length, 3, 'kind 7 is no option');
    assert.deepEqual(api.after.map((r: any[]) => r[0]), [7, 7, 7, 36]);
    assert.deepEqual(api.bad.refused.map((r: any) => [r.id, r.field, r.message]), [[30, 'qty', 'Must be at least 0'], [30, 'kind', 'Not one of tool, part, kit'], [31, 'qty', 'Must be a whole number']]);
    assert.deepEqual(api.bad2, [[27, 'kit'], [40, 'kit']], 'nothing of a refused value was written; KIT matched its option kit');
  });

  await check('row model: Shift+Arrow Down extends the rows, a sweep selects rows; Ctrl/Cmd+C copies whole rows', async () => {
    await page.$eval('#dg-orders .data-grid-viewport', (v) => { v.scrollTop = 0; });
    await page.waitForTimeout(100);
    await page.click(at('#dg-orders', 1, 2));
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    assert.deepEqual((await sel('#dg-orders')).selected, [1, 2, 3]);
    await page.keyboard.press('Shift+ArrowUp');
    assert.deepEqual((await sel('#dg-orders')).selected, [1, 2]);
    const m = await page.$$eval('#dg-orders .data-grid-rows > .data-grid-row', (rs) => rs.slice(0, 3).map((r) => [r.getAttribute('aria-selected'), (r.firstElementChild as HTMLElement).dataset.edge ?? '', (r.lastElementChild as HTMLElement).dataset.edge ?? '']));
    assert.deepEqual(m, [['true', 'top start', 'top end'], ['true', 'bottom start', 'bottom end'], ['false', '', '']]);
    await page.mouse.move(0, 0);
    const row = await page.$eval('#dg-orders .data-grid-rows > .data-grid-row', (r) => [getComputedStyle(r).backgroundColor, getComputedStyle(r.nextElementSibling!.nextElementSibling!).backgroundColor]);
    assert.equal(row[0], row[1], 'a selected row is tinted by its cells - the tint ends where its frame does');
    const a = (await (await page.$(at('#dg-orders', 4, 2)))!.boundingBox())!;
    const b = (await (await page.$(at('#dg-orders', 6, 3)))!.boundingBox())!;
    await page.mouse.move(a.x + 8, a.y + 8);
    await page.mouse.down();
    await page.mouse.move(b.x + 8, b.y + 8, { steps: 5 });
    await page.mouse.up();
    assert.deepEqual((await sel('#dg-orders')).selected, [4, 5, 6]);
    await watchCopies();
    await page.keyboard.press('ControlOrMeta+c');
    const [copy] = await copies();
    const line = copy.text.split('\n');
    assert.equal(line.length, 3, 'three rows');
    assert.ok(line[0].startsWith('4\t') && line[0].includes('\tBarbara V.') && line[0].includes('\t237.57'), `raw values, every shown column: ${line[0]}`);
    await page.$eval('#dg-orders', (g) => (globalThis as any).df$.shadcn.dataGrid.clearSelection(g));
  });

  await check('column model: a header click selects its column (it sorts nothing), Shift+click a range; the column under the pointer is marked; Space toggles; copy', async () => {
    await page.click('#dg-cols .data-grid-header[data-field="name"]');
    await page.click('#dg-cols .data-grid-header[data-field="kind"]', { modifiers: ['Shift'] });
    let s = await sel('#dg-cols');
    assert.deepEqual(s.columns, ['name', 'qty', 'kind']);
    assert.match(s.status, /3 columns selected$/);
    assert.deepEqual(await page.$eval('#dg-cols', (g: any) => g.store.value.config.sorters), [], 'no sort');
    assert.deepEqual(await page.$$eval('#dg-cols .data-grid-header', (hs) => hs.map((h) => h.getAttribute('aria-selected'))), ['false', 'true', 'true', 'true', 'false']);
    const m = await marks('#dg-cols');
    assert.deepEqual(m[0], ['false', 'true:top start', 'true:top', 'true:top end', 'false'], 'the first row is the top edge');
    await page.hover(at('#dg-cols', 3, 5));
    assert.deepEqual(await page.$$eval('#dg-cols .data-grid-rows > .data-grid-row', (rs) => rs.slice(0, 4).map((r) => [...r.children].map((c) => c.hasAttribute('data-hover') ? 'h' : '.').join(''))), ['....h', '....h', '....h', '....h']);
    const tints = await page.$$eval('#dg-cols .data-grid-rows > .data-grid-row', (rs) => [rs[2], rs[3]].map((r) => getComputedStyle(r.children[0]).backgroundColor));
    assert.equal(tints[0], tints[1], 'the column model hovers the column, never the row under the pointer');
    await page.click(at('#dg-cols', 2, 1));
    assert.deepEqual((await sel('#dg-cols')).columns, ['id'], 'a cell selects its column');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    assert.deepEqual((await sel('#dg-cols')).columns, ['id', 'name']);
    await page.$eval('#dg-cols', (g) => (globalThis as any).df$.shadcn.dataGrid.query(g, { filters: [{ field: 'id', op: 'lte', value: 2 }] }));
    assert.equal(await page.$eval('#dg-cols', (g) => (globalThis as any).df$.shadcn.dataGrid.copyText(g)), '1\tPart 1\n2\tPart 2', 'every row the query shows');
    await page.$eval('#dg-cols', (g) => (globalThis as any).df$.shadcn.dataGrid.query(g, { filters: [] }));
    await page.mouse.move(0, 0);
  });

  await check('row column model: a cell selects its row, a header its column - one kind at a time; Ctrl/Cmd+Space selects the column', async () => {
    await page.click(at('#dg-both', 2, 2));
    await page.click(at('#dg-both', 3, 2), { modifiers: ['Shift'] });
    let s = await sel('#dg-both');
    assert.deepEqual([s.selected, s.columns], [[2, 3], []]);
    await page.click('#dg-both .data-grid-header[data-field="qty"]');
    s = await sel('#dg-both');
    assert.deepEqual([s.selected, s.columns], [[], ['qty']], 'a column replaces the rows');
    await page.click(at('#dg-both', 1, 1));
    await page.keyboard.press('ControlOrMeta+Space');
    s = await sel('#dg-both');
    assert.deepEqual([s.selected, s.columns], [[], ['id']]);
    await page.keyboard.press('Space');
    s = await sel('#dg-both');
    assert.deepEqual([s.selected, s.columns], [[1], []], 'Space: the row');
  });

  await check('touch: a tap selects a cell; a finger that rests, then drags, sweeps the range without scrolling', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, hasTouch: true });
    const tp = await ctx.newPage();
    tp.on('pageerror', (e) => { failures++; console.error(`  ✗ page error (touch): ${e.message}`); });
    await tp.goto(`${server.url}/tests/e2e/big-data/data-grid.e2e-fixture.html`);
    await tp.waitForFunction(() => (globalThis as Record<string, unknown>).__fixtureReady === true, null, { timeout: 15_000 });
    await tp.$eval('#dg-cells', (g) => g.scrollIntoView());
    const cdp = await ctx.newCDPSession(tp);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const box = (sel: string) => tp.$eval(sel, (h) => { const r = h.getBoundingClientRect(); return { x: r.left + 10, y: r.top + r.height / 2 }; });
    const ranges = () => tp.$eval('#dg-cells', (g: any) => g.store.value.config.selectedRanges);
    const a = await box(at('#dg-cells', 2, 2));
    await touch('touchStart', a.x, a.y);
    await touch('touchEnd');
    await tp.waitForTimeout(100);
    assert.deepEqual(await ranges(), [{ from: { id: 2, field: 'name' }, to: { id: 2, field: 'name' } }], 'a tap');
    const b = await box(at('#dg-cells', 4, 4));
    await touch('touchStart', a.x, a.y);
    await tp.waitForTimeout(700);
    for (let i = 1; i <= 6; i++) await touch('touchMove', a.x + ((b.x - a.x) * i) / 6, a.y + ((b.y - a.y) * i) / 6);
    await touch('touchEnd');
    await tp.waitForTimeout(100);
    assert.deepEqual(await ranges(), [{ from: { id: 2, field: 'name' }, to: { id: 4, field: 'kind' } }], 'a rest, then a drag');
    assert.equal(await tp.$eval('#dg-cells .data-grid-viewport', (v) => v.scrollTop), 0, 'the grid did not scroll');
    await ctx.close();
  });

  await check('accessibility: the grid is the viewport (role, name, counts) - the footer status and the column menu sit outside it; the header row is a row; header text reaches 4.5:1 in light and dark', async () => {
    const a = await page.$eval('#dg-orders', (g) => {
      const v = g.querySelector('.data-grid-viewport')!;
      const status = g.querySelector('.data-grid-status')!;
      return {
        root: [g.getAttribute('role'), g.getAttribute('aria-label')],
        grid: [v.getAttribute('role'), v.getAttribute('aria-label')],
        statusInGrid: v.contains(status),
        header: [g.querySelector('.data-grid-head > .data-grid-row')!.getAttribute('role'), g.querySelector('.data-grid-head > .data-grid-row')!.getAttribute('aria-rowindex')],
        filters: g.querySelector('.data-grid-filters')!.getAttribute('aria-rowindex'),
      };
    });
    assert.deepEqual(a, { root: [null, null], grid: ['grid', 'Orders'], statusInGrid: false, header: ['row', '1'], filters: '2' });
    // a name written later (a translation) moves to the grid as well
    const renamed = await page.$eval('#dg-orders', async (g) => {
      g.setAttribute('aria-label', 'Bestellungen');
      await new Promise((r) => setTimeout(r));
      return [g.getAttribute('aria-label'), g.querySelector('.data-grid-viewport')!.getAttribute('aria-label')];
    });
    assert.deepEqual(renamed, [null, 'Bestellungen']);
    await page.$eval('#dg-orders', (g) => g.setAttribute('aria-label', 'Orders'));
    await openMenu('region');
    assert.equal(await page.$eval('#dg-orders', (g) => g.querySelector('.data-grid-viewport')!.contains(g.querySelector('.data-grid-menu'))), false, 'the menu is outside the grid');
    await page.keyboard.press('Escape');
    const ratio = () => page.$eval('#dg-orders .data-grid-header[data-field="customer"]', (h) => {
      const rgb = (c: string) => {
        const k = document.createElement('canvas').getContext('2d')!;
        k.fillStyle = c;
        k.fillRect(0, 0, 1, 1);
        return [...k.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      const lum = ([r, g, b]: number[]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
      const st = getComputedStyle(h);
      const [l1, l2] = [lum(rgb(st.color)), lum(rgb(st.backgroundColor))].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    });
    const light = await ratio();
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    const dark = await ratio();
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    assert.ok(light >= 4.5, `light ${light.toFixed(2)}:1`);
    assert.ok(dark >= 4.5, `dark ${dark.toFixed(2)}:1`);
  });

  await check('pages: 25 rows a page, the pager moves and disables at the ends; config.page', async () => {
    let s = await info('#dg-pages');
    assert.equal(s.status, '1–25 of 1,000 rows');
    assert.equal(await page.$eval('#dg-pages [data-page="prev"]', (b: HTMLButtonElement) => b.disabled), true);
    await page.click('#dg-pages [data-page="next"]');
    s = await info('#dg-pages');
    assert.equal(s.config.page, 1);
    assert.equal(s.cells[0][0], '26');
    await page.click('#dg-pages [data-page="last"]');
    s = await info('#dg-pages');
    assert.equal(s.status, '976–1,000 of 1,000 rows');
    assert.equal(await page.$eval('#dg-pages .data-grid-page-label', (l) => l.textContent), 'Page 40 of 40');
    assert.equal(await page.$eval('#dg-pages [data-page="next"]', (b: HTMLButtonElement) => b.disabled), true);
    const total = await page.$eval('#dg-pages', (g) => g.querySelector('.data-grid-body')!.getBoundingClientRect().height);
    assert.equal(Math.round(total), 25 * 36, 'the body holds one page');
  });

  await check('infinite: the loader adds a page as the end nears, until it returns none', async () => {
    let s = await info('#dg-infinite');
    assert.equal(s.status, '40 loaded · 40 rows');
    for (let i = 0; i < 8; i++) {
      await page.$eval('#dg-infinite .data-grid-viewport', (v) => { v.scrollTop = v.scrollHeight; });
      await page.waitForTimeout(120);
    }
    s = await info('#dg-infinite');
    assert.equal(s.status, '200 loaded · 200 rows', 'the loader stops at 200');
    assert.equal(s.config.page, 4);
  });

  await check('tree grid: rows carry aria-level / aria-expanded; the toggle and ArrowRight / Left open and close', async () => {
    let s = await info('#dg-tree');
    assert.equal(s.status, '20 rows shown of 11,020');
    await page.click('#dg-tree .data-grid-rows > .data-grid-row:nth-child(1) .data-grid-toggle');
    s = await info('#dg-tree');
    assert.deepEqual(s.config.expanded, [1]);
    const rows = await page.$$eval('#dg-tree .data-grid-rows > .data-grid-row', (rs) => rs.slice(0, 3).map((r) => [r.getAttribute('aria-level'), r.getAttribute('aria-expanded'), r.children[0].textContent]));
    assert.deepEqual(rows, [['1', 'true', 'Folder 1'], ['2', 'false', 'Folder 1.1'], ['2', 'false', 'Folder 1.2']]);
    await page.click('#dg-tree .data-grid-rows > .data-grid-row:nth-child(2) .data-grid-cell:nth-child(1)');
    await page.keyboard.press('ArrowRight');
    assert.deepEqual((await info('#dg-tree')).config.expanded, [1, 2]);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    const back = await page.evaluate(() => (document.activeElement!.parentElement as HTMLElement).dataset.index);
    assert.equal(back, '1', 'Left on a leaf goes to its parent');
    await page.keyboard.press('ArrowLeft');
    assert.deepEqual((await info('#dg-tree')).config.expanded, [1]);
  });

  await check('tree grid: a filter keeps the ancestors of every match and opens the way; sort orders siblings', async () => {
    await page.fill('#dg-tree .data-grid-filter[data-field="name"]', 'FILE-3-7-');
    await page.waitForFunction(() => (document.querySelector('#dg-tree') as any).store.value.config.filters.length === 1);
    let s = await info('#dg-tree');
    assert.match(s.status, /^12 rows shown · 10 of 11,020 match/);
    assert.deepEqual(s.cells.map((c) => c[0]), ['Folder 3', 'Folder 3.7', 'file-3-7-1.txt']);
    await page.click('#dg-tree .data-grid-header[data-field="size"]');
    await page.click('#dg-tree .data-grid-header[data-field="size"]');
    s = await info('#dg-tree');
    const sizes = await page.$eval('#dg-tree', (g) => (globalThis as any).df$.shadcn.dataGrid.rows(g).filter((r: any) => r.kind === 'file').map((r: any) => r.size));
    assert.deepEqual(sizes, [...sizes].sort((a, b) => b - a), 'files sorted by size, descending');
    await page.fill('#dg-tree .data-grid-filter[data-field="name"]', '');
    await page.waitForFunction(() => (document.querySelector('#dg-tree') as any).store.value.config.filters.length === 0);
  });

  await check('tree grid: expandAll / collapseAll; paging walks the visible rows', async () => {
    await page.$eval('#dg-tree', (g) => (globalThis as any).df$.shadcn.dataGrid.expandAll(g));
    assert.match((await info('#dg-tree')).status, /^11,020 rows shown/);
    await page.$eval('#dg-tree', (g) => (globalThis as any).df$.shadcn.dataGrid.collapseAll(g));
    assert.match((await info('#dg-tree')).status, /^20 rows shown/);
  });

  await check('the store is the query: subscribers hear it, store.set applies it', async () => {
    const heard = await page.$eval('#dg-orders', (g: any) => {
      const seen: unknown[] = [];
      const off = g.store.subscribe((v: any) => seen.push(v.config.sorters));
      g.store.set({ name: 'default', config: { ...g.store.value.config, sorters: [{ field: 'id', direction: 'desc' }] } });
      off();
      return [seen, g.querySelector('.data-grid-rows > .data-grid-row').children[0].textContent];
    });
    assert.deepEqual(heard[0], [[{ field: 'id', direction: 'desc' }]]);
    assert.equal(heard[1], '100000');
  });

  await check('State API: loading / empty / default; unknown names throw; registry globals', async () => {
    const r = await page.$eval('#dg-pages', (g: any) => {
      const out: string[] = [];
      g.api.setState('loading');
      // the grid - the viewport - is the one busy
      const v = g.querySelector('.data-grid-viewport');
      out.push(g.dataset.state, v.getAttribute('aria-busy'));
      g.api.setState('empty');
      out.push(g.dataset.state, String(v.getAttribute('aria-busy')));
      g.api.setState('default');
      out.push(g.dataset.state);
      let threw = false;
      try { g.api.setState('nope'); } catch { threw = true; }
      out.push(String(threw), String(Array.isArray((globalThis as any).df$.shadcn.dataGridStates)), typeof (globalThis as any).df$.shadcn.dataGridApi.setState);
      return out;
    });
    assert.deepEqual(r, ['loading', 'true', 'empty', 'null', 'default', 'true', 'true', 'function']);
    assert.equal((await info('#dg-wait')).state, 'loading', 'a grid without records waits in loading');
  });

  await check('persistence: by default the view survives a reload in session storage, under a generated key', async () => {
    await page.click('#dg-pages .data-grid-header[data-field="customer"]');
    await page.click('#dg-pages [data-page="next"]');
    const key = 'defuss-shadcn:/tests/e2e/big-data/data-grid.e2e-fixture.html:data-grid:dg-pages';
    const kept = await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)!).value, key);
    assert.deepEqual(kept.sorters, [{ field: 'customer', direction: 'asc' }]);
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), key), null, 'not in local storage');
    await ready();
    const s = await page.$eval('#dg-pages', (g: any) => g.store.value.config);
    assert.deepEqual(s.sorters, [{ field: 'customer', direction: 'asc' }]);
    assert.equal(s.page, 0, 'the page is per visit');
  });

  await check('persistence: data-persist="local" + data-persist-key; data-sort on a header is the starting sort', async () => {
    let s = await page.$eval('#dg-local', (g: any) => g.store.value.config);
    assert.deepEqual(s.sorters, [{ field: 'amount', direction: 'desc' }]);
    assert.equal(await page.$eval('#dg-local .data-grid-header[data-field="amount"]', (h) => h.getAttribute('aria-sort')), 'descending');
    await page.$eval('#dg-local', (g) => (globalThis as any).df$.shadcn.dataGrid.query(g, { locked: ['customer'], filters: [{ field: 'customer', op: 'contains', value: 'ada' }] }));
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('fixture-grid')!).value.locked), ['customer']);
    await ready();
    s = await page.$eval('#dg-local', (g: any) => g.store.value.config);
    assert.deepEqual([s.locked, s.filters], [['customer'], [{ field: 'customer', op: 'contains', value: 'ada' }]], 'the kept view wins over data-sort / data-locked');
    assert.deepEqual(s.sorters, [{ field: 'amount', direction: 'desc' }]);
  });

  await check('persistence: data-persist="none" keeps nothing', async () => {
    await page.click('#dg-none .data-grid-header[data-field="customer"]');
    const keys = await page.evaluate(() => [...Object.keys(sessionStorage), ...Object.keys(localStorage)].filter((k) => k.includes('dg-none')));
    assert.deepEqual(keys, []);
    await ready();
    assert.deepEqual(await page.$eval('#dg-none', (g: any) => g.store.value.config.sorters), []);
  });

  await check('persistence + starting query from setSource\'s config (persist: { area, prefix }, query)', async () => {
    assert.equal(await page.$eval('#dg-config .data-grid-rows > .data-grid-row', (r) => r.children[0].textContent), '200', 'query: id descending');
    await page.click('#dg-config .data-grid-header[data-field="customer"]');
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('myapp:data-grid:dg-config')!).value.sorters), [{ field: 'customer', direction: 'asc' }]);
    await ready();
    assert.deepEqual(await page.$eval('#dg-config', (g: any) => g.store.value.config.sorters), [{ field: 'customer', direction: 'asc' }]);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  });

  await check('custom cells: a control in a cell keeps its keys - a field types spaces and moves its caret, Space ticks a checkbox; the grid\'s focus stays put', async () => {
    await page.evaluate(() => {
      const grid = document.querySelector('#dg-none') as HTMLElement;
      (globalThis as any).df$.shadcn.dataGrid.setSource(grid, [{ id: 1, customer: 'Ada', amount: 1 }, { id: 2, customer: 'Grace', amount: 2 }], {
        cells: {
          customer: (el: HTMLElement, r: any) => {
            const input = document.createElement('input');
            input.className = 'input';
            input.value = r.customer;
            input.dataset.cellInput = String(r.id);
            el.append(input);
          },
          amount: (el: HTMLElement, r: any) => {
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.dataset.cellBox = String(r.id);
            el.append(box);
          },
        },
      });
    });
    await page.click('#dg-none [data-cell-input="1"]');
    await page.keyboard.press('End');
    await page.keyboard.type(' Lovelace');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('!');
    await page.focus('#dg-none [data-cell-box="2"]');
    await page.keyboard.press('Space');
    const r = await page.evaluate(() => ({
      text: (document.querySelector('#dg-none [data-cell-input="1"]') as HTMLInputElement).value,
      ticked: (document.querySelector('#dg-none [data-cell-box="2"]') as HTMLInputElement).checked,
      focus: (document.activeElement as HTMLElement).dataset.cellBox,
    }));
    assert.deepEqual(r, { text: 'Ada Lovelac!e', ticked: true, focus: '2' });
  });

  await check('a grid still waiting for its records takes keys and header clicks without an error', async () => {
    assert.equal(await page.$eval('#dg-waiting', (g: any) => g.store.value.name), 'loading');
    await page.click('#dg-waiting .data-grid-header[data-field="name"]');
    await page.focus('#dg-waiting .data-grid-header[data-field="id"]');
    for (const key of ['ArrowDown', 'ArrowUp', 'ArrowRight', 'Home', 'End', 'Enter', ' ', 'PageDown']) await page.keyboard.press(key);
    // a throw here is a page error, which fails the run (the pageerror handler above)
    await page.waitForTimeout(100);
    assert.equal(await page.$eval('#dg-waiting', (g: any) => g.store.value.name), 'loading');
  });

  await check('prefers-reduced-motion: the loading pulse stops', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const anim = await page.$eval('#dg-wait .data-grid-body', (b) => getComputedStyle(b).animationName);
    assert.equal(anim, 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  // -- inline editing ---------------------------------------------------------
  const cellOf = (row: number, field: string) =>
    page.$eval(
      '#dg-edit',
      (g: any, [row, field]) => {
        const col = [...g.querySelectorAll('.data-grid-header')].findIndex((h: any) => h.dataset.field === field);
        const r = [...g.querySelectorAll('.data-grid-rows > .data-grid-row')].find((x: any) => x._index === row);
        return r?.children[col]?.textContent ?? null;
      },
      [row, field] as const,
    );
  const editor = () => page.$eval('#dg-edit', (g) => {
    const ed = g.querySelector('.data-grid-editor');
    const control = ed?.querySelector('input, select, textarea') as HTMLInputElement | null;
    return ed ? { tag: control?.tagName, type: control?.type, cls: control?.className, focused: ed.contains(document.activeElement), error: ed.querySelector('.data-grid-error')?.textContent ?? '' } : null;
  });
  const dbl = (row: number, field: string) =>
    page.$eval(
      '#dg-edit',
      (g: any, [row, field]) => {
        const col = [...g.querySelectorAll('.data-grid-header')].findIndex((h: any) => h.dataset.field === field);
        const r = [...g.querySelectorAll('.data-grid-rows > .data-grid-row')].find((x: any) => x._index === row);
        r.children[col].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      },
      [row, field] as const,
    );

  await check('editing: a double click opens the built-in editor of an editable column - an Input, focused; Enter writes it into the record', async () => {
    await page.$eval('#dg-edit', (g) => g.scrollIntoView());
    const first = await cellOf(0, 'name');
    await dbl(0, 'name');
    assert.deepEqual(await editor(), { tag: 'INPUT', type: 'text', cls: 'input', focused: true, error: '' });
    const events: any[] = [];
    await page.exposeFunction('__dgEdit', (d: any) => events.push(d)).catch(() => {});
    await page.$eval('#dg-edit', (g) => g.addEventListener('data-grid-edit', (e: any) => (globalThis as any).__dgEdit({ field: e.detail.field, value: e.detail.value, oldValue: e.detail.oldValue })));
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Renamed');
    await page.keyboard.press('Enter');
    assert.equal(await editor(), null);
    assert.equal(await cellOf(0, 'name'), 'Renamed');
    await page.waitForFunction(() => true);
    assert.deepEqual(events.at(-1), { field: 'name', value: 'Renamed', oldValue: first });
    // the record was replaced, the grid's records carry the new value
    assert.equal(await page.$eval('#dg-edit', (g) => (globalThis as any).df$.shadcn.dataGrid.rows(g)[0].name), 'Renamed');
    // the cell has focus again
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).textContent), 'Renamed');
  });

  await check('editing: Escape keeps the old value; F2 and Enter on a focused cell open it; Tab moves to the next editable cell', async () => {
    await page.keyboard.press('F2');
    await page.keyboard.type('Gone');
    await page.keyboard.press('Escape');
    assert.equal(await editor(), null);
    assert.equal(await cellOf(0, 'name'), 'Renamed');
    await page.keyboard.press('Enter');
    assert.equal((await editor())?.tag, 'INPUT');
    await page.keyboard.press('Tab');
    const next = await editor();
    assert.equal(next?.type, 'number', 'Tab opened the Qty editor');
    await page.keyboard.press('Escape');
  });

  await check('editing: the rules refuse a value with a message (data-required, data-min, data-integer, validateFn); the editor stays', async () => {
    for (const [field, text, message] of [
      ['name', '', 'Required'],
      ['name', 'Hi!', 'No exclamation marks'],
      ['qty', '-3', 'Value must be greater than or equal to 0.'],
      ['qty', '2.5', 'Must be a whole number'],
    ] as const) {
      await dbl(0, field);
      await page.keyboard.press('ControlOrMeta+a');
      if (text) await page.keyboard.type(text);
      else await page.keyboard.press('Backspace');
      await page.keyboard.press('Enter');
      const ed = await editor();
      assert.equal(ed?.error, message, field + ' ' + text); // the number Input's own constraint speaks first (its min)
      assert.equal(await page.$eval('#dg-edit .data-grid-editor :is(input, select)', (c) => c.getAttribute('aria-invalid')), 'true');
      await page.keyboard.press('Escape');
    }
  });

  await check('editing: the query runs again - sorted by Qty, an edited quantity moves its row; the editor types follow the column (number, enum Select, Switch)', async () => {
    await dbl(0, 'qty');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('0');
    await page.keyboard.press('Enter');
    // the record moved to its place in the sort (the end) and the focus went with it
    const moved = await page.evaluate(() => {
      const g = document.getElementById('dg-edit') as any;
      const rows = (globalThis as any).df$.shadcn.dataGrid.rows(g);
      return { focused: (document.activeElement as HTMLElement).textContent, at: g._focus.row, total: rows.length, last: rows.at(-1).qty };
    });
    assert.equal(moved.focused, '0');
    assert.ok(moved.at > moved.total - 50 && moved.last === 0, JSON.stringify(moved));
    await page.$eval('#dg-edit .data-grid-viewport', (v) => (v.scrollTop = 0));
    await page.waitForTimeout(100);
    await dbl(0, 'kind');
    assert.deepEqual(await page.$eval('#dg-edit .data-grid-editor select', (s: HTMLSelectElement) => [...s.options].map((o) => o.value)), ['tool', 'part', 'kit']);
    await page.selectOption('#dg-edit .data-grid-editor select', 'kit');
    assert.equal(await editor(), null, 'a Select commits on change');
    assert.equal(await cellOf(0, 'kind'), 'kit');
    await dbl(0, 'ok');
    assert.equal((await editor())?.cls, 'switch');
    await page.keyboard.press('Escape');
  });

  await check('editing: getEditorFn hands in a custom editor (immediate) and keeps a cell from editing (false); a column without data-editable never edits', async () => {
    await dbl(0, 'score');
    assert.equal((await editor())?.cls, 'select score-editor');
    await page.selectOption('#dg-edit .data-grid-editor select', '5');
    assert.equal(await cellOf(0, 'score'), '5');
    await dbl(0, 'note');
    assert.equal(await editor(), null, 'Note has no data-editable');
    // record 1 (locked) keeps its name: find its row
    const at = await page.$eval('#dg-edit', (g: any) => g.querySelector('.data-grid-rows') && (globalThis as any).df$.shadcn.dataGrid.rows(g).findIndex((r: any) => r.id === 1));
    assert.equal(await page.$eval('#dg-edit', (g: any) => (globalThis as any).df$.shadcn.dataGrid.edit(g, 1, 'name')), false);
    assert.ok(at >= 0);
    assert.equal(await page.$eval('#dg-edit', (g: any) => (globalThis as any).df$.shadcn.dataGrid.edit(g, 2, 'name')), true, 'edit() opens another record');
    await page.$eval('#dg-edit', (g: any) => (globalThis as any).df$.shadcn.dataGrid.cancel(g));
    const rec = await page.$eval('#dg-edit', (g: any) => (globalThis as any).df$.shadcn.dataGrid.update(g, 2, { name: 'From script' }));
    assert.equal(rec.name, 'From script');
  });

  await check('editing: scrolling the edited record out of the window writes it', async () => {
    await page.$eval('#dg-edit .data-grid-viewport', (v) => (v.scrollTop = 0));
    await page.waitForTimeout(100);
    await dbl(0, 'name');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Scrolled');
    const id = await page.$eval('#dg-edit', (g: any) => (globalThis as any).df$.shadcn.dataGrid.rows(g)[0].id);
    await page.$eval('#dg-edit .data-grid-viewport', (v) => (v.scrollTop = 30000));
    await page.waitForFunction(() => !document.querySelector('#dg-edit .data-grid-editor'));
    const name = await page.$eval('#dg-edit', (g: any, id) => (globalThis as any).df$.shadcn.dataGrid.rows(g).find((r: any) => r.id === id).name, id);
    assert.equal(name, 'Scrolled');
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await ready();
    await assertRenderContract(page, '.data-grid[id]', ['default', 'loading', 'empty'], {
      // measured: column template, sticky offsets; counts follow the data
      runtimeAttrs: ['style', 'aria-rowcount', 'aria-colcount', 'aria-multiselectable', 'role', 'tabindex', 'data-has-locked', 'data-loading-more'],
      runtimeOwned: '.data-grid-rows, .data-grid-filters, .data-grid-menu-button, .data-grid-resizer, .data-grid-menu, .data-grid-footer, .data-grid-check',
    });
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\ndata-grid.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('data-grid.e2e: all checks passed');
