import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: E2E for the shipped Geo Map. The engines (d3-array, d3-geo, GeographicLib, defuss-dson) are served OFFLINE
 * from the pinned devDependencies; the data is the shipped dist/components/geo-map/data/.
 * Verifies: lazy loading (no map → no engine request), the world and its levels, a focus (Europe shows its
 * countries with the rest dimmed and inert, Germany its states from the states chunk), callouts outside the view
 * with the name written above the line, picking by click / Shift-click / data-select="multiple" / keyboard,
 * drilling down by double click (into a country, down the S2 hierarchy and back up), real sizes on the equal-area
 * projections, the callout size, search with suggestions (a continent, a country, a state), the outside controls
 * and outputs, the hover lift and the four highlight styles, layers (markers, a geodesic line, an S2 cell, a
 * style), pan / zoom by keyboard and wheel, a flight, a GeoJSON data source, an unreachable manifest, and the State
 * API + render() contract.
 */

const FIXTURE = '/tests/e2e/geography/geo-map.e2e-fixture.html';
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

const ready = (page: Page): Promise<unknown> =>
  page.waitForFunction(
    () => {
      const maps = [...document.querySelectorAll('.geo-map')];
      return maps.length > 0 && maps.every((m) => m.getAttribute('data-geo-status') !== 'loading' && !m.hasAttribute('aria-busy'));
    },
    null,
    { timeout: 30_000 },
  );
/** two frames: a requested render has run */
const frames = (page: Page): Promise<unknown> =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const idle = async (page: Page, id: string): Promise<void> => {
  // a requested render runs first (it marks what is still loading)
  await frames(page);
  await page.waitForFunction((sel) => !document.querySelector(sel)?.hasAttribute('aria-busy'), `#${id}`, { timeout: 20_000 });
  await frames(page);
};
const stats = (page: Page, id: string): Promise<any> =>
  page.evaluate((id) => (globalThis as any).df$.shadcn.geoMap.stats(`#${id}`), id);
const keys = (page: Page, id: string): Promise<string[]> =>
  page.evaluate((id) => [...document.querySelectorAll(`#${id} .geo-map-regions [data-key]`)].map((p) => p.getAttribute('data-key')!), id);

async function open(reduced = true): Promise<{ page: Page; requests: string[]; errors: string[] }> {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const requests = await offlineJsdelivr(page);
  await page.goto(`${server.url}${FIXTURE}`);
  await ready(page);
  return { page, requests, errors };
}

