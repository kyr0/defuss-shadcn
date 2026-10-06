import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: a diagram is only as good as its wires - drawn from the measured
 * layout, anchored to the right sides and field rows, never through a node -
 * and its two derived views: the step-by-step playback (one state API the
 * toolbar, the clock and code all drive) and the before / changes / after
 * delta built from one annotated source. These checks pin those, the
 * parametric path (a spec renders into the same markup), the accessible
 * text (the edge list stays readable), reduced motion and dark mode.
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
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  const ready = async () => {
    await page.goto(`${server.url}/tests/e2e/diagram.e2e-fixture.html`);
    await page.waitForFunction(() => (globalThis as Record<string, unknown>).__fixtureReady === true && !!document.querySelector('#dg-arch .diagram-wires'), null, { timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
  };
  await ready();
  const state = (sel: string) => page.$eval(sel, (el: any) => el.store.value);

  await check('diagram.js initialized every figure (data-init, el.api, el.store, a wire layer per canvas)', async () => {
    const rows = await page.$$eval('.diagram', (els) => els.map((el: any) => [el.id, el.dataset.init, typeof el.api?.setState, typeof el.store?.subscribe]));
    for (const [id, init, api, store] of rows) assert.deepEqual([init, api, store], ['', 'function', 'function'], id as string);
    const wired = await page.$$eval('.diagram', (els) => els.filter((el) => el.querySelector('.diagram-edge')).every((el) => el.querySelector('.diagram-wires')));
    assert.equal(wired, true);
  });

  await check('fit: a figure narrower than its diagram scales the canvas into it (wires follow); data-fit="none" keeps it 1:1', async () => {
    const box = () => page.$eval('#dg-arch', (fig) => {
      const c = fig.querySelector(':scope > .diagram-canvas') as HTMLElement;
      const f = fig.getBoundingClientRect(), r = c.getBoundingClientRect();
      const wire = c.querySelector('.diagram-wires') as SVGElement;
      return { zoom: Number(c.style.zoom || 1), inside: r.right <= f.right + 1, wire: Math.round(wire.getBoundingClientRect().width - r.width) };
    });
    assert.equal((await box()).zoom, 1, 'wide enough: 1:1');
    await page.$eval('#dg-arch', (fig) => { (fig as HTMLElement).style.maxWidth = '30rem'; });
    await page.waitForFunction(() => Number((document.querySelector('#dg-arch > .diagram-canvas') as HTMLElement).style.zoom || 1) < 1);
    await page.waitForTimeout(150);
    const narrow = await box();
    assert.ok(narrow.zoom >= 0.7 && narrow.zoom < 1, `scaled into the figure (${narrow.zoom})`);
    assert.ok(narrow.inside, 'the canvas ends inside the figure');
    assert.ok(Math.abs(narrow.wire) <= 2, 'the wire layer spans the scaled canvas');
    await page.$eval('#dg-arch', (fig) => { fig.setAttribute('data-fit', 'none'); });
    await page.$eval('#dg-arch', (fig) => (globalThis as any).df$.shadcn.diagram.redraw(fig));
    assert.equal((await box()).zoom, 1, 'data-fit="none": 1:1, the figure scrolls');
    await page.$eval('#dg-arch', (fig) => { fig.removeAttribute('data-fit'); (fig as HTMLElement).style.maxWidth = ''; });
    await page.$eval('#dg-arch', (fig) => (globalThis as any).df$.shadcn.diagram.redraw(fig));
  });

  await check('one wire per edge; labels from the edge text; the layers are aria-hidden', async () => {
    const r = await page.$eval('#dg-arch', (el) => ({
      edges: el.querySelectorAll('.diagram-edges .diagram-edge').length,
      wires: el.querySelectorAll('.diagram-wires .diagram-wire').length,
      labels: [...el.querySelectorAll('.diagram-wire-label')].map((l) => l.textContent),
      hidden: [el.querySelector('.diagram-wires')!.getAttribute('aria-hidden'), el.querySelector('.diagram-wire-labels')!.getAttribute('aria-hidden')],
      accent: el.querySelector('.diagram-wire[data-tone="accent"]') !== null,
    }));
    assert.equal(r.wires, r.edges);
    assert.deepEqual(r.labels, ['HTTPS', 'gRPC', 'SQL', 'publish', 'notify']);
    assert.deepEqual(r.hidden, ['true', 'true']);
    assert.equal(r.accent, true);
  });

  await check('the edge list stays in the accessibility tree: visually hidden, not display:none', async () => {
    const r = await page.$eval('#dg-arch .diagram-edges', (el) => {
      const c = getComputedStyle(el);
      return [c.display, c.position, el.getBoundingClientRect().width <= 1, el.textContent!.includes('gRPC')];
    });
    assert.deepEqual(r, ['block', 'absolute', true, true]);
  });

  await check('wires end on the node boundary and never cross another node', async () => {
    const bad = await page.evaluate(() => {
      const out: string[] = [];
      for (const fig of document.querySelectorAll('#dg-arch, #dg-flow, #dg-state, #dg-curves')) {
        const canvas = fig.querySelector('.diagram-canvas')!;
        const box = canvas.getBoundingClientRect();
        const rects = [...canvas.querySelectorAll('.diagram-node')].map((n) => {
          const r = n.getBoundingClientRect();
          return { id: (n as HTMLElement).dataset.node, x: r.left - box.left - canvas.clientLeft, y: r.top - box.top - canvas.clientTop, w: r.width, h: r.height };
        });
        const edges = [...fig.querySelectorAll('.diagram-edges .diagram-edge')] as HTMLElement[];
        [...fig.querySelectorAll('.diagram-wires .diagram-wire')].forEach((g, i) => {
          const edge = edges[i];
          if (edge.dataset.curve && edge.dataset.curve !== 'elbow') return;
          const path = g.querySelector('.diagram-wire-line') as SVGPathElement;
          const ends = [edge.dataset.from!.split(':')[0], edge.dataset.to!.split(':')[0]];
          const len = path.getTotalLength();
          for (let t = 6; t < len - 6; t += 4) {
            const p = path.getPointAtLength(t);
            const hit = rects.find((r) => !ends.includes(r.id!) && p.x > r.x + 1 && p.x < r.x + r.w - 1 && p.y > r.y + 1 && p.y < r.y + r.h - 1);
            if (hit) {
              out.push(`${fig.id}: ${ends.join('→')} crosses ${hit.id}`);
              break;
            }
          }
        });
      }
      return out;
    });
    assert.deepEqual(bad, []);
  });

  await check('field anchors: a foreign key leaves and enters at its column rows', async () => {
    const r = await page.$eval('#dg-er', (fig) => {
      const canvas = fig.querySelector('.diagram-canvas')!;
      const box = canvas.getBoundingClientRect();
      const mid = (sel: string) => {
        const b = fig.querySelector(sel)!.getBoundingClientRect();
        return Math.round(b.top - box.top - canvas.clientTop + b.height / 2);
      };
      const d = (fig.querySelector('.diagram-wires .diagram-wire .diagram-wire-line') as SVGPathElement).getAttribute('d')!;
      const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
      return { startY: Math.round(nums[1]), endY: Math.round(nums[nums.length - 1]), from: mid('[data-node="orders"] [data-field="customer_id"]'), to: mid('[data-node="customers"] [data-field="id"]') };
    });
    assert.ok(Math.abs(r.startY - r.from) <= 1, `starts at ${r.startY}, row at ${r.from}`);
    assert.ok(Math.abs(r.endY - r.to) <= 1, `ends at ${r.endY}, row at ${r.to}`);
  });

  await check('typed ends: crow\'s feet and bars are drawn as heads', async () => {
    const n = await page.$$eval('#dg-er .diagram-wire-head', (h) => h.length);
    assert.ok(n >= 4, `${n} heads`);
    const kinds = await page.$$eval('#dg-heads .diagram-wire', (gs) => gs.map((g) => g.querySelectorAll('.diagram-wire-head').length));
    // the UML library: realization, inheritance, composition, aggregation, two open arrows - one head each
    assert.deepEqual(kinds, [1, 1, 1, 1, 1, 1]);
  });

  await check('default: the complete figure - no step attributes, the toolbar says complete', async () => {
    const r = await page.$eval('#dg-flow', (el) => [el.hasAttribute('data-step-current'), el.querySelectorAll('[data-step-state]').length, el.querySelector('.diagram-status')!.textContent]);
    assert.deepEqual(r, [false, 0, 'Complete · 5 steps']);
  });

  await check("paused: setState('paused', { step: 2 }) - past / current / future, wires follow, the status names the step", async () => {
    await page.$eval('#dg-flow', (el: any) => el.api.setState('paused', { step: 2 }));
    await page.waitForFunction(() => document.querySelector('#dg-flow .diagram-status')!.textContent!.startsWith('Step 2'));
    // future nodes fade to the ghost opacity (a transition)
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#dg-flow [data-node="auto"]')!).opacity) < 0.2, null, { timeout: 3000 });
    const r = await page.$eval('#dg-flow', (el) => ({
      current: el.getAttribute('data-step-current'),
      nodes: [...el.querySelectorAll('.diagram-canvas > .diagram-node')].map((n) => n.getAttribute('data-step-state')),
      wires: [...el.querySelectorAll('.diagram-wire')].map((w) => w.getAttribute('data-step-state')),
      status: el.querySelector('.diagram-status')!.textContent,
      futureOpacity: getComputedStyle(el.querySelector('[data-node="auto"]')!).opacity,
      futureWire: getComputedStyle(el.querySelector('.diagram-wire[data-step-state="future"]')!).opacity,
    }));
    assert.equal(r.current, '2');
    assert.deepEqual(r.nodes, ['past', 'current', 'future', 'future', 'future']);
    assert.deepEqual(r.wires, ['current', 'future', 'future', 'future', 'future']);
    assert.equal(r.status, 'Step 2 of 5 · Paid < 30 days?');
    assert.ok(Number(r.futureOpacity) < 0.2);
    assert.equal(r.futureWire, '0');
    assert.deepEqual(await state('#dg-flow'), { name: 'paused', config: { step: 2 } });
  });

  await check('toolbar: next / previous step, the keyboard on the toolbar, show all', async () => {
    await page.click('#dg-flow [data-action="next"]');
    assert.deepEqual(await state('#dg-flow'), { name: 'paused', config: { step: 3 } });
    await page.focus('#dg-flow [data-action="prev"]');
    await page.keyboard.press('ArrowLeft');
    assert.deepEqual(await state('#dg-flow'), { name: 'paused', config: { step: 2 } });
    await page.keyboard.press('End');
    assert.equal((await state('#dg-flow')).name, 'default');
  });

  await check('playing: the clock advances the steps (diagram-step events) and pauses on the last', async () => {
    await page.$eval('#dg-flow', (el: any) => {
      (globalThis as any).__steps = [];
      el.addEventListener('diagram-step', (e: CustomEvent) => (globalThis as any).__steps.push(e.detail.step));
    });
    await page.click('#dg-flow [data-action="replay"]');
    assert.equal((await state('#dg-flow')).name, 'playing');
    assert.equal(await page.$eval('#dg-flow [data-action="play"]', (b) => b.getAttribute('aria-pressed')), 'true');
    await page.waitForFunction(() => (document.querySelector('#dg-flow') as any).store.value.name === 'paused', null, { timeout: 5000 });
    assert.deepEqual(await state('#dg-flow'), { name: 'paused', config: { step: 5 } });
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__steps), [1, 2, 3, 4, 5, 5]);
    await page.$eval('#dg-flow', (el: any) => el.api.setState('default'));
  });

  await check('df$.shadcn.diagram: steps(), next(), reset()', async () => {
    const r = await page.evaluate(() => {
      const d = (globalThis as any).df$.shadcn.diagram;
      const before = d.steps('#dg-state');
      d.next('#dg-state');
      const after = (document.querySelector('#dg-state') as any).store.value;
      d.reset('#dg-state');
      return { before, after, back: (document.querySelector('#dg-state') as any).store.value.name };
    });
    assert.deepEqual(r.before, { max: 6, current: 6 });
    assert.deepEqual(r.after, { name: 'paused', config: { step: 6 } });
    assert.equal(r.back, 'default');
  });

  await check('automatic steps: one node a step in markup order; explicit data-step groups and labels', async () => {
    const r = await page.evaluate(() => {
      const states = (sel: string, step: number) => {
        const el = document.querySelector(sel) as any;
        el.api.setState('paused', { step });
        const out = [...el.querySelectorAll('.diagram-canvas > .diagram-node')].map((n: HTMLElement) => `${n.dataset.node}:${n.dataset.stepState}`);
        const wires = [...el.querySelectorAll('.diagram-wire')].map((w: Element) => w.getAttribute('data-step-state'));
        const status = el.querySelector('.diagram-status')?.textContent ?? null;
        el.api.setState('default');
        return { out, wires, status };
      };
      return { auto: states('#dg-arch', 1), explicit: states('#dg-driven', 3) };
    });
    assert.deepEqual(r.auto.out, ['web:current', 'api:future', 'orders:future', 'db:future', 'queue:future', 'mail:future']);
    assert.deepEqual(r.explicit.out, ['s1:past', 's2:past', 's3:current', 's4:current', 's5:future']);
    assert.deepEqual(r.explicit.wires, ['past', 'current', 'current', 'future']);
    assert.equal(r.explicit.status, null); // no data-steps: no toolbar
  });

  await check('one element a beat: inside a step boxes get --step-i 0, 1 …, an edge the beat after its later end', async () => {
    const r = await page.$eval('#dg-driven', (el: any) => {
      el.api.setState('paused', { step: 3 });
      const i = (sel: string) => (el.querySelector(sel) as HTMLElement).style.getPropertyValue('--step-i');
      const out = { s3: i('[data-node="s3"]'), s4: i('[data-node="s4"]'), edge: i('.diagram-edge[data-to="s4"]'), wire: (el.querySelector('.diagram-wire[data-edge-ref="s2->s4"]') as HTMLElement).style.getPropertyValue('--step-i'), past: i('[data-node="s1"]') };
      el.api.setState('default');
      return out;
    });
    assert.deepEqual(r, { s3: '0', s4: '1', edge: '1.6', wire: '1.6', past: '' });
  });

  await check("timing custom properties read in ms or s (a minifier writes 0.9s) - the step clock keeps time", async () => {
    await page.$eval('#dg-driven', (el: HTMLElement) => el.setAttribute('style', '--diagram-element-ms:0.05s;--diagram-step-ms:0.05s;--diagram-hold:0.05s'));
    const t0 = Date.now();
    await page.$eval('#dg-driven', (el: any) => el.api.setState('playing', { step: 1 }));
    await page.waitForFunction(() => (document.querySelector('#dg-driven') as any).store.value.name === 'paused', null, { timeout: 5000 });
    const took = Date.now() - t0;
    await page.$eval('#dg-driven', (el: any) => { el.removeAttribute('style'); el.api.setState('default'); });
    // 4 steps × (beats × 50 + 50 + 50) ms: far below a second, far above the 0.05 ms a unit bug would give
    assert.ok(took > 300 && took < 3000, `played in ${took} ms`);
  });

  await check('sequence: participants are the frame, messages play in order; lifelines drawn', async () => {
    const r = await page.$eval('#dg-seq', (el: any) => {
      el.api.setState('paused', { step: 2 });
      const msgs = [...el.querySelectorAll('.diagram-edge')].map((m: HTMLElement) => m.dataset.stepState);
      const parts = [...el.querySelectorAll('.diagram-canvas > .diagram-node')].map((n: HTMLElement) => n.dataset.stepState);
      const lifelines = el.querySelectorAll('.diagram-wire[data-lifeline]').length;
      el.api.setState('default');
      return { msgs, parts, lifelines };
    });
    assert.deepEqual(r.msgs, ['past', 'current', 'future', 'future', 'future']);
    assert.deepEqual(r.parts, ['past', 'past', 'past']);
    assert.equal(r.lifelines, 3);
  });

  await check('delta: Before hides added, After hides removed, Changes badges + the ledger', async () => {
    const r = await page.$eval('#dg-delta', (el) => {
      const panel = (name: string) => el.querySelector(`.diagram-panel[data-panel="${name}"]`)!;
      const shown = (name: string) => [...panel(name).querySelectorAll('.diagram-node')].filter((n) => (n as HTMLElement).getClientRects().length).map((n) => (n as HTMLElement).dataset.node);
      return {
        titles: [...el.querySelectorAll('.diagram-panel-title')].map((t) => t.firstChild!.textContent),
        before: shown('before'),
        after: shown('after'),
        changes: shown('changes'),
        monolith: panel('before').querySelector('[data-node="mono"] .diagram-node-meta')!.textContent,
        badges: [...panel('changes').querySelectorAll('.diagram-badge')].map((b) => b.textContent),
        ledger: [...panel('changes').querySelectorAll('.diagram-ledger-kind')].map((k) => k.textContent),
        note: panel('changes').querySelector('.diagram-ledger-note')!.textContent,
        source: getComputedStyle(el.querySelector(':scope > .diagram-canvas')!).display,
        wires: [panel('before'), panel('after')].map((p) => p.querySelectorAll('.diagram-wire').length),
      };
    });
    assert.deepEqual(r.titles, ['Before', 'Changes', 'After']);
    assert.deepEqual(r.before, ['api', 'mono', 'db', 'cron']);
    assert.deepEqual(r.after, ['api', 'mono', 'pay', 'db']);
    assert.deepEqual(r.changes, ['api', 'mono', 'pay', 'db', 'cron']);
    assert.equal(r.monolith, 'orders · payments');
    assert.deepEqual(r.badges, ['Δ', '+', '−']);
    assert.deepEqual(r.ledger, ['Δ Changed', '+ Added', '− Removed', '+ Added', '− Removed']);
    assert.equal(r.note, 'orders · payments → orders');
    assert.equal(r.source, 'none');
    assert.deepEqual(r.wires, [3, 3]);
  });

  await check('delta: data-delta=columns puts the panels side by side, data-delta-labels renames them', async () => {
    const r = await page.$eval('#dg-delta-cols', (el) => ({
      cols: getComputedStyle(el.querySelector('.diagram-delta')!).gridTemplateColumns.split(' ').length,
      titles: [...el.querySelectorAll('.diagram-panel-title')].map((t) => t.firstChild!.textContent),
    }));
    assert.equal(r.cols, 3);
    assert.deepEqual(r.titles, ['v1', 'What changed', 'v2']);
  });

  await check('parametric: a JSON spec renders into the authored markup; build(), markup(), diff()', async () => {
    const r = await page.evaluate(() => {
      const d = (globalThis as any).df$.shadcn.diagram;
      const fig = document.querySelector('#dg-param')!;
      const nodes = [...fig.querySelectorAll('.diagram-node')].map((n) => (n as HTMLElement).dataset.node);
      const wires = fig.querySelectorAll('.diagram-wire').length;
      const html = d.markup({ cols: 2, nodes: [{ id: 'x', name: 'X', col: 1, row: 1 }], edges: [] });
      const diff = d.diff(
        { nodes: [{ id: 'a', name: 'A', col: 1 }, { id: 'b', name: 'B', col: 2 }], edges: [{ id: 'e', from: 'a', to: 'b' }] },
        { nodes: [{ id: 'a', name: 'A2', col: 1 }, { id: 'c', name: 'C', col: 3 }], edges: [{ id: 'e', from: 'a', to: 'c' }] },
      );
      d.build(fig, { type: 'flow', cols: 2, nodes: [{ id: 'p', name: 'P', col: 1, row: 1 }, { id: 'q', name: 'Q', col: 2, row: 1 }], edges: [{ from: 'p', to: 'q', label: 'go' }] });
      return {
        nodes, wires, html,
        marks: diff.nodes.map((n: any) => `${n.id}:${n.change ?? '-'}`).concat(diff.edges.map((e: any) => `${e.id}:${e.change}:${e.before?.to}`)),
        rebuilt: [fig.getAttribute('data-type'), fig.querySelectorAll('.diagram-node').length, fig.querySelector('.diagram-wire-label')?.textContent],
      };
    });
    assert.deepEqual(r.nodes, ['a', 'b', 'c']);
    assert.equal(r.wires, 2);
    assert.match(r.html, /^<div class="diagram-canvas" style="--cols:2"><div class="diagram-node" data-node="x" style="--col:1;--row:1"><span class="diagram-node-name">X<\/span><\/div><\/div>$/);
    assert.deepEqual(r.marks, ['a:changed', 'b:removed', 'c:added', 'e:rewired:b']);
    assert.deepEqual(r.rebuilt, ['flow', 2, 'go']);
  });

  await check('fishbone: a spine and one 60° bone per category', async () => {
    const r = await page.$eval('#dg-fish', (el) => [el.querySelectorAll('.diagram-wire[data-spine]').length, el.querySelectorAll('.diagram-wire[data-bone]').length]);
    assert.deepEqual(r, [1, 4]);
  });

  await check('flow tokens travel data-flow wires - and are not made under reduced motion', async () => {
    assert.equal(await page.$$eval('#dg-loop .diagram-token', (t) => t.length), 1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => (globalThis as any).df$.shadcn.diagram.redraw('#dg-loop'));
    assert.equal(await page.$$eval('#dg-loop .diagram-token', (t) => t.length), 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  await check('free and radial canvases place nodes by --x / --y and --i / --n', async () => {
    const r = await page.evaluate(() => {
      const pos = (sel: string) => {
        const c = document.querySelector(sel)!.closest('.diagram-canvas')!.getBoundingClientRect();
        const b = document.querySelector(sel)!.getBoundingClientRect();
        return [Math.round(((b.left + b.width / 2 - c.left) / c.width) * 100), Math.round(((b.top + b.height / 2 - c.top) / c.height) * 100)];
      };
      return { free: pos('#dg-free [data-node="core"]'), top: pos('#dg-loop [data-node="cap"]'), hub: pos('#dg-loop [data-node="hub"]') };
    });
    assert.deepEqual(r.free, [50, 50]);
    assert.equal(r.top[0], 50);
    assert.ok(r.top[1] < 20, `top station at ${r.top[1]}%`);
    assert.deepEqual(r.hub, [50, 50]);
  });

  await check('tokens: paper and ink are the theme (card / foreground) in light and in dark', async () => {
    const read = () => page.$eval('#dg-arch [data-node="orders"]', (n) => [getComputedStyle(n).backgroundColor, getComputedStyle(n).color, getComputedStyle(document.body).getPropertyValue('--card').trim()]);
    const light = await read();
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    const dark = await read();
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    assert.notEqual(light[0], dark[0]);
    assert.notEqual(light[1], dark[1]);
  });

  await check('a re-keyed accent: --diagram-accent on the figure colors its accent node and wire', async () => {
    const r = await page.$eval('#dg-rekey', (el) => [getComputedStyle(el.querySelector('[data-tone="accent"]')!).borderTopColor, getComputedStyle(el.querySelector('.diagram-wire[data-tone="accent"]')!).color]);
    assert.equal(r[0], r[1]);
  });

  await check("activation: a click on a box sets state 'active' - the box, what it touches, the rest dimmed; the output names it", async () => {
    await page.click('#dg-tones-live [data-node="pay"]');
    const r = await page.$eval('#dg-tones-live', (el: any) => ({
      state: el.store.value,
      active: el.getAttribute('data-active'),
      nodes: Object.fromEntries([...el.querySelectorAll('.diagram-canvas > .diagram-node')].map((n: HTMLElement) => [n.dataset.node, n.dataset.activeState])),
      pressed: el.querySelector('[data-node="pay"]').getAttribute('aria-pressed'),
      wires: [...el.querySelectorAll('.diagram-wire')].map((w: Element) => `${w.getAttribute('data-edge-ref')}:${w.getAttribute('data-active-state')}`),
      out: document.querySelector('output[data-diagram-for="dg-tones-live"]')!.textContent,
    }));
    assert.deepEqual(r.state, { name: 'active', config: { ref: 'pay' } });
    assert.equal(r.active, 'pay');
    assert.deepEqual(r.nodes, { cdn: 'dimmed', api: 'related', cart: 'dimmed', tax: 'dimmed', pay: 'active', db: 'related', ic: 'related' });
    assert.equal(r.pressed, 'true');
    assert.deepEqual(r.wires, ['cdn->api:dimmed', 'api->cart:dimmed', 'cart->tax:dimmed', 'api->pay:related', 'pay->db:related', 'pay->ic:related']);
    assert.equal(r.out, 'Payments - Failing: card authorizations time out since 14:02.');
    // the same box again clears; the output returns to its own text
    await page.click('#dg-tones-live [data-node="pay"]');
    assert.equal((await state('#dg-tones-live')).name, 'default');
    assert.equal(await page.$eval('output[data-diagram-for="dg-tones-live"]', (o) => o.textContent), 'Press Next to walk the system, or click any box.');
  });

  await check('activation: a click on an edge label activates the edge; its two ends are related', async () => {
    await page.click('#dg-tones-live .diagram-wire-label[data-edge-ref="pay->db"]');
    const r = await page.$eval('#dg-tones-live', (el: any) => [el.store.value.config.ref, [...el.querySelectorAll('[data-active-state="related"]')].map((n: HTMLElement) => n.dataset.node).filter(Boolean)]);
    assert.deepEqual(r, ['pay->db', ['pay', 'db']]);
    assert.equal(await page.$eval('output[data-diagram-for="dg-tones-live"]', (o) => o.textContent), 'Payments → Orders DB · SQL');
    await page.click('#dg-tones-live .diagram-canvas', { position: { x: 6, y: 6 } });
    assert.equal((await state('#dg-tones-live')).name, 'default');
  });

  await check('outside controls: Next walks the activation order, Previous wraps, Clear clears; diagram-activate reports each', async () => {
    await page.$eval('#dg-tones-live', (el) => {
      (globalThis as any).__acts = [];
      el.addEventListener('diagram-activate', (e: any) => (globalThis as any).__acts.push(e.detail.ref));
    });
    const next = '[data-diagram-for="dg-tones-live"][data-diagram-action="next"]';
    for (let i = 0; i < 3; i++) await page.click(next);
    assert.equal((await state('#dg-tones-live')).config.ref, 'cart');
    await page.click('[data-diagram-for="dg-tones-live"][data-diagram-action="prev"]');
    assert.equal((await state('#dg-tones-live')).config.ref, 'api');
    await page.click('[data-diagram-for="dg-tones-live"][data-diagram-action="clear"]');
    assert.equal((await state('#dg-tones-live')).name, 'default');
    await page.click('[data-diagram-for="dg-tones-live"][data-diagram-action="prev"]');
    assert.equal((await state('#dg-tones-live')).config.ref, 'ic'); // from nothing, Previous wraps to the last
    await page.waitForTimeout(50);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__acts), ['cdn', 'api', 'cart', 'api', null, 'ic']);
  });

  await check('keyboard: Enter on a focused box, arrows walk on (focus follows), Escape clears', async () => {
    await page.$eval('#dg-tones-live', (el: any) => el.api.setState('default'));
    await page.focus('#dg-tones-live [data-node="cdn"]');
    await page.keyboard.press('Enter');
    assert.equal((await state('#dg-tones-live')).config.ref, 'cdn');
    await page.keyboard.press('ArrowRight');
    assert.equal((await state('#dg-tones-live')).config.ref, 'api');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.node), 'api');
    await page.keyboard.press('Escape');
    assert.equal((await state('#dg-tones-live')).name, 'default');
  });

  await check('df$.shadcn.diagram: activate(), active(), order(); a figure without data-interactive takes no clicks', async () => {
    const r = await page.evaluate(() => {
      const d = (globalThis as any).df$.shadcn.diagram;
      d.activate('#dg-arch', 'orders->db');
      const a = d.active('#dg-arch');
      const order = d.order('#dg-tones-live');
      d.activate('#dg-arch', null);
      return { ref: a.ref, kind: a.kind, label: a.label, order, after: d.active('#dg-arch'), role: document.querySelector('#dg-arch [data-node="orders"]')!.getAttribute('role') };
    });
    assert.deepEqual(r, { ref: 'orders->db', kind: 'edge', label: 'Orders → Postgres · SQL', order: ['cdn', 'api', 'cart', 'tax', 'pay', 'db', 'ic'], after: null, role: null });
    await page.click('#dg-arch [data-node="orders"]');
    assert.equal((await state('#dg-arch')).name, 'default');
  });

  await check('properties(): a node / an edge / a matrix row as JSON; propertySchema() its options; setProperties() writes back and redraws', async () => {
    const r = await page.evaluate(() => {
      const d = (globalThis as any).df$.shadcn.diagram;
      const node = d.properties('#dg-arch', 'api');
      const edge = d.properties('#dg-arch', 'orders->queue');
      const schema = d.propertySchema('#dg-arch', 'api');
      d.setProperties('#dg-arch', 'api', { ...node, name: 'Gateway', meta: '', eyebrow: 'Edge tier', tone: 'warn', shape: 'pill' });
      const el = document.querySelector('#dg-arch [data-node="api"]') as HTMLElement;
      const written = [el.querySelector('.diagram-node-name')!.textContent, !!el.querySelector('.diagram-node-meta'), el.dataset.tone, el.dataset.shape].join('|');
      d.setProperties('#dg-arch', 'orders->queue', { ...edge, label: 'emit', line: 'dotted' });
      const li = document.querySelector('#dg-arch .diagram-edge[data-to="queue"]') as HTMLElement;
      const wireLabel = [...document.querySelectorAll('#dg-arch .diagram-wire-label')].map((l) => l.textContent);
      const liNow = [li.textContent, li.dataset.line].join('|');
      const back = d.properties('#dg-arch', 'api');
      d.setProperties('#dg-arch', 'api', node); // restore
      d.setProperties('#dg-arch', 'orders->queue', edge);
      return {
        node, edge, toneOptions: schema.tone.options.length, idReadOnly: schema.id.readOnly,
        written,
        back, li: liNow, wireLabel: wireLabel.includes('emit'),
        restored: d.properties('#dg-arch', 'api'), none: d.properties('#dg-arch', 'nope'),
      };
    });
    assert.deepEqual(r.node, { id: 'api', eyebrow: 'Edge', name: 'API gateway', meta: 'rate-limited', tone: 'accent', shape: 'box' });
    assert.deepEqual(r.edge, { from: 'orders', to: 'queue', label: 'publish', line: 'dashed', tone: 'none', head: 'arrow', tail: 'none', curve: 'elbow' });
    assert.equal(r.toneOptions, 8);
    assert.equal(r.idReadOnly, true);
    assert.equal(r.written, 'Gateway|false|warn|pill');
    assert.deepEqual(r.back, { id: 'api', eyebrow: 'Edge tier', name: 'Gateway', meta: '', tone: 'warn', shape: 'pill' });
    assert.equal(r.li, 'emit|dotted');
    assert.equal(r.wireLabel, true);
    assert.deepEqual(r.restored, r.node);
    assert.equal(r.none, null);
  });

  await check('a JSON spec can switch the figure on: steps / interactive / autoplay become data-*', async () => {
    const r = await page.evaluate(() => {
      const fig = document.createElement('figure');
      fig.className = 'diagram';
      document.body.append(fig);
      (globalThis as any).df$.shadcn.diagram.build(fig, { type: 'flow', steps: true, interactive: true, cols: 2, nodes: [{ id: 'a', name: 'A', col: 1, row: 1 }, { id: 'b', name: 'B', col: 2, row: 1 }], edges: [{ from: 'a', to: 'b' }] });
      const out = [fig.hasAttribute('data-steps'), fig.hasAttribute('data-interactive'), !!fig.querySelector('.diagram-controls'), fig.querySelector('[data-node="a"]')!.getAttribute('role')];
      fig.remove();
      return out;
    });
    assert.deepEqual(r, [true, true, true, 'button']);
  });

  await check('multi-edge flow: data-flow-tokens tokens on every flowing wire', async () => {
    const r = await page.$eval('#dg-shapes-flow', (el) => [el.querySelectorAll('.diagram-wire[data-flow]').length, el.querySelectorAll('.diagram-token').length]);
    assert.deepEqual(r, [7, 14]);
  });

  await check("the theme's look: monospace text, chart-color accent, elbows rounded by --radius (square when it is 0)", async () => {
    const r = await page.evaluate(() => {
      const node = document.querySelector('#dg-arch [data-node="orders"]')!;
      const probe = document.createElement('i');
      probe.style.color = 'var(--chart-2)';
      document.body.append(probe);
      const chart2 = getComputedStyle(probe).color;
      probe.remove();
      const mono = getComputedStyle(document.body).getPropertyValue('--font-mono').trim();
      const accent = getComputedStyle(document.querySelector('#dg-arch [data-node="api"]')!).borderTopColor;
      const rounded = [...document.querySelectorAll('#dg-curves .diagram-wire-line')].some((p) => p.getAttribute('d')!.includes('Q'));
      const first = (f: string) => f.split(',')[0].replace(/["']/g, '').trim();
      return { font: first(getComputedStyle(node).fontFamily) === first(mono), chart2, accent, rounded };
    });
    assert.equal(r.font, true);
    assert.equal(r.accent, r.chart2);
    assert.equal(r.rounded, true);
    // a square theme (--radius: 0 on the root, as a theme sets it)
    await page.evaluate(() => document.documentElement.style.setProperty('--radius', '0px'));
    await page.evaluate(() => (globalThis as any).df$.shadcn.diagram.redraw('#dg-curves'));
    const square = await page.$$eval('#dg-curves .diagram-wire-line', (ps) => ps.every((p) => !p.getAttribute('d')!.includes('Q')));
    await page.evaluate(() => document.documentElement.style.removeProperty('--radius'));
    await page.evaluate(() => (globalThis as any).df$.shadcn.diagram.redraw('#dg-curves'));
    assert.equal(square, true);
  });

  await check('readability: no label covers a node, text, another label or another wire', async () => {
    const bad = await page.evaluate(() => {
      const out: string[] = [];
      const inter = (a: DOMRect, c: DOMRect) => Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left) - 1) * Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) - 1);
      for (const fig of document.querySelectorAll<HTMLElement>('#dg-shapes, #dg-tones, #dg-curves, #dg-heads, #dg-free, #dg-rekey, #dg-arch')) {
        const nodes = [...fig.querySelectorAll('.diagram-canvas > .diagram-node, .diagram-group .diagram-node')].map((n) => n.getBoundingClientRect());
        const labels = [...fig.querySelectorAll<HTMLElement>('.diagram-wire-label')];
        labels.forEach((l, i) => {
          const r = l.getBoundingClientRect();
          if (nodes.some((n) => inter(r, n) > 4)) out.push(`${fig.id}: "${l.textContent}" covers a node`);
          if (labels.slice(i + 1).some((m) => inter(r, m.getBoundingClientRect()) > 4)) out.push(`${fig.id}: "${l.textContent}" covers a label`);
        });
      }
      return out;
    });
    assert.deepEqual(bad, []);
  });

  await check('clearance: in every framed diagram, nothing drawn comes closer than 20px to the border (zones, zone labels, wire labels, wires)', async () => {
    await page.evaluate(() => document.querySelectorAll('figure.diagram').forEach((f) => (globalThis as any).df$.shadcn.diagram.redraw(f)));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const bad = await page.evaluate(() => {
      const MIN = 20; // CLEARANCE in diagram.ts
      const out: string[] = [];
      for (const canvas of document.querySelectorAll<HTMLElement>('figure.diagram .diagram-canvas')) {
        if (!canvas.getClientRects().length || !parseFloat(getComputedStyle(canvas).borderTopWidth)) continue;
        const box = canvas.getBoundingClientRect();
        const scale = box.width / (canvas.offsetWidth || 1) || 1;
        const ox = box.left + canvas.clientLeft * scale;
        const oy = box.top + canvas.clientTop * scale;
        for (const el of canvas.querySelectorAll('*')) {
          // flow tokens ride on their wires (animated) - the wire itself is measured
          if (el.matches('.diagram-wires, .diagram-wire-labels, .diagram-wire-hit, .diagram-token, g') || !el.getClientRects().length) continue;
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) continue;
          const x = (r.left - ox) / scale, y = (r.top - oy) / scale, w = r.width / scale, h = r.height / scale;
          const d = Math.min(y, x, canvas.clientHeight - (y + h), canvas.clientWidth - (x + w));
          if (d < MIN - 0.5) {
            out.push(`${canvas.closest('figure')!.id || '(figure)'}: ${(el.getAttribute('class') ?? el.tagName).split(' ')[0]} ${Math.round(d)}px from the border`);
            break;
          }
        }
      }
      return out;
    });
    assert.deepEqual(bad, []);
  });

  // render() contract last - it reloads the page
  await check('render() contract: default / playing / paused', async () => {
    await ready();
    await assertRenderContract(page, '#dg-state', ['default', 'playing', 'paused', 'active'], {
      runtimeOwned: '.diagram-wires, .diagram-wire-labels, .diagram-controls, .diagram-delta',
      runtimeAttrs: ['data-label-side'],
    });
    await assertRenderContract(page, '#dg-tones-live', ['default', 'active'], {
      runtimeOwned: '.diagram-wires, .diagram-wire-labels, .diagram-controls, .diagram-delta',
      runtimeAttrs: ['tabindex', 'role'],
    });
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\ndiagram: ${failures} failing check(s)`);
  process.exit(1);
}
console.log('\ndiagram: all checks passed');
