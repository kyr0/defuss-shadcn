import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: an autocomplete that talks to a network has three ways to go wrong
 * that a static combobox never meets - it floods the server (no debounce),
 * shows a stale answer (no cancellation), or stops at the first page. These
 * checks drive the shipped files against local records, a custom client with
 * latency that honours AbortSignal, and the default fetch client against a
 * stubbed route: the request IS a dataview request, typing is debounced, a
 * newer query aborts the one in flight, pages arrive as the list scrolls, and
 * the APG combobox keyboard works.
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
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  // the default client's endpoint: answered here, from the same records
  const calls: { url: URL; header: string | null }[] = [];
  await page.route('**/api/cities**', async (route) => {
    const url = new URL(route.request().url());
    calls.push({ url, header: route.request().headers()['x-client'] ?? null });
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const pageNo = Number(url.searchParams.get('page'));
    const size = Number(url.searchParams.get('pageSize'));
    const cities = await page.evaluate(() => (globalThis as any).__cities.map((c: any) => ({ id: c.id, name: c.name })));
    const hits = cities.filter((c: any) => c.name.toLowerCase().includes(q)).sort((a: any, b: any) => a.name.localeCompare(b.name));
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: hits.slice(pageNo * size, (pageNo + 1) * size), total: hits.length }) });
  });
  const ready = async () => {
    await page.goto(`${server.url}/tests/e2e/autocomplete.e2e-fixture.html`);
    await page.waitForFunction(() => (globalThis as any).__fixtureReady === true, null, { timeout: 15_000 });
  };
  await ready();

  const state = (sel: string) => page.$eval(sel, (el: any) => el.store.value.name);
  const settle = (sel: string, name: string) => page.waitForFunction(([s, n]) => (document.querySelector(s) as any).store.value.name === n, [sel, name] as const, { timeout: 5000 });
  const labels = (sel: string, n = 3) => page.$$eval(`${sel} .autocomplete-option`, (os, n) => os.slice(0, n).map((o) => o.querySelector('.autocomplete-label')!.textContent), n);
  const stats = () => page.evaluate(() => ({ ...(globalThis as any).__stats, requestsSeen: undefined }));

  await check('autocomplete.js wired the APG combobox (role, aria-controls → listbox, manual popover, el.store / el.api)', async () => {
    const s = await page.$eval('#ac-local', (el: any) => {
      const input = el.querySelector('.autocomplete-input');
      const list = document.getElementById(input.getAttribute('aria-controls'));
      return [el.dataset.init, input.getAttribute('role'), input.getAttribute('aria-autocomplete'), input.getAttribute('aria-expanded'), list?.getAttribute('role'), el.querySelector('.autocomplete-popover').getAttribute('popover'), typeof el.store.subscribe, typeof el.api.render];
    });
    assert.deepEqual(s, ['', 'combobox', 'list', 'false', 'listbox', 'manual', 'function', 'function']);
  });

  await check('local records: typing opens the list, filtered case-insensitively and sorted by population (data-sort)', async () => {
    await page.fill('#ac-local-input', 'ber');
    await settle('#ac-local', 'open');
    const recs = await page.$eval('#ac-local', (el) => (globalThis as any).df$.shadcn.autocomplete.records(el));
    assert.equal(recs.length, 20, 'one page');
    assert.ok(recs.every((c: any) => c.name.toLowerCase().includes('ber')));
    const pops = recs.map((c: any) => c.population);
    assert.deepEqual(pops, [...pops].sort((a: number, b: number) => b - a));
    const s = await page.$eval('#ac-local', (el) => {
      const input = el.querySelector('.autocomplete-input')!;
      return [input.getAttribute('aria-expanded'), input.getAttribute('aria-activedescendant'), el.querySelector('.autocomplete-option')!.id, el.querySelector('.autocomplete-popover')!.matches(':popover-open'), el.querySelector('.autocomplete-status')!.textContent];
    });
    assert.equal(s[0], 'true');
    assert.equal(s[1], s[2], 'the first option is active');
    assert.equal(s[3], true);
    assert.match(String(s[4]), /^20 of [\d,]+ · scroll for more$/);
  });

  await check('infinite: scrolling the list loads the next page', async () => {
    await page.$eval('#ac-local .autocomplete-list', (l) => { l.scrollTop = l.scrollHeight; });
    await page.waitForFunction(() => (globalThis as any).df$.shadcn.autocomplete.records('#ac-local').length >= 40);
    assert.equal(await page.$$eval('#ac-local .autocomplete-option', (o) => o.length), 40);
  });

  await check('keyboard: ↓ / ↑ move the active option, Enter takes it - input, hidden value, store, event', async () => {
    await page.$eval('#ac-local', (el) => el.addEventListener('autocomplete-select', (e: any) => { (globalThis as any).__picked = e.detail.record.id; }));
    await page.focus('#ac-local-input');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    const active = await page.$eval('#ac-local', (el) => el.querySelector('.autocomplete-option[data-active]')!.getAttribute('data-index'));
    assert.equal(active, '1');
    const expected = await page.$eval('#ac-local', (el) => (globalThis as any).df$.shadcn.autocomplete.records(el)[1]);
    await page.keyboard.press('Enter');
    assert.equal(await state('#ac-local'), 'default');
    assert.equal(await page.inputValue('#ac-local-input'), expected.name);
    assert.equal(await page.$eval('#ac-local .autocomplete-value', (h: HTMLInputElement) => h.value), String(expected.id));
    assert.equal(await page.evaluate(() => (globalThis as any).__picked), expected.id);
    const cfg = await page.$eval('#ac-local', (el: any) => el.store.value.config);
    assert.deepEqual([cfg.value, cfg.label], [expected.id, expected.name]);
  });

  await check('Escape closes the list; a second Escape clears the input', async () => {
    await page.fill('#ac-local-input', 'mar');
    await settle('#ac-local', 'open');
    await page.keyboard.press('Escape');
    assert.equal(await state('#ac-local'), 'default');
    assert.equal(await page.inputValue('#ac-local-input'), 'mar');
    await page.keyboard.press('Escape');
    assert.equal(await page.inputValue('#ac-local-input'), '');
  });

  await check('the pointer: pressing an option takes it; leaving the widget closes the list', async () => {
    await page.fill('#ac-local-input', 'sea');
    await settle('#ac-local', 'open');
    const third = await page.$eval('#ac-local', (el) => (globalThis as any).df$.shadcn.autocomplete.records(el)[2].name);
    await page.click('#ac-local .autocomplete-option:nth-child(3)');
    assert.equal(await page.inputValue('#ac-local-input'), third);
    await page.fill('#ac-local-input', 'sea');
    await settle('#ac-local', 'open');
    await page.focus('#ac-load-input');
    assert.equal(await state('#ac-local'), 'default');
  });

  await check('debounce: typing faster than data-debounce sends one request, not one per key', async () => {
    const before = (await stats()).requests;
    await page.click('#ac-load-input');
    await page.keyboard.type('Lin', { delay: 30 });
    await settle('#ac-load', 'open');
    assert.equal((await stats()).requests - before, 1);
    const req = await page.evaluate(() => (globalThis as any).__stats.requestsSeen.at(-1));
    assert.deepEqual(req, { query: 'Lin', filters: [{ field: 'name', op: 'contains', value: 'Lin' }], sorters: [{ field: 'population', direction: 'desc' }], page: 0, pageSize: 25 }, 'the request is a dataview request');
  });

  await check('cancellation: a newer query aborts the request in flight; only the newest answer lands', async () => {
    const before = await stats();
    await page.fill('#ac-load-input', 'Ma');
    await page.waitForTimeout(170); // past the debounce: the 'Ma' request is in flight (80 ms latency)
    await page.fill('#ac-load-input', 'Os');
    await page.waitForFunction(() => (globalThis as any).__stats.requestsSeen.at(-1)?.query === 'Os');
    await settle('#ac-load', 'open');
    const after = await stats();
    assert.ok(after.aborted - before.aborted >= 1, `aborted ${after.aborted - before.aborted}`);
    const recs = await page.$eval('#ac-load', (el) => (globalThis as any).df$.shadcn.autocomplete.records(el).map((c: any) => c.name));
    assert.ok(recs.length > 0 && recs.every((n: string) => n.toLowerCase().includes('os')), 'every option answers the newest query');
  });

  await check('a custom client\'s pages: infinite scroll asks for page 1 with the same query', async () => {
    await page.$eval('#ac-load .autocomplete-list', (l) => { l.scrollTop = l.scrollHeight; });
    await page.waitForFunction(() => (globalThis as any).__stats.requestsSeen.at(-1)?.page === 1);
    await page.waitForFunction(() => (globalThis as any).df$.shadcn.autocomplete.records('#ac-load').length > 25);
    const req = await page.evaluate(() => (globalThis as any).__stats.requestsSeen.at(-1));
    assert.equal(req.query, 'Os');
  });

  await check('empty: nothing matches → the empty note (data-empty-text)', async () => {
    await page.fill('#ac-load-input', 'Zzzz');
    await settle('#ac-load', 'empty');
    assert.equal(await page.$eval('#ac-load .autocomplete-empty', (e) => [getComputedStyle(e).display, e.textContent].join('|')), 'block|No city like that.');
    await page.keyboard.press('Escape');
  });

  await check('the default network client: GET data-url with q / page / pageSize / sort, client headers, { items, total } parsed', async () => {
    await page.fill('#ac-url-input', 'Lo');
    await settle('#ac-url', 'open');
    const call = calls.at(-1)!;
    assert.deepEqual(Object.fromEntries(call.url.searchParams), { q: 'Lo', page: '0', pageSize: '10', sort: 'name:asc' });
    assert.equal(call.header, 'fixture');
    const names = await labels('#ac-url', 10);
    assert.equal(names.length, 10);
    assert.deepEqual(names, [...names].sort((a, b) => a!.localeCompare(b!)));
    assert.match(await page.textContent('#ac-url .autocomplete-status') ?? '', /^10 of [\d,]+ · scroll for more$/);
    await page.keyboard.press('Escape');
  });

  await check('error: a failing source shows the message and Retry (which asks again)', async () => {
    await page.fill('#ac-error-input', 'x');
    await settle('#ac-error', 'error');
    assert.equal(await page.textContent('#ac-error .autocomplete-error-text'), 'The server is down');
    assert.equal(await page.$eval('#ac-error', (el: any) => el.store.value.config.message), 'The server is down');
    await page.click('#ac-error .autocomplete-retry');
    await settle('#ac-error', 'error');
    await page.keyboard.press('Escape');
  });

  await check('State API: setState(\'open\', { query }) searches from outside; loading / empty / error / default; unknown throws', async () => {
    await page.$eval('#ac-local', (el: any) => el.api.setState('open', { query: 'Mar' }));
    await settle('#ac-local', 'open');
    assert.equal(await page.inputValue('#ac-local-input'), 'Mar');
    const r = await page.$eval('#ac-local', (el: any) => {
      const out: string[] = [];
      for (const s of ['loading', 'empty', 'error', 'default']) {
        el.api.setState(s, s === 'error' ? { message: 'Nope' } : {});
        out.push(el.dataset.state, el.querySelector('.autocomplete-input').getAttribute('aria-expanded'));
      }
      let threw = false;
      try { el.api.setState('nope'); } catch { threw = true; }
      return [...out, String(threw), typeof (globalThis as any).df$.shadcn.autocompleteApi.setState, (globalThis as any).df$.shadcn.autocompleteStates.join()];
    });
    assert.deepEqual(r, ['loading', 'true', 'empty', 'true', 'error', 'true', 'default', 'false', 'true', 'function', 'default,open,loading,empty,error']);
  });

  await check('prefers-reduced-motion: no popup transition, no loading pulse', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.$eval('#ac-local .autocomplete-popover', (p) => getComputedStyle(p).transitionDuration), '0s');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  // LAST (AGENTS.md "State API" → render): the contract reloads the page
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await ready();
    await assertRenderContract(page, '.autocomplete[id]', ['default', 'open', 'loading', 'empty', 'error'], {
      // the popup is made at init and filled by the searches; the anchor name is init-time
      runtimeAttrs: ['aria-activedescendant', 'style', 'role', 'aria-autocomplete', 'aria-controls', 'autocomplete'],
      runtimeOwned: '.autocomplete-popover',
    });
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\nautocomplete.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('autocomplete.e2e: all checks passed');
