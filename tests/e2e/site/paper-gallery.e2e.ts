import assert from 'node:assert/strict';
import { chromium, type Frame, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { pageRel } from '../../../src/documentation/lib/page-dirs.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: the Paper Gallery pages are templates composed from other components -
 * each paper promises one behavior of the component it shows (a theme chooser
 * rethemes, a swap darkens, a framed model card controls the paper, a session
 * replays, a formula is typeset and numbered, a model answers back). This loads every gallery page like a reader, boots its example in
 * the docs sandbox, and drives that behavior; the Iframe docs page's bridge
 * example rides along. Known, unrelated noise is ignored: the header's GitHub
 * star request (rate-limited in CI) and the sandbox's refusal of a captions
 * track (an opaque origin may not load it - a real page does).
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
const NOISE = /api\.github\.com|status of 403|Unsafe attempt to load URL .*\.vtt/;

/** Open a docs page and return one of its examples' sandbox (the first by default), booted. */
async function open(slug: string, nth = 0): Promise<{ page: Page; frame: Frame; errors: string[] }> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(20_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push(m.text()); });
  // the pinned vendors the math papers load (KaTeX, MathLive, the Compute Engine) come from node_modules
  await offlineJsdelivr(page);
  await page.goto(`${server.url}/dist/documentation/${pageRel(slug)}`, { waitUntil: 'load' });
  assert.equal(await page.locator('main h1').count(), 1, `${slug}: h1`);
  const card = page.locator('.code-example').nth(nth);
  await card.scrollIntoViewIfNeeded();
  const frame = (await (await card.locator('iframe').first().elementHandle())!.contentFrame())!;
  await frame.waitForFunction(() => typeof (globalThis as any).df$ === 'function' && document.querySelector('.paper, .iframe'));
  return { page, frame, errors };
}

const PAPERS = ['paper-themes', 'paper-dark-mode', 'paper-styles', 'paper-two-column', 'paper-redeschrift', 'paper-code', 'paper-charts', 'paper-diff', 'paper-toc', 'paper-schema', 'paper-media', 'paper-big-data', 'paper-chat', 'paper-math', 'paper-math-interactive'];

