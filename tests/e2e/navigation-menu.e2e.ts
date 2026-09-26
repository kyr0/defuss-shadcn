import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped navigation-menu component. Loads the
 * fixture (two dropdown menus, mirroring the doc page) over HTTP in a real
 * browser, then verifies anchor wiring, popovertarget toggling, the chevron
 * rotation (`:has()` rule), and the named State API - the same files
 * consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/navigation-menu.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const isOpen = (page: Page, id: string) => page.$eval(`#${id}`, (el) => el.matches(':popover-open'));

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

  await check('navigation-menu.js wired every trigger + content (data-init)', async () => {
    // wiring is per trigger→panel pair (no .nav-menu wrapper required —
    // composable inside other components like site-header)
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.nav-menu-trigger[popovertarget]:not([data-init])').length === 0 &&
        document.querySelectorAll('.nav-menu-content[popover]:not([data-init])').length === 0,
    );
  });

  await check('anchor positioning wired (unique anchor per trigger/content)', async () => {
    const pair = await page.evaluate(() => {
      const trigger = document.querySelector('[popovertarget="nav-products"]') as HTMLElement;
      const content = document.querySelector('#nav-products') as HTMLElement;
      return { anchor: trigger.style.anchorName, uses: content.style.positionAnchor };
    });
    assert.ok(pair.anchor.startsWith('--nav-menu-'), 'trigger needs an anchor name');
    assert.equal(pair.uses, pair.anchor, 'content must use its trigger anchor');
  });

  await check('navigation-menu.css applied (popover surface)', async () => {
    const style = await page.$eval('#nav-products', (el) => {
      const cs = getComputedStyle(el);
      return { minW: cs.minWidth, radius: cs.borderTopLeftRadius, border: cs.borderTopWidth };
    });
    assert.equal(style.minW, '224px', 'min-width: 14rem');
    assert.equal(style.radius, '14px', 'radius: var(--radius-xl)');
    assert.notEqual(style.border, '0px', 'bordered surface');
  });

  await check('popovertarget trigger toggles its menu', async () => {
    await page.click('[popovertarget="nav-products"]');
    assert.equal(await isOpen(page, 'nav-products'), true);
    // opening one auto menu closes the other (popover=auto exclusivity)
    await page.click('[popovertarget="nav-resources"]');
    assert.equal(await isOpen(page, 'nav-resources'), true, 'second menu opens');
    assert.equal(await isOpen(page, 'nav-products'), false, 'first menu auto-closed');
  });

  await check('chevron rotates while open (:has + :popover-open)', async () => {
    // :has() repaint can lag one frame behind the top-layer change - poll it
    await page.waitForFunction(() => {
      const svg = document.querySelector('[popovertarget="nav-resources"] svg');
      return getComputedStyle(svg!).transform.startsWith('matrix(-1');
    });
    const transform = await page.$eval('[popovertarget="nav-resources"] svg', (el) =>
      getComputedStyle(el).transform,
    );
    assert.match(transform, /matrix\(\s*-1/, 'open chevron should be rotated 180deg');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  const setState = (page: Page, id: string, state: string) =>
    page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check("state API: setState('open') shows the menu", async () => {
    await setState(page, 'nav-products', 'open');
    // the deferred show waits out any running exit transition (~≤500ms cap)
    await page.waitForFunction(() => document.querySelector('#nav-products')!.matches(':popover-open'));
    const state = await page.$eval('#nav-products', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open');
  });

  await check("state API: setState('default') hides it", async () => {
    await setState(page, 'nav-products', 'default');
    assert.equal(await isOpen(page, 'nav-products'), false);
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#nav-products') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  // -- Density: top-level item gap 2/4/6px ----------------------------------
  await check('data-density scales the list gap to 2/4/6px', async () => {
    const gaps = await page.evaluate(() =>
      ['z-navmenu-den-compact', 'z-navmenu-den-comfortable', 'z-navmenu-den-spacious'].map(
        (id) => getComputedStyle(document.querySelector('#' + id + ' .nav-menu-list')!).gap,
      ),
    );
    assert.deepEqual(gaps, ['2px', '4px', '6px'], `list gaps, got ${gaps.join('/')}`);
  });

  await check('state API: registry globals expose api + declared states (camelCase)', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.navigationMenuApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.navigationMenuStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#nav-products'),
    }));
    assert.ok(reg.hasApi, 'df$.navigationMenuApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'open']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('navigation-menu: data-size="xs" → font-size 12px', async () => {
    const val = await page.$eval('#z-navigationmenu-xs .nav-menu-link', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '12px');
  });
  await check('navigation-menu: data-size="sm" → font-size 13px', async () => {
    const val = await page.$eval('#z-navigationmenu-sm .nav-menu-link', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '13px');
  });
  await check('navigation-menu: data-size="md" → font-size 14px', async () => {
    const val = await page.$eval('#z-navigationmenu-md .nav-menu-link', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '14px');
  });
  await check('navigation-menu: data-size="lg" → font-size 16px', async () => {
    const val = await page.$eval('#z-navigationmenu-lg .nav-menu-link', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '16px');
  });
  await check('navigation-menu: data-size="xl" → font-size 18px', async () => {
    const val = await page.$eval('#z-navigationmenu-xl .nav-menu-link', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '18px');
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nnavigation-menu.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('navigation-menu.e2e: all checks passed');
