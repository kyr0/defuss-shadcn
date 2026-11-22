import assert from 'node:assert/strict';
import { chromium, type Frame, type Page } from 'playwright';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { exampleFrame } from '../lib/example-frame.ts';
import { startServer } from '../server.ts';

/**
 * Why: the Big Data pages promise projection and aggregation over their components with defuss-dataview/compute -
 * computed columns and totals that follow a grid's filters, a report grid that follows another grid, and trees whose
 * branches carry the totals of everything below them. This runs those four examples as a reader does, in their
 * sandboxes (the compute build served offline from node_modules), and checks the numbers against the rows the
 * components hold: the totals are the sums of what the filters match, every branch is the sum of its children.
 */

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

/** a docs page with the compute build offline, collecting page errors */
async function open(path: string, errors: string[]): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(`${path}: ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|lucide|unpkg/.test(m.text())) errors.push(`${path}: ${m.text()}`);
  });
  await offlineJsdelivr(page);
  await page.route('https://api.github.com/**', (r) => r.fulfill({ json: { stargazers_count: 0 }, headers: { 'access-control-allow-origin': '*' } }));
  await page.goto(`${server.url}/dist/documentation/big-data/${path}`);
  return page;
}


/** waits in a sandbox; a timeout names the step and what the outputs showed */
async function until(f: Frame, step: string, fn: (arg: any) => unknown, arg?: unknown, timeout = 30_000): Promise<void> {
  try {
    await f.waitForFunction(fn, arg, { timeout });
  } catch (err) {
    const seen = await f.evaluate(() => [...document.querySelectorAll('output')].map((o) => o.textContent).join(' | ')).catch((e) => String(e));
    throw new Error(`${step}: ${err instanceof Error ? err.message.split('\n')[0] : err} - the example showed "${seen}"`);
  }
}

/** sums of a tree's groups: every branch must equal the sum of its children, for each measure */
function branchesAddUp(rows: any[], measures: string[]): void {
  const children = new Map<string, any[]>();
  for (const r of rows) if (r.parentId != null) children.set(r.parentId, [...(children.get(r.parentId) ?? []), r]);
  assert.ok(children.size > 0, 'the tree has branches');
  for (const r of rows) {
    const kids = children.get(r.id);
    if (!kids) continue;
    for (const m of measures) {
      const sum: number = kids.reduce((n: number, k) => n + k[m], 0);
      assert.ok(Math.abs(sum - r[m]) < 1e-6 * Math.max(1, Math.abs(r[m])), `${r.id}.${m}: ${r[m]} vs the children's ${sum}`);
    }
  }
}

