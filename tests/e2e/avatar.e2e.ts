import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped avatar component. Loads the fixture
 * (image avatar, fallback-only avatar, small-size broken image — mirroring
 * the doc page) over HTTP in a real browser, then verifies the fallback
 * reveal via CSS :has(), the real network-error path, sizes, and the
 * per-wrapper named State API — the same files consumers copy from dist/,
 * unmodified.
 */

const FIXTURE = '/tests/e2e/avatar.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const fallbackVisible = (page: Page, id: string) =>
  page.$$eval(`#${id} .avatar-fallback`, (els) =>
    els.some((el) => getComputedStyle(el).display !== 'none'),
  );

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
  // deterministic network failure: abort .invalid-host requests instead of
  // waiting on real DNS (slow/flaky when 26 chromiums run in parallel)
  await page.route((url) => url.hostname.endsWith('.invalid'), (route) => route.abort('failed'));
  await page.goto(`${server.url}${FIXTURE}`);

  await check('avatar.js initialized wrappers (data-init)', async () => {
    await page.waitForFunction(() => document.querySelectorAll('.avatar:not([data-init])').length === 0);
  });

  await check('avatar.css applied (circle + size)', async () => {
    const style = await page.$eval('#av-img', (el) => {
      const cs = getComputedStyle(el);
      return { radius: cs.borderTopLeftRadius, size: cs.width };
    });
    assert.match(style.radius, /%|rem|px/, 'rounded shape');
    assert.notEqual(style.size, 'auto', 'fixed size');
  });

  await check('fallback-only avatar shows its fallback (no image)', async () => {
    assert.equal(await fallbackVisible(page, 'av-fallback-only'), true);
  });

  await check('real network error hides the image and reveals the fallback', async () => {
    // av-sm loads from an .invalid host — the error event must fire
    await page.waitForFunction(
      () => document.querySelector('#av-sm .avatar-image')!.hasAttribute('data-error'),
    );
    assert.equal(await fallbackVisible(page, 'av-sm'), true, 'fallback revealed');
    const state = await page.$eval('#av-sm', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'error', 'the network failure moved the named state');
  });

  await check('badge dot is not clipped by the avatar circle', async () => {
    const badge = await page.$eval('#av-badge', (el) => {
      const b = el.querySelector('.avatar-badge')!.getBoundingClientRect();
      const a = el.getBoundingClientRect();
      return {
        overflow: getComputedStyle(el).overflow,
        // the dot's right edge extends past the square's edge (it's round-clipped
        // area is inside); what must hold is the dot renders at full size —
        // clipping would show it as a ≤2px sliver or 0-size
        w: b.width,
        h: b.height,
        // dot center lies exactly on the circle's bottom-right edge
        onEdge: Math.abs(b.right - a.right) < 1 && Math.abs(b.bottom - a.bottom) < 1,
      };
    });
    assert.equal(badge.overflow, 'visible', 'avatars with badges must not clip');
    assert.ok(badge.w >= 10 && badge.h >= 10, `dot renders full 10px (got ${badge.w}x${badge.h})`);
    assert.ok(badge.onEdge, 'dot anchored at the circle edge');
  });

  await check('full size scale squares xs/sm/md/lg/xl = 24/32/40/48/64', async () => {
    const widths = await page.evaluate(() =>
      ['xs', 'sm', 'md', 'lg', 'xl'].map(
        (s) => document.querySelector(`#av-${s}`)!.getBoundingClientRect().width,
      ),
    );
    assert.deepEqual(widths, [24, 32, 40, 48, 64]);
    const xl = await page.$eval('#av-xl', (el) => el.getBoundingClientRect());
    assert.equal(xl.width, xl.height, 'xl avatar stays square');
  });

  // -- State API (AGENTS.md "State API"), bound per wrapper ------------------
  await check("state API: setState('error') forces the fallback look", async () => {
    await page.$eval('#av-img', (el) => (el as HTMLElement).api!.setState('error'));
    const imgState = await page.$eval('#av-img .avatar-image', (el) => ({
      hasError: el.hasAttribute('data-error'),
      display: getComputedStyle(el).display,
    }));
    assert.equal(imgState.hasError, true);
    assert.equal(imgState.display, 'none', 'image hidden exactly like a real error');
    assert.equal(await fallbackVisible(page, 'av-img'), true);
    const state = await page.$eval('#av-img', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'error');
  });

  await check("state API: setState('default') restores the image view", async () => {
    await page.$eval('#av-img', (el) => (el as HTMLElement).api!.setState('default'));
    assert.equal(await page.$eval('#av-img .avatar-image', (el) => el.hasAttribute('data-error')), false);
    assert.equal(await fallbackVisible(page, 'av-img'), false, 'fallback hidden while image loads');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#av-img') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis._defussShadcn?.avatarApi?.setState === 'function',
      states: globalThis._defussShadcn?.avatarStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#av-img'),
    }));
    assert.ok(reg.hasApi, '_defussShadcn.avatarApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'error']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\navatar.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('avatar.e2e: all checks passed');
