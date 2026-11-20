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
    const s = await page.$$eval('.data-grid', (gs) => gs.map((g: any) => [g.id, g.dataset.init, g.getAttribute('role'), typeof g.store?.subscribe, typeof g.api?.render]));
    for (const [id, init, role, store, render] of s) {
      assert.equal(init, '', `${id}: data-init`);
      assert.equal(role, id === 'dg-tree' ? 'treegrid' : 'grid', `${id}: role`);
      assert.equal(store, 'function', `${id}: el.store`);
      assert.equal(render, 'function', `${id}: el.api.render`);
    }
  });

  await check('100,000 rows render as a window of a few dozen rows', async () => {
    const s = await info('#dg-orders');
    assert.ok(s.rows > 5 && s.rows < 40, `pool of ${s.rows}`);
    assert.equal(s.status, '100,000 rows');
    assert.deepEqual(s.cells[0], ['1', 'Ada A.', 'EU', '€0.00', 'open']);
    const aria = await page.$eval('#dg-orders', (g) => [g.getAttribute('aria-rowcount'), g.getAttribute('aria-colcount'), g.getAttribute('aria-multiselectable')]);
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
    assert.equal(await page.$eval('#dg-orders', (g) => g.getAttribute('aria-colcount')), '4');
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
      out.push(g.dataset.state, g.getAttribute('aria-busy'));
      g.api.setState('empty');
      out.push(g.dataset.state, String(g.getAttribute('aria-busy')));
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
      runtimeOwned: '.data-grid-rows, .data-grid-filters, .data-grid-menu-button, .data-grid-resizer, .data-grid-menu, .data-grid-footer',
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
