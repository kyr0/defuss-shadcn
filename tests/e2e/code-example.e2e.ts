import assert from 'node:assert/strict';
import { chromium, type Locator, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: CodeExample's contract is three-way sync — editing the code re-renders
 * the preview AND updates the State panel; a panel edit serializes into the
 * code; real keystrokes inside the sandbox flow to BOTH. Only plain Playwright
 * can drive trusted input into the opaque-origin srcdoc frame (Vitest browser
 * mode has no frame input), so this e2e pins what tests/code-example.test.ts
 * can only cover through the host-side API handle. Serves the real docs page.
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

async function waitFor(cond: () => Promise<boolean>, msg: string, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.ok(false, msg);
}

const mirrorOf = (card: Locator, key: string) =>
  card.evaluate(
    (el, k) => JSON.parse((el as HTMLElement).dataset.stateValues ?? '{}')[k] as unknown,
    key,
  );
// hidden panels are still assertable — property reads need no visibility
const editorVal = (card: Locator) =>
  card.evaluate((el) => (el.querySelector('.code-example-src') as HTMLTextAreaElement).value);
const stateVal = (card: Locator, name: string) =>
  card.evaluate(
    (el, n) => (el.querySelector(`[data-state-name="${n}"] .code-example-control`) as HTMLInputElement).value,
    name,
  );
const clickTab = (card: Locator, which: 'code' | 'state') =>
  card.locator(`.code-example-tab[data-tab="${which}"]`).click();

try {
  const page: Page = await browser.newPage();
  await page.goto(`${url}/dist/documentation/input.html`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2500); // fonts + first sandbox boot
  const card = page.locator('.code-example').first();
  await clickTab(card, 'state');

  await check('A: code edit → rendering + state panel update', async () => {
    await clickTab(card, 'code');
    await card.locator('.code-example-src').fill('<input data-example-root class="input" type="email" value="from-code" />');
    await waitFor(async () => (await mirrorOf(card, 'value')) === 'from-code', 'mirror shows from-code');
    assert.equal(await stateVal(card, 'value'), 'from-code', 'State panel shows the edited value');
  });

  await check('B: panel edit → code update (mutation serialized into source)', async () => {
    await clickTab(card, 'state');
    await card.locator('[data-state-name="type"] .code-example-control').selectOption('search');
    await waitFor(async () => (await editorVal(card)).includes('type="search"'), 'editor shows type="search"');
    assert.equal(await mirrorOf(card, 'type'), 'search', 'rendered DOM re-read as search');
  });

  await check('C: real keystrokes in the preview → state + code update', async () => {
    const sb = card.locator('iframe').contentFrame();
    await sb.locator('input.input').fill(''); // clear first (fill fires input/change too)
    await sb.locator('input.input').click();
    await page.keyboard.type('hello-preview', { delay: 25 });
    await waitFor(async () => (await mirrorOf(card, 'value')) === 'hello-preview', 'mirror shows typed value');
    assert.equal(await stateVal(card, 'value'), 'hello-preview', 'State panel follows the typing');
    await waitFor(async () => (await editorVal(card)).includes('hello-preview'), 'editor reflects the typed value');
  });

  await check('D: un-run editor edit is never clobbered by a state post', async () => {
    await clickTab(card, 'code');
    await card.locator('.code-example-src').fill('<input data-example-root class="input" value="pending-edit" />');
    const held = await editorVal(card);
    await page.waitForTimeout(150); // mid-debounce: a source post must NOT overwrite
    assert.equal(await editorVal(card), held, 'editor keeps the un-run bytes');
  });
} finally {
  await browser.close();
  stop();
}

if (failed) {
  console.error(`code-example.e2e: ${failed} check(s) failed`);
  process.exit(1);
}
console.log('code-example.e2e: all checks passed');
