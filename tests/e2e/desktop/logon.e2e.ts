import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the logon screen checks nothing itself - the page answers each sign-in. These checks drive the real dist/
 * files: picking a user opens the password form for them, a submit fires logon-submit with the user and the typed
 * password, fail() shows the message and keeps the user, done() hides the screen, lock() brings back the users; a
 * user without a password signs in on the pick; power buttons fire logon-power; Escape and arrows; every state and
 * the render() contract.
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

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}/tests/e2e/desktop/logon.e2e-fixture.html`);
  await page.waitForSelector('#logon[data-init]');
  await page.evaluate(() => {
    (globalThis as any).ev = [];
    for (const t of ['logon-submit', 'logon-power'])
      document.addEventListener(t, (e) => (globalThis as any).ev.push([t, (e as CustomEvent).detail]));
  });
  const last = () => page.evaluate(() => (globalThis as any).ev.at(-1));
  const state = (sel = '#logon') => page.evaluate((s) => (document.querySelector(s) as any).api.getState().name, sel);

  await check('the users to pick from; the form hidden', async () => {
    assert.equal(await state(), 'default');
    assert.equal(await page.isVisible('#logon .logon-form'), false);
    assert.equal(await page.getAttribute('#u-ada', 'aria-pressed'), 'false');
  });

  await check('picking a user opens the password form for them, focused', async () => {
    await page.click('#u-ada');
    assert.equal(await state(), 'signing-in');
    assert.equal(await page.isVisible('#logon .logon-form'), true);
    assert.equal(await page.textContent('#logon .logon-for'), 'Ada');
    assert.equal(await page.getAttribute('#u-ada', 'aria-pressed'), 'true');
    await page.waitForFunction(() => (document.activeElement as HTMLInputElement)?.type === 'password');
  });

  await check('a submit fires logon-submit with the user and the password; fail() shows the message', async () => {
    await page.keyboard.type('wrong');
    await page.keyboard.press('Enter');
    assert.deepEqual(await last(), ['logon-submit', { user: 'ada', password: 'wrong' }]);
    await page.evaluate(() => (globalThis as any).df$.shadcn.logon.fail('logon', 'Wrong password - try again.'));
    assert.equal(await state(), 'error');
    assert.equal(await page.textContent('#logon .logon-error'), 'Wrong password - try again.');
    assert.equal(await page.isVisible('#logon .logon-error'), true);
    assert.equal(await page.getAttribute('#logon input[type="password"]', 'aria-invalid'), 'true');
    assert.equal(await page.textContent('#logon .logon-for'), 'Ada', 'keeps the user');
  });

  await check('done() signs in: the screen hides; lock() brings the users back', async () => {
    await page.fill('#logon input[type="password"]', 'secret');
    await page.click('#logon button[type="submit"]');
    assert.deepEqual(await last(), ['logon-submit', { user: 'ada', password: 'secret' }]);
    await page.evaluate(() => (globalThis as any).df$.shadcn.logon.done('logon'));
    assert.equal(await state(), 'signed-in');
    assert.equal(await page.isVisible('#logon'), false);
    await page.evaluate(() => (globalThis as any).df$.shadcn.logon.lock('logon'));
    assert.equal(await state(), 'default');
    assert.equal(await page.isVisible('#logon .logon-users'), true);
    assert.equal(await page.inputValue('#logon input[type="password"]'), '', 'the password is gone');
  });

  await check('a user without a password signs in on the pick (an empty password)', async () => {
    await page.click('#u-guest');
    assert.deepEqual(await last(), ['logon-submit', { user: 'guest', password: '' }]);
    await page.evaluate(() => (globalThis as any).df$.shadcn.logon.lock('logon'));
  });

  await check('Escape goes back to the users; arrows move between them', async () => {
    await page.click('#u-ada');
    await page.waitForFunction(() => (document.activeElement as HTMLInputElement)?.type === 'password');
    await page.keyboard.press('Escape');
    assert.equal(await state(), 'default');
    await page.focus('#u-ada');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'u-guest');
  });

  await check('power buttons fire logon-power', async () => {
    await page.click('#p-off');
    assert.deepEqual(await last(), ['logon-power', { action: 'shutdown' }]);
  });

  await check('a screen authored signed in starts signed in', async () => {
    assert.equal(await state('#logon2'), 'signed-in');
    assert.equal(await page.isVisible('#logon2'), false);
  });

  await check('setState reaches every state', async () => {
    const set = (n: string, c: object) =>
      page.evaluate(([n, c]) => (document.querySelector('#logon') as any).api.setState(n, c), [n, c] as const);
    await set('signing-in', { user: 'guest' });
    assert.equal(await page.textContent('#logon .logon-for'), 'Guest');
    await set('error', { user: 'ada', message: 'Locked out' });
    assert.equal(await page.textContent('#logon .logon-error'), 'Locked out');
    await set('signed-in', { user: 'ada' });
    assert.equal(await page.getAttribute('#logon', 'data-signed-in'), '');
    await set('default', {});
    assert.equal(await page.getAttribute('#logon', 'data-user'), null);
  });

  await check('render() contract: every state', async () => {
    await assertRenderContract(page, '.logon[id]', ['default', 'signing-in', 'error', 'signed-in']);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`logon.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('logon.e2e: all checks passed');
