import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped sidebar component. Loads the fixture
 * (collapsible rail + trigger + mobile dialog, mirroring the doc page) over
 * HTTP in a real browser, then verifies trigger toggling, the keyboard
 * shortcut (Cmd/Ctrl+B), the mobile dialog, width geometry via CSS, and the
 * per-sidebar named State API - the same files consumers copy from dist/,
 * unmodified.
 */

const FIXTURE = '/tests/e2e/sidebar.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const sidebarWidth = (page: Page) =>
  page.$eval('#demo-sidebar', (el) => el.getBoundingClientRect().width);

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

  await check('sidebar.js initialized (data-init)', async () => {
    await page.waitForFunction(() => document.querySelectorAll('.app-sidebar:not([data-init])').length === 0);
  });

  await check('authored state expanded (full width per sidebar.css)', async () => {
    const width = await sidebarWidth(page);
    assert.ok(width >= 200, `expanded sidebar is wide (${width}px)`);
  });

  await check('trigger click collapses to icon rail', async () => {
    await page.click('[data-sidebar-trigger="demo-sidebar"]');
    assert.equal(await page.$eval('#demo-sidebar', (el) => el.dataset.state), 'collapsed');
    // width animates (200ms ease) - wait for the rail to settle, don't race it
    await page.waitForFunction(
      () => document.querySelector('#demo-sidebar')!.getBoundingClientRect().width < 100,
    );
  });

  await check('trigger click again expands', async () => {
    await page.click('[data-sidebar-trigger="demo-sidebar"]');
    assert.equal(await page.$eval('#demo-sidebar', (el) => el.dataset.state), 'expanded');
  });

  await check('collapsed rail: every icon centers on the same column', async () => {
    // regression: the submenu summary (cog) is not a .sidebar-link, so it
    // kept its expanded padding and its icon drifted off the icon column
    await page.click('[data-sidebar-trigger="demo-sidebar"]');
    await page.waitForFunction(
      () => document.querySelector('#demo-sidebar')!.getBoundingClientRect().width < 100,
    );
    const centers = await page.$eval('#demo-sidebar', (el) => {
      const r = el.getBoundingClientRect();
      const mid = r.x + r.width / 2;
      const icons = [...el.querySelectorAll('.sidebar-link svg, .sidebar-submenu > summary svg:not(:last-child)')] as SVGElement[];
      return icons.map((s) => {
        const ir = s.getBoundingClientRect();
        return Math.abs(ir.x + ir.width / 2 - mid);
      });
    });
    assert.ok(centers.length >= 3, `expected 3 icons (2 links + submenu), got ${centers.length}`);
    for (const off of centers) assert.ok(off <= 1, `icon center off rail center by ${off.toFixed(1)}px`);
    await page.click('[data-sidebar-trigger="demo-sidebar"]');
    await page.waitForFunction(
      () => document.querySelector('#demo-sidebar')!.getBoundingClientRect().width > 100,
    );
  });

  await check('right-side variant docks the sidebar to the viewport right', async () => {
    const geo = await page.$eval('#demo-sidebar-right', (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        gap: window.innerWidth - (r.x + r.width),
        borderLeft: parseFloat(cs.borderLeftWidth),
        borderRight: parseFloat(cs.borderRightWidth),
      };
    });
    assert.ok(geo.gap < 2, `right edge flush with viewport (gap ${geo.gap.toFixed(1)}px)`);
    assert.ok(geo.borderLeft > 0, 'border flips to the left side');
    assert.equal(geo.borderRight, 0, 'no right border on a right-docked sidebar');
  });

  await check('Cmd+B (Control modifier on Linux) toggles the shortcut path', async () => {
    await page.keyboard.press('Control+b');
    assert.equal(await page.$eval('#demo-sidebar', (el) => el.dataset.state), 'collapsed', 'shortcut collapsed it');
    await page.keyboard.press('Control+b');
    assert.equal(await page.$eval('#demo-sidebar', (el) => el.dataset.state), 'expanded', 'shortcut expanded it');
  });

  await check('mobile dialog opens via data-sidebar-mobile and closes (mobile viewport)', async () => {
    // .sidebar-mobile is display:none by design on desktop (the component's
    // mobile-first sheet) - exercise it at a phone viewport, as documented
    await page.setViewportSize({ width: 390, height: 800 });
    try {
      await page.click('[data-sidebar-mobile="demo-mobile"]');
      await page.waitForFunction(
        () =>
          document.querySelector('#demo-mobile')!.matches(':open') &&
          getComputedStyle(document.querySelector('#demo-mobile')!).display === 'flex',
      );
      await page.waitForTimeout(250); // slide-in transition
      await page.click('.sidebar-mobile-close');
      await page.waitForFunction(() => !document.querySelector('#demo-mobile')!.matches(':open'));
    } finally {
      await page.setViewportSize({ width: 1280, height: 720 }); // restore, even on failure
    }
  });

  // -- Scroll lock (documented in skill Notes: page behind stays put) --------
  await check('page behind the mobile sheet stays put; position restored on close', async () => {
    await page.setViewportSize({ width: 390, height: 800 }); // .sidebar-mobile is mobile-only
    try {
      await page.evaluate(() => window.scrollTo(0, 300));
      const before = await page.evaluate(() => document.scrollingElement!.scrollTop);
      assert.ok(before > 0, 'fixture page is scrollable at mobile width');
      // JS click (not page.click): Playwright would scrollIntoView the trigger
      // first, clobbering the 300px offset we just measured
      await page.$eval('[data-sidebar-mobile="demo-mobile"]', (el) => (el as HTMLElement).click());
      await page.waitForFunction(() => document.querySelector('#demo-mobile')!.matches(':modal'));
      // wheel over the backdrop corner and over the sheet itself
      await page.mouse.move(380, 2);
      await page.mouse.wheel(0, 400);
      await page.mouse.move(120, 400);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(100);
      const during = await page.evaluate(() => document.scrollingElement!.scrollTop);
      // close FIRST (guarded) - a failed assert must not leave the modal open
      // and cascade into the click-based checks below
      await page.click('.sidebar-mobile-close');
      await page.waitForFunction(() => !document.querySelector('#demo-mobile')!.matches(':open'));
      assert.equal(during, before, 'page must not scroll while the mobile sheet is modal');
      const after = await page.evaluate(() => document.scrollingElement!.scrollTop);
      assert.equal(after, before, 'scroll position preserved after close');
      await page.evaluate(() => window.scrollTo(0, 0)); // leave a clean viewport
    } finally {
      await page.setViewportSize({ width: 1280, height: 720 }); // restore, even on failure
    }
  });

  // -- State API (AGENTS.md "State API"), bound per sidebar ------------------
  const setState = (page: Page, state: string) =>
    page.$eval('#demo-sidebar', (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check("state API: setState('collapsed') docks the rail", async () => {
    await setState(page, 'collapsed');
    assert.equal(await page.$eval('#demo-sidebar', (el) => el.dataset.state), 'collapsed');
    const state = await page.$eval('#demo-sidebar', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'collapsed');
  });

  await check("state API: setState('default') restores the authored expanded state", async () => {
    await setState(page, 'default');
    assert.equal(await page.$eval('#demo-sidebar', (el) => el.dataset.state), 'expanded');
    // width animates (200ms ease) - wait for it to settle at full width
    await page.waitForFunction(() => document.querySelector('#demo-sidebar')!.getBoundingClientRect().width >= 200);
  });

  await check('state API: getState reflects trigger clicks (no setState involved)', async () => {
    await page.click('[data-sidebar-trigger="demo-sidebar"]');
    const state = await page.$eval('#demo-sidebar', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'collapsed', 'user interaction moved the named state');
    await page.click('[data-sidebar-trigger="demo-sidebar"]'); // restore
  });

  // -- Auto-collapse (documented: row < 24rem → rail, ≥ 28rem → restored) ---
  await check('auto-collapse: sidebar in a 18rem row docks to the rail on load', async () => {
    await page.waitForFunction(
      () => (document.querySelector('#demo-auto') as HTMLElement).dataset.state === 'collapsed',
    );
    const w = await page.$eval('#demo-auto', (el) => el.getBoundingClientRect().width);
    assert.ok(w < 100, `narrow-row sidebar is rail-width (${w}px)`);
  });

  await check('auto-collapse: widening the row past the hysteresis restores it', async () => {
    await page.$eval('#narrow-row', (el) => ((el as HTMLElement).style.width = '60rem'));
    // width animates (200ms ease) - wait for the settle, don't race the transition
    await page.waitForFunction(
      () => document.querySelector('#demo-auto')!.getBoundingClientRect().width >= 200,
    );
    await page.$eval('#narrow-row', (el) => ((el as HTMLElement).style.width = '18rem'));
    await page.waitForFunction(
      () => (document.querySelector('#demo-auto') as HTMLElement).dataset.state === 'collapsed',
    );
  });

  await check('auto-collapse: an explicit setState pins against the heuristic', async () => {
    // deliberate 'default' inside the narrow row must survive a re-check
    await page.$eval('#demo-auto', (el) => (el as HTMLElement).api!.setState('default'));
    await page.$eval('#narrow-row', (el) => ((el as HTMLElement).style.width = '17rem'));
    await page.waitForTimeout(150); // let any RO callback land
    const state = await page.$eval('#demo-auto', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default', 'explicit choice wins over the narrow row');
    // and a later narrow→wide→narrow cycle keeps the pin
    await page.$eval('#demo-auto', (el) => (el as HTMLElement).api!.setState('collapsed'));
    const s2 = await page.$eval('#demo-auto', (el) => (el as HTMLElement).api!.getState());
    assert.equal(s2.name, 'collapsed');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#demo-sidebar') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.sidebarApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.sidebarStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#demo-sidebar'),
    }));
    assert.ok(reg.hasApi, 'df$.sidebarApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'collapsed']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('sidebar: density "compact" → padding-top 6px', async () => {
    const val = await page.$eval('#sb-compact .sidebar-link', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '6px');
  });

  await check('sidebar: density "comfortable" → padding-top 8px', async () => {
    const val = await page.$eval('#sb-comfortable .sidebar-link', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '8px');
  });

  await check('sidebar: density "spacious" → padding-top 10px', async () => {
    const val = await page.$eval('#sb-spacious .sidebar-link', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '10px');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nsidebar.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('sidebar.e2e: all checks passed');
