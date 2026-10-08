import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the paper page's "Open full screen" button opens a generated page
 * (dist/documentation/full-paper.html, built by scripts/build-docs.ts from the
 * page's own example fence - one source, no copy to drift). Unlike a scaffold
 * app it is a document: it must scroll, and its live parts (the teaser
 * diagram, the charts, the BibTeX, the icons) must work outside the docs
 * sandbox, in both color schemes.
 */
const PAGE = '/dist/documentation/full-paper.html';
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await check('the docs page links its full-screen view', async () => {
    await page.goto(`${server.url}/dist/documentation/paper.html`, { waitUntil: 'domcontentloaded' });
    const link = page.locator('main a.btn[href="full-paper.html"]');
    assert.equal(await link.count(), 1, 'one "Open full screen" button');
    assert.equal(await link.getAttribute('target'), '_blank');
    assert.match((await link.textContent()) ?? '', /Open full screen/);
  });

  await page.goto(`${server.url}${PAGE}`, { waitUntil: 'load' });

  await check('chrome-free: the paper is the page, on the whole system bundle', async () => {
    assert.equal(await page.locator('body > article.paper').count(), 1);
    assert.equal(await page.locator('.site-header, .app-sidebar, .code-example').count(), 0, 'no docs chrome, no example card');
    assert.equal(await page.locator('link[href="../components/all.css"]').count(), 1);
    assert.equal(await page.locator('script[type="module"][src="../components/all.js"]').count(), 1);
  });

  await check('a document scrolls, and nothing overflows sideways', async () => {
    const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, vh: innerHeight, w: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
    assert.ok(m.h > m.vh * 3, `page height ${m.h} for a ${m.vh}px viewport`);
    assert.ok(m.w <= m.vw + 1, `scrollWidth ${m.w} > ${m.vw}`);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    assert.ok((await page.evaluate(() => scrollY)) > 0, 'the window scrolls');
    await page.evaluate(() => scrollTo(0, 0));
  });

  await check('its live parts initialize: the teaser diagram, the BibTeX blocks, the icons, the charts', async () => {
    await page.waitForFunction(() => !!document.querySelector('#paper-loop svg path'), undefined, { timeout: 10_000 });
    await page.waitForFunction(() => document.querySelectorAll('.bibtex[data-init]').length === 2, undefined, { timeout: 10_000 });
    await page.waitForFunction(() => document.querySelectorAll('.paper-links svg.lucide').length >= 5, undefined, { timeout: 10_000 });
    // the charts draw when they come into view
    await page.$eval('.paper-chart', (c) => c.scrollIntoView());
    await page.waitForFunction(() => !!document.querySelector('.paper-chart svg, .paper-chart canvas'), undefined, { timeout: 15_000 });
    await page.evaluate(() => scrollTo(0, 0));
  });

  await check('the in-page table of contents jumps within the page', async () => {
    await page.click('.paper-toc a[href="#paper-s5-6"]');
    await page.waitForFunction(() => scrollY > 0);
    const top = await page.$eval('#paper-s5-6', (h) => h.getBoundingClientRect().top);
    assert.ok(top >= -2 && top < 200, `5.6 heading at ${top}px after the jump`);
  });

  await check('it follows the OS color scheme', async () => {
    const dark = await browser.newPage({ colorScheme: 'dark', viewport: { width: 1280, height: 900 } });
    await dark.goto(`${server.url}${PAGE}`, { waitUntil: 'domcontentloaded' });
    assert.equal(await dark.evaluate(() => document.documentElement.classList.contains('dark')), true);
    const [bg, fg] = await dark.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).color]);
    assert.notEqual(bg, fg);
    // the light/dark swap starts in the mode the page is in: it showed light on a dark
    // page, so the first click did nothing visible
    await dark.waitForLoadState('load');
    assert.equal(await dark.$eval('#paper-mode input', (i) => (i as HTMLInputElement).checked), true, 'the swap shows dark');
    await dark.click('#paper-mode');
    assert.equal(await dark.evaluate(() => document.documentElement.classList.contains('dark')), false, 'one click switches to light');
    await dark.close();
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`paper-fullscreen.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('paper-fullscreen.e2e: all checks passed');