try {
  await check('the component pins its engines (never @latest)', async () => {
    const src = readFileSync(resolve(import.meta.dirname, '../../../dist/components/geo-map/geo-map.js'), 'utf8');
    for (const pin of ['d3-array@3.2.4', 'd3-geo@3.1.1', 'geographiclib-geodesic@2.2.0', 'defuss-dson@1.1.2'])
      assert.ok(src.includes(`https://cdn.jsdelivr.net/npm/${pin}/`), pin);
    assert.doesNotMatch(src, /(d3-array|d3-geo|geographiclib-geodesic|defuss-dson)@latest/);
  });

  await check('no map on the page → no engine is requested', async () => {
    const page = await browser.newPage();
    const requests = await offlineJsdelivr(page);
    await page.route(`${server.url}/tests/e2e/__geo-empty.html`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><p>none</p><script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/geo-map/geo-map.js"></script>',
      }),
    );
    await page.goto(`${server.url}/tests/e2e/__geo-empty.html`);
    await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.geoMapApi);
    await page.waitForTimeout(400);
    assert.deepEqual(requests, []);
    await page.close();
  });

  const { page, requests, errors } = await open();

  await check('every engine loads once for ten maps; every map is ready and drawn', async () => {
    assert.equal(requests.length, 4, requests.join(', '));
    const status = await page.evaluate(() => [...document.querySelectorAll('.geo-map')].map((m) => [m.id, m.getAttribute('data-geo-status')]));
    assert.ok(status.every(([, s]) => s === 'ready'), JSON.stringify(status));
    assert.equal((await stats(page, 'gm-world')).visibleRegions, 242);
    assert.ok((await keys(page, 'gm-world')).includes('country:DEU'));
  });

  await check('the plain variant has no frame: no border, no radius, no background', async () => {
    const [framed, plain] = await page.evaluate(() =>
      ['#gm-world', '#gm-plain'].map((s) => {
        const cs = getComputedStyle(document.querySelector(s)!);
        return [cs.borderTopWidth, cs.borderTopLeftRadius, cs.backgroundColor];
      }),
    );
    assert.notEqual(framed[0], '0px');
    assert.deepEqual(plain, ['0px', '0px', 'rgba(0, 0, 0, 0)']);
    assert.ok((await stats(page, 'gm-plain')).visibleRegions > 100);
  });

  await check('levels: continents (8), countries, states in view', async () => {
    await page.evaluate(() => (document.querySelector('#gm-world') as any).api.setState('default', { level: 'continent' }));
    await frames(page);
    assert.equal((await keys(page, 'gm-world')).filter((k) => k.startsWith('continent:')).length, 8);
    await page.evaluate(() => (document.querySelector('#gm-world') as any).api.setState('default', { level: 'state', center: [10, 51], zoom: 12 }));
    await idle(page, 'gm-world');
    const k = await keys(page, 'gm-world');
    assert.ok(k.includes('state:DEU-1591') || k.some((x) => x.startsWith('state:DEU')), 'German states in view');
    await page.evaluate(() => (document.querySelector('#gm-world') as any).api.setState('default', { level: 'country', center: [0, 12], zoom: 1 }));
    await frames(page);
  });

  await check('focus Europe: its countries drawn, the rest of the world dimmed and inert, framed in view', async () => {
    const k = await keys(page, 'gm-europe');
    for (const c of ['country:DEU', 'country:FRA', 'country:ITA', 'country:POL']) assert.ok(k.includes(c), c);
    assert.ok(!k.includes('country:USA') && !k.includes('country:CHN'), 'no country outside Europe');
    const s = await stats(page, 'gm-europe');
    assert.ok(s.contextRegions > 0, 'context drawn');
    const ctx = await page.evaluate(() => {
      const layer = document.querySelector('#gm-europe .geo-map-context')!;
      return { pe: getComputedStyle(layer).pointerEvents, hidden: layer.getAttribute('aria-hidden') };
    });
    assert.deepEqual(ctx, { pe: 'none', hidden: 'true' });
    const cfg = await page.evaluate(() => (document.querySelector('#gm-europe') as any).api.getState());
    assert.equal(cfg.name, 'focused');
    assert.ok(cfg.config.center[0] > -5 && cfg.config.center[0] < 25 && cfg.config.center[1] > 45 && cfg.config.center[1] < 60, JSON.stringify(cfg.config.center));
    // Berlin and Lisbon are in view, New York is not
    const xy = await page.evaluate(() => {
      const g = (globalThis as any).df$.shadcn.geoMap;
      return [g.project('#gm-europe', [13.4, 52.5]), g.project('#gm-europe', [-9.14, 38.72]), g.project('#gm-europe', [-74, 40.7])];
    });
    assert.ok(xy[0] && xy[1] && !xy[2], JSON.stringify(xy));
  });

  await check('callouts: one per region in view, the name in a gutter outside the view, written above its line', async () => {
    const callouts = await page.evaluate(() => {
      const el = document.querySelector('#gm-germany') as HTMLElement;
      const w = el.querySelector('svg')!.viewBox.baseVal.width;
      return [...el.querySelectorAll('.geo-map-callout')].map((g) => {
        const pts = g.querySelector('polyline')!.getAttribute('points')!.split(' ').map((p) => p.split(',').map(Number));
        const t = g.querySelector('text')!;
        return { key: g.getAttribute('data-key'), side: g.getAttribute('data-side'), pts, ty: Number(t.getAttribute('y')), tx: Number(t.getAttribute('x')), text: t.textContent, w };
      });
    });
    assert.equal(callouts.length, 16, 'the 16 German states');
    for (const c of callouts) {
      const [anchor, elbow, end] = c.pts;
      assert.equal(elbow![1], end![1], `${c.key}: the line ends level`);
      assert.ok(c.ty < end![1], `${c.key}: the name sits above the line`);
      assert.ok(c.side === 'left' ? end![0] < 20 && c.tx === end![0] : end![0] > c.w - 20, `${c.key}: the label reaches the outer edge`);
      assert.ok(c.side === 'left' ? elbow![0] <= anchor![0] : elbow![0] >= anchor![0], `${c.key}: the elbow is at the gutter`);
    }
    // labels on one side never overlap
    for (const side of ['left', 'right']) {
      const ys = callouts.filter((c) => c.side === side).map((c) => c.pts[2]![1]).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) assert.ok(ys[i]! - ys[i - 1]! >= 21.9, `${side} labels ${ys[i - 1]} / ${ys[i]}`);
    }
    assert.ok(callouts.some((c) => c.text === 'Bavaria') && callouts.some((c) => c.text === 'Berlin'));
  });

  await check('callout names in --geo-map-callout-size (0.875rem; 20px set): rows spaced by it, every name inside its gutter', async () => {
    const read = (id: string) =>
      page.evaluate((id) => {
        const el = document.querySelector(`#${id}`) as HTMLElement;
        const gutter = parseFloat(getComputedStyle(el).getPropertyValue('--geo-map-callout-width')) * parseFloat(getComputedStyle(document.documentElement).fontSize);
        const labels = [...el.querySelectorAll('.geo-map-callout-label')] as SVGTextElement[];
        return {
          gutter,
          size: getComputedStyle(labels[0]!).fontSize,
          widths: labels.map((t) => t.getComputedTextLength()),
          texts: labels.map((t) => t.textContent),
          rows: [...el.querySelectorAll('.geo-map-callout')].map((g) => ({ side: g.getAttribute('data-side'), y: Number(g.querySelector('polyline')!.getAttribute('points')!.split(' ')[2]!.split(',')[1]) })),
        };
      }, id);
    const normal = await read('gm-germany');
    assert.equal(normal.size, '14px');
    const big = await read('gm-big');
    assert.equal(big.size, '20px');
    assert.equal(big.gutter, 208);
    assert.ok(big.texts.length >= 9 && big.texts.includes('Vienna'), big.texts.join(', '));
    for (const w of [...normal.widths, ...big.widths]) assert.ok(w > 0 && w <= big.gutter - 11, `a name ${w}px wide`);
    for (const side of ['left', 'right']) {
      const ys = big.rows.filter((r) => r.side === side).map((r) => r.y).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) assert.ok(ys[i]! - ys[i - 1]! >= 31.9, `${side} rows ${ys[i - 1]} / ${ys[i]}`);
    }
  });

  await check('equalArea keeps real sizes: Greenland : DR Congo as on Equal Earth; Mercator draws Greenland far larger', async () => {
    // the drawn area of a path (shoelace over its subpaths - d3 writes polygons as M ... L ... Z)
    const ratio = () =>
      page.evaluate(() => {
        const area = (d: string) =>
          Math.abs(
            d.split('M').slice(1).reduce((sum, sub) => {
              const pts = sub.replace(/Z/g, '').split('L').map((p) => p.split(',').map(Number));
              let a = 0;
              for (let i = 0; i < pts.length; i++) a += pts[i]![0]! * pts[(i + 1) % pts.length]![1]! - pts[(i + 1) % pts.length]![0]! * pts[i]![1]!;
              return sum + a / 2;
            }, 0),
          );
        const d = (key: string) => document.querySelector(`#gm-area .geo-map-regions [data-key="${key}"]`)!.getAttribute('d')!;
        return area(d('country:GRL')) / area(d('country:COD'));
      });
    const set = async (projection: string) => {
      await page.evaluate((projection) => (document.querySelector('#gm-area') as any).api.setState('selected', { projection }), projection);
      await idle(page, 'gm-area');
    };
    const equalArea = await ratio();
    await set('equalEarth');
    const equalEarth = await ratio();
    await set('mercator');
    const mercator = await ratio();
    await set('equalArea');
    // both equal-area: the ratio of the regions' real areas (Natural Earth's outlines: about 0.9)
    assert.ok(Math.abs(equalArea / equalEarth - 1) < 0.02, `${equalArea} vs ${equalEarth}`);
    assert.ok(equalArea > 0.7 && equalArea < 1.1, String(equalArea));
    assert.ok(mercator > 3 * equalArea, `Mercator ${mercator}`);
    assert.equal(await page.getAttribute('#gm-area', 'data-projection'), 'equalArea');
  });

  await check('S2 drill-down: a double click frames a cell with its four children; Up steps to the parent, then the layer\'s cells', async () => {
    const cells = () => page.evaluate(() => [...document.querySelectorAll('#gm-cells .geo-map-cells [data-key]')].map((p) => p.getAttribute('data-key')!));
    // a double click on the cell at the projected center of a token
    const dblclickCell = async (token: string) => {
      const xy = await page.evaluate((token) => {
        const el = document.querySelector('#gm-cells') as HTMLElement;
        const ns = (globalThis as any).df$.shadcn;
        const [x, y] = ns.geoMap.project(el, ns.geo.s2Center(token));
        const r = el.querySelector('svg')!.getBoundingClientRect();
        return [r.left + x, r.top + y];
      }, token);
      await page.mouse.dblclick(xy[0]!, xy[1]!);
    };
    const childrenOf = (token: string) =>
      page.evaluate((token) => (globalThis as any).df$.shadcn.geo.s2Children(token).map((c: string) => `s2:${c}`).sort(), token);
    const focusIs = (key: string | null) =>
      page.waitForFunction((key) => document.querySelector('#gm-cells')!.getAttribute('data-focus') === key, key);
    const MUNICH = [11.582, 48.1351];
    const [face, child] = await page.evaluate((p) => [0, 1].map((l) => (globalThis as any).df$.shadcn.geo.s2Cell(p, l).token), MUNICH);
    await page.locator('#gm-cells').scrollIntoViewIfNeeded();
    await idle(page, 'gm-cells');
    const faces = await cells();
    assert.ok(faces.length >= 4 && faces.includes(`s2:${face}`), faces.join(' '));

    await dblclickCell(face!);
    await focusIs(`s2:${face}`);
    await idle(page, 'gm-cells');
    assert.deepEqual((await cells()).sort(), await childrenOf(face!));
    assert.equal(await page.textContent('#gm-cells-focus'), `S2 ${face}`);
    assert.equal(await page.textContent('#gm-cells-level'), 'S2 level 1');
    const zoomFace = (await page.evaluate(() => (document.querySelector('#gm-cells') as any).api.getState().config.zoom)) as number;

    await dblclickCell(child!);
    await focusIs(`s2:${child}`);
    await idle(page, 'gm-cells');
    assert.deepEqual((await cells()).sort(), await childrenOf(child!));
    assert.equal(await page.textContent('#gm-cells-level'), 'S2 level 2');
    const zoomChild = (await page.evaluate(() => (document.querySelector('#gm-cells') as any).api.getState().config.zoom)) as number;
    assert.ok(zoomChild > zoomFace * 1.5, `framed closer: ${zoomFace} then ${zoomChild}`);

    await page.click('#gm-cells-up');
    await focusIs(`s2:${face}`);
    await page.click('#gm-cells-up');
    await focusIs(null);
    await idle(page, 'gm-cells');
    assert.deepEqual(await cells(), faces, 'the layer\'s cells again');

    // a key in any case frames the canonical token; a key that names no cell is refused
    await page.evaluate(() => (globalThis as any).df$.shadcn.geoMap.focus('#gm-cells', 's2:479F'));
    await focusIs('s2:479f');
    // a cell far below a pixel at 1x is framed closer than the map's width: a 1px floor once capped it near 360x here
    const deep = await page.evaluate(async (p) => {
      const ns = (globalThis as any).df$.shadcn;
      await ns.geoMap.focus('#gm-cells', `s2:${ns.geo.s2Cell(p, 9).token}`);
      return (document.querySelector('#gm-cells') as any).api.getState().config.zoom as number;
    }, MUNICH);
    assert.ok(deep > 600, `level 9 framed at ${deep}x`);
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#gm-cells') as any).api.setState('focused', { focus: 's2:zz' });
        return '';
      } catch (e) {
        return String(e);
      }
    });
    assert.match(err, /RangeError: .*S2 token/);
    await page.evaluate(() => (globalThis as any).df$.shadcn.geoMap.reset('#gm-cells'));
    await focusIs(null);
    // the same key written as markup from outside: the map keeps drawing the layer's cells, the readout is empty
    const before = errors.length;
    await page.evaluate(() => document.querySelector('#gm-cells')!.setAttribute('data-focus', 's2:zz'));
    await idle(page, 'gm-cells');
    assert.equal(errors.length, before, errors.slice(before).join('; '));
    assert.deepEqual(await cells(), faces);
    assert.equal(await page.textContent('#gm-cells-level'), '');
    await page.evaluate(() => (globalThis as any).df$.shadcn.geoMap.reset('#gm-cells'));
    await focusIs(null);
  });

  await check('focus Germany: its 16 states from states-DEU.dgeo, neighbours as context', async () => {
    const k = await keys(page, 'gm-germany');
    assert.equal(k.length, 16, k.join(' '));
    assert.ok(k.every((x) => x.startsWith('state:DEU')));
    const loaded = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes('/data/states-DEU')));
    assert.ok(loaded.some((n) => n.endsWith('/states-DEU.dgeo')), loaded.join(', '));
  });

  await check('a click picks a region (aria-pressed, data-selected, geo-map-select, the output), a second click clears it', async () => {
    await page.evaluate(() => {
      (globalThis as any).__selects = [];
      document.querySelector('#gm-world')!.addEventListener('geo-map-select', (e) => (globalThis as any).__selects.push((e as CustomEvent).detail));
    });
    const fra = page.locator('#gm-world .geo-map-regions [data-key="country:BRA"]');
    await fra.click();
    await frames(page);
    assert.equal(await fra.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getAttribute('#gm-world', 'data-selected'), 'country:BRA');
    assert.equal(await page.getAttribute('#gm-world', 'data-state-name'), 'selected');
    assert.equal(await page.textContent('#gm-out-selection'), 'Brazil');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__selects.at(-1)), { keys: ['country:BRA'], names: ['Brazil'] });
    await page.locator('#gm-world .geo-map-regions [data-key="country:AUS"]').click({ modifiers: ['Shift'] });
    await frames(page);
    assert.equal(await page.getAttribute('#gm-world', 'data-selected'), 'country:BRA country:AUS');
    await page.locator('#gm-world .geo-map-regions [data-key="country:AUS"]').click();
    await frames(page);
    assert.equal(await page.getAttribute('#gm-world', 'data-selected'), 'country:AUS');
    await page.locator('#gm-world .geo-map-regions [data-key="country:AUS"]').click();
    await frames(page);
    assert.equal(await page.getAttribute('#gm-world', 'data-selected'), null);
    assert.equal(await page.getAttribute('#gm-world', 'data-state-name'), 'default');
  });

  await check('data-select="multiple" toggles; the pulse highlight animates the picked regions', async () => {
    const before = await page.getAttribute('#gm-picked', 'data-selected');
    assert.equal(before, 'country:FRA country:DEU');
    await page.locator('#gm-picked .geo-map-regions [data-key="country:ESP"]').click();
    await frames(page);
    assert.equal(await page.getAttribute('#gm-picked', 'data-selected'), 'country:FRA country:DEU country:ESP');
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector('#gm-picked [data-key="country:FRA"]')!).animationName);
    assert.equal(anim, 'none', 'reduced motion: no pulse');
  });

  await check('keyboard: Enter on a region picks it, arrows move between regions, Escape clears', async () => {
    await page.evaluate(() => (document.querySelector('#gm-germany [data-key="state:DEU-1591"]') as SVGElement).focus());
    await page.keyboard.press('Enter');
    await frames(page);
    assert.equal(await page.getAttribute('#gm-germany', 'data-selected'), 'state:DEU-1591');
    assert.equal(await page.getAttribute('#gm-germany', 'data-state-name'), 'focused', 'the focus stays');
    await page.keyboard.press('ArrowUp');
    await frames(page);
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-key'));
    assert.ok(focused && focused !== 'state:DEU-1591' && focused.startsWith('state:DEU'), String(focused));
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('tabindex')), '0', 'the roving tab stop moved');
    await page.keyboard.press('Escape');
    await frames(page);
    assert.equal(await page.getAttribute('#gm-germany', 'data-selected'), null);
  });

  await check('hover lifts a region: a raised copy with a shadow, outline highlight marches', async () => {
    const box = await page.locator('#gm-germany .geo-map-regions [data-key="state:DEU-1591"]').boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await frames(page);
    const lift = await page.evaluate(() => {
      const copy = document.querySelector('#gm-germany .geo-map-lift .geo-map-lifted');
      return copy ? { key: copy.getAttribute('data-key'), translate: getComputedStyle(copy).translate, filter: getComputedStyle(copy).filter } : null;
    });
    assert.ok(lift && lift.key?.startsWith('state:DEU'), JSON.stringify(lift));
    assert.match(lift!.translate, /-3px/);
    assert.match(lift!.filter, /drop-shadow/);
    assert.ok(await page.isVisible('#gm-germany .geo-map-tooltip'));
    await page.mouse.move(2, 2);
    await frames(page);
    assert.equal(await page.locator('#gm-germany .geo-map-lifted').count(), 0);
    await page.evaluate(() => (document.querySelector('#gm-germany') as any).api.setState('focused', { selected: ['state:DEU-1591'] }));
    await frames(page);
    const outline = await page.evaluate(() => getComputedStyle(document.querySelector('#gm-germany .geo-map-regions [data-key="state:DEU-1591"]')!).strokeDasharray);
    assert.notEqual(outline, 'none');
    await page.evaluate(() => (document.querySelector('#gm-germany') as any).api.setState('focused', { selected: [] }));
  });

  await check('data-highlight="lift": the picked regions are raised copies', async () => {
    await page.evaluate(() => (document.querySelector('#gm-europe') as any).api.setState('focused', { selected: ['country:ITA'] }));
    await frames(page);
    const lifted = await page.evaluate(() => [...document.querySelectorAll('#gm-europe .geo-map-lifted')].map((p) => p.getAttribute('data-key')));
    assert.deepEqual(lifted, ['country:ITA']);
    const callout = await page.evaluate(() => document.querySelector('#gm-europe .geo-map-callout[data-key="country:ITA"]')?.hasAttribute('data-selected'));
    assert.equal(callout, true, 'its callout is marked');
  });

  await check('search: suggestions in a datalist; Enter frames the hit (a continent, a country, a state)', async () => {
    await page.fill('#gm-search', 'germ');
    await page.waitForFunction(() => (document.querySelector('#gm-search') as HTMLInputElement).list?.options.length);
    const options = await page.evaluate(() => [...(document.querySelector('#gm-search') as HTMLInputElement).list!.options].map((o) => o.value));
    assert.equal(options[0], 'Germany', options.join(' | '));
    await page.press('#gm-search', 'Enter');
    await page.waitForFunction(() => document.querySelector('#gm-world')!.getAttribute('data-focus') === 'country:DEU');
    await idle(page, 'gm-world');
    assert.equal((await keys(page, 'gm-world')).filter((k) => k.startsWith('state:DEU')).length, 16);
    assert.equal(await page.textContent('#gm-out-focus'), 'Germany');
    await page.fill('#gm-search', 'Bavaria');
    await page.press('#gm-search', 'Enter');
    await page.waitForFunction(() => document.querySelector('#gm-world')!.getAttribute('data-focus') === 'state:DEU-1591');
    await page.fill('#gm-search', 'europe');
    await page.press('#gm-search', 'Enter');
    await page.waitForFunction(() => document.querySelector('#gm-world')!.getAttribute('data-focus') === 'continent:Europe');
    await page.fill('#gm-search', 'Atlantis');
    await page.press('#gm-search', 'Enter');
    await page.waitForFunction(() => document.querySelector('#gm-search')!.hasAttribute('aria-invalid'));
    assert.equal(await page.getAttribute('#gm-world', 'data-focus'), 'continent:Europe', 'no hit keeps the focus');
  });

  await check('outside controls: Up steps out, World resets, a focus button, zoom in, the projection select, callouts', async () => {
    await page.click('#gm-up');
    await page.waitForFunction(() => !document.querySelector('#gm-world')!.hasAttribute('data-focus'));
    await page.click('#gm-europe-btn');
    await page.waitForFunction(() => document.querySelector('#gm-world')!.getAttribute('data-focus') === 'continent:Europe');
    await page.click('#gm-reset');
    await page.waitForFunction(() => document.querySelector('#gm-world')!.getAttribute('data-state-name') === 'default');
    const cam = await page.evaluate(() => (document.querySelector('#gm-world') as any).api.getState().config);
    assert.deepEqual([cam.center, cam.zoom], [[0, 12], 1]);
    await page.click('#gm-in');
    await frames(page);
    assert.equal(await page.textContent('#gm-out-zoom'), '1.6x');
    await page.selectOption('#gm-projection', 'orthographic');
    await frames(page);
    assert.equal(await page.getAttribute('#gm-world', 'data-projection'), 'orthographic');
    await page.check('#gm-callouts');
    await idle(page, 'gm-world');
    assert.ok((await stats(page, 'gm-world')).callouts > 10);
    await page.uncheck('#gm-callouts');
    await page.selectOption('#gm-projection', 'equalEarth');
    await page.click('#gm-reset');
    await frames(page);
  });

  await check('double click on a country drills into its states', async () => {
    await page.locator('#gm-world .geo-map-regions [data-key="country:AUS"]').dblclick();
    await page.waitForFunction(() => document.querySelector('#gm-world')!.getAttribute('data-focus') === 'country:AUS');
    await idle(page, 'gm-world');
    assert.ok((await keys(page, 'gm-world')).every((k) => k.startsWith('state:AUS')));
    await page.click('#gm-reset');
    await frames(page);
  });

  await check('keyboard pan and zoom on the map; the wheel zooms at the cursor', async () => {
    await page.focus('#gm-world .geo-map-svg');
    await page.keyboard.press('+');
    await page.keyboard.press('ArrowRight');
    await frames(page);
    const cfg = await page.evaluate(() => (document.querySelector('#gm-world') as any).api.getState().config);
    assert.ok(cfg.zoom > 1.4 && cfg.center[0] > 0, JSON.stringify(cfg));
    await page.keyboard.press('Home');
    await frames(page);
    const box = await page.locator('#gm-world .geo-map-svg').boundingBox();
    const before = await page.evaluate(() => (globalThis as any).df$.shadcn.geoMap.unproject('#gm-world', [700, 150]));
    await page.mouse.move(box!.x + (700 * box!.width) / (await page.evaluate(() => (document.querySelector('#gm-world svg') as SVGSVGElement).viewBox.baseVal.width)), box!.y + 150 * (box!.height / (await page.evaluate(() => (document.querySelector('#gm-world svg') as SVGSVGElement).viewBox.baseVal.height))));
    await page.mouse.wheel(0, -300);
    await frames(page);
    const after = await page.evaluate(() => (globalThis as any).df$.shadcn.geoMap.unproject('#gm-world', [700, 150]));
    assert.ok((await page.evaluate(() => (document.querySelector('#gm-world') as any).api.getState().config.zoom)) > 1.5);
    assert.ok(Math.abs(before[0] - after[0]) < 1.5 && Math.abs(before[1] - after[1]) < 1.5, `the cursor's place stays: ${before} / ${after}`);
    await page.click('#gm-reset');
  });

  await check('layers: markers (pin, diamond, an S2 cell center), the geodesic line, the S2 cell, a region style', async () => {
    const s = await stats(page, 'gm-layers');
    assert.equal(s.visibleMarkers, 3);
    assert.equal(s.visibleCells, 1);
    const line = await page.getAttribute('#gm-layers [data-line="muc-ber"]', 'd');
    assert.ok(line && line.split(/[LM]/).length > 10, 'sampled geodesic');
    assert.equal(await page.evaluate(() => (document.querySelector('#gm-layers [data-key="country:AUT"]') as SVGElement).style.fill), 'var(--chart-2)');
    assert.equal(await page.getAttribute('#gm-layers .geo-map-cells [data-key]', 'data-key'), 's2:479f');
    await page.evaluate(() =>
      (globalThis as any).df$.shadcn.geoMap.setLayers('#gm-layers', { markers: [{ id: 'one', position: [2.35, 48.86], label: 'Paris' }] }),
    );
    await frames(page);
    assert.equal((await stats(page, 'gm-layers')).visibleMarkers, 1);
  });

  await check('the State API: selected and focused by setState, outputs follow, events fire', async () => {
    await page.evaluate(() => {
      (globalThis as any).__focus = [];
      document.querySelector('#gm-world')!.addEventListener('geo-map-focus', (e) => (globalThis as any).__focus.push((e as CustomEvent).detail));
    });
    await page.evaluate(() => (document.querySelector('#gm-world') as any).api.setState('selected', { selected: 'country:JPN, country:KOR' }));
    assert.equal(await page.getAttribute('#gm-world', 'data-selected'), 'country:JPN country:KOR');
    await page.evaluate(() => (document.querySelector('#gm-world') as any).api.setState('focused', { focus: 'continent:Africa' }));
    await page.waitForFunction(() => (document.querySelector('#gm-world') as any).api.getState().name === 'focused');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__focus.at(-1)), { key: 'continent:Africa', name: 'Africa' });
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#gm-world') as any).api.setState('default', { projection: 'peters' });
        return '';
      } catch (e) {
        return String(e);
      }
    });
    assert.match(err, /unknown projection/);
    await page.evaluate(() => (document.querySelector('#gm-world') as any).api.setState('default', { center: [0, 12], zoom: 1 }));
  });

  await check('an attribute written from outside applies (data-focus)', async () => {
    await page.evaluate(() => ((document.querySelector('#gm-world') as HTMLElement).dataset.focus = 'country:FRA'));
    await page.waitForFunction(() => (document.querySelector('#gm-world') as any).api.getState().name === 'focused');
    await idle(page, 'gm-world');
    assert.ok((await keys(page, 'gm-world')).every((k) => k.startsWith('state:FRA')));
    await page.click('#gm-reset');
  });

  await check('an empty value enters a state with what the markup declared (the State tab\'s cleared field)', async () => {
    const enter = (id: string, name: string, config: Record<string, unknown>) =>
      page.evaluate(([id, name, config]) => (document.querySelector('#' + id) as any).api.setState(name, config), [id, name, config] as const);
    await enter('gm-picked', 'default', {});
    await enter('gm-picked', 'selected', { selected: '' });
    assert.equal(await page.getAttribute('#gm-picked', 'data-selected'), 'country:FRA country:DEU');
    await enter('gm-europe', 'default', {});
    await enter('gm-europe', 'focused', { focus: '' });
    assert.equal(await page.getAttribute('#gm-europe', 'data-focus'), 'continent:Europe');
    await idle(page, 'gm-europe');
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });

  await check('a flight animates the camera (motion allowed) and resolves where it was asked', async () => {
    const p2 = await open(false);
    const samples = await p2.page.evaluate(async () => {
      const g = (globalThis as any).df$.shadcn.geoMap;
      const el = document.querySelector('#gm-world') as any;
      const zooms: number[] = [];
      const done = g.focus(el, 'Japan');
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 60));
        zooms.push(el._geo.view.zoom);
      }
      await done;
      return { zooms, end: el.api.getState().config.zoom };
    });
    assert.ok(new Set(samples.zooms.map((z) => z.toFixed(2))).size > 3, `intermediate zooms ${samples.zooms}`);
    assert.ok(samples.end > 5, String(samples.end));
    await p2.page.close();
  });

  await check('a GeoJSON source draws its own regions; a missing manifest is an alert', async () => {
    const p3 = await browser.newPage();
    await offlineJsdelivr(p3);
    const geojson = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { id: 'A', name: 'Square A', level: 'country' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] } },
        { type: 'Feature', properties: { id: 'B', name: 'Square B', level: 'country' }, geometry: { type: 'Polygon', coordinates: [[[20, 0], [20, 10], [30, 10], [30, 0], [20, 0]]] } },
      ],
    };
    await p3.route(`${server.url}/tests/e2e/__regions.geojson`, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(geojson) }));
    await p3.route(`${server.url}/tests/e2e/__geo-own.html`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><link rel="stylesheet" href="/dist/components/geo-map/geo-map.css"><div class="geo-map" id="own" data-src="/tests/e2e/__regions.geojson" data-center="15,5" data-zoom="8"></div><div class="geo-map" id="gone" data-src="/tests/e2e/__nothing.json"></div><input type="search" id="gone-search" data-geo-for="gone" data-geo-action="search"><button id="gone-focus" data-geo-for="gone" data-geo-action="focus" data-value="country:DEU">DE</button><button id="gone-up" data-geo-for="gone" data-geo-action="up">Up</button><button id="gone-reset" data-geo-for="gone" data-geo-action="reset">World</button><button id="gone-in" data-geo-for="gone" data-geo-action="zoom-in">+</button><select id="gone-projection" data-geo-for="gone" data-geo-param="projection"><option>equal-earth</option><option>mercator</option></select><script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/geo-map/geo-map.js"></script>',
      }),
    );
    await p3.goto(`${server.url}/tests/e2e/__geo-own.html`);
    await p3.waitForFunction(() => [...document.querySelectorAll('.geo-map')].every((m) => m.getAttribute('data-geo-status') !== 'loading'));
    await frames(p3);
    // both windings draw the small square, not the rest of the globe
    const areas = await p3.evaluate(() => [...document.querySelectorAll('#own .geo-map-regions path')].map((p) => (p as SVGPathElement).getBBox().width));
    assert.equal(areas.length, 2);
    assert.ok(Math.abs(areas[0]! - areas[1]!) < 2 && areas[0]! < 400, JSON.stringify(areas));
    assert.equal(await p3.getAttribute('#gone', 'data-geo-status'), 'error');
    assert.match((await p3.textContent('#gone .geo-map-error')) ?? '', /404/);
    // a map that failed to load keeps working as state: its controls and setState throw nothing (a regression:
    // the view work called the unloaded engines and rejected unhandled), the attributes are the state
    const pageErrors: string[] = [];
    p3.on('pageerror', (e) => pageErrors.push(e.message));
    for (const id of ['gone-focus', 'gone-up', 'gone-reset', 'gone-in']) await p3.click('#' + id);
    await p3.fill('#gone-search', 'Germany');
    await p3.press('#gone-search', 'Enter');
    await p3.selectOption('#gone-projection', 'mercator');
    await p3.evaluate(() => (document.querySelector('#gone') as any).api.setState('focused', { focus: 'country:FRA' }));
    await p3.waitForTimeout(300);
    assert.deepEqual(pageErrors, []);
    assert.equal(await p3.getAttribute('#gone', 'data-focus'), 'country:FRA');
    assert.equal(await p3.getAttribute('#gone', 'data-projection'), 'mercator');
    await p3.close();
  });

  // last: it reloads the page
  await check('a map removed from the page lets go of its chunks: its queued loads are dropped', async () => {
    // a regression: datasets kept every map that ever rendered, so an SPA-swapped map kept loading its chunks
    const p4 = await browser.newPage();
    await offlineJsdelivr(p4);
    const chunks: string[] = [];
    let removed = false;
    p4.on('request', (r) => {
      if (removed && /\.dgeo$/.test(r.url()) && !/world/.test(r.url())) chunks.push(r.url());
    });
    await p4.route(`${server.url}/tests/e2e/__geo-detach.html`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><link rel="stylesheet" href="/dist/components/geo-map/geo-map.css"><div class="geo-map" id="gone-soon" style="width:900px" data-src="/dist/components/geo-map/data/manifest.json" data-focus="continent:Europe"></div><script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/geo-map/geo-map.js"></script>',
      }),
    );
    // hold the chunk responses, so the queue is full when the map goes
    await p4.route(/\/data\/country-.*\.dgeo$/, async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.continue();
    });
    await p4.goto(`${server.url}/tests/e2e/__geo-detach.html`);
    await p4.waitForFunction(() => (globalThis as any).df$?.shadcn?.geoMap && document.querySelector('#gone-soon')?.getAttribute('data-geo-status') === 'ready');
    await p4.evaluate(() => document.querySelector('#gone-soon')!.remove());
    removed = true;
    await p4.waitForTimeout(2000);
    // only what was already in flight (at most 4 loads at a time) may still arrive
    assert.ok(chunks.length <= 4, `${chunks.length} chunks requested after the map was removed`);
    await p4.close();
  });

  await check('render() contract: default, selected, focused on every fixture map', async () => {
    const n = await assertRenderContract(page, '.geo-map[id]', ['default', 'selected', 'focused'], {
      runtimeAttrs: ['aria-busy', 'data-geo-status'],
      runtimeOwned: '.geo-map-svg, .geo-map-tooltip, .geo-map-error, datalist',
      settled: '.geo-map[data-geo-status="loading"], .geo-map[aria-busy]',
    });
    assert.ok(n >= 6, `${n} instances`);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\ngeo-map: all checks passed');
