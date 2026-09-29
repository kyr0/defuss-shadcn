import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped menubar (menubar.js on top of
 * dropdown.js). Verifies the APG menubar model - roving tab stop, ← / → /
 * Home / End between triggers (skipping a disabled one), ↓ / ↑ / Enter
 * opening, ← / → inside a menu moving to the neighbouring menu while a
 * submenu trigger / an open submenu take the arrow first, hover switching
 * only while a menu is open, Escape back to the trigger - plus submenus three
 * levels deep, live checkbox / radio items, variants, sizes, RTL and the
 * named State API ('default' / 'open') on the real dist/ files.
 */
const FIXTURE = '/tests/e2e/menubar.e2e-fixture.html';
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
  const page: Page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => document.querySelectorAll('.menubar:not([data-init])').length === 0, undefined, { timeout: 5000 });
  const openIds = () => page.evaluate(() => [...document.querySelectorAll('.dropdown-content')].filter((m) => m.matches(':popover-open')).map((m) => m.id));
  const focused = () => page.evaluate(() => document.activeElement?.id);
  const closeAll = async () => { await page.evaluate(() => document.querySelectorAll('.dropdown-content:popover-open').forEach((m) => { try { (m as HTMLElement).hidePopover(); } catch { /* nested */ } })); await page.waitForTimeout(200); };

  await check('roles and one tab stop: role=menubar, triggers role=menuitem + aria-haspopup, roving tabindex', async () => {
    const r = await page.evaluate(() => ({
      role: document.getElementById('bar')!.getAttribute('role'),
      roles: ['t-file', 't-edit', 't-view'].map((id) => document.getElementById(id)!.getAttribute('role')),
      popup: document.getElementById('t-file')!.getAttribute('aria-haspopup'),
      tabs: ['t-file', 't-edit', 't-view', 't-help'].map((id) => document.getElementById(id)!.getAttribute('tabindex')),
    }));
    assert.deepEqual(r, { role: 'menubar', roles: ['menuitem', 'menuitem', 'menuitem'], popup: 'menu', tabs: ['0', '-1', '-1', '-1'] });
  });

  await check('keyboard on the bar: → / ← / Home / End move focus (skipping the disabled trigger, wrapping), the tab stop follows', async () => {
    await page.focus('#t-file');
    await page.keyboard.press('ArrowRight'); assert.equal(await focused(), 't-edit');
    await page.keyboard.press('ArrowRight'); assert.equal(await focused(), 't-view', 'skips disabled Git');
    await page.keyboard.press('End'); assert.equal(await focused(), 't-help');
    await page.keyboard.press('ArrowRight'); assert.equal(await focused(), 't-file', 'wraps');
    await page.keyboard.press('ArrowLeft'); assert.equal(await focused(), 't-help');
    await page.keyboard.press('Home'); assert.equal(await focused(), 't-file');
    assert.equal(await page.$eval('#t-file', (e) => e.getAttribute('tabindex')), '0');
    assert.deepEqual(await openIds(), [], 'no menu opened');
  });

  await check('↓ opens the menu with the first item focused, ↑ with the last; Esc closes it back to the trigger', async () => {
    await page.focus('#t-file');
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), ['m-file']);
    assert.equal(await focused(), 'f-new');
    assert.equal(await page.$eval('#t-file', (e) => e.getAttribute('aria-expanded')), 'true');
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), []);
    assert.equal(await focused(), 't-file');
    await page.keyboard.press('ArrowUp'); await page.waitForTimeout(200);
    assert.equal(await focused(), 'f-print');
    await closeAll();
  });

  await check('inside a menu: → / ← move to the neighbouring menu (first item focused), skipping disabled triggers', async () => {
    await page.focus('#t-edit');
    await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
    assert.deepEqual(await openIds(), ['m-view']);
    assert.equal(await focused(), 'v-bm');
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200);
    assert.deepEqual(await openIds(), ['m-edit']);
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200);
    assert.deepEqual(await openIds(), ['m-file']);
    await closeAll();
  });

  await check('submenus in the bar: → on a submenu trigger opens it (not the next menu), ← closes it (not the previous menu); three levels', async () => {
    await page.focus('#t-file');
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150);
    await page.keyboard.press('ArrowDown');
    assert.equal(await focused(), 'f-share', 'skips the disabled item');
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), ['m-file', 'm-share']);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), ['m-file', 'm-share', 'm-more', 'm-social']);
    assert.equal(await focused(), 'so-masto');
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), ['m-file', 'm-share', 'm-more']);
    assert.equal(await focused(), 'mo-social');
    await closeAll();
  });

  await check('pointer: click opens / closes; hovering another trigger switches only while a menu is open', async () => {
    await page.hover('#t-edit'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), [], 'no hover-open when closed');
    await page.click('#t-file'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), ['m-file']);
    await page.hover('#t-edit'); await page.waitForTimeout(200);
    assert.deepEqual(await openIds(), ['m-edit']);
    assert.equal(await page.$eval('#t-edit', (e) => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)'), true, 'open trigger highlighted');
    await page.hover('#t-git', { force: true }); await page.waitForTimeout(200);
    assert.deepEqual(await openIds(), ['m-edit'], 'a disabled trigger does not take over');
    await page.click('#t-edit'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), [], 'second click closes');
  });

  await check('hover submenus three levels deep from the bar', async () => {
    await page.click('#t-file'); await page.waitForTimeout(150);
    await page.hover('#f-share'); await page.waitForTimeout(300);
    await page.hover('#sh-more'); await page.waitForTimeout(300);
    await page.hover('#mo-social'); await page.waitForTimeout(300);
    assert.deepEqual(await openIds(), ['m-file', 'm-share', 'm-more', 'm-social']);
    await page.click('#so-masto'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), [], 'an item closes the whole tree');
    assert.equal(await focused(), 't-file');
  });

  await check('checkbox / radio items toggle live and keep the menu open', async () => {
    await page.click('#t-view'); await page.waitForTimeout(150);
    await page.click('#v-bm');
    await page.click('#v-luis');
    const r = await page.evaluate(() => ['v-bm', 'v-andy', 'v-luis'].map((id) => document.getElementById(id)!.getAttribute('aria-checked')));
    assert.deepEqual(r, ['true', 'false', 'true']);
    assert.deepEqual(await openIds(), ['m-view']);
    assert.equal(await page.$eval('#v-reload', (e) => getComputedStyle(e).paddingInlineStart), '24px', 'inset item');
    await closeAll();
  });

  await check("state API: setState('open', { menu }) / index / default, getState, unknown names throw", async () => {
    const r = await page.evaluate(async () => {
      const bar = document.getElementById('bar') as any;
      bar.api.setState('open', { menu: 'm-view' });
      await new Promise((res) => setTimeout(res, 100));
      const a = bar.api.getState();
      bar.api.setState('open', { menu: 1 });
      await new Promise((res) => setTimeout(res, 100));
      const b = bar.api.getState();
      bar.api.setState('default');
      await new Promise((res) => setTimeout(res, 100));
      const c = bar.api.getState();
      let threw = false;
      try { bar.api.setState('bogus'); } catch { threw = true; }
      const ns = (globalThis as any).df$.shadcn;
      return { a: [a.name, a.config.menu], b: [b.name, b.config.menu], c: [c.name, c.config.menu], threw, states: ns.menubarStates };
    });
    assert.deepEqual(r, { a: ['open', 'm-view'], b: ['open', 'm-edit'], c: ['default', null], threw: true, states: ['default', 'open'] });
  });

  await check('variants and sizes: muted surface, ghost without border, 26 / 30 / 36px triggers', async () => {
    const r = await page.evaluate(() => {
      const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
      return { muted: cs('bar-muted').backgroundColor !== cs('bar').backgroundColor, ghost: cs('bar-ghost').borderTopColor, h: ['mt', 't-file', 'lt'].map((id) => document.getElementById(id)!.getBoundingClientRect().height) };
    });
    assert.equal(r.muted, true);
    assert.equal(r.ghost, 'rgba(0, 0, 0, 0)');
    assert.deepEqual(r.h, [26, 30, 36]);
  });

  await check('RTL: ← moves to the next trigger (visually leftward), the menu aligns to its trigger\'s right edge', async () => {
    await page.focus('#r1');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await focused(), 'r2');
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150);
    const r = await page.evaluate(() => [document.getElementById('r2')!.getBoundingClientRect().right, document.getElementById('rm2')!.getBoundingClientRect().right]);
    assert.ok(Math.abs(r[0] - r[1]) < 2, `menu right ${r[1]} ~ trigger right ${r[0]}`);
    await closeAll();
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nmenubar.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('menubar.e2e: all checks passed');
