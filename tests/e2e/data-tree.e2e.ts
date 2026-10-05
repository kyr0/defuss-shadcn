import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: a tree of 111,110 nodes is a tree no <ul> can render. These checks pin
 * that the data tree stays a window of items, that hierarchy, filtering and
 * sorting run over every node (a filter keeps the ancestors of each match),
 * that the ARIA tree contract holds on recycled items (aria-level, -setsize,
 * -posinset, -expanded, -selected, aria-activedescendant), that the keyboard
 * follows the APG tree pattern, and that the query lives in el.store.
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
  const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  const ready = async () => {
    await page.goto(`${server.url}/tests/e2e/data-tree.e2e-fixture.html`);
    await page.waitForFunction(() => (globalThis as Record<string, unknown>).__fixtureReady === true, null, { timeout: 15_000 });
  };
  await page.goto(`${server.url}/tests/e2e/data-tree.e2e-fixture.html`);
  await page.evaluate(() => localStorage.clear());
  await ready();

  const items = (sel: string, n = 4) =>
    page.$eval(sel, (t, n) => [...t.querySelectorAll('.data-tree-item')].slice(0, n).map((i) => [
      i.getAttribute('aria-level'), i.textContent, i.getAttribute('aria-expanded'), `${i.getAttribute('aria-posinset')}/${i.getAttribute('aria-setsize')}`,
    ]), n);
  const config = (sel: string) => page.$eval(sel, (t: any) => t.store.value.config);
  const state = (sel: string) => page.$eval(sel, (t: any) => t.store.value.name);

  await check('data-tree.js initialized every tree (data-init, role=tree, focusable, el.store, el.api)', async () => {
    const s = await page.$$eval('.data-tree', (ts) => ts.map((t: any) => [t.dataset.init, t.getAttribute('role'), t.getAttribute('tabindex'), typeof t.store?.subscribe, typeof t.api?.render]));
    for (const row of s) assert.deepEqual(row, ['', 'tree', '0', 'function', 'function']);
  });

  await check('111,110 nodes: ten roots shown, a window of items, sibling positions', async () => {
    assert.deepEqual(await items('#dt-big', 2), [['1', 'Region 1', 'false', '1/10'], ['1', 'Region 2', 'false', '2/10']]);
    const pool = await page.$eval('#dt-big', (t) => t.querySelectorAll('.data-tree-item').length);
    assert.equal(pool, 10);
  });

  await check('the toggle opens a branch: children at aria-level 2, positions among their siblings', async () => {
    await page.click('#dt-big .data-tree-item:nth-child(1) .data-tree-toggle');
    assert.deepEqual((await config('#dt-big')).expanded, [1]);
    assert.deepEqual(await items('#dt-big', 3), [['1', 'Region 1', 'true', '1/10'], ['2', 'Country 1.1', 'false', '1/10'], ['2', 'Country 1.2', 'false', '2/10']]);
  });

  await check('keyboard (APG tree): ↓ moves, → opens then steps in, ← closes / goes to the parent, Enter selects', async () => {
    await page.focus('#dt-big');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    assert.deepEqual((await config('#dt-big')).expanded, [1, 2]);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    let s = await config('#dt-big');
    assert.equal(s.selected, 3);
    const active = await page.$eval('#dt-big', (t) => document.getElementById(t.getAttribute('aria-activedescendant')!)?.textContent);
    assert.equal(active, 'City 1.1.1');
    const selected = await page.$eval('#dt-big', (t) => t.querySelector('[aria-selected="true"]')?.textContent);
    assert.equal(selected, 'City 1.1.1');
    await page.keyboard.press('ArrowLeft');
    s = await page.$eval('#dt-big', (t) => document.getElementById(t.getAttribute('aria-activedescendant')!)?.textContent);
    assert.equal(s, 'Country 1.1', 'Left on a leaf goes to its parent');
    await page.keyboard.press('ArrowLeft');
    assert.deepEqual((await config('#dt-big')).expanded, [1]);
    await page.keyboard.press('End');
    const end = await page.$eval('#dt-big', (t) => document.getElementById(t.getAttribute('aria-activedescendant')!)?.textContent);
    assert.equal(end, 'Region 10');
  });

  await check('a bound filter input: matches with their ancestors, opened; the first match becomes active', async () => {
    await page.fill('#dt-filter', 'DISTRICT 7.3.42.');
    await page.waitForFunction(() => (document.querySelector('#dt-big') as any).store.value.config.filters.length === 1);
    assert.deepEqual(await items('#dt-big', 4), [
      ['1', 'Region 7', 'true', '1/1'],
      ['2', 'Country 7.3', 'true', '1/1'],
      ['3', 'City 7.3.42', 'true', '1/1'],
      ['4', 'District 7.3.42.1', null, '1/10'],
    ]);
    const marks = await page.$$eval('#dt-big .data-tree-item', (is) => is.slice(0, 4).map((i) => i.hasAttribute('data-match')));
    assert.deepEqual(marks, [false, false, false, true]);
    const active = await page.$eval('#dt-big', (t) => document.getElementById(t.getAttribute('aria-activedescendant')!)?.textContent);
    assert.equal(active, 'District 7.3.42.1');
  });

  await check('closing a branch while filtering keeps the filter (config.collapsed)', async () => {
    await page.click('#dt-big .data-tree-item:nth-child(3) .data-tree-toggle');
    const s = await config('#dt-big');
    assert.equal(s.collapsed.length, 1);
    assert.equal((await items('#dt-big', 4)).length, 3);
  });

  await check('no match → empty (data-empty-text); clearing → default', async () => {
    await page.fill('#dt-filter', 'nothing like this');
    await page.waitForFunction(() => (document.querySelector('#dt-big') as any).store.value.name === 'empty');
    assert.equal(await page.$eval('#dt-big', (t) => getComputedStyle(t, '::after').content), '"No node matches."');
    await page.fill('#dt-filter', '');
    await page.waitForFunction(() => (document.querySelector('#dt-big') as any).store.value.name === 'default');
    assert.deepEqual((await config('#dt-big')).filters, []);
  });

  await check('sort: siblings order by a field, the hierarchy stays', async () => {
    await page.$eval('#dt-big', (t) => (globalThis as any).df$.shadcn.dataTree.query(t, { sorters: [{ field: 'name', direction: 'desc' }] }));
    const s = await items('#dt-big', 3);
    assert.deepEqual(s[0], ['1', 'Region 9', 'false', '1/10'], 'descending by name: "Region 9" before "Region 10"');
    await page.$eval('#dt-big', (t) => (globalThis as any).df$.shadcn.dataTree.query(t, { sorters: [] }));
  });

  await check('expandAll / collapseAll', async () => {
    await page.$eval('#dt-saved', (t) => (globalThis as any).df$.shadcn.dataTree.expandAll(t));
    assert.equal(await page.$eval('#dt-saved', (t) => t.querySelectorAll('.data-tree-item').length), 6);
    await page.$eval('#dt-saved', (t) => (globalThis as any).df$.shadcn.dataTree.collapseAll(t));
    assert.equal(await page.$eval('#dt-saved', (t) => t.querySelectorAll('.data-tree-item').length), 2);
  });

  await check('by default the view survives a reload in session storage; the bound input shows the kept filter', async () => {
    await page.fill('#dt-filter', 'city 4.4.4');
    await page.waitForFunction(() => (document.querySelector('#dt-big') as any).store.value.config.filters.length === 1);
    const key = 'defuss-shadcn:/tests/e2e/data-tree.e2e-fixture.html:data-tree:dt-big';
    assert.deepEqual(await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)!).value.filters, key), [{ field: 'name', op: 'contains', value: 'city 4.4.4' }]);
    await ready();
    assert.deepEqual((await config('#dt-big')).filters, [{ field: 'name', op: 'contains', value: 'city 4.4.4' }]);
    assert.equal(await page.inputValue('#dt-filter'), 'city 4.4.4');
    await page.fill('#dt-filter', '');
    await page.waitForFunction(() => (document.querySelector('#dt-big') as any).store.value.config.filters.length === 0);
  });

  await check('custom labels; data-persist="local" + data-persist-key keep expanded + selected across a reload', async () => {
    assert.equal(await page.$eval('#dt-saved .data-tree-meta', (m) => m.textContent), '3 files');
    await page.click('#dt-saved .data-tree-item:nth-child(1) .data-tree-toggle');
    await page.click('#dt-saved .data-tree-item:nth-child(3)');
    assert.deepEqual(await config('#dt-saved'), { filters: [], sorters: [], expanded: ['src'], collapsed: [], selected: 'src/b.ts' });
    const picked = await page.$eval('#dt-saved', (t) => (globalThis as any).df$.shadcn.dataTree.selected(t)?.name);
    assert.equal(picked, 'b.ts');
    await ready();
    const s = await config('#dt-saved');
    assert.deepEqual([s.expanded, s.selected], [['src'], 'src/b.ts']);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('fixture-tree')!).value.selected), 'src/b.ts');
    await page.evaluate(() => localStorage.clear());
  });

  await check('the store is the query: a subscriber hears expand, store.set applies a filter', async () => {
    const r = await page.$eval('#dt-big', (t: any) => {
      (globalThis as any).df$.shadcn.dataTree.query(t, { expanded: [], filters: [] });
      const seen: unknown[] = [];
      const off = t.store.subscribe((v: any) => seen.push(v.config.expanded));
      (globalThis as any).df$.shadcn.dataTree.query(t, { expanded: [1] });
      off();
      t.store.set({ name: 'default', config: { ...t.store.value.config, filters: [{ field: 'name', op: 'contains', value: 'Region 3' }] } });
      return [seen, t.querySelector('.data-tree-item')?.textContent];
    });
    assert.deepEqual(r, [[[1]], 'Region 3']);
  });

  await check('State API: loading / empty / default; unknown names throw; registry globals', async () => {
    assert.equal(await state('#dt-wait'), 'loading', 'a tree without records waits in loading');
    assert.equal(await page.$eval('#dt-wait', (t) => t.getAttribute('aria-busy')), 'true');
    const r = await page.$eval('#dt-saved', (t: any) => {
      const out: string[] = [];
      for (const s of ['loading', 'empty', 'default']) { t.api.setState(s); out.push(t.dataset.state); }
      let threw = false;
      try { t.api.setState('nope'); } catch { threw = true; }
      return [...out, String(threw), typeof (globalThis as any).df$.shadcn.dataTreeApi.setState, String((globalThis as any).df$.shadcn.dataTreeStates.join())];
    });
    assert.deepEqual(r, ['loading', 'empty', 'default', 'true', 'function', 'default,loading,empty']);
  });

  await check('prefers-reduced-motion: the loading pulse stops', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.$eval('#dt-wait', (t) => getComputedStyle(t, '::before').animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await ready();
    await assertRenderContract(page, '.data-tree[id]', ['default', 'loading', 'empty'], {
      runtimeAttrs: ['role', 'tabindex', 'aria-activedescendant'],
      runtimeOwned: '.data-tree-sizer',
    });
    await page.evaluate(() => localStorage.clear());
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\ndata-tree.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('data-tree.e2e: all checks passed');
