import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E for the shipped Mermaid adapter. The official renderer is served
 * OFFLINE from the pinned devDependency (node_modules/mermaid, the exact
 * build the component requests from jsDelivr) through a Playwright route,
 * so every request is counted and the pinned path is asserted. Verifies:
 * lazy loading (no diagram → never requested; many → loaded once), render
 * from the retained source, unique ids, a controlled error, strict
 * security, the token → hex theme, live re-theming, dynamic insertion,
 * accessibility wiring, and the State API.
 */

const FIXTURE = '/tests/e2e/mermaid.e2e-fixture.html';
const PINNED = 'https://cdn.jsdelivr.net/npm/mermaid@12.0.0/dist/';
const LOCAL = resolve(import.meta.dirname, '../../node_modules/mermaid/dist/');
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

/** Serve the pinned CDN build from node_modules; returns the request log. */
async function offlineMermaid(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.route('https://cdn.jsdelivr.net/npm/mermaid@*/**', async (route) => {
    const url = route.request().url();
    requests.push(url);
    const file = resolve(LOCAL, url.slice(PINNED.length).split('?')[0]);
    if (!url.startsWith(PINNED) || !existsSync(file)) return route.fulfill({ status: 404, body: 'not pinned' });
    await route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: readFileSync(file) });
  });
  return requests;
}

const waitSettled = (page: Page) => page.waitForFunction(() =>
  [...document.querySelectorAll('.mermaid-diagram')].every((f) => ['rendered', 'error'].includes((f as HTMLElement).dataset.state ?? '')),
  undefined, { timeout: 30000 });

