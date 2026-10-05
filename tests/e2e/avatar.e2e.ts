import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped avatar component. Loads the fixture
 * (image avatar, fallback-only avatar, small-size broken image - mirroring
 * the doc page) over HTTP in a real browser, then verifies the fallback
 * reveal via CSS :has(), the real network-error path, sizes, and the
 * per-wrapper named State API - the same files consumers copy from dist/,
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
    // av-sm loads from an .invalid host - the error event must fire
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
        // the dot is anchored at the bottom-right corner, pushed out by half
        // its rim (1.5px at the default size) - never inside, never adrift
        onEdge: b.right - a.right >= 0 && b.right - a.right <= 2 && b.bottom - a.bottom >= 0 && b.bottom - a.bottom <= 2,
      };
    });
    assert.equal(badge.overflow, 'visible', 'avatars with badges must not clip');
    assert.ok(badge.w >= 20 && badge.h >= 20, `dot renders full 20px (got ${badge.w}x${badge.h})`);
    assert.ok(badge.onEdge, 'dot anchored at the bottom-right corner (half-rim outset)');
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
      hasApi: typeof globalThis.df$?.shadcn?.avatarApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.avatarStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#av-img'),
    }));
    assert.ok(reg.hasApi, 'df$.avatarApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'error']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });
  const badge = (sel: string) =>
    page.$eval(sel, (el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, image: cs.backgroundImage, shadow: cs.boxShadow, mask: cs.maskImage || (cs as any).webkitMaskImage };
    });

  await check('status badge: no variant stays the historical green = online', async () => {
    const [plain, online] = [await badge('#av-badge .avatar-badge'), await badge('#av-status-online')];
    assert.equal(plain.bg, online.bg);
    assert.equal(online.bg, 'rgb(22, 163, 74)');
  });

  await check('status badge: online / offline / busy / away are four distinct looks', async () => {
    const [on, off, busy, away] = await Promise.all(['online', 'offline', 'busy', 'away'].map((v) => badge('#av-status-' + v)));
    assert.equal(new Set([on.bg, off.bg, busy.bg, away.bg]).size, 4, 'four fill colours');
    assert.equal(busy.bg, 'rgb(220, 38, 38)', 'busy is red');
    assert.equal(away.bg, 'rgb(245, 158, 11)', 'away is amber');
  });

  await check('status badge: each non-online state carries a shape cue, not colour alone', async () => {
    const [off, busy, away] = await Promise.all(['offline', 'busy', 'away'].map((v) => badge('#av-status-' + v)));
    assert.match(off.shadow, /inset/, 'offline is a hollow ring (inset ring)');
    assert.match(busy.image, /linear-gradient/, 'busy carries a bar');
    assert.match(away.image, /linear-gradient.*linear-gradient/, 'away carries clock hands');
    assert.ok(!away.mask || away.mask === 'none', 'no mask - the silhouette stays whole');
  });

  await check('status badge: 1.25rem at the default avatar size, scaled with data-size', async () => {
    const r = await page.evaluate(() => {
      const probe = (size: string | null) => {
        const av = document.createElement('span');
        av.className = 'avatar';
        if (size) av.dataset.size = size;
        const b = document.createElement('span');
        b.className = 'avatar-badge';
        av.append(b);
        document.body.append(av);
        const w = b.getBoundingClientRect().width;
        av.remove();
        return w;
      };
      return [null, 'xs', 'sm', 'md', 'lg', 'xl'].map(probe);
    });
    assert.deepEqual(r, [20, 12, 16, 20, 24, 28]);
  });

  await check('status badge: every state paints in FRONT of the avatar', async () => {
    const hits = await page.$$eval('[id^="av-status-"]', (els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el;
    }));
    assert.deepEqual(hits, [true, true, true, true]);
  });

  await check('status badge: named for assistive tech (role=img + aria-label)', async () => {
    const r = await page.$$eval('[id^="av-status-"]', (els) => els.map((e) => [e.getAttribute('role'), e.getAttribute('aria-label')]));
    for (const [role, label] of r) {
      assert.equal(role, 'img');
      assert.ok(label && label.length > 0);
    }
  });

  await check('status badge: data-position puts it on each of the four corners', async () => {
    const r = await page.evaluate(() => Object.fromEntries(['top-start', 'top-end', 'bottom-start', 'bottom-end'].map((p) => {
      const av = document.getElementById(`av-pos-${p}`)!.getBoundingClientRect();
      const b = document.querySelector(`#av-pos-${p} .avatar-badge`)!.getBoundingClientRect();
      const top = Math.abs(b.top - av.top) < b.height / 2 + 1;
      const start = Math.abs(b.left - av.left) < b.width / 2 + 1;
      return [p, `${top ? 'top' : 'bottom'}-${start ? 'start' : 'end'}`];
    })));
    assert.deepEqual(r, { 'top-start': 'top-start', 'top-end': 'top-end', 'bottom-start': 'bottom-start', 'bottom-end': 'bottom-end' });
  });

  await check('data-shape rounded / square, data-ring, placeholder plates, group overlap', async () => {
    const r = await page.evaluate(() => {
      const cs = (id: string, sel = '') => getComputedStyle(document.querySelector(`#${id}${sel}`)!);
      return {
        rounded: cs('av-rounded').borderTopLeftRadius, square: cs('av-square').borderTopLeftRadius,
        fallbackFollows: cs('av-rounded', ' .avatar-fallback').borderTopLeftRadius === cs('av-rounded').borderTopLeftRadius,
        ring: cs('av-ring').boxShadow.includes('0px 0px 0px 4px'),
        ringsDiffer: cs('av-ring').boxShadow !== cs('av-ring-d').boxShadow,
        plates: new Set([cs('av-ph-primary', ' .avatar-fallback').backgroundColor, cs('av-ph-neutral', ' .avatar-fallback').backgroundColor, cs('av-rounded', ' .avatar-fallback').backgroundColor]).size,
        overlap: cs('av-group-lg-2').marginLeft, countOverlap: cs('av-group-lg-count').marginLeft,
      };
    });
    assert.equal(r.rounded, '10px', '--radius-lg');
    assert.equal(r.square, '6px', '--radius-sm');
    assert.equal(r.fallbackFollows, true);
    assert.equal(r.ring, true, '2px gap + 4px ring');
    assert.equal(r.ringsDiffer, true);
    assert.equal(r.plates, 3, 'primary / neutral / muted plates differ');
    assert.deepEqual([r.overlap, r.countOverlap], ['-16px', '-16px']);
  });

  // LAST (AGENTS.md "State API" → render): the contract reloads the page
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.avatar[id]', ['default','error'], { runtimeAttrs: ['style'] });
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
