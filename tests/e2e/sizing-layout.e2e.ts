import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the sizing/layout modules shipped with an iframe `examples/` tree that
 * was never committed - every doc demo 404'd silently. This smoke test serves
 * the real dist/documentation pages and pins what a user (and the
 * docs↔e2e-parity rule) requires: the pages load the two optional modules,
 * their live demos actually render (non-zero geometry from the real CSS),
 * the sidebar routes the eight pages, and no page overflows or 404s its
 * first-party assets at mobile/desktop widths.
 */

const PAGES = ['sizing', 'layout', 'width-height', 'spacing', 'density', 'container', 'flex', 'grid'];
/** One live demo per page (grid has two - both checked). */
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

/** Why: layout/sizing demos migrated into CodeExample sandboxes - their
 * data-demo anchors live INSIDE a srcdoc iframe now. Find the anchor in the
 * main document or (after the card's lazy boot) in any child frame. */
async function demoBox(pg: import('playwright').Page, name: string, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const local = pg.locator(`[data-demo="${name}"]`);
    if (await local.count()) {
      const b = await local.first().boundingBox();
      if (b) return b;
    }
    for (const f of pg.frames().filter((x) => x !== pg.mainFrame())) {
      const el = await f.$(`[data-demo="${name}"]`);
      if (el) {
        const b = await el.boundingBox();
        if (b) return b;
      }
    }
    if (Date.now() > deadline) throw new Error(`demo "${name}" never rendered`);
    await pg.waitForTimeout(250);
  }
}
/** run fn inside the frame holding the anchor (main doc or sandbox); waits
 * through the card's lazy boot, like demoBox */
async function inDemo<T>(pg: import('playwright').Page, name: string, fn: (el: Element) => T, timeoutMs = 12000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const local = pg.locator(`[data-demo="${name}"]`);
    if (await local.count()) return (await local.first().evaluate(fn)) as T;
    for (const f of pg.frames().filter((x) => x !== pg.mainFrame())) {
      const el = await f.$(`[data-demo="${name}"]`);
      if (el) return (await el.evaluate(fn)) as T;
    }
    if (Date.now() > deadline) throw new Error(`demo "${name}" frame not found`);
    await pg.waitForTimeout(250);
  }
}

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
      // all optional modules must be linked on the page (they were iframes-only before)
      for (const sheet of ['../theme/utils/sizing.css', '../theme/utils/layout.css', '../theme/utils/accessibility.css']) {
        assert.ok(
          await page.locator(`head link[href="${sheet}"]`).count(),
          `head is missing ${sheet}`,
        );
      }
      assert.equal(await page.locator('iframe[src^="examples/"]').count(), 0, 'dead example iframes must be gone');
      // the demo tiles read their size from the --size-* aliases: xs=8px … xl=32px
      // (the demo renders inside the CodeExample sandbox since the migration)
      const widths = await inDemo(page, 'sizing-scale', (el) =>
        [...el.querySelectorAll(':scope > div > div:first-child')].map((d) => d.getBoundingClientRect().width));
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
        const box = await demoBox(page, demo);
        assert.ok(box.width > 100 && box.height > 24, `${slug}: ${demo} demo did not render`);
      }
    }
  });

  await check('grid demo: auto-fit tracks and subgrid footer alignment apply', async () => {
    await page.goto(`${server.url}/dist/documentation/grid.html`, { waitUntil: 'networkidle' });
    const cols = await inDemo(page, 'grid', (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.ok(cols >= 2, `auto-fit produced ${cols} columns`);
    // both demo cards exist and their footers share the subgrid row
    const tops = await inDemo(page, 'subgrid', (el) =>
      [...el.querySelectorAll('button')].map((b) => b.getBoundingClientRect().top));
    assert.equal(tops.length, 2, 'subgrid demo cards');
    assert.ok(Math.abs(tops[0] - tops[1]) < 1, `subgrid footers not aligned: ${JSON.stringify(tops)}`);
  });

  await check('density demo: compact gap is 0.75× the comfortable gap', async () => {
    await page.goto(`${server.url}/dist/documentation/density.html`, { waitUntil: 'networkidle' });
    const gaps = await inDemo(page, 'density', (el) =>
      [...el.querySelectorAll('.stack')].map((s) => parseFloat(getComputedStyle(s).gap)));
    assert.equal(gaps.length, 3, 'three density columns');
    assert.ok(Math.abs(gaps[0] - gaps[1] * 0.75) < 0.5, `compact ${gaps[0]} vs comfortable ${gaps[1]}`);
    assert.ok(Math.abs(gaps[2] - gaps[1] * 1.25) < 0.5, `spacious ${gaps[2]} vs comfortable ${gaps[1]}`);
  });

  // the container-query demo now lives in a CodeExample sandbox: the card's
  // own device toolbar resizes the iframe, so the query reacts for real
  await check('CodeExample device toolbar drives a container query (Phone stacks, Full rows)', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${server.url}/dist/documentation/container.html`, { waitUntil: 'networkidle' });
    const card = page.locator('.code-example').last(); // the query-boundary card
    const frameEl = await card.locator('iframe').elementHandle();
    assert.ok(frameEl, 'the container-query demo renders its own sandbox');
    const frame = await (frameEl as unknown as { contentFrame(): Promise<import('playwright').Frame | null> }).contentFrame();
    assert.ok(frame, 'sandbox frame addressable');
    // the FLUID box's row is the last one (the first sits in the fixed 14rem
    // narrow demo, which is stacked by design)
    // wait for the sandbox (and its in-fence <style>) before the first read
    await frame!.waitForSelector('.cq-demo-row', { timeout: 12000 });
    const dir = () =>
      frame!.evaluate(() => {
        const rows = document.querySelectorAll('.cq-demo-row');
        return rows.length ? getComputedStyle(rows[rows.length - 1]).flexDirection : 'missing';
      });
    // Full: the fluid box clears 24rem → row
    await card.locator('[data-vp="full"]').click();
    await page.waitForTimeout(700);
    assert.equal(await dir(), 'row', 'fluid cq-demo-row at Full width');
    // Phone: 390px sandbox → below the 24rem threshold → stacked
    await card.locator('[data-vp="phone"]').click();
    await page.waitForTimeout(700);
    assert.equal(await dir(), 'column', 'cq-demo-row stacks in the phone sandbox');
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
