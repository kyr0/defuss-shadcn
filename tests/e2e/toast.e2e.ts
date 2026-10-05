import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped toast component. Loads the fixture
 * (existing #toast-container + variant buttons, mirroring the doc page) over
 * HTTP in a real browser, then verifies the programmatic df$.shadcn.toast API
 * (show/variants/roles), the delegated close button, the MAX_VISIBLE trim,
 * and the region's named State API (setState('default') clears; getState()
 * reports the live count) - the same files consumers copy from dist/,
 * unmodified.
 */

const FIXTURE = '/tests/e2e/toast.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const toastCount = (page: Page) => page.$$eval('#toast-container .toast', (els) => els.length);
const MAX_VISIBLE = 3; // component contract

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

  await check('toast.js reused the existing container + delegated wiring (data-init)', async () => {
    // the init marker is the empty-string convention, so test the ATTRIBUTE
    await page.waitForFunction(() => {
      const c = document.getElementById('toast-container');
      return !!c?.hasAttribute('data-init') && !!(c as HTMLElement).api;
    });
  });

  await check('toast.css applied (fixed region positioned)', async () => {
    const style = await page.$eval('#toast-container', (el) => {
      const cs = getComputedStyle(el);
      return { position: cs.position, z: cs.zIndex };
    });
    assert.equal(style.position, 'fixed', 'overlay region');
    assert.ok(Number(style.z) >= 50, 'above page content');
  });

  await check('toast pins to its container corner (top layer bypasses the flex region)', async () => {
    // toasts render in the top layer (popover="manual"), so the container's
    // flex layout can't reach them - without explicit corner pinning the UA
    // centers every toast in the viewport
    await page.evaluate(() => globalThis.df$.shadcn.toast!.show({ title: 'corner', duration: Infinity }));
    await page.waitForFunction(() => !!document.querySelector('#toast-container .toast'));
    // let the 200ms entrance transform settle (measures pin, not translateY)
    await page.waitForTimeout(300);
    const pos = await page.$eval('#toast-container .toast', (el) => {
      const r = el.getBoundingClientRect();
      return {
        bottomGap: window.innerHeight - r.bottom,
        rightGap: window.innerWidth - r.right,
        stack: (el as HTMLElement).style.getPropertyValue('--toast-stack'),
      };
    });
    assert.ok(pos.bottomGap >= 16 && pos.bottomGap < 30, `pinned near bottom (gap ${pos.bottomGap})`);
    assert.ok(pos.rightGap >= 16 && pos.rightGap < 30, `pinned near right (gap ${pos.rightGap})`);
    assert.equal(pos.stack, '0px', 'first toast sits at the edge');
    await page.$eval('#toast-container', (el) => (el as HTMLElement).api!.setState('default'));
    await page.waitForFunction(() => document.querySelectorAll('#toast-container .toast').length === 0);
  });

  await check('variant icon renders at 16px (not the SVG intrinsic default)', async () => {
    // regression: generated icon SVGs have no width/height - without the CSS
    // size they render ~300px and blow up the whole toast
    await page.click('#t-success');
    await page.waitForFunction(() => !!document.querySelector('#toast-container .toast .toast-icon'));
    const size = await page.$eval('#toast-container .toast-icon', (el) => {
      const r = el.getBoundingClientRect();
      return `${Math.round(r.width)}x${Math.round(r.height)}`;
    });
    assert.equal(size, '16x16', `icon box ${size}`);
    await page.$eval('#toast-container', (el) => (el as HTMLElement).api!.setState('default'));
    await page.waitForFunction(() => document.querySelectorAll('#toast-container .toast').length === 0);
  });

  await check('toast.show() renders a toast with title + description (role=status)', async () => {
    await page.click('#t-show');
    await page.waitForFunction(() => document.querySelectorAll('#toast-container .toast').length === 1);
    const info = await page.$eval('#toast-container .toast', (el) => ({
      title: el.querySelector('.toast-title')?.textContent,
      desc: el.querySelector('.toast-description')?.textContent,
      role: el.getAttribute('role'),
      open: el.matches(':popover-open'),
    }));
    assert.equal(info.title, 'Event created');
    assert.equal(info.desc, 'Monday, January 3rd at 6:00pm');
    assert.equal(info.role, 'status', 'non-destructive toasts are polite');
    assert.equal(info.open, true, 'shown via the Popover API');
  });

  await check('every CSS variant renders with icon + correct role', async () => {
    // one variant at a time (the region is cleared between them) so the
    // MAX_VISIBLE trim can't dismiss what we're about to assert
    const expectations: Record<string, string> = {
      success: 'status',
      warning: 'status',
      info: 'status',
      destructive: 'alert',
    };
    for (const [variant, role] of Object.entries(expectations)) {
      await page.$eval('#toast-container', (el) => (el as HTMLElement).api!.setState('default'));
      await page.waitForFunction(() => document.querySelectorAll('#toast-container .toast').length === 0);
      await page.click(`#t-${variant}`);
      await page.waitForFunction(() => !!document.querySelector('#toast-container .toast'));
      const info = await page.$eval('#toast-container .toast', (el) => ({
        v: el.getAttribute('data-variant'),
        r: el.getAttribute('role'),
        icon: !!el.querySelector('.toast-icon'),
      }));
      assert.equal(info.v, variant);
      assert.equal(info.r, role, `${variant} role`);
      assert.ok(info.icon, `${variant} renders its icon`);
    }
    await page.$eval('#toast-container', (el) => (el as HTMLElement).api!.setState('default'));
    await page.waitForFunction(() => document.querySelectorAll('#toast-container .toast').length === 0);
  });

  await check(`more than ${MAX_VISIBLE} toasts trims the oldest`, async () => {
    await page.evaluate(() => globalThis.df$.shadcn.toast!.show('fourth'));
    await page.waitForFunction(
      (max) => document.querySelectorAll('#toast-container .toast').length <= max,
      MAX_VISIBLE,
    );
    assert.ok((await toastCount(page)) <= MAX_VISIBLE);
  });

  await check('close button dismisses a toast (delegated listener)', async () => {
    // deterministic stage: clear the region, then one non-expiring toast
    await page.$eval('#toast-container', (el) => (el as HTMLElement).api!.setState('default'));
    await page.waitForFunction(() => document.querySelectorAll('#toast-container .toast').length === 0);
    await page.evaluate(() => globalThis.df$.shadcn.toast!.show({ title: 'closeme', duration: Infinity }));
    await page.waitForFunction(() => !!document.querySelector('#toast-container .toast .toast-close'));
    await page.click('#toast-container .toast .toast-close');
    await page.waitForFunction(() => document.querySelectorAll('#toast-container .toast').length === 0);
  });

  await check('action button runs onClick and dismisses', async () => {
    await page.evaluate(() => {
      (window as any).__clicked = false;
      globalThis.df$.shadcn.toast!.show({
        title: 'Archive',
        action: { label: 'Undo', onClick: () => ((window as any).__clicked = true) },
        duration: Infinity, // keep it until we act
      });
    });
    await page.waitForFunction(() => !!document.querySelector('[data-toast-action]'));
    await page.click('[data-toast-action]');
    assert.equal(await page.evaluate(() => (window as any).__clicked), true);
    await page.waitForFunction(() => !document.querySelector('#toast-container .toast'));
  });

  // -- State API (AGENTS.md "State API") --------------------------------------
  await check("state API: setState('default') dismisses every visible toast", async () => {
    await page.evaluate(() => {
      globalThis.df$.shadcn.toast!.show({ title: 'a', duration: Infinity });
      globalThis.df$.shadcn.toast!.show({ title: 'b', duration: Infinity });
    });
    await page.waitForFunction(() => document.querySelectorAll('#toast-container .toast').length === 2);
    const mid = await page.$eval('#toast-container', (el) => (el as HTMLElement).api!.getState());
    assert.equal(mid.config.count, 2, 'live count while visible');
    await page.$eval('#toast-container', (el) => (el as HTMLElement).api!.setState('default'));
    await page.waitForFunction(() => document.querySelectorAll('#toast-container .toast').length === 0);
  });

  await check('state API: getState name stays default and count is live', async () => {
    await page.evaluate(() => globalThis.df$.shadcn.toast!.show({ title: 'counted', duration: Infinity }));
    await page.waitForFunction(() => document.querySelectorAll('#toast-container .toast').length === 1);
    const state = await page.$eval('#toast-container', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
    assert.equal(state.config.count, 1);
    await page.$eval('#toast-container', (el) => (el as HTMLElement).api!.setState('default'));
    await page.waitForFunction(() => document.querySelectorAll('#toast-container .toast').length === 0);
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.getElementById('toast-container') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  // -- Size + density: show() forwards them as data-* on the toast element ---
  await check('size/density options land as data attributes with the documented geometry', async () => {
    await page.click('#t-size-sm');
    await page.click('#t-size-lg');
    await page.click('#t-density-compact');
    const seen = await page.evaluate(() => {
      const toasts = [...document.querySelectorAll<HTMLElement>('.toast')];
      const pick = (attr: string) => toasts.find((t) => t.getAttribute(attr))?.getAttribute(attr);
      const sm = toasts.find((t) => t.dataset.size === 'sm')!;
      const lg = toasts.find((t) => t.dataset.size === 'lg')!;
      const compact = toasts.find((t) => t.dataset.density === 'compact')!;
      return {
        smSize: pick('data-size'),
        compactDensity: pick('data-density'),
        smMinW: getComputedStyle(sm).minWidth,
        lgMinW: getComputedStyle(lg).minWidth,
        compactPad: getComputedStyle(compact).padding,
      };
    });
    assert.equal(seen.smSize, 'sm');
    assert.equal(seen.compactDensity, 'compact');
    assert.equal(seen.smMinW, '256px', 'size sm → 16rem min-width');
    assert.equal(seen.lgMinW, '384px', 'size lg → 24rem min-width');
    assert.equal(seen.compactPad, '12px', 'density compact → 0.75rem padding');
    await page.evaluate(() => {
      const container = document.querySelector<HTMLElement>('#toast-container')!;
      // loose registry contract (see src/types/defuss-shadcn.d.ts): cast the call
      (globalThis.df$.shadcn.toastApi as unknown as { setState(el: Element, name: string): void }).setState(container, 'default');
    });
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.toastApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.toastStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#toast-container'),
    }));
    assert.ok(reg.hasApi, 'df$.shadcn.toastApi.setState missing');
    assert.deepEqual(reg.states, ['default']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });
  await check('pile: configure({ stack: "pile" }) - the newest in front with stack-top sheets and a +n badge, older ones hidden behind', async () => {
    await page.evaluate(() => { const t = (globalThis as any).df$.shadcn.toast; t.dismiss(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const t = (globalThis as any).df$.shadcn.toast;
      t.configure({ stack: 'pile', position: 'bottom-right' });
      ['A', 'B', 'C'].forEach((title) => t.show({ title, duration: 20000 }));
    });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((e) => ({ title: e.querySelector('.toast-title')!.textContent, piled: e.hasAttribute('data-piled'), stack: e.classList.contains('stack-top'), more: e.getAttribute('data-more'), op: getComputedStyle(e).opacity, stack0: (e as HTMLElement).style.getPropertyValue('--toast-stack') })));
    assert.deepEqual(r.map((x) => [x.title, x.piled, x.stack, x.more]), [['A', true, false, null], ['B', true, false, null], ['C', false, true, '2']]);
    assert.deepEqual(r.map((x) => x.op), ['0', '0', '1']);
    assert.equal(new Set(r.map((x) => x.stack0)).size, 1, 'all at the corner (stack offset 0)');
    const shadow = await page.$eval('.toast.stack-top', (e) => getComputedStyle(e).boxShadow);
    assert.ok((shadow.match(/rgb|oklch|color\(/g) || []).length >= 6, 'six sheet shadows (shapes.css stack-top)');
    assert.equal(await page.$eval('.toast.stack-top', (e) => getComputedStyle(e, '::after').content), '"+2"', 'the +n badge');
  });

  await check('pile: hover fans it out into a list (newest nearest the corner); leaving folds it back', async () => {
    const box = (await page.locator('.toast.stack-top').boundingBox())!;
    await page.mouse.move(box.x + 40, box.y + 15);
    await page.waitForTimeout(400);
    const open = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((e) => ({ piled: e.hasAttribute('data-piled'), bottom: Math.round(e.getBoundingClientRect().bottom) })));
    assert.ok(open.every((x) => !x.piled), 'none piled');
    assert.ok(open[2].bottom > open[1].bottom && open[1].bottom > open[0].bottom, 'newest (C) lowest, then B, then A');
    await page.mouse.move(5, 5);
    await page.waitForTimeout(700);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.toast')].map((e) => e.hasAttribute('data-piled'))), [true, true, false]);
    await page.evaluate(() => { const t = (globalThis as any).df$.shadcn.toast; t.dismiss(); t.configure({ stack: 'list' }); });
    await page.waitForTimeout(400);
  });

  await check('animation: a named df$.anim entrance plays (CSS fade stands down), the exit runs on dismiss before removal', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.toast.show({ title: 'Anim', duration: 20000, animation: { in: 'slideIn', out: 'slideOut', direction: 'east', duration: 300 } }));
    await page.waitForTimeout(60);
    const mid = await page.$eval('.toast[data-anim]', (e) => ({ anims: e.getAnimations().length, transition: getComputedStyle(e).transitionProperty }));
    assert.ok(mid.anims >= 1, 'a WAAPI animation runs');
    assert.ok(!mid.transition.includes('transform'), 'the CSS transform fade stands down');
    await page.click('.toast[data-anim] .toast-close');
    await page.waitForTimeout(80);
    assert.equal(await page.$$eval('.toast[data-anim][data-leaving]', (l) => l.length), 1, 'leaving, still in the DOM');
    await page.waitForTimeout(500);
    assert.equal(await page.$$eval('.toast[data-anim]', (l) => l.length), 0, 'removed after the exit');
  });

  await check('aura: the toast is the ring of light, the content sits on .toast-surface', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.toast.show({ title: 'Live', duration: 20000, aura: 'rainbow' }));
    await page.waitForTimeout(300);
    const r = await page.$eval('.toast[data-aura]', (e) => ({ cls: e.className, pad: getComputedStyle(e).paddingTop, bg: getComputedStyle(e).backgroundImage.includes('conic-gradient'), surface: !!e.querySelector(':scope > .toast-surface > .toast-content'), surfaceBg: getComputedStyle(e.querySelector('.toast-surface')!).backgroundColor }));
    assert.ok(r.cls.includes('aura') && r.cls.includes('aura-rainbow'), r.cls);
    assert.equal(r.pad, '3px');
    assert.ok(r.bg, 'conic light');
    assert.ok(r.surface && r.surfaceBg !== 'rgba(0, 0, 0, 0)');
    await page.evaluate(() => (globalThis as any).df$.shadcn.toast.dismiss());
    await page.waitForTimeout(400);
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '#toast-container', ['default'], { runtimeOwned: '.toast, .toast *' });
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ntoast.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('toast.e2e: all checks passed');
