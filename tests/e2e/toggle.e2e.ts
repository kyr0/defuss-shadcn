import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped toggle component. Loads the fixture
 * (all documented variants/sizes, mirroring the doc page) over HTTP in a real
 * browser, then verifies click toggling, pressed styling, disabled behavior,
 * and the named State API — the same files consumers copy from dist/,
 * unmodified.
 */

const FIXTURE = '/tests/e2e/toggle.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const pressed = (page: Page, id = 'tg-default') =>
  page.$eval(`#${id}`, (el) => el.getAttribute('aria-pressed'));

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

  await check('toggle.js initialized standalone toggles (data-init)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.toggle:not([data-init])').length === 0,
    );
  });

  await check('click toggles aria-pressed both ways', async () => {
    await page.click('#tg-default');
    assert.equal(await pressed(page), 'true');
    await page.click('#tg-default');
    assert.equal(await pressed(page), 'false');
  });

  await check('pressed toggle gets accent background (toggle.css)', async () => {
    const styles = await page.evaluate(() => {
      const bg = (id: string) => getComputedStyle(document.querySelector(id)!).backgroundColor;
      return { off: bg('#tg-default'), on: bg('#tg-pressed') };
    });
    assert.notEqual(styles.on, styles.off, 'pressed background differs');
    assert.notEqual(styles.on, 'rgba(0, 0, 0, 0)', 'pressed background is painted');
  });

  await check('outline variant styles pressed state too', async () => {
    const style = await page.$eval('#tg-outline', (el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, border: cs.borderTopWidth };
    });
    assert.notEqual(style.border, '0px', 'outline variant is bordered');
    assert.notEqual(style.bg, 'rgba(0, 0, 0, 0)', 'pressed outline variant is painted');
  });

  await check('full size scale heights xs/sm/md/lg/xl = 28/32/36/40/48', async () => {
    const [xs, sm, md, lg, xl] = await page.evaluate(() =>
      ['xs', 'sm', 'md', 'lg', 'xl'].map(
        (s) => document.querySelector(`#tg-${s}`)!.getBoundingClientRect().height,
      ),
    );
    assert.deepEqual([xs, sm, md, lg, xl], [28, 32, 36, 40, 48]);
  });

  await check('disabled toggle ignores clicks', async () => {
    await page.click('#tg-disabled', { force: true });
    assert.equal(await pressed(page, 'tg-disabled'), 'false', 'stays unpressed');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  await check("state API: setState('pressed') / getState round-trip", async () => {
    const before = await page.$eval('#tg-default', (el) => (el as HTMLElement).api!.getState());
    assert.equal(before.name, 'default');
    await page.$eval('#tg-default', (el) => (el as HTMLElement).api!.setState('pressed'));
    assert.equal(await pressed(page), 'true');
    const state = await page.$eval('#tg-default', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'pressed');
  });

  await check("state API: setState('default') restores the authored value", async () => {
    // tg-pressed was authored pressed=true; set to pressed, back to default
    await page.$eval('#tg-pressed', (el) => (el as HTMLElement).api!.setState('pressed'));
    await page.$eval('#tg-pressed', (el) => (el as HTMLElement).api!.setState('default'));
    assert.equal(await pressed(page, 'tg-pressed'), 'true', 'authored pressed=true is restored');
    // and a toggle authored false returns to false
    await page.$eval('#tg-default', (el) => (el as HTMLElement).api!.setState('default'));
    assert.equal(await pressed(page, 'tg-default'), 'false');
  });

  await check('state API: getState reflects user clicks (no setState involved)', async () => {
    await page.click('#tg-sm');
    const state = await page.$eval('#tg-sm', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'pressed', 'click moved the named state');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#tg-default') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis._defussShadcn?.toggleApi?.setState === 'function',
      states: globalThis._defussShadcn?.toggleStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#tg-default'),
    }));
    assert.ok(reg.hasApi, '_defussShadcn.toggleApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'pressed']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ntoggle.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('toggle.e2e: all checks passed');
