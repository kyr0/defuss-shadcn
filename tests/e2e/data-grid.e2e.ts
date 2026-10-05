import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

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
    await page.goto(`${server.url}/tests/e2e/data-grid.e2e-fixture.html`);
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

  await check('locked columns: the pin moves a column into the sticky group; scrolling leaves it in place', async () => {
    await page.hover('#dg-orders .data-grid-header[data-field="status"]');
    await page.click('#dg-orders .data-grid-header[data-field="status"] .data-grid-pin');
    const s = await info('#dg-orders');
    assert.deepEqual(s.config.locked, ['id', 'status']);
    assert.deepEqual(s.headers, ['id', 'status', 'customer', 'region', 'amount'], 'locked first, in authored order');
    const sticky = await page.$eval('#dg-orders .data-grid-rows > .data-grid-row', (r) => [...r.children].map((c) => getComputedStyle(c).position));
    assert.deepEqual(sticky, ['sticky', 'sticky', 'static', 'static', 'static']);
    await page.$eval('#dg-orders', (g: HTMLElement) => { g.style.maxWidth = '22rem'; });
    await page.waitForTimeout(100);
    const before = await page.$eval('#dg-orders .data-grid-header[data-field="status"]', (h) => h.getBoundingClientRect().left);
    await page.$eval('#dg-orders .data-grid-viewport', (v) => { v.scrollLeft = 300; });
    await page.waitForTimeout(100);
    const after = await page.$eval('#dg-orders .data-grid-header[data-field="status"]', (h) => h.getBoundingClientRect().left);
    assert.equal(Math.round(after), Math.round(before), 'the locked column stays while the rest scrolls');
    await page.$eval('#dg-orders', (g: HTMLElement) => { g.style.maxWidth = ''; });
    await page.click('#dg-orders .data-grid-header[data-field="status"] .data-grid-pin');
    assert.deepEqual((await info('#dg-orders')).config.locked, ['id']);
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
    const key = 'defuss-shadcn:/tests/e2e/data-grid.e2e-fixture.html:data-grid:dg-pages';
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

  await check('prefers-reduced-motion: the loading pulse stops', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const anim = await page.$eval('#dg-wait .data-grid-body', (b) => getComputedStyle(b).animationName);
    assert.equal(anim, 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await ready();
    await assertRenderContract(page, '.data-grid[id]', ['default', 'loading', 'empty'], {
      // measured: column template, sticky offsets; counts follow the data
      runtimeAttrs: ['style', 'aria-rowcount', 'aria-colcount', 'aria-multiselectable', 'role', 'tabindex', 'data-has-locked', 'data-loading-more'],
      runtimeOwned: '.data-grid-rows, .data-grid-filters, .data-grid-pin, .data-grid-footer',
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
