import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped tabs component. Loads the fixture
 * (pill + line variants, a disabled tab, mirroring the doc page) over HTTP in
 * a real browser, then verifies click activation, ARIA/panel wiring, keyboard
 * navigation (arrows skip disabled, Home/End), roving tabindex, and the
 * per-tab named State API - the same files consumers copy from dist/,
 * unmodified.
 */

const FIXTURE = '/tests/e2e/tabs.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const selected = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => el.getAttribute('aria-selected'));
const panelHidden = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => (el as HTMLElement).hidden);

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

  await check('tabs.js initialized tablists (data-init)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('[role="tablist"]:not([data-init])').length === 0,
    );
  });

  await check('click activates a tab and swaps panels', async () => {
    await page.click('#tab-password');
    assert.equal(await selected(page, 'tab-password'), 'true');
    assert.equal(await selected(page, 'tab-account'), 'false', 'selection is exclusive');
    assert.equal(await panelHidden(page, 'panel-password'), false);
    assert.equal(await panelHidden(page, 'panel-account'), true);
  });

  await check('roving tabindex follows selection', async () => {
    const t = await page.$eval('#tab-password', (el) => el.getAttribute('tabindex'));
    assert.equal(t, null, 'selected tab is tabbable (tabindex removed)');
    const t2 = await page.$eval('#tab-account', (el) => el.getAttribute('tabindex'));
    assert.equal(t2, '-1', 'inactive tabs are -1');
  });

  await check('ArrowRight/ArrowLeft move selection; ArrowRight skips disabled', async () => {
    await page.focus('#line-tab-overview');
    await page.keyboard.press('ArrowRight'); // -> Reports (disabled) must be skipped
    assert.equal(await selected(page, 'line-tab-downloads'), 'true', 'disabled tab skipped');
    await page.keyboard.press('ArrowLeft'); // -> back to Overview
    assert.equal(await selected(page, 'line-tab-overview'), 'true');
  });

  await check('Home/End jump to first/last enabled tab', async () => {
    await page.focus('#line-tab-overview');
    await page.keyboard.press('End');
    assert.equal(await selected(page, 'line-tab-downloads'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await selected(page, 'line-tab-overview'), 'true');
  });

  await check('line variant styles selection with an underline (tabs.css)', async () => {
    // the underline is a 2px border whose color flips transparent -> primary.
    // .tab-trigger has `transition: all 150ms` - the previous check just
    // toggled the selection via Home, so settle before reading the color
    // (measured mid-fade it's a blend, matching neither endpoint).
    await page.waitForTimeout(250);
    // the underline is a 2px border whose color flips transparent -> primary
    const [on, off] = await page.evaluate(() => {
      const pick = (id: string) => {
        const el = document.querySelector(id)!;
        const cs = getComputedStyle(el);
        return cs.borderBottomWidth + '|' + cs.borderBottomColor;
      };
      return [pick('#line-tab-overview'), pick('#line-tab-downloads')];
    });
    assert.match(on, /^2px/, 'selected tab has the 2px underline');
    assert.match(off, /^2px transparent|rgba\(0, 0, 0, 0\)/, 'unselected underline is transparent');
    assert.notEqual(on, off, 'selected line tab is visually distinct');
  });

  // -- State API (AGENTS.md "State API"), bound per tab ----------------------
  await check("state API: setState('active') selects the tab", async () => {
    await page.$eval('#tab-account', (el) => (el as HTMLElement).api!.setState('active'));
    assert.equal(await selected(page, 'tab-account'), 'true');
    const state = await page.$eval('#tab-account', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'active');
    const other = await page.$eval('#tab-password', (el) => (el as HTMLElement).api!.getState());
    assert.equal(other.name, 'default', 'exclusive: the sibling reports default');
  });

  await check("state API: setState('default') restores the authored selection", async () => {
    await page.$eval('#tab-account', (el) => (el as HTMLElement).api!.setState('default'));
    // authored selection for this tablist is Account
    assert.equal(await selected(page, 'tab-account'), 'true');
  });

  await check("state API: 'active' on a disabled tab is a no-op (cannot select)", async () => {
    await page.$eval('#line-tab-reports', (el) => (el as HTMLElement).api!.setState('active'));
    assert.equal(await selected(page, 'line-tab-reports'), 'false', 'disabled tab stays unselected');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#tab-account') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.tabsApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.tabsStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#tab-account'),
    }));
    assert.ok(reg.hasApi, 'df$.tabsApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'active', 'disabled']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('tabs: data-size="xs" → font-size 12px', async () => {
    const val = await page.$eval('#z-tabs-xs .tab-trigger', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '12px');
  });
  await check('tabs: data-size="sm" → font-size 13px', async () => {
    const val = await page.$eval('#z-tabs-sm .tab-trigger', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '13px');
  });
  await check('tabs: data-size="md" → font-size 14px', async () => {
    const val = await page.$eval('#z-tabs-md .tab-trigger', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '14px');
  });
  await check('tabs: data-size="lg" → font-size 16px', async () => {
    const val = await page.$eval('#z-tabs-lg .tab-trigger', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '16px');
  });
  await check('tabs: data-size="xl" → font-size 18px', async () => {
    const val = await page.$eval('#z-tabs-xl .tab-trigger', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '18px');
  });

  const box = (sel: string) => page.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; });

  await check('data-side="bottom" + data-align="end": the tabs sit under the panel, flush with its right edge', async () => {
    const list = await box('#tb-bottom-list');
    const card = await box('#tb-bottom-card');
    assert.ok(list.t >= card.b - 1, `tabs below the card (tabs top ${list.t}, card bottom ${card.b})`);
    assert.equal(list.r, card.r, 'right-aligned with the card');
  });

  await check('attached: the selected tab overlaps the card border by 1px and takes the card surface', async () => {
    const list = await box('#tb-bottom-list');
    const card = await box('#tb-bottom-card');
    assert.equal(card.b - list.t, 1, '1px overlap');
    const r = await page.evaluate(() => {
      const probe = document.createElement('i'); probe.style.color = 'var(--card)'; document.body.append(probe);
      const cardColor = getComputedStyle(probe).color; probe.remove();
      const sel = document.getElementById('tb-bottom-t0')!;
      return { bg: getComputedStyle(sel).backgroundColor === cardColor, topEdge: getComputedStyle(sel).borderTopColor === cardColor, cardCorner: getComputedStyle(document.getElementById('tb-bottom-card')!).borderBottomRightRadius };
    });
    assert.deepEqual(r, { bg: true, topEdge: true, cardCorner: '0px' });
  });

  await check('data-side="right" + data-align="end": a vertical tablist right of the panel, starting from the bottom', async () => {
    const list = await box('#tb-right-list');
    const card = await box('#tb-right-card');
    assert.ok(list.l >= card.r - 1, 'right of the card');
    assert.equal(list.b, card.b, 'bottom-aligned');
    assert.equal(await page.$eval('#tb-right-list', (l) => l.getAttribute('aria-orientation')), 'vertical', 'tabs.ts sets the orientation from the side');
  });

  await check('side tabs have vertical labels: taller than wide, logical paddings turned with them; aria-orientation-only tabs stay horizontal', async () => {
    const r = await page.evaluate(() => {
      const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
      const box = (id: string) => document.getElementById(id)!.getBoundingClientRect();
      const legacy = document.getElementById('tb-legacy-t0');
      return {
        right: cs('tb-right-t0').writingMode,
        left: cs('tb-left-t0').writingMode,
        tall: box('tb-right-t0').height > box('tb-right-t0').width && box('tb-left-t0').height > box('tb-left-t0').width,
        // pill base: padding-block 0.375rem / padding-inline 0.75rem -> physical 12px top, 6px left once vertical
        pad: [cs('tb-left-t0').paddingTop, cs('tb-left-t0').paddingLeft],
        legacy: legacy ? getComputedStyle(legacy).writingMode : 'none',
      };
    });
    assert.equal(r.right, 'vertical-rl', 'right: top to bottom');
    assert.ok(['sideways-lr', 'vertical-rl'].includes(r.left), `left: bottom to top where supported (${r.left})`);
    assert.ok(r.tall, 'labels run vertically');
    assert.deepEqual(r.pad, ['12px', '6px']);
    assert.equal(r.legacy, 'horizontal-tb', 'the aria-orientation settings nav keeps horizontal labels');
  });

  await check('data-side="left": ArrowDown / ArrowUp move between tabs (the side makes it vertical)', async () => {
    const list = await box('#tb-left-list');
    const card = await box('#tb-left-card');
    assert.ok(list.r <= card.l, 'left of the card');
    await page.focus('#tb-left-t0');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.$eval('#tb-left-t1', (t) => t.getAttribute('aria-selected')), 'true');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.$eval('#tb-left-t0', (t) => t.getAttribute('aria-selected')), 'true');
  });

  // -- icons, ellipsis, color, disabled as a state, tablist + content API ------
  await check('icons + emoji ride inline before the label, 1em, 0.5em apart', async () => {
    const r = await page.evaluate(() => {
      const svg = document.querySelector('#tb-icons-t0 svg')!;
      const emoji = document.querySelector('#tb-icons-t1 .tab-icon')!;
      const fs = parseFloat(getComputedStyle(document.getElementById('tb-icons-t0')!).fontSize);
      return {
        svgW: Math.round(svg.getBoundingClientRect().width), fs,
        gap: getComputedStyle(svg).marginInlineEnd, emojiDisplay: getComputedStyle(emoji).display,
      };
    });
    assert.equal(r.svgW, r.fs, 'icon is 1em');
    assert.equal(r.gap, `${r.fs / 2}px`, '0.5em before the text');
    assert.equal(r.emojiDisplay, 'inline-block');
  });

  await check('icons and emoji turn with vertical labels (svg a quarter turn toward the reading direction, emoji sideways)', async () => {
    const r = await page.evaluate(() => {
      const probe = (id: string) => {
        const t = document.getElementById(id)!;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        t.prepend(svg);
        const out = { wm: getComputedStyle(t).writingMode, orient: getComputedStyle(t).textOrientation, svg: getComputedStyle(svg).rotate };
        svg.remove();
        return out;
      };
      return { left: probe('tb-left-t1'), right: probe('tb-right-t1') };
    });
    // right: vertical-rl reads down, emoji sideways, svg turned clockwise
    assert.deepEqual(r.right, { wm: 'vertical-rl', orient: 'sideways', svg: '90deg' });
    // left: sideways-lr reads up (svg turned back a quarter); without it, the right-hand rules apply
    assert.deepEqual(r.left, r.left.wm === 'sideways-lr'
      ? { wm: 'sideways-lr', orient: 'sideways', svg: '-90deg' }
      : { wm: 'vertical-rl', orient: 'sideways', svg: '90deg' });
  });

  await check('short labels keep their full width while long ones are cut (grid tracks, not flex-shrink)', async () => {
    const churn = await page.$eval('#tb-long-t2', (el) => el.scrollWidth <= el.clientWidth);
    assert.ok(churn, '"Churn" is not ellipsized');
  });

  await check('long labels ellipsize: the tab row stays inside its container', async () => {
    const r = await page.evaluate(() => {
      const root = document.getElementById('tb-long')!.getBoundingClientRect();
      const list = document.getElementById('tb-long-list')!.getBoundingClientRect();
      const t0 = document.getElementById('tb-long-t0')!;
      return { root: root.right, list: list.right, clipped: t0.scrollWidth > t0.clientWidth, overflow: getComputedStyle(t0).textOverflow };
    });
    assert.ok(r.list <= r.root + 0.5, `list right ${r.list} <= container right ${r.root}`);
    assert.ok(r.clipped, 'the long label is shortened');
    assert.equal(r.overflow, 'ellipsis');
  });

  await check('attached tabs keep a card radius away from a rounded corner (start: the far end)', async () => {
    const r = await page.evaluate(() => {
      const card = document.getElementById('tb-long-card0')!.getBoundingClientRect();
      const list = document.getElementById('tb-long-list')!.getBoundingClientRect();
      const radius = parseFloat(getComputedStyle(document.getElementById('tb-long-card0')!).borderTopRightRadius);
      return { gap: Math.round(card.right - list.right), radius, squared: getComputedStyle(document.getElementById('tb-long-card0')!).borderTopLeftRadius };
    });
    assert.ok(r.radius > 0, 'far corner stays rounded');
    assert.ok(r.gap >= r.radius, `gap ${r.gap} >= radius ${r.radius}`);
    assert.equal(r.squared, '0px', 'the corner the tabs grow from is square');
  });

  await check('vertical long labels: the panel sets the height, the column fills it and ellipsizes', async () => {
    const r = await page.evaluate(() => {
      const card = document.getElementById('tb-vlong-card0')!.getBoundingClientRect();
      const list = document.getElementById('tb-vlong-list')!.getBoundingClientRect();
      const t0 = document.getElementById('tb-vlong-t0')!;
      return { cardH: Math.round(card.height), listH: Math.round(list.height), clipped: t0.scrollHeight > t0.clientHeight };
    });
    assert.equal(r.listH, r.cardH, 'column height == panel height');
    assert.ok(r.clipped, 'a vertical label is shortened');
  });

  await check('a tab in its own color keeps it selected and unselected', async () => {
    const color = () => page.$eval('#tb-color-t2', (el) => getComputedStyle(el).color);
    assert.equal(await color(), 'rgb(220, 38, 38)');
    await page.click('#tb-color-t2');
    assert.equal(await color(), 'rgb(220, 38, 38)');
  });

  await check("state API: 'disabled' is a state - setState('disabled') locks a tab, 'default' enables it again", async () => {
    const r = await page.evaluate(() => {
      const [p, b, t] = ['tb-st-t0', 'tb-st-t1', 'tb-st-t2'].map((id) => document.getElementById(id) as HTMLButtonElement & { api: any });
      const out: Record<string, unknown> = { authored: b.api.getState().name };
      b.api.setState('default'); // default = enabled, even for an authored-disabled tab
      out.restored = b.disabled;
      b.api.setState('disabled');
      t.api.setState('active');
      t.api.setState('disabled'); // the selected tab gets disabled → hands selection on
      out.teamDisabled = t.disabled;
      out.teamName = t.api.getState().name;
      out.selectionMoved = p.getAttribute('aria-selected');
      t.api.setState('default');
      out.teamBack = t.disabled;
      return out;
    });
    assert.deepEqual(r, { authored: 'disabled', restored: false, teamDisabled: true, teamName: 'disabled', selectionMoved: 'true', teamBack: false });
  });

  await check("state API (tablist): setState('active', { index }) picks the tab, getState reports it, 'default' restores", async () => {
    const r = await page.evaluate(() => {
      const list = document.getElementById('tb-st-list') as HTMLElement & { api: any };
      list.api.setState('active', { index: 2 });
      const a = list.api.getState();
      const shown = !(document.getElementById('tb-st-p2') as HTMLElement).hidden;
      list.api.setState('active', { index: 1 }); // disabled: ignored
      const b = list.api.getState().config.index;
      list.api.setState('default');
      const c = list.api.getState();
      list.api.setState('disabled');
      const d = [list.api.getState().name, (document.getElementById('tb-st-t0') as HTMLButtonElement).disabled];
      list.api.setState('default');
      return { a: [a.name, a.config.index, a.config.id], shown, b, c: [c.name, c.config.index], d, e: (document.getElementById('tb-st-t0') as HTMLButtonElement).disabled };
    });
    assert.deepEqual(r, { a: ['active', 2, 'tb-st-t2'], shown: true, b: 2, c: ['default', 0], d: ['disabled', true], e: false });
  });

  await check('state API: { label, icon } config renames / re-icons a tab without moving the selection', async () => {
    const r = await page.evaluate(() => {
      const t = document.getElementById('tb-st-t2') as HTMLElement & { api: any };
      const list = document.getElementById('tb-st-list') as HTMLElement & { api: any };
      list.api.setState('active', { index: 0 });
      t.api.setState(t.api.getState().name, { label: 'People', icon: '👥' });
      const a = t.api.getState();
      const sel = list.api.getState().config.index;
      const span = t.querySelector('.tab-icon')?.textContent;
      t.api.setState(t.api.getState().name, { icon: '' });
      const noIcon = !t.querySelector('.tab-icon') && t.api.getState().config.icon === '';
      t.api.setState(t.api.getState().name, { label: 'Crew' });
      t.api.setState('disabled');
      t.api.setState('default');
      const kept = t.api.getState().config.label; // un-disabling keeps the rename
      list.api.setState('default'); // the tablist's default is the full as-authored restore
      return { name: a.name, label: a.config.label, icon: a.config.icon, sel, span, noIcon, kept, restored: t.api.getState().config.label, text: t.textContent, billing: (document.getElementById('tb-st-t1') as HTMLButtonElement).disabled };
    });
    assert.deepEqual(r, { name: 'default', label: 'People', icon: '👥', sel: 0, span: '👥', noIcon: true, kept: 'Crew', restored: 'Team', text: 'Team', billing: true });
  });

  await check('render(): reproduces the authored markup 1:1 and every state - triggers', async () => {
    // a trigger's selection hands over to a sibling: the siblings' markup is
    // theirs, a trigger's own aria-selected / tabindex / disabled / content is checked
    await assertRenderContract(page, '[role="tab"][id]', ['default', 'active', 'disabled'], { runtimeAttrs: ['aria-selected', 'tabindex'] });
  });

  // LAST (AGENTS.md "State API" → render): the contract reloads the page
  await check('render(): reproduces the authored markup 1:1 and every state - tablists', async () => {
    await assertRenderContract(page, '[role="tablist"][id]', ['default', 'active', 'disabled']);
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ntabs.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('tabs.e2e: all checks passed');
