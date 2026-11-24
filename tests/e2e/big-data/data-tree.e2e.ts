import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

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
    await page.goto(`${server.url}/tests/e2e/big-data/data-tree.e2e-fixture.html`);
    await page.waitForFunction(() => (globalThis as Record<string, unknown>).__fixtureReady === true, null, { timeout: 15_000 });
  };
  await page.goto(`${server.url}/tests/e2e/big-data/data-tree.e2e-fixture.html`);
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

  await check('data-exclusive: opening a branch closes the open branches off its way', async () => {
    // Region 2 (id 11012) open, then Region 1 opens: Region 2 closes
    await page.$eval('#dt-way', (t: any) => t.api.setState('default', { expanded: [11012] }));
    await page.click('#dt-way .data-tree-item:nth-child(1) .data-tree-toggle');
    assert.deepEqual((await config('#dt-way')).expanded, [1]);
    // Country 1.1 (id 2) opens below it: the way is Region 1, Country 1.1
    await page.click('#dt-way .data-tree-item:nth-child(2) .data-tree-toggle');
    assert.deepEqual((await config('#dt-way')).expanded, [1, 2]);
  });

  await check('reveal(): only the way to a deep record opens, it is selected, active and on screen; no data-tree-select', async () => {
    const r = await page.$eval('#dt-way', (t: any) => {
      let fired = 0;
      t.addEventListener('data-tree-select', () => fired++);
      // District 7.4.61.3: a region holds 11,011 records, a country 1,101, a city 11
      const region = 1 + 6 * 11011;
      const country = region + 1 + 3 * 1101;
      const city = country + 60 * 11 + 1;
      const district = city + 3;
      const dt = (globalThis as any).df$.shadcn.dataTree;
      const ok = dt.reveal(t, district);
      const active = t.querySelector('.data-tree-item[data-active]');
      const box = active?.getBoundingClientRect();
      const tb = t.getBoundingClientRect();
      return {
        ok,
        expanded: t.store.value.config.expanded,
        selected: t.store.value.config.selected === district,
        active: active?.textContent,
        selectedItem: t.querySelector('[aria-selected="true"]')?.textContent,
        inView: !!box && box.top >= tb.top - 1 && box.bottom <= tb.bottom + 1,
        fired,
        unknown: dt.reveal(t, "nope"),
        want: [region, country, city],
      };
    });
    assert.equal(r.ok, true);
    assert.deepEqual(r.expanded, r.want);
    assert.equal(r.selected, true);
    assert.equal(r.active, 'District 7.4.61.3');
    assert.equal(r.selectedItem, 'District 7.4.61.3');
    assert.equal(r.inView, true);
    assert.equal(r.fired, 0);
    assert.equal(r.unknown, false);
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
    const key = 'defuss-shadcn:/tests/e2e/big-data/data-tree.e2e-fixture.html:data-tree:dt-big';
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

  // -- inline editing ---------------------------------------------------------
  const labels = () => page.$$eval('#dt-edit .data-tree-item', (items) => items.map((i) => i.querySelector('.data-tree-label')!.textContent));
  const treeEditor = () => page.$eval('#dt-edit', (t) => {
    const ed = t.querySelector('.data-tree-editor');
    const c = ed?.querySelector('input') as HTMLInputElement | null;
    return ed ? { cls: c?.className, focused: ed.contains(document.activeElement), error: ed.querySelector('.data-tree-error')?.textContent ?? '' } : null;
  });
  const dblItem = (name: string) =>
    page.$eval('#dt-edit', (t, name) => {
      const item = [...t.querySelectorAll('.data-tree-item')].find((i) => i.querySelector('.data-tree-label')!.textContent === name)!;
      item.querySelector('.data-tree-label')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }, name);

  await check('editing: a double click opens the built-in Input on an item (data-editable); Enter writes it and the siblings sort again', async () => {
    await page.$eval('#dt-edit', (t) => t.scrollIntoView());
    assert.deepEqual(await labels(), ['Alpha', 'One', 'Two', 'Beta', 'Gamma']);
    await dblItem('Alpha');
    assert.deepEqual(await treeEditor(), { cls: 'input', focused: true, error: '' });
    // the tree's own keys stay out of the editor: Space types, arrows move the caret
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Zeta one');
    await page.keyboard.press('Enter');
    assert.equal(await treeEditor(), null);
    assert.deepEqual(await labels(), ['Beta', 'Gamma', 'Zeta one', 'One', 'Two'], 'renamed and sorted among its siblings');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'dt-edit', 'the tree has the focus again');
  });

  await check('editing: F2 opens the active item; Escape keeps the name; the rules and validateFn refuse a value; false keeps an item from editing', async () => {
    await page.$eval('#dt-edit', (t: any) => (globalThis as any).df$.shadcn.dataTree.edit(t, 'a/1'));
    await page.keyboard.press('Escape');
    await page.keyboard.press('F2');
    assert.ok((await treeEditor())?.focused, 'F2 on the active item');
    for (const [text, error] of [['', 'Required'], ['A much longer name', 'At most 12 characters'], ['Taken', 'That name is taken']] as const) {
      await page.keyboard.press('ControlOrMeta+a');
      if (text) await page.keyboard.type(text);
      else await page.keyboard.press('Backspace');
      await page.keyboard.press('Enter');
      assert.equal((await treeEditor())?.error, error, text);
    }
    await page.keyboard.press('Escape');
    assert.ok((await labels()).includes('One'), 'Escape kept the name');
    assert.equal(await page.$eval('#dt-edit', (t: any) => (globalThis as any).df$.shadcn.dataTree.edit(t, 'c')), false, 'getEditorFn false');
  });

  await check('editing: a custom editor (getEditorFn) writes its value and patch() in one edit; data-tree-edit carries the new record', async () => {
    const detail = await page.$eval('#dt-edit', async (t: any) => {
      const got = new Promise<any>((r) => t.addEventListener('data-tree-edit', (e: any) => r({ field: e.detail.field, value: e.detail.value, record: e.detail.record }), { once: true }));
      (globalThis as any).df$.shadcn.dataTree.edit(t, 'b');
      const input = t.querySelector('.data-tree-editor input');
      input.value = 'Bravo';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return got;
    });
    assert.deepEqual(detail, { field: 'name', value: 'Bravo', record: { id: 'b', parentId: null, name: 'Bravo', tone: 'y' } });
    const rec = await page.$eval('#dt-edit', (t: any) => (globalThis as any).df$.shadcn.dataTree.update(t, 'c', { name: 'Delta' }));
    assert.equal(rec.name, 'Delta');
    assert.deepEqual((await labels()).slice(0, 2), ['Bravo', 'Delta']);
  });

  await check('drag and drop: an item moves with its subtree into another item, before one; never into its own subtree; a tree that takes copies (data-drop="copy") gets copies with new ids; a move between trees empties the source; text/plain is the outline', async () => {
    await page.$eval('#dt-left', (t) => t.scrollIntoView({ block: 'start' }));
    await page.evaluate(() => {
      const g = globalThis as any;
      g.__texts = [];
      g.__drops = [];
      g.__ends = [];
      document.addEventListener('dragstart', (e: any) => g.__texts.push(e.dataTransfer.getData('text/plain')));
      document.querySelector('#dt-right')!.addEventListener('data-tree-drop', (e: any) => g.__drops.push([e.detail.effect, e.detail.at, e.detail.records.map((r: any) => r.id)]));
      document.querySelector('#dt-left')!.addEventListener('data-tree-dragend', (e: any) => g.__ends.push([e.detail.effect, e.detail.target.id]));
    });
    const item = (sel: string, i: number) => page.locator(`${sel} .data-tree-items > .data-tree-item[data-index="${i}"]`);
    const drag = async (from: any, to: { x: number; y: number }) => {
      const b = await from.boundingBox();
      await page.mouse.move(b.x + 40, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + 50, b.y + b.height / 2 + 6, { steps: 3 });
      await page.mouse.move(to.x, to.y, { steps: 6 });
      await page.mouse.move(to.x, to.y + 1);
      await page.mouse.up();
      await page.waitForTimeout(50);
    };
    const at = async (loc: any, f = 0.5) => {
      const b = await loc.boundingBox();
      return { x: b.x + 60, y: b.y + b.height * f };
    };
    const rows = (sel: string) => page.$eval(sel, (t: any) => (globalThis as any).df$.shadcn.dataTree.source(t).rows.map((r: any) => `${r.id}<${r.parentId ?? ''}`));
    const labels = (sel: string) => page.$$eval(`${sel} .data-tree-item`, (is) => is.map((i) => i.textContent));
    // Rock(0) Riff(1) Ballad(2) Jazz(3) Swing(4): Swing into Rock
    await drag(item('#dt-left', 4), await at(item('#dt-left', 0)));
    assert.deepEqual(await labels('#dt-left'), ['Rock', 'Riff', 'Ballad', 'Swing', 'Jazz']);
    assert.equal(await page.$eval('#dt-left', (t: any) => t.store.value.config.selected), 'j1', 'the dropped item is selected');
    // Ballad before Riff
    await drag(item('#dt-left', 2), await at(item('#dt-left', 1), 0.1));
    assert.deepEqual(await labels('#dt-left'), ['Rock', 'Ballad', 'Riff', 'Swing', 'Jazz']);
    // Rock into Riff (under it): nothing moves
    await drag(item('#dt-left', 0), await at(item('#dt-left', 2)));
    assert.deepEqual(await rows('#dt-left'), ['rock<', 'r2<rock', 'r1<rock', 'jazz<', 'j1<rock']);
    // Rock into Mix: the Playlist takes copies - new ids, linked to each other; the Library keeps Rock
    await drag(item('#dt-left', 0), await at(item('#dt-right', 0)));
    assert.deepEqual(await rows('#dt-right'), ['mix<', 'rock-2<mix', 'r2-2<rock-2', 'r1-2<rock-2', 'j1-2<rock-2']);
    assert.equal((await rows('#dt-left')).length, 5);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__drops[0]), ['copy', { id: 'mix', place: 'into' }, ['rock-2', 'r2-2', 'r1-2', 'j1-2']]);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__ends.at(-1)), ['copy', 'dt-right']);
    assert.equal(await page.evaluate(() => (globalThis as any).__texts.at(-1)), 'Rock\n\tBallad\n\tRiff\n\tSwing');
    assert.deepEqual(await page.$eval('#dt-right', (t: any) => [t.store.value.config.selected, t.store.value.config.expanded]), ['rock-2', ['mix']]);
    // Mix back to the Library's end: a move - the Playlist is left empty
    const end = await page.$eval('#dt-left', (t) => { const r = t.getBoundingClientRect(); return { x: r.left + 80, y: r.bottom - 8 }; });
    await page.$eval('#dt-left', (t: any) => (globalThis as any).df$.shadcn.dataTree.collapseAll(t));
    await drag(item('#dt-right', 0), end);
    assert.deepEqual(await rows('#dt-right'), []);
    assert.equal(await state('#dt-right'), 'empty');
    assert.deepEqual((await rows('#dt-left')).slice(5), ['mix<', 'rock-2<mix', 'r2-2<rock-2', 'r1-2<rock-2', 'j1-2<rock-2']);
    assert.equal(await page.$$eval('.data-tree-drop', (m) => m.length), 0, 'no drop mark left');
  });

  await check('insert() / remove(): what a drop writes, from script', async () => {
    const out = await page.$eval('#dt-left', (t: any) => {
      const api = (globalThis as any).df$.shadcn.dataTree;
      const gone = api.remove(t, ['mix']).length;
      const added = api.insert(t, [{ id: 'rock', name: 'Rock again' }], { id: 'jazz', place: 'into' });
      return { gone, added: added.map((r: any) => [r.id, r.parentId]), refused: api.insert(t, [{ id: 'x' }], { id: 'nope', place: 'after' }) };
    });
    assert.deepEqual(out, { gone: 5, added: [['rock-2', 'jazz']], refused: null });
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
