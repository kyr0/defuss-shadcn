import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped combobox component. Loads the fixture
 * (flat list + grouped list with a disabled option and separator, mirroring
 * the doc page) over HTTP in a real browser, then verifies trigger toggling,
 * search filtering with empty state, keyboard navigation and selection,
 * group/separator/option hiding, and the per-popover named State API - the
 * same files consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/combobox.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const isOpen = (page: Page, id: string) => page.$eval(`#${id}`, (el) => el.matches(':popover-open'));
const expanded = (page: Page) =>
  page.$eval('#cb-demo .combobox-trigger', (el) => el.getAttribute('aria-expanded'));
const visibleOptions = (page: Page, popoverId: string) =>
  page.$$eval(`#${popoverId} [role="option"]:not([hidden])`, (els) =>
    els.map((el) => el.textContent!.trim()),
  );
const triggerText = (page: Page, id = 'cb-demo') =>
  page.$eval(`#${id} .combobox-value`, (el) => el.textContent!.trim());

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

  await check('combobox.js initialized + anchor wiring (data-init, position-anchor)', async () => {
    await page.waitForFunction(() => document.querySelectorAll('.combobox:not([data-init])').length === 0);
    const pair = await page.evaluate(() => {
      const trigger = document.querySelector('#cb-demo .combobox-trigger') as HTMLElement;
      const popover = document.querySelector('#cb-framework-popover') as HTMLElement;
      return { anchor: trigger.style.anchorName, uses: popover.style.positionAnchor };
    });
    assert.ok(pair.anchor.startsWith('--combobox-'), 'trigger needs an anchor name');
    assert.equal(pair.uses, pair.anchor, 'popover must use its trigger anchor');
  });

  await check('combobox.css applied (listbox surface)', async () => {
    const style = await page.$eval('#cb-framework-popover', (el) => {
      const cs = getComputedStyle(el);
      return { radius: cs.borderTopLeftRadius, bg: cs.backgroundColor };
    });
    assert.notEqual(style.radius, '0px', 'rounded popover');
    assert.notEqual(style.bg, 'rgba(0, 0, 0, 0)', 'opaque popover surface');
  });

  await check('trigger click opens the listbox and focuses search', async () => {
    await page.click('#cb-demo .combobox-trigger');
    assert.equal(await isOpen(page, 'cb-framework-popover'), true);
    assert.equal(await expanded(page), 'true', 'aria-expanded synced');
    const focused = await page.evaluate(() => document.activeElement?.className);
    assert.match(focused ?? '', /combobox-search-input/, 'search input receives focus');
  });

  await check('typing filters options and hides non-matching groups', async () => {
    await page.keyboard.type('nu');
    assert.deepEqual(await visibleOptions(page, 'cb-framework-popover'), ['Nuxt']);
    const emptyHidden = await page.$eval('#cb-framework-popover .combobox-empty', (el) => (el as HTMLElement).hidden);
    assert.equal(emptyHidden, true, 'no-results hidden while something matches');
    await page.keyboard.type('xyz');
    assert.deepEqual(await visibleOptions(page, 'cb-framework-popover'), []);
    const emptyShown = await page.$eval('#cb-framework-popover .combobox-empty', (el) => (el as HTMLElement).hidden);
    assert.equal(emptyShown, false, '.combobox-empty shows when nothing matches');
  });

  // -- §3 direct integration: flag-based filtering keeps NODE identity ------
  await check('filtering flags options in place (same node survives hide+show; caret untouched)', async () => {
    const res = await page.evaluate(async () => {
      const input = document.querySelector('#cb-demo .combobox-search-input') as HTMLInputElement;
      const opt = document.querySelector('#cb-opt-next') as HTMLElement;
      (opt as any).__cbSentinel = 1;
      // caret into the middle of the query: filtering must not touch the input node
      input.value = 'next';
      input.setSelectionRange(2, 2);
      input.dispatchEvent(new Event('input', { bubbles: true })); // hides non-matches
      const hiddenKept = (opt as any).__cbSentinel === 1; // staying hidden kept the node
      // caret must be exactly where we put it - flag writes never touch the input
      const caret = [input.selectionStart, input.selectionEnd].join(',');
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true })); // re-shows everything
      const again = document.querySelector('#cb-opt-next') as HTMLElement;
      return {
        kept: hiddenKept && (again as any)?.__cbSentinel === 1,
        visible: !again.hidden,
        caret,
      };
    });
    assert.ok(res.kept, 'hidden/shown option is the SAME node (flag toggle, no re-render)');
    assert.ok(res.visible, 'option visible again after clearing');
    assert.equal(res.caret, '2,2', 'caret survived filtering (input untouched by flag writes)');
  });

  await check('clearing filters and ArrowDown/ArrowUp move the highlight + activedescendant', async () => {
    // clearing re-filters and auto-highlights the first match (component's input handler)
    await page.fill('#cb-demo .combobox-search-input', '');
    assert.equal(
      await page.$eval('#cb-demo .combobox-search-input', (el) => el.getAttribute('aria-activedescendant')),
      'cb-opt-next',
      'first option auto-highlighted',
    );
    await page.keyboard.press('ArrowDown');
    assert.equal(
      await page.$eval('#cb-demo .combobox-search-input', (el) => el.getAttribute('aria-activedescendant')),
      'cb-opt-svelte',
    );
    await page.keyboard.press('ArrowUp');
    assert.equal(
      await page.$eval('#cb-demo .combobox-search-input', (el) => el.getAttribute('aria-activedescendant')),
      'cb-opt-next',
    );
  });

  await check('Enter selects the highlighted option and closes', async () => {
    await page.keyboard.press('Enter');
    assert.equal(await isOpen(page, 'cb-framework-popover'), false, 'selection closes the listbox');
    assert.equal(await triggerText(page), 'Next.js', 'trigger shows the selection');
    assert.equal(await expanded(page), 'false', 'aria-expanded reset');
    const selected = await page.$eval('#cb-opt-next', (el) => el.getAttribute('aria-selected'));
    assert.equal(selected, 'true');
  });

  await check('Escape closes and restores focus to the trigger', async () => {
    await page.click('#cb-demo .combobox-trigger');
    await page.waitForFunction(() => document.querySelector('#cb-framework-popover')!.matches(':popover-open'));
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(page, 'cb-framework-popover'), false);
    const focused = await page.evaluate(() => document.activeElement?.className);
    assert.match(focused ?? '', /combobox-trigger/, 'trigger refocused');
  });

  await check('click selects an option directly', async () => {
    await page.click('#cb-demo .combobox-trigger');
    await page.click('#cb-opt-astro');
    assert.equal(await triggerText(page), 'Astro');
  });

  await check('selection check: mask (not black data-URI image) + aligned rows', async () => {
    // regression: a data: URI SVG resolves currentColor to BLACK as an image —
    // the check was invisible in dark mode; and an in-flow ::before shifted the
    // selected row's text out of alignment with the other rows
    await page.click('#cb-demo .combobox-trigger');
    await page.waitForFunction(() => document.querySelector('#cb-framework-popover')!.matches(':popover-open'));
    const geom = await page.evaluate(() => {
      const sel = document.querySelector('#cb-opt-astro')!;
      const unsel = document.querySelector('#cb-opt-next')!;
      const b = getComputedStyle(sel, '::before');
      return {
        mask: b.maskImage || b.webkitMaskImage || 'none',
        bgImg: b.backgroundImage,
        bgColor: b.backgroundColor,
        selPad: getComputedStyle(sel).paddingInlineStart,
        unselPad: getComputedStyle(unsel).paddingInlineStart,
        pos: b.position,
      };
    });
    assert.notEqual(geom.mask, 'none', 'check uses a mask so currentColor applies');
    assert.match(geom.mask, /url\(/, 'mask-image is the check glyph');
    assert.ok(!/svg/.test(geom.bgImg), 'no data-URI SVG background (renders black)');
    assert.notEqual(geom.bgColor, 'rgba(0, 0, 0, 0)', 'background-color paints the mask');
    assert.equal(geom.pos, 'absolute', 'check is absolutely positioned');
    assert.equal(geom.selPad, geom.unselPad, 'selected row keeps the same indent');
    await page.keyboard.press('Escape');
  });

  await check('clear button: injected, visible with a selection, restores placeholder', async () => {
    // the ✕ is NOT in consumer markup - combobox.js injects exactly one per wrapper
    const count = await page.$$eval('#cb-demo .combobox-clear', (els) => els.length);
    assert.equal(count, 1, 'exactly one injected clear button');
    // Astro is selected from the previous check → clear shows, chevron yields
    const shown = await page.evaluate(() => ({
      clear: getComputedStyle(document.querySelector('#cb-demo .combobox-clear')!).display,
      chevron: getComputedStyle(document.querySelector('#cb-demo .combobox-chevron')!).display,
    }));
    assert.notEqual(shown.clear, 'none', 'clear button visible while a value is selected');
    assert.equal(shown.chevron, 'none', 'chevron hidden while clear is shown');
    await page.click('#cb-demo .combobox-clear');
    assert.equal(await triggerText(page), 'Select framework...', 'placeholder restored');
    const cleared = await page.evaluate(() => ({
      placeholder: document.querySelector('#cb-demo .combobox-value')!.hasAttribute('data-placeholder'),
      selected: document.querySelectorAll('#cb-demo [role="option"][aria-selected="true"]').length,
      clear: getComputedStyle(document.querySelector('#cb-demo .combobox-clear')!).display,
      chevron: getComputedStyle(document.querySelector('#cb-demo .combobox-chevron')!).display,
    }));
    assert.equal(cleared.placeholder, true, 'data-placeholder marker restored');
    assert.equal(cleared.selected, 0, 'no option remains selected');
    assert.equal(cleared.clear, 'none', 'clear hides again without a selection');
    assert.notEqual(cleared.chevron, 'none', 'chevron returns');
    // reselect Astro - later state-API checks assert getState().config.value === 'Astro'
    await page.click('#cb-demo .combobox-trigger');
    await page.waitForFunction(() => document.querySelector('#cb-framework-popover')!.matches(':popover-open'));
    await page.click('#cb-opt-astro');
  });

  await check('grouped listbox: labels, separators, disabled options', async () => {
    await page.click('#cb-grouped .combobox-trigger');
    await page.waitForFunction(() => document.querySelector('#cb-tz-popover')!.matches(':popover-open'));
    assert.deepEqual(await visibleOptions(page, 'cb-tz-popover'), [
      'PT (Los Angeles)',
      'ET (New York)',
      'EET (Bucharest)',
    ]);
    // clicking the disabled option must not select or close (pointer-events:
    // none in CSS + JS aria-disabled guard - force to bypass actionability)
    await page.click('#cb-tz-eet', { force: true });
    assert.equal(await isOpen(page, 'cb-tz-popover'), true, 'disabled click keeps it open');
    assert.equal(await triggerText(page, 'cb-grouped'), 'Select timezone...', 'disabled option not selected');
    // arrow navigation skips the disabled option
    await page.fill('#cb-grouped .combobox-search-input', '');
    await page.keyboard.press('End');
    assert.equal(
      await page.$eval('#cb-grouped .combobox-search-input', (el) => el.getAttribute('aria-activedescendant')),
      'cb-tz-et',
      'End lands on the last *enabled* option',
    );
    // filtering hides a group label whose options all vanish, plus separators
    await page.fill('#cb-grouped .combobox-search-input', 'los angeles');
    const states = await page.evaluate(() => ({
      naLabel: !(document.querySelector('#cb-tz-popover .combobox-group-label') as HTMLElement).hidden,
      euLabel: (document.querySelectorAll('#cb-tz-popover .combobox-group-label')[1] as HTMLElement).hidden,
      sep: (document.querySelector('#cb-tz-popover .combobox-separator') as HTMLElement).hidden,
    }));
    assert.equal(states.naLabel, true, 'North America label stays (has a match)');
    assert.equal(states.euLabel, true, 'Europe label hides (no match)');
    assert.equal(states.sep, true, 'separator adjacent to hidden items hides');
  });

  // -- State API (AGENTS.md "State API"), bound per popover ------------------
  const setState = (page: Page, id: string, state: string) =>
    page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check("state API: setState('open') shows the listbox; getState reports", async () => {
    await setState(page, 'cb-framework-popover', 'default'); // ensure closed first
    await setState(page, 'cb-framework-popover', 'open');
    // the deferred show waits out any running exit transition (≤500ms cap)
    await page.waitForFunction(() => document.querySelector('#cb-framework-popover')!.matches(':popover-open'));
    const state = await page.$eval('#cb-framework-popover', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open');
    assert.equal(state.config.value, 'Astro', 'live selection mirrored into config');
  });

  await check("state API: setState('default') closes the listbox", async () => {
    await setState(page, 'cb-framework-popover', 'default');
    assert.equal(await isOpen(page, 'cb-framework-popover'), false);
    assert.equal(await expanded(page), 'false', 'aria-expanded still managed by close()');
  });

  await check('state API: getState reflects trigger clicks (no setState involved)', async () => {
    await page.click('#cb-demo .combobox-trigger');
    await page.waitForFunction(() => document.querySelector('#cb-framework-popover')!.matches(':popover-open'));
    const state = await page.$eval('#cb-framework-popover', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open');
  });

  await check('regression: filtered-out options are display:none and non-clickable', async () => {
    // bug: `.combobox-item { display: flex }` (author origin) beat the UA's
    // [hidden] { display: none }, so all options stayed rendered while JS
    // treated them as hidden - clicking a still-visible non-match was dropped.
    // (previous check leaves the popover open - close deterministically first)
    await setState(page, 'cb-framework-popover', 'default');
    await page.click('#cb-demo .combobox-trigger');
    await page.waitForFunction(() => document.querySelector('#cb-framework-popover')!.matches(':popover-open'));
    await page.fill('#cb-demo .combobox-search-input', 'sve');
    const displays = await page.evaluate(() => ({
      astro: getComputedStyle(document.querySelector('#cb-opt-astro')!).display,
      svelte: getComputedStyle(document.querySelector('#cb-opt-svelte')!).display,
    }));
    assert.equal(displays.astro, 'none', 'non-matching option must not render');
    assert.notEqual(displays.svelte, 'none', 'matching option stays rendered');
    // the match is clickable and selects (Playwright would time out on a hidden element)
    await page.click('#cb-opt-svelte');
    assert.equal(await triggerText(page), 'SvelteKit', 'matching option selects');
    assert.equal(await isOpen(page, 'cb-framework-popover'), false, 'selection closes the listbox');
    // restore the Astro selection the state-API checks below rely on
    await page.click('#cb-demo .combobox-trigger');
    await page.waitForFunction(() => document.querySelector('#cb-framework-popover')!.matches(':popover-open'));
    await page.click('#cb-opt-astro');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#cb-framework-popover') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.comboboxApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.comboboxStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#cb-framework-popover'),
    }));
    assert.ok(reg.hasApi, 'df$.comboboxApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'open']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('combobox: data-size="xs" → height 28px', async () => {
    const val = await page.$eval('#z-combobox-xs .combobox-trigger', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '28px');
  });
  await check('combobox: data-size="sm" → height 32px', async () => {
    const val = await page.$eval('#z-combobox-sm .combobox-trigger', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '32px');
  });
  await check('combobox: data-size="md" → height 36px', async () => {
    const val = await page.$eval('#z-combobox-md .combobox-trigger', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '36px');
  });
  await check('combobox: data-size="lg" → height 44px', async () => {
    const val = await page.$eval('#z-combobox-lg .combobox-trigger', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '44px');
  });
  await check('combobox: data-size="xl" → height 52px', async () => {
    const val = await page.$eval('#z-combobox-xl .combobox-trigger', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '52px');
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ncombobox.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('combobox.e2e: all checks passed');
