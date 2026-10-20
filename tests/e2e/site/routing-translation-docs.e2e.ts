import { chromium, type Frame, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { I18N_URL } from '../lib/translation.ts';

/**
 * Why: the Translation and Client-side Routing guides teach with live examples - a workshop card in English,
 * German and Arabic (regions, an attribute variant, Intl values, six Arabic plural forms, right to left) and a
 * mailbox with routes (a parameter, a wildcard, the docs preview's hash fallback). Their promise is that the
 * examples do what the text says; this drives them in their docs cards, the libraries served offline.
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
/** the page's first example card, its preview scrolled into view and running */
async function card(page: Page, path: string, ready: string): Promise<Frame> {
  await page.goto(`${server.url}/dist/documentation/guides/${path}`);
  const iframe = await page.waitForSelector('.code-example iframe', { timeout: 15_000 });
  await iframe.scrollIntoViewIfNeeded();
  const frame = (await iframe.contentFrame()) as Frame;
  await frame.waitForFunction(ready, undefined, { timeout: 15_000 });
  return frame;
}
const text = (f: Frame, sel: string) => f.$eval(sel, (e) => e.textContent!.replace(/\s+/g, ' ').trim());
const pick = (f: Frame, sel: string, value: string) =>
  f.evaluate(
    ({ sel, value }) => {
      const s = document.querySelector(sel) as HTMLSelectElement;
      s.value = value;
      s.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { sel, value },
  );

try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await offlineJsdelivr(page);

  await check('translation: the card renders English; every region and attribute has English, German and Arabic', async () => {
    const f = await card(page, 'translation.html', "document.querySelector('#ws-card')?.getAttribute('lang') === 'en'");
    assert.equal(await text(f, '#ws-card .card-title'), 'Workshop: native web components');
    assert.equal(await text(f, '#ws-card [data-i18n-target="seats"]'), '3 seats left');
    const gaps = await f.evaluate(async (url) => {
      const { validateI18n } = await import(url);
      return validateI18n(document.querySelector('#ws-card'), { locales: ['en', 'de', 'ar'], values: ['date', 'price', 'seats', 'seatsLabel'] }).map((d: { code: string; message: string }) => `${d.code}: ${d.message}`);
    }, I18N_URL);
    assert.deepEqual(gaps, []);
  });

  await check('translation: German - the regions, the attribute, the formatted date and price, the plural', async () => {
    const f = page.frames().find((x) => x.url() === 'about:srcdoc')!;
    await pick(f, '#ws-lang', 'de');
    assert.equal(await f.getAttribute('#ws-card', 'lang'), 'de');
    assert.equal(await text(f, '#ws-card .card-title'), 'Workshop: native Web Components');
    assert.equal(await text(f, '#ws-card .card-description'), '12. November 2026 · 49,00 €');
    assert.equal(await f.getAttribute('#ws-card input', 'aria-label'), 'Deine E-Mail-Adresse');
    assert.equal(await text(f, '#ws-card [data-i18n-target="seats"]'), 'Noch 3 Plätze frei');
    await f.click('#ws-reserve');
    await f.click('#ws-reserve');
    assert.equal(await text(f, '#ws-card [data-i18n-target="seats"]'), 'Noch 1 Platz frei');
    assert.equal(await text(f, '#ws-reserve'), 'Platz reservieren');
  });

  await check('translation: Arabic - right to left, and the count picks Arabic plural forms', async () => {
    const f = page.frames().find((x) => x.url() === 'about:srcdoc')!;
    await pick(f, '#ws-lang', 'ar');
    assert.deepEqual([await f.getAttribute('#ws-card', 'lang'), await f.getAttribute('#ws-card', 'dir')], ['ar', 'rtl']);
    assert.equal(await text(f, '#ws-card [data-i18n-target="seats"]'), 'بقي مقعد واحد', 'one');
    await f.click('#ws-reserve');
    assert.equal(await text(f, '#ws-card [data-i18n-target="seats"]'), 'لم يبقَ أي مقعد', 'zero');
    await pick(f, '#ws-lang', 'en');
    assert.deepEqual([await f.getAttribute('#ws-card', 'dir'), await text(f, '#ws-card [data-i18n-target="seats"]')], ['ltr', '0 seats left']);
  });

  await check('routing: the mailbox opens on the inbox; a message link shows the message and its route', async () => {
    const f = await card(page, 'routing.html', "document.querySelector('#mail-route')?.textContent === 'inbox · /'");
    const view = () => f.$eval('#mail', (m) => [...m.querySelectorAll('[data-view]')].filter((s) => !(s as HTMLElement).hidden).map((s) => (s as HTMLElement).dataset.view));
    assert.deepEqual(await view(), ['inbox']);
    // the bridge turns a link click in the preview into a fragment change - the hash fallback routes it
    await f.evaluate(() => (document.querySelector('#mail a[href="#/messages/2"]') as HTMLElement).click());
    await f.waitForFunction(() => location.hash === '#/messages/2');
    assert.deepEqual(await view(), ['message']);
    assert.equal(await text(f, '#mail-subject'), 'The Q4 plan, second draft');
    assert.equal(await text(f, '#mail-route'), 'message · /messages/2 · id=2');
  });

  await check('routing: Archive is a route and the current folder link; an unknown message is the wildcard', async () => {
    const f = page.frames().find((x) => x.url().startsWith('about:srcdoc'))!;
    await f.evaluate(() => (document.querySelector('#mail nav a[href="#/archive"]') as HTMLElement).click());
    await f.waitForFunction(() => location.hash === '#/archive');
    assert.equal(await f.getAttribute('#mail nav a[href="#/archive"]', 'aria-current'), 'page');
    assert.equal(await f.getAttribute('#mail nav a[href="#/"]', 'aria-current'), null);
    await f.evaluate(() => (document.querySelector('#mail a[href="#/messages/9"]') as HTMLElement).click());
    await f.waitForFunction(() => !(document.querySelector('#mail [data-view="missing"]') as HTMLElement).hidden);
    assert.equal(await text(f, '#mail-route'), 'message · /messages/9 · id=9');
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`routing-translation-docs.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('routing-translation-docs.e2e: all checks passed');