try {
  await check('the adapter pins mermaid@12.0.0 (never @latest)', async () => {
    const src = readFileSync(resolve(import.meta.dirname, '../../dist/components/mermaid/mermaid.js'), 'utf8');
    assert.match(src, /https:\/\/cdn\.jsdelivr\.net\/npm\/mermaid@12\.0\.0\/dist\/mermaid\.esm\.min\.mjs/);
    assert.doesNotMatch(src, /mermaid@latest/);
  });

  await check('no diagram on the page → the renderer is never requested', async () => {
    const page = await browser.newPage();
    const requests = await offlineMermaid(page);
    await page.route(`${server.url}/tests/e2e/__mermaid-empty.html`, (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><link rel="stylesheet" href="/dist/components/mermaid/mermaid.css"><p>none</p><script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/mermaid/mermaid.js"></script>',
    }));
    await page.goto(`${server.url}/tests/e2e/__mermaid-empty.html`);
    await page.waitForFunction(() => !!globalThis.df$?.shadcn?.mermaidApi);
    await page.waitForTimeout(500);
    assert.deepEqual(requests, []);
    await page.close();
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const requests = await offlineMermaid(page);
  await page.goto(`${server.url}${FIXTURE}`);
  await waitSettled(page);

  await check('first diagrams → the pinned official entry is imported exactly once', async () => {
    const entries = requests.filter((u) => u.endsWith('/mermaid.esm.min.mjs'));
    assert.deepEqual(entries, [`${PINNED}mermaid.esm.min.mjs`]);
  });

  await check('valid diagrams render an SVG with unique ids; the source <pre> is retained (hidden)', async () => {
    const r = await page.evaluate(() => {
      const figs = ['mm-flow', 'mm-seq', 'mm-acc', 'mm-dark'].map((id) => document.getElementById(id)!);
      const ids = figs.map((f) => f.querySelector('.mermaid-output svg')?.id ?? '');
      return {
        states: figs.map((f) => f.dataset.state),
        ids,
        pre: figs.map((f) => getComputedStyle(f.querySelector('pre.mermaid')!).display),
        source: document.querySelector('#mm-flow pre.mermaid')!.textContent!.includes('verify green?'),
        chrome: document.querySelector('#mm-flow .mermaid-output')!.hasAttribute('data-ce-chrome'),
      };
    });
    assert.deepEqual(r.states, ['rendered', 'rendered', 'rendered', 'rendered']);
    assert.equal(new Set(r.ids).size, 4, `unique ids: ${r.ids.join(', ')}`);
    assert.ok(r.ids.every(Boolean));
    assert.deepEqual(r.pre, ['none', 'none', 'none', 'none']);
    assert.equal(r.source, true, 'source text untouched');
    assert.equal(r.chrome, true, 'the SVG host is runtime chrome');
  });

  await check('node labels are HTML inside <foreignObject> and lay out (not SVG-namespaced, not 0×0)', async () => {
    const labels = await page.$$eval('#mm-flow .mermaid-output .node foreignObject > *', (els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return { ns: el.namespaceURI, w: Math.round(r.width), h: Math.round(r.height), text: el.textContent!.trim() };
    }));
    assert.ok(labels.length > 0, 'nodes with labels');
    for (const l of labels) {
      assert.equal(l.ns, 'http://www.w3.org/1999/xhtml', `"${l.text}" is an HTML element`);
      assert.ok(l.w > 0 && l.h > 0, `"${l.text}" has a box (${l.w}×${l.h})`);
    }
  });

  await check('<br/> in a label renders as a line break (source read like Mermaid reads it)', async () => {
    const lines = await page.evaluate(() => { const t = document.querySelector('#mm-flow .mermaid-output svg')!.textContent!; return t.includes('Edit') && t.includes('src/') && !t.includes('<br'); });
    assert.equal(lines, true);
  });

  await check('a malformed diagram → controlled error, source stays visible', async () => {
    const r = await page.evaluate(() => {
      const f = document.getElementById('mm-bad')!;
      const out = f.querySelector('output.mermaid-error');
      return { state: f.dataset.state, role: out?.getAttribute('role'), msg: (out?.textContent ?? '').length > 10, pre: getComputedStyle(f.querySelector('pre.mermaid')!).display, svg: !!f.querySelector('svg') };
    });
    assert.deepEqual(r, { state: 'error', role: 'alert', msg: true, pre: 'block', svg: false });
  });

  await check('a bare <pre class="mermaid"> is wrapped in the figure and rendered', async () => {
    const r = await page.evaluate(() => {
      const pre = document.getElementById('mm-bare')!;
      const fig = pre.parentElement!;
      return { wrapped: fig.matches('figure.mermaid-diagram'), state: fig.dataset.state };
    });
    assert.deepEqual(r, { wrapped: true, state: 'rendered' });
  });

  await check('securityLevel stays strict: the rendered config is locked, HTML in labels is not live', async () => {
    const r = await page.evaluate(async () => {
      const pinned = 'https://cdn.jsdelivr.net/npm/mermaid@12.0.0/dist/mermaid.esm.min.mjs';
      const m = (await import(pinned)).default;
      const fig = document.createElement('figure');
      fig.className = 'mermaid-diagram';
      fig.id = 'mm-xss';
      const pre = document.createElement('pre');
      pre.className = 'mermaid';
      pre.textContent = '%%{init: {"securityLevel": "loose"}}%%\nflowchart LR\n  A["<img src=x onerror=alert(1)>"] --> B\n  click A call alert()';
      fig.append(pre);
      document.body.append(fig);
      await new Promise((r) => setTimeout(r, 50));
      await globalThis.df$.shadcn.mermaid!.render(fig);
      const cfg = m.mermaidAPI?.getConfig?.() ?? m.getConfig?.() ?? {};
      return { level: cfg.securityLevel, img: !!fig.querySelector('.mermaid-output img[onerror]') };
    });
    assert.deepEqual(r, { level: 'strict', img: false });
  });

  await check('tokens → Mermaid theme: every color is a valid hex; the .dark scope derives a dark theme', async () => {
    const r = await page.evaluate(() => {
      const t = globalThis.df$.shadcn.mermaid!.theme;
      const light = t(document.getElementById('mm-flow')!);
      const dark = t(document.getElementById('mm-dark')!);
      const colors = Object.entries(light).filter(([, v]) => typeof v === 'string' && String(v).startsWith('#'));
      return {
        allHex: colors.every(([, v]) => /^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(String(v))),
        count: colors.length,
        darkMode: [light.darkMode, dark.darkMode],
        differ: light.primaryColor !== dark.primaryColor,
      };
    });
    assert.equal(r.allHex, true);
    assert.ok(r.count > 20, `${r.count} colors`);
    assert.deepEqual(r.darkMode, [false, true]);
    assert.equal(r.differ, true);
  });

  await check('a theme switch (dark class on <html>) re-renders the diagrams in the new colors', async () => {
    const before = await page.evaluate(() => document.getElementById('mm-flow')!._mermaidTheme);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForFunction((b) => document.getElementById('mm-flow')!._mermaidTheme !== b, before, { timeout: 15000 });
    const dark = await page.evaluate(() => JSON.parse(document.getElementById('mm-flow')!._mermaidTheme!).darkMode);
    assert.equal(dark, true);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.waitForFunction(() => JSON.parse(document.getElementById('mm-flow')!._mermaidTheme!).darkMode === false, undefined, { timeout: 15000 });
  });

  await check('dynamic insertion renders without an init call, the renderer is still loaded once', async () => {
    await page.evaluate(() => {
      const fig = document.createElement('figure');
      fig.className = 'mermaid-diagram';
      fig.id = 'mm-dyn';
      fig.innerHTML = '<pre class="mermaid">flowchart LR\n  Late --> Rendered</pre>';
      document.body.append(fig);
    });
    await page.waitForFunction(() => document.getElementById('mm-dyn')?.dataset.state === 'rendered', undefined, { timeout: 15000 });
    assert.equal(requests.filter((u) => u.endsWith('/mermaid.esm.min.mjs')).length, 1);
  });

  await check('accessibility: aria-label names the SVG (role=img); accTitle becomes its <title>', async () => {
    const r = await page.evaluate(() => {
      const flow = document.querySelector('#mm-flow svg')!;
      const acc = document.querySelector('#mm-acc svg')!;
      return { role: flow.getAttribute('role'), label: flow.getAttribute('aria-label'), title: acc.querySelector('title')?.textContent };
    });
    assert.deepEqual(r, { role: 'img', label: 'Release flow', title: 'Checkout flow' });
  });

  await check("state API: setState('default') shows the source, 'rendered' re-renders, 'error' shows a message", async () => {
    const r = await page.evaluate(async () => {
      const fig = document.getElementById('mm-seq')!;
      fig.api!.setState('default');
      const a = [fig.api!.getState().name, !!fig.querySelector('svg'), getComputedStyle(fig.querySelector('pre.mermaid')!).display];
      await fig.api!.setState('rendered');
      const b = [fig.api!.getState().name, !!fig.querySelector('svg')];
      fig.api!.setState('error', { message: 'Offline' });
      const c = [fig.api!.getState().name, fig.querySelector('.mermaid-error')?.textContent];
      await fig.api!.setState('rendered');
      return { a, b, c, d: fig.api!.getState().name };
    });
    assert.deepEqual(r, { a: ['default', false, 'block'], b: ['rendered', true], c: ['error', 'Offline'], d: 'rendered' });
  });

  await check('state API: unknown state names throw; registry globals expose api + states', async () => {
    const r = await page.evaluate(() => {
      let err = '';
      try { document.getElementById('mm-seq')!.api!.setState('nope'); } catch (e) { err = (e as Error).message; }
      return { err, states: globalThis.df$.shadcn.mermaidStates, url: globalThis.df$.shadcn.mermaid!.url };
    });
    assert.match(r.err, /unknown state/);
    assert.deepEqual(r.states, ['default', 'rendered', 'error']);
    assert.equal(r.url, `${PINNED}mermaid.esm.min.mjs`);
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
  await check('no flash of the source: pending → text hidden (placeholder), then the SVG; a renderer that never arrives reveals the text after 4s', async () => {
    const p2 = await browser.newPage();
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    await p2.route('https://cdn.jsdelivr.net/npm/mermaid@*/**', async (route) => {
      await gate;
      const url = route.request().url();
      const file = resolve(LOCAL, url.slice(PINNED.length).split('?')[0]);
      if (!url.startsWith(PINNED) || !existsSync(file)) return route.fulfill({ status: 404, body: 'x' });
      await route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: readFileSync(file) });
    });
    await p2.goto(`${server.url}${FIXTURE}`);
    await p2.waitForTimeout(300);
    const during = await p2.$eval('#mm-flow', (f) => [(f as HTMLElement).dataset.state, getComputedStyle(f.querySelector('pre.mermaid')!).color]);
    assert.deepEqual(during, ['pending', 'rgba(0, 0, 0, 0)'], 'source text hidden while pending');
    await p2.waitForTimeout(4200);
    const late = await p2.$eval('#mm-flow pre.mermaid', (p) => getComputedStyle(p).color);
    assert.notEqual(late, 'rgba(0, 0, 0, 0)', 'after 4s without a renderer the source shows');
    release();
    await p2.waitForFunction(() => (document.getElementById('mm-flow') as HTMLElement).dataset.state === 'rendered', undefined, { timeout: 30000 });
    assert.equal(await p2.$eval('#mm-flow pre.mermaid', (p) => getComputedStyle(p).display), 'none');
    await p2.close();
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, 'figure.mermaid-diagram[id]', ['default','rendered','error'], { runtimeOwned: '.mermaid-output', settled: '.mermaid-diagram[data-state="pending"]' });
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nmermaid.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('mermaid.e2e: all checks passed');
