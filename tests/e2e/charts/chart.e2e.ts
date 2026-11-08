import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped chart component. Loads the fixture
 * (every chart configuration at once) over HTTP in a real browser with the
 * pinned echarts CDN script, then verifies component CSS was applied and
 * chart.js wiring works - the same files consumers copy from dist/,
 * unmodified. Requires network access to jsDelivr.
 */

const FIXTURE = '/tests/e2e/charts/chart.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

/** Reads the live echarts option of a mounted chart via the registry. */
const getOption = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => {
    const inst = globalThis.df$?.shadcn?.chart?.instance(el as HTMLElement);
    return inst?.getOption() as Record<string, unknown> | undefined;
  });

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

try {
  const page = await browser.newPage();
  await page.goto(`${server.url}${FIXTURE}`, { waitUntil: 'networkidle' });

  await check('chart.js initialized every .chart element (data-init)', async () => {
    await page.waitForFunction(() => document.querySelectorAll('.chart:not([data-init])').length === 0);
  });

  await check('declarative data-chart mounts an SVG-rendered echarts instance', async () => {
    await page.waitForFunction(
      () => document.querySelector('#declarative')?.querySelector('svg') !== null,
    );
    const option = await getOption(page, 'declarative');
    assert.ok(option, 'instance(el).getOption() missing');
    const series = option?.series as Array<Record<string, unknown>>;
    assert.deepEqual(series[0].data, [12, 19, 15, 24]);
  });

  await check('theme adapter applied (token palette + axis label color)', async () => {
    const option = await getOption(page, 'declarative');
    const color = option?.color as string[];
    assert.ok(Array.isArray(color) && color.length >= 5, `expected ≥5 palette colors, got ${JSON.stringify(color)}`);
    const yAxis = (option?.yAxis as Array<Record<string, unknown>>)[0];
    const axisLabel = yAxis.axisLabel as Record<string, unknown>;
    assert.ok(typeof axisLabel.color === 'string' && axisLabel.color.length > 0, 'axis label color missing');
  });

  await check('axis-less charts grow no phantom axes', async () => {
    const option = await getOption(page, 'axisless');
    const xAxis = option?.xAxis as unknown[] | undefined;
    const yAxis = option?.yAxis as unknown[] | undefined;
    assert.ok(!xAxis || xAxis.length === 0, `phantom xAxis on a pie: ${JSON.stringify(xAxis)}`);
    assert.ok(!yAxis || yAxis.length === 0, `phantom yAxis on a pie: ${JSON.stringify(yAxis)}`);
  });

  await check('chart.css applied (data-size heights)', async () => {
    const heights = await page.evaluate(() => ({
      sm: getComputedStyle(document.querySelector('#size-sm') as HTMLElement).height,
      def: getComputedStyle(document.querySelector('#size-default') as HTMLElement).height,
      lg: getComputedStyle(document.querySelector('#size-lg') as HTMLElement).height,
      frameDisplay: getComputedStyle(document.querySelector('.chart-frame') as HTMLElement).display,
      sourceColor: getComputedStyle(document.querySelector('.chart-source') as HTMLElement).color,
    }));
    assert.equal(heights.sm, '224px'); // 14rem
    assert.equal(heights.def, '320px'); // 20rem
    assert.equal(heights.lg, '448px'); // 28rem
    assert.equal(heights.frameDisplay, 'flex');
    assert.notEqual(heights.sourceColor, 'rgb(0, 0, 0)', 'chart-source should use --muted-foreground');
  });

  await check('a drawn chart shrinks with a narrowing grid host (its canvas never holds it open)', async () => {
    // a grid item's min-width is its content: the svg drawn at the old width kept the
    // paper's figure wide on a phone after a resize
    await page.evaluate(() => {
      const chart = document.querySelector('#size-default') as HTMLElement;
      const host = document.createElement('div');
      host.id = 'shrink-host'; host.style.cssText = 'display:grid;width:800px';
      chart.before(host); host.append(chart);
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => { (document.querySelector('#shrink-host') as HTMLElement).style.width = '300px'; });
    await page.waitForTimeout(800);
    const w = await page.evaluate(() => {
      const chart = document.querySelector('#size-default') as HTMLElement;
      const out = { chart: Math.round(chart.getBoundingClientRect().width), svg: Math.round(chart.querySelector('svg')!.getBoundingClientRect().width) };
      const host = chart.parentElement!;
      host.before(chart); host.remove();
      return out;
    });
    assert.deepEqual(w, { chart: 300, svg: 300 });
  });

  await check('state API: default state reported for bound instances', async () => {
    const state = await page.$eval('#declarative', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
    assert.deepEqual(state.config, {});
  });

  await check("state API: setState('default', { option }) replaces the series data", async () => {
    await page.$eval('#declarative', (el) =>
      (el as HTMLElement).api!.setState('default', {
        option: { xAxis: { type: 'category', data: ['A', 'B'] }, yAxis: { type: 'value' }, series: [{ id: 'rev', type: 'bar', data: [42, 7] }] },
      }),
    );
    const option = await getOption(page, 'declarative');
    const series = option?.series as Array<Record<string, unknown>>;
    assert.deepEqual(series[0].data, [42, 7]);
    const state = await page.$eval('#declarative', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#declarative') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('registry globals expose api + states + imperative surface', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.chartApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.chartStates,
      hasMount: typeof globalThis.df$?.shadcn?.chart?.mount === 'function',
      hasTheme: typeof globalThis.df$?.shadcn?.chart?.theme === 'function' && typeof globalThis.df$?.shadcn?.chart?.deck === 'function',
      hasStory: typeof globalThis.df$?.shadcn?.chartStory === 'function',
    }));
    assert.ok(reg.hasApi, 'df$.chartApi.setState missing');
    assert.deepEqual(reg.states, ['default']);
    assert.ok(reg.hasMount && reg.hasTheme, 'df$.chart.mount/theme missing');
    assert.ok(reg.hasStory, 'df$.chartStory missing');
  });

  await check('df$.chart.mount() mounts a bare element imperatively', async () => {
    await page.evaluate(() => {
      globalThis.df$!.shadcn!.chart!.mount(document.querySelector('#imperative') as HTMLElement, {
        xAxis: { type: 'category', data: ['X'] },
        yAxis: { type: 'value' },
        series: [{ id: 'm', type: 'bar', data: [9] }],
      });
    });
    await page.waitForFunction(() => document.querySelector('#imperative')?.querySelector('svg') !== null);
    const option = await getOption(page, 'imperative');
    const series = option?.series as Array<Record<string, unknown>>;
    assert.deepEqual(series[0].data, [9]);
  });

  await check('chartStory: next/prev/go drive option transitions with clamping', async () => {
    const applied = await page.evaluate(() => {
      const el = document.querySelector('#story') as HTMLElement;
      const base = { xAxis: { type: 'category', data: ['A', 'B'] }, yAxis: { type: 'value' } };
      const states = [1, 2, 3].map((v) => ({ ...base, series: [{ id: 'st', type: 'bar', universalTransition: true, data: [v, v * 2] }] }));
      const story = globalThis.df$!.shadcn!.chartStory!(el, states);
      const out: { index: number; data: unknown }[] = [];
      const snap = () => {
        const o = globalThis.df$!.shadcn!.chart!.instance(el)!.getOption() as Record<string, unknown>;
        out.push({ index: story.index(), data: (o.series as Array<Record<string, unknown>>)[0].data });
      };
      snap(); // lazily mounted with states[0]
      story.next();
      snap();
      story.next();
      snap();
      story.next(); // clamps at the last state (no loop)
      snap();
      story.prev();
      snap();
      story.go(0);
      snap();
      return out;
    });
    assert.deepEqual(
      applied.map((a) => a.index),
      [0, 1, 2, 2, 1, 0],
    );
    assert.deepEqual(applied[0].data, [1, 2]);
    assert.deepEqual(applied[1].data, [2, 4]);
    assert.deepEqual(applied[2].data, [3, 6]);
    assert.deepEqual(applied[3].data, [3, 6], 'go() must clamp without loop');
    assert.deepEqual(applied[5].data, [1, 2]);
  });

  await check('MutationObserver auto-inits a dynamically added .chart', async () => {
    await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'chart';
      el.id = 'dynamic';
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', 'Dynamically added chart');
      el.setAttribute(
        'data-chart',
        '{"xAxis":{"type":"category","data":["D"]},"yAxis":{"type":"value"},"series":[{"id":"d","type":"bar","data":[5]}]}',
      );
      document.body.appendChild(el);
    });
    await page.waitForFunction(() => document.querySelector('#dynamic')?.hasAttribute('data-init'));
    await page.waitForFunction(() => document.querySelector('#dynamic')?.querySelector('svg') !== null);
    const option = await getOption(page, 'dynamic');
    const series = option?.series as Array<Record<string, unknown>>;
    assert.deepEqual(series[0].data, [5]);
  });
  await check('token references in options resolve to sRGB (var() + color-mix)', async () => {
    const colors = await page.evaluate(() => {
      const el = document.querySelector('#tokens') as HTMLElement;
      globalThis.df$!.shadcn!.chart!.mount(el, {
        xAxis: { type: 'category', data: ['A', 'B'] }, yAxis: { type: 'value' },
        series: [
          { id: 'a', type: 'bar', data: [3, 5], itemStyle: { color: 'var(--primary)' } },
          { id: 'b', type: 'bar', data: [2, 4], itemStyle: { color: 'color-mix(in oklch, var(--chart-2) 40%, transparent)' } },
        ],
      });
      const o = globalThis.df$!.shadcn!.chart!.instance(el)!.getOption() as { series: { itemStyle: { color: string } }[] };
      return o.series.map((x) => x.itemStyle.color);
    });
    assert.match(colors[0], /^rgba?\(/, `var(--primary) resolved: ${colors[0]}`);
    assert.match(colors[1], /^rgba\(/, `color-mix with transparency resolved to rgba: ${colors[1]}`);
  });

  await check('df$.shadcn.chart.color resolves a token (with alpha)', async () => {
    const out = await page.evaluate(() => {
      const el = document.querySelector('#tokens') as HTMLElement;
      const color = globalThis.df$!.shadcn!.chart!.color;
      return [color(el, '--chart-2'), color(el, '--chart-2', 0.5)];
    });
    assert.match(out[0], /^rgb\(/);
    assert.match(out[1], /^rgba\(.*0\.5\)$/);
  });

  await check('theme changes re-theme live charts (dark mode re-resolves token colors)', async () => {
    const before = await page.evaluate(() => {
      const o = globalThis.df$!.shadcn!.chart!.instance(document.querySelector('#tokens') as HTMLElement)!.getOption() as { series: { itemStyle: { color: string } }[] };
      return o.series[0].itemStyle.color;
    });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForFunction((prev) => {
      const o = globalThis.df$!.shadcn!.chart!.instance(document.querySelector('#tokens') as HTMLElement)!.getOption() as { series: { itemStyle: { color: string } }[] };
      return o.series[0].itemStyle.color !== prev;
    }, before, { timeout: 3000 });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
  });

  await check('chart.deck: one stage instance follows data-chart-state across slides', async () => {
    const r = await page.evaluate(async () => {
      const deck = document.querySelector('#stage-deck') as HTMLElement;
      const stage = deck.querySelector('.presentation-stage') as HTMLElement;
      const slides = Array.from(deck.querySelectorAll(':scope > [data-slide]')) as HTMLElement[];
      const handle = globalThis.df$!.shadcn!.chart!.deck(deck, {
        base: { tooltip: { trigger: 'item' } },
        states: {
          bars: { xAxis: { type: 'category', data: ['a', 'b'] }, yAxis: { type: 'value' }, series: [{ id: 'm', type: 'bar', data: [{ name: 'a', value: 1 }, { name: 'b', value: 2 }] }] },
          pie: { series: [{ id: 'm', type: 'pie', data: [{ name: 'a', value: 1 }, { name: 'b', value: 2 }] }] },
        },
      });
      const inst = () => globalThis.df$!.shadcn!.chart!.instance(stage)!;
      const type = () => ((inst().getOption() as { series: { type: string }[] }).series[0].type);
      const out: Record<string, unknown> = { first: type(), visible1: stage.hasAttribute('data-visible'), state1: handle.state() };
      const first = inst();
      const activate = (i: number) => slides.forEach((s, k) => s.toggleAttribute('data-active', k === i));
      activate(1);
      await new Promise((r) => setTimeout(r, 50));
      out.second = type();
      out.same = inst() === first;
      out.transition = ((inst().getOption() as { series: { universalTransition: { enabled: boolean } }[] }).series[0].universalTransition || {}).enabled;
      activate(2);
      await new Promise((r) => setTimeout(r, 50));
      out.visible3 = stage.hasAttribute('data-visible');
      out.state3 = handle.state();
      return out;
    });
    assert.equal(r.first, 'bar');
    assert.ok(r.visible1, 'the stage shows on a chart slide');
    assert.equal(r.state1, 'bars');
    assert.equal(r.second, 'pie', 'the next slide’s state is applied');
    assert.ok(r.same, 'the SAME instance morphs (no remount)');
    assert.equal(r.transition, true, 'series default to universalTransition');
    assert.equal(r.visible3, false, 'a slide without data-chart-state hides the stage');
    assert.equal(r.state3, null);
  });

  await check('print: a chart drawn at the screen width resizes and paints in the print layout - its svg takes the printed box, its paths end inside it', async () => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(400);
    const screen = await page.$$eval('.chart svg', (s) => Math.max(...s.map((e) => e.getBoundingClientRect().width)));
    assert.ok(screen > 800, `a chart wider than a printed page (${screen}px)`);
    // registered after chart.js's own listener: it reads what the print paints
    await page.evaluate(() => {
      const rows: number[][] = ((globalThis as any).__printRows = []);
      matchMedia('print').addEventListener('change', (e) => {
        if (!e.matches) return;
        for (const el of document.querySelectorAll<HTMLElement>('.chart[data-init]')) {
          const svg = el.querySelector('svg');
          if (!svg || !el.clientWidth) continue;
          const right = Math.max(0, ...[...svg.querySelectorAll('path')].map((p) => { const b = p.getBBox(); return b.x + b.width; }));
          rows.push([el.clientWidth, Number(svg.getAttribute('width')), Math.round(right)]);
        }
      }, { once: true });
    });
    await page.pdf();
    const rows: number[][] = await page.evaluate(() => (globalThis as any).__printRows);
    assert.ok(rows.length > 0, 'charts drawn in the print layout');
    for (const [box, svg, right] of rows) {
      assert.ok(box < screen, `the printed box (${box}px) is narrower than the screen chart (${screen}px)`);
      assert.ok(Math.abs(svg - box) <= 1, `svg ${svg}px in a ${box}px box`);
      assert.ok(right <= svg + 1, `a path ends at ${right}px in a ${svg}px svg (painted before the print)`);
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(200);
  });

  await check('chart.bind(): a dataview source of 100,000 rows drawn as its aggregation; chart-data reports it', async () => {
    const r = await page.evaluate(async () => {
      const REGIONS = ['EU', 'US', 'AP', 'AF'];
      const CHANNELS = ['web', 'app', 'store'];
      const rows = Array.from({ length: 100_000 }, (_, i) => ({
        id: i + 1,
        region: REGIONS[[0, 0, 0, 1, 1, 2, 3][i % 7]],
        channel: CHANNELS[(i >> 3) % 3],
        amount: (i % 100) + 1,
      }));
      const g = globalThis as any;
      g.__rows = rows;
      const el = document.getElementById('bound')!;
      const events: any[] = [];
      el.addEventListener('chart-data', (e) => events.push((e as CustomEvent).detail));
      const source = g.df$.dataview.source(rows);
      const binding = g.df$.shadcn.chart.bind(el, {
        source,
        aggregate: { groupBy: 'region', measures: [{ op: 'count' }, { op: 'sum', field: 'amount', as: 'revenue' }] },
        option: (groups: any[]) => ({
          xAxis: { type: 'category', data: groups.map((x) => x.region) },
          yAxis: { type: 'value' },
          series: [{ id: 'n', type: 'bar', data: groups.map((x) => x.count) }],
        }),
      });
      const inst = await binding.mounted;
      g.__binding = binding;
      const opt = inst.getOption();
      const expected = g.df$.dataview.aggregate(rows, { groupBy: 'region' });
      return { events: events.length, detail: events[0], data: opt.series[0].data, cats: opt.xAxis[0].data, expected, same: inst === g.df$.shadcn.chart.instance(el) };
    });
    assert.equal(r.events, 1, 'one chart-data per aggregation');
    assert.deepEqual([r.detail.total, r.detail.matched, r.detail.rows.length], [100000, 100000, 4]);
    assert.deepEqual(r.cats, ['AF', 'AP', 'EU', 'US'], 'groups sorted by key');
    assert.deepEqual(r.data, r.expected.map((x: any) => x.count));
    assert.equal(r.data.reduce((a: number, b: number) => a + b, 0), 100000, 'every row is in a group');
    assert.ok(r.same, 'mounted resolves with the registered instance');
  });

  await check('chart.bind(): update() regroups the same chart; query() filters; dispose() releases it', async () => {
    const r = await page.evaluate(() => {
      const g = globalThis as any;
      const el = document.getElementById('bound')!;
      const before = g.df$.shadcn.chart.instance(el);
      g.__binding.update({ aggregate: { groupBy: 'channel' }, option: (groups: any[]) => ({ xAxis: { type: 'category', data: groups.map((x) => x.channel) }, yAxis: { type: 'value' }, series: [{ id: 'n', type: 'bar', data: groups.map((x) => x.count) }] }) });
      const regrouped = g.df$.shadcn.chart.instance(el).getOption().xAxis[0].data;
      g.__binding.query({ filters: [{ field: 'region', op: 'eq', value: 'EU' }] });
      const filtered = g.__binding.rows();
      const eu = g.__rows.filter((x: any) => x.region === 'EU').length;
      const same = g.df$.shadcn.chart.instance(el) === before;
      g.__binding.dispose();
      return { regrouped, filtered, eu, same, after: g.df$.shadcn.chart.instance(el) === undefined };
    });
    assert.deepEqual(r.regrouped, ['app', 'store', 'web']);
    assert.equal(r.filtered.reduce((n: number, x: any) => n + x.count, 0), r.eu, 'the groups hold exactly the matched rows');
    assert.ok(r.same, 'the same instance morphs');
    assert.ok(r.after, 'dispose releases the instance');
  });

  await check("chart.bind({ follow }): a chart follows a Data Grid's filters over the grid's own source", async () => {
    await page.evaluate(() => {
      const g = globalThis as any;
      const grid = document.getElementById('bound-grid')!;
      g.df$.shadcn.dataGrid.setSource(grid, g.__rows);
      g.__follow = g.df$.shadcn.chart.bind(document.getElementById('bound-follow'), {
        source: g.df$.shadcn.dataGrid.source(grid),
        follow: grid,
        aggregate: { groupBy: 'channel' },
        option: (groups: any[]) => ({ xAxis: { type: 'category', data: groups.map((x) => x.channel) }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: groups.map((x) => x.count) }] }),
      });
    });
    const total = () => page.evaluate(() => (globalThis as any).__follow.rows().reduce((n: number, x: any) => n + x.count, 0));
    assert.equal(await total(), 100000);
    // a filter typed in the grid's filter row
    await page.selectOption('#bound-grid .data-grid-filters select >> nth=0', 'AP');
    await page.waitForFunction(() => (globalThis as any).__follow.rows().reduce((n: number, x: any) => n + x.count, 0) < 100000);
    const ap = await page.evaluate(() => (globalThis as any).__rows.filter((x: any) => x.region === 'AP').length);
    assert.equal(await total(), ap);
    assert.equal(await page.getAttribute('#bound-grid', 'aria-rowcount'), String(ap + 2), 'the grid shows the same rows');
    // and back
    await page.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.query(document.getElementById('bound-grid'), { filters: [] }));
    await page.waitForFunction(() => (globalThis as any).__follow.rows().reduce((n: number, x: any) => n + x.count, 0) === 100000);
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.chart[id]', ['default'], { runtimeAttrs: ['style','_echarts_instance_'], runtimeOwned: '.chart[id] > *, .chart[id] > * *' });
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nchart.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('chart.e2e: all checks passed');
