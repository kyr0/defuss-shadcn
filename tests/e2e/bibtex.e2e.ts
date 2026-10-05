import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: a citation is only useful when it is RIGHT - the exact reference a
 * style prescribes, the BibTeX intact (bare macros stay bare, LaTeX read) -
 * and when the copy button copies exactly what is shown. The fixture is the
 * doc page's examples (tmp generator); these checks pin the formats, the
 * tabs (APG keyboard), the copy (clipboard + fallback + feedback), every
 * variant and option, the df$.shadcn.bibtex API, the events and the State
 * API / render() contract.
 */

const FIXTURE = '/tests/e2e/bibtex.e2e-fixture.html';
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

const show = (page: Page, id: string, format: string) =>
  page.evaluate(([id, f]) => { (globalThis as any).df$.shadcn.bibtex.show(document.getElementById(id), f); return (globalThis as any).df$.shadcn.bibtex.text(document.getElementById(id)); }, [id, format]);

try {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => document.querySelectorAll('.bibtex:not([data-init])').length === 0 && !!(globalThis as any).df$?.shadcn?.bibtex);

  await check('every block gets a bar and a view; the authored source hides', async () => {
    const r = await page.$$eval('.bibtex', (els) => els.map((el) => ({
      bar: !!el.querySelector(':scope > .bibtex-bar'),
      view: !!el.querySelector(':scope > .bibtex-view'),
      src: getComputedStyle(el.querySelector('.bibtex-source')!.closest('pre') ?? el.querySelector('.bibtex-source')!).display,
    })));
    assert.ok(r.every((x) => x.bar && x.view), JSON.stringify(r));
    assert.ok(r.every((x) => x.src === 'none'), JSON.stringify(r));
  });

  await check('BibTeX: normalized, "=" aligned, a bare macro stays bare', async () => {
    const t = await show(page, 'cite-report', 'bibtex');
    assert.ok(t.startsWith('@techreport{homberg2026vae,\n  title       = {Verified Agentic Engineering'), t);
    assert.match(t, /\n  month       = oct,\n/);
    assert.match(t, /\n  year        = \{2026\},\n/);
    assert.ok(t.endsWith('\n}'));
  });

  await check('BibTeX is highlighted - type, key, field, value', async () => {
    await show(page, 'cite-report', 'bibtex');
    const n = await page.$eval('#cite-report .bibtex-code', (c) => ['type', 'key', 'field', 'value'].map((k) => c.querySelectorAll(`.bibtex-${k}`).length));
    assert.deepEqual(n.map((x) => x > 0), [true, true, true, true]);
  });

  await check('APA, MLA, Chicago, Harvard, IEEE: the exact reference', async () => {
    assert.equal(await show(page, 'cite-report', 'apa'), 'Homberg, A. (2026). Verified Agentic Engineering: How a deterministic verifier lets coding agents grow a UI system. defuss. https://github.com/kyr0/defuss-vae');
    assert.equal(await show(page, 'cite-report', 'mla'), 'Homberg, Aron. Verified Agentic Engineering: How a deterministic verifier lets coding agents grow a UI system. defuss, 2026. https://github.com/kyr0/defuss-vae.');
    assert.equal(await show(page, 'cite-report', 'chicago'), 'Homberg, Aron. 2026. Verified Agentic Engineering: How a deterministic verifier lets coding agents grow a UI system. defuss. https://github.com/kyr0/defuss-vae.');
    assert.equal(await show(page, 'cite-report', 'harvard'), 'Homberg, A. (2026) Verified Agentic Engineering: How a deterministic verifier lets coding agents grow a UI system. defuss. Available at: https://github.com/kyr0/defuss-vae.');
    assert.equal(await show(page, 'cite-report', 'ieee'), '[1] A. Homberg, “Verified Agentic Engineering: How a deterministic verifier lets coding agents grow a UI system,” defuss, Tech. Rep., Oct. 2026. [Online]. Available: https://github.com/kyr0/defuss-vae');
  });

  await check('a reference list: IEEE numbered in source order, APA sorted by author and year', async () => {
    const ieee = (await show(page, 'cite-list', 'ieee')).split('\n\n');
    assert.equal(ieee.length, 3);
    assert.equal(ieee[0], '[1] A. Vaswani et al., “Attention Is All You Need,” in Advances in Neural Information Processing Systems, 2017, pp. 5998–6008.');
    assert.equal(ieee[1], '[2] D. E. Knuth, “Literate Programming,” The Computer Journal, vol. 27, no. 2, pp. 97–111, 1984, doi: 10.1093/comjnl/27.2.97.');
    const apa = (await show(page, 'cite-list', 'apa')).split('\n\n');
    assert.deepEqual(apa.map((r: string) => r.split(' (')[0]), ['Knuth, D. E.', 'Knuth, D. E.', 'Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I.']);
    assert.equal(await page.$eval('#cite-list .bibtex-list', (l) => l.children.length), 3);
  });

  await check('LaTeX is read: {\\L} → Ł, {\\TeX} → TeX, -- → en dash; journals are italic', async () => {
    const t = await show(page, 'cite-list', 'chicago');
    assert.match(t, /Łukasz Kaiser/);
    assert.match(t, /The TeXbook\./);
    assert.match(t, /27 \(2\): 97–111/);
    assert.ok(await page.$$eval('#cite-list .bibtex-ref i', (is) => is.some((i) => i.textContent === 'The Computer Journal')));
  });

  await check('DOIs and URLs are links (new tab, noopener) - in references and in the BibTeX; the copy text carries no markup', async () => {
    await show(page, 'cite-list', 'ieee');
    const doi = await page.$eval('#cite-list .bibtex-link[href="https://doi.org/10.1093/comjnl/27.2.97"]', (a) => ({ text: a.textContent, target: a.getAttribute('target'), rel: a.getAttribute('rel') }));
    assert.deepEqual(doi, { text: '10.1093/comjnl/27.2.97', target: '_blank', rel: 'noopener' });
    await show(page, 'cite-report', 'apa');
    assert.equal(await page.$eval('#cite-report .bibtex-view a', (a) => a.getAttribute('href')), 'https://github.com/kyr0/defuss-vae');
    await show(page, 'cite-report', 'bibtex');
    assert.equal(await page.$eval('#cite-report .bibtex-code .bibtex-value a', (a) => a.getAttribute('href')), 'https://github.com/kyr0/defuss-vae');
    // a click opens the target in a new tab (stubbed - no network)
    await page.context().route('https://github.com/**', (r) => r.fulfill({ contentType: 'text/html', body: 'ok' }));
    const [popup] = await Promise.all([page.context().waitForEvent('page'), page.click('#cite-report .bibtex-code a')]);
    assert.equal(popup.url().replace(/\/$/, ''), 'https://github.com/kyr0/defuss-vae');
    await popup.close();
    for (const f of ['apa', 'ieee', 'bibtex']) {
      const t = await show(page, 'cite-report', f);
      assert.ok(!/[<>]|href=/.test(t), `${f}: ${t}`);
    }
  });

  await check('a format a block does not offer falls back to its first', async () => {
    await show(page, 'cite-list', 'mla');
    assert.equal(await page.getAttribute('#cite-list', 'data-format'), 'ieee');
  });

  await check('tabs: a click shows the format - aria-selected + roving tabindex, the view is the tabpanel', async () => {
    await page.click('#cite-report .bibtex-tab[data-format="mla"]');
    assert.equal(await page.getAttribute('#cite-report', 'data-format'), 'mla');
    const tabs = await page.$$eval('#cite-report .bibtex-tab', (ts) => ts.map((t) => `${t.getAttribute('data-format')}:${t.getAttribute('aria-selected')}:${t.getAttribute('tabindex')}`));
    assert.ok(tabs.includes('mla:true:0') && tabs.filter((t) => t.endsWith(':0')).length === 1, tabs.join(' '));
    const panel = await page.$eval('#cite-report .bibtex-view', (v) => ({ role: v.getAttribute('role'), id: v.id, owner: document.querySelector('#cite-report .bibtex-tab')!.getAttribute('aria-controls') }));
    assert.equal(panel.role, 'tabpanel');
    assert.equal(panel.id, panel.owner);
  });

  await check('tabs: ← / → / Home / End move and show (APG, automatic activation)', async () => {
    await page.focus('#cite-report .bibtex-tab[data-format="mla"]');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getAttribute('#cite-report', 'data-format'), 'chicago');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-format')), 'chicago');
    await page.keyboard.press('End');
    assert.equal(await page.getAttribute('#cite-report', 'data-format'), 'ieee');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getAttribute('#cite-report', 'data-format'), 'bibtex', 'wraps around');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Home');
    assert.equal(await page.getAttribute('#cite-report', 'data-format'), 'bibtex');
  });

  await check('bibtex-format fires on a change with the format and the copy text', async () => {
    const detail = await page.evaluate(() => new Promise<any>((done) => {
      const el = document.getElementById('cite-report')!;
      el.addEventListener('bibtex-format', (e) => done((e as CustomEvent).detail), { once: true });
      (globalThis as any).df$.shadcn.bibtex.show(el, 'harvard');
    }));
    assert.equal(detail.format, 'harvard');
    assert.match(detail.text, /^Homberg, A\. \(2026\)/);
  });

  await check('copy: the clipboard gets exactly what is shown; the button says Copied, the status announces it', async () => {
    await show(page, 'cite-report', 'apa');
    const want = await page.evaluate(() => (globalThis as any).df$.shadcn.bibtex.text(document.getElementById('cite-report')));
    await page.click('#cite-report .bibtex-copy');
    await page.waitForFunction(() => document.getElementById('cite-report')!.hasAttribute('data-copied'));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), want);
    assert.equal(await page.textContent('#cite-report .bibtex-copy-label'), 'Copied');
    assert.equal(await page.textContent('#cite-report .bibtex-status'), 'APA copied to the clipboard');
    assert.equal(await page.getAttribute('#cite-report .bibtex-copy', 'aria-label'), 'Copy APA');
    assert.equal(await page.evaluate(() => (document.getElementById('cite-report') as any).api.getState().name), 'copied');
  });

  await check('copy feedback returns to default after two seconds', async () => {
    await page.waitForFunction(() => !document.getElementById('cite-report')!.hasAttribute('data-copied'), undefined, { timeout: 4000 });
    assert.equal(await page.textContent('#cite-report .bibtex-copy-label'), 'Copy');
    assert.equal(await page.evaluate(() => (document.getElementById('cite-report') as any).api.getState().config.format), 'apa');
  });

  await check('copy of the BibTeX tab copies the normalized BibTeX', async () => {
    await show(page, 'cite-list', 'bibtex');
    await page.click('#cite-list .bibtex-copy');
    await page.waitForFunction(() => document.getElementById('cite-list')!.hasAttribute('data-copied'));
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(clip.startsWith('@inproceedings{vaswani2017attention,\n  author    = {Ashish Vaswani'), clip.slice(0, 80));
    assert.equal(clip.split('\n\n').length, 3);
  });

  await check('a refused clipboard: the view is selected instead, bibtex-copy says ok: false, no Copied', async () => {
    const r = await page.evaluate(async () => {
      const el = document.getElementById('cite-js')!;
      const real = navigator.clipboard.writeText.bind(navigator.clipboard);
      (navigator.clipboard as any).writeText = () => Promise.reject(new Error('denied'));
      const heard = new Promise<any>((done) => el.addEventListener('bibtex-copy', (e) => done((e as CustomEvent).detail), { once: true }));
      const ok = await (globalThis as any).df$.shadcn.bibtex.copy(el);
      (navigator.clipboard as any).writeText = real;
      const d = await heard;
      return { ok, eventOk: d.ok, copied: el.hasAttribute('data-copied'), selected: String(getSelection()).slice(0, 30) };
    });
    assert.equal(r.ok, false);
    assert.equal(r.eventOk, false);
    assert.equal(r.copied, false);
    assert.match(r.selected, /^@inproceedings/);
  });

  await check('minimal: no tabs; the copy button floats and shows on hover', async () => {
    assert.equal(await page.$$eval('#cite-minimal .bibtex-tab', (t) => t.length), 0);
    const bar = () => page.$eval('#cite-minimal > .bibtex-bar', (b) => ({ pos: getComputedStyle(b).position, op: getComputedStyle(b).opacity }));
    await page.mouse.move(0, 0);
    await page.waitForTimeout(250);
    assert.deepEqual(await bar(), { pos: 'absolute', op: '0' });
    await page.hover('#cite-minimal');
    await page.waitForTimeout(250);
    assert.equal((await bar()).op, '1');
    assert.match(await page.textContent('#cite-minimal .bibtex-view') ?? '', /^Knuth, D\. E\. \(1984\)\. Literate Programming\./);
  });

  await check('inline: a <span> flowing in the sentence - the reference, then the copy icon', async () => {
    const r = await page.$eval('#cite-inline', (el) => ({
      display: getComputedStyle(el).display,
      order: [...el.children].filter((c) => !c.classList.contains('bibtex-source')).map((c) => c.className),
      tags: [el.querySelector('.bibtex-view')!.tagName, el.querySelector('.bibtex-ref')!.tagName],
    }));
    assert.equal(r.display, 'inline');
    assert.deepEqual(r.order, ['bibtex-view', 'bibtex-bar']);
    assert.deepEqual(r.tags, ['SPAN', 'SPAN']);
    assert.match(await page.textContent('#cite-inline .bibtex-view') ?? '', /^Knuth, Donald E\. “Literate Programming\.” The Computer Journal, vol\. 27, no\. 2, 1984, pp\. 97–111\./);
  });

  await check('options: data-copy="none", data-align="none", data-highlight="none", data-size="sm"', async () => {
    assert.equal(await page.$$eval('#cite-plain .bibtex-copy', (b) => b.length), 0);
    const t = await page.evaluate(() => (globalThis as any).df$.shadcn.bibtex.text(document.getElementById('cite-plain')));
    assert.match(t, /\n  author = \{Donald E\. Knuth\},\n  title = /);
    assert.equal(await page.$$eval('#cite-plain .bibtex-code span', (s) => s.length), 0);
    const size = await page.evaluate(() => [document.querySelector('#cite-plain .bibtex-code')!, document.querySelector('#cite-js .bibtex-code')!].map((c) => parseFloat(getComputedStyle(c).fontSize)));
    assert.ok(size[0] < size[1], String(size));
  });

  await check('df$.shadcn.bibtex: parse, format without an element, entries (a copy)', async () => {
    const r = await page.evaluate(() => {
      const lib = (globalThis as any).df$.shadcn.bibtex;
      const entries = lib.parse('@comment{x} @string{s = "y"} @misc{k, title = "A " # {B}, year = 1999, author = {{World Health Organization}}}');
      const ref = lib.format(entries, 'apa');
      const mine = lib.entries('#cite-list');
      mine[0].key = 'changed';
      return { n: entries.length, title: entries[0].fields.title, year: entries[0].fields.year, apa: ref.text, again: lib.entries('#cite-list')[0].key, formats: lib.formats };
    });
    assert.equal(r.n, 1);
    assert.equal(r.title, 'A B');
    assert.equal(r.year, '1999');
    assert.equal(r.apa, 'World Health Organization. (1999). A B.');
    assert.equal(r.again, 'vaswani2017attention');
    assert.deepEqual(r.formats, ['bibtex', 'apa', 'mla', 'chicago', 'harvard', 'ieee']);
  });

  await check('the outside controls of the script example drive it and log its events', async () => {
    await page.click('#cite-js-ieee');
    assert.equal(await page.getAttribute('#cite-js', 'data-format'), 'ieee');
    assert.equal(await page.textContent('#cite-js-log'), 'bibtex-format: ieee');
    await page.click('#cite-js-copy');
    await page.waitForFunction(() => /^bibtex-copy: ieee - \d+ characters$/.test(document.getElementById('cite-js-log')!.textContent ?? ''));
  });

  await check('State API: setState(default, { format }) / copied, unknown names throw, getState reports the format', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('cite-report') as any;
      el.api.setState('default', { format: 'chicago' });
      const a = el.getAttribute('data-format');
      el.api.setState('copied');
      const b = [el.api.getState().name, el.hasAttribute('data-copied'), el.getAttribute('data-state-name')];
      el.api.setState('default', el.api.getState().config);
      let threw = false;
      try { el.api.setState('nope'); } catch { threw = true; }
      return { a, b, back: el.hasAttribute('data-copied'), format: el.api.getState().config.format, threw };
    });
    assert.equal(r.a, 'chicago');
    assert.deepEqual(r.b, ['copied', true, 'copied']);
    assert.equal(r.back, false);
    assert.equal(r.format, 'chicago');
    assert.equal(r.threw, true);
  });

  await check('render(): the markup of each state, 1:1 (default, copied)', async () => {
    for (const sel of ['#cite-report', '#cite-list', '#cite-inline', '#cite-plain']) {
      await assertRenderContract(page, sel, ['default', 'copied'], { runtimeOwned: '.bibtex-bar, .bibtex-view' });
    }
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`bibtex.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('bibtex.e2e: all checks passed');
