import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: a property grid is only useful when an edit lands as the RIGHT value -
 * a number as a number, a switch as a boolean, an option as its own value -
 * in a NEW source object the store records, and when its hooks (render
 * functions, editors, the cancelable beforechange) are honored. These pin
 * that, the keyboard (rows, Enter / F2, Escape, Tab, groups), read-only and
 * sorting, and the inspector round trip of the doc page: a diagram selection
 * fills the grid in a closable panel, an edit writes back into the diagram.
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
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  const ready = async () => {
    await page.goto(`${server.url}/tests/e2e/property-grid.e2e-fixture.html`);
    await page.waitForFunction(() => document.querySelectorAll('.property-grid .property-grid-table').length >= 6, null, { timeout: 15_000 });
  };
  await ready();
  const source = (sel: string) => page.$eval(sel, (el: any) => el.store.value.config.source);
  const stateName = (sel: string) => page.$eval(sel, (el: any) => el.store.value.name);
  const rows = (sel: string) => page.$$eval(`${sel} tbody tr`, (trs) => trs.map((tr) => `${(tr as HTMLElement).dataset.path}=${tr.querySelector('.property-grid-value')?.textContent?.trim()}`));
  const cell = (sel: string, path: string) => `${sel} tr[data-path="${path}"] .property-grid-value`;

  await check('init: one row a property, groups for objects / arrays, displayName and read-only from the config script', async () => {
    const r = await page.$eval('#pg-service', (el: any) => ({
      init: el.dataset.init,
      role: el.getAttribute('role'),
      api: typeof el.api?.setState,
      groups: [...el.querySelectorAll('.property-grid-group')].map((g: HTMLElement) => `${g.dataset.path}:${g.querySelector('.property-grid-toggle')!.getAttribute('aria-expanded')}`),
      service: el.querySelector('tr[data-path="name"] th')!.textContent,
      readonly: el.querySelector('tr[data-path="name"]')!.hasAttribute('data-readonly'),
      tooltip: el.querySelector('tr[data-path="replicas"] th')!.title,
      types: Object.fromEntries([...el.querySelectorAll('tbody tr')].map((tr: HTMLElement) => [tr.dataset.path, tr.dataset.type])),
    }));
    assert.equal(r.init, '');
    assert.equal(r.role, 'group');
    assert.equal(r.api, 'function');
    assert.deepEqual(r.groups, ['limits:true', 'tags:true']);
    assert.equal(r.service, 'Service');
    assert.equal(r.readonly, true);
    assert.equal(r.tooltip, 'Pods behind the service');
    assert.equal(r.types.accent, 'color');
    assert.equal(r.types.launched, 'date');
    assert.equal(r.types.description, 'text');
    assert.equal(r.types.region, 'enum');
    assert.equal(r.types['limits.rps'], 'number');
  });

  await check("a number edits as a number: click → input[type=number], Enter commits a NEW source; state 'editing' while open", async () => {
    await page.click(cell('#pg-service', 'replicas'));
    assert.equal(await stateName('#pg-service'), 'editing');
    assert.equal(await page.$eval('#pg-service', (el) => el.getAttribute('data-editing')), 'replicas');
    const before = await page.$eval('#pg-service', (el: any) => el.store.value.config.source);
    await page.$eval('#pg-service', (el: any) => {
      (globalThis as any).__changes = [];
      el.addEventListener('property-grid-change', (e: CustomEvent) => (globalThis as any).__changes.push(e.detail));
    });
    assert.equal(await page.$eval(`${cell('#pg-service', 'replicas')} input`, (i: HTMLInputElement) => i.type), 'number');
    await page.fill(`${cell('#pg-service', 'replicas')} input`, '7');
    await page.keyboard.press('Enter');
    assert.equal(await stateName('#pg-service'), 'default');
    const after = await source('#pg-service');
    assert.equal(after.replicas, 7);
    assert.equal(before.replicas, 3); // the old object was not mutated
    const changes = await page.evaluate(() => (globalThis as any).__changes);
    assert.deepEqual(changes.map((c: any) => [c.path, c.key, c.value, c.oldValue, c.source.replicas]), [['replicas', 'replicas', 7, 3, 7]]);
    assert.equal(await page.$eval(cell('#pg-service', 'replicas'), (c) => c.textContent), '7');
  });

  await check('Escape cancels: the old value stays, focus returns to the cell', async () => {
    await page.click(cell('#pg-service', 'limits.rps'));
    await page.fill(`${cell('#pg-service', 'limits.rps')} input`, '9999');
    await page.keyboard.press('Escape');
    assert.equal((await source('#pg-service')).limits.rps, 1200);
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).closest('tr')?.dataset.path), 'limits.rps');
  });

  await check('a boolean edits with a switch and commits on change; an enum with a select of the options', async () => {
    await page.click(cell('#pg-service', 'public'));
    assert.equal(await page.$eval(`${cell('#pg-service', 'public')} input`, (i) => `${i.className}/${i.getAttribute('role')}`), 'switch/switch');
    await page.click(`${cell('#pg-service', 'public')} input`);
    assert.equal((await source('#pg-service')).public, false);
    await page.click(cell('#pg-service', 'region'));
    await page.selectOption(`${cell('#pg-service', 'region')} select`, 'ap-south-1');
    assert.equal((await source('#pg-service')).region, 'ap-south-1');
    assert.equal(await stateName('#pg-service'), 'default');
  });

  await check('keyboard: ↓ moves between rows (one tab stop), Enter / F2 edits, ← folds a group, Tab commits and moves on', async () => {
    await page.focus(cell('#pg-service', 'accent'));
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).closest('tr')?.dataset.path), 'launched');
    assert.equal(await page.$$eval('#pg-service [tabindex="0"]', (els) => els.length), 1);
    await page.keyboard.press('F2');
    assert.equal(await page.$eval(`${cell('#pg-service', 'launched')} input`, (i: HTMLInputElement) => i.type), 'date');
    await page.keyboard.press('Escape');
    // the limits group: ↓ ↓ reaches it, ← folds it (its children go), → unfolds
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).className), 'property-grid-toggle');
    await page.keyboard.press('ArrowLeft');
    assert.ok(!(await rows('#pg-service')).some((r) => r.startsWith('limits.')));
    assert.deepEqual((await page.$eval('#pg-service', (el: any) => el.store.value.config.collapsed)), ['limits']);
    await page.keyboard.press('ArrowRight');
    assert.ok((await rows('#pg-service')).some((r) => r.startsWith('limits.rps')));
    // Tab from an editor commits and moves to the next row
    await page.click(cell('#pg-service', 'limits.rps'));
    await page.fill(`${cell('#pg-service', 'limits.rps')} input`, '1500');
    await page.keyboard.press('Tab');
    assert.equal((await source('#pg-service')).limits.rps, 1500);
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).closest('tr')?.dataset.path), 'limits.burst');
  });

  await check('a multi-line text edits in a textarea (Enter is a new line, Ctrl+Enter commits)', async () => {
    await page.click(cell('#pg-service', 'description'));
    const ta = `${cell('#pg-service', 'description')} textarea`;
    await page.fill(ta, 'Takes orders');
    await page.keyboard.press('Enter');
    await page.keyboard.type('and refunds');
    await page.keyboard.press('Control+Enter');
    assert.equal((await source('#pg-service')).description, 'Takes orders\nand refunds');
  });

  await check('keyRenderFn / valueRenderFn draw the cells; the values stay plain JSON', async () => {
    const r = await page.$eval('#pg-render', (el: any) => ({
      key: el.querySelector('tr[data-path="p95"] th code')?.textContent,
      p95: el.querySelector('tr[data-path="p95"] .property-grid-value')!.textContent,
      badge: el.querySelector('tr[data-path="healthy"] .badge')?.textContent,
      plain: el.store.value.config.source.p95,
    }));
    assert.deepEqual(r, { key: '#', p95: '182 ms', badge: 'healthy', plain: 182 });
  });

  await check('getEditorFn: a slider commits a number, the Combobox tag input an array; beforechange can refuse; read-only keys stay', async () => {
    await page.click(cell('#pg-editors', 'opacity'));
    await page.$eval(`${cell('#pg-editors', 'opacity')} input[type="range"]`, (r: HTMLInputElement) => {
      r.value = '0.35';
      r.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.keyboard.press('Enter');
    assert.equal((await source('#pg-editors')).opacity, 0.35);
    await page.click(cell('#pg-editors', 'tags'));
    // the tag combobox: the current tags are chosen, Enter adds one (and does NOT commit), Ctrl+Enter commits
    assert.deepEqual(await page.$$eval(`${cell('#pg-editors', 'tags')} .combobox-item[aria-selected="true"]`, (os) => os.map((o) => (o as HTMLElement).dataset.value)), ['finance', 'weekly']);
    await page.keyboard.type('board');
    await page.keyboard.press('Enter');
    assert.equal(await stateName('#pg-editors'), 'editing');
    await page.keyboard.press('Control+Enter');
    assert.deepEqual((await source('#pg-editors')).tags, ['finance', 'weekly', 'board']);
    await page.click(cell('#pg-editors', 'budget'));
    await page.fill(`${cell('#pg-editors', 'budget')} input`, '6000');
    await page.keyboard.press('Enter');
    assert.equal((await source('#pg-editors')).budget, 1200);
    assert.equal(await page.$eval('#pg-editors-log', (p) => p.textContent), 'tags: ["finance","weekly"] → ["finance","weekly","board"]');
    await page.click(cell('#pg-editors', 'id'));
    assert.equal(await stateName('#pg-editors'), 'default');
  });

  await check('validation: sourceConfig rules refuse a value - the editor stays, aria-invalid, the reason under it; validateFn checks across keys', async () => {
    await page.click(cell('#pg-valid', 'port'));
    await page.fill(`${cell('#pg-valid', 'port')} input`, '80');
    await page.keyboard.press('Enter');
    const r = await page.$eval('#pg-valid', (el: any) => ({
      state: el.store.value.name,
      invalid: el.querySelector('tr[data-path="port"] input').getAttribute('aria-invalid'),
      note: el.querySelector('.property-grid-error')?.textContent,
      role: el.querySelector('.property-grid-error')?.getAttribute('role'),
      described: el.querySelector('tr[data-path="port"] input').getAttribute('aria-describedby') === el.querySelector('.property-grid-error')?.id,
      port: el.store.value.config.source.port,
    }));
    assert.deepEqual({ ...r, note: !!r.note }, { state: 'editing', invalid: 'true', note: true, role: 'alert', described: true, port: 8443 });
    await page.fill(`${cell('#pg-valid', 'port')} input`, '9000');
    await page.keyboard.press('Enter');
    assert.equal((await source('#pg-valid')).port, 9000);
    // whole numbers, patterns with their message, a required name
    for (const [path, bad, message] of [['replicas', '2.5', 'Must be a whole number'], ['owner', 'nobody', 'An e-mail address'], ['name', 'X', '3-24 lowercase letters, digits or -']]) {
      await page.click(cell('#pg-valid', path));
      await page.fill(`${cell('#pg-valid', path)} input`, bad);
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#pg-valid .property-grid-error', (e) => e.textContent), message, path);
      await page.keyboard.press('Escape');
    }
    // validateFn across keys: the budget may not exceed the limit
    await page.click(cell('#pg-valid', 'budget'));
    await page.fill(`${cell('#pg-valid', 'budget')} input`, '2500');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#pg-valid .property-grid-error', (e) => e.textContent), 'Over the limit of 2000');
    await page.keyboard.press('Escape');
    assert.equal((await source('#pg-valid')).budget, 1500);
  });

  await check('data in / out: buttons read and write through the API, the store feeds the JSON view, Apply JSON replaces the object', async () => {
    await page.click('#pg-data-scale');
    await page.click('#pg-data-read');
    assert.equal(await page.$eval('#pg-data-out', (o) => o.textContent), 'replicas = 6');
    assert.deepEqual(await page.$$eval('#pg-data-json pre[data-diff]', (ps) => ps.map((x) => x.textContent)), ['  "replicas": 6,']);
    await page.click('#pg-data-apply');
    assert.deepEqual(await source('#pg-data'), { name: 'search', replicas: 4, public: true, region: 'us-east-1', limits: { rps: 900, burst: 120 } });
    assert.ok((await page.$eval('#pg-data-json', (j) => j.textContent)).includes('"burst": 120'));
    await page.fill('#pg-data-text', '{ nope');
    await page.click('#pg-data-apply');
    assert.ok((await page.$eval('#pg-data-error', (o) => o.textContent))!.length > 0);
    assert.equal((await source('#pg-data')).replicas, 4);
    await page.click('#pg-data-reset');
    assert.equal((await source('#pg-data')).replicas, 2);
  });

  await check('variants: data-sort orders the keys, data-readonly edits nothing, labels and comfortable rows', async () => {
    assert.deepEqual((await rows('#pg-comfortable')).map((r) => r.split('=')[0]), ['author', 'max', 'monitor', 'zone']);
    await page.click(cell('#pg-readonly', 'build'));
    assert.equal(await stateName('#pg-readonly'), 'default');
    assert.deepEqual(await page.$$eval('#pg-readonly thead th', (ths) => ths.map((t) => t.textContent)), ['Field', 'Reading']);
    const h = await page.$eval('#pg-comfortable tbody tr', (tr) => tr.getBoundingClientRect().height);
    const d = await page.$eval('#pg-readonly tbody tr', (tr) => tr.getBoundingClientRect().height);
    assert.ok(h > d, `comfortable ${h} > dense ${d}`);
  });

  await check('inspector: a diagram selection fills the grid in the panel; an edit writes back into the diagram', async () => {
    await page.click('#pg-diagram [data-node="db"]');
    assert.deepEqual(await source('#pg-selection'), { id: 'db', name: 'Orders', meta: 'Postgres', tone: 'none', shape: 'store' });
    assert.equal(await page.$eval('#pg-inspector-title', (t) => t.textContent), 'Inspector · Orders');
    await page.click(cell('#pg-selection', 'name'));
    await page.fill(`${cell('#pg-selection', 'name')} input`, 'Orders DB');
    await page.keyboard.press('Enter');
    await page.click(cell('#pg-selection', 'tone'));
    await page.selectOption(`${cell('#pg-selection', 'tone')} select`, 'accent');
    const r = await page.$eval('#pg-diagram [data-node="db"]', (n) => [n.querySelector('.diagram-node-name')!.textContent, n.getAttribute('data-tone')]);
    assert.deepEqual(r, ['Orders DB', 'accent']);
    // an edge selection shows the edge's own properties
    await page.click('#pg-diagram .diagram-wire-label[data-edge-ref="api->mail"]');
    assert.deepEqual(await source('#pg-selection'), { from: 'api', to: 'mail', label: 'notify', line: 'dashed' });
  });

  await check('inspector panel: × closes it (the canvas takes the room); the Inspector toggle closes and opens it and says which (aria-expanded)', async () => {
    const toggle = '[data-panel-toggle="pg-inspector"]';
    assert.equal(await page.$eval(toggle, (b) => b.getAttribute('aria-expanded')), 'true');
    await page.click('#pg-inspector .panel-close');
    assert.equal(await page.$eval('#pg-inspector', (p: any) => [p.hidden, p.store.value.name].join()), 'true,closed');
    assert.equal(await page.$eval(toggle, (b) => b.getAttribute('aria-expanded')), 'false');
    await page.click(toggle);
    assert.equal(await page.$eval('#pg-inspector', (p: any) => [p.hidden, p.store.value.name].join()), 'false,default');
    assert.equal(await page.$eval(toggle, (b) => b.getAttribute('aria-expanded')), 'true');
    await page.click(toggle);
    assert.equal(await page.$eval('#pg-inspector', (p: any) => p.hidden), true);
    await page.click(toggle);
  });

  await check('df$.shadcn.propertyGrid: setSource / getSource (copies), setProperty / getProperty, edit / cancel, collapse / expand', async () => {
    const r = await page.evaluate(() => {
      const pg = (globalThis as any).df$.shadcn.propertyGrid;
      const mine = { a: 1, nested: { b: true } };
      pg.setSource('#pg-readonly', mine);
      mine.a = 99; // the grid keeps its own copy
      const got = pg.getSource('#pg-readonly');
      got.a = 42; // and hands out copies
      pg.setProperty('#pg-readonly', 'nested.b', false);
      const value = pg.getProperty('#pg-readonly', 'nested.b');
      pg.collapse('#pg-readonly', 'nested');
      const folded = document.querySelectorAll('#pg-readonly tr[data-path="nested.b"]').length;
      pg.expand('#pg-readonly', 'nested');
      return { a: pg.getProperty('#pg-readonly', 'a'), value, folded, open: document.querySelectorAll('#pg-readonly tr[data-path="nested.b"]').length };
    });
    assert.deepEqual(r, { a: 1, value: false, folded: 0, open: 1 });
    await page.evaluate(() => (globalThis as any).df$.shadcn.propertyGrid.edit('#pg-editors', 'title'));
    assert.equal(await page.$eval('#pg-editors', (el) => el.getAttribute('data-editing')), 'title');
    await page.evaluate(() => (globalThis as any).df$.shadcn.propertyGrid.cancel('#pg-editors'));
    assert.equal(await stateName('#pg-editors'), 'default');
  });

  // render() contract last - it reloads the page
  await check('render() contract: default / editing', async () => {
    await ready();
    await assertRenderContract(page, '#pg-service', ['default', 'editing'], { runtimeOwned: '.property-grid-table', runtimeAttrs: ['role'] });
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\nproperty-grid: ${failures} failing check(s)`);
  process.exit(1);
}
console.log('\nproperty-grid: all checks passed');
