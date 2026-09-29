import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped dropdown component. Loads the fixture
 * (options menu + checkbox/radio menu, mirroring both doc demos) over HTTP in
 * a real browser, then verifies trigger toggle, aria-expanded sync, keyboard
 * navigation with roving highlight, checkbox/radio activation, disabled-item
 * skipping, the destructive variant, and the named State API - the same files
 * consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/dropdown.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const isOpen = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => el.matches(':popover-open'));

/** ids of the highlighted (data-highlighted) items inside a menu */
const highlighted = (page: Page, id: string) =>
  page.$$eval(`#${id} [data-highlighted]`, (els) => els.map((el) => el.textContent!.trim()));

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

  await check('dropdown.js initialized triggers + menus (data-init)', async () => {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-dropdown-trigger]:not([data-init])').length === 0 &&
        document.querySelectorAll('.dropdown-content[popover]:not([data-init])').length === 0,
    );
  });

  await check('check/radio indicators use a mask (visible in dark mode)', async () => {
    // regression: data: URI SVGs resolve currentColor to BLACK when used as
    // background-image - the checks vanished on dark surfaces. A mask paints
    // them with background-color: currentColor instead.
    const geom = await page.evaluate(() => {
      const chk = document.querySelector('.dropdown-check[aria-checked="true"]')!;
      const rad = document.querySelector('.dropdown-radio[aria-checked="true"]')!;
      const pick = (el: Element) => {
        const b = getComputedStyle(el, '::before');
        return { mask: b.maskImage || b.webkitMaskImage || 'none', svgBg: /svg/.test(b.backgroundImage), color: b.backgroundColor };
      };
      return { chk: pick(chk), rad: pick(rad) };
    });
    for (const [name, g] of Object.entries(geom)) {
      assert.match(g.mask, /url\(/, `${name}: check glyph applied as mask-image`);
      assert.ok(!g.svgBg, `${name}: no black data-URI SVG background`);
      assert.notEqual(g.color, 'rgba(0, 0, 0, 0)', `${name}: background-color paints the mask`);
    }
  });

  await check('dropdown.css applied (menu surface)', async () => {
    const style = await page.$eval('#demo-dropdown', (el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, border: cs.borderTopWidth, padding: cs.paddingBlockStart };
    });
    assert.notEqual(style.bg, 'rgba(0, 0, 0, 0)', 'menu surface must be opaque');
    assert.notEqual(style.border, '0px', 'menu has a border');
    assert.notEqual(style.padding, '0px', 'menu has padding');
  });

  await check('trigger click toggles the menu + aria-expanded', async () => {
    await page.click('[data-dropdown-trigger="demo-dropdown"]');
    // aria-expanded is set by the async `toggle` event - poll it, don't race it
    await page.waitForFunction(
      () =>
        document.querySelector('#demo-dropdown')!.matches(':popover-open') &&
        document.querySelector('[data-dropdown-trigger="demo-dropdown"]')!.getAttribute('aria-expanded') === 'true',
    );
    // opening focuses + highlights the first enabled item
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-dropdown [data-highlighted]').length > 0,
    );
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Profile ⇧⌘P']);
    await page.click('[data-dropdown-trigger="demo-dropdown"]');
    await page.waitForFunction(
      () =>
        !document.querySelector('#demo-dropdown')!.matches(':popover-open') &&
        document.querySelector('[data-dropdown-trigger="demo-dropdown"]')!.getAttribute('aria-expanded') === 'false',
    );
  });

  await check('ArrowDown/ArrowUp roam enabled items (skips disabled)', async () => {
    await page.click('[data-dropdown-trigger="demo-dropdown"]');
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-dropdown [data-highlighted]').length > 0,
    );
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Profile ⇧⌘P']);
    await page.keyboard.press('ArrowDown'); // Profile -> Settings
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Settings']);
    await page.keyboard.press('ArrowDown'); // Settings -> (Upload disabled) -> Export
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Export']);
    await page.keyboard.press('ArrowUp');
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Settings']);
    await page.keyboard.press('Home');
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Profile ⇧⌘P']);
    await page.keyboard.press('End');
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Delete']);
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(page, 'demo-dropdown'), false, 'Escape closes');
  });

  await check('typeahead jumps to matching item', async () => {
    await page.click('[data-dropdown-trigger="demo-dropdown"]');
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-dropdown [data-highlighted]').length > 0,
    );
    await page.keyboard.press('e');
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Export']);
    await page.keyboard.press('Escape');
  });

  await check('destructive item highlights red (data-variant)', async () => {
    await page.click('[data-dropdown-trigger="demo-dropdown"]');
    // wait until the menu is actually open (entry animation + toggle event)
    await page.waitForFunction(() => document.querySelector('#demo-dropdown')!.matches(':popover-open'));
    await page.hover('#demo-dropdown [data-variant="destructive"]');
    const style = await page.$eval('#demo-dropdown [data-variant="destructive"]', (el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });
    assert.notEqual(style.bg, 'rgba(0, 0, 0, 0)', 'destructive highlight fills the destructive color');
    assert.notEqual(style.color, 'rgba(0, 0, 0, 0)', 'destructive foreground text');
    await page.keyboard.press('Escape');
  });

  await check('menuitemcheckbox toggles aria-checked on Enter', async () => {
    await page.click('[data-dropdown-trigger="demo-checks"]');
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-checks [data-highlighted]').length > 0,
    );
    const before = await page.$eval('#demo-checks [role="menuitemcheckbox"]', (el) =>
      el.getAttribute('aria-checked'),
    );
    await page.keyboard.press('Enter');
    const after = await page.$eval('#demo-checks [role="menuitemcheckbox"]', (el) =>
      el.getAttribute('aria-checked'),
    );
    assert.equal(after, before === 'true' ? 'false' : 'true', 'checkbox flips');
    assert.equal(await isOpen(page, 'demo-checks'), true, 'checkbox keeps the menu open');
    await page.keyboard.press('Escape');
  });

  await check('menuitemradio selection is exclusive within its group', async () => {
    await page.click('[data-dropdown-trigger="demo-checks"]');
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-checks [data-highlighted]').length > 0,
    );
    // open highlights the first checkbox (Status Bar); two steps reach the radios
    await page.keyboard.press('ArrowDown'); // -> Activity Bar checkbox
    await page.keyboard.press('ArrowDown'); // -> Default radio
    await page.keyboard.press('Enter');
    const checks = await page.$$eval('#demo-checks [role="menuitemradio"]', (els) =>
      els.map((el) => el.getAttribute('aria-checked')),
    );
    assert.deepEqual(checks, ['true', 'false'], 'only the activated radio stays checked');
    await page.keyboard.press('Escape');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  const setState = (page: Page, id: string, state: string) =>
    page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check("state API: setState('open') opens menu and highlights first item", async () => {
    await setState(page, 'demo-dropdown', 'open');
    // the toggle handler is async (toggle event) - poll for its highlight
    await page.waitForFunction(
      () => document.querySelectorAll('#demo-dropdown [data-highlighted]').length > 0,
    );
    assert.deepEqual(await highlighted(page, 'demo-dropdown'), ['Profile ⇧⌘P']);
    const state = await page.$eval('#demo-dropdown', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open');
  });

  await check("state API: setState('default') closes the menu", async () => {
    await setState(page, 'demo-dropdown', 'default');
    assert.equal(await isOpen(page, 'demo-dropdown'), false, 'default state = closed');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#demo-dropdown') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.dropdownApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.dropdownStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#demo-dropdown'),
    }));
    assert.ok(reg.hasApi, 'df$.dropdownApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'open']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('dropdown: data-size="xs" → font-size 12px', async () => {
    const val = await page.$eval('#z-dropdown-xs-pop .dropdown-item', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '12px');
  });
  await check('dropdown: data-size="sm" → font-size 13px', async () => {
    const val = await page.$eval('#z-dropdown-sm-pop .dropdown-item', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '13px');
  });
  await check('dropdown: data-size="md" → font-size 14px', async () => {
    const val = await page.$eval('#z-dropdown-md-pop .dropdown-item', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '14px');
  });
  await check('dropdown: data-size="lg" → font-size 16px', async () => {
    const val = await page.$eval('#z-dropdown-lg-pop .dropdown-item', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '16px');
  });
  await check('dropdown: data-size="xl" → font-size 18px', async () => {
    const val = await page.$eval('#z-dropdown-xl-pop .dropdown-item', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '18px');
  });

  await check('split button: the chevron opens its menu, end-aligned under it (data-align="end")', async () => {
    await page.click('#split-trigger');
    assert.equal(await isOpen(page, 'split-menu'), true);
    // aria-expanded follows the popover's (async) toggle event
    await page.waitForFunction(() => document.getElementById('split-trigger')!.getAttribute('aria-expanded') === 'true', null, { timeout: 2000 });
    await page.waitForTimeout(250); // the open transition scales from 0.96 - measure the settled box
    const r = await page.evaluate(() => {
      const t = document.getElementById('split-trigger')!.getBoundingClientRect();
      const m = document.getElementById('split-menu')!.getBoundingClientRect();
      return { endGap: Math.round(t.right - m.right), below: m.top >= t.bottom, widerThanTrigger: m.width > t.width };
    });
    assert.deepEqual(r, { endGap: 0, below: true, widerThanTrigger: true });
  });

  await check('split button: Escape closes the menu and returns focus to the chevron', async () => {
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(page, 'split-menu'), false);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'split-trigger');
  });

  const settledRects = async (trigger: string, menu: string) => {
    await page.click('#' + trigger);
    await page.waitForFunction((id) => document.getElementById(id)!.matches(':popover-open'), menu, { timeout: 2000 });
    await page.waitForTimeout(250); // open transition (scale 0.96 -> 1)
    const r = await page.evaluate(([t, m]) => {
      const a = document.getElementById(t)!.getBoundingClientRect();
      const b = document.getElementById(m)!.getBoundingClientRect();
      return { startGap: Math.round(b.left - a.left), endGap: Math.round(a.right - b.right), inView: b.left >= 0 && b.right <= innerWidth, below: b.top >= a.bottom };
    }, [trigger, menu]);
    await page.keyboard.press('Escape');
    return r;
  };

  await check('data-align="end" without room on the left: the menu flips to start-aligned under the trigger', async () => {
    const r = await settledRects('edge-left-trigger', 'edge-left-menu');
    assert.deepEqual([r.startGap, r.inView, r.below], [0, true, true]);
  });

  await check('start-aligned without room on the right: the menu flips to end-aligned under the trigger', async () => {
    const r = await settledRects('edge-right-trigger', 'edge-right-menu');
    assert.deepEqual([r.endGap, r.inView, r.below], [0, true, true]);
  });


  const openIds = () => page.evaluate(() => [...document.querySelectorAll('.dropdown-content')].filter((m) => m.matches(':popover-open')).map((m) => m.id));
  const focusedId = () => page.evaluate(() => document.activeElement?.id);
  const closeAll = async () => { await page.evaluate(() => document.querySelectorAll('.dropdown-content:popover-open').forEach((m) => { try { (m as HTMLElement).hidePopover(); } catch { /* nested: closed with its parent */ } })); await page.waitForTimeout(200); };

  await check('submenus: hover opens nested menus three levels deep, each beside its trigger; the tree stays open', async () => {
    await page.click('#sub-trigger');
    await page.hover('#s1-t'); await page.waitForTimeout(300);
    await page.hover('#s2-t'); await page.waitForTimeout(300);
    await page.hover('#s3-t'); await page.waitForTimeout(300);
    assert.deepEqual(await openIds(), ['sub-menu', 's1', 's2', 's3']);
    const r = await page.evaluate(() => ['s1-t', 's1', 's2-t', 's2', 's3-t', 's3'].map((id) => document.getElementById(id)!.getBoundingClientRect()));
    for (let k = 0; k < 6; k += 2) {
      assert.ok(Math.abs(r[k + 1].left - r[k].right) < 14, 'opens at the trigger\'s end edge');
      assert.ok(Math.abs(r[k + 1].top - r[k].top) < 8, 'top aligned with the trigger');
    }
    assert.equal(await page.$eval('#s2-t', (e) => e.getAttribute('aria-expanded')), 'true');
  });

  await check('submenus: hovering a sibling item closes the open submenu (hover intent); the chevron trigger is marked', async () => {
    await page.hover('#s2-a'); await page.waitForTimeout(350);
    assert.deepEqual(await openIds(), ['sub-menu', 's1', 's2']);
    assert.equal(await page.$eval('#s1-t', (e) => getComputedStyle(e, '::after').content), '""');
  });

  await check('menus never resize or scroll: the parent keeps its box while a submenu opens and closes (overlay transition), no item overflows it', async () => {
    const dims = () => page.evaluate(() => { const m = document.getElementById('sub-menu')!; const r = m.getBoundingClientRect(); return [m.scrollWidth - m.clientWidth, m.scrollHeight - m.clientHeight, Math.round(r.width), Math.round(r.height)]; });
    await closeAll();
    await page.click('#sub-trigger'); await page.waitForTimeout(200);
    const base = await dims();
    assert.deepEqual(base.slice(0, 2), [0, 0], 'no overflow at rest (a link item included)');
    await page.hover('#s1-t'); await page.waitForTimeout(300);
    await page.hover('#s-new');
    for (let i = 0; i < 10; i++) { assert.deepEqual(await dims(), base, `frame ${i} of the submenu's exit`); await page.waitForTimeout(30); }
    // leave the tree as the next check expects it: root, s1, s2 open
    await page.hover('#s1-t'); await page.waitForTimeout(300);
    await page.hover('#s2-t'); await page.waitForTimeout(300);
  });

  await check('submenus: ← / Esc close one level and focus its trigger; a plain item click closes the whole tree + fires dropdown:select', async () => {
    await page.hover('#s3-t'); await page.waitForTimeout(300);
    await page.focus('#s3-a');
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), ['sub-menu', 's1', 's2']);
    assert.equal(await focusedId(), 's3-t');
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), ['sub-menu', 's1']);
    assert.equal(await focusedId(), 's2-t');
    await page.hover('#s2-t'); await page.waitForTimeout(300);
    await page.hover('#s3-t'); await page.waitForTimeout(300);
    const value = await page.evaluate(() => new Promise((res) => { document.addEventListener('dropdown:select', (e) => res((e as CustomEvent).detail.value), { once: true }); (document.getElementById('s3-a') as HTMLElement).click(); }));
    assert.equal(value, 'old');
    await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), []);
  });

  await check('submenus by keyboard: → / Enter open and focus the first item, sibling submenus close each other', async () => {
    await page.click('#sub-trigger'); await page.waitForTimeout(150);
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusedId(), 's1-t');
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
    assert.equal(await focusedId(), 's1-a');
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    assert.deepEqual(await openIds(), ['sub-menu', 'sx']);
    await closeAll();
  });

  await check('disabled: a disabled sub-trigger never opens and is skipped; aria-disabled items are skipped and ignore clicks', async () => {
    await page.click('#sub-trigger'); await page.waitForTimeout(150);
    await page.hover('#sd-t', { force: true }); await page.waitForTimeout(300);
    assert.ok(!(await openIds()).includes('sd'));
    const order: string[] = [];
    for (let k = 0; k < 5; k++) { await page.keyboard.press('ArrowDown'); order.push(String(await focusedId())); }
    assert.ok(!order.includes('sd-t') && !order.includes('s-ariadis'), order.join(','));
    await page.click('#s-ariadis', { force: true }); await page.waitForTimeout(100);
    assert.ok((await openIds()).includes('sub-menu'), 'still open');
    assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), 'BODY', 'focus stays in the menu');
    const pad = await page.$eval('#s-inset', (e) => getComputedStyle(e).paddingInlineStart);
    assert.equal(pad, '24px', 'data-inset lines up with check items');
    await closeAll();
  });

  await check('checkbox / radio: a click toggles / switches, the menu stays open, dropdown:select reports it', async () => {
    await page.click('#live-trigger'); await page.waitForTimeout(150);
    const seen = await page.evaluate(() => { const s: unknown[] = []; document.getElementById('live-menu')!.addEventListener('dropdown:select', (e) => s.push((e as CustomEvent).detail.checked)); (window as any).__seen = s; return true; });
    assert.ok(seen);
    await page.click('#lv-c1');
    await page.click('#lv-r2');
    const r = await page.evaluate(() => [document.getElementById('lv-c1')!.getAttribute('aria-checked'), document.getElementById('lv-r1')!.getAttribute('aria-checked'), document.getElementById('lv-r2')!.getAttribute('aria-checked'), (window as any).__seen]);
    assert.deepEqual(r, ['true', 'false', 'true', [true, true]]);
    assert.ok((await openIds()).includes('live-menu'), 'menu stays open');
    await page.click('#lv-c1');
    assert.equal(await page.$eval('#lv-c1', (e) => e.getAttribute('aria-checked')), 'false', 'toggles back');
    await closeAll();
  });

  await check('RTL: a submenu opens to the left of its trigger', async () => {
    await page.click('#rtl-trigger'); await page.waitForTimeout(150);
    await page.hover('#rtl-sub-t'); await page.waitForTimeout(300);
    const r = await page.evaluate(() => [document.getElementById('rtl-sub-t')!.getBoundingClientRect().left, document.getElementById('rtl-sub')!.getBoundingClientRect().right]);
    assert.ok(Math.abs(r[1] - r[0]) < 14, `sub right ${r[1]} ~ trigger left ${r[0]}`);
    await closeAll();
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ndropdown.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('dropdown.e2e: all checks passed');
