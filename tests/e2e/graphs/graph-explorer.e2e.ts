import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: E2E for the shipped Graph Explorer (the graph-explorer PoC, ported). The worker builds a synthetic graph from
 * data-nodes + data-seed (ids are stable for a seed), so checks can name clusters.
 * Verifies: the worker boots from the component's own source and the viewport's chrome; the render budget (a
 * 1,000,000-node graph keeps a bounded DOM at the top and deep inside); the three Node UIs, the node-ui outlet and
 * the V key; selection by click and Shift-click with its event; every outlet and output of the Border Layout
 * application (breadcrumb, search, outline, details, relations, node-ui, the titles, status); diving by setState,
 * by the Enter action and by wheel zoom, and moving up by crumb, action and key; search; the expanded page (the
 * details Panel maximized) and back; Bring & Go; the keyboard map; the live breaker simulation; edge labels that do
 * not overlap; plugins (a node renderer on one element, a Node UI, the sanitizer); a theme change; destroy(); and
 * the State API + render() contract.
 */

const FIXTURE = '/tests/e2e/graphs/graph-explorer.e2e-fixture.html';
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
      const all = [...document.querySelectorAll('.graph-explorer')];
      return all.length > 0 && all.every((el) => el.getAttribute('data-graph-status') === 'ready' && (el as any).api);
    },
    null,
    { timeout: 30_000 },
  );
/** the explorer's state has settled and two frames ran */
const settle = async (page: Page, id: string): Promise<void> => {
  await page.evaluate((id) => (document.getElementById(id) as any).api.settled(), id);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120)))),
  );
};
const inspect = (page: Page, id: string, children = false): Promise<any> =>
  page.evaluate(([id, children]) => (globalThis as any).df$.shadcn.graphExplorer.inspect(`#${id}`, { children }), [
    id,
    children,
  ] as const);
const state = (page: Page, id: string): Promise<{ name: string; config: any }> =>
  page.evaluate((id) => {
    const s = (document.getElementById(id) as any).api.getState();
    return { name: s.name, config: s.config };
  }, id);
/** waits until the worker's frame drew slots for the current view */
const drawn = (page: Page, id: string): Promise<unknown> =>
  page.waitForFunction((id) => document.querySelectorAll(`#${id} .graph-explorer-node:not([hidden])`).length > 0, id, {
    timeout: 15_000,
  });

async function open(reduced = true): Promise<{ page: Page; errors: string[] }> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // a failed request is reported with its URL (the console only says "Failed to load resource")
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(`${server.url}${FIXTURE}`);
  await ready(page);
  return { page, errors };
}

const { page, errors } = await open();