const errors: string[] = [];
try {
  const grid = await open('data-grid.html', errors);

  await check('projection: computed columns on every row, totals over what the filters match', async () => {
    const f = await exampleFrame(grid, '#dg-lines');
    await until(f, 'the totals of every line', () => document.querySelector('#dg-lines-totals data')?.getAttribute('value') === '100000');
    const rows = await f.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.rows(document.getElementById('dg-lines')));
    assert.equal(rows.length, 100_000);
    assert.deepEqual(Object.keys(rows[0]).sort(), ['country', 'discount', 'gross', 'id', 'net', 'product', 'quantity', 'vat'], 'the projection leaves the raw fields out');
    assert.ok(rows.every((r: any) => Math.abs(r.gross - r.net - r.vat) < 1e-6 && r.net > 0 && r.vat > 0), 'gross = net + VAT');
    await f.evaluate(() =>
      (globalThis as any).df$.shadcn.dataGrid.query(document.getElementById('dg-lines'), { filters: [{ field: 'country', op: 'eq', value: 'Japan' }] }),
    );
    await until(f, 'the totals follow the filter', () => Number(document.querySelector('#dg-lines-totals data')?.getAttribute('value')) < 100_000);
    const shown = await f.evaluate(() => [...document.querySelectorAll('#dg-lines-totals data')].map((d) => Number(d.getAttribute('value'))));
    const japan = await f.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.rows(document.getElementById('dg-lines')));
    assert.ok(japan.length > 0 && japan.every((r: any) => r.country === 'Japan'));
    const sum = (k: string) => japan.reduce((n: number, r: any) => n + r[k], 0);
    assert.equal(shown[0], japan.length, 'lines');
    assert.equal(shown[1], sum('quantity'), 'units');
    for (const [i, k] of [[2, 'net'], [3, 'vat'], [4, 'gross']] as const) assert.ok(Math.abs(shown[i] - sum(k)) < 0.01, `${k}: ${shown[i]} vs ${sum(k)}`);
  });

  await check('a report grid: groups that add up to the filtered orders, regrouped by the select', async () => {
    const f = await exampleFrame(grid, '#dg-report');
    const report = () => f.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.source(document.getElementById('dg-report'))?.rows ?? []);
    await until(f, 'eight country groups', () => ((globalThis as any).df$.shadcn.dataGrid.source(document.getElementById('dg-report'))?.rows.length ?? 0) === 8);
    let groups = await report();
    assert.equal(groups.reduce((n: number, g: any) => n + g.orders, 0), 100_000);
    assert.ok(groups.every((g: any, k: number) => k === 0 || groups[k - 1].revenue >= g.revenue), 'ordered by revenue');
    await f.selectOption('#dg-report-orders .data-grid-filter[data-field="status"]', 'refunded');
    await until(f, 'the report follows the status filter', () =>
      ((globalThis as any).df$.shadcn.dataGrid.source(document.getElementById('dg-report'))?.rows ?? []).every((g: any) => g.refunds === g.orders && g.revenue === null),
    );
    const refunded = await f.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.rows(document.getElementById('dg-report-orders')).length);
    groups = await report();
    assert.equal(groups.reduce((n: number, g: any) => n + g.orders, 0), refunded);
    await f.selectOption('#dg-report-by', 'product');
    await until(f, 'grouped by product', () =>
      ((globalThis as any).df$.shadcn.dataGrid.source(document.getElementById('dg-report'))?.rows ?? []).some((g: any) => g.group === 'Desk lamp'),
    );
  });
  await grid.close();

  const treeGrid = await open('tree-grid.html', errors);
  await check('an aggregated tree grid: every branch the sum of its children; a year narrows them', async () => {
    const f = await exampleFrame(treeGrid, '#tg-sales');
    const rows = () => f.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.source(document.getElementById('tg-sales'))?.rows ?? []);
    await until(f, 'the tree of every sale', () => /from 200,000 sales/.test(document.getElementById('tg-sales-line')!.textContent ?? ''));
    let all = await rows();
    assert.equal(all.filter((r: any) => r.parentId === null).reduce((n: number, r: any) => n + r.orders, 0), 200_000);
    assert.equal(all.filter((r: any) => r.parentId === null).length, 4, 'four regions');
    branchesAddUp(all, ['orders', 'units', 'revenue', 'returns']);
    await f.selectOption('#tg-sales-year', '2024');
    await until(f, 'the tree of 2024', () => /from [\d,]+ sales/.test(document.getElementById('tg-sales-line')!.textContent ?? '') && !/from 200,000 sales/.test(document.getElementById('tg-sales-line')!.textContent ?? ''));
    all = await rows();
    branchesAddUp(all, ['orders', 'units', 'revenue', 'returns']);
    const shown = await f.evaluate(() => document.querySelectorAll('#tg-sales .data-grid-body .data-grid-row').length);
    assert.ok(shown >= 4, 'the regions render');
  });
  await treeGrid.close();

  const tree = await open('data-tree.html', errors);
  await check('an aggregated data tree: labels carry the measures; only slow requests narrows every branch', async () => {
    const f = await exampleFrame(tree, '#dt-requests');
    const rows = () => f.evaluate(() => (document.getElementById('dt-requests') as any)._source?.rows ?? []);
    await until(f, 'every request', () => /^250,000 requests/.test(document.getElementById('dt-requests-line')!.textContent ?? ''));
    let all = await rows();
    branchesAddUp(all, ['requests', 'errors']);
    const label = await f.evaluate(() => document.querySelector('#dt-requests .data-tree-meta')?.textContent ?? '');
    assert.match(label, /req · \d+ ms avg · [\d.]+% errors/);
    await f.check('#dt-requests-slow');
    await until(f, 'only slow requests', () => !/^250,000 requests/.test(document.getElementById('dt-requests-line')!.textContent ?? ''));
    all = await rows();
    branchesAddUp(all, ['requests', 'errors']);
    assert.ok(all.every((r: any) => r.slowest > 800), 'every group is slow');
  });
  await tree.close();

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nbig-data-compute-docs: all checks passed');
