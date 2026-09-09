import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the sizing/layout modules shipped with an iframe `examples/` tree that
 * was never committed — every doc demo 404'd silently. This smoke test serves
 * the real dist/documentation pages and pins what a user (and the
 * docs↔e2e-parity rule) requires: the pages load the two optional modules,
 * their live demos actually render (non-zero geometry from the real CSS),
 * the sidebar routes the eight pages, and no page overflows or 404s its
 * first-party assets at mobile/desktop widths.
 */

const PAGES = ['sizing', 'layout', 'width-height', 'spacing', 'density', 'container', 'flex', 'grid'];
/** One live demo per page (grid has two — both checked). */
const DEMOS: Record<string, string[]> = {
  sizing: ['sizing-scale'],
  layout: ['layout-composition'],
  'width-height': ['width-height'],
  spacing: ['spacing'],
  density: ['density'],
  container: ['container'],
  flex: ['flex'],
  grid: ['grid', 'subgrid'],
};
/** Third-party CDNs (shiki/icons/fonts) may be unreachable in sandboxed CI. */
const VENDOR = /esm\.sh|unpkg\.com|cdnjs|api\.github\.com|fonts\.googleapis/;

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

  await check('sizing page: modules linked + live scale demo renders real geometry', async () => {
    const responseErrors: string[] = [];
    const onResponse = (r: { url: () => string; status: () => number }) => {
      if (r.url().startsWith(server.url) && r.status() >= 400) responseErrors.push(`${r.status()} ${r.url()}`);
    };
    page.on('response', onResponse);
    try {
      await page.goto(`${server.url}/dist/documentation/sizing.html`, { waitUntil: 'networkidle' });
      // both optional modules must be linked on the page (they were iframes-only before)
      for (const sheet of ['../theme/sizing.css', '../theme/layout.css']) {
        assert.ok(
          await page.locator(`head link[href="${sheet}"]`).count(),
          `head is missing ${sheet}`,
        );
      }
      assert.equal(await page.locator('iframe[src^="examples/"]').count(), 0, 'dead example iframes must be gone');
      // the demo tiles read their size from the --size-* aliases: xs=8px … xl=32px
      const tiles = page.locator('[data-demo="sizing-scale"] > div > div:first-child');
      const widths = await tiles.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
      assert.deepEqual(widths, [8, 12, 16, 24, 32], `scale tiles rendered ${JSON.stringify(widths)}`);
      assert.deepEqual(responseErrors, [], 'broken first-party assets');
    } finally {
      page.off('response', onResponse);
    }
  });

  await check('every page: sidebar route + live demo has rendered geometry', async () => {
    for (const slug of PAGES) {
      await page.goto(`${server.url}/dist/documentation/${slug}.html`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('main h1').count(), 1, `${slug}: h1`);
      assert.equal(
        await page.locator(`.nav-link.active[href="${slug}.html"]`).count(),
        1,
        `${slug}: sidebar route`,
      );
      for (const demo of DEMOS[slug]) {
        const box = await page.locator(`[data-demo="${demo}"]`).boundingBox();
        assert.ok(box && box.width > 100 && box.height > 24, `${slug}: ${demo} demo did not render`);
      }
    }
  });

  await check('grid demo: auto-fit tracks and subgrid footer alignment apply', async () => {
    await page.goto(`${server.url}/dist/documentation/grid.html`, { waitUntil: 'networkidle' });
    const cols = await page.$eval('[data-demo="grid"]', (el) =>
      getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.ok(cols >= 2, `auto-fit produced ${cols} columns at 1280px`);
    // both demo cards exist and their footers share the subgrid row
    const buttons = page.locator('[data-demo="subgrid"] button');
    assert.equal(await buttons.count(), 2, 'subgrid demo cards');
    const tops = await buttons.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    assert.ok(Math.abs(tops[0] - tops[1]) < 1, `subgrid footers not aligned: ${JSON.stringify(tops)}`);
  });

  await check('density demo: compact gap is 0.75× the comfortable gap', async () => {
    await page.goto(`${server.url}/dist/documentation/density.html`, { waitUntil: 'networkidle' });
    const gaps = await page.$$eval('[data-demo="density"] .stack', (els) =>
      els.map((el) => parseFloat(getComputedStyle(el).gap)));
    assert.equal(gaps.length, 3, 'three density columns');
    assert.ok(Math.abs(gaps[0] - gaps[1] * 0.75) < 0.5, `compact ${gaps[0]} vs comfortable ${gaps[1]}`);
    assert.ok(Math.abs(gaps[2] - gaps[1] * 1.25) < 0.5, `spacious ${gaps[2]} vs comfortable ${gaps[1]}`);
  });

  for (const width of [320, 1440]) {
    await check(`no page overflows its viewport at ${width}px`, async () => {
      for (const slug of PAGES) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${server.url}/dist/documentation/${slug}.html`, { waitUntil: 'networkidle' });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        );
        assert.ok(!overflow, `${slug} overflows at ${width}px`);
      }
    });
  }

  await check('no page-level script errors on the module docs', async () => {
    const errors: string[] = [];
    page.on('pageerror', (e) => { if (!VENDOR.test(e.message)) errors.push(e.message); });
    for (const slug of PAGES) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${server.url}/dist/documentation/${slug}.html`, { waitUntil: 'networkidle' });
    }
    assert.deepEqual(errors, [], 'page errors');
  });
} finally {
  await browser.close();
  server.stop();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