try {
  await check('the gallery page links every paper, and the sidebar lists each', async () => {
    const page = await browser.newPage();
    await page.goto(`${server.url}/dist/documentation/papers/paper-gallery.html`, { waitUntil: 'load' });
    const linked = await page.$$eval('main a.card', (as) => as.map((a) => a.getAttribute('href')));
    assert.deepEqual(linked.sort(), PAPERS.map((p) => `${p}.html`).sort());
    for (const p of PAPERS) assert.equal(await page.locator(`.nav-link[href="${p}.html"]`).count(), 1, p);
    await page.close();
  });

  await check('Theme Chooser: picking a theme rethemes the whole paper', async () => {
    const { page, frame, errors } = await open('paper-themes');
    const primary = () => frame.evaluate(() => getComputedStyle(document.querySelector('.paper-title')!).color + '|' + getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
    const before = await primary();
    await frame.click('.theme-switcher-trigger');
    await frame.click('[data-theme-id="catppuccin"]');
    await frame.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#8839ef');
    assert.notEqual(await primary(), before);
    // the theme's resource sidecar: a sandbox (opaque origin) may not fetch it here, and
    // a theme without one answers 404 by design - neither is the paper's error
    assert.deepEqual(errors.filter((e) => !/catppuccin\.json|CORS|net::ERR_FAILED/.test(e)), []);
    await page.close();
  });

  await check('Light and Dark: the Swap puts the dark palette on the page', async () => {
    const { page, frame, errors } = await open('paper-dark-mode');
    const bg = () => frame.evaluate(() => getComputedStyle(document.querySelector('.paper')!).backgroundColor);
    const light = await bg();
    await frame.click('#pd-mode');
    await frame.waitForFunction(() => document.documentElement.classList.contains('dark'));
    assert.notEqual(await bg(), light);
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('House Styles: the Toggle Group switches data-variant on the paper', async () => {
    const { page, frame, errors } = await open('paper-styles');
    await frame.click('[data-style="classic"]');
    assert.equal(await frame.getAttribute('#ps-paper', 'data-variant'), 'classic');
    await frame.click('[data-style="modern"]');
    assert.equal(await frame.getAttribute('#ps-paper', 'data-variant'), null);
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Two Columns: the typeset body sets two columns with a drop initial; beside it the lead sets capitals', async () => {
    const { page, frame, errors } = await open('paper-two-column');
    const r = await frame.evaluate(() => {
      const set = document.querySelector('.typeset')!;
      const p = set.querySelector('p')!;
      // beside an initial the small-caps lead sets letterspaced capitals (the line's top meets the initial's)
      return { cols: getComputedStyle(set).columnCount, initial: getComputedStyle(p, '::first-letter').getPropertyValue('initial-letter'), lead: getComputedStyle(p, '::first-line').textTransform };
    });
    assert.deepEqual(r, { cols: '2', initial: '3', lead: 'uppercase' });
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Redeschrift: the framed model card follows its content and controls the paper', async () => {
    const { page, frame, errors } = await open('paper-redeschrift');
    await frame.waitForFunction(() => document.querySelector('#rs-card .iframe-frame')!.getBoundingClientRect().height > 140);
    const card = (await (await frame.$('#rs-card .iframe-frame'))!.contentFrame())!;
    await card.click('[data-id="L"]');
    await frame.waitForFunction(() => document.getElementById('rs-wer')!.textContent === '3.12 %');
    const best = await frame.$$eval('#rs-variants tr[data-best]', (rows) => rows.map((r) => (r as HTMLElement).dataset.variantId));
    assert.deepEqual(best, ['L']);
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Code Listings: three Code Mockup windows, the diff marked', async () => {
    const { page, frame, errors } = await open('paper-code');
    assert.equal(await frame.locator('.mockup-code').count(), 3);
    assert.equal(await frame.locator('pre[data-diff="add"]').count(), 2);
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Code Listings, print layout: in the Print device the test run splits over the two columns, each piece a framed window, its caption with the last piece', async () => {
    const { page, frame, errors } = await open('paper-code', 1);
    await frame.waitForFunction(() => document.documentElement.hasAttribute('data-ce-print'));
    const r = await frame.evaluate(() => {
      const win = document.querySelector('.paper-figure[data-break-inside="allow"] .mockup-code')!;
      const pieces = [...win.getClientRects()];
      const last = pieces[pieces.length - 1];
      const cap = document.querySelector('.paper-figure[data-break-inside="allow"] > figcaption')!.getBoundingClientRect();
      return { pieces: pieces.length, clone: getComputedStyle(win).boxDecorationBreak, withLast: Math.abs(cap.left - last.left) < 2 && cap.top >= last.bottom - 1 };
    });
    assert.deepEqual(r, { pieces: 2, clone: 'clone', withLast: true });
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Charts and Figures: both charts draw; in the Print device the paper is a block at the print scale and each chart fits its column', async () => {
    const { page, frame, errors } = await open('paper-charts');
    await frame.waitForFunction(() => document.querySelectorAll('.paper-chart svg, .paper-chart canvas').length === 2, undefined, { timeout: 15_000 });
    await page.close();
    const printed = await open('paper-charts', 1);
    await printed.frame.waitForFunction(() => document.documentElement.hasAttribute('data-ce-print'));
    await printed.frame.waitForFunction(() => document.querySelectorAll('.paper-chart svg, .paper-chart canvas').length === 2, undefined, { timeout: 15_000 });
    const r = await printed.frame.evaluate(() => {
      const paper = document.querySelector('.paper')!;
      return {
        paper: [getComputedStyle(paper).display, getComputedStyle(paper).zoom],
        fit: [...document.querySelectorAll('.paper-chart')].every((c) => c.querySelector('svg, canvas')!.getBoundingClientRect().width <= c.getBoundingClientRect().width + 1),
      };
    });
    assert.deepEqual(r, { paper: ['block', '0.8'], fit: true });
    assert.deepEqual([...errors, ...printed.errors], []);
    await printed.page.close();
  });

  await check('Before and After: two Diff figures; in the Print device both sides stand side by side, no divider', async () => {
    const { page, frame, errors } = await open('paper-diff');
    await frame.waitForFunction(() => document.querySelectorAll('.diff[data-init]').length === 2);
    await page.close();
    const printed = await open('paper-diff', 1);
    await printed.frame.waitForFunction(() => document.documentElement.hasAttribute('data-ce-print'));
    const r = await printed.frame.evaluate(() => {
      const [a, b] = [document.querySelector('.diff-item-1')!, document.querySelector('.diff-item-2')!].map((e) => e.getBoundingClientRect());
      return { beside: b.left >= a.right - 1 && Math.abs(a.top - b.top) < 1, range: getComputedStyle(document.querySelector('.diff-range')!).display };
    });
    assert.deepEqual(r, { beside: true, range: 'none' });
    assert.deepEqual([...errors, ...printed.errors], []);
    await printed.page.close();
  });

  await check('Table of Contents: two levels of numbered links; in the Print device the contents are left out', async () => {
    const { page, frame, errors } = await open('paper-toc');
    assert.deepEqual(await frame.evaluate(() => [document.querySelectorAll('.paper-toc > ol > li').length, document.querySelectorAll('.paper-toc li li').length, getComputedStyle(document.querySelector('.paper-toc')!).display]), [3, 4, 'grid']);
    await page.close();
    const printed = await open('paper-toc', 1);
    await printed.frame.waitForFunction(() => document.documentElement.hasAttribute('data-ce-print'));
    assert.equal(await printed.frame.evaluate(() => getComputedStyle(document.querySelector('.paper-toc')!).display), 'none');
    assert.deepEqual([...errors, ...printed.errors], []);
    await printed.page.close();
  });

  await check('Database Schema: the ER diagram draws its six relations', async () => {
    const { page, frame, errors } = await open('paper-schema');
    await frame.waitForFunction(() => document.querySelectorAll('#pe-er .diagram-wire').length >= 6);
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Images and Video: lightbox figures, a ready hover gallery and a video', async () => {
    const { page, frame, errors } = await open('paper-media');
    assert.equal(await frame.locator('.image[data-preview]').count(), 3);
    await frame.locator('.hover-gallery').scrollIntoViewIfNeeded();
    await frame.waitForFunction(() => document.querySelector('.hover-gallery')!.hasAttribute('data-ready'));
    assert.equal(await frame.locator('video source').count(), 2);
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Big Data: the grid windows 100,000 rows, the tree its corpus', async () => {
    const { page, frame, errors } = await open('paper-big-data');
    await frame.waitForFunction(() => document.querySelectorAll('#pb-grid .data-grid-body .data-grid-row').length > 5 && document.querySelector('#pb-tree [role="treeitem"]'));
    const rendered = await frame.locator('#pb-grid .data-grid-body .data-grid-row').count();
    assert.ok(rendered < 200, `windowed: ${rendered} rows in the DOM`);
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Chat Replay: three turns replay, the replies stream, the session settles', async () => {
    const { page, frame, errors } = await open('paper-chat');
    await frame.waitForFunction(() => document.getElementById('pr-status')!.textContent === 'Replayed - 3 turns.', undefined, { timeout: 30_000 });
    assert.equal(await frame.locator('#pr-chat .session-item').count(), 6);
    assert.notEqual(await frame.getAttribute('#pr-chat', 'data-state-name'), 'streaming');
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Formulas: every formula typeset; five numbered equations, each centered with its number at the column edge', async () => {
    const { page, frame, errors } = await open('paper-math');
    await frame.waitForFunction(() => [...document.querySelectorAll('.math-renderer')].every((f) => (f as HTMLElement).dataset.state === 'rendered'), undefined, { timeout: 15_000 });
    const r = await frame.evaluate(() => {
      const column = document.querySelector('.paper-section')!.getBoundingClientRect();
      return [...document.querySelectorAll('.paper-equation')].map((eq) => {
        const num = eq.querySelector('.paper-equation-num')!.getBoundingClientRect();
        const formula = eq.querySelector('.katex-html')!.getBoundingClientRect();
        return {
          num: eq.querySelector('.paper-equation-num')!.textContent,
          atEdge: Math.abs(num.right - column.right) < 2,
          centered: Math.abs(formula.left + formula.width / 2 - (column.left + column.width / 2)) < 24,
          sameLine: num.top < formula.bottom && num.bottom > formula.top,
        };
      });
    });
    assert.deepEqual(r.map((e) => e.num), ['(1)', '(2)', '(3)', '(4)', '(5)']);
    assert.ok(r.every((e) => e.atEdge && e.centered && e.sameLine), JSON.stringify(r));
    const inline = await frame.evaluate(() => document.querySelectorAll('.paper-section .math-renderer[data-variant="inline"] .katex').length);
    assert.ok(inline >= 8, `${inline} inline formulas`);
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Formulas, print layout: in the Print device an equation is kept whole and keeps its number', async () => {
    const { page, frame, errors } = await open('paper-math', 1);
    await frame.waitForFunction(() => document.documentElement.hasAttribute('data-ce-print'));
    await frame.waitForFunction(() => [...document.querySelectorAll('.math-renderer')].every((f) => (f as HTMLElement).dataset.state === 'rendered'), undefined, { timeout: 15_000 });
    const r = await frame.evaluate(() => [...document.querySelectorAll('.paper-equation')].map((eq) => [getComputedStyle(eq).breakInside, eq.querySelector('.paper-equation-num')!.textContent]));
    assert.deepEqual(r, [['avoid', '(3)'], ['avoid', '(4)']]);
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Interactive Math: a table row selects its term in the formula; the editor drives equation (2); the engine differentiates with six steps and keeps the denominator condition', async () => {
    const { page, frame, errors } = await open('paper-math-interactive');
    await frame.waitForFunction(() => document.querySelector('#pmi-model')?.getAttribute('data-state') === 'rendered' && document.querySelector('.math-editor[data-ready]'), undefined, { timeout: 15_000 });
    await frame.click('tr[data-math-term="r"]');
    const selected = await frame.evaluate(() => ({
      state: (document.getElementById('pmi-model') as HTMLElement).dataset.stateName,
      marked: [...document.querySelectorAll('#pmi-model .katex-html [data-selected]')].map((n) => (n as HTMLElement).dataset.dfMathId),
      pressed: document.querySelector('#pmi-model .math-renderer-term[aria-pressed="true"]')?.textContent,
      row: !!document.querySelector('tr[data-math-term="r"][data-selected]'),
    }));
    assert.deepEqual(selected, { state: 'highlighted', marked: ['r'], pressed: 'r - the growth rate', row: true });
    await frame.evaluate(() => (globalThis as any).df$.shadcn.mathEditor.setValue(document.querySelector('.math-editor')!, 'P(t) = K e^{-A e^{-rt}}'));
    await frame.waitForFunction(() => document.querySelector('#pmi-yours annotation')?.textContent === 'P(t) = K e^{-A e^{-rt}}', undefined, { timeout: 15_000 });
    await frame.click('[data-math-run]');
    await frame.waitForFunction(() => (document.querySelector('.math-compute') as HTMLElement).dataset.stateName === 'result', undefined, { timeout: 30_000 });
    const r = await frame.evaluate(() => {
      const c = (document.querySelector('.math-compute') as any).api.getState().config;
      return { rules: c.result.steps.map((s: any) => s.rule), condition: c.result.conditions.map((k: any) => k.json[0]), coverage: c.result.coverage, result: c.result.result.latex };
    });
    assert.deepEqual(r.rules, ['derivative.quotient-rule', 'derivative.sum-rule', 'derivative.product-rule', 'derivative.exponential-rule', 'derivative.constant-multiple', 'derivative.product-rule']);
    assert.deepEqual([r.condition, r.coverage], [['NotEqual'], 'partial']);
    assert.match(r.result, /^\\frac\{AKr/);
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Iframe docs page: the bridge example - the framed page sets the host statistic', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(20_000);
    await page.goto(`${server.url}/dist/documentation/data-display/iframe.html`, { waitUntil: 'load' });
    const card = page.locator('.code-example').nth(3);
    await card.scrollIntoViewIfNeeded();
    const frame = (await (await card.locator('iframe').first().elementHandle())!.contentFrame())!;
    await frame.waitForSelector('#iframe-bridge[data-init]');
    const inner = (await (await frame.$('#iframe-bridge .iframe-frame'))!.contentFrame())!;
    await inner.click('[data-id="S"]');
    await frame.waitForFunction(() => document.getElementById('iframe-wer')!.textContent === '3.27 %');
    await page.close();
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\npaper-gallery.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('paper-gallery.e2e: all checks passed');
