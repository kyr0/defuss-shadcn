import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: E2E for the shipped Formula Rendering adapter. The official KaTeX build
 * (module, stylesheet, fonts) is served OFFLINE from the pinned devDependency
 * through a route, so every request is counted and the pinned path asserted.
 * Verifies: lazy loading (no formula → never requested; many → loaded once),
 * typesetting with MathML, display and inline layout, the source kept,
 * untrusted TeX contained, a controlled error, a notation tree's terms -
 * markers that keep TeX spacing, term buttons, click and keyboard selection,
 * linked outside elements, the math-select event - clean exports, setSource,
 * rejected configs, and the State API + render() contract.
 */

const FIXTURE = '/tests/e2e/math/math-renderer.e2e-fixture.html';
const PINNED = 'https://cdn.jsdelivr.net/npm/katex@0.19.0/dist/';
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

const settled = '.math-renderer[data-state="pending"]';

try {
  await check('the adapter pins katex@0.19.0 - module and stylesheet (never @latest)', async () => {
    const src = readFileSync(resolve(import.meta.dirname, '../../../dist/components/math-renderer/math-renderer.js'), 'utf8');
    assert.ok(src.includes(`${PINNED}katex.mjs`) && src.includes(`${PINNED}katex.min.css`));
    assert.doesNotMatch(src, /katex@latest/);
  });

  await check('no formula on the page → KaTeX is never requested', async () => {
    const page = await browser.newPage();
    const requests = await offlineJsdelivr(page);
    await page.route(`${server.url}/tests/e2e/__math-empty.html`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><link rel="stylesheet" href="/dist/components/math-renderer/math-renderer.css"><p>none</p><script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/math-renderer/math-renderer.js"></script>',
      }),
    );
    await page.goto(`${server.url}/tests/e2e/__math-empty.html`);
    await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.mathRendererApi);
    await page.waitForTimeout(400);
    assert.deepEqual(requests, []);
    await page.close();
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const requests = await offlineJsdelivr(page);
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction((sel) => !document.querySelector(sel) && document.querySelectorAll('.math-renderer[data-init]').length === 9, settled);

  await check('many formulas → the pinned module and stylesheet are each requested exactly once', async () => {
    assert.deepEqual(requests.filter((u) => u.endsWith('/katex.mjs')), [`${PINNED}katex.mjs`]);
    assert.deepEqual(requests.filter((u) => u.endsWith('/katex.min.css')), [`${PINNED}katex.min.css`]);
    assert.ok(requests.some((u) => /\/fonts\/KaTeX_.+\.woff2$/.test(u)), 'the KaTeX fonts load relative to the stylesheet');
  });

  await check('valid formulas typeset: visual HTML + MathML; the TeX source stays, hidden', async () => {
    const r = await page.evaluate(() =>
      ['mr-quadratic', 'mr-card', 'mr-inline', 'mr-terms', 'mr-aligned', 'mr-matrix', 'mr-cases'].map((id) => {
        const el = document.getElementById(id)!;
        return {
          id,
          state: el.dataset.state,
          html: !!el.querySelector('.math-renderer-output .katex-html'),
          mathml: !!el.querySelector('.math-renderer-output .katex-mathml math'),
          source: getComputedStyle(el.querySelector('.math-renderer-source')!).display,
          chrome: el.querySelector('.math-renderer-output')!.hasAttribute('data-ce-chrome'),
        };
      }),
    );
    for (const f of r) assert.deepEqual(f, { id: f.id, state: 'rendered', html: true, mathml: true, source: 'none', chrome: true });
  });

  await check('display formulas are centered blocks, the inline one sits on the text line; the card has a panel', async () => {
    const r = await page.evaluate(() => {
      const inline = document.getElementById('mr-inline')!;
      const line = document.getElementById('mr-sentence')!.getBoundingClientRect();
      const box = inline.querySelector('.katex')!.getBoundingClientRect();
      const card = getComputedStyle(document.getElementById('mr-card')!);
      return {
        display: !!document.querySelector('#mr-quadratic .katex-display'),
        inlineDisplay: !!inline.querySelector('.katex-display'),
        inlineLine: box.top >= line.top - 1 && box.bottom <= line.bottom + 1,
        cardBorder: card.borderTopWidth,
        cardRadius: card.borderTopLeftRadius !== '0px',
      };
    });
    assert.deepEqual(r, { display: true, inlineDisplay: false, inlineLine: true, cardBorder: '1px', cardRadius: true });
  });

  await check('KaTeX\'s MathML speaks the formula; the visual HTML is hidden from assistive technology', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('mr-quadratic')!;
      return {
        hidden: el.querySelector('.katex-html')!.getAttribute('aria-hidden'),
        annotation: el.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim(),
      };
    });
    assert.equal(r.hidden, 'true');
    assert.equal(r.annotation, 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  });

  await check('malformed TeX → the error state: the source stays visible, an alert names the parse error', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('mr-bad')!;
      const out = el.querySelector('output.math-renderer-error');
      return { state: el.dataset.state, name: el.dataset.stateName, role: out?.getAttribute('role'), msg: out?.textContent ?? '', source: getComputedStyle(el.querySelector('.math-renderer-source')!).display, output: !!el.querySelector('.math-renderer-output') };
    });
    assert.equal(r.state, 'error');
    assert.equal(r.name, 'error');
    assert.equal(r.role, 'alert');
    assert.match(r.msg, /KaTeX parse error/);
    assert.equal(r.source, 'block');
    assert.equal(r.output, false);
  });

  await check('untrusted TeX: \\href renders as an unsupported command - no link', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('mr-href')!;
      return { links: el.querySelectorAll('a').length, text: el.querySelector('.math-renderer-output')?.textContent ?? '' };
    });
    assert.equal(r.links, 0);
    assert.match(r.text, /\\href/);
  });

  await check('a notation tree: every named term is one marked element; described terms get buttons', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('mr-terms')!;
      return {
        marked: [...el.querySelectorAll('.math-renderer-output .katex-html [data-df-math-id]')].map((n) => (n as HTMLElement).dataset.dfMathId),
        buttons: [...el.querySelectorAll('.math-renderer-term')].map((b) => [b.getAttribute('data-math-term'), b.textContent, b.getAttribute('tabindex')]),
        group: el.querySelector('.math-renderer-terms')!.getAttribute('aria-label'),
      };
    });
    // KaTeX lays a fraction out bottom-up: the DOM order is the layout's, not the source's
    assert.deepEqual([...r.marked].sort(), ['dof', 'equals', 'mean', 'ratio', 'squares', 'variance']);
    assert.deepEqual(r.buttons, [
      ['variance', 'the sample variance s squared', '0'],
      ['squares', 'the squared deviations from the mean', '-1'],
      ['mean', 'the mean m', '-1'],
      ['dof', 'the degrees of freedom n minus 1', '-1'],
    ]);
    assert.equal(r.group, 'Terms of Sample variance');
  });

  await check('term markers keep the TeX layout: the marked formula is as wide as its clean TeX', async () => {
    const r = await page.evaluate(async () => {
      const shadcn = (globalThis as any).df$.shadcn;
      const el = document.getElementById('mr-terms')!;
      const { latex } = shadcn.mathRenderer.serialize(JSON.parse(el.querySelector('script.math-renderer-notation')!.textContent!));
      const plain = document.createElement('figure');
      plain.className = 'math-renderer';
      plain.id = 'mr-plain-probe';
      const code = document.createElement('code');
      code.className = 'math-renderer-source';
      code.textContent = latex;
      plain.append(code);
      document.body.append(plain);
      await new Promise((r) => setTimeout(r, 50));
      await plain.api!.settled?.();
      const w = (n: Element) => n.querySelector('.katex-html')!.getBoundingClientRect().width;
      const out = { marked: w(el), plain: w(plain), latex };
      plain.remove();
      return out;
    });
    assert.ok(Math.abs(r.marked - r.plain) < 0.5, `marked ${r.marked}px vs clean ${r.plain}px (${r.latex})`);
  });

  await check('a click on a typeset term selects it: highlighted, the button pressed, the linked row marked, described, announced', async () => {
    await page.evaluate(() => {
      (globalThis as any).__selects = [];
      document.addEventListener('math-select', (e) => (globalThis as any).__selects.push((e as CustomEvent).detail));
    });
    await page.click('#mr-terms .math-renderer-output .katex-html [data-df-math-id="mean"]');
    const r = await page.evaluate(() => {
      const el = document.getElementById('mr-terms')!;
      return {
        state: el.dataset.stateName,
        config: el.api!.getState().config.selected,
        marked: [...el.querySelectorAll('.katex-html [data-selected]')].map((n) => (n as HTMLElement).dataset.dfMathId),
        pressed: [...el.querySelectorAll('.math-renderer-term[aria-pressed="true"]')].map((b) => b.getAttribute('data-math-term')),
        row: [...document.querySelectorAll('#mr-legend [data-selected]')].map((n) => n.id),
        description: el.querySelector('.math-renderer-description')!.textContent,
        events: (globalThis as any).__selects,
      };
    });
    assert.deepEqual(r, {
      state: 'highlighted',
      config: ['mean'],
      marked: ['mean'],
      pressed: ['mean'],
      row: ['mr-row-mean'],
      description: 'the mean m',
      events: [{ ids: ['mean'], semanticIds: ['mean'], descriptions: ['the mean m'] }],
    });
  });

  await check('the nearest term wins: a click inside the squared deviations picks the innermost marked term', async () => {
    await page.click('#mr-terms .katex-html [data-df-math-id="squares"] .mopen');
    const selected = await page.evaluate(() => document.getElementById('mr-terms')!.api!.getState().config.selected);
    assert.deepEqual(selected, ['squares']);
  });

  await check('a click on a linked outside element selects its term; a second click clears', async () => {
    await page.click('#mr-row-dof');
    const a = await page.evaluate(() => document.getElementById('mr-terms')!.api!.getState().config.selected);
    await page.click('#mr-row-dof');
    const b = await page.evaluate(() => ({ selected: document.getElementById('mr-terms')!.api!.getState().config.selected, state: document.getElementById('mr-terms')!.dataset.stateName, rows: document.querySelectorAll('#mr-legend [data-selected]').length }));
    assert.deepEqual(a, ['dof']);
    assert.deepEqual(b, { selected: [], state: 'rendered', rows: 0 });
  });

  await check('keyboard: the term buttons are one tab stop, arrows move, Enter selects, Escape clears', async () => {
    await page.focus('#mr-terms .math-renderer-term[data-math-term="variance"]');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const focused = await page.evaluate(() => [document.activeElement?.getAttribute('data-math-term'), [...document.querySelectorAll('#mr-terms .math-renderer-term')].map((b) => b.getAttribute('tabindex')).join()]);
    await page.keyboard.press('Enter');
    const picked = await page.evaluate(() => document.getElementById('mr-terms')!.api!.getState().config.selected);
    await page.keyboard.press('End');
    const last = await page.evaluate(() => document.activeElement?.getAttribute('data-math-term'));
    await page.keyboard.press('Escape');
    const cleared = await page.evaluate(() => document.getElementById('mr-terms')!.api!.getState().config.selected);
    assert.deepEqual(focused, ['mean', '-1,-1,0,-1']);
    assert.deepEqual(picked, ['mean']);
    assert.equal(last, 'dof');
    assert.deepEqual(cleared, []);
  });

  await check('selection never re-typesets: the output node survives select()', async () => {
    const same = await page.evaluate(() => {
      const el = document.getElementById('mr-terms')!;
      const before = el.querySelector('.katex');
      (globalThis as any).df$.shadcn.mathRenderer.select(el, ['ratio']);
      const after = el.querySelector('.katex');
      (globalThis as any).df$.shadcn.mathRenderer.select(el, []);
      return before === after && !!before;
    });
    assert.equal(same, true);
  });

  await check('export: clean TeX without term markers; MathML without them', async () => {
    const r = await page.evaluate(async () => {
      const m = (globalThis as any).df$.shadcn.mathRenderer;
      return { tex: await m.export('#mr-terms'), mathml: await m.export('#mr-terms', 'mathml'), raw: await m.export('#mr-quadratic') };
    });
    assert.equal(r.tex, '{s}^{2} = \\frac{\\sum {\\left({x}_{i} - m\\right)}^{2}}{n - 1}');
    assert.match(r.mathml, /^<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
    assert.doesNotMatch(r.mathml + r.tex, /htmlData|df-math-id/);
    assert.equal(r.raw, 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  });

  await check('notation input is a closed grammar: TeX in a symbol, a duplicate id and an unknown kind are refused', async () => {
    const r = await page.evaluate(() => {
      const m = (globalThis as any).df$.shadcn.mathRenderer;
      const fail = (tree: unknown) => {
        try {
          m.serialize(tree);
          return 'accepted';
        } catch (e) {
          return (e as Error).message;
        }
      };
      return [
        fail({ kind: 'symbol', value: '\\href' }),
        fail({ kind: 'sequence', children: [{ kind: 'symbol', value: 'x', id: 'a' }, { kind: 'symbol', value: 'y', id: 'a' }] }),
        fail({ kind: 'macro', value: 'x' }),
        m.serialize({ kind: 'text', value: '\\gdef}{' }).latex,
      ];
    });
    assert.match(r[0], /symbol/);
    assert.match(r[1], /unique/);
    assert.match(r[2], /kind/);
    assert.equal(r[3], '\\text{\\textbackslash{}gdef\\}\\{}');
  });

  await check('setSource renders another source and clears the selection; a bad config changes nothing', async () => {
    const r = await page.evaluate(async () => {
      const el = document.getElementById('mr-card')!;
      await (globalThis as any).df$.shadcn.mathRenderer.setSource(el, { format: 'latex', text: '\\int_0^1 x\\,dx = \\tfrac12' });
      const typeset = el.querySelector('annotation')?.textContent;
      const code = el.querySelector('.math-renderer-source')!.textContent;
      let refused = '';
      try {
        el.api!.setState('highlighted', { selected: ['nope'] });
      } catch (e) {
        refused = (e as Error).message;
      }
      return { typeset, code, refused, state: el.api!.getState().name, selected: el.api!.getState().config.selected };
    });
    assert.equal(r.typeset, '\\int_0^1 x\\,dx = \\tfrac12');
    assert.equal(r.code, '\\int_0^1 x\\,dx = \\tfrac12');
    assert.match(r.refused, /unknown term/);
    assert.deepEqual([r.state, r.selected], ['rendered', []]);
  });

  await check("state API: 'default' shows the TeX, 'rendered' typesets, 'error' shows a message, unknown names throw", async () => {
    const r = await page.evaluate(async () => {
      const el = document.getElementById('mr-quadratic')!;
      el.api!.setState('default');
      const d = { state: el.dataset.state ?? null, output: !!el.querySelector('.math-renderer-output'), source: getComputedStyle(el.querySelector('.math-renderer-source')!).display };
      el.api!.setState('error', { message: 'Offline' });
      const e = el.querySelector('.math-renderer-error')?.textContent;
      await el.api!.setState('rendered');
      const back = el.dataset.state;
      let err = '';
      try {
        el.api!.setState('nope');
      } catch (x) {
        err = (x as Error).message;
      }
      return { d, e, back, err };
    });
    assert.deepEqual(r.d, { state: null, output: false, source: 'block' });
    assert.equal(r.e, 'Offline');
    assert.equal(r.back, 'rendered');
    assert.ok(r.err.length > 0);
  });

  await check('TeX past the 65,536-byte limit: the formula shows the error, the source stays - no page error', async () => {
    const r = await page.evaluate(async () => {
      const f = document.createElement('figure');
      f.className = 'math-renderer';
      f.id = 'mr-oversized';
      const code = document.createElement('code');
      code.className = 'math-renderer-source';
      code.textContent = 'x+'.repeat(40_000) + 'x';
      f.append(code);
      document.body.append(f);
      await new Promise((r) => setTimeout(r, 50));
      const out = { state: f.dataset.stateName, alert: f.querySelector('.math-renderer-error')?.textContent, source: !!f.querySelector('.math-renderer-source') };
      f.remove();
      return out;
    });
    assert.deepEqual(r, { state: 'error', alert: 'TeX must be a string of at most 65,536 bytes', source: true });
  });

  await check('a formula added later typesets on insertion', async () => {
    const state = await page.evaluate(async () => {
      const f = document.createElement('figure');
      f.className = 'math-renderer';
      f.innerHTML = '<code class="math-renderer-source">\\sqrt{2}</code>'; // test-side markup, not component code
      document.body.append(f);
      await new Promise((r) => setTimeout(r, 50));
      await f.api!.settled?.();
      const s = f.dataset.state;
      f.remove();
      return s;
    });
    assert.equal(state, 'rendered');
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render() contract: render(state) reproduces each state; the store mirrors it', async () => {
    await assertRenderContract(page, '.math-renderer[id]', ['default', 'rendered', 'highlighted', 'error'], {
      runtimeOwned: '.math-renderer-output, .math-renderer-terms, .math-renderer-description',
      runtimeAttrs: ['aria-busy'],
      settled,
    });
  });

  await page.close();
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nmath-renderer.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nmath-renderer.e2e: all checks passed');
