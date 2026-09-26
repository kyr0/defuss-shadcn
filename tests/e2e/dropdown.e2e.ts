import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped dropdown component. Loads the fixture
 * (options menu + checkbox/radio menu, mirroring both doc demos) over HTTP in
 * a real browser, then verifies trigger toggle, aria-expanded sync, keyboard
 * navigation with roving highlight, checkbox/radio activation, disabled-item
 * skipping, the destructive variant, and the named State API - the same files
 * consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/dropdown.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const isOpen = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => el.matches(':popover-open'));

/** ids of the highlighted (data-highlighted) items inside a menu */
const highlighted = (page: Page, id: string) =>
  page.$$eval(`#${id} [data-highlighted]`, (els) => els.map((el) => el.textContent!.trim()));

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

  await check('dropdown.js initialized triggers + menus (data-init)', async () => {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-dropdown-trigger]:not([data-init])').length === 0 &&
        document.querySelectorAll('.dropdown-content[popover]:not([data-init])').length === 0,
    );
  });

  await check('check/radio indicators use a mask (visible in dark mode)', async () => {
    // regression: data: URI SVGs resolve currentColor to BLACK when used as
    // background-image - the checks vanished on dark surfaces. A mask paints
    // them with background-color: currentColor instead.
    const geom = await page.evaluate(() => {
      const chk = document.querySelector('.dropdown-check[aria-checked="true"]')!;
      const rad = document.querySelector('.dropdown-radio[aria-checked="true"]')!;
      const pick = (el: Element) => {
        const b = getComputedStyle(el, '::before');
        return { mask: b.maskImage || b.webkitMaskImage || 'none', svgBg: /svg/.test(b.backgroundImage), color: b.backgroundColor };
      };
      return { chk: pick(chk), rad: pick(rad) };
    });
    for (const [name, g] of Object.entries(geom)) {
      assert.match(g.mask, /url\(/, `${name}: check glyph applied as mask-image`);
      assert.ok(!g.svgBg, `${name}: no black data-URI SVG background`);
      assert.notEqual(g.color, 'rgba(0, 0, 0, 0)', `${name}: background-color paints the mask`);
    }
  });

  await check('dropdown.css applied (menu surface)', async () => {
    const style = await page.$eval('#demo-dropdown', (el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, border: cs.borderTopWidth, padding: cs.paddingBlockStart };
    });
    assert.notEqual(style.bg, 'rgba(0, 0, 0, 0)', 'menu surface must be opaque');
    assert.notEqual(style.border, '0px', 'menu has a border');
    assert.notEqual(style.padding, '0px', 'menu has padding');
  });

  await check('trigger click toggles the menu + aria-expanded', async () => {
    await page.click('[data-dropdown-trigger="demo-dropdown"]');
    // aria-expanded is set by the async `toggle` event - poll it, don't race it
    await page.waitForFunction(
      () =>
        document.querySelector('#demo-dropdown')!.matches(':popover-open') &&
        document.querySelector('[data-dropdown-trigger="demo-dropdown"]')!.getAttribute('aria-expanded') === 'true',
    );
    // opening focuses + highlights the first enabled item
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-dropdown [data-highlighted]').length > 0,
    );
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Profile ⇧⌘P']);
    await page.click('[data-dropdown-trigger="demo-dropdown"]');
    await page.waitForFunction(
      () =>
        !document.querySelector('#demo-dropdown')!.matches(':popover-open') &&
        document.querySelector('[data-dropdown-trigger="demo-dropdown"]')!.getAttribute('aria-expanded') === 'false',
    );
  });

  await check('ArrowDown/ArrowUp roam enabled items (skips disabled)', async () => {
    await page.click('[data-dropdown-trigger="demo-dropdown"]');
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-dropdown [data-highlighted]').length > 0,
    );
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Profile ⇧⌘P']);
    await page.keyboard.press('ArrowDown'); // Profile -> Settings
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Settings']);
    await page.keyboard.press('ArrowDown'); // Settings -> (Upload disabled) -> Export
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Export']);
    await page.keyboard.press('ArrowUp');
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Settings']);
    await page.keyboard.press('Home');
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Profile ⇧⌘P']);
    await page.keyboard.press('End');
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Delete']);
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(page, 'demo-dropdown'), false, 'Escape closes');
  });

  await check('typeahead jumps to matching item', async () => {
    await page.click('[data-dropdown-trigger="demo-dropdown"]');
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-dropdown [data-highlighted]').length > 0,
    );
    await page.keyboard.press('e');
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Export']);
    await page.keyboard.press('Escape');
  });

  await check('destructive item highlights red (data-variant)', async () => {
    await page.click('[data-dropdown-trigger="demo-dropdown"]');
    // wait until the menu is actually open (entry animation + toggle event)
    await page.waitForFunction(() => document.querySelector('#demo-dropdown')!.matches(':popover-open'));
    await page.hover('#demo-dropdown [data-variant="destructive"]');
    const style = await page.$eval('#demo-dropdown [data-variant="destructive"]', (el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });
    assert.notEqual(style.bg, 'rgba(0, 0, 0, 0)', 'destructive highlight fills the destructive color');
    assert.notEqual(style.color, 'rgba(0, 0, 0, 0)', 'destructive foreground text');
    await page.keyboard.press('Escape');
  });

  await check('menuitemcheckbox toggles aria-checked on Enter', async () => {
    await page.click('[data-dropdown-trigger="demo-checks"]');
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-checks [data-highlighted]').length > 0,
    );
    const before = await page.$eval('#demo-checks [role="menuitemcheckbox"]', (el) =>
      el.getAttribute('aria-checked'),
    );
    await page.keyboard.press('Enter');
    const after = await page.$eval('#demo-checks [role="menuitemcheckbox"]', (el) =>
      el.getAttribute('aria-checked'),
    );
    assert.equal(after, before === 'true' ? 'false' : 'true', 'checkbox flips');
    assert.equal(await isOpen(page, 'demo-checks'), true, 'checkbox keeps the menu open');
    await page.keyboard.press('Escape');
  });

  await check('menuitemradio selection is exclusive within its group', async () => {
    await page.click('[data-dropdown-trigger="demo-checks"]');
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-checks [data-highlighted]').length > 0,
    );
    // open highlights the first checkbox (Status Bar); two steps reach the radios
    await page.keyboard.press('ArrowDown'); // -> Activity Bar checkbox
    await page.keyboard.press('ArrowDown'); // -> Default radio
    await page.keyboard.press('Enter');
    const checks = await page.$$eval('#demo-checks [role="menuitemradio"]', (els) =>
      els.map((el) => el.getAttribute('aria-checked')),
    );
    assert.deepEqual(checks, ['true', 'false'], 'only the activated radio stays checked');
    await page.keyboard.press('Escape');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  const setState = (page: Page, id: string, state: string) =>
    page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check("state API: setState('open') opens menu and highlights first item", async () => {
    await setState(page, 'demo-dropdown', 'open');
    // the toggle handler is async (toggle event) - poll for its highlight
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-dropdown [data-highlighted]').length > 0,
    );
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Profile ⇧⌘P']);
    const state = await page.$eval('#demo-dropdown', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open');
  });

  await check("state API: setState('default') closes the menu", async () => {
    await setState(page, 'demo-dropdown', 'default');
    assert.equal(await isOpen(page, 'demo-dropdown'), false, 'default state = closed');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#demo-dropdown') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.dropdownApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.dropdownStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#demo-dropdown'),
    }));
    assert.ok(reg.hasApi, 'df$.dropdownApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'open']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('dropdown: data-size="xs" → font-size 12px', async () => {
    const val = await page.$eval('#z-dropdown-xs-pop .dropdown-item', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '12px');
  });
  await check('dropdown: data-size="sm" → font-size 13px', async () => {
    const val = await page.$eval('#z-dropdown-sm-pop .dropdown-item', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '13px');
  });
  await check('dropdown: data-size="md" → font-size 14px', async () => {
    const val = await page.$eval('#z-dropdown-md-pop .dropdown-item', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '14px');
  });
  await check('dropdown: data-size="lg" → font-size 16px', async () => {
    const val = await page.$eval('#z-dropdown-lg-pop .dropdown-item', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '16px');
  });
  await check('dropdown: data-size="xl" → font-size 18px', async () => {
    const val = await page.$eval('#z-dropdown-xl-pop .dropdown-item', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '18px');
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ndropdown.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('dropdown.e2e: all checks passed');