try {
  await check('the worker builds the graph; the explorer is one focusable application with its chrome', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('ge-basic')!;
      const g = (globalThis as any).df$.shadcn.graphExplorer.inspect(el);
      return {
        role: el.getAttribute('role'),
        roledesc: el.getAttribute('aria-roledescription'),
        tabindex: el.tabIndex,
        busy: el.hasAttribute('aria-busy'),
        describedby: document.getElementById(el.getAttribute('aria-describedby')!)?.className,
        chrome: [...el.children].every((c) => c.hasAttribute('data-ce-chrome')),
        graph: g.graph,
        view: g.view,
      };
    });
    assert.equal(r.role, 'application');
    assert.equal(r.roledesc, 'graph');
    assert.equal(r.tabindex, 0);
    assert.equal(r.busy, false);
    assert.match(r.describedby ?? '', /graph-explorer-help/);
    assert.ok(r.chrome, 'every child of the explorer is chrome');
    assert.equal(r.graph.nodes, 20000);
    assert.equal(r.view, 'c0');
  });

  await check('icons: a mask in the current color, five sizes, a tone', async () => {
    const r = await page.evaluate(() =>
      [...document.querySelectorAll('#ge-icons .graph-explorer-icon')].map((i) => {
        const cs = getComputedStyle(i);
        return [
          cs.width,
          cs.maskImage.startsWith('url(') || (cs as any).webkitMaskImage?.startsWith('url('),
          cs.backgroundColor,
        ];
      }),
    );
    assert.deepEqual(
      r.map((x) => x[0]),
      ['12px', '14px', '16px', '24px', '32px'],
    );
    assert.ok(
      r.every((x) => x[1]),
      'each is a mask',
    );
    assert.notEqual(r[4][2], r[2][2], 'the tone colors it');
  });

  await check('the top level: chips for the domains, edges on the canvas, edge labels', async () => {
    await drawn(page, 'ge-basic');
    const i = await inspect(page, 'ge-basic');
    assert.ok(i.slots >= 3, `${i.slots} slots`);
    assert.ok(i.worker.dots > 50, `${i.worker.dots} dots`);
    assert.ok(i.worker.edges > 5, `${i.worker.edges} edges`);
    const chips = await page
      .locator('#ge-basic .graph-explorer-node:not([hidden]) .graph-explorer-chip[data-kind="cluster"]')
      .count();
    assert.ok(chips >= 3, `${chips} cluster chips`);
  });

  await check('Node UIs: health bars, compact chips, the authored data-node-ui', async () => {
    await drawn(page, 'ge-health');
    assert.ok(
      (await page.locator('#ge-health .graph-explorer-chip .graph-explorer-health').count()) > 0,
      'health bars',
    );
    assert.ok(
      (await page.locator('#ge-compact .graph-explorer-chip[data-density="compact"]').count()) > 0,
      'compact chips',
    );
    assert.equal((await state(page, 'ge-health')).config.nodeUi, 'health');
    assert.equal(await page.locator('#ge-health .graph-explorer-hud').isHidden(), false, 'data-hud shows the HUD');
    // the HUD samples while frames flow and once the loop rests
    await page.waitForFunction(
      () => /20,000 nodes/.test(document.querySelector('#ge-health .graph-explorer-hud')!.textContent ?? ''),
      null,
      { timeout: 5000 },
    );
  });

  await check('an authored focus starts inside the cluster; an authored selection is drawn selected', async () => {
    await settle(page, 'ge-focused');
    assert.equal((await inspect(page, 'ge-focused')).view, 'c3');
    assert.equal((await state(page, 'ge-focused')).name, 'focused');
    await settle(page, 'ge-picked');
    const picked = await state(page, 'ge-picked');
    assert.equal(picked.name, 'selected');
    assert.deepEqual(picked.config.selected, ['c2', 'c4']);
    await page.waitForFunction(
      () => document.querySelectorAll('#ge-picked .graph-explorer-node[data-selected]').length === 2,
    );
    assert.ok(await page.locator('#ge-picked').evaluate((el) => el.hasAttribute('data-dim')), 'the rest dims');
  });

  await check('the application: every outlet is filled with chrome', async () => {
    await drawn(page, 'ge-app');
    const r = await page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('[data-graph-explorer-for="ge-app"][data-graph-explorer-outlet]')].map((o) => [
          o.getAttribute('data-graph-explorer-outlet'),
          [...o.children].filter((c) => c.hasAttribute('data-ce-chrome')).map((c) => c.className),
        ]),
      ),
    );
    assert.deepEqual(Object.keys(r).sort(), ['breadcrumb', 'details', 'node-ui', 'outline', 'relations', 'search']);
    assert.deepEqual(r.breadcrumb, ['breadcrumb graph-explorer-path']);
    assert.deepEqual(r.search, ['graph-explorer-search']);
    assert.deepEqual(r.outline, ['graph-explorer-outline']);
    assert.deepEqual(r['node-ui'], ['graph-explorer-node-ui']);
    assert.match(await page.locator('#ge-layout .graph-explorer-path').innerText(), /All domains/);
    assert.equal(await page.locator('#ge-layout .graph-explorer-outline-item[data-graph-explorer-outline]').count(), 6);
    assert.match(await page.locator('#ge-layout .graph-explorer-details').innerText(), /Nothing selected/);
    assert.equal(await page.locator('#ge-details-t').textContent(), 'Details');
    assert.equal(await page.locator('#ge-graph-t').textContent(), 'All domains', 'the view output');
  });

  await check('a click on a chip selects it: details, relations, titles, the event and the state follow', async () => {
    const events: unknown[] = [];
    await page.exposeFunction('__geSelect', (d: unknown) => events.push(d));
    await page.evaluate(() =>
      document
        .getElementById('ge-app')!
        .addEventListener('graph-explorer-select', (e: any) => (globalThis as any).__geSelect(e.detail)),
    );
    const chip = page.locator('#ge-app .graph-explorer-node:not([hidden])').first();
    const id = await chip.getAttribute('data-node');
    await chip.click();
    await page.waitForFunction((id) => document.getElementById('ge-app')!.getAttribute('data-selected') === id, id);
    assert.deepEqual((await state(page, 'ge-app')).config.selected, [id]);
    assert.equal((await state(page, 'ge-app')).name, 'selected');
    await page.waitForFunction(() =>
      document.querySelector('#ge-layout .graph-explorer-details .graph-explorer-stats'),
    );
    const label = await page.evaluate(
      (id) =>
        (globalThis as any).df$.shadcn.graphExplorer
          .inspect('#ge-app', { children: true })
          .children.find((c: any) => c.id === id).label,
      id,
    );
    assert.equal(await page.locator('#ge-details-t').textContent(), label);
    await page.waitForFunction(
      (label) => (document.getElementById('ge-relations-sub')!.textContent ?? '').startsWith(label + ' · '),
      label,
    );
    await page.waitForFunction(() =>
      document.querySelector('#ge-layout .graph-explorer-relations .graph-explorer-rel-table'),
    );
    await page.waitForTimeout(100);
    assert.deepEqual(events.at(-1), { selected: [id], edge: null });
    // Shift adds a second node
    const other = page.locator(`#ge-app .graph-explorer-node:not([hidden]):not([data-node="${id}"])`).first();
    const id2 = await other.getAttribute('data-node');
    await other.click({ modifiers: ['Shift'] });
    await page.waitForFunction(
      ([a, b]) => document.getElementById('ge-app')!.getAttribute('data-selected') === `${a} ${b}`,
      [id, id2],
    );
  });

  await check('the outline: a row selects its node; the filter narrows the level', async () => {
    const row = page.locator('#ge-layout .graph-explorer-outline-item[data-graph-explorer-outline]').nth(1);
    await row.click();
    const idx = Number(await row.getAttribute('data-graph-explorer-outline'));
    const id = await page.evaluate(
      (i) => (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app', { children: true }).children[i].id,
      idx,
    );
    await page.waitForFunction((id) => document.getElementById('ge-app')!.getAttribute('data-selected') === id, id);
    await page.fill('#ge-layout .graph-explorer-outline-filter', 'zzzz');
    await page.waitForFunction(() =>
      /No match/.test(document.querySelector('#ge-layout .graph-explorer-outline-list')!.textContent ?? ''),
    );
    await page.fill('#ge-layout .graph-explorer-outline-filter', '');
  });

  await check('setState focused dives; a crumb, the Out action and Backspace move up', async () => {
    await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('focused', { focus: 'c3' }));
    await settle(page, 'ge-app');
    assert.equal((await inspect(page, 'ge-app')).view, 'c3');
    assert.equal(await page.locator('#ge-layout .graph-explorer-path .breadcrumb-item').count(), 2);
    assert.equal(await page.locator('#ge-app').getAttribute('data-focus'), 'c3');
    await page.click('#ge-layout .graph-explorer-path [data-graph-explorer-crumb="c0"]');
    await page.waitForFunction(() => (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app').view === 'c0');
    assert.equal(await page.locator('#ge-app').getAttribute('data-focus'), null);
    assert.equal((await state(page, 'ge-app')).name !== 'focused', true);
    await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('focused', { focus: 'c3' }));
    await settle(page, 'ge-app');
    await page.click('[data-graph-explorer-for="ge-app"][data-graph-explorer-action="up"]');
    await page.waitForFunction(() => (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app').view === 'c0');
    await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('focused', { focus: 'c2' }));
    await settle(page, 'ge-app');
    await page.locator('#ge-app').focus();
    await page.keyboard.press('Backspace');
    await page.waitForFunction(() => (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app').view === 'c0');
  });

  // VERIFIED defect: after climbing to an ancestor the camera still showed the child as entered, and the zoom dove
  // straight back into it - the ancestor and the selection were lost
  await check('focusing an ancestor from inside a child stays there with the selection', async () => {
    await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('focused', { focus: 'c3' }));
    await settle(page, 'ge-app');
    const sys = await page.evaluate(
      () => (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app', { children: true }).children[0].id,
    );
    await page.evaluate(
      (sys) => (document.getElementById('ge-app') as any).api.setState('focused', { focus: sys }),
      sys,
    );
    await settle(page, 'ge-app');
    assert.equal((await inspect(page, 'ge-app')).view, sys);
    await page.evaluate(
      (sys) => (document.getElementById('ge-app') as any).api.setState('focused', { focus: 'c3', selected: [sys] }),
      sys,
    );
    await settle(page, 'ge-app');
    await page.waitForTimeout(500);
    assert.equal((await inspect(page, 'ge-app')).view, 'c3');
    assert.deepEqual((await state(page, 'ge-app')).config, {
      focus: 'c3',
      selected: [sys],
      nodeUi: 'default',
      expanded: false,
      edge: null,
    });
    await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('default'));
    await settle(page, 'ge-app');
  });

  await check("a card's Enter action and the wheel enter clusters; the focus event names the path", async () => {
    const focusEvents: any[] = [];
    await page.exposeFunction('__geFocus', (d: unknown) => focusEvents.push(d));
    await page.evaluate(() =>
      document
        .getElementById('ge-app')!
        .addEventListener('graph-explorer-focus', (e: any) => (globalThis as any).__geFocus(e.detail)),
    );
    // zoom with the wheel over the first domain until the view enters it
    const target = await page.evaluate(() => {
      const g = (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app', { children: true });
      const el = document.getElementById('ge-app')!.getBoundingClientRect();
      const n = g.children[0];
      return {
        id: n.id,
        x: el.left + el.width / 2 + (n.x - g.cam.cx) * g.cam.z,
        y: el.top + el.height / 2 + (n.y - g.cam.cy) * g.cam.z,
      };
    });
    await page.mouse.move(target.x, target.y);
    for (let k = 0; k < 40; k++) {
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(30);
      if ((await inspect(page, 'ge-app')).view !== 'c0') break;
    }
    await page.waitForFunction(
      (id) => (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app').view === id,
      target.id,
      { timeout: 5000 },
    );
    await page.waitForTimeout(100);
    assert.equal(focusEvents.at(-1)?.focus, target.id);
    assert.equal(focusEvents.at(-1)?.path.length, 2);
    assert.equal(
      await page.locator('#ge-app').getAttribute('data-focus'),
      target.id,
      'a dive by zoom is recorded as the state',
    );
    await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('default'));
    await settle(page, 'ge-app');
    // the details' Enter action
    await page.evaluate(() =>
      (document.getElementById('ge-app') as any).api.setState('selected', { selected: ['c2'] }),
    );
    await settle(page, 'ge-app');
    await page.click('#ge-layout .graph-explorer-details [data-graph-explorer-action="enter"]');
    await page.waitForFunction(
      () => (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app').view === 'c2',
      null,
      { timeout: 5000 },
    );
    await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('default'));
    await settle(page, 'ge-app');
    // a cluster as big as most of the viewport is a card with an Enter button (just below the size that enters it)
    await page.evaluate(() => {
      const el: any = document.getElementById('ge-basic');
      const g = (globalThis as any).df$.shadcn.graphExplorer.inspect(el, { children: true });
      const n = g.children[1];
      return (globalThis as any).df$.shadcn.graphExplorer.flyTo(el, {
        cx: n.x,
        cy: n.y,
        z: (0.8 * Math.min(el.clientWidth, el.clientHeight)) / (2 * n.r),
      });
    });
    await page.waitForFunction(
      () => document.querySelector('#ge-basic .graph-explorer-node:not([hidden]) .graph-explorer-card-enter'),
      null,
      { timeout: 10_000 },
    );
    const card = page.locator('#ge-basic .graph-explorer-node:not([hidden]):has(.graph-explorer-card-enter)').first();
    const cid = await card.getAttribute('data-node');
    await card.locator('.graph-explorer-card-enter').click();
    await page.waitForFunction(
      (id) => (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-basic').view === id,
      cid,
      { timeout: 5000 },
    );
    await page.evaluate(() => (document.getElementById('ge-basic') as any).api.setState('default'));
    await settle(page, 'ge-basic');
  });

  await check('search: the outlet finds a node; Enter flies there and selects it', async () => {
    const input = page.locator('#ge-layout .graph-explorer-search-input');
    await input.fill('ledger');
    await page.waitForFunction(
      () => document.querySelectorAll('#ge-layout .graph-explorer-results [role="option"]').length > 0,
      null,
      { timeout: 10_000 },
    );
    assert.equal(await input.getAttribute('aria-expanded'), 'true');
    assert.match((await input.getAttribute('aria-activedescendant')) ?? '', /-r0$/);
    const first = await page
      .locator('#ge-layout .graph-explorer-results [role="option"]')
      .first()
      .locator('.graph-explorer-result-label')
      .textContent();
    await input.press('Enter');
    await page.waitForFunction(
      () =>
        !(globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app').navigating &&
        document.getElementById('ge-app')!.hasAttribute('data-selected'),
      null,
      { timeout: 15_000 },
    );
    const sel = await page.locator('#ge-app').getAttribute('data-selected');
    const label = await page.evaluate(
      (id) =>
        (globalThis as any).df$.shadcn.graphExplorer
          .inspect('#ge-app', { children: true })
          .children.find((c: any) => c.id === id)?.label,
      sel,
    );
    assert.equal(label, first);
    assert.equal(await input.getAttribute('aria-expanded'), 'false');
    await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('default'));
    await settle(page, 'ge-app');
  });

  await check("expand: the details Panel maximizes with the node's page; Escape and Back return", async () => {
    await page.evaluate(() =>
      (document.getElementById('ge-app') as any).api.setState('selected', { selected: ['c2'] }),
    );
    await settle(page, 'ge-app');
    await page.locator('#ge-app').focus();
    await page.keyboard.press('e');
    await page.waitForFunction(() => document.getElementById('ge-details')!.hasAttribute('data-maximized'));
    await page.waitForFunction(() =>
      document.querySelector('#ge-layout .graph-explorer-details .graph-explorer-page .graph-explorer-kpis'),
    );
    assert.equal(await page.locator('#ge-app').getAttribute('data-expanded'), '');
    assert.equal((await state(page, 'ge-app')).config.expanded, true);
    await page.click('#ge-layout .graph-explorer-details [data-graph-explorer-action="collapse"]');
    await page.waitForFunction(() => !document.getElementById('ge-details')!.hasAttribute('data-maximized'));
    assert.equal(await page.locator('#ge-app').getAttribute('data-expanded'), null);
    // by the State API, and back by Escape on the graph
    await page.evaluate(() =>
      (document.getElementById('ge-app') as any).api.setState('selected', { selected: ['c2'], expanded: true }),
    );
    await settle(page, 'ge-app');
    assert.ok(await page.locator('#ge-details').evaluate((el) => el.hasAttribute('data-maximized')));
    await page.locator('#ge-app').focus();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('ge-app')!.hasAttribute('data-expanded'));
  });

  await check(
    'the keyboard: arrows move the focus, ? opens the map, 0 fits, V cycles the Node UI (the outlet follows)',
    async () => {
      await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('default'));
      await settle(page, 'ge-app');
      await page.locator('#ge-app').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(
        () => /· \d+ of \d+ in /.test(document.getElementById('ge-status')!.textContent ?? ''),
        null,
        { timeout: 3000 },
      );
      await page.keyboard.press('?');
      assert.ok(await page.locator('#ge-app .graph-explorer-help').evaluate((el) => el.matches(':popover-open')));
      await page.keyboard.press('Escape');
      assert.equal(
        await page.locator('#ge-app .graph-explorer-help').evaluate((el) => el.matches(':popover-open')),
        false,
      );
      await page.locator('#ge-app').focus();
      await page.keyboard.press('v');
      await page.waitForFunction(
        () => document.getElementById('ge-app')!.getAttribute('data-node-ui') === 'health',
        null,
        { timeout: 3000 },
      );
      assert.equal(
        await page.locator('#ge-layout [data-graph-explorer-node-ui="health"]').getAttribute('aria-pressed'),
        'true',
      );
      await page.click('#ge-layout [data-graph-explorer-node-ui="default"]');
      await page.waitForFunction(() => !document.getElementById('ge-app')!.hasAttribute('data-node-ui'));
      assert.equal((await state(page, 'ge-app')).config.nodeUi, 'default');
    },
  );

  await check('Bring & Go: B rings the neighbours; choosing one travels there and selects it', async () => {
    await page.evaluate(() =>
      (document.getElementById('ge-app') as any).api.setState('selected', { selected: ['c2'] }),
    );
    await settle(page, 'ge-app');
    await page.evaluate(() => {
      const inst = (document.getElementById('ge-app') as any)._graphExplorer;
      inst.kbd = inst.view.byId.get('c2');
    });
    await page.locator('#ge-app').focus();
    await page.keyboard.press('b');
    await page.waitForFunction(() => document.querySelectorAll('#ge-app .graph-explorer-ring-item').length > 0);
    const item = page.locator('#ge-app .graph-explorer-ring-item').first();
    await page.waitForTimeout(400);
    const j = Number(await item.getAttribute('data-graph-explorer-ring'));
    const id = await page.evaluate(
      (j) => (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app', { children: true }).children[j].id,
      j,
    );
    await item.click();
    await page.waitForFunction((id) => document.getElementById('ge-app')!.getAttribute('data-selected') === id, id);
    assert.ok(await page.locator('#ge-app .graph-explorer-ring').isHidden());
  });

  await check('the live breaker simulation: the action toggles it and patches arrive', async () => {
    await page.evaluate(() => {
      const inst = (document.getElementById('ge-app') as any)._graphExplorer;
      inst.__patches = 0;
      const on = inst.onPatch.bind(inst);
      inst.onPatch = (m: unknown) => {
        inst.__patches++;
        on(m);
      };
    });
    const live = page.locator('[data-graph-explorer-for="ge-app"][data-graph-explorer-action="live"]');
    await live.click();
    assert.equal(await live.getAttribute('aria-pressed'), 'true');
    await page.waitForFunction(() => (document.getElementById('ge-app') as any)._graphExplorer.__patches > 0, null, {
      timeout: 10_000,
    });
    await live.click();
    assert.equal(await live.getAttribute('aria-pressed'), 'false');
  });

  await check(
    'a link: a click on its label selects it - details from the worker, its single links, the state, E and Esc',
    async () => {
      await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('default'));
      await settle(page, 'ge-app');
      await page.waitForFunction(() =>
        document.querySelector('#ge-app .graph-explorer-edge-label:not([hidden])[data-graph-explorer-edge]'),
      );
      const host = page.locator('#ge-app .graph-explorer-edge-label:not([hidden])[data-graph-explorer-edge]').first();
      const id = (await host.getAttribute('data-graph-explorer-edge'))!;
      await host.click();
      await page.waitForFunction(
        (id) => document.getElementById('ge-app')!.getAttribute('data-selected-edge') === id,
        id,
      );
      const st = await state(page, 'ge-app');
      assert.equal(st.name, 'selected');
      assert.deepEqual([st.config.edge, st.config.selected], [id, []]);
      assert.ok(await page.locator('#ge-app .graph-explorer-edge-label[data-selected]').count(), 'its label is marked');
      // the worker scans the leaves: its counts each way are the view's aggregate counts
      await page.waitForFunction(() =>
        document.querySelector('#ge-layout .graph-explorer-details .graph-explorer-stats'),
      );
      const edge = (await inspect(page, 'ge-app', true)).edges.find((e: any) => e.id === id);
      const facts = await page.evaluate(() =>
        Object.fromEntries(
          [...document.querySelectorAll('#ge-layout .graph-explorer-details .graph-explorer-stat')].map((s) => [
            s.querySelector('dt')!.textContent,
            s.querySelector('dd')!.textContent,
          ]),
        ),
      );
      assert.equal(facts.Forward, edge.count.toLocaleString('en-US'));
      assert.equal(facts.Back, edge.count2.toLocaleString('en-US'));
      const [a, b] = id.split('>');
      const labels = await page.evaluate(
        ([a, b]) => {
          const kids = (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app', { children: true }).children;
          return [kids.find((c: any) => c.id === a).label, kids.find((c: any) => c.id === b).label];
        },
        [a, b],
      );
      assert.equal(await page.locator('#ge-details-t').textContent(), labels[0] + ' → ' + labels[1]);
      await page.waitForFunction(
        (t) => (document.getElementById('ge-relations-sub')!.textContent ?? '').startsWith(t),
        labels[0] + ' → ' + labels[1],
      );
      // E expands the link's page, Escape returns, Escape again lets the link go
      await page.locator('#ge-app').focus();
      await page.keyboard.press('e');
      await page.waitForFunction(() => document.getElementById('ge-details')!.hasAttribute('data-maximized'));
      await page.waitForFunction(() =>
        document.querySelector('#ge-layout .graph-explorer-details .graph-explorer-page .graph-explorer-kpis'),
      );
      assert.equal((await state(page, 'ge-app')).config.expanded, true);
      await page.click('#ge-layout .graph-explorer-details [data-graph-explorer-action="collapse"]');
      await page.waitForFunction(() => !document.getElementById('ge-app')!.hasAttribute('data-expanded'));
      await page.locator('#ge-app').focus();
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.getElementById('ge-app')!.hasAttribute('data-selected-edge'));
      // setState names a link; a node selection then replaces it
      await page.evaluate(
        (id) => (document.getElementById('ge-app') as any).api.setState('selected', { edge: id }),
        id,
      );
      await settle(page, 'ge-app');
      assert.equal(await page.locator('#ge-app').getAttribute('data-selected-edge'), id);
      await page.evaluate(() =>
        (document.getElementById('ge-app') as any).api.setState('selected', { selected: ['c2'] }),
      );
      await settle(page, 'ge-app');
      assert.deepEqual(
        [await page.locator('#ge-app').getAttribute('data-selected-edge'), (await state(page, 'ge-app')).config.edge],
        [null, null],
      );
      // the details' link button inspects a relation's link
      await page.waitForSelector('#ge-layout .graph-explorer-details .graph-explorer-row-link');
      const link = await page
        .locator('#ge-layout .graph-explorer-details .graph-explorer-row-link')
        .first()
        .getAttribute('data-graph-explorer-edge');
      await page.click('#ge-layout .graph-explorer-details .graph-explorer-row-link');
      await page.waitForFunction(() => document.getElementById('ge-app')!.hasAttribute('data-selected-edge'));
      const picked = await page.locator('#ge-app').getAttribute('data-selected-edge');
      assert.ok(picked === link || picked === link!.split('>').reverse().join('>'), `${picked} for ${link}`);
    },
  );

  await check('an authored link starts selected', async () => {
    await page.waitForFunction(() => document.getElementById('ge-link')?.getAttribute('data-graph-status') === 'ready');
    await settle(page, 'ge-link');
    const st = await state(page, 'ge-link');
    assert.deepEqual([st.name, st.config.edge], ['selected', 'c1>c6']);
    assert.equal(await page.locator('#ge-link').getAttribute('data-dim'), '');
  });

  await check(
    'islands: a component in the details keeps its element and what its script made across re-renders',
    async () => {
      await page.evaluate(() => {
        const ge = (globalThis as any).df$.shadcn.graphExplorer;
        (globalThis as any).__islandOff = ge.register(document.getElementById('ge-app'), {
          kind: 'detail',
          name: 'island-probe',
          match: (n: any) => (n.id === 'c2' ? 99 : false),
          render: (n: any, c: any) => {
            const late = c.request('late:' + n.id, () => new Promise((r) => setTimeout(() => r('ready'), 250)));
            return c.html`<p class="ge-island-state">${late ?? 'waiting'}</p>${c.island('probe:' + n.id, c.html`<div class="ge-island"></div>`)}`;
          },
        });
      });
      try {
        await page.evaluate(() =>
          (document.getElementById('ge-app') as any).api.setState('selected', { selected: ['c3'] }),
        );
        await settle(page, 'ge-app');
        await page.evaluate(() =>
          (document.getElementById('ge-app') as any).api.setState('selected', { selected: ['c2'] }),
        );
        await settle(page, 'ge-app');
        await page.waitForSelector('#ge-layout .graph-explorer-details .ge-island', { state: 'attached' });
        // what a script would do: mark the element and draw into it
        await page.evaluate(() => {
          const el: any = document.querySelector('#ge-layout .graph-explorer-details .ge-island');
          el.__mine = true;
          el.append(document.createElement('canvas'));
        });
        await page.waitForFunction(
          () => document.querySelector('#ge-layout .ge-island-state')?.textContent === 'ready',
        );
        const kept = await page.evaluate(() => {
          const el: any = document.querySelector('#ge-layout .graph-explorer-details .ge-island');
          return { same: el.__mine === true, canvas: !!el.querySelector('canvas') };
        });
        assert.deepEqual(kept, { same: true, canvas: true });
      } finally {
        // a failed check must not leave the probe renderer over c2's page for the checks after it
        await page.evaluate(() => (globalThis as any).__islandOff());
      }
    },
  );

  await check(
    'drill-down: a name on an expanded page opens its page, which stays expanded; the state records only where it lands',
    async () => {
      await page.evaluate(() =>
        (document.getElementById('ge-app') as any).api.setState('selected', { selected: ['c2'], expanded: true }),
      );
      await settle(page, 'ge-app');
      // the first wide card holds the children ("Loading..." until they arrive), the next one the relations to siblings
      const child = page
        .locator('#ge-layout .graph-explorer-page .graph-explorer-page-card[data-wide]')
        .first()
        .locator('.graph-explorer-link')
        .first();
      await child.waitFor();
      const seen: unknown[] = [];
      await page.exposeFunction('__geDrill', (s: unknown) => seen.push(s));
      await page.evaluate(() =>
        (document.getElementById('ge-app') as any).store.subscribe((s: any) =>
          (globalThis as any).__geDrill({ selected: s.config.selected, expanded: s.config.expanded }),
        ),
      );
      const id = await child.getAttribute('data-graph-explorer-goto');
      await child.click();
      await page.waitForFunction((id) => document.getElementById('ge-app')!.getAttribute('data-selected') === id, id);
      await settle(page, 'ge-app');
      assert.ok(
        await page.locator('#ge-details').evaluate((el) => el.hasAttribute('data-maximized')),
        'still maximized',
      );
      const st = await state(page, 'ge-app');
      assert.deepEqual(
        [st.name, st.config.focus, st.config.selected, st.config.expanded],
        ['focused', 'c2', [id], true],
      );
      await page.waitForTimeout(100);
      assert.ok(seen.length > 0 && seen.every((s: any) => s.expanded), JSON.stringify(seen));
      // the path above the title goes back up
      await page.click('#ge-layout .graph-explorer-page .graph-explorer-trail [data-graph-explorer-goto="c2"]');
      await page.waitForFunction(() => document.getElementById('ge-app')!.getAttribute('data-selected') === 'c2');
      assert.equal((await state(page, 'ge-app')).config.expanded, true);
      await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('default'));
      await settle(page, 'ge-app');
    },
  );

  await check('a cluster page: every entity below it in a Data Grid; the shares follow its filters; a row opens its page', async () => {
    await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('selected', { selected: ['c2'], expanded: true }));
    await settle(page, 'ge-app');
    const grid = '#ge-layout .graph-explorer-page .graph-explorer-records .data-grid';
    await page.waitForSelector(grid + ' .data-grid-row[data-index]', { timeout: 15_000 });
    // as many rows as nodes below the cluster: the worker built every one
    const members = (await inspect(page, 'ge-app', true)).children.find((c: any) => c.id === 'c2');
    const d = await page.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.source(document.querySelector('#ge-layout .graph-explorer-records .data-grid')).rows.length);
    const below = await page.evaluate(() => {
      const view = (document.getElementById('ge-app') as any)._graphExplorer.view;
      return view.children.find((n: any) => n.id === 'c2').members;
    });
    assert.ok(members, 'c2 is in the view');
    assert.equal(d, below, 'one row per entity below c2');
    assert.equal(await page.getAttribute(grid, 'aria-rowcount'), String(below + 2));
    assert.match((await page.textContent('#ge-layout .graph-explorer-records-count')) ?? '', new RegExp(`^${below.toLocaleString('en-US')} of ${below.toLocaleString('en-US')} entities`));
    // a filter: the count and every share follow it
    await page.selectOption(grid + ' .data-grid-filter[data-field="type"]', 'Dataset');
    await page.waitForFunction(() => /match the filters/.test(document.querySelector('#ge-layout .graph-explorer-records-count')!.textContent ?? ''));
    const datasets = await page.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.rows(document.querySelector('#ge-layout .graph-explorer-records .data-grid')).length);
    const shares = await page.$$eval('#ge-layout .graph-explorer-records-share', (list) =>
      list.map((s) => [...s.querySelectorAll('.graph-explorer-share-value')].reduce((n, v) => n + Number(v.textContent!.replace(/,/g, '')), 0)),
    );
    assert.deepEqual(shares, [datasets, datasets, datasets], 'each share list adds up to the rows the grid shows');
    assert.equal(await page.textContent('#ge-layout .graph-explorer-records-share .graph-explorer-share-name'), 'Dataset');
    // a row's name opens its page: the drill-down goes on from the grid
    const name = page.locator(grid + ' .data-grid-row[data-index] .graph-explorer-link').first();
    const id = await name.getAttribute('data-graph-explorer-goto');
    await name.click();
    await page.waitForFunction((id) => document.getElementById('ge-app')!.getAttribute('data-selected') === id, id);
    await settle(page, 'ge-app');
    assert.equal((await state(page, 'ge-app')).config.expanded, true);
    assert.ok(await page.locator('#ge-details').evaluate((el) => el.hasAttribute('data-maximized')), 'the page stays');
  });

  await check('a link page: every single link both ways in a Data Grid - as many as the worker counted', async () => {
    const edge = (await inspect(page, 'ge-app', true)).edges[0];
    await page.evaluate((id) => (document.getElementById('ge-app') as any).api.setState('selected', { edge: id, expanded: true }), edge?.id ?? 'c1>c6');
    await settle(page, 'ge-app');
    const top = await inspect(page, 'ge-app', true);
    const picked = top.edges.find((e: any) => e.id === (edge?.id ?? 'c1>c6'));
    await page.waitForFunction(() => / links/.test(document.querySelector('#ge-layout .graph-explorer-records-count')?.textContent ?? ''), null, { timeout: 15_000 });
    const n = await page.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.source(document.querySelector('#ge-layout .graph-explorer-records .data-grid')).rows.length);
    assert.equal(n, picked.count + picked.count2);
    const ways = await page.$$eval('#ge-layout .graph-explorer-records-share:nth-child(2) li', (list) =>
      Object.fromEntries(list.map((li) => [li.querySelector('.graph-explorer-share-name')!.textContent, Number(li.querySelector('.graph-explorer-share-value')!.textContent!.replace(/,/g, ''))])),
    );
    assert.deepEqual([ways.forward ?? 0, ways.back ?? 0], [picked.count, picked.count2]);
    await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('default'));
    await settle(page, 'ge-app');
  });

  await check('expand only where a page can show: no details outlet - no Expand button on the cards, E only selects', async () => {
    const cards = async (id: string) => {
      await page.evaluate(async (id) => {
        const el = document.getElementById(id) as any;
        el.api.setState('focused', { focus: 'c2' });
        await el.api.settled();
      }, id);
      const el = page.locator('#' + id);
      await el.scrollIntoViewIfNeeded();
      const box = (await el.boundingBox())!;
      for (let k = 0; k < 14 && !(await page.locator(`#${id} .graph-explorer-node[data-tier="card"]`).count()); k++) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, -120);
        await page.waitForTimeout(200);
      }
      return page.evaluate((id) => {
        const el = document.getElementById(id)!;
        return [el.querySelectorAll('.graph-explorer-node[data-tier="card"]').length, el.querySelectorAll('.graph-explorer-card-expand').length];
      }, id);
    };
    const [appCards, appExpand] = await cards('ge-app');
    assert.ok(appCards > 0 && appExpand === appCards, `with a details outlet every card offers Expand (${appExpand} of ${appCards})`);
    const [bareCards, bareExpand] = await cards('ge-focused');
    assert.ok(bareCards > 0, 'the bare explorer draws cards');
    assert.equal(bareExpand, 0, 'without a details outlet no card offers Expand');
    const child = await page.evaluate(async () => {
      const el = document.getElementById('ge-focused') as any;
      const id = el._graphExplorer.view.children[0].id;
      el.api.setState('focused', { focus: 'c2', selected: [id], expanded: true });
      await el.api.settled();
      return id;
    });
    const st = await state(page, 'ge-focused');
    assert.deepEqual([st.config.selected, st.config.expanded], [[child], false], 'expanded: nothing to expand to');
    for (const id of ['ge-app', 'ge-focused']) {
      await page.evaluate((id) => (document.getElementById(id) as any).api.setState('default'), id);
      await settle(page, id);
    }
  });

  await check(
    'the names the worker draws beside small nodes: measured, and the edge labels keep clear of them',
    async () => {
      await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('focused', { focus: 'c2' }));
      await settle(page, 'ge-app');
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => {
        const el = document.getElementById('ge-app')!,
          box = el.getBoundingClientRect();
        const dots = (globalThis as any).df$.shadcn.graphExplorer.inspect('#ge-app', { children: true })
          .dotLabels as number[][];
        const labels = [...el.querySelectorAll('.graph-explorer-edge-label:not([hidden])')].map((l) => {
          const q = l.firstElementChild!.getBoundingClientRect();
          return [q.left - box.left, q.top - box.top, q.width, q.height];
        });
        const hit = [];
        for (const [x, y, w, h] of dots)
          for (const [lx, ly, lw, lh] of labels)
            if (x < lx + lw - 1 && x + w - 1 > lx && y < ly + lh - 1 && y + h - 1 > ly) hit.push([x, y, lx, ly]);
        return { dots: dots.length, labels: labels.length, hit };
      });
      assert.ok(r.dots > 0, 'names are drawn');
      assert.deepEqual(r.hit, [], JSON.stringify(r));
    },
  );

  await check('edge labels never overlap each other', async () => {
    await page.evaluate(() => (document.getElementById('ge-app') as any).api.setState('default'));
    await settle(page, 'ge-app');
    await page.waitForTimeout(300);
    const boxes = await page.evaluate(() =>
      [...document.querySelectorAll('#ge-app .graph-explorer-edge-label:not([hidden])')].map((l) => {
        const r = l.firstElementChild!.getBoundingClientRect();
        return [r.left, r.top, r.right, r.bottom];
      }),
    );
    assert.ok(boxes.length > 0, 'labels are drawn');
    for (let a = 0; a < boxes.length; a++)
      for (let b = a + 1; b < boxes.length; b++) {
        const [l1, t1, r1, b1] = boxes[a],
          [l2, t2, r2, b2] = boxes[b];
        assert.ok(r1 <= l2 + 1 || r2 <= l1 + 1 || b1 <= t2 + 1 || b2 <= t1 + 1, `labels ${a} and ${b} overlap`);
      }
  });

  await check('plugins: a node renderer on one element, a Node UI, the sanitizer, unregister', async () => {
    const r = await page.evaluate(async () => {
      const ge = (globalThis as any).df$.shadcn.graphExplorer;
      const el = document.getElementById('ge-basic')!;
      const off = ge.register(el, {
        kind: 'node',
        name: 'probe',
        match: (n: any) => (n.kind === 'cluster' ? 5 : false),
        sizes: { chip: [150, 26], card: [200, 80] },
        render: (n: any, c: any) =>
          c.html`<span class="graph-explorer-chip probe-chip"><img alt="" onerror="globalThis.__pwned = 1"><a href=" javascript:alert(1)">x</a>${n.label}</span>`,
      });
      const offUi = ge.register('global', {
        kind: 'node',
        name: 'probe-ui',
        variant: 'probe',
        variantLabel: 'Probe',
        match: () => 0,
        sizes: { chip: [120, 24], card: [160, 60] },
        render: (n: any, c: any) => c.html`<span class="graph-explorer-chip">${n.label}</span>`,
      });
      await new Promise((r) => setTimeout(r, 300));
      const chip = el.querySelector('.probe-chip');
      const out = {
        chips: el.querySelectorAll('.probe-chip').length,
        onerror: chip?.querySelector('img')?.hasAttribute('onerror'),
        href: chip?.querySelector('a')?.getAttribute('href') ?? null,
        pwned: (globalThis as any).__pwned ?? 0,
        uis: ge.nodeUis('#ge-app').map((u: any) => u.name),
        outlet: !!document.querySelector('#ge-layout [data-graph-explorer-node-ui="probe"]'),
        others: document.querySelectorAll('#ge-health .probe-chip').length,
      };
      off();
      offUi();
      await new Promise((r) => setTimeout(r, 300));
      return { ...out, after: el.querySelectorAll('.probe-chip').length, uisAfter: ge.nodeUis('#ge-app').length };
    });
    assert.ok(r.chips > 0, 'the element plugin draws its chips');
    assert.equal(r.others, 0, 'only on its element');
    assert.equal(r.onerror, false, 'on* attributes are stripped');
    assert.equal(r.href, null, 'javascript: URLs are stripped');
    assert.equal(r.pwned, 0);
    assert.deepEqual(r.uis, ['default', 'health', 'compact', 'probe']);
    assert.ok(r.outlet, 'the node-ui outlet offers the plugin Node UI');
    assert.equal(r.after, 0, 'unregister removes it');
    assert.equal(r.uisAfter, 3);
  });

  await check('a theme change reaches the canvas palette', async () => {
    const before = await page.evaluate(() => (document.getElementById('ge-basic') as any)._graphExplorer.palette);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForFunction(
      (paper) => (document.getElementById('ge-basic') as any)._graphExplorer.palette.paper !== paper,
      before.paper,
    );
    const after = await page.evaluate(() => (document.getElementById('ge-basic') as any)._graphExplorer.palette);
    assert.equal(after.dark, true);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
  });

  await check('the render budget: a 1,000,000-node graph keeps a bounded DOM, at the top and deep inside', async () => {
    const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await p2.emulateMedia({ reducedMotion: 'reduce' });
    await p2.route(`${server.url}/tests/e2e/__graph-million.html`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><link rel="stylesheet" href="/dist/theme/utils/default-semantic-tokens.css"><link rel="stylesheet" href="/dist/components/core.css"><link rel="stylesheet" href="/dist/components/graph-explorer/graph-explorer.css">
          <div class="graph-explorer" id="big" data-nodes="1000000" style="block-size: 800px"></div>
          <script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/graph-explorer/graph-explorer.js"></script>`,
      }),
    );
    await p2.goto(`${server.url}/tests/e2e/__graph-million.html`);
    await p2.waitForFunction(
      () => document.getElementById('big')?.getAttribute('data-graph-status') === 'ready',
      null,
      { timeout: 60_000 },
    );
    const top = await p2.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.inspect('#big'));
    assert.equal(top.graph.nodes, 1000000);
    // deep: a system's entities
    const path = await p2.evaluate(async () => {
      const ge = (globalThis as any).df$.shadcn.graphExplorer;
      await ge.navigate('#big', 'n123456');
      await new Promise((r) => setTimeout(r, 600));
      return ge.inspect('#big');
    });
    assert.notEqual(path.view, 'c0');
    for (const i of [top, path]) {
      assert.ok(i.slots <= 420, `${i.slots} slots`);
      assert.ok(i.elements < 700, `${i.elements} elements in the explorer`);
    }
    assert.equal(await p2.locator('#big').getAttribute('data-selected'), 'n123456');
    await p2.close();
  });

  await check('destroy(): the worker ends, the chrome goes, the State API is unbound', async () => {
    const r = await page.evaluate(() => {
      const el: any = document.getElementById('ge-compact');
      (globalThis as any).df$.shadcn.graphExplorer.destroy(el);
      return { children: el.children.length, api: !!el.api, init: el.hasAttribute('data-init') };
    });
    assert.deepEqual(r, { children: 0, api: false, init: true });
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render() contract: default, selected, focused on every fixture explorer', async () => {
    const n = await assertRenderContract(page, '.graph-explorer[id]', ['default', 'selected', 'focused'], {
      runtimeAttrs: [
        'aria-busy',
        'data-graph-status',
        'data-dim',
        'data-panning',
        'tabindex',
        'role',
        'aria-roledescription',
        'aria-describedby',
      ],
      runtimeOwned: '[data-ce-chrome]',
      settled: '.graph-explorer[aria-busy]',
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
console.log('\ngraph-explorer: all checks passed');
