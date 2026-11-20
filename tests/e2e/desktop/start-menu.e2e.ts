import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the start menu is how a desktop's reader finds an app. These checks drive the real dist/ files: the Start
 * Button opens it above itself with the focus in the search; typing searches every item, folders' too; arrows,
 * Right / Left and hover open and close folders beside their item; a pick fires start-select and closes the menu;
 * Ctrl+Esc toggles it; the states and the render() contract.
 */

const server = startServer();
const browser = await chromium.launch();
let failures = 0;
const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
};
const isOpen = (page: Page, sel: string) => page.$eval(sel, (m) => m.matches(':popover-open'));
const shown = (page: Page) =>
  page.$$eval('#start .start-menu-item', (is) =>
    is.filter((i) => (i as HTMLElement).checkVisibility()).map((i) => i.textContent!.trim() || i.getAttribute('aria-label')),
  );
const focused = (page: Page) => page.evaluate(() => document.activeElement?.textContent?.trim());

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}/tests/e2e/desktop/start-menu.e2e-fixture.html`);
  await page.waitForSelector('#start[data-init]', { state: 'attached' });
  await page.evaluate(() => {
    (globalThis as any).picks = [];
    document.addEventListener('start-select', (e) => (globalThis as any).picks.push((e as CustomEvent).detail));
  });

  await check('the Start Button opens it above itself, the search focused; folders are marked', async () => {
    await page.click('#sb');
    assert.equal(await isOpen(page, '#start'), true);
    const m = (await page.locator('#start').boundingBox())!,
      b = (await page.locator('#sb').boundingBox())!;
    assert.ok(Math.abs(m.y + m.height - b.y) < 1, 'its bottom on the button');
    // the toggle event (which focuses the search) arrives a task after the click
    await page.waitForFunction(() => (document.activeElement as HTMLInputElement)?.type === 'search');
    assert.equal(await page.getAttribute('#f-acc', 'aria-haspopup'), 'menu');
    assert.equal(await page.getAttribute('#f-acc', 'aria-expanded'), 'false');
  });

  await check('typing searches every item - a folder\'s too - in one list; Enter picks the first match', async () => {
    await page.keyboard.type('sol');
    assert.deepEqual(await shown(page), ['Solitaire', 'Settings', 'Shut down']);
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('zzz');
    assert.equal(await page.$eval('#start .start-menu-empty', (e) => (e as HTMLElement).hidden), false);
    await page.fill('#start input', 'cal');
    await page.dispatchEvent('#start input', 'input');
    assert.deepEqual((await shown(page)).slice(0, 2), ['Calculator', 'Calendar']);
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).picks.at(-1)), { value: 'calculator', label: 'Calculator' });
    assert.equal(await isOpen(page, '#start'), false, 'a pick closes it');
  });

  await check('closing clears the search', async () => {
    await page.click('#sb');
    await page.waitForFunction(() => (document.activeElement as HTMLInputElement)?.type === 'search');
    assert.equal(await page.inputValue('#start input'), '');
    assert.ok((await shown(page)).includes('Notes'));
  });

  await check('arrows walk the items; Right opens a folder beside its item, Left closes it', async () => {
    await page.keyboard.press('ArrowDown');
    assert.equal(await focused(page), 'Notes');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    assert.equal(await focused(page), 'Accessories');
    await page.keyboard.press('ArrowRight');
    assert.equal(await isOpen(page, '#start-acc'), true);
    assert.equal(await page.getAttribute('#f-acc', 'aria-expanded'), 'true');
    assert.equal(await focused(page), 'Calculator');
    const f = (await page.locator('#f-acc').boundingBox())!,
      s = (await page.locator('#start-acc').boundingBox())!;
    assert.ok(s.x >= f.x + f.width - 1, 'beside its item');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    assert.equal(await isOpen(page, '#start-games'), true, 'a folder in a folder');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await isOpen(page, '#start-games'), false);
    assert.equal(await focused(page), 'Games');
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(page, '#start-acc'), false, 'Escape in a folder closes the folder');
    assert.equal(await isOpen(page, '#start'), true, '... not the menu');
  });

  await check('hover opens a folder; a click in it picks', async () => {
    await page.hover('#f-acc');
    assert.equal(await isOpen(page, '#start-acc'), true);
    await page.click('#start-acc [data-value="calculator"]');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).picks.at(-1)), { value: 'calculator', label: 'Calculator' });
    assert.equal(await isOpen(page, '#start'), false);
    assert.equal(await isOpen(page, '#start-acc'), false, 'its folders close with it');
  });

  await check('Ctrl+Esc toggles the menu', async () => {
    await page.keyboard.press('Control+Escape');
    await page.waitForFunction(() => document.querySelector('#start')!.matches(':popover-open'));
    await page.keyboard.press('Control+Escape');
    await page.waitForFunction(() => !document.querySelector('#start')!.matches(':popover-open'));
  });

  await check('setState open with a query, getState reads it back; default closes', async () => {
    await page.evaluate(() => (document.querySelector('#start') as any).api.setState('open', { query: 'term' }));
    assert.equal(await isOpen(page, '#start'), true);
    assert.deepEqual((await shown(page)).slice(0, 1), ['Terminal']);
    const st = await page.evaluate(() => (document.querySelector('#start') as any).api.getState());
    assert.deepEqual([st.name, st.config], ['open', { query: 'term' }]);
    await page.evaluate(() => (globalThis as any).df$.shadcn.startMenu.close('start'));
    assert.equal(await isOpen(page, '#start'), false);
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.startMenu.toggle('start')), true);
    await page.evaluate(() => (globalThis as any).df$.shadcn.startMenu.close('start'));
  });

  // VERIFIED: (the Desktop scaffold, 2026-11-20) its own search handler emptied the field before the menu closed, and
  // the next opening showed nothing but an empty result list
  await check('a search the page emptied itself still ends with the menu', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.startMenu.open('start', 'cal'));
    assert.equal(await page.getAttribute('#start', 'data-searching'), '');
    await page.evaluate(() => ((document.querySelector('#start input') as HTMLInputElement).value = ''));
    await page.evaluate(() => (globalThis as any).df$.shadcn.startMenu.close('start'));
    await page.waitForFunction(() => !document.querySelector('#start')!.hasAttribute('data-searching'));
    await page.evaluate(() => (globalThis as any).df$.shadcn.startMenu.open('start'));
    assert.ok((await shown(page)).includes('Notes'));
    await page.evaluate(() => (globalThis as any).df$.shadcn.startMenu.close('start'));
  });

  await check('render() contract: both states', async () => {
    await assertRenderContract(page, '.start-menu[id]:not(.start-menu-sub)', ['default', 'open'], {
      runtimeAttrs: ['aria-haspopup', 'aria-expanded', 'style', 'data-searching', 'data-match', 'hidden'],
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`start-menu.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('start-menu.e2e: all checks passed');
