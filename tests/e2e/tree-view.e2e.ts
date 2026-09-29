import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped tree-view component. Loads the fixture
 * (nested branches + leaves, mirroring the doc page) over HTTP in a real
 * browser, then verifies <details>-driven expand/collapse, the aria-expanded
 * sync, keyboard navigation (arrows, Right/Left open/close, Home/End), and
 * the per-branch named State API - the same files consumers copy from dist/,
 * unmodified.
 */

const FIXTURE = '/tests/e2e/tree-view.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const branchOpen = (page: Page, id: string) => page.$eval(`#${id}`, (el) => (el as HTMLDetailsElement).open);
/**
 * Why: checkVisibility() on content inside <details> can return the stale
 * ::details-content content-visibility for a frame after the open flip —
 * observable as a flake when 26 chromiums load at once. Poll with a short
 * bound: the assertion stays exact (visible must become `want`), the wait
 * just absorbs Chromium's invalidation latency.
 */
const leafVisible = (page: Page, want: boolean) =>
  page.waitForFunction(
    (v) => document.querySelector('#tv-demo .tree-leaf')!.checkVisibility() === v,
    want,
    { timeout: 2000 },
  );
const expandedOf = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => el.closest('[role="treeitem"]')!.getAttribute('aria-expanded'));
const focusText = (page: Page) =>
  page.evaluate(() => document.activeElement?.textContent?.trim());

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

  await check('tree-view.js initialized the tree (data-init)', async () => {
    await page.waitForFunction(() => document.querySelectorAll('.tree[role="tree"]:not([data-init])').length === 0);
  });

  await check('tree-view.css applied (indent guide + trigger layout)', async () => {
    const style = await page.$eval('#tv-demo .tree-group', (el) => {
      const cs = getComputedStyle(el);
      return { padding: cs.paddingInlineStart, border: cs.borderInlineStartWidth };
    });
    assert.notEqual(style.padding, '0px', 'nested groups are indented');
  });

  await check('authored states respected: outer open, inner closed', async () => {
    assert.equal(await branchOpen(page, 'tv-src'), true);
    assert.equal(await branchOpen(page, 'tv-components'), false);
    assert.equal(await expandedOf(page, 'tv-src'), 'true');
    assert.equal(await expandedOf(page, 'tv-components'), 'false');
  });

  await check('leaf hidden inside the closed branch becomes visible on expand', async () => {
    await leafVisible(page, false); // hidden while its branch is closed
    await page.click('#tv-components > .tree-branch-trigger');
    // <details> fires `toggle` asynchronously - wait for the (slower) ARIA
    // sync rather than the synchronous `open` flip
    await page.waitForFunction(
      () =>
        document
          .querySelector('#tv-components')!
          .closest('[role="treeitem"]')!
          .getAttribute('aria-expanded') === 'true',
    );
    assert.equal(await branchOpen(page, 'tv-components'), true);
    await leafVisible(page, true);
  });

  await check('ArrowRight expands / ArrowLeft collapses the focused branch', async () => {
    await page.click('#tv-components > .tree-branch-trigger'); // collapse (native summary click)
    await page.waitForFunction(() => !(document.querySelector('#tv-components') as HTMLDetailsElement).open);
    await page.focus('#tv-components > .tree-branch-trigger');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => (document.querySelector('#tv-components') as HTMLDetailsElement).open);
    assert.equal(await branchOpen(page, 'tv-components'), true);
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => !(document.querySelector('#tv-components') as HTMLDetailsElement).open);
    assert.equal(await branchOpen(page, 'tv-components'), false);
  });

  await check('ArrowDown/ArrowUp move focus between visible items', async () => {
    await page.focus('#tv-src > .tree-branch-trigger');
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusText(page), 'components');
    await page.keyboard.press('ArrowUp');
    assert.equal(await focusText(page), 'src');
  });

  await check('ArrowLeft collapses an open branch (and aria-expanded follows)', async () => {
    await page.focus('#tv-src > .tree-branch-trigger');
    await page.keyboard.press('ArrowLeft');
    // wait on the async toggle event's ARIA sync (implies the open flip)
    await page.waitForFunction(
      () =>
        document
          .querySelector('#tv-src')!
          .closest('[role="treeitem"]')!
          .getAttribute('aria-expanded') === 'false',
    );
    assert.equal(await branchOpen(page, 'tv-src'), false);
    assert.equal(await expandedOf(page, 'tv-src'), 'false');
    await page.keyboard.press('ArrowRight'); // restore for later checks
    await page.waitForFunction(
      () =>
        document
          .querySelector('#tv-src')!
          .closest('[role="treeitem"]')!
          .getAttribute('aria-expanded') === 'true',
    );
    assert.equal(await branchOpen(page, 'tv-src'), true);
  });

  await check('Home/End jump to first/last visible item', async () => {
    // focus the visible index.ts leaf (button.tsx/dialog.tsx sit in the closed branch)
    await page.evaluate(() => {
      const leaves = Array.from(document.querySelectorAll<HTMLElement>('#tv-demo .tree-leaf'));
      leaves.find((l) => l.checkVisibility())!.focus();
    });
    await page.keyboard.press('Home');
    assert.equal(await focusText(page), 'src');
    await page.keyboard.press('End');
    assert.equal(await focusText(page), 'index.ts', 'End lands on the last visible item');
  });

  // -- State API (AGENTS.md "State API"), bound per branch --------------------
  const setState = (page: Page, id: string, state: string) =>
    page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check("state API: setState('expanded') opens a closed branch", async () => {
    assert.equal(await branchOpen(page, 'tv-components'), false, 'starts closed (authored)');
    await setState(page, 'tv-components', 'expanded');
    await page.waitForFunction(() => (document.querySelector('#tv-components') as HTMLDetailsElement).open);
    // the toggle event lands async - wait for the ARIA sync before asserting
    await page.waitForFunction(
      () =>
        document
          .querySelector('#tv-components')!
          .closest('[role="treeitem"]')!
          .getAttribute('aria-expanded') === 'true',
    );
    assert.equal(await expandedOf(page, 'tv-components'), 'true', 'aria-expanded followed via toggle');
    const state = await page.$eval('#tv-components', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'expanded');
  });

  await check("state API: setState('default') restores the authored (closed) state", async () => {
    await setState(page, 'tv-components', 'default');
    assert.equal(await branchOpen(page, 'tv-components'), false, 'authored closed state restored');
  });

  await check("state API: getState reflects summary clicks (no setState involved)", async () => {
    await page.click('#tv-components > .tree-branch-trigger');
    const state = await page.$eval('#tv-components', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'expanded', 'toggle moved the named state');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#tv-src') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states (camelCase)', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.treeViewApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.treeViewStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#tv-src'),
    }));
    assert.ok(reg.hasApi, 'df$.treeViewApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'expanded']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('tree-view: density "compact" → padding-top 2px', async () => {
    const val = await page.$eval('#tvd-compact .tree-leaf', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '2px');
  });

  await check('tree-view: density "comfortable" → padding-top 4px', async () => {
    const val = await page.$eval('#tvd-comfortable .tree-leaf', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '4px');
  });

  await check('tree-view: density "spacious" → padding-top 6px', async () => {
    const val = await page.$eval('#tvd-spacious .tree-leaf', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '6px');
  });
  await check('tree-view: variant "guides" draws a 1px guideline per nested group', async () => {
    const guides = await page.evaluate(() =>
      [...document.querySelectorAll('#tvg .tree-group')].map((g) => {
        const b = getComputedStyle(g, '::before');
        return { content: b.content, width: b.borderInlineStartWidth, height: parseFloat(b.height) };
      }),
    );
    assert.equal(guides.length, 2);
    for (const g of guides) {
      assert.equal(g.content, '""');
      assert.equal(g.width, '1px');
      assert.ok(g.height > 0, 'guideline spans the group');
    }
  });

  await check('tree-view: the guideline sits under the parent chevron centre', async () => {
    for (const [trigger, group] of [['tvg-src', 'tvg-g1'], ['tvg-ui', 'tvg-g2']]) {
      const [chevron, line] = await page.evaluate(([tId, gId]) => {
        const c = document.querySelector(`#${tId} svg`)!.getBoundingClientRect();
        const g = document.getElementById(gId)!;
        const b = getComputedStyle(g, '::before');
        return [c.left + c.width / 2, g.getBoundingClientRect().left + parseFloat(b.left) + 0.5];
      }, [trigger, group]);
      assert.ok(Math.abs(chevron - line) <= 1, `${group}: line x ${line} vs chevron centre ${chevron}`);
    }
  });

  await check('tree-view: the default tree draws no guideline', async () => {
    const content = await page.$eval('#tv-demo .tree-group', (g) => getComputedStyle(g, '::before').content);
    assert.equal(content, 'none');
  });

  await check('tree-view: guides - only the innermost focused level darkens', async () => {
    const color = (id: string) => page.$eval(`#${id}`, (g) => getComputedStyle(g, '::before').borderInlineStartColor);
    const [outerRest, innerRest] = [await color('tvg-g1'), await color('tvg-g2')];
    assert.equal(outerRest, innerRest, 'at rest both levels share the border color');
    await page.focus('#tvg-leaf');
    const [outerFocus, innerFocus] = [await color('tvg-g1'), await color('tvg-g2')];
    assert.notEqual(innerFocus, innerRest, 'the focused level darkens');
    assert.equal(outerFocus, outerRest, 'outer levels stay at rest');
  });
  const sel = (id: string) => page.$eval('#' + id, (el) => el.getAttribute('aria-selected'));

  await check('tree-view: data-selectable marks every operable item (authored true kept, disabled left out)', async () => {
    assert.equal(await sel('tvs-inbox'), 'true');
    assert.equal(await sel('tvs-sent'), 'false');
    assert.equal(await sel('tvs-archive'), 'false');
    assert.equal(await sel('tvs-locked'), null, 'disabled items carry no aria-selected');
  });

  await check('tree-view: the selected row is visibly distinct (tinted surface + weight)', async () => {
    const [on, off] = await page.evaluate(() => ['#tvs-inbox', '#tvs-sent'].map((id) => {
      const cs = getComputedStyle(document.querySelector(id + ' > .tree-leaf')!);
      return { bg: cs.backgroundColor, weight: cs.fontWeight };
    }));
    assert.notEqual(on.bg, off.bg, 'selected row has its own surface');
    assert.equal(on.weight, '500');
  });

  await check('tree-view: clicking a leaf selects it, deselects the rest, fires tree-select', async () => {
    await page.evaluate(() => {
      (globalThis as any).__picked = [];
      document.getElementById('tvs')!.addEventListener('tree-select', (e: Event) => (globalThis as any).__picked.push((e as CustomEvent).detail.item.id));
    });
    await page.click('#tvs-sent > .tree-leaf');
    assert.equal(await sel('tvs-sent'), 'true');
    assert.equal(await sel('tvs-inbox'), 'false');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__picked), ['tvs-sent']);
  });

  await check('tree-view: Enter / Space select from the keyboard', async () => {
    await page.focus('#tvs-inbox > .tree-leaf');
    await page.keyboard.press('Enter');
    assert.equal(await sel('tvs-inbox'), 'true');
    await page.focus('#tvs-sent > .tree-leaf');
    await page.keyboard.press(' ');
    assert.equal(await sel('tvs-sent'), 'true');
    assert.equal(await sel('tvs-inbox'), 'false');
  });

  await check('tree-view: clicking a branch toggles AND selects it', async () => {
    await page.click('#tvs-archive-branch > summary');
    assert.equal(await page.$eval('#tvs-archive-branch', (d) => (d as HTMLDetailsElement).open), true);
    assert.equal(await sel('tvs-archive'), 'true');
  });

  await check('tree-view: a disabled leaf is dimmed and cannot be selected (click / Enter)', async () => {
    const opacity = await page.$eval('#tvs-locked > .tree-leaf', (el) => getComputedStyle(el).opacity);
    assert.equal(opacity, '0.5');
    await page.click('#tvs-locked > .tree-leaf', { force: true }); // Playwright skips aria-disabled targets - a real user click still lands
    await page.focus('#tvs-locked > .tree-leaf');
    await page.keyboard.press('Enter');
    assert.equal(await sel('tvs-locked'), null);
    assert.equal(await sel('tvs-archive'), 'true', 'the previous selection is kept');
  });

  await check('tree-view: a disabled branch stays focusable but never opens (click / Enter / Space / ArrowRight)', async () => {
    const opacity = await page.$eval('#tvs-legal-branch > summary', (el) => getComputedStyle(el).opacity);
    assert.equal(opacity, '0.5', 'the branch row is dimmed');
    await page.click('#tvs-legal-branch > summary', { force: true });
    for (const key of ['Enter', ' ', 'ArrowRight']) {
      await page.focus('#tvs-legal-branch > summary');
      await page.keyboard.press(key);
    }
    assert.equal(await page.$eval('#tvs-legal-branch', (d) => (d as HTMLDetailsElement).open), false);
    assert.equal(await page.evaluate(() => document.activeElement?.closest('#tvs-legal') !== null), true, 'focus stays on it');
  });

  await check('tree-view: a disabled link leaf does not navigate', async () => {
    await page.click('#tvs-link-disabled', { force: true });
    assert.notEqual(await page.evaluate(() => location.hash), '#never');
  });

  await check('tree-view: link leaves render without underline and select on click', async () => {
    const deco = await page.$eval('#tvs-link', (el) => getComputedStyle(el).textDecorationLine);
    assert.equal(deco, 'none');
    await page.click('#tvs-link');
    assert.equal(await sel('tvs-link-item'), 'true');
    assert.equal(await page.evaluate(() => location.hash), '#linked');
  });

  await check('tree-view: an empty branch shows the placeholder row (default + data-empty text)', async () => {
    const [def, custom] = await page.evaluate(() => ['#tvs-empty-default', '#tvs-empty-custom'].map((id) => getComputedStyle(document.querySelector(id)!, '::after').content));
    assert.equal(def, '"Empty"');
    assert.equal(custom, '"No reports yet"', 'whitespace-only group still counts as empty');
  });

  await check('tree-view: a long label truncates with an ellipsis instead of overflowing', async () => {
    const r = await page.$eval('#tvs-long', (el) => ({
      overflow: getComputedStyle(el).textOverflow,
      clipped: el.scrollWidth > el.clientWidth,
      inside: el.getBoundingClientRect().right <= document.getElementById('tvs')!.getBoundingClientRect().right + 0.5,
    }));
    assert.equal(r.overflow, 'ellipsis');
    assert.ok(r.clipped, 'the label is actually cut');
    assert.ok(r.inside, 'the label stays inside the tree');
  });

  const boxState = (id: string) => page.$eval(`#${id} > .tree-leaf > .tree-check, #${id} > details > summary > .tree-check`, (b) => ((b as HTMLInputElement).indeterminate ? 'mixed' : String((b as HTMLInputElement).checked)));
  const order = (id: string) => page.$$eval(`#${id} > details > .tree-group > li`, (ls) => ls.map((l) => l.id));

  await check('checkable: authored state rolls up (mixed folders), a checked folder cascades down, aria-checked mirrors', async () => {
    assert.equal(await boxState('tc-cmp'), 'mixed');
    assert.equal(await boxState('tc-src'), 'mixed');
    assert.equal(await boxState('tc-g'), 'true', 'docs checked → its children');
    assert.equal(await page.getAttribute('#tc-src', 'aria-checked'), 'mixed');
    const label = await page.$eval('#tc-a .tree-check', (b) => document.getElementById(b.getAttribute('aria-labelledby')!)?.textContent);
    assert.equal(label, 'a.ts', 'the row label names the checkbox');
  });

  await check('checkable: checking a folder checks its subtree; the last child completes the parent', async () => {
    let values: string[] = [];
    await page.$eval('#tc', (tree) => tree.addEventListener('tree-check', (e) => ((globalThis as unknown as { __v: string[] }).__v = (e as CustomEvent).detail.values)));
    await page.click('#tc-cmp > details > summary > .tree-check');
    assert.equal(await boxState('tc-b'), 'true');
    assert.equal(await boxState('tc-cmp'), 'true');
    assert.equal(await boxState('tc-src'), 'mixed', 'index.ts still unchecked');
    assert.equal(await page.$eval('#tc-cmp > details', (d) => (d as HTMLDetailsElement).open), true, 'the box did not toggle the folder');
    await page.click('#tc-idx .tree-leaf > span'); // a click on a leaf name ticks it
    assert.equal(await boxState('tc-src'), 'true');
    values = await page.evaluate(() => (globalThis as unknown as { __v: string[] }).__v);
    assert.deepEqual(values.sort(), ['a', 'b', 'components', 'docs', 'guide', 'index', 'src']);
  });

  await check('checkable: Space on a focused row ticks its box (a folder does not toggle open)', async () => {
    await page.focus('#tc-docs > details > summary');
    await page.keyboard.press(' ');
    assert.equal(await boxState('tc-docs'), 'false');
    assert.equal(await boxState('tc-g'), 'false');
    assert.equal(await page.$eval('#tc-docs > details', (d) => (d as HTMLDetailsElement).open), true);
  });

  await check('checkable="independent": no cascade, no roll-up', async () => {
    await page.click('#ti-p > details > summary > .tree-check');
    assert.equal(await boxState('ti-p'), 'true');
    assert.equal(await boxState('ti-w'), 'false');
    assert.equal(await boxState('ti-r'), 'true');
  });

  await check('sortable: rows are draggable; Alt+ArrowDown / Alt+ArrowUp move among siblings (focus kept, tree-reorder fires)', async () => {
    assert.equal(await page.getAttribute('#ts-1 .tree-leaf', 'draggable'), 'true');
    await page.$eval('#ts', (tree) => tree.addEventListener('tree-reorder', (e) => ((globalThis as unknown as { __r: number }).__r = (e as CustomEvent).detail.index)));
    await page.focus('#ts-1 .tree-leaf');
    await page.keyboard.press('Alt+ArrowDown');
    assert.deepEqual(await order('ts-m'), ['ts-2', 'ts-1', 'ts-3']);
    assert.equal(await page.evaluate(() => document.activeElement?.closest('li')?.id), 'ts-1');
    assert.equal(await page.evaluate(() => (globalThis as unknown as { __r: number }).__r), 1);
    await page.keyboard.press('Alt+ArrowUp');
    assert.deepEqual(await order('ts-m'), ['ts-1', 'ts-2', 'ts-3']);
  });

  await check('sortable: drag onto the lower half of a row puts it after; onto a folder middle moves it inside', async () => {
    await page.locator('#ts-3 .tree-leaf').dragTo(page.locator('#ts-1 .tree-leaf'), { targetPosition: { x: 20, y: 22 } });
    assert.deepEqual(await order('ts-m'), ['ts-1', 'ts-3', 'ts-2']);
    await page.locator('#ts-u .tree-leaf').dragTo(page.locator('#ts-f > details > summary'), { targetPosition: { x: 40, y: 14 } });
    assert.deepEqual(await order('ts-f'), ['ts-4', 'ts-u']);
    // a folder can't move into itself
    await page.locator('#ts-m > details > summary').dragTo(page.locator('#ts-2 .tree-leaf'));
    assert.equal(await page.$eval('#ts-m', (m) => m.parentElement!.id), 'ts');
    assert.equal(await page.$$eval('#ts [data-drop], #ts [data-dragging]', (l) => l.length), 0, 'no leftover markers');
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ntree-view.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('tree-view.e2e: all checks passed');
