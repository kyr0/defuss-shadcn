import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped chart component. Loads the fixture
 * (every chart configuration at once) over HTTP in a real browser with the
 * pinned echarts CDN script, then verifies component CSS was applied and
 * chart.js wiring works - the same files consumers copy from dist/,
 * unmodified. Requires network access to jsDelivr.
 */

const FIXTURE = '/tests/e2e/chart.e2e-fixture.html';
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
