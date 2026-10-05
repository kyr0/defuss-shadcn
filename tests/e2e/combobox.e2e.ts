import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

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

  // -- multi-select -----------------------------------------------------
  const multi = () =>
    page.evaluate(() => {
      const w = document.getElementById('cb-multi')!;
      return {
        trigger: w.querySelector('.combobox-value')!.textContent,
        tags: Array.from(w.querySelectorAll('.combobox-tag')).map((t) => t.textContent!.trim()),
        inputs: new FormData(document.getElementById('cbm-form') as HTMLFormElement).getAll('tags'),
        open: document.getElementById('cbm-pop')!.matches(':popover-open'),
      };
    });

  await check('multi: aria-multiselectable, authored preselection → tags, summary, hidden inputs', async () => {
    assert.equal(await page.$eval('#cbm-list', (el) => el.getAttribute('aria-multiselectable')), 'true');
    assert.deepEqual(await multi(), { trigger: '2 selected', tags: ['Design', 'Engineering'], inputs: ['design', 'eng'], open: false });
  });

  await check('multi: clicking an option toggles it and the list stays open', async () => {
    await page.evaluate(() => {
      (globalThis as any).__changes = [];
      document.getElementById('cb-multi')!.addEventListener('combobox:change', (e: Event) => (globalThis as any).__changes.push((e as CustomEvent).detail.values));
    });
    await page.click('#cb-multi .combobox-trigger');
    await page.click('#cbm-a11y');
    let m = await multi();
    assert.equal(m.open, true, 'still open after a pick');
    assert.deepEqual(m.tags, ['Design', 'Engineering', 'Accessibility']);
    assert.equal(m.trigger, '3 selected');
    await page.click('#cbm-design');
    m = await multi();
    assert.deepEqual(m.inputs, ['eng', 'a11y'], 'toggled off again');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__changes), [['design', 'eng', 'a11y'], ['eng', 'a11y']]);
  });

  await check('multi: options show a checkbox that fills when chosen', async () => {
    const r = await page.evaluate(() => {
      const box = (id: string) => getComputedStyle(document.getElementById(id)!, '::before');
      const tick = (id: string) => getComputedStyle(document.getElementById(id)!, '::after').content;
      return { on: box('cbm-eng').backgroundColor, off: box('cbm-perf').backgroundColor, offBorder: box('cbm-perf').borderTopWidth, tickOn: tick('cbm-eng'), tickOff: tick('cbm-perf') };
    });
    assert.notEqual(r.on, r.off, 'chosen box is filled');
    assert.equal(r.offBorder, '1px', 'unchosen shows an empty box');
    assert.equal(r.tickOn, '""');
    assert.equal(r.tickOff, 'none');
  });

  await check('multi: Enter toggles the highlighted option and keeps the list open', async () => {
    await page.fill('#cbm-search', 'perf');
    await page.keyboard.press('Enter');
    const m = await multi();
    assert.equal(m.open, true);
    assert.deepEqual(m.inputs, ['eng', 'a11y', 'perf']);
  });

  await check('multi: Backspace in the empty search removes the last choice', async () => {
    await page.fill('#cbm-search', '');
    await page.focus('#cbm-search');
    await page.keyboard.press('Backspace');
    assert.deepEqual((await multi()).inputs, ['eng', 'a11y']);
    await page.keyboard.press('Escape');
  });

  await check("multi: a tag's × removes it and focus moves to the next tag", async () => {
    await page.click('#cb-multi .combobox-tag-remove[data-value="eng"]');
    const m = await multi();
    assert.deepEqual(m.tags, ['Accessibility']);
    assert.equal(m.trigger, 'Accessibility', 'one choice shows its label');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset.value), 'a11y');
  });

  await check('multi: the clear button empties everything (placeholder, no tags, no inputs)', async () => {
    await page.click('#cb-multi .combobox-clear');
    assert.deepEqual(await multi(), { trigger: 'Add tags...', tags: [], inputs: [], open: false });
    assert.equal(await page.$eval('#cb-multi .combobox-tags', (el) => getComputedStyle(el).display), 'none', 'no empty gap');
  });

  await check('multi state API: getState reports values + labels', async () => {
    await page.click('#cb-multi .combobox-trigger');
    await page.click('#cbm-perf');
    await page.click('#cbm-design');
    const c = await page.$eval('#cbm-pop', (p: any) => p.api.getState().config);
    assert.deepEqual([c.values, c.labels, c.value], [['design', 'perf'], ['Design', 'Performance'], 'Design, Performance']);
    await page.keyboard.press('Escape');
  });

  // -- tag input (data-tags) -------------------------------------------
  const tagState = (id: string) =>
    page.evaluate((wid) => {
      const w = document.getElementById(wid)!;
      const input = w.querySelector('.combobox-field-input') as HTMLInputElement;
      return {
        tags: Array.from(w.querySelectorAll('.combobox-field .combobox-tag')).map((t) => t.textContent!.trim()),
        values: new FormData(document.getElementById('cbt-form') as HTMLFormElement).getAll(w.dataset.name!),
        input: input.value,
        placeholder: input.placeholder,
        open: w.querySelector('.combobox-content')!.matches(':popover-open'),
        highlighted: w.querySelector('[data-highlighted]')?.textContent?.trim() ?? null,
        visible: Array.from(w.querySelectorAll('[role="option"]:not([hidden])')).map((o) => o.textContent!.trim()),
      };
    }, id);

  await check('tag input: tags render INSIDE the field, next to the input; placeholder hidden while tags exist', async () => {
    const r = await page.evaluate(() => {
      const tag = document.querySelector('#cb-tags .combobox-tag')!;
      return { inField: !!tag.closest('.combobox-field'), sameBox: tag.closest('.combobox-field') === document.getElementById('cb-tags-input')!.parentElement };
    });
    assert.deepEqual(r, { inField: true, sameBox: true });
    const st = await tagState('cb-tags');
    assert.deepEqual([st.tags, st.values, st.placeholder], [['CSS'], ['css'], '']);
  });

  await check('tag input: typing opens + filters; with no exact match the "Create" row is highlighted', async () => {
    await page.evaluate(() => {
      (globalThis as any).__tagEvents = [];
      document.getElementById('cb-tags')!.addEventListener('combobox:change', (e: Event) => (globalThis as any).__tagEvents.push((e as CustomEvent).detail));
    });
    await page.click('#cb-tags-input');
    await page.keyboard.type('scr');
    const st = await tagState('cb-tags');
    assert.equal(st.open, true);
    assert.deepEqual(st.visible, ['TypeScript', 'JavaScript', 'Create "scr"']);
    assert.equal(st.highlighted, 'Create "scr"');
  });

  await check('tag input: Enter on an EXACT match (any case) picks the existing option, never a duplicate', async () => {
    await page.fill('#cb-tags-input', 'typescript');
    const hl = (await tagState('cb-tags')).highlighted;
    assert.equal(hl, 'TypeScript', 'the exact match is highlighted, no create row');
    await page.keyboard.press('Enter');
    const st = await tagState('cb-tags');
    assert.deepEqual([st.tags, st.values, st.input], [['CSS', 'TypeScript'], ['css', 'ts'], '']);
  });

  await check('tag input: Enter with no exact match creates a new tag (and a real option)', async () => {
    await page.keyboard.type('Web Components');
    await page.keyboard.press('Enter');
    const st = await tagState('cb-tags');
    assert.deepEqual(st.tags, ['CSS', 'TypeScript', 'Web Components']);
    assert.deepEqual(st.values, ['css', 'ts', 'Web Components']);
    const ev = await page.evaluate(() => (globalThis as any).__tagEvents.at(-1));
    assert.equal(ev.created, 'Web Components');
    assert.equal(await page.$eval('#cb-tags-list', (l) => !!l.querySelector('[data-created]')), true, 'created tags become options');
  });

  await check('tag input: a comma commits like Enter', async () => {
    await page.keyboard.type('Rust,');
    assert.deepEqual((await tagState('cb-tags')).tags, ['CSS', 'TypeScript', 'Web Components', 'Rust']);
  });

  await check('tag input: arrow keys pick another listed option instead of creating', async () => {
    await page.keyboard.type('a');
    // highlighted = "Create a" (no exact match); ArrowUp walks back to a listed option
    await page.keyboard.press('ArrowUp');
    const hl = (await tagState('cb-tags')).highlighted;
    assert.notEqual(hl, 'Create "a"');
    await page.keyboard.press('Enter');
    const st = await tagState('cb-tags');
    assert.ok(st.tags.includes(hl!), 'the arrowed option was added: ' + hl);
    assert.ok(!st.tags.includes('a'), 'nothing created');
  });

  await check('tag input: Backspace in the empty input removes the last tag; × removes any', async () => {
    const before = (await tagState('cb-tags')).tags;
    await page.fill('#cb-tags-input', '');
    await page.keyboard.press('Backspace');
    assert.deepEqual((await tagState('cb-tags')).tags, before.slice(0, -1));
    await page.click('#cb-tags .combobox-tag-remove[data-value="css"]');
    assert.ok(!(await tagState('cb-tags')).tags.includes('CSS'));
  });

  await check('tag input: Escape closes the list; leaving the field closes it too', async () => {
    await page.click('#cb-tags-input');
    await page.keyboard.press('Escape');
    assert.equal((await tagState('cb-tags')).open, false);
    await page.click('#cb-tags-input');
    await page.click('body', { position: { x: 5, y: 5 } });
    assert.equal((await tagState('cb-tags')).open, false);
  });

  await check('tag input without data-creatable: Enter takes the first match, never creates', async () => {
    await page.click('#cb-tags-fixed-input');
    await page.keyboard.type('re');
    let st = await tagState('cb-tags-fixed');
    assert.deepEqual(st.visible, ['Red', 'Green']);
    assert.equal(st.highlighted, 'Red');
    await page.keyboard.press('Enter');
    await page.keyboard.type('purple');
    await page.keyboard.press('Enter');
    st = await tagState('cb-tags-fixed');
    assert.deepEqual(st.values, ['red']);
    assert.equal(st.input, 'purple', 'unknown text stays - nothing was created');
  });

  await check("tag input: the State API opens and closes the list (setState('open' | 'default'))", async () => {
    const pop = '#cb-tags-list';
    const popover = await page.$eval(pop, (l) => l.closest('.combobox-content')!.id);
    await page.$eval('#' + popover, (p: any) => p.api.setState('open'));
    // wait for the state, not a fixed delay: under full-suite load 100ms was
    // not always enough (a flaky failure, never a wrong result)
    await page.waitForFunction((id) => document.getElementById(id)!.matches(':popover-open')
      && document.getElementById('cb-tags-input')!.getAttribute('aria-expanded') === 'true', popover, { timeout: 5000 });
    assert.equal(await page.$eval('#' + popover, (p: any) => p.api.getState().name), 'open');
    await page.$eval('#' + popover, (p: any) => p.api.setState('default'));
    await page.waitForFunction((id) => !document.getElementById(id)!.matches(':popover-open'), popover, { timeout: 5000 });
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.combobox-content[popover][id]', ['default','open'], { runtimeAttrs: ['style','data-highlighted','aria-activedescendant','hidden','aria-expanded'] });
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
