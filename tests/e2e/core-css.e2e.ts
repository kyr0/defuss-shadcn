import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: prove core.css carries the whole theme base (plans/core-bundle.md) —
 * the fixture loads ONLY core.css + core.js + two per-component files, with
 * all.css/all.js deliberately absent (asserted first). Checks the four sheets
 * really took effect: tokens resolve, .flex/.w-4/.sr-only apply - then that a
 * CSS-only (badge) and an interactive (dialog) component work through that
 * single fixed sheet pair. Complements core.e2e.ts (the runtime contract):
 * this file is the CSS half of the modular path.
 */

const FIXTURE = '/tests/e2e/core-css.e2e-fixture.html';
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

  // The proof starts here: the fixture must NOT have loaded the fat bundle.
  await check('no all.css / all.js on the page (modular path only)', async () => {
    const refs = await page.$$eval('link[href], script[src]', (els) =>
      els.map((el) => (el as HTMLLinkElement).href || (el as HTMLScriptElement).src),
    );
    assert.ok(
      refs.every((r) => !/\/all(\.min)?\.(css|js)$/.test(r)),
      `bundle file(s) loaded: ${refs.filter((r) => /\/all(\.min)?\.(css|js)$/.test(r)).join(', ')}`,
    );
  });

  await check('core.css: tokens live (--primary + --spacing resolve)', async () => {
    const tokens = await page.$eval('#probe-tokens', (el) => {
      const cs = getComputedStyle(el);
      return { primary: cs.getPropertyValue('--primary').trim(), spacing: cs.getPropertyValue('--spacing').trim() };
    });
    assert.match(tokens.primary, /oklch/, '--primary should resolve to an oklch token value');
    assert.equal(tokens.spacing, '0.25rem', '--spacing should come from default-semantic-tokens.css');
  });

  await check('core.css: utilities apply (.flex side-by-side, .w-4 = 4 base units)', async () => {
    const flex = await page.$eval('#probe-flex', (el) => {
      const cs = getComputedStyle(el);
      const [a, b] = Array.from(el.children) as HTMLElement[];
      return { display: cs.display, aRight: a.getBoundingClientRect().right, bLeft: b.getBoundingClientRect().left };
    });
    assert.equal(flex.display, 'flex', '.flex should set display:flex');
    assert.ok(Math.abs(flex.aRight - flex.bLeft) < 1, '.flex children should sit side-by-side with no gap');
    const w = await page.$eval('#probe-w4', (el) => getComputedStyle(el).width);
    assert.equal(w, '16px', '.w-4 should compute to 4 × 0.25rem = 16px');
  });

  await check('core.css: accessibility sheet applies (.sr-only pattern)', async () => {
    const sr = await page.$eval('#probe-sr', (el) => getComputedStyle(el));
    assert.equal(sr.position, 'absolute', '.sr-only should be absolutely positioned');
    assert.equal(sr.clipPath, 'inset(50%)', '.sr-only should clip-path inset(50%)');
  });

  await check('badge (CSS-only component) renders through core.css + badge.css', async () => {
    const style = await page.$eval('#b-default', (el) => getComputedStyle(el));
    assert.equal(style.display, 'inline-flex', 'badge.css should apply through the modular path');
    assert.match(style.backgroundColor, /oklch/, 'badge should paint with token colors');
  });

  await check('dialog.js initialized via core.css+core.js alone (data-init stamped)', async () => {
    await page.waitForFunction(() => !!document.querySelector('#dlg[data-init]'));
  });

  await check('dialog opens through its trigger and closes on Escape', async () => {
    await page.click('#open-dlg');
    await page.waitForFunction(() => (document.querySelector('#dlg') as HTMLDialogElement).open);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !(document.querySelector('#dlg') as HTMLDialogElement).open);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures > 0) {
  console.error(`core-css.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('core-css.e2e: all checks passed');
