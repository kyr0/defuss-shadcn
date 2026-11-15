import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { chooseLanguage, renderedLanguage, translationGaps } from '../lib/translation.ts';

/**
 * Why: the API Documentation scaffold promises a reference you can work in: every guide, resource and endpoint is a
 * route, the Try it form drives the code samples and a sandbox that answers like the API, the palette ranks hits
 * with defuss-search in the language shown, and the frame and the reference switch to German. This drives the
 * generated full-screen page (application/app-api-docs.html, built from the scaffold page's example fence) with the
 * pinned vendors served offline.
 */
const PAGE = '/dist/documentation/application/app-api-docs.html';
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

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const vendors = await offlineJsdelivr(page);
  // Shiki (esm.sh) stays offline: the code is plain text, the checks read its words
  await page.route('https://esm.sh/**', (r) => r.fulfill({ status: 404, body: 'offline' }));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${server.url}${PAGE}`);
  await page.waitForFunction(() => document.querySelector('[data-ad]')?.hasAttribute('data-route'), undefined, { timeout: 10_000 });
  const shownView = () => page.$$eval('[data-ad-view]', (v) => v.filter((x) => !(x as HTMLElement).hidden).map((x) => x.getAttribute('data-ad-view')));
  const route = () => page.getAttribute('[data-ad]', 'data-route');
  const sample = (lang: string) => page.textContent(`[data-ad-sample="${lang}"]`);

  await check('opens on the introduction: the navigation lists the guides and every endpoint', async () => {
    assert.deepEqual(await shownView(), ['guide']);
    assert.equal(await page.textContent('[data-ad-guide-title]'), 'Introduction');
    assert.equal(await page.$$eval('[data-ad-nav] a', (a) => a.length), 5 + 4 + 13);
    assert.equal(await page.$$eval('[data-ad-home-cards] .card', (c) => c.length), 4);
    assert.equal(await page.getAttribute('[data-ad-nav] a[href="#/"]', 'aria-current'), 'page');
  });

  await check('a guide, a resource and an endpoint are routes; the pager walks the order', async () => {
    await page.click('[data-ad-nav] a[href="#/guides/errors"]');
    assert.equal(await page.textContent('[data-ad-guide-title]'), 'Errors');
    assert.equal(await page.textContent('[data-ad-view="guide"] [data-ad-pager] a[rel="next"] strong'), 'Pagination →');
    await page.click('[data-ad-nav] a[href="#/ref/tasks"]');
    assert.deepEqual(await shownView(), ['resource']);
    assert.equal(await page.textContent('[data-ad-res-object]'), 'The task object');
    assert.equal(await page.$$eval('[data-ad-res-ops] li', (l) => l.length), 5);
    assert.ok((await page.textContent('[data-ad-res-json]'))!.includes('"id": "t_105"'));
    await page.click('[data-ad-res-ops] a[href="#/ref/tasks/create"]');
    assert.deepEqual(await shownView(), ['endpoint']);
    assert.equal(page.url().split('#')[1], '/ref/tasks/create');
    assert.equal(await page.textContent('[data-ad-ep-title]'), 'Create a task');
    assert.equal(await page.textContent('[data-ad-ep-method]'), 'POST');
    assert.equal(await page.textContent('[data-ad-ep-path]'), 'https://api.acme.example/v4/tasks');
    assert.equal(await page.getAttribute('[data-ad-nav] a[href="#/ref/tasks/create"]', 'aria-current'), 'page');
    await page.goBack();
    assert.equal(await route(), '#/ref/tasks');
    await page.goForward();
    assert.equal(await route(), '#/ref/tasks/create');
  });

  await check('an endpoint documents its parameters and status codes', async () => {
    assert.deepEqual(await page.$$eval('[data-ad-ep-params] [data-param]', (p) => p.map((x) => x.getAttribute('data-param'))), ['workspace', 'title', 'assignee', 'due_on', 'status']);
    assert.equal(await page.textContent('[data-param="title"] .ad-required'), 'required');
    assert.ok((await page.textContent('[data-param="status"] .ad-enum'))!.includes('todo, doing, done'));
    assert.deepEqual(await page.$$eval('[data-ad-ep-responses] .ad-status', (s) => s.map((x) => x.textContent)), ['201', '400', '401']);
  });

  await check('the samples follow the form: curl, JavaScript and Python', async () => {
    assert.ok((await sample('curl'))!.includes(`curl -X POST 'https://api.acme.example/v4/tasks'`));
    assert.ok((await sample('curl'))!.includes('Bearer YOUR_API_KEY'));
    await page.fill('#ad-try-title', 'Plan the launch');
    assert.ok((await sample('curl'))!.includes('"title":"Plan the launch"'));
    assert.ok((await sample('js'))!.includes(`"title": "Plan the launch"`));
    assert.ok((await sample('python'))!.includes('requests.post('));
    await page.click('[data-ad-samples] label:has(input[value="python"])');
    assert.equal(await page.$eval('[data-tab="python"]', (e) => getComputedStyle(e).display), 'block');
    assert.equal(await page.$eval('[data-tab="curl"]', (e) => getComputedStyle(e).display), 'none');
  });

  await check('the sandbox: 401 without a key, then 201 with one, and the next list sees the new task', async () => {
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(await page.textContent('[data-ad-res-status]'), '401');
    assert.ok((await page.textContent('[data-ad-res-body]'))!.includes('authentication_error'));
    await page.click('[data-ad-authorize]');
    await page.click('#ad-key button[value="save"]');
    // the dialog's close event comes a task later
    await page.waitForFunction(() => !(document.querySelector('[data-ad-key-on]') as HTMLElement).hidden);
    assert.ok((await sample('python'))!.includes('Bearer acme_test_51Nq7Kx2aLpVd9'));
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(await page.textContent('[data-ad-res-status]'), '201');
    const made = JSON.parse((await page.textContent('[data-ad-res-body]'))!);
    assert.deepEqual([made.id, made.title, made.status], ['t_106', 'Plan the launch', 'todo']);
    await page.fill('#ad-try-title', '');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(await page.textContent('[data-ad-res-status]'), '400');
    assert.equal(JSON.parse((await page.textContent('[data-ad-res-body]'))!).error.param, 'title');
    await page.click('[data-ad-nav] a[href="#/ref/tasks/list"]');
    await page.click('[data-ad-try] button[type="submit"]');
    const list = JSON.parse((await page.textContent('[data-ad-res-body]'))!);
    assert.deepEqual([list.data.map((t: { id: string }) => t.id), list.has_more, list.next_cursor], [['t_106', 't_105', 't_104'], true, 't_104']);
    await page.fill('#ad-try-cursor', 't_104');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.deepEqual(JSON.parse((await page.textContent('[data-ad-res-body]'))!).data.map((t: { id: string }) => t.id), ['t_103', 't_102', 't_101']);
    assert.ok((await sample('curl'))!.includes('?workspace=ws_acme&limit=3&cursor=t_104'));
    assert.ok((await page.textContent('[data-ad-res-time]'))!.includes('X-RateLimit-Remaining: 96'));
    await page.fill('#ad-try-cursor', 't_999');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(await page.textContent('[data-ad-res-status]'), '400');
    assert.equal(JSON.parse((await page.textContent('[data-ad-res-body]'))!).error.param, 'cursor');
  });

  await check('a webhook needs HTTPS; a quote in a value keeps the curl sample a valid shell command', async () => {
    await page.click('[data-ad-nav] a[href="#/ref/webhooks/create"]');
    await page.fill('#ad-try-url', 'http://hooks.acme.example/x');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(JSON.parse((await page.textContent('[data-ad-res-body]'))!).error.param, 'url');
    await page.click('[data-ad-nav] a[href="#/ref/docs/create"]');
    await page.fill('#ad-try-title', "Ana's notes");
    assert.ok((await sample('curl'))!.includes(`"title":"Ana'\\''s notes"`), (await sample('curl'))!);
  });

  await check('a retrieve of a deleted task answers 404; Reset brings the examples back', async () => {
    await page.click('[data-ad-nav] a[href="#/ref/tasks/delete"]');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(JSON.parse((await page.textContent('[data-ad-res-body]'))!).deleted, true);
    await page.click('[data-ad-nav] a[href="#/ref/tasks/retrieve"]');
    await page.fill('#ad-try-id', 't_103');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(await page.textContent('[data-ad-res-status]'), '404');
    await page.click('[data-ad-try] button[type="reset"]');
    assert.equal(await page.inputValue('#ad-try-id'), 't_101');
  });

  await check('the version select calls /v3 and shows its sunset note', async () => {
    await page.selectOption('[data-ad-version]', 'v3');
    assert.equal(await page.$eval('[data-ad-v3]', (e) => e.checkVisibility()), true);
    assert.ok((await sample('curl'))!.includes('https://api.acme.example/v3/tasks/t_101'));
    await page.selectOption('[data-ad-version]', 'v4');
    assert.equal(await page.$eval('[data-ad-v3]', (e) => e.checkVisibility()), false);
  });

  await check('the palette ranks with defuss-search (loaded offline) and a hit opens its page', async () => {
    await page.waitForFunction(() => document.querySelector('[data-ad]')!.getAttribute('data-search') === 'ready', undefined, { timeout: 10_000 });
    assert.ok(vendors.some((u) => u.includes('defuss-search@0.5.0/dist/strategies.js')));
    await page.keyboard.press('ControlOrMeta+k');
    await page.waitForFunction(() => (document.getElementById('ad-find') as HTMLDialogElement).open);
    await page.fill('[data-ad-query]', 'webhook secret');
    await page.waitForFunction(() => /results in/.test(document.querySelector('[data-ad-find-status]')!.textContent!));
    const first = await page.$$eval('[data-ad-hits] .command-item', (a) => a.map((x) => x.getAttribute('href')));
    assert.ok(first.length > 0 && first[0]!.startsWith('#/ref/webhooks'), first.join(' '));
    await page.fill('[data-ad-query]', 'cursr');
    await page.waitForFunction(() => document.querySelector('[data-ad-hits] .command-item'));
    assert.ok((await page.$$eval('[data-ad-hits] .command-item', (a) => a.map((x) => x.getAttribute('href')))).includes('#/guides/pagination'), 'fuzzy: cursr finds the cursor');
    await page.fill('[data-ad-query]', 'invite');
    await page.waitForFunction(() => document.querySelector('[data-ad-hits] .command-item')?.getAttribute('href') === '#/ref/members/invite');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('[data-ad]')!.getAttribute('data-route') === '#/ref/members/invite');
    assert.equal(await page.$eval('#ad-find', (d) => (d as HTMLDialogElement).open), false);
  });

  await check('narrow: the code goes under the page, the navigation is a drawer', async () => {
    try {
    await page.setViewportSize({ width: 600, height: 900 });
    // the drawer's visibility moves with its slide (0.2 s)
    await page.waitForTimeout(300);
    assert.equal(await page.$eval('.ad-side', (e) => getComputedStyle(e).visibility), 'hidden');
    await page.click('[data-ad-menu]');
    await page.waitForTimeout(300);
    assert.equal(await page.$eval('.ad-side', (e) => getComputedStyle(e).visibility), 'visible');
    await page.click('[data-ad-nav] a[href="#/guides/authentication"]');
    assert.equal(await page.getAttribute('[data-ad-menu]', 'aria-expanded'), 'false');
    assert.equal(await page.textContent('[data-ad-guide-title]'), 'Authentication');
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.equal(scroll, 0, 'no horizontal page scroll');
    } finally {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(300);
    }
  });

  await check('dark mode: the Swap sets html.dark', async () => {
    await page.click('label.swap:has([data-ad-mode])');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);
    await page.click('label.swap:has([data-ad-mode])');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), false);
  });

  await check('German: the frame and the reference translate, and the search uses the German index', async () => {
    assert.deepEqual(await translationGaps(page, '[data-ad]'), [], 'every target and attribute in English and German');
    assert.equal(await renderedLanguage(page, '[data-ad]'), 'en');
    await page.click('[data-ad-nav] a[href="#/ref/tasks/create"]');
    await chooseLanguage(page, 'de');
    assert.equal(await renderedLanguage(page, '[data-ad]'), 'de');
    assert.equal(await page.textContent('[data-ad-ep-title]'), 'Aufgabe anlegen');
    assert.equal(await page.textContent('[data-param="title"] .ad-required'), 'Pflicht');
    assert.equal(await page.textContent('[data-i18n-target="h-try"]'), 'Ausprobieren');
    assert.equal(await page.textContent('[data-ad-nav] a[href="#/ref/docs/create"] span:last-child'), 'Dokument anlegen');
    await page.keyboard.press('ControlOrMeta+k');
    await page.waitForFunction(() => (document.getElementById('ad-find') as HTMLDialogElement).open);
    await page.fill('[data-ad-query]', 'Einladung');
    await page.waitForFunction(() => document.querySelector('[data-ad-hits] .command-item')?.getAttribute('href') === '#/ref/members/invite');
    assert.ok((await page.textContent('[data-ad-find-status]'))!.includes('Treffer'));
    await page.keyboard.press('Escape');
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`scaffold-api-docs.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-api-docs.e2e: all checks passed');
