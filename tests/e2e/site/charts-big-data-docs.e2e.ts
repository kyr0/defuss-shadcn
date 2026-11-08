import assert from 'node:assert/strict';
import { chromium, type Frame, type Page } from 'playwright';
import { startServer } from '../server.ts';

/**
 * Why: the Big Data Charts page promises charts over a million rows - the rows in a df$.dataview source, the chart
 * drawing their aggregation, regrouped in place, binned by time and width, cut to the largest groups, and following
 * a Data Grid's filters both ways. This runs the page's four examples as a reader does, in their sandboxes: every
 * chart draws, the numbers add up to the rows, a select regroups the same chart, a click on a bar filters the grid.
 */

const PAGE = '/dist/documentation/charts/charts-big-data.html';
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

/** the sandbox of the card that holds a selector, once its charts drew */
async function frameWith(page: Page, sel: string): Promise<Frame> {
  const cards = page.locator('.code-example');
  for (let k = 0; k < (await cards.count()); k++) {
    await cards.nth(k).scrollIntoViewIfNeeded();
    for (const f of page.frames()) if (f !== page.mainFrame() && (await f.$(sel).catch(() => null))) return f;
  }
  throw new Error(`no example holds ${sel}`);
}
/** waits in a sandbox; a timeout names the step and what the example showed then */
async function until(f: Frame, step: string, fn: (arg: any) => unknown, arg?: unknown, timeout = 30_000): Promise<void> {
  try {
    await f.waitForFunction(fn, arg, { timeout });
  } catch (err) {
    const seen = await f
      .evaluate(() => [...document.querySelectorAll('output')].map((o) => o.textContent).join(' | '))
      .catch((e) => String(e));
    throw new Error(`${step}: ${err instanceof Error ? err.message.split('\n')[0] : err} - the example showed "${seen}"`);
  }
}
const option = (f: Frame, id: string) =>
  f.evaluate((id) => (globalThis as any).df$.shadcn.chart.instance(document.getElementById(id)).getOption(), id);

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|lucide|unpkg/.test(m.text())) errors.push(m.text());
  });
  // the docs header asks GitHub for its star count - not this page's business, and no network in a test
  await page.route('https://api.github.com/**', (r) => r.fulfill({ json: { stargazers_count: 0 }, headers: { 'access-control-allow-origin': '*' } }));
  await page.goto(`${server.url}${PAGE}`);

  await check('a million orders: four groups that add up to every row; the selects regroup the same chart', async () => {
    const f = await frameWith(page, '#million');
    await f.waitForFunction(() => (document.getElementById('million-info')!.textContent ?? '').startsWith('1,000,000 orders in 4 groups'), null, { timeout: 30_000 });
    const before = await option(f, 'million');
    assert.equal(before.series[0].data.reduce((a: number, b: number) => a + b, 0), 1_000_000);
    assert.deepEqual(before.xAxis[0].data, ['Europe', 'Americas', 'Asia', 'Africa'], 'sorted by the measure, largest first');
    const same = await f.evaluate(() => {
      const g = globalThis as any;
      g.__inst = g.df$.shadcn.chart.instance(document.getElementById('million'));
      return true;
    });
    assert.ok(same);
    await f.selectOption('#million-group', 'channel');
    await f.waitForFunction(() => /in 8 groups/.test(document.getElementById('million-info')!.textContent ?? ''));
    const after = await option(f, 'million');
    assert.equal(after.xAxis[0].data.length, 8);
    assert.ok(await f.evaluate(() => (globalThis as any).__inst === (globalThis as any).df$.shadcn.chart.instance(document.getElementById('million'))), 'the same instance');
  });

  await check('buckets: a filled time axis per month (then per week) and a histogram in 10 EUR bins', async () => {
    const f = await frameWith(page, '#buckets-time');
    await f.waitForFunction(() => (globalThis as any).df$.shadcn.chart.instance(document.getElementById('buckets-size')), null, { timeout: 20_000 });
    const months = (await option(f, 'buckets-time')).dataset[0].source;
    assert.equal(months.length, 12);
    assert.equal(months.reduce((n: number, m: any) => n + m.count, 0), 250_000);
    await f.selectOption('#buckets-unit', 'week');
    await f.waitForFunction(() => (globalThis as any).df$.shadcn.chart.instance(document.getElementById('buckets-time')).getOption().dataset[0].source.length > 12);
    const weeks = (await option(f, 'buckets-time')).dataset[0].source;
    assert.ok(weeks.every((w: any, k: number) => k === 0 || w.start - weeks[k - 1].start === 7 * 864e5), 'consecutive weeks, none missing');
    const bins = (await option(f, 'buckets-size')).xAxis[0].data;
    assert.ok(bins.every((b: string, k: number) => Number(b) === Number(bins[0]) + 10 * k), 'consecutive 10 EUR bins');
  });

  await check('a grid and its charts: a grid filter narrows both charts; a click on a region bar filters the grid', async () => {
    const f = await frameWith(page, '#cross-grid');
    await until(f, 'the charts drew every order', () => (document.getElementById('cross-info')!.textContent ?? '').startsWith('200,000 of 200,000 orders'));
    await f.selectOption('#cross-grid .data-grid-filter[data-field="channel"]', 'web');
    await until(f, 'the charts follow the channel filter', () => /orders match/.test(document.getElementById('cross-info')!.textContent ?? '') && !(document.getElementById('cross-info')!.textContent ?? '').startsWith('200,000 of'));
    const web = await f.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.rows(document.getElementById('cross-grid')).length);
    const pie = (await option(f, 'cross-channel')).series[0].data;
    assert.deepEqual(pie, [{ name: 'web', value: web }]);
    // a click on the first region bar adds its filter - the card may scale its preview: the point is measured in the
    // chart's own box and placed in the box the page shows
    const chartEl = f.locator('#cross-region');
    await (await f.frameElement()).scrollIntoViewIfNeeded();
    const pt = await f.evaluate(() => {
      const el = document.getElementById('cross-region')!;
      const chart = (globalThis as any).df$.shadcn.chart.instance(el);
      const opt = chart.getOption();
      const [x, y] = chart.convertToPixel({ seriesIndex: 0 }, [0, opt.series[0].data[0] / 2]);
      return { fx: x / el.clientWidth, fy: y / el.clientHeight, region: opt.xAxis[0].data[0] };
    });
    const box = (await chartEl.boundingBox())!;
    await page.mouse.click(box.x + pt.fx * box.width, box.y + pt.fy * box.height);
    await until(
      f,
      'the bar click filters the grid',
      (region) => ((document.getElementById('cross-grid') as any).store.value.config.filters ?? []).some((x: any) => x.field === 'region' && x.value === region),
      pt.region,
    );
    const rows = await f.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.rows(document.getElementById('cross-grid')));
    assert.ok(rows.length > 0 && rows.every((r: any) => r.channel === 'web' && r.region === pt.region));
  });

  await check('the largest groups and the rest: six countries and one slice for the other eighteen', async () => {
    const f = await frameWith(page, '#top-countries');
    await f.waitForFunction(() => (globalThis as any).df$.shadcn.chart.instance(document.getElementById('top-countries')), null, { timeout: 20_000 });
    const data = (await option(f, 'top-countries')).series[0].data;
    assert.equal(data.length, 7);
    assert.equal(data.at(-1).name, 'the other 18');
    assert.equal(data.reduce((n: number, d: any) => n + d.value, 0), 250_000);
  });

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
console.log('\ncharts-big-data-docs: all checks passed');
