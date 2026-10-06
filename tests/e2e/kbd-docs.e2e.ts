import assert from 'node:assert/strict';
import { chromium, type Frame, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: a shortcut the docs show must work - the Kbd page's examples that say
 * what a key does wire it through the shared global key API
 * (df$.shadcn.shared.bindGlobalKeys). Real key presses inside each example's
 * sandbox: the action runs and the key goes down (data-pressed).
 */
const { url, stop } = startServer();
const browser = await chromium.launch();
let failed = 0;

async function check(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}

/** the sandbox frame of the example labelled `label`, booted and focused */
async function example(page: Page, label: string): Promise<Frame> {
  const card = page.locator('.code-example', { has: page.locator(`p:has-text("${label}")`) }).first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForFunction((l) => [...document.querySelectorAll('.code-example')].some((c) => c.querySelector('p')?.textContent?.endsWith(l) && (c as HTMLElement & { preview?: unknown }).preview), label, { timeout: 30_000 });
  const handle = (await card.locator('.code-example-frame').elementHandle())!;
  const frame = await handle.contentFrame();
  assert.ok(frame, `${label}: no preview frame`);
  // the preview takes the keyboard - focused, not clicked: a click would hit the
  // example's first control (and the stage's resize handles sit on the corners)
  await handle.focus();
  await frame.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.focus(); });
  return frame;
}

const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await page.route(/^https?:\/\/esm\.sh\//, (r) => r.abort());
await page.goto(`${url}/dist/documentation/kbd.html`, { waitUntil: 'domcontentloaded' });

try {
  await check('In a control: ⌘S / ⌘Z / ⌘K run the buttons\' actions, the key goes down', async () => {
    const f = await example(page, 'In a control');
    await page.keyboard.press('Control+s');
    assert.equal(await f.locator('[data-shortcut="s"]').getAttribute('data-pressed'), '', 'the key is down while the action runs');
    assert.match((await f.locator('#kbd-control-log').textContent()) ?? '', /^Saved at /);
    await page.keyboard.press('Control+z');
    assert.match((await f.locator('#kbd-control-log').textContent()) ?? '', /^Last change undone/);
    await page.keyboard.press('Control+k');
    assert.match((await f.locator('#kbd-control-log').textContent()) ?? '', /^Search opened/);
    await page.waitForTimeout(250);
    assert.equal(await f.locator('[data-shortcut="s"]').getAttribute('data-pressed'), null, 'and comes back up');
  });

  await check('In prose: ⌘K opens the command palette, Esc dismisses it', async () => {
    const f = await example(page, 'In prose');
    await page.keyboard.press('Control+k');
    await f.waitForFunction(() => (document.getElementById('kbd-prose-palette') as HTMLDialogElement).open);
    await page.keyboard.press('Escape');
    await f.waitForFunction(() => !(document.getElementById('kbd-prose-palette') as HTMLDialogElement).open);
  });

  await check('In a menu: ⌫ deletes, ⌘Z restores, ⌘⇧Z deletes again', async () => {
    const f = await example(page, 'In a menu');
    const tags = () => f.locator('#kbd-tags .badge').count();
    assert.equal(await tags(), 3);
    await page.keyboard.press('Backspace');
    assert.equal(await tags(), 2);
    await page.keyboard.press('Control+z');
    assert.equal(await tags(), 3);
    await page.keyboard.press('Control+Shift+z');
    assert.equal(await tags(), 2);
  });

  await check('In a tooltip: ⌘B toggles bold on the button and the text', async () => {
    const f = await example(page, 'In a tooltip');
    await page.keyboard.press('Control+b');
    assert.equal(await f.locator('#kbd-bold').getAttribute('aria-pressed'), 'true');
    assert.equal(await f.locator('#kbd-bold-text').evaluate((el) => getComputedStyle(el).fontWeight), '700');
    await page.keyboard.press('Control+b');
    assert.equal(await f.locator('#kbd-bold').getAttribute('aria-pressed'), 'false');
  });

  await check('Decorative shortcuts: the button and ⌘K both open the palette', async () => {
    const f = await example(page, 'Decorative shortcuts');
    await page.keyboard.press('Control+k');
    await f.waitForFunction(() => (document.getElementById('kbd-palette') as HTMLDialogElement).open);
    await page.keyboard.press('Escape');
    await f.locator('[data-command-trigger="kbd-palette"]').click();
    await f.waitForFunction(() => (document.getElementById('kbd-palette') as HTMLDialogElement).open);
  });
} finally {
  await browser.close();
  stop();
}

if (failed) {
  console.error(`kbd-docs.e2e: ${failed} check(s) failed`);
  process.exit(1);
}
console.log('kbd-docs.e2e: all checks passed');
