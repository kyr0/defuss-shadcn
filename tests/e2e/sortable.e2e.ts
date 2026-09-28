import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped sortable component. Loads the fixture
 * (vertical list + horizontal list with a locked item, mirroring the doc
 * page) over HTTP in a real browser, then verifies roving focus, Alt+Arrow
 * reordering, the live-region announcements, the change event, locked items,
 * and the named State API (order restore + live order/activeIndex) - the same
 * files consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/sortable.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const order = (page: Page, id: string) =>
  page.$$eval(`#${id} .sortable-item`, (els) =>
    els.map((el) => el.querySelector('span:not(.sortable-handle)')!.textContent!.trim()),
  );
const focusLabel = (page: Page) =>
  page.evaluate(() => document.activeElement?.querySelector('span:last-child')?.textContent?.trim());

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

  await check('sortable.js initialized lists + live region (data-init)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.sortable:not([data-init])').length === 0,
    );
    // count against the live DOM (the density instances add lists)
    const live = await page.$$eval('.sortable-live', (els) => ({
      count: els.length,
      lists: document.querySelectorAll('.sortable').length,
      allAssertive: els.every((el) => el.getAttribute('aria-live') === 'assertive'),
    }));
    assert.equal(live.count, live.lists, 'one live region per list');
    assert.ok(live.allAssertive, 'every live region is assertive');
  });

  await check('roving tabindex: first item tabbable', async () => {
    const t = await page.$$eval('#sb-vertical .sortable-item', (els) =>
      els.map((el) => el.getAttribute('tabindex')),
    );
    assert.deepEqual(t, ['0', '-1', '-1']);
  });

  await check('ArrowDown moves the active item; Home/End jump', async () => {
    await page.focus('#sb-vertical .sortable-item:nth-child(1)');
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusLabel(page), 'Write documentation');
    await page.keyboard.press('End');
    assert.equal(await focusLabel(page), 'Deploy to production');
    await page.keyboard.press('Home');
    assert.equal(await focusLabel(page), 'Build components');
  });

  await check('Alt+ArrowDown reorders the item and announces the move', async () => {
    await page.focus('#sb-vertical .sortable-item:nth-child(1)');
    await page.keyboard.press('Alt+ArrowDown');
    assert.deepEqual(await order(page, 'sb-vertical'), [
      'Write documentation',
      'Build components',
      'Deploy to production',
    ]);
    // live region announces asynchronously (double rAF in the component)
    await page.waitForFunction(
      () => document.querySelector('.sortable-live')!.textContent!.includes('position 2'),
    );
    const text = await page.$eval('.sortable-live', (el) => el.textContent);
    assert.match(text!, /Build components, moved to position 2 of 3/);
  });

  await check('reorder dispatches sortable-change (order-independent)', async () => {
    // whatever the current order, Alt+ArrowDown moves the active item one down
    const before = await order(page, 'sb-vertical');
    const detail = await page.evaluate(
      () =>
        new Promise<{ index: number; label: string }>((resolve) => {
          document.querySelector('#sb-vertical')!.addEventListener(
            'sortable-change',
            (e) => {
              const d = e as CustomEvent;
              const src = (d.detail.item ?? document.activeElement) as HTMLElement;
              resolve({
                index: d.detail.index,
                label: src.querySelector('span:last-child')?.textContent?.trim() ?? '',
              });
            },
            { once: true },
          );
          const target = document.querySelector('#sb-vertical [data-active]') as HTMLElement;
          target.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }),
          );
        }),
    );
    const after = await order(page, 'sb-vertical');
    assert.notDeepEqual(after, before, 'the list actually changed');
    assert.equal(after[detail.index], detail.label, 'event reports the moved item at its new index');
  });

  await check('Alt+Arrow reverts on the locked item (keyboard skips it)', async () => {
    // horizontal list: focus beta (index 1), Alt+Right would swap with locked
    await page.focus('#sb-horizontal .sortable-item:nth-child(2)');
    await page.keyboard.press('Alt+ArrowRight');
    assert.deepEqual(await order(page, 'sb-horizontal'), ['alpha', 'beta', 'locked'], 'locked stays last');
    // plain arrow also skips it
    await page.keyboard.press('ArrowRight');
    assert.equal(await focusLabel(page), 'beta', 'ArrowRight stops before the locked item');
    await page.focus('#sb-horizontal .sortable-item:nth-child(1)');
    await page.keyboard.press('End');
    assert.equal(await focusLabel(page), 'beta', 'End lands on the last *enabled* item');
    assert.equal(
      await page.$eval('#sb-horizontal .sortable-item:nth-child(3)', (el) => el.getAttribute('tabindex')),
      '-1',
      'locked item never gets the roving stop',
    );
  });

  // -- locked item in the middle: a fixed slot, never pushed ---------------------
  const AUTHORED = ['Configure database', 'Set up CI/CD', 'Security review', 'Deploy application', 'Monitor rollout', 'Write postmortem'];
  const resetLocked = () => page.$eval('#sb-locked', (el) => (el as HTMLElement & { api: { setState(n: string): void } }).api.setState('default'));

  await check('locked middle row: Alt+Up past it keeps it in place (keyboard)', async () => {
    await resetLocked();
    // "Deploy application" sits right below the lock; one Alt+Up steps over it
    await page.focus('#sb-locked .sortable-item:nth-child(4)');
    await page.keyboard.press('Alt+ArrowUp');
    const after = await order(page, 'sb-locked');
    assert.equal(after[2], 'Security review', 'the locked row is still third');
    assert.deepEqual(after, ['Configure database', 'Deploy application', 'Security review', 'Set up CI/CD', 'Monitor rollout', 'Write postmortem'], 'moved item takes the free slot above; its neighbour shifts across');
    assert.equal(await focusLabel(page), 'Deploy application', 'focus follows the moved item');
    await page.waitForFunction(() => document.querySelector('#sb-locked + .sortable-live')?.textContent?.includes('position 2 of 6'));
  });

  await check('locked middle row: dragging an item from above it to the bottom keeps it in place', async () => {
    await resetLocked();
    // synthetic HTML5 drag: Configure database → dropped after Write postmortem
    await page.evaluate(() => {
      const items = [...document.querySelectorAll('#sb-locked .sortable-item')] as HTMLElement[];
      const src = items[0];
      const dst = items[5];
      const dt = new DataTransfer();
      const r = dst.getBoundingClientRect();
      const at = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 5, clientY: r.bottom - 2 };
      src.dispatchEvent(new DragEvent('dragstart', at));
      dst.dispatchEvent(new DragEvent('dragover', at));
      dst.dispatchEvent(new DragEvent('drop', at));
      src.dispatchEvent(new DragEvent('dragend', at));
    });
    const after = await order(page, 'sb-locked');
    assert.equal(after[2], 'Security review', 'the locked row is still third - the divider did not climb');
    assert.deepEqual(after, ['Set up CI/CD', 'Deploy application', 'Security review', 'Monitor rollout', 'Write postmortem', 'Configure database'], 'two items stay above the divider, three below');
  });

  await check('locked middle row: the locked item itself cannot be picked up or focused', async () => {
    await resetLocked();
    assert.deepEqual(await order(page, 'sb-locked'), AUTHORED, 'reset restores the authored order');
    const lockedDraggable = await page.$eval('#sb-locked .sortable-item:nth-child(3)', (el) => el.getAttribute('draggable'));
    assert.notEqual(lockedDraggable, 'true', 'not draggable');
    await page.focus('#sb-locked .sortable-item:nth-child(2)');
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusLabel(page), 'Deploy application', 'ArrowDown skips the locked row');
  });

  await check('horizontal orientation uses Left/Right', async () => {
    await page.focus('#sb-horizontal .sortable-item:nth-child(1)');
    await page.keyboard.press('ArrowRight');
    assert.equal(await focusLabel(page), 'beta');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  await check("state API: setState('default') restores the authored order", async () => {
    await page.$eval('#sb-vertical', (el) => (el as HTMLElement).api!.setState('default'));
    assert.deepEqual(await order(page, 'sb-vertical'), [
      'Build components',
      'Write documentation',
      'Deploy to production',
    ]);
  });

  await check("state API: { index } activates an item; getState reports it", async () => {
    await page.$eval('#sb-vertical', (el) =>
      (el as HTMLElement).api!.setState('default', { index: 2 }),
    );
    const state = await page.$eval('#sb-vertical', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
    assert.equal(state.config.activeIndex, 2, 'active item tracked');
    assert.deepEqual(state.config.order, [
      'Build components',
      'Write documentation',
      'Deploy to production',
    ]);
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#sb-vertical') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.sortableApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.sortableStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#sb-vertical'),
    }));
    assert.ok(reg.hasApi, 'df$.sortableApi.setState missing');
    assert.deepEqual(reg.states, ['default']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  const labels = (id: string) =>
    page.$$eval(`#${id} .sortable-item`, (els) => els.map((el) => el.querySelector('span:not(.sortable-handle)')!.textContent!.trim()));

  await check('move buttons: labelled per item, Up disabled on the first and Down on the last', async () => {
    const r = await page.$$eval('#sb-moves .sortable-move', (bs) => bs.map((b) => [b.getAttribute('aria-label'), (b as HTMLButtonElement).disabled]));
    assert.deepEqual(r, [
      ['Move Alpha up', true], ['Move Alpha down', false],
      ['Move Beta up', false], ['Move Beta down', false],
      ['Move Gamma up', false], ['Move Gamma down', true],
    ]);
  });

  await check('move buttons: a tap moves the item, announces it, and focus stays on the button', async () => {
    const events: unknown[] = [];
    await page.exposeFunction('__mvEvent', (d: unknown) => events.push(d));
    await page.$eval('#sb-moves', (l) => l.addEventListener('sortable-change', (e: any) => (globalThis as any).__mvEvent(e.detail.index)));
    await page.click('#mv-a .sortable-move[data-move="down"]');
    assert.deepEqual(await labels('sb-moves'), ['Beta', 'Alpha', 'Gamma']);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Move Alpha down');
    await page.waitForTimeout(50);
    assert.equal(await page.$eval('#sb-moves + .sortable-live', (el) => el.textContent), 'Alpha, moved to position 2 of 3');
    await page.keyboard.press('Enter'); // the focused button again
    assert.deepEqual(await labels('sb-moves'), ['Beta', 'Gamma', 'Alpha']);
    assert.deepEqual(events, [1, 2]);
  });

  await check('move buttons: at the edge the pressed button disables and focus passes to its twin', async () => {
    const r = await page.evaluate(() => ({
      downDisabled: (document.querySelector('#mv-a .sortable-move[data-move="down"]') as HTMLButtonElement).disabled,
      focus: document.activeElement?.getAttribute('aria-label'),
    }));
    assert.deepEqual(r, { downDisabled: true, focus: 'Move Alpha up' });
    await page.click('#mv-a .sortable-move[data-move="up"]');
    await page.click('#mv-a .sortable-move[data-move="up"]');
    assert.deepEqual(await labels('sb-moves'), ['Alpha', 'Beta', 'Gamma']);
  });

  /** A native drag, event by event: dragstart on the source, dragover +
   *  drop at a point on the target (pos = offset inside it; default its
   *  centre), dragend on the source - real DragEvents with a real
   *  DataTransfer, so the component's own handlers do the work. Playwright's
   *  drag emulation is not used here: it silently drops drags after focus
   *  changes or a repeat drag of the same element (flaky, and reproducible
   *  with the pre-change sortable.js too). */
  const drag = async (src: string, dst: string, pos?: { x: number; y: number }) => {
    await page.evaluate(([src, dst, pos]) => {
      const source = document.querySelector(src as string)!;
      const target = document.querySelector(dst as string)!;
      const r = target.getBoundingClientRect();
      const p = pos as { x: number; y: number } | null;
      const at = { clientX: r.left + (p ? p.x : r.width / 2), clientY: r.top + (p ? p.y : r.height / 2) };
      const dataTransfer = new DataTransfer();
      const fire = (el: Element, type: string, extra = {}) =>
        el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer, ...extra }));
      fire(source, 'dragstart');
      const over = document.elementFromPoint(at.clientX, at.clientY) ?? target;
      fire(over, 'dragover', at);
      fire(over, 'drop', at);
      fire(source, 'dragend');
    }, [src, dst, pos ?? null]);
    await page.waitForTimeout(50);
  };

  await check('connected lists: dragging an item into the other list moves it there (before the hovered row)', async () => {
    await drag('#bi-1', '#bi-3', { x: 20, y: 4 });
    assert.deepEqual([await labels('bin-a'), await labels('bin-b')], [['Two'], ['One', 'Three']]);
  });

  await check('connected lists: an item that arrived can be reordered and dragged back', async () => {
    await drag('#bi-1', '#bi-3', { x: 20, y: 30 });
    assert.deepEqual(await labels('bin-b'), ['Three', 'One']);
    await drag('#bi-1', '#bi-2', { x: 20, y: 4 });
    assert.deepEqual([await labels('bin-a'), await labels('bin-b')], [['One', 'Two'], ['Three']]);
  });

  await check('connected lists: an emptied list stays a drop zone and accepts a drop at the end', async () => {
    await drag('#bi-3', '#bi-2', { x: 20, y: 30 });
    const zone = await page.$eval('#bin-b', (l) => ({ h: l.getBoundingClientRect().height, text: getComputedStyle(l, '::before').content, border: getComputedStyle(l).borderTopStyle }));
    assert.deepEqual([await labels('bin-b'), zone.text, zone.border], [[], '"Drop here"', 'dashed']);
    assert.ok(zone.h >= 44, 'empty zone keeps a height, got ' + zone.h);
    await drag('#bi-2', '#bin-b');
    assert.deepEqual([await labels('bin-a'), await labels('bin-b')], [['One', 'Three'], ['Two']]);
  });

  await check('connected lists: both lists report the move (detail.from / detail.to)', async () => {
    await page.evaluate(() => {
      (globalThis as any).__bin = [];
      for (const id of ['bin-a', 'bin-b']) {
        document.getElementById(id)!.addEventListener('sortable-change', (e: any) => {
          (globalThis as any).__bin.push(id + ':' + e.detail.index + ':' + (e.detail.from?.id ?? '-') + ':' + (e.detail.to?.id ?? '-'));
        }, { once: true });
      }
    });
    await drag('#bi-1', '#bin-b');
    assert.deepEqual([await labels('bin-a'), await labels('bin-b')], [['Three'], ['Two', 'One']]);
    assert.deepEqual((await page.evaluate(() => (globalThis as any).__bin)).sort(), ['bin-a:-1:-:bin-b', 'bin-b:1:bin-a:-']);
  });

  await check('connected lists: Alt+ArrowLeft / Alt+ArrowRight move the focused item between lists', async () => {
    await page.focus('#bi-2');
    await page.keyboard.press('Alt+ArrowLeft');
    assert.deepEqual([await labels('bin-a'), await labels('bin-b')], [['Two', 'Three'], ['One']]);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'bi-2');
    await page.waitForTimeout(50);
    assert.equal(await page.$eval('#bin-a + .sortable-live', (el) => el.textContent), 'Two, moved to Backlog, position 1 of 2');
    await page.keyboard.press('Alt+ArrowRight');
    assert.deepEqual([await labels('bin-a'), await labels('bin-b')], [['Three'], ['Two', 'One']]);
    // roving tabindex repaired in the list it left
    assert.equal(await page.$eval('#bi-3', (el) => el.getAttribute('tabindex')), '0');
  });

  await check('connected lists: a list outside the group rejects the drop', async () => {
    await drag('#bi-3', '#bi-4');
    assert.deepEqual([await labels('bin-a'), await labels('bin-solo')], [['Three'], ['Four']]);
  });

  await check('sortable: density "compact" → padding-top 6px', async () => {
    const val = await page.$eval('#srt-compact .sortable-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '6px');
  });

  await check('sortable: density "compact" → padding-left 8px', async () => {
    const val = await page.$eval('#srt-compact .sortable-item', (el) => getComputedStyle(el).paddingLeft);
    assert.equal(val, '8px');
  });

  await check('sortable: density "comfortable" → padding-top 8px', async () => {
    const val = await page.$eval('#srt-comfortable .sortable-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '8px');
  });

  await check('sortable: density "comfortable" → padding-left 12px', async () => {
    const val = await page.$eval('#srt-comfortable .sortable-item', (el) => getComputedStyle(el).paddingLeft);
    assert.equal(val, '12px');
  });

  await check('sortable: density "spacious" → padding-top 10px', async () => {
    const val = await page.$eval('#srt-spacious .sortable-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '10px');
  });

  await check('sortable: density "spacious" → padding-left 16px', async () => {
    const val = await page.$eval('#srt-spacious .sortable-item', (el) => getComputedStyle(el).paddingLeft);
    assert.equal(val, '16px');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nsortable.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('sortable.e2e: all checks passed');
