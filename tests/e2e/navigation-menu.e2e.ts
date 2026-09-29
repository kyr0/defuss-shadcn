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

  const rect = (id: string) => page.$eval(`#${id}`, (el) => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; });

  await check('megamenu: a wide panel spans the menu edge to edge, under its trigger', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.click('#mm-wide-t');
    await page.waitForTimeout(250);
    const nav = await rect('mm-nav'), p = await rect('mm-wide'), t = await rect('mm-wide-t');
    assert.deepEqual([p.l, p.r], [nav.l, nav.r]);
    assert.ok(p.t >= t.b && p.t - t.b < 10, 'below the trigger');
    const hl = await page.$eval('#mm-wide-t', (el) => getComputedStyle(el).backgroundColor);
    assert.notEqual(hl, 'rgba(0, 0, 0, 0)', 'the open trigger is highlighted');
  });

  await check('megamenu: 3 grid columns, heading, icon │ text links, feature block, full-width footer', async () => {
    const r = await page.evaluate(() => {
      const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
      const icon = document.getElementById('mm-icon')!.getBoundingClientRect(), title = document.getElementById('mm-icon-title')!.getBoundingClientRect();
      const grid = document.getElementById('mm-grid')!.getBoundingClientRect(), foot = document.getElementById('mm-footer')!.getBoundingClientRect();
      return {
        cols: cs('mm-grid').gridTemplateColumns.split(' ').length,
        heading: cs('mm-heading').textTransform,
        beside: title.left >= icon.right,
        iconSize: [Math.round(icon.width), Math.round(icon.height)],
        feature: cs('mm-feature').backgroundImage.startsWith('linear-gradient'),
        footer: Math.abs(foot.width - grid.width) < 1,
      };
    });
    assert.deepEqual(r, { cols: 3, heading: 'uppercase', beside: true, iconSize: [32, 32], feature: true, footer: true });
    await page.keyboard.press('Escape');
  });

  await check('megamenu: a full panel spans the page; aria-current marks a link', async () => {
    await page.click('#mm-full-t');
    const p = await rect('mm-full');
    const vw = await page.evaluate(() => document.documentElement.clientWidth);
    assert.deepEqual([p.l, p.r], [0, vw]);
    await page.keyboard.press('Escape');
    const cur = await page.$eval('#mm-current', (el) => getComputedStyle(el).backgroundColor);
    assert.notEqual(cur, 'rgba(0, 0, 0, 0)');
  });

  await check('vertical: the list stacks and a panel flies out to the right of its trigger', async () => {
    await page.click('#mm-v-t');
    await page.waitForTimeout(250); // the entrance transition slides the panel in from 4px above
    const t = await rect('mm-v-t'), p = await rect('mm-v');
    assert.ok(p.l >= t.r && p.l - t.r < 10, `right of the trigger (${t.r} → ${p.l})`);
    assert.ok(Math.abs(p.t - t.t) < 2, 'top-aligned');
    assert.equal(await page.$eval('#mm-vert .nav-menu-list', (el) => getComputedStyle(el).flexDirection), 'column');
    await page.keyboard.press('Escape');
  });

  await check('responsive: a row from 48rem, a column below', async () => {
    const dir = () => page.$eval('#mm-resp-list', (el) => getComputedStyle(el).flexDirection);
    assert.equal(await dir(), 'row');
    await page.setViewportSize({ width: 600, height: 900 });
    assert.equal(await dir(), 'column');
    await page.setViewportSize({ width: 1280, height: 900 });
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
