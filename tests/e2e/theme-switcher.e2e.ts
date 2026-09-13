import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped theme-switcher component. The fixture
 * mirrors both doc demos (two switchers) and verifies the whole contract:
 * popover trigger toggle + aria-expanded sync, the link-swap theme mechanism
 * (a real generated theme file loads, tokens actually change, `default`
 * unloads it), aria-checked radio semantics, cross-switcher sync through
 * defuss-theme-change, roving keyboard focus, and the named State API.
 */

const FIXTURE = '/tests/e2e/theme-switcher.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

/** the theme link, if loaded: {href, themeId} or null */
const themeLink = (page: Page) =>
  page.evaluate(() => {
    const link = document.getElementById('theme-css');
    return link ? { href: (link as HTMLLinkElement).href, themeId: link.dataset.themeId } : null;
  });

/** computed --primary of <html> (proves the stylesheet actually applied) */
const primary = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());

const isOpen = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => el.matches(':popover-open'));

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

  await check('theme-switcher.js initialized menus (data-init)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.theme-switcher-menu:not([data-init])').length === 0,
    );
  });

  await check('dot elements built from data-theme-colors', async () => {
    const dots = await page.$eval('#ts1-menu [data-theme-id="claude"] .theme-switcher-dots', (el) =>
      [...el.children].map((c) => (c as HTMLElement).style.background),
    );
    assert.equal(dots.length, 5, 'claude item shows 5 color dots');
    assert.match(dots[0], /rgb\(201, 100, 66\)/, 'first dot = #c96442');
  });

  await check('initial state: no theme link, Default checked', async () => {
    assert.equal(await themeLink(page), null, 'no theme link before selection');
    const checked = await page.$$eval('#ts1-menu [aria-checked="true"]', (els) =>
      els.map((el) => (el as HTMLElement).dataset.themeId),
    );
    assert.deepEqual(checked, ['default']);
  });

  await check('trigger click opens menu (popover) + aria-expanded sync', async () => {
    await page.click('#ts1-trigger');
    await page.waitForFunction(() => document.querySelector('#ts1-menu')!.matches(':popover-open'));
    assert.equal(await page.getAttribute('#ts1-trigger', 'aria-expanded'), 'true');
    // menu placed under the trigger by CSS anchor positioning — after the
    // 150ms scale() enter transition (getBoundingClientRect includes transforms)
    await page.waitForTimeout(220);
    const geom = await page.evaluate(() => {
      const t = document.querySelector('#ts1-trigger')!.getBoundingClientRect();
      const m = document.querySelector('#ts1-menu')!.getBoundingClientRect();
      return { below: m.top >= t.bottom - 1, aligned: Math.abs(m.left - t.left) < 2 };
    });
    assert.ok(geom.below, 'menu opens below trigger');
    assert.ok(geom.aligned, 'menu left edge aligns with trigger');
  });

  await check('selecting Claude loads the real theme file and re-themes', async () => {
    const before = await primary(page);
    await page.click('#ts1-menu [data-theme-id="claude"]');
    const link = await themeLink(page);
    assert.ok(link, 'theme link inserted');
    assert.match(link!.href, /\/dist\/theme\/claude\.css$/, 'href resolves one folder above the token dir');
    assert.equal(link!.themeId, 'claude');
    await page.waitForFunction(
      () => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#c96442',
      undefined,
      { timeout: 5000 },
    );
    assert.notEqual(await primary(page), before, '--primary changed');
    // menu closed, radio + trigger updated
    assert.equal(await isOpen(page, 'ts1-menu'), false, 'menu closes on select');
    const checked = await page.$$eval('#ts1-menu [aria-checked="true"]', (els) =>
      els.map((el) => (el as HTMLElement).dataset.themeId),
    );
    assert.deepEqual(checked, ['claude']);
    assert.equal(await page.textContent('#ts1-trigger .theme-switcher-label'), 'Claude');
  });

  await check('selection persists to localStorage', async () => {
    assert.equal(await page.evaluate(() => localStorage.getItem('defuss-shadcn-color-theme')), 'claude');
  });

  await check('second switcher synced via defuss-theme-change', async () => {
    const label = await page.textContent('#ts2-trigger .theme-switcher-label');
    assert.equal(label, 'Claude', 'other switcher trigger reflects the shared theme');
    const checked = await page.$eval('#ts2-menu [data-theme-id="claude"]', (el) => el.getAttribute('aria-checked'));
    assert.equal(checked, 'true');
  });

  await check('roving keyboard focus inside the menu', async () => {
    await page.click('#ts2-trigger');
    // focus lands on the first item one frame after :popover-open (rAF
    // re-focus wins the race against the native anchor focus)
    await page.waitForFunction(
      () => document.querySelector('#ts2-menu')!.matches(':popover-open') &&
        !!document.activeElement?.closest('#ts2-menu'),
      undefined,
      { timeout: 2000 },
    );
    const first = await page.evaluate(() => document.activeElement?.getAttribute('data-theme-id'));
    assert.equal(first, 'default', 'open focuses first item');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-theme-id')), 'claude');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-theme-id')), 'default');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-theme-id')), 'claude');
  });

  await check('selecting Default removes the link (tokens restored)', async () => {
    await page.keyboard.press('Home'); // focus the Default item before Enter
    await page.keyboard.press('Enter');
    assert.equal(await themeLink(page), null, 'theme link removed');
    assert.equal(await page.evaluate(() => localStorage.getItem('defuss-shadcn-color-theme')), null);
    assert.notEqual(await primary(page), '#c96442', '--primary back to base token');
  });

  await check('State API: open/default states via bound api', async () => {
    await page.evaluate(() => (document.querySelector('#ts1-menu') as any).api.setState('open'));
    // safeShowPopover may wait out a still-running exit transition → wait
    await page.waitForFunction(() => document.querySelector('#ts1-menu')!.matches(':popover-open'), undefined, { timeout: 2000 });
    assert.ok(await isOpen(page, 'ts1-menu'), "setState('open') shows the menu");
    assert.deepEqual(
      await page.evaluate(() => (document.querySelector('#ts1-menu') as any).api.getState()),
      { name: 'open', config: {} },
    );
    await page.evaluate(() => (document.querySelector('#ts1-menu') as any).api.setState('default'));
    assert.equal(await isOpen(page, 'ts1-menu'), false, "setState('default') hides the menu");
    const rejected = await page.evaluate(() => {
      try { (document.querySelector('#ts1-menu') as any).api.setState('nope'); return false; }
      catch { return true; }
    });
    assert.ok(rejected, 'unknown state throws');
  });

  await check('registry API select() drives the theme without a click', async () => {
    await page.evaluate(() =>
      (globalThis as any)._defussShadcn.themeSwitcherApi.select(document.querySelector('#ts1-menu'), 'vercel'),
    );
    const link = await themeLink(page);
    assert.equal(link?.themeId, 'vercel');
    await page.waitForFunction(
      () => !!(document.getElementById('theme-css') as HTMLLinkElement | null)?.sheet,
      undefined,
      { timeout: 5000 },
    );
    // cssRules (not cssText) is the CSSOM surface on Chromium
    const vercelPrimary = await page.evaluate(
      () => (document.getElementById('theme-css') as HTMLLinkElement | null)?.sheet
        ?.cssRules[0]?.cssText.match(/--primary:\s*([^;]+)/)?.[1]?.trim(),
    );
    assert.ok(vercelPrimary, 'vercel theme file parsed and defines --primary');
    await page.waitForFunction(
      (expected) => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === expected,
      vercelPrimary,
      { timeout: 5000 },
    );
    assert.equal(await primary(page), vercelPrimary, 'theme file drives the live --primary token');
  });

  console.log(failures ? `theme-switcher.e2e: ${failures} FAILED` : 'theme-switcher.e2e: all checks passed');
  process.exitCode = failures ? 1 : 0;
} finally {
  await browser.close();
  server.stop(); // otherwise the Bun server keeps the event loop alive forever
}
