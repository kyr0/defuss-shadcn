import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: smoke test for the single-file bundle (scripts/bundle.ts). The fixture
 * loads ONLY dist/components/all.css + all.js — if the bundle silently drops
 * a module or a stylesheet, one of these checks fails while every
 * per-component e2e stays green.
 */

const FIXTURE = '/tests/e2e/bundle.e2e-fixture.html';
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
  const page = await browser.newPage();
  await page.goto(`${server.url}${FIXTURE}`);

  await check('all.js initialized every component module on the page', async () => {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.accordion[data-type="single"]:not([data-init])').length === 0 &&
        document.querySelectorAll('[data-dialog-trigger]:not([data-init])').length === 0,
    );
  });

  await check('all.css applied (accordion + badge flex)', async () => {
    const accordion = await page.$eval('#single', (el) => getComputedStyle(el).display);
    assert.equal(accordion, 'flex', 'accordion wrapper should be display:flex');
    const badge = await page.$eval('#badge', (el) => getComputedStyle(el).display);
    assert.equal(badge, 'flex', 'badge should be display:flex');
  });

  await check('dialog opens via trigger and closes via data-dialog-close', async () => {
    await page.click('#dialog-trigger');
    await page.waitForSelector('#confirm[open]');
    await page.click('#confirm [data-dialog-close]');
    await page.waitForFunction(() => !(document.querySelector('#confirm') as HTMLDialogElement).open);
  });

  await check('single-open accordion closes siblings (JS from the bundle)', async () => {
    await page.click('#single .accordion-item[data-item="2"] > summary');
    await page.waitForFunction(() => {
      const items = [...document.querySelectorAll('#single .accordion-item')] as HTMLDetailsElement[];
      return items[0].open === false && items[1].open === true;
    });
  });

  await check('state API works through the bundle (setState by name)', async () => {
    await page.$eval('#single', (el) => (el as HTMLElement).api!.setState('all-closed'));
    await page.waitForFunction(() =>
      [...document.querySelectorAll('#single .accordion-item')].every((d) => !(d as HTMLDetailsElement).open),
    );
    const state = await page.$eval('#single', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'all-closed');
  });

  await check('registry globals from several bundled modules are present', async () => {
    const reg = await page.evaluate(() => ({
      accordion: typeof globalThis._defussShadcn?.accordionApi?.setState === 'function',
      dialog: typeof globalThis._defussShadcn?.dialogApi?.setState === 'function',
      toast: typeof globalThis._defussShadcn?.toast?.show === 'function',
    }));
    assert.ok(reg.accordion, '_defussShadcn.accordionApi missing — accordion module not bundled');
    assert.ok(reg.dialog, '_defussShadcn.dialogApi missing — dialog module not bundled');
    assert.ok(reg.toast, '_defussShadcn.toast missing — toast module not bundled');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nbundle.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('bundle.e2e: all checks passed');
