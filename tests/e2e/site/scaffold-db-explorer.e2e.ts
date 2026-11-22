import { chromium, type Frame, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { chooseLanguage, renderedLanguage, translationGaps } from '../lib/translation.ts';

/**
 * Why: the Database Explorer scaffold (MongoDB Compass / Robo 3T style) promises a working database tool on
 * defuss-db 3.0.0. This drives the generated full-screen page (application/app-db-explorer.html) on the real Origin
 * Private File System of a Chromium profile - the sample databases written once, Mongo-style queries answered (and
 * the documents shown checked against the filter), the plan changing with an index, documents edited in the List and
 * the Table view and read back after a reload, insert / duplicate / delete, aggregations, the sampled schema, a
 * database created, exported, imported and dropped, the query history, the operation log and German - and the docs
 * card, which runs the same database in memory.
 */
const PAGE = '/dist/documentation/application/app-db-explorer.html';
const DOCS = '/dist/documentation/application/scaffold-db-explorer.html';
const server = startServer();
const browser = await chromium.launch();
let failures = 0;
async function check(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}

const ready = (p: Page | Frame) => p.waitForSelector('[data-dx-ready]', { timeout: 60_000 });
const text = (p: Page | Frame, sel: string) => p.$eval(sel, (e) => (e.textContent || '').trim());
const count = (p: Page | Frame) => text(p, '[data-dx-count]');
const plan = (p: Page | Frame) => text(p, '[data-dx-plan]');
/** the documents the List view shows, as their Property Trees hold them (every card opened: it makes its tree) */
const shown = async (p: Page | Frame) => {
  await mount(p, await p.$$eval('.dx-doc', (d) => d.length));
  return p.evaluate(() =>
    [...document.querySelectorAll('.dx-doc .property-tree')].map((el) =>
      (globalThis as any).df$.shadcn.propertyTree.value(el),
    ),
  );
};
/** opens the List view's cards (a card makes its tree when it first opens) and waits for n trees with documents */
const mount = async (p: Page | Frame, n: number, sel = '.dx-doc') => {
  await p.waitForFunction(([s, k]) => document.querySelectorAll(s).length >= k, [sel, n] as const);
  await p.$$eval(sel, (d) => d.forEach((c) => ((c as HTMLDetailsElement).open = true)));
  await p.waitForFunction(
    ([s, k]) =>
      [...document.querySelectorAll(`${s} .property-tree`)].filter(
        (el) => (el as any).store && (globalThis as any).df$.shadcn.propertyTree.value(el)?.id !== undefined,
      ).length === k,
    [sel, n] as const,
  );
};
const open = async (p: Page, hash: string) => {
  await p.evaluate((h) => (location.hash = h), hash);
  await p.waitForFunction((h) => location.hash === h, hash);
};
/** run a query from the bar and wait for its results (or its error) - the count alone also follows the scroll */
const query = async (p: Page, filter: string, sort = '', project = '') => {
  await p.$$eval('[data-dx-results] > *', (r) => r.forEach((x) => ((x as HTMLElement).dataset.stale = '')));
  await p.fill('#dx-filter', filter);
  await p.fill('#dx-sort', sort);
  await p.fill('#dx-project', project);
  await p.click('[data-dx-query] button[type="submit"]');
  await p
    .waitForFunction(
      () =>
        !document.querySelector('[data-dx-results] > [data-stale]') ||
        !!document.querySelector('[data-dx-error]:not([hidden])'),
      null,
      { timeout: 15_000 },
    )
    .catch(() => null);
  await p.waitForTimeout(150);
};
const treeLabels = (p: Page) =>
  p.$$eval('#dx-tree [role="treeitem"] .dx-node', (rows) =>
    rows.map((r) => `${r.children[1]!.textContent} ${r.children[2]!.textContent}`),
  );

try {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await offlineJsdelivr(page);
  await page.goto(`${server.url}${PAGE}`);
  await ready(page);

  await check('opens on the Origin Private File System and writes the sample databases once', async () => {
    assert.equal(await page.getAttribute('[data-dx]', 'data-dx-store'), 'opfs');
    assert.match(await text(page, '[data-dx-mode]'), /OPFS/);
    const labels = await treeLabels(page);
    for (const l of [
      'shop 3',
      'customers 800',
      'orders 12,000',
      'products 240',
      'analytics 1',
      'events 30,000',
      'cms 1',
      'articles 120',
    ])
      assert.ok(labels.includes(l), `the tree lists ${l}: ${labels.join(' | ')}`);
    assert.deepEqual(
      await page.$$eval('[data-dx-home-cards] [data-dx-db]', (c) => c.map((x) => (x as HTMLElement).dataset.dxDb)),
      ['admin', 'analytics', 'cms', 'shop'],
    );
  });

  await check(
    'a collection from the tree: its route, 20 documents as Property Trees, the total and the plan',
    async () => {
      // the header: the name, the store and the size in a unit that keeps it below 1,000
      assert.equal(await text(page, '.dx-brand'), 'Database Explorer');
      await page.click('#dx-tree [role="treeitem"]:has-text("orders")');
      await page.waitForFunction(() => location.hash === '#/shop/orders');
      await page.waitForFunction(() => document.querySelectorAll('.dx-doc').length === 20);
      assert.match(await count(page), /^1-\d+ of 12,000 · /);
      // a card makes its tree when it first opens (20 trees with every page cost 400-590 ms)
      assert.equal(await page.$$eval('.dx-doc .property-tree', (t) => t.length), 0);
      assert.equal(await plan(page), 'full scan');
      await page.waitForSelector('[data-dx-revision]:not([hidden])');
      assert.match(await text(page, '[data-dx-revision]'), /^rev \d+ · [\d.,]+ (B|KiB|MiB|GiB|TiB)$/);
      assert.equal(await text(page, '[data-dx-crumbs]'), 'Databases›shop›orders');
      // every document starts as one row: its id and a preview of its fields; a click on the row opens it
      assert.equal(await page.$$eval('.dx-doc[open]', (d) => d.length), 0);
      assert.match(await text(page, '.dx-doc .dx-doc-preview'), /^\w+: /);
      const row = await page.$eval('.dx-doc', (d) => d.getBoundingClientRect().height);
      assert.ok(row < 48, `a folded document is one row (${row}px)`);
      await page.click('.dx-doc >> nth=0 >> .dx-doc-preview');
      await page.waitForFunction(() => document.querySelector('.dx-doc')!.hasAttribute('open'));
      await page.waitForFunction(
        () => document.querySelectorAll('.dx-doc[open] .property-tree [role="treeitem"]').length > 3,
      );
      const docs = await shown(page);
      assert.equal(typeof docs[0].id, 'number');
      assert.ok(docs[0].createdAt instanceof Date, 'a Date stays a Date through the worker');
      // the row's buttons act without folding it
      await page.click('.dx-doc >> nth=0 >> [data-dx-doc-act="copy"]');
      assert.equal(await page.$eval('.dx-doc', (d) => d.hasAttribute('open')), true);
      await page.click('.dx-doc >> nth=0 >> .dx-doc-preview');
      await page.waitForFunction(() => !document.querySelector('.dx-doc')!.hasAttribute('open'));
    },
  );

  await check(
    'a Mongo-style filter, sort and projection: every document shown matches, the index answers, pages move',
    async () => {
      await query(page, "{ status: 'shipped', amount: { $gt: 500 } }", '{ amount: -1 }');
      const m = /^1-\d+ of ([\d,]+) · /.exec(await count(page));
      assert.ok(m, await count(page));
      const total = Number(m[1]!.replace(/,/g, ''));
      assert.ok(total > 20 && total < 12000);
      assert.equal(await plan(page), 'equality · byStatus');
      const docs = await shown(page);
      assert.ok(docs.every((d) => d.status === 'shipped' && d.amount > 500));
      assert.deepEqual(
        docs.map((d) => d.amount),
        docs.map((d) => d.amount).sort((a, b) => b - a),
      );
      await page.click('[data-dx-page="1"]');
      await page.waitForFunction(() =>
        /^21-\d+ of /.test(document.querySelector('[data-dx-count]')!.textContent || ''),
      );
      assert.ok((await shown(page)).every((d) => d.status === 'shipped' && d.amount <= docs.at(-1).amount));
      await query(
        page,
        "{ $or: [{ country: 'CH' }, { 'shipping.method': 'pickup' }] }",
        '',
        '{ country: 1, shipping: 1 }',
      );
      const picked = await shown(page);
      assert.ok(picked.length > 0 && picked.every((d) => d.country === 'CH' || d.shipping.method === 'pickup'));
      assert.deepEqual(Object.keys(picked[0]).sort(), ['country', 'id', 'shipping']);
    },
  );

  await check('a filter that does not parse says why in a destructive Alert', async () => {
    await query(page, '{ amount: { $gt: ');
    assert.equal(await page.$eval('[data-dx-error]', (e) => (e as HTMLElement).hidden), false);
    assert.match(await text(page, '[data-dx-error-text]'), /^filter: /);
    await query(page, "{ name: { $regex: 'a.b' } }");
    assert.match(await text(page, '[data-dx-error-text]'), /\$regex takes/);
    await page.click('[data-dx-reset]');
    await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-dx-error]')!.hidden);
  });

  await check(
    'a document edited in its Property Tree: modified, Save writes it, a reload reads it back; Revert undoes',
    async () => {
      await open(page, '#/shop/customers');
      // the customers' first page - not the cards of the collection before
      await page.waitForFunction(() =>
        /^1-\d+ of 800 · /.test(document.querySelector('[data-dx-count]')?.textContent || ''),
      );
      await mount(page, 20);
      const id = (await shown(page))[0].id;
      assert.match(id, /^cus-/);
      await page.evaluate(() =>
        (globalThis as any).df$.shadcn.propertyTree.set(
          document.querySelector('.dx-doc .property-tree'),
          '/name',
          'Ada Edited',
        ),
      );
      assert.equal(await page.$eval('.dx-doc', (c) => c.hasAttribute('data-dirty')), true);
      await page.click('.dx-doc >> nth=0 >> [data-dx-doc-act="save"]');
      await page.waitForFunction(() => !document.querySelector('.dx-doc')!.hasAttribute('data-dirty'));
      // Revert: a second card's change goes away
      await page.evaluate(() =>
        (globalThis as any).df$.shadcn.propertyTree.set(
          document.querySelectorAll('.dx-doc .property-tree')[1],
          '/tier',
          'platinum',
        ),
      );
      await page.click('.dx-doc >> nth=1 >> [data-dx-doc-act="revert"]');
      assert.notEqual((await shown(page))[1].tier, 'platinum');
      await page.reload();
      await ready(page);
      await mount(page, 20);
      const after = await shown(page);
      assert.equal(after[0].id, id);
      assert.equal(after[0].name, 'Ada Edited');
      assert.notEqual(after[1].tier, 'platinum');
      // the id names the document: it does not edit
      assert.equal(
        await page.evaluate(() =>
          (globalThis as any).df$.shadcn.propertyTree.edit(document.querySelector('.dx-doc .property-tree'), '/id'),
        ),
        false,
      );
    },
  );

  await check(
    'the Table view: a Data Grid of the page; a cell edited in place is written to the database',
    async () => {
      await page.click('[data-dx-views] button[value="table"]');
      await page.waitForSelector('#dx-grid[data-init] .data-grid-body [role="row"]');
      // the grid holds every match and windows it (the maintainer 2026-11-22: a grid of one page jumped back up and
      // sorted that page only) - no pager, the foot names the rows in view, a sort orders all of them
      const rows = () => page.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.rows('#dx-grid'));
      assert.equal((await rows()).length, 800);
      assert.equal(await page.isVisible('[data-dx-pager]'), false);
      await page.waitForFunction(() => /^1-\d+ of 800 · /.test(document.querySelector('[data-dx-count]')?.textContent || ''));
      await page.click('#dx-grid .data-grid-header[data-field="email"]');
      await page.waitForTimeout(200);
      const emails = (await rows()).map((r: { email: string }) => r.email);
      assert.equal(emails.length, 800);
      assert.deepEqual(emails, [...emails].sort((a, b) => a.localeCompare(b)), 'sorted over all 800');
      await page.$eval('#dx-grid .data-grid-viewport', (v) => (v.scrollTop = v.scrollHeight));
      await page.waitForFunction(() =>
        /^\d+-800 of 800 · /.test(document.querySelector('[data-dx-count]')?.textContent || ''),
      );
      assert.equal(
        await page.$eval('#dx-grid .data-grid-viewport', (v) => v.scrollTop > 0),
        true,
        'scrolled to the end, it stays there',
      );
      await page.click('[data-dx-reset]');
      await page.waitForSelector('#dx-grid[data-init] .data-grid-body [role="row"]');
      const first = await page.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.rows('#dx-grid')[0]);
      assert.equal(
        await page.evaluate((id) => (globalThis as any).df$.shadcn.dataGrid.edit('#dx-grid', id, 'tier'), first.id),
        true,
      );
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.type('diamond');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      await query(page, "{ tier: 'diamond' }");
      assert.match(await count(page), /^1-1 of 1 · /);
      assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.rows('#dx-grid')[0].id), first.id);
      // nested values show as a summary and do not edit
      assert.equal(
        await page.$eval('#dx-grid .data-grid-header[data-field="address"]', (h) => h.hasAttribute('data-editable')),
        false,
      );
      await page.click('[data-dx-views] button[value="json"]');
      assert.match(await text(page, '[data-dx-json]'), /"since": \{\s*"\$date": "\d{4}-/);
      assert.ok(await page.$('[data-dx-json] .dx-t-key'), 'keys are coloured');
      assert.ok(await page.$('[data-dx-json] .dx-t-str'), 'strings are coloured');
      assert.ok(await page.$('.dx-json-bar [data-dx-copy-json] svg'), 'the copy button has its icon');
      // every match as lines of a Virtual List: its own scrollbar, the foot follows the documents in view
      await page.click('[data-dx-reset]');
      await page.waitForFunction(() => /800 documents/.test(document.querySelector('.dx-json-bar')?.textContent || ''));
      await page.waitForFunction(() => document.querySelectorAll('#dx-json-lines .virtual-list-row').length > 10);
      await page.$eval('#dx-json-lines', (v) => (v.scrollTop = v.scrollHeight));
      await page.waitForFunction(() =>
        /^\d+-800 of 800 · /.test(document.querySelector('[data-dx-count]')?.textContent || ''),
      );
      await page.$eval('#dx-json-lines', (v) => (v.scrollTop = v.scrollHeight / 2));
      await page.waitForFunction(() =>
        /^(3\d\d|4\d\d)-\d+ of 800 · /.test(document.querySelector('[data-dx-count]')?.textContent || ''),
      );
      await page.click('[data-dx-views] button[value="list"]');
      await page.click('[data-dx-reset]');
    },
  );

  await check('insert (relaxed JSON, ISODate), duplicate and delete - the counts follow', async () => {
    // the toolbar creates nothing; a database's + in the tree asks for a collection in it, a collection's Add for a document
    assert.equal(
      await page.$$eval('.dx-bar [data-dx-action="new-coll"], .dx-bar [data-dx-action="insert"]', (b) => b.length),
      0,
    );
    await page.click('#dx-tree [data-dx-tree-act="new-coll"][data-db="cms"]');
    await page.waitForSelector('#dx-coll-dialog[open]');
    assert.equal(await page.$eval('#dx-coll-db', (s) => (s as HTMLSelectElement).value), 'cms');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !(document.querySelector('#dx-coll-dialog') as HTMLDialogElement).open);
    assert.equal(await page.evaluate(() => location.hash), '#/shop/customers', 'a row button does not navigate');
    // from the keyboard: + on the focused row
    await page.click('#dx-tree [role="treeitem"]:has-text("customers")');
    await page.keyboard.press('+');
    await page.waitForSelector('#dx-insert-dialog[open]');
    assert.match(await text(page, '[data-dx-insert-target]'), /shop\.customers/);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !(document.querySelector('#dx-insert-dialog') as HTMLDialogElement).open);
    // Delete is the destructive button with its icon
    assert.equal(await page.$eval('[data-dx-doc-act="delete"]', (b) => b.getAttribute('data-variant')), 'destructive');
    assert.ok(await page.$('[data-dx-doc-act="delete"] svg'));
    await page.click('#dx-tree [data-dx-tree-act="insert"][data-db="shop"][data-coll="customers"]');
    await page.fill('#dx-insert-dialog textarea', "{ name: 'Broken");
    await page.click('#dx-insert-dialog button[type="submit"]');
    assert.equal(
      await page.$eval('#dx-insert-dialog', (d) => (d as HTMLDialogElement).open),
      true,
      'a parse error keeps it open',
    );
    assert.match(await text(page, '[data-dx-insert-error-text]'), /not closed/);
    // the Tree mode takes only a text that reads: the JSON stays, with the reason
    await page.click('#dx-ins-t-tree');
    assert.equal(await page.$eval('#dx-ins-t-json', (b) => b.getAttribute('aria-selected')), 'true');
    assert.match(await text(page, '[data-dx-insert-error-text]'), /not closed/);
    // from scratch: an empty text is an empty document in the tree, built there field by field
    await page.fill('#dx-insert-dialog textarea', '');
    await page.click('#dx-ins-t-tree');
    await page.waitForFunction(() => (document.querySelector('[data-dx-ins-tree]') as any)?.store);
    assert.equal(await page.$eval('#dx-ins-t-tree', (b) => b.getAttribute('aria-selected')), 'true');
    assert.equal(await page.$eval('[data-dx-insert-error]', (e) => (e as HTMLElement).hidden), true);
    assert.equal(await page.evaluate(() => JSON.stringify((globalThis as any).df$.shadcn.propertyTree.value('[data-dx-ins-tree]'))), '{}');
    await page.evaluate(() => {
      const t = '[data-dx-ins-tree]';
      const S = (globalThis as any).df$.shadcn.propertyTree;
      S.add(t, '', 'id', 'cus-new');
      S.add(t, '', 'name', 'Grace New');
      S.add(t, '', 'email', 'grace.new@example.com');
      S.add(t, '', 'since', new Date('2026-01-02T00:00:00Z'));
      S.add(t, '', 'tier', 'gold');
    });
    await page.waitForSelector('[data-dx-ins-tree] [role="treeitem"]:has-text("Grace New")');
    // back to JSON: the record as text, painted like the JSON view - the paint under the field shows its text
    await page.click('#dx-ins-t-json');
    const json = await page.$eval('#dx-insert-dialog textarea', (t) => (t as HTMLTextAreaElement).value);
    assert.match(json, /cus-new/);
    assert.match(json, /"\$date": "2026-01-02/, 'Extended JSON, like the JSON view');
    const paint = await page.$eval('[data-dx-ins-paint]', (p) => ({
      text: p.textContent,
      str: p.querySelectorAll('.dx-t-str').length,
      key: p.querySelectorAll('.dx-t-key').length,
    }));
    assert.equal(paint.text, json + '\n');
    assert.ok(paint.str >= 5 && paint.key >= 6, JSON.stringify(paint));
    assert.equal(
      await page.$eval('#dx-insert-dialog textarea', (t) => getComputedStyle(t).color),
      'rgba(0, 0, 0, 0)',
      'the field is transparent over its paint',
    );
    await page.fill('#dx-insert-dialog textarea', json.replace(/\}\s*$/, ", note: 'from the tree' }"));
    assert.match(await text(page, '[data-dx-ins-paint]'), /from the tree/, 'typing paints');
    // and it inserts from the Tree mode
    await page.click('#dx-ins-t-tree');
    await page.waitForSelector('[data-dx-ins-tree] [role="treeitem"]:has-text("from the tree")');
    await page.click('#dx-insert-dialog button[type="submit"]');
    await page.waitForFunction(() => !(document.querySelector('#dx-insert-dialog') as HTMLDialogElement).open);
    await page.waitForFunction(() =>
      [...document.querySelectorAll('#dx-tree .dx-node')].some((n) => n.textContent === 'customers801'),
    );
    await query(page, "{ id: 'cus-new' }");
    const [inserted] = await shown(page);
    assert.ok(inserted.since instanceof Date && inserted.since.toISOString().startsWith('2026-01-02'));
    assert.equal(inserted.note, 'from the tree');
    // a duplicate customer repeats the email: the unique index refuses it, and the app says so
    await page.click('.dx-doc >> nth=0 >> [data-dx-doc-act="duplicate"]');
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.toast')].some((t) => /Unique index byEmail/.test(t.textContent || '')),
    );
    // products have no unique index: duplicate, then delete the copy
    await open(page, '#/shop/products');
    await page.waitForFunction(() =>
      /^1-\d+ of 240 · /.test(document.querySelector('[data-dx-count]')?.textContent || ''),
    );
    await mount(page, 20);
    const name = (await shown(page))[0].name;
    await page.click('.dx-doc >> nth=0 >> [data-dx-doc-act="duplicate"]');
    await page.waitForFunction(() =>
      [...document.querySelectorAll('#dx-tree .dx-node')].some((n) => n.textContent === 'products241'),
    );
    // the copy opens right under its original
    await page.waitForFunction(() => document.querySelectorAll('.dx-doc').length === 21);
    assert.deepEqual(
      await page.$$eval('.dx-doc', (d) => [
        d[1]!.hasAttribute('open'),
        d[1]!.querySelector('.dx-doc-id')!.textContent!.startsWith("id: 'sku-"),
      ]),
      [true, false],
    );
    assert.match(await count(page), /^1-\d+ of 241 · /);
    await query(page, `{ name: '${name}', id: { $regex: '^sku-' } }`);
    const before = (await shown(page)).length;
    await query(page, `{ name: '${name}' }`);
    const copies = await shown(page);
    assert.equal(copies.length, before + 1, 'the copy has a generated id');
    const copy = copies.findIndex((d) => !String(d.id).startsWith('sku-'));
    await page.click(`.dx-doc >> nth=${copy} >> [data-dx-doc-act="delete"]`);
    await page.waitForSelector('#dx-confirm[open]');
    await page.click('[data-dx-confirm-ok]');
    await page.waitForFunction(() =>
      [...document.querySelectorAll('#dx-tree .dx-node')].some((n) => n.textContent === 'products240'),
    );
    await page.click('[data-dx-reset]');
  });

  await check(
    'Aggregations: keys and measures row by row - text by value and case-folded, dates by month, distinct counts and values; the pipeline',
    async () => {
      await open(page, '#/shop/orders');
      await page.waitForFunction(() => /of 12,000/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
      await page.click('[data-dx-tab="agg"]');
      const key = '[data-dx-keys] .dx-agg-row >> nth=0';
      const measure = (n: number) => `[data-dx-measures] .dx-agg-row >> nth=${n}`;
      const run = async () => {
        const before = await page.$eval('[data-dx-agg-result]', (e) => e.textContent);
        await page.click('[data-dx-agg] button[type="submit"]');
        await page.waitForFunction(
          (b) =>
            document.querySelector('[data-dx-agg-result]')?.textContent !== b &&
            !!document.querySelector('[data-dx-agg-table]'),
          before,
        );
        return page.$$eval('[data-dx-agg-table] tbody tr', (r) =>
          r.map((x) => [...x.children].map((c) => c.textContent!.trim())),
        );
      };
      // a text field groups by its value; the measure list offers no sum of text
      await page.fill(`${key} >> input`, 'country');
      await page.dispatchEvent(`${key} >> input`, 'change');
      assert.equal(await page.$eval(`${measure(0)} >> select`, (s) => (s as HTMLSelectElement).value), 'count');
      let rows = await run();
      assert.equal(rows.length, 7, 'seven countries');
      const counts = rows.map((r) => Number(r[1]!.replace(/,/g, '')));
      assert.equal(
        counts.reduce((a, b) => a + b, 0),
        12000,
      );
      assert.deepEqual(
        counts,
        [...counts].sort((a, b) => b - a),
      );
      await page.fill(`${measure(0)} >> input`, 'country');
      await page.dispatchEvent(`${measure(0)} >> input`, 'change');
      assert.equal(
        await page.$eval(`${measure(0)} >> select option[value="sum"]`, (o) => (o as HTMLOptionElement).disabled),
        true,
        'no sum of a text field',
      );
      await page.fill(`${measure(0)} >> input`, '');
      await page.dispatchEvent(`${measure(0)} >> input`, 'change');
      // case-folded: every key in lower case; distinct values of another text field as badges
      await page.selectOption(`${key} >> select`, 'lower');
      await page.click('[data-dx-add-measure]');
      await page.selectOption(`${measure(1)} >> select`, 'distinct');
      await page.fill(`${measure(1)} >> input`, 'status');
      await page.dispatchEvent(`${measure(1)} >> input`, 'change');
      rows = await run();
      assert.ok(
        rows.every((r) => r[0] === r[0]!.toLowerCase()),
        rows.map((r) => r[0]).join(),
      );
      assert.ok((await page.$$('[data-dx-agg-table] tbody tr >> nth=0 >> .dx-values .badge')).length > 1);
      // a date by month, with the number of distinct customers in each
      await page.fill(`${key} >> input`, 'createdAt');
      await page.dispatchEvent(`${key} >> input`, 'change');
      await page.selectOption(`${key} >> select`, 'month');
      await page.selectOption(`${measure(1)} >> select`, 'countDistinct');
      await page.fill(`${measure(1)} >> input`, 'customer');
      await page.selectOption('#dx-agg-order', 'key');
      await page.selectOption('#dx-agg-limit', '200');
      rows = await run();
      assert.match(await page.$eval('[data-dx-agg-table] thead', (t) => t.textContent!), /createdAt · month/);
      assert.equal(
        rows.reduce((n, r) => n + Number(r[1]!.replace(/,/g, '')), 0),
        12000,
      );
      assert.ok(rows.every((r) => Number(r[2]) <= 800 && Number(r[2]) > 0));
      assert.equal(new Set(rows.map((r) => r[0])).size, rows.length, 'one row per month');
      // no pipeline view: the pipeline dialog starts from the builder ...
      assert.equal(await page.$('[data-dx-pipeline-code]'), null);
      await page.click('[data-dx-pipeline-open]');
      await page.waitForSelector('#dx-pipeline-dialog[open]');
      const pipeline = await page.$eval('#dx-pipeline-text', (t) => (t as HTMLTextAreaElement).value);
      assert.match(pipeline, /\$dateTrunc: \{ date: '\$createdAt', unit: 'month' \}/);
      assert.match(pipeline, /\$size/);
      // ... and a pipeline it does not take is named in the dialog
      await page.fill('#dx-pipeline-text', "[{ $lookup: { from: 'customers' } }]");
      await page.click('#dx-pipeline-dialog button[type="submit"]');
      assert.match(await text(page, '[data-dx-pipeline-error-text]'), /stage 1: \$lookup is not supported/);
      // a MongoDB pipeline becomes the builder's rows and runs
      await page.fill(
        '#dx-pipeline-text',
        "[{ $match: { status: 'shipped' } }, { $group: { _id: '$country', orders: { $sum: 1 }, revenue: { $sum: '$amount' } } }, { $sort: { revenue: -1 } }, { $limit: 3 }]",
      );
      await page.click('#dx-pipeline-dialog button[type="submit"]');
      await page.waitForFunction(() => !(document.querySelector('#dx-pipeline-dialog') as HTMLDialogElement).open);
      assert.equal(await page.$eval('#dx-agg-filter', (i) => (i as HTMLInputElement).value), "{ status: 'shipped' }");
      await page.waitForFunction(() => document.querySelectorAll('[data-dx-agg-table] tbody tr').length === 3);
      assert.deepEqual(
        await page.$$eval('[data-dx-agg] [data-dx-measures] .dx-agg-row', (r) =>
          r.map((x) => [
            (x.querySelector('select') as HTMLSelectElement).value,
            (x.querySelector('input') as HTMLInputElement).value,
          ]),
        ),
        [
          ['sum', 'amount'],
          ['count', ''],
        ],
      );
      const revenue = await page.$$eval('[data-dx-agg-table] tbody tr td:nth-child(2)', (c) =>
        c.map((x) => Number(x.textContent!.replace(/,/g, ''))),
      );
      assert.deepEqual(
        revenue,
        [...revenue].sort((a, b) => b - a),
        'largest revenue first',
      );
      // a filter that does not parse says so
      await page.fill('#dx-agg-filter', '{ status: ');
      await page.click('[data-dx-agg] button[type="submit"]');
      await page.waitForSelector('[data-dx-agg-result] .alert[data-variant="destructive"]');
      await page.fill('#dx-agg-filter', '');
    },
  );

  await check(
    'defuss-db 3.1 aggregations: hour of day in a time zone, median and 90th percentile; the pipeline brings them back',
    async () => {
      await open(page, '#/shop/orders');
      await page.waitForFunction(() => /of 12,000/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
      await page.click('[data-dx-tab="agg"]');
      const key = '[data-dx-keys] .dx-agg-row >> nth=0';
      const measure = (n: number) => `[data-dx-measures] .dx-agg-row >> nth=${n}`;
      const run = async () => {
        const before = await page.$eval('[data-dx-agg-result]', (e) => e.textContent);
        await page.click('[data-dx-agg] button[type="submit"]');
        await page.waitForFunction(
          (b) =>
            document.querySelector('[data-dx-agg-result]')?.textContent !== b &&
            !!document.querySelector('[data-dx-agg-result] table, [data-dx-agg-result] .alert'),
          before,
        );
        return page.$$eval('[data-dx-agg-table] tbody tr', (r) =>
          r.map((x) => [...x.children].map((c) => c.textContent!.trim())),
        );
      };
      // reset the builder: one key, count, median and p90 of the amount
      await page.$$eval('[data-dx-agg] [data-dx-remove]', (b) => b.forEach((x) => (x as HTMLButtonElement).click()));
      await page.click('[data-dx-add-key]');
      await page.click('[data-dx-add-measure]');
      await page.click('[data-dx-add-measure]');
      await page.click('[data-dx-add-measure]');
      await page.fill(`${key} >> input`, 'createdAt');
      await page.dispatchEvent(`${key} >> input`, 'change');
      await page.selectOption(`${key} >> select`, 'hourOfDay');
      await page.selectOption(`${measure(1)} >> select`, 'median');
      await page.fill(`${measure(1)} >> input`, 'amount');
      await page.selectOption(`${measure(2)} >> select`, 'p90');
      await page.fill(`${measure(2)} >> input`, 'amount');
      // medians and percentiles read numbers: a text field does not offer them
      await page.fill(`${measure(0)} >> input`, 'country');
      await page.dispatchEvent(`${measure(0)} >> input`, 'change');
      assert.equal(
        await page.$eval(`${measure(0)} >> select option[value="median"]`, (o) => (o as HTMLOptionElement).disabled),
        true,
      );
      await page.fill(`${measure(0)} >> input`, '');
      await page.dispatchEvent(`${measure(0)} >> input`, 'change');
      await page.selectOption('#dx-agg-order', 'key');
      await page.selectOption('#dx-agg-limit', '200');
      await page.fill('#dx-agg-zone', 'UTC');
      const utc = await run();
      assert.equal(utc.length, 24, 'every hour of the day');
      assert.equal(utc[0]![0], '00:00');
      assert.equal(
        utc.reduce((n, r) => n + Number(r[1]!.replace(/,/g, '')), 0),
        12000,
      );
      assert.ok(utc.every((r) => Number(r[3]!.replace(/,/g, '')) >= Number(r[2]!.replace(/,/g, ''))), 'p90 >= median');
      // the same hours in Tokyo (UTC+9, no daylight saving): each count moves nine hours on
      await page.fill('#dx-agg-zone', 'Asia/Tokyo');
      const tokyo = await run();
      const byHour = (rows: string[][]) => new Map(rows.map((r) => [Number(r[0]!.slice(0, 2)), r[1]]));
      const u = byHour(utc);
      const t = byHour(tokyo);
      for (let h = 0; h < 24; h++) assert.equal(t.get((h + 9) % 24), u.get(h), `hour ${h}`);
      assert.match(await page.$eval('[data-dx-agg-table] thead', (x) => x.textContent!), /createdAt · hour of day/);
      // the pipeline dialog writes them as MongoDB writes them, and reads its own text back
      await page.click('[data-dx-pipeline-open]');
      await page.waitForSelector('#dx-pipeline-dialog[open]');
      const pipeline = await page.$eval('#dx-pipeline-text', (x) => (x as HTMLTextAreaElement).value);
      assert.match(pipeline, /\$hour: \{ date: '\$createdAt', timezone: 'Asia\/Tokyo' \}/);
      assert.match(pipeline, /\$median: \{ input: '\$amount', method: 'approximate' \}/);
      assert.match(pipeline, /\$percentile: \{ input: '\$amount', p: \[0\.90\], method: 'approximate' \}/);
      // the builder's zone set aside (the field sits behind the modal): reading the pipeline sets it again
      await page.$eval('#dx-agg-zone', (x) => ((x as HTMLInputElement).value = 'UTC'));
      await page.click('#dx-pipeline-dialog button[type="submit"]');
      await page.waitForFunction(() => !(document.querySelector('#dx-pipeline-dialog') as HTMLDialogElement).open);
      assert.equal(await page.$eval('#dx-agg-zone', (x) => (x as HTMLInputElement).value), 'Asia/Tokyo');
      assert.deepEqual(
        await page.$$eval('[data-dx-agg] [data-dx-measures] .dx-agg-row', (r) =>
          r.map((x) => (x.querySelector('select') as HTMLSelectElement).value),
        ),
        ['count', 'median', 'p90'],
      );
      await page.waitForFunction(() => document.querySelectorAll('[data-dx-agg-table] tbody tr').length === 24);
      assert.deepEqual(
        await page.$$eval('[data-dx-agg-table] tbody tr', (r) => r.map((x) => x.children[1]!.textContent!.trim())),
        tokyo.map((r) => r[1]),
      );
      // a zone the platform does not know is named
      await page.fill('#dx-agg-zone', 'Mars/Olympus');
      await run();
      assert.match(await text(page, '[data-dx-agg-result] .alert'), /Mars\/Olympus is no time zone/);
      await page.fill('#dx-agg-zone', 'UTC');
    },
  );

  await check(
    'defuss-db 3.1 collections: history and timestamps - badges, a document\'s versions, put back, restore after a delete',
    async () => {
      // the sample articles track history and stamp their writes
      await open(page, '#/cms/articles');
      await page.waitForFunction(() => /of 120/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
      await page.click('[data-dx-tab="docs"]');
      assert.deepEqual(
        await page.$$eval('[data-dx-opt], [data-dx-action="restore"], [data-dx-action^="enable-"]', (e) =>
          e.map((x) => `${x.getAttribute('data-dx-opt') ?? x.getAttribute('data-dx-action')}:${!(x as HTMLElement).hidden}`),
        ),
        ['history:true', 'timestamps:true', 'restore:true', 'enable-history:false', 'enable-timestamps:false'],
      );
      await query(page, "{ id: 'post-7' }");
      await mount(page, 1);
      const [doc] = await shown(page);
      assert.ok(doc._createdAt instanceof Date && doc._updatedAt instanceof Date, 'stamped');
      // a delete in a tracked collection says it can come back
      await page.click('.dx-doc >> nth=0 >> [data-dx-doc-act="delete"]');
      await page.waitForSelector('#dx-confirm[open]');
      assert.match(await text(page, '[data-dx-confirm-text]'), /Restore brings it back/);
      await page.click('[data-dx-confirm-ok]');
      await page.waitForFunction(() => !document.querySelector('.dx-doc'));
      // Restore by id: an unknown one is named, the deleted one comes back
      await page.click('[data-dx-action="restore"]');
      await page.waitForSelector('#dx-restore-dialog[open]');
      await page.fill('#dx-restore-id', 'post-9999');
      await page.click('#dx-restore-dialog button[type="submit"]');
      await page.waitForFunction(() =>
        [...document.querySelectorAll('.toast')].some((t) => /post-9999.*no deleted document/.test(t.textContent || '')),
      );
      assert.equal(await page.$eval('#dx-restore-dialog', (d) => (d as HTMLDialogElement).open), true);
      await page.fill('#dx-restore-id', 'post-7');
      await page.click('#dx-restore-dialog button[type="submit"]');
      await page.waitForFunction(() => !(document.querySelector('#dx-restore-dialog') as HTMLDialogElement).open);
      await query(page, "{ id: 'post-7' }");
      await mount(page, 1);
      assert.equal((await shown(page))[0].title, doc.title);
      // its versions, newest first: the restore, the delete, the first write
      await page.click('.dx-doc >> nth=0 >> [data-dx-doc-act="history"]');
      await page.waitForSelector('#dx-history-dialog[open]');
      const kinds = () =>
        page.$$eval('[data-dx-versions] .dx-version .badge', (b) => b.map((x) => x.textContent!.trim()));
      assert.deepEqual(await kinds(), ['written', 'deleted', 'written']);
      assert.equal(await page.$eval('[data-dx-put-back]', (b) => (b as HTMLButtonElement).disabled), true);
      // the oldest version, put back: a fourth version
      await page.click('[data-dx-version="2"]');
      assert.match(await text(page, '[data-dx-version-json]'), /post-7/);
      assert.equal(await page.$eval('[data-dx-put-back]', (b) => (b as HTMLButtonElement).disabled), false);
      await page.click('[data-dx-put-back]');
      await page.waitForFunction(() => !(document.querySelector('#dx-history-dialog') as HTMLDialogElement).open);
      await page.waitForFunction(() => !!document.querySelector('.dx-doc [data-dx-doc-act="history"]'));
      await page.click('.dx-doc >> nth=0 >> [data-dx-doc-act="history"]');
      await page.waitForSelector('#dx-history-dialog[open]');
      assert.equal((await kinds()).length, 4);
      await page.click('#dx-history-dialog [data-dialog-close]');
      await page.waitForFunction(() => !(document.querySelector('#dx-history-dialog') as HTMLDialogElement).open);
      // an opened card shows its revisions under its tree, oldest to newest (the maintainer 2026-11-22: a Timeline)
      await mount(page, 1);
      await page.waitForFunction(() => document.querySelectorAll('.dx-doc .dx-revs.timeline .timeline-item').length === 4);
      const revs = () =>
        page.$$eval('.dx-doc .dx-rev', (b) =>
          b.map((x) => `${x.querySelector('.timeline-title')!.textContent!.split(' · ')[0]}:${x.getAttribute('aria-pressed')}:${(x as HTMLButtonElement).disabled}`),
        );
      assert.deepEqual(await revs(), ['written:false:false', 'deleted:false:true', 'written:false:false', 'written:true:false']);
      // a click shows that revision in the tree - an edit until Save or Revert
      await page.$eval('.dx-doc .property-tree', (el) =>
        (globalThis as any).df$.shadcn.propertyTree.set(el, '/title', 'A newer title'),
      );
      // the newest revision is the document as it is: the edit goes, nothing is modified
      await page.click('.dx-doc [data-dx-rev="3"]');
      assert.equal(await page.$eval('.dx-doc', (c) => c.hasAttribute('data-dirty')), false);
      assert.equal((await shown(page))[0].title, doc.title);
      await page.click('.dx-doc [data-dx-rev="0"]');
      assert.equal((await revs())[0], 'written:true:false');
      assert.equal(await page.$eval('.dx-doc', (c) => c.hasAttribute('data-dirty')), true);
      assert.equal((await shown(page))[0].title, doc.title);
      await page.click('.dx-doc [data-dx-doc-act="revert"]');
      assert.equal((await revs())[3], 'written:true:false');
      assert.equal(await page.$eval('.dx-doc', (c) => c.hasAttribute('data-dirty')), false);
      // Save writes the shown revision back: the fifth, the newest
      await page.click('.dx-doc [data-dx-rev="2"]');
      await page.click('.dx-doc [data-dx-doc-act="save"]');
      await page.waitForFunction(() => document.querySelectorAll('.dx-doc .dx-revs .timeline-item').length === 5);
      assert.equal((await revs())[4], 'written:true:false');
      assert.equal(await page.$eval('.dx-doc', (c) => c.hasAttribute('data-dirty')), false);
      // As of reads a tracked collection: the JSON Schema of the articles as they are now
      await page.click('[data-dx-tab="schema"]');
      await page.click('[data-dx-schema-views] button[value="json"]');
      await page.waitForSelector('[data-dx-json-schema]');
      const now = await page.evaluate(() => {
        // the next whole minute: the field takes minutes, and the articles may have been written in this one
        const d = new Date(Date.now() + 60_000 - new Date().getTimezoneOffset() * 60_000);
        return d.toISOString().slice(0, 16);
      });
      await page.fill('[data-dx-schema-at]', now);
      await page.dispatchEvent('[data-dx-schema-at]', 'change');
      await page.waitForFunction(() => /as it was on/.test(document.querySelector('[data-dx-schema-hint]')?.textContent || ''));
      assert.equal(await page.isVisible('[data-dx-schema-error]'), false);
      await page.fill('[data-dx-schema-at]', '');
      await page.dispatchEvent('[data-dx-schema-at]', 'change');
      await page.click('[data-dx-schema-views] button[value="fields"]');
      await page.click('[data-dx-tab="docs"]');

      // an ordinary collection turns history on - one way, so the dialog asks, without a red button
      await open(page, '#/shop/products');
      await page.waitForFunction(() => /of 24\d/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
      assert.equal(await page.isVisible('[data-dx-opt="history"]'), false);
      assert.equal(await page.$('.dx-doc [data-dx-doc-act="history"]'), null);
      await page.click('[data-dx-action="enable-history"]');
      await page.waitForSelector('#dx-confirm[open]');
      assert.equal(await page.getAttribute('[data-dx-confirm-ok]', 'data-variant'), null);
      assert.equal((await page.innerText('[data-dx-confirm-ok]')).trim(), 'Turn on');
      await page.click('[data-dx-confirm-ok]');
      await page.waitForSelector('[data-dx-opt="history"]:not([hidden])');
      assert.equal(await page.isVisible('[data-dx-action="enable-history"]'), false);
      await page.waitForSelector('.dx-doc [data-dx-doc-act="history"]');
      await page.click('.dx-doc >> nth=0 >> [data-dx-doc-act="history"]');
      await page.waitForSelector('#dx-history-dialog[open]');
      assert.deepEqual(await kinds(), ['first version']);
      await page.click('#dx-history-dialog [data-dialog-close]');
      // the Delete confirmation is red again afterwards
      await page.click('.dx-doc >> nth=0 >> [data-dx-doc-act="delete"]');
      await page.waitForSelector('#dx-confirm[open]');
      assert.equal(await page.getAttribute('[data-dx-confirm-ok]', 'data-variant'), 'destructive');
      assert.equal((await page.innerText('[data-dx-confirm-ok]')).trim(), 'Delete');
      await page.click('#dx-confirm [data-alert-dialog-close]:not([data-dx-confirm-ok])');
      await page.waitForFunction(() => !(document.querySelector('#dx-confirm') as HTMLDialogElement).open);

      // a new collection with both options: its badges show at once, and its first document is stamped
      await page.click('#dx-tree [data-dx-tree-act="new-coll"][data-db="cms"]');
      await page.waitForSelector('#dx-coll-dialog[open]');
      await page.fill('#dx-coll-name', 'journal');
      await page.check('#dx-coll-history');
      await page.check('#dx-coll-timestamps');
      await page.click('#dx-coll-dialog button[type="submit"]');
      await page.waitForFunction(() => location.hash === '#/cms/journal');
      await page.waitForSelector('[data-dx-opt="timestamps"]:not([hidden])');
      assert.equal(await page.isVisible('[data-dx-opt="history"]'), true);
      await open(page, '#/cms');
      await page.waitForSelector('[data-dx-db-rows] [data-dx-coll-opt="history"]');
      await open(page, '#/cms/journal');
      await page.waitForSelector('[data-dx-opt="timestamps"]:not([hidden])');
      await page.click('[data-dx-action="drop-coll"]');
      await page.waitForSelector('#dx-confirm[open]');
      await page.click('[data-dx-confirm-ok]');
      await page.waitForFunction(() => location.hash === '#/cms');
    },
  );

  await check(
    'the List view: only the records scroll; batches load ahead in both directions; the foot names the rows in view',
    async () => {
      await open(page, '#/shop/orders');
      await page.click('[data-dx-tab="docs"]');
      await page.waitForFunction(() => /^1-\d+ of 12,000/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
      // the count, the plan and the pages sit in the toolbar under the records
      assert.equal(await page.$eval('[data-dx-count]', (c) => !!c.closest('.dx-foot[role="toolbar"]')), true);
      assert.equal(await page.$eval('[data-dx-page="1"]', (c) => !!c.closest('.dx-foot')), true);
      const place = () =>
        page.evaluate(() => ({
          query: Math.round(document.querySelector('[data-dx-query]')!.getBoundingClientRect().top),
          foot: Math.round(document.querySelector('.dx-foot')!.getBoundingClientRect().bottom),
          main: Math.round(document.querySelector('.dx-main')!.scrollTop),
          cards: document.querySelectorAll('.dx-doc').length,
        }));
      const before = await place();
      // the reader scrolls fast (the maintainer 2026-11-22: it hung, and the foot hung mid-screen)
      await page.hover('.dx-doc >> nth=3');
      const t0 = Date.now();
      for (let i = 0; i < 30; i++) {
        await page.mouse.wheel(0, 2500);
        await page.waitForTimeout(30);
      }
      await page.waitForFunction((n) => document.querySelectorAll('.dx-doc').length >= n, 200);
      const after = await place();
      assert.ok(Date.now() - t0 < 15_000, `200 rows within ${Date.now() - t0} ms`);
      assert.equal(after.query, before.query, 'the query bar stays');
      assert.equal(after.foot, before.foot, 'the foot stays at the end of the panel');
      assert.equal(after.main, 0, 'the column itself does not scroll');
      const ids = await page.$$eval('.dx-doc .dx-doc-id', (c) => c.map((x) => x.textContent));
      assert.equal(new Set(ids).size, ids.length, 'every batch new, none twice');
      // the foot names the rows in view, not what is loaded
      await page.waitForFunction(() => {
        const m = /^([\d,]+)-([\d,]+) of 12,000/.exec(document.querySelector('[data-dx-count]')?.textContent || '');
        return m && Number(m[1].replace(/,/g, '')) > 20 && Number(m[2].replace(/,/g, '')) - Number(m[1].replace(/,/g, '')) < 60;
      });
      // Next goes on after what is loaded; scrolling up from there loads the batch before, the rows keep their place
      // loading goes on while the reader was near the end a moment ago - then it rests
      await page.waitForTimeout(1800);
      const loaded = await page.$$eval('.dx-doc', (d) => d.length);
      await page.click('[data-dx-page="1"]');
      await page.waitForFunction(
        (n) => new RegExp(`^${n.toLocaleString('en')}-`).test(document.querySelector('[data-dx-count]')?.textContent || ''),
        loaded + 1,
      );
      const firstId = await text(page, '.dx-doc .dx-doc-id');
      await page.hover('.dx-doc >> nth=1');
      for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, -400);
        await page.waitForTimeout(80);
      }
      await page.waitForFunction((id) => document.querySelector('.dx-doc .dx-doc-id')?.textContent !== id, firstId);
      const top = await page.evaluate((id) => {
        const card = [...document.querySelectorAll('.dx-doc .dx-doc-id')].find((c) => c.textContent === id)!;
        const box = document.querySelector('[data-dx-results]')!.getBoundingClientRect();
        return card.getBoundingClientRect().top - box.top;
      }, firstId);
      assert.ok(top > 0, 'the batch went in above the row that was first');
      // Previous: a page before what is loaded
      const shownFirst = await text(page, '.dx-doc .dx-doc-id');
      await page.click('[data-dx-page="-1"]');
      await page.waitForFunction((id) => document.querySelector('.dx-doc .dx-doc-id')?.textContent !== id, shownFirst);
      await page.click('[data-dx-reset]');
      await page.waitForFunction(() => /^1-\d+ of/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
    },
  );

  await check(
    'the query bar completes fields, operators and values, closes its pairs and names a syntax error',
    async () => {
      await page.click('[data-dx-tab="docs"]');
      await page.fill('#dx-filter', '');
      await page.focus('#dx-filter');
      await page.keyboard.type('{');
      assert.equal(await page.$eval('#dx-filter', (i) => (i as HTMLInputElement).value), '{}', 'a brace closes itself');
      await page.waitForSelector('#dx-ac:popover-open');
      const options = () => page.$$eval('#dx-ac [role="option"] .dx-ac-label', (o) => o.map((x) => x.textContent));
      assert.ok((await options()).includes('country'));
      await page.keyboard.type('sta');
      await page.waitForFunction(
        () => document.querySelector('#dx-ac [aria-selected="true"] .dx-ac-label')?.textContent === 'status',
      );
      await page.keyboard.press('Tab');
      assert.equal(await page.$eval('#dx-filter', (i) => (i as HTMLInputElement).value), '{status: }');
      // the field's values (from a sample of the collection)
      await page.waitForFunction(() =>
        [...document.querySelectorAll('#dx-ac:popover-open .dx-ac-label')].some((o) => o.textContent === "'shipped'"),
      );
      await page.click('#dx-ac [role="option"]:has-text("\'shipped\'")');
      assert.equal(await page.$eval('#dx-filter', (i) => (i as HTMLInputElement).value), "{status: 'shipped'}");
      assert.equal(await page.$('#dx-ac:popover-open'), null, 'a value ends the suggestions');
      // an operator document: the field's operators
      await page.fill('#dx-filter', '{ amount: { $');
      await page.press('#dx-filter', 'Control+Space');
      await page.waitForFunction(() =>
        [...document.querySelectorAll('#dx-ac:popover-open .dx-ac-label')].some((o) => o.textContent === '$gte'),
      );
      await page.press('#dx-filter', 'Escape');
      assert.equal(await page.$('#dx-ac:popover-open'), null);
      // Ctrl+Enter runs
      await page.fill('#dx-filter', "{status: 'shipped'}");
      await page.press('#dx-filter', 'Control+Enter');
      await page.waitForFunction(() => !/of 12,000/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
      assert.ok((await shown(page)).every((d) => d.status === 'shipped'));
      // a syntax error, named while typing pauses
      await page.fill('#dx-filter', "{ status: 'shipped");
      await page.waitForSelector('[data-dx-syntax]:not([hidden])');
      assert.match(await text(page, '[data-dx-syntax]'), /not closed/);
      assert.equal(await page.getAttribute('#dx-filter', 'aria-invalid'), 'true');
      await page.click('[data-dx-reset]');
    },
  );

  await check('a collection exported as NDJSON + gzip and as CSV, imported back as a new collection', async () => {
    await open(page, '#/shop/products');
    await page.waitForFunction(() => /of 240/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
    await mount(page, 20);
    const original = await shown(page);
    // the rows shown now are marked: the copy's must be new ones
    await page.$$eval('.dx-doc', (d) => d.forEach((x) => ((x as HTMLElement).dataset.old = '')));
    await page.click('[data-dx-action="export"]');
    await page.waitForSelector('#dx-export-dialog[open]');
    assert.equal(await page.$eval('#dx-ex-source', (s) => (s as HTMLSelectElement).value), 'shop.products');
    assert.equal(await text(page, '[data-dx-ex-name]'), 'products.ndjson.br', 'Brotli by default');
    const [br] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#dx-export-dialog button[type="submit"]'),
    ]);
    assert.equal(br.suggestedFilename(), 'products.ndjson.br');
    const OUT = join(import.meta.dirname, '..', '..', '..', 'output', 'e2e');
    mkdirSync(OUT, { recursive: true });
    const brPath = join(OUT, br.suggestedFilename());
    await br.saveAs(brPath);
    assert.notEqual(readFileSync(brPath)[0], '{'.charCodeAt(0), 'compressed');
    await page.click('[data-dx-action="export"]');
    await page.selectOption('#dx-ex-compression', 'gzip');
    const [gz] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#dx-export-dialog button[type="submit"]'),
    ]);
    assert.equal(gz.suggestedFilename(), 'products.ndjson.gz');
    // saved under its name: the import dialog reads the format and the collection from it
    const gzPath = join(OUT, gz.suggestedFilename());
    await gz.saveAs(gzPath);
    const bytes = readFileSync(gzPath);
    assert.deepEqual([bytes[0], bytes[1]], [0x1f, 0x8b], 'gzip');
    await page.click('[data-dx-action="export"]');
    await page.check('#dx-ex-csv');
    await page.selectOption('#dx-ex-compression', 'none');
    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#dx-export-dialog button[type="submit"]'),
    ]);
    assert.equal(csv.suggestedFilename(), 'products.csv');
    const csvPath = join(OUT, csv.suggestedFilename());
    await csv.saveAs(csvPath);
    const lines = readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
    assert.ok(lines.length >= 241, 'a header and 240 rows');
    assert.match(lines[0]!, /^id,/);
    // back in: the dialog reads the file, names the documents and suggests the collection
    await page.click('[data-dx-action="import"]');
    await page.setInputFiles('#dx-import-file', brPath);
    await page.waitForFunction(() =>
      (document.querySelector('[data-dx-import-kind]')?.textContent || '').startsWith('240 documents'),
    );
    assert.equal(await page.$eval('#dx-import-coll', (i) => (i as HTMLInputElement).value), 'products');
    await page.fill('#dx-import-db', 'copies');
    await page.click('#dx-import-dialog button[type="submit"]');
    await page.waitForFunction(() => location.hash === '#/copies/products');
    await page.waitForFunction(() => /of 240/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
    await mount(page, 20, '.dx-doc:not([data-old])');
    // the same documents, nested values and arrays included (once each tree holds its document)
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.dx-doc .property-tree')].every(
        (el) => (globalThis as any).df$.shadcn.propertyTree.value(el)?.id !== undefined,
      ),
    );
    assert.deepEqual(await shown(page), original);
    // an imported collection has no index: Indexes says so in the middle of its result area
    await page.click('[data-dx-tab="idx"]');
    await page.waitForSelector('[data-dx-idx-empty]:not([hidden])');
    assert.equal(await text(page, '[data-dx-idx-empty] .mk-empty-state-title'), 'No index yet');
    assert.ok(await page.$('[data-dx-idx-empty] .mk-empty-state-icon svg'));
    const centred = await page.$eval('[data-dx-idx-empty] .mk-empty-state', (e) => {
      const r = e.getBoundingClientRect();
      const m = e.closest('.dx-main')!.getBoundingClientRect();
      return Math.abs(r.left + r.width / 2 - (m.left + m.width / 2)) < 24 && r.top - m.top > 120;
    });
    assert.ok(centred, 'centred under the form');
    await page.click('[data-dx-tab="docs"]');
    // the CSV into the same collection replaces what it names (upsert)
    await page.click('[data-dx-action="import"]');
    await page.setInputFiles('#dx-import-file', csvPath);
    await page.waitForFunction(() =>
      (document.querySelector('[data-dx-import-kind]')?.textContent || '').startsWith('240 documents'),
    );
    await page.fill('#dx-import-db', 'copies');
    await page.check('#dx-im-upsert');
    await page.click('#dx-import-dialog button[type="submit"]');
    // the import ends: the dialog closes and says how many documents it wrote
    await page.waitForFunction(() => !(document.querySelector('#dx-import-dialog') as HTMLDialogElement).open);
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.toast')].some((t) =>
        /240 documents imported into copies\.products/.test(t.textContent || ''),
      ),
    );
    await page.waitForFunction(() => location.hash === '#/copies/products');
    await page.waitForFunction(() => /of 240/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
    // the header drops the collection shown, then the database shown
    assert.equal(await page.$eval('[data-dx-action="drop-db"]', (b) => (b as HTMLElement).hidden), true);
    await page.click('[data-dx-action="drop-coll"]');
    await page.waitForSelector('#dx-confirm[open]');
    await page.click('[data-dx-confirm-ok]');
    await page.waitForFunction(() => location.hash === '#/copies');
    assert.equal(await page.$$eval('[data-dx-db-rows] tr', (r) => r.length), 0);
    // a database's view is its table of collections - no buttons beside it
    assert.equal(await page.$$eval('[data-dx-view="db"] button', (b) => b.length), 0);
    assert.equal(await page.$eval('[data-dx-action="drop-coll"]', (b) => (b as HTMLElement).hidden), true);
    await page.click('[data-dx-action="drop-db"]');
    await page.waitForSelector('#dx-confirm[open]');
    await page.click('[data-dx-confirm-ok]');
    await page.waitForFunction(() => location.hash === '#/');
    // the next checks start on the orders
    await open(page, '#/shop/orders');
    await page.waitForFunction(() => /of 12,000/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
  });

  await check('Schema: every field path of a sample, its types and how often it appears', async () => {
    await page.click('[data-dx-tab="schema"]');
    await page.waitForSelector('[data-dx-schema-table]');
    const rows = await page.$$eval('[data-dx-schema-table] tbody tr', (r) =>
      r.map((x) => [
        x.children[0]!.textContent,
        x.children[1]!.textContent?.trim(),
        x.querySelector('progress')!.value,
        (x.querySelector('progress') as HTMLProgressElement).max,
      ]),
    );
    const byPath = Object.fromEntries(rows.map((r) => [r[0], r]));
    assert.equal(byPath['createdAt']![1], 'date');
    assert.equal(byPath['shipping.city']![1], 'string');
    assert.equal(byPath['items']![1], 'array');
    assert.equal(byPath['amount']![2], byPath['amount']![3], 'present in every sampled document');
    assert.match(await text(page, '[data-dx-schema-hint]'), /Sampled 500 documents/);
  });

  await check('Schema > JSON Schema: a highlighted draft 2020-12 schema of a spread sample; As of needs history', async () => {
    await page.click('[data-dx-schema-views] button[value="json"]');
    await page.waitForSelector('[data-dx-json-schema]');
    const schema = JSON.parse(await text(page, '[data-dx-json-schema]'));
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.title, 'orders');
    assert.deepEqual(schema.properties.createdAt, {
      ...schema.properties.createdAt,
      type: 'string',
      format: 'date-time',
      'x-dson': 'date',
    });
    assert.equal(schema.properties.shipping.properties.city.type, 'string');
    assert.ok(schema.required.includes('amount'));
    // coloured by token, with the copy toolbar
    assert.ok(await page.$('[data-dx-json-schema] .dx-t-key'));
    assert.ok(await page.$('[data-dx-copy-schema] svg'));
    assert.match(await text(page, '[data-dx-schema-hint]'), /Sampled 1,000 of 12,000 documents, spread/);
    // the explorer's collections keep no history: As of says so instead of a schema
    assert.equal(await page.isVisible('[data-dx-schema-at]'), true);
    await page.fill('[data-dx-schema-at]', '2026-01-01T00:00');
    await page.dispatchEvent('[data-dx-schema-at]', 'change');
    await page.waitForSelector('[data-dx-schema-error]:not([hidden])');
    assert.match(await text(page, '[data-dx-schema-error-text]'), /keeps no history/);
    await page.fill('[data-dx-schema-at]', '');
    await page.dispatchEvent('[data-dx-schema-at]', 'change');
    await page.waitForSelector('[data-dx-json-schema]');
    // back to the Fields view: no As of there
    await page.click('[data-dx-schema-views] button[value="fields"]');
    await page.waitForSelector('[data-dx-schema-table]');
    assert.equal(await page.isVisible('[data-dx-schema-at]'), false);
  });

  await check('Indexes: create one, the plan uses it; drop it, the query scans again', async () => {
    await open(page, '#/shop/customers');
    await page.waitForFunction(() => /of 801/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
    await page.click('[data-dx-tab="idx"]');
    await page.waitForSelector('[data-dx-index-table]');
    assert.deepEqual(
      await page.$$eval('[data-dx-index-table] tbody tr td:first-child', (c) => c.map((x) => x.textContent)),
      ['byEmail'],
    );
    await page.fill('#dx-idx-name', 'byTier');
    await page.fill('#dx-idx-fields', 'tier');
    await page.click('[data-dx-index-form] button[type="submit"]');
    await page.waitForFunction(() => document.querySelectorAll('[data-dx-index-table] tbody tr').length === 2);
    await page.click('[data-dx-tab="docs"]');
    await query(page, "{ tier: 'gold' }");
    assert.equal(await plan(page), 'equality · byTier');
    await page.click('[data-dx-tab="idx"]');
    // the drop is destructive (red) and carries the trash icon, like a document's Delete
    assert.deepEqual(
      await page.$eval('[data-dx-drop-index="byTier"]', (b) => [b.dataset.variant, !!b.querySelector('svg')]),
      ['destructive', true],
    );
    await page.click('[data-dx-drop-index="byTier"]');
    await page.waitForSelector('#dx-confirm[open]');
    await page.click('[data-dx-confirm-ok]');
    await page.waitForFunction(() => document.querySelectorAll('[data-dx-index-table] tbody tr').length === 1);
    await page.click('[data-dx-tab="docs"]');
    await query(page, "{ tier: 'silver' }");
    assert.equal(await plan(page), 'full scan');
  });

  await check('the query history keeps what ran on the collection; a row runs it again, Keep pins it', async () => {
    // History (east) and Operations (south) start folded to their title bars; their tools open them
    for (const id of ['#dx-history-panel', '#dx-log-panel']) {
      assert.equal(await page.$eval(id, (p) => p.hasAttribute('data-minimized')), true, `${id} starts minimized`);
      await page.click(`${id} .panel-minimize`);
      await page.waitForFunction((sel) => !document.querySelector(sel)!.hasAttribute('data-minimized'), id);
    }
    const items = await page.$$eval('[data-dx-history] .dx-run', (b) => b.map((x) => x.textContent));
    assert.equal(items[0], "{ tier: 'silver' }");
    assert.ok(items.includes("{ tier: 'gold' }"));
    await page.click(`[data-dx-history] .dx-run:has-text("{ tier: 'gold' }")`);
    await page.waitForFunction(
      () => (document.querySelector('#dx-filter') as HTMLInputElement).value === "{ tier: 'gold' }",
    );
    await page.waitForFunction(() => document.querySelector('[data-dx-plan]')?.textContent === 'full scan');
    await page.click('[data-dx-history] [data-dx-history-keep] >> nth=1');
    assert.equal(
      await page.$eval('[data-dx-history] .dx-history-item', (li) =>
        li.querySelector('[aria-pressed]')!.getAttribute('aria-pressed'),
      ),
      'true',
    );
    // the operations log heard the calls
    const ops = await page.$$eval('[data-dx-log] li code', (c) => c.map((x) => x.textContent));
    // (the newest 200 calls - the checks before this one fill it)
    for (const op of ['find', 'createIndex', 'dropIndex', 'indexes', 'collections'])
      assert.ok(ops.includes(op), `logged ${op}`);
    assert.match(await text(page, '[data-dx-log] li .dx-ms'), /^\d+ ms$/);
    // the Databases panel (west) folds to a vertical tab and comes back
    await page.click('#dx-nav-panel .panel-minimize');
    await page.waitForFunction(() => document.querySelector('#dx-nav-panel')!.hasAttribute('data-minimized'));
    // top to bottom (the maintainer 2026-11-22): the restore chevron, the title read upward with its icon below it,
    // then the icon-only tools - Refresh and New database
    const tab = await page.evaluate(() => {
      const top = (s: string) => document.querySelector(`#dx-nav-panel ${s}`)!.getBoundingClientRect();
      const [chevron, title, icon, refresh, add] = ['.panel-minimize', '.panel-title', '.panel-icon', '[data-dx-action="refresh"]', '[data-dx-action="new-db"]'].map(top);
      return { order: [chevron.top < title.top, title.bottom <= icon.top + 1, icon.bottom <= refresh.top + 1, refresh.bottom <= add.top + 1], gap: Math.round(title.top - chevron.bottom) };
    });
    assert.deepEqual(tab.order, [true, true, true, true]);
    assert.ok(tab.gap < 12, `the title right under the chevron (${tab.gap}px)`);
    await page.click('#dx-nav-panel .panel-minimize');
    await page.waitForFunction(() => !document.querySelector('#dx-nav-panel')!.hasAttribute('data-minimized'));
    // every panel title carries an icon
    assert.equal(await page.$$eval('#dx-app .panel-header > .panel-icon', (i) => i.length), 4);
  });

  await check('a new database with its first collection; export it, import it as another; drop both', async () => {
    await page.click('[data-dx-action="new-db"]');
    await page.fill('#dx-db-name', 'inventory');
    await page.fill('#dx-db-coll', 'items');
    await page.click('#dx-db-dialog button[type="submit"]');
    await page.waitForFunction(() => location.hash === '#/inventory/items');
    await page.click('#dx-tree [data-dx-tree-act="insert"][data-db="inventory"][data-coll="items"]');
    await page.click('#dx-ins-t-json');
    await page.fill('#dx-insert-dialog textarea', "[{ id: 1, sku: 'A' }, { id: 2, sku: 'B' }]");
    await page.click('#dx-insert-dialog button[type="submit"]');
    await page.waitForFunction(() =>
      [...document.querySelectorAll('#dx-tree .dx-node')].some((n) => n.textContent === 'items2'),
    );
    await page.click('[data-dx-action="export"]');
    await page.check('#dx-ex-db');
    assert.equal(await page.$eval('#dx-ex-source', (s) => (s as HTMLSelectElement).value), 'inventory');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#dx-export-dialog button[type="submit"]'),
    ]);
    assert.equal(download.suggestedFilename(), 'strata-inventory.dbsonl.br');
    const path = join(import.meta.dirname, '..', '..', '..', 'output', 'e2e', download.suggestedFilename());
    await download.saveAs(path);
    assert.ok(readFileSync(path).byteLength > 0);
    await page.click('[data-dx-action="import"]');
    await page.setInputFiles('#dx-import-file', path);
    await page.waitForFunction(() =>
      /archive/.test(document.querySelector('[data-dx-import-kind]')?.textContent || ''),
    );
    await page.fill('#dx-import-db', 'restored');
    await page.click('#dx-import-dialog button[type="submit"]');
    await page.waitForFunction(() => location.hash === '#/restored');
    assert.deepEqual(
      await page.$$eval('[data-dx-db-rows] tr', (r) =>
        r.map((x) => [...x.children].map((c) => c.textContent).join(' ')),
      ),
      ['items 2 0'],
    );
    for (const db of ['restored', 'inventory']) {
      await open(page, `#/${db}`);
      await page.click('[data-dx-action="drop-db"]');
      await page.waitForSelector('#dx-confirm[open]');
      await page.click('[data-dx-confirm-ok]');
      await page.waitForFunction(() => location.hash === '#/');
    }
    const labels = await treeLabels(page);
    assert.ok(!labels.some((l) => /^(inventory|restored) /.test(l)), labels.join(' | '));
  });

  await check(
    'German: every target and attribute in both languages; the script writes its words in German too',
    async () => {
      assert.deepEqual(await translationGaps(page, '[data-dx]'), []);
      await open(page, '#/shop/orders');
      await page.waitForFunction(() => /of 12,000/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
      await chooseLanguage(page, 'de');
      assert.equal(await renderedLanguage(page, '[data-dx]'), 'de');
      await page.waitForFunction(() =>
        /von 12\.000/.test(document.querySelector('[data-dx-count]')?.textContent || ''),
      );
      assert.match(await text(page, '[data-dx-mode]'), /OPFS/);
      await chooseLanguage(page, 'en');
    },
  );

  await check('the page ran without errors', async () => {
    assert.deepEqual(errors, []);
  });
  await ctx.close();

  // VERIFIED defect (the defuss-db site e2e, 2026-11-22): a first visit closed while it seeded, or a second tab opened
  // meanwhile, left the sample without its marker - every later visit failed on "Duplicate primary key in customers."
  await check('a first visit closed while it seeds, then two tabs at once: the sample is written whole, once', async () => {
    const c = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const errs: string[] = [];
    const visit = async () => {
      const p = await c.newPage();
      p.on('pageerror', (e) => errs.push(e.message));
      await offlineJsdelivr(p);
      await p.goto(`${server.url}${PAGE}`);
      return p;
    };
    const first = await visit();
    await first.waitForSelector('[data-dx][data-dx-seeding]', { timeout: 30_000 });
    await first.waitForTimeout(400);
    await first.close();
    const [a, b] = await Promise.all([visit(), visit()]);
    await Promise.all([ready(a), ready(b)]);
    for (const p of [a, b]) {
      const labels = await treeLabels(p);
      for (const l of ['customers 800', 'products 240', 'orders 12,000', 'events 30,000', 'articles 120'])
        assert.ok(labels.includes(l), `the tree lists ${l}: ${labels.join(' | ')}`);
    }
    assert.deepEqual(errs, []);
    await c.close();
  });

  await check('the docs card runs the same database in memory (an opaque sandbox has no OPFS)', async () => {
    const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    const errs: string[] = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await offlineJsdelivr(p);
    await p.goto(`${server.url}${DOCS}`);
    const frame = (await (await p.waitForSelector('.code-example iframe')).contentFrame())!;
    await ready(frame);
    assert.equal(await frame.getAttribute('[data-dx]', 'data-dx-store'), 'memory');
    assert.match(await text(frame, '[data-dx-mode]'), /In memory/);
    await frame.evaluate(() => (location.hash = '#/analytics/events'));
    await frame.waitForFunction(() => /of 30,000/.test(document.querySelector('[data-dx-count]')?.textContent || ''));
    const docs = await shown(frame);
    assert.equal(typeof docs[0].bytes, 'bigint', 'a BigInt stays a BigInt');
    assert.deepEqual(errs, []);
    await p.close();
  });
} finally {
  await browser.close();
  server.stop();
}
if (failures) {
  console.error(`scaffold-db-explorer.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-db-explorer.e2e: all checks passed');
