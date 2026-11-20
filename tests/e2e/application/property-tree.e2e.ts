import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: a property tree is only useful when an edit lands as the RIGHT value in the RIGHT node - a number as a number,
 * a Date as a Date, a key renamed in its place - and a node that appears twice stays one node. These pin every edit
 * kind (value, key, add, remove, duplicate, move, type) with undo / redo, the DSON source (Map, Set, Date, BigInt,
 * RegExp, a cycle and a shared node, read with the pinned defuss-dson served offline), json() / dson(), 100,000 nodes
 * in a window of rows, the hooks, the keyboard, read-only, and the render() contract. VERIFIED: the maintainer asked
 * for JSON / DSON objects to be inspectable and inline editable (2026-11-20).
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
  const vendor = await offlineJsdelivr(page);
  const ready = async () => {
    await page.goto(`${server.url}/tests/e2e/application/property-tree.e2e-fixture.html`);
    await page.waitForFunction(() => (globalThis as any).__fixtureReady === true, null, { timeout: 15_000 });
    await page.waitForFunction(() => !document.querySelector('#pt-dson')?.hasAttribute('data-loading') && (globalThis as any).df$.shadcn.propertyTree.value('#pt-dson') !== undefined, null, { timeout: 15_000 });
  };
  await ready();

  /** the rows in the DOM: "key=value" */
  const rows = (sel: string) =>
    page.$$eval(`${sel} .property-tree-row`, (els) =>
      els
        .sort((a: any, b: any) => a._index - b._index)
        .map((r) => `${r.querySelector('.property-tree-key')!.textContent}=${r.querySelector('.property-tree-value')!.textContent}`),
    );
  const pt = (sel: string, fn: string, ...args: unknown[]) =>
    page.evaluate(([sel, fn, args]) => (globalThis as any).df$.shadcn.propertyTree[fn as string](sel, ...(args as unknown[])), [sel, fn, args] as const);
  const rowEl = (sel: string, key: string) => `${sel} .property-tree-row:has(> .property-tree-key:text-is("${key}"))`;
  const editor = (sel: string) =>
    page.$eval(sel, (t) => {
      const ed = t.querySelector('.property-tree-editor');
      const c = ed?.querySelector('input, select, textarea') as HTMLInputElement | null;
      return ed ? { tag: c?.tagName, type: c?.type, cls: c?.className, focused: ed.contains(document.activeElement), error: ed.querySelector('.property-tree-error')?.textContent ?? '' } : null;
    });

  await check('init: a role=tree viewport over the rows of the open branches (the root open), the kinds shown', async () => {
    const r = await page.$eval('#pt-json', (t: any) => ({
      init: t.dataset.init,
      role: t.querySelector('.property-tree-viewport')?.getAttribute('role'),
      label: t.querySelector('.property-tree-viewport')?.getAttribute('aria-label'),
      store: typeof t.store?.subscribe,
      types: [...t.querySelectorAll('.property-tree-row')].map((r: any) => r.querySelector('.property-tree-type').textContent),
    }));
    assert.equal(r.init, '');
    assert.equal(r.role, 'tree');
    assert.equal(r.label, 'Service configuration');
    assert.equal(r.store, 'function');
    assert.deepEqual(r.types, ['object', 'string', 'number', 'boolean', 'string', 'string', 'object', 'object', 'null']);
    assert.deepEqual((await rows('#pt-json')).slice(0, 4), ['root={8 keys}', 'service="checkout"', 'replicas=3', 'public=true']);
    assert.ok(await page.$(`${rowEl('#pt-json', 'accent')} .property-tree-swatch`), 'a colour shows a swatch');
  });

  await check('a value: a double click opens its editor by kind (a number Input), Enter writes a number in place; property-tree-change; the store counts the edit', async () => {
    const events: any[] = [];
    await page.exposeFunction('__ptChange', (d: any) => events.push(d));
    await page.$eval('#pt-json', (t) => t.addEventListener('property-tree-change', (e: any) => (globalThis as any).__ptChange({ op: e.detail.op, pointer: e.detail.pointer, value: e.detail.value, oldValue: e.detail.oldValue })));
    await page.dblclick(`${rowEl('#pt-json', 'replicas')} .property-tree-value`);
    assert.deepEqual(await editor('#pt-json'), { tag: 'INPUT', type: 'number', cls: 'input', focused: true, error: '' });
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('5');
    await page.keyboard.press('Enter');
    assert.equal(await editor('#pt-json'), null);
    assert.strictEqual(await pt('#pt-json', 'get', '/replicas'), 5);
    await page.waitForFunction(() => true);
    assert.deepEqual(events.at(-1), { op: 'set', pointer: '/replicas', value: 5, oldValue: 3 });
    assert.equal(await page.$eval('#pt-json', (t: any) => t.store.value.config.version), 1);
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'property-tree-viewport', 'the tree has the focus again');
  });

  await check('editors by kind: a Switch (commits on change), a colour input, a date input, Escape keeps the value; F2 on the active row', async () => {
    await page.dblclick(`${rowEl('#pt-json', 'public')} .property-tree-value`);
    assert.equal((await editor('#pt-json'))?.cls, 'switch');
    await page.click('#pt-json .property-tree-editor .switch');
    assert.equal(await pt('#pt-json', 'get', '/public'), false);
    await page.dblclick(`${rowEl('#pt-json', 'accent')} .property-tree-value`);
    assert.equal((await editor('#pt-json'))?.type, 'color');
    await page.keyboard.press('Escape');
    await page.dblclick(`${rowEl('#pt-json', 'launched')} .property-tree-value`);
    assert.equal((await editor('#pt-json'))?.type, 'date');
    await page.keyboard.press('Escape');
    assert.equal(await pt('#pt-json', 'get', '/launched'), '2025-03-14');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('F2');
    assert.equal((await editor('#pt-json'))?.type, 'color', 'F2 edits the active row (accent)');
    await page.keyboard.press('Escape');
  });

  await check('a key: a double click renames it in its place (Shift+F2 too); a taken key is refused; the open branch follows the key', async () => {
    await pt('#pt-json', 'reveal', '/owner/team');
    await page.dblclick(`${rowEl('#pt-json', 'owner')} .property-tree-key`);
    assert.equal((await editor('#pt-json'))?.type, 'text');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('limits');
    await page.keyboard.press('Enter');
    assert.equal((await editor('#pt-json'))?.error, '"limits" is already a key here');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('maintainers');
    await page.keyboard.press('Enter');
    const keys = await page.evaluate(() => Object.keys((globalThis as any).df$.shadcn.propertyTree.value('#pt-json')));
    assert.deepEqual(keys, ['service', 'replicas', 'public', 'accent', 'launched', 'maintainers', 'limits', 'notes'], 'renamed in its place');
    assert.ok((await rows('#pt-json')).includes('team="Payments"'), 'the renamed branch stays open');
  });

  await check('add, duplicate, move, type, remove - and every one undoes and redoes (Ctrl/Cmd+Z, Shift)', async () => {
    const value = () => page.evaluate(() => JSON.parse((globalThis as any).df$.shadcn.propertyTree.json('#pt-json')));
    const before = await value();
    // the actions menu: Add property on /limits
    await page.$eval(rowEl('#pt-json', 'limits'), (r) => (r.querySelector('.property-tree-actions') as HTMLElement).click());
    assert.ok(await page.$eval('#pt-json .property-tree-menu', (m) => m.matches(':popover-open')));
    const items = await page.$$eval('#pt-json .property-tree-menu .property-tree-menu-item', (b) => b.map((x) => x.textContent));
    assert.ok(items.includes('Add property') && items.includes('As array') && items.includes('Delete'), items.join(', '));
    await page.click('#pt-json .property-tree-menu [data-action="add"]');
    assert.equal((await editor('#pt-json'))?.type, 'text', 'a new key opens its key editor');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('timeout');
    await page.keyboard.press('Enter');
    assert.deepEqual(Object.keys((await value()).limits), ['rps', 'burst', 'timeout']);
    assert.ok(await pt('#pt-json', 'setType', '/limits/timeout', 'number'));
    assert.strictEqual(await pt('#pt-json', 'get', '/limits/timeout'), 0);
    assert.deepEqual(await pt('#pt-json', 'add', '/maintainers/oncall', null, 'linus@example.com'), ['maintainers', 'oncall', 2]);
    // move and duplicate through the keyboard: Alt+Up, Ctrl/Cmd+D on the active row
    await pt('#pt-json', 'reveal', '/maintainers/oncall/2');
    await page.$eval('#pt-json .property-tree-viewport', (v: HTMLElement) => v.focus());
    await page.keyboard.press('Alt+ArrowUp');
    assert.deepEqual((await value()).maintainers.oncall, ['ada@example.com', 'linus@example.com', 'grace@example.com']);
    await page.keyboard.press('ControlOrMeta+d');
    assert.deepEqual((await value()).maintainers.oncall, ['ada@example.com', 'linus@example.com', 'linus@example.com', 'grace@example.com']);
    await page.keyboard.press('Delete');
    assert.equal((await value()).maintainers.oncall.length, 3);
    // undo everything back to the start, then redo one
    for (let i = 0; i < 7; i++) await page.keyboard.press('ControlOrMeta+z');
    assert.deepEqual(await value(), before, 'seven undos restore the value');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    assert.deepEqual(Object.keys((await value()).limits), ['rps', 'burst', 'key']);
    assert.ok(await pt('#pt-json', 'redo'));
    assert.deepEqual(Object.keys((await value()).limits), ['rps', 'burst', 'timeout']);
  });

  await check('the keyboard: arrows walk the rows, Right / Left open and close a container, Enter folds it', async () => {
    await pt('#pt-json', 'collapseAll');
    await page.$eval('#pt-json .property-tree-viewport', (v: HTMLElement) => v.focus());
    await page.keyboard.press('Home');
    const active = () => page.$eval('#pt-json', (t) => t.querySelector('.property-tree-row[data-active] .property-tree-key')?.textContent);
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowDown');
    assert.equal(await active(), 'maintainers');
    await page.keyboard.press('ArrowRight');
    assert.ok((await rows('#pt-json')).includes('team="Payments"'), 'Right opens');
    await page.keyboard.press('ArrowRight');
    assert.equal(await active(), 'team', 'Right again steps into it');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await active(), 'maintainers', 'Left goes to the parent');
    await page.keyboard.press('Enter');
    assert.ok(!(await rows('#pt-json')).includes('team="Payments"'), 'Enter folds it');
    assert.equal(await page.$eval('#pt-json .property-tree-viewport', (v) => v.getAttribute('aria-activedescendant') === v.querySelector('[data-active]')?.id), true);
  });

  await check('DSON: the pinned defuss-dson reads a Map, a Set, a Date, a BigInt, a RegExp; a cycle and a shared node are links to their first path', async () => {
    assert.ok(vendor.some((u) => u.includes('defuss-dson@1.1.2')), 'loaded from the pinned URL');
    await pt('#pt-dson', 'expandAll', 3);
    const all = await rows('#pt-dson');
    for (const want of ['name="Ada"', 'joined=2024-03-01T09:00:00.000Z', 'lead=ref /user', 'roles=Set(2)', '"theme"="dark"', 'quota=9007199254740993n', 'pattern=/^ord-\\d+$/i', 'team=ref /team'])
      assert.ok(all.includes(want), `${want} in ${all.join(' | ')}`);
    // one node: an edit under /team shows under /user/team
    assert.ok(await pt('#pt-dson', 'set', '/team/name', 'Core'));
    assert.equal(await pt('#pt-dson', 'get', '/user/team/name'), 'Core');
    // a ref link goes to the first (shallowest) appearance
    await page.click('#pt-dson .property-tree-ref:text-is("ref /team")');
    assert.equal(await page.$eval('#pt-dson', (t: any) => t.store.value.config.selected), '/team');
    // a Date edits as date and time, a BigInt as digits
    await pt('#pt-dson', 'edit', '/user/joined');
    assert.equal((await editor('#pt-dson'))?.type, 'datetime-local');
    await page.keyboard.press('Escape');
    await pt('#pt-dson', 'edit', '/quota');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('12x');
    await page.keyboard.press('Enter');
    assert.equal((await editor('#pt-dson'))?.error, 'A whole number');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('123456789012345678901');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => String((globalThis as any).df$.shadcn.propertyTree.get('#pt-dson', '/quota'))), '123456789012345678901');
    // a Map key renames, a Set entry edits
    assert.ok(await pt('#pt-dson', 'rename', '/prefs/0', 'colorScheme'));
    assert.ok(await pt('#pt-dson', 'set', '/roles/1', 'viewer'));
    const back = await page.evaluate(async () => {
      const text = await (globalThis as any).df$.shadcn.propertyTree.dson('#pt-dson');
      const v = (globalThis as any).df$.shadcn.propertyTree.value('#pt-dson');
      return { text: typeof text, map: [...v.prefs.keys()], set: [...v.roles], cycle: v.team.lead === v.user, quota: typeof v.quota };
    });
    assert.deepEqual(back, { text: 'string', map: ['colorScheme', 'density'], set: ['admin', 'viewer'], cycle: true, quota: 'bigint' });
  });

  await check('json(): a node seen before is { "$ref": pointer }, a Map an object, a typed array numbers, a Date its ISO string', async () => {
    const json = JSON.parse(await pt('#pt-graph', 'json'));
    // the shallowest appearance owns a node: /services/1 is billing, checkout's dependsOn names it
    assert.deepEqual(json.services[0].dependsOn[0], { $ref: '/services/1' });
    assert.deepEqual(json.services[1].dependsOn[0], { $ref: '/services/0' });
    // a node inside itself: the meta record points at the root - a cycle link
    assert.deepEqual(json.meta.root, { $ref: '#' });
    await pt('#pt-graph', 'expandAll', 2);
    assert.ok((await rows('#pt-graph')).includes('root=cycle /'), (await rows('#pt-graph')).join(' | '));
    assert.deepEqual(json.ports, { checkout: 8080, 42: 'answer' });
    assert.deepEqual(json.checksum, [1, 2, 3]);
    assert.equal(json.updated, '2026-11-20T08:30:00.000Z');
    assert.equal(await page.$eval('#pt-graph .property-tree-row', (r) => r.querySelector('.property-tree-key')!.textContent), 'services', 'data-root-label');
  });

  await check('100,000 nodes: everything open, the DOM keeps a window of rows; the last row scrolls into view', async () => {
    await page.$eval('#pt-big', (t) => t.scrollIntoView());
    const t0 = await page.evaluate(() => performance.now());
    await pt('#pt-big', 'expandAll');
    const t1 = await page.evaluate(() => performance.now());
    const r = await page.$eval('#pt-big', (t: any) => ({ rows: t._rows.length, dom: t.querySelectorAll('.property-tree-row').length }));
    assert.ok(r.rows > 100_000, `rows ${r.rows}`);
    assert.ok(r.dom < 60, `DOM rows ${r.dom}`);
    assert.ok(t1 - t0 < 3000, `expandAll took ${Math.round(t1 - t0)} ms`);
    await page.$eval('#pt-big .property-tree-viewport', (v: HTMLElement) => v.focus());
    await page.keyboard.press('End');
    assert.equal(await page.$eval('#pt-big', (t) => t.querySelector('.property-tree-row[data-active] .property-tree-key')?.textContent), 'audited');
    await pt('#pt-big', 'set', '/products/999/stock/15/audited', false);
    assert.equal(await page.$eval('#pt-big', (t) => t.querySelector('.property-tree-row[data-active] .property-tree-value')?.textContent), 'false');
  });

  await check('hooks: getEditorFn gives a custom editor or false; validateFn refuses a value and a key; renderValue draws a value', async () => {
    await pt('#pt-hooks', 'expandAll');
    assert.ok(await page.$('#pt-hooks .status-badge'), 'renderValue');
    assert.equal(await pt('#pt-hooks', 'edit', '/tasks/0/id'), false, 'getEditorFn false');
    assert.ok(await pt('#pt-hooks', 'edit', '/tasks/0/status'));
    assert.equal((await editor('#pt-hooks'))?.cls, 'select status-editor');
    await page.selectOption('#pt-hooks .property-tree-editor select', 'done');
    assert.equal(await pt('#pt-hooks', 'get', '/tasks/0/status'), 'done', 'an element editor that is a select commits on change');
    await pt('#pt-hooks', 'edit', '/port');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('80');
    await page.keyboard.press('Enter');
    assert.equal((await editor('#pt-hooks'))?.error, 'A port from 1024 to 65535');
    await page.keyboard.press('Escape');
    await pt('#pt-hooks', 'edit', '/project', true);
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('the name');
    await page.keyboard.press('Enter');
    assert.equal((await editor('#pt-hooks'))?.error, 'A key without spaces');
    await page.keyboard.press('Escape');
    // a cancelled change keeps the value
    await page.$eval('#pt-hooks', (t) => t.addEventListener('property-tree-beforechange', (e) => e.preventDefault(), { once: true }));
    assert.equal(await pt('#pt-hooks', 'set', '/port', 9000), false);
    assert.equal(await pt('#pt-hooks', 'get', '/port'), 8443);
  });

  await check('read-only: nothing edits, no actions; data-hide-root starts at the children; comfortable rows are taller', async () => {
    assert.deepEqual(await rows('#pt-ro'), ['status=200', 'body={1 key}']);
    assert.equal(await pt('#pt-ro', 'edit', '/status'), false);
    assert.equal(await pt('#pt-ro', 'set', '/status', 500), false);
    assert.equal(await page.$eval('#pt-ro .property-tree-actions', (b) => getComputedStyle(b).display), 'none');
    assert.equal(await page.$eval('#pt-ro .property-tree-viewport', (v) => v.getAttribute('aria-readonly')), 'true');
    const h = await page.$eval('#pt-comf .property-tree-row', (r) => r.getBoundingClientRect().height);
    assert.equal(h, 34);
    await pt('#pt-comf', 'edit', '/notes');
    assert.equal((await editor('#pt-comf'))?.tag, 'TEXTAREA', 'a multi-line string edits in a Textarea');
    await page.keyboard.press('Escape');
  });

  await check('states: setState("editing", { editing }) opens that editor, "default" closes it; data-editing mirrors it', async () => {
    await page.$eval('#pt-json', (t: any) => t.api.setState('editing', { editing: '/service' }));
    assert.equal(await page.$eval('#pt-json', (t) => t.getAttribute('data-editing')), '/service');
    assert.equal((await editor('#pt-json'))?.type, 'text');
    await page.$eval('#pt-json', (t: any) => t.api.setState('default', { editing: null }));
    assert.equal(await editor('#pt-json'), null);
    assert.equal(await page.$eval('#pt-json', (t) => t.hasAttribute('data-editing')), false);
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await ready();
    await assertRenderContract(page, '#pt-json', ['default', 'editing'], {
      runtimeOwned: '.property-tree-viewport, .property-tree-menu',
    });
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\nproperty-tree.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('property-tree.e2e: all checks passed');
