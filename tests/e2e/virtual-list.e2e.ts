import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: the whole point of this component is that the DOM stays small while the
 * list does not. These checks drive a ten-million-row list and assert that the
 * row pool stays tiny, that the last row is actually reachable (the sizer is
 * capped well below ten million rows' worth of pixels, so scroll positions have
 * to be mapped onto the real range), and that recycled rows carry the right
 * content and set-position metadata — a screen reader would otherwise announce
 * "1 of 16" for a list of ten million.
 */

const server = startServer();
const browser = await chromium.launch();
let failures = 0;

const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
};

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}/tests/e2e/virtual-list.e2e-fixture.html`);
  await page.waitForFunction(() => (globalThis as Record<string, unknown>).__fixtureReady === true, null, {
    timeout: 15_000,
  });

  const rowsOf = (sel: string) =>
    page.evaluate((s) => {
      const list = document.querySelector(s)!;
      return Array.from(list.querySelectorAll('.virtual-list-row')).map((r) => ({
        text: (r as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
        index: (r as HTMLElement).dataset.index,
        posinset: r.getAttribute('aria-posinset'),
        setsize: r.getAttribute('aria-setsize'),
      }));
    }, sel);

  const scrollTo = (sel: string, fraction: number) =>
    page.evaluate(
      ([s, f]: [string, number]) => {
        const list = document.querySelector(s)!;
        list.scrollTop = (list.scrollHeight - list.clientHeight) * f;
      },
      [sel, fraction] as [string, number],
    ).then(() => page.waitForTimeout(200));

  await check('virtual-list.js initialized the list (data-init, role, sizer)', async () => {
    const s = await page.evaluate(() => {
      const el = document.querySelector('#vl-huge') as HTMLElement;
      return {
        init: el.dataset.init === '',
        role: el.getAttribute('role'),
        tabindex: el.getAttribute('tabindex'),
        sizer: !!el.querySelector('.virtual-list-sizer'),
        pool: !!el.querySelector('.virtual-list-rows'),
      };
    });
    assert.equal(s.init, true, 'data-init not set');
    assert.equal(s.role, 'list');
    assert.equal(s.tabindex, '0', 'container must be focusable so arrows scroll it');
    assert.ok(s.sizer && s.pool, 'sizer and row pool must exist');
  });

  await check('ten million rows render as a handful of DOM nodes', async () => {
    const rows = await rowsOf('#vl-huge');
    assert.ok(rows.length > 0, 'no rows rendered');
    assert.ok(rows.length < 60, `expected a small window, got ${rows.length} rows in the DOM`);
    assert.equal(rows[0].text, 'Item 1 #1');
    assert.equal(rows[0].setsize, '10000000', 'rows must advertise the real list length');
  });

  await check('the sizer is capped below the browser element-height limit', async () => {
    const px = await page.evaluate(
      () => parseFloat((document.querySelector('#vl-huge .virtual-list-sizer') as HTMLElement).style.height),
    );
    assert.ok(px > 0 && px <= 15_000_000, `sizer height ${px} outside the safe range`);
    assert.ok(px < 10_000_000 * 40, 'sizer should be capped, not the full content height');
  });

  await check('scrolling to the middle shows middle rows, still recycled', async () => {
    await scrollTo('#vl-huge', 0.5);
    const rows = await rowsOf('#vl-huge');
    assert.ok(rows.length < 60, `pool grew to ${rows.length}`);
    const first = Number(rows[0].index);
    assert.ok(first > 4_000_000 && first < 6_000_000, `expected a middle index, got ${first}`);
    assert.equal(rows[0].text, `Item ${first + 1} #${first + 1}`, 'recycled row content must match its index');
    assert.equal(rows[0].posinset, String(first + 1));
  });

  await check('the last row is reachable at the very bottom', async () => {
    await scrollTo('#vl-huge', 1);
    const rows = await rowsOf('#vl-huge');
    assert.equal(rows[rows.length - 1].text, 'Item 10000000 #10000000', 'last row not reached');
  });

  await check('state API: setState("default", { index }) jumps to a row', async () => {
    await page.evaluate(() => (document.querySelector('#vl-huge') as any).api.setState('default', { index: 250_000 }));
    await page.waitForTimeout(200);
    const rows = await rowsOf('#vl-huge');
    const indices = rows.map((r) => Number(r.index));
    assert.ok(
      indices.some((i) => Math.abs(i - 250_000) < 40),
      `row 250000 not in the rendered window (${indices[0]}…${indices[indices.length - 1]})`,
    );
  });

  await check('state API: setState("loading") marks the list busy', async () => {
    await page.evaluate(() => (document.querySelector('#vl-small') as any).api.setState('loading'));
    await page.waitForTimeout(150);
    const s = await page.evaluate(() => {
      const el = document.querySelector('#vl-small') as HTMLElement;
      return {
        busy: el.getAttribute('aria-busy'),
        state: el.dataset.state,
        poolVisible: getComputedStyle(el.querySelector('.virtual-list-rows')!).display,
      };
    });
    assert.equal(s.busy, 'true');
    assert.equal(s.state, 'loading');
    assert.equal(s.poolVisible, 'none', 'rows must be hidden while loading');
  });

  await check('state API: setState("empty") shows the empty message', async () => {
    await page.evaluate(() => (document.querySelector('#vl-small') as any).api.setState('empty'));
    await page.waitForTimeout(150);
    const s = await page.evaluate(() => {
      const el = document.querySelector('#vl-small') as HTMLElement;
      return { state: el.dataset.state, busy: el.getAttribute('aria-busy') };
    });
    assert.equal(s.state, 'empty');
    assert.equal(s.busy, null, 'an empty list is not busy');
  });

  await check('state API: setState("default") brings the rows back', async () => {
    await page.evaluate(() => (document.querySelector('#vl-small') as any).api.setState('default'));
    await page.waitForTimeout(150);
    const rows = await rowsOf('#vl-small');
    assert.ok(rows.length > 0, 'rows did not come back');
    assert.equal(rows[0].text, 'Item 1 #1');
  });

  await check('state API: getState reflects the current state', async () => {
    const state = await page.evaluate(() => (document.querySelector('#vl-small') as any).api.getState());
    assert.equal(state.name, 'default');
  });

  await check('state API: unknown state names throw', async () => {
    const threw = await page.evaluate(() => {
      try {
        (document.querySelector('#vl-small') as any).api.setState('sideways');
        return false;
      } catch {
        return true;
      }
    });
    assert.equal(threw, true, 'unknown state must throw');
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const g = await page.evaluate(() => {
      const ns = (globalThis as any)._defussShadcn;
      return { hasApi: typeof ns.virtualListApi?.setState === 'function', states: ns.virtualListStates };
    });
    assert.equal(g.hasApi, true);
    assert.deepEqual(g.states, ['default', 'loading', 'empty']);
  });

  await check('an empty list rendered from markup shows its message', async () => {
    const s = await page.evaluate(() => {
      const el = document.querySelector('#vl-empty') as HTMLElement;
      return { state: el.dataset.state, text: el.dataset.emptyText };
    });
    assert.equal(s.state, 'empty');
    assert.equal(s.text, 'No results found');
  });

  await check('the empty message is actually painted, not just marked', async () => {
    const shown = await page.evaluate(() => {
      const el = document.querySelector('#vl-empty')!;
      const after = getComputedStyle(el, '::after');
      return { content: after.content, display: after.display };
    });
    assert.ok(
      shown.content.includes('No results found'),
      `empty text must render via ::after, got ${shown.content}`,
    );
    assert.notEqual(shown.display, 'none', 'the empty message must be visible');
  });

  await check('grid: data-columns puts several items in one row', async () => {
    const g = await page.evaluate(() => {
      const el = document.querySelector('#vl-grid') as HTMLElement;
      const row = el.querySelector('.virtual-list-row') as HTMLElement;
      const cells = Array.from(row.querySelectorAll('.virtual-list-cell')) as HTMLElement[];
      return {
        role: el.getAttribute('role'),
        colcount: el.getAttribute('aria-colcount'),
        rowcount: el.getAttribute('aria-rowcount'),
        rowRole: row.getAttribute('role'),
        cells: cells.length,
        indices: cells.map((c) => c.dataset.index),
        columns: getComputedStyle(row).gridTemplateColumns.split(' ').length,
      };
    });
    assert.equal(g.role, 'grid', 'a multi-column list is a grid');
    assert.equal(g.colcount, '3');
    assert.equal(g.rowcount, String(Math.ceil(1_000_000 / 3)), 'row count is items ÷ columns');
    assert.equal(g.rowRole, 'row');
    assert.equal(g.cells, 3, `expected 3 cells per row, got ${g.cells}`);
    assert.deepEqual(g.indices, ['0', '1', '2'], 'cells carry consecutive item indices');
    assert.equal(g.columns, 3, 'the row lays out as three columns');
  });

  await check('grid: the DOM stays small across a million icons', async () => {
    await scrollTo('#vl-grid', 0.5);
    const g = await page.evaluate(() => {
      const el = document.querySelector('#vl-grid')!;
      const cells = Array.from(el.querySelectorAll('.virtual-list-cell')) as HTMLElement[];
      const first = cells.find((c) => !c.hidden)!;
      return { cells: cells.length, firstIndex: Number(first.dataset.index), text: first.innerText.replace(/\s+/g, ' ').trim() };
    });
    assert.ok(g.cells < 120, `expected a small pool, got ${g.cells} cells`);
    assert.ok(g.firstIndex > 400_000 && g.firstIndex < 600_000, `expected a middle item, got ${g.firstIndex}`);
    assert.ok(g.text.includes(String(g.firstIndex + 1)), 'recycled cell content must match its index');
  });

  await check('grid: the short tail row hides its unused cells', async () => {
    await scrollTo('#vl-grid', 1);
    const tail = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#vl-grid .virtual-list-row')) as HTMLElement[];
      const last = rows[rows.length - 1];
      const cells = Array.from(last.querySelectorAll('.virtual-list-cell')) as HTMLElement[];
      return {
        visible: cells.filter((c) => !c.hidden).map((c) => Number(c.dataset.index)),
        hidden: cells.filter((c) => c.hidden).length,
      };
    });
    // 1_000_000 % 3 === 1, so the final row holds exactly one item
    assert.deepEqual(tail.visible, [999_999], `last row should hold only the final item, got ${tail.visible}`);
    assert.equal(tail.hidden, 2, 'the two unused cells must be hidden, not blank tiles');
  });

  await check('sizes map to distinct row heights', async () => {
    const heights = await page.evaluate(() =>
      ['#vl-sm', '#vl-lg'].map(
        (s) => getComputedStyle(document.querySelector(`${s} .virtual-list-row`)!).height,
      ),
    );
    assert.notEqual(heights[0], heights[1], `sm and lg rows should differ, both ${heights[0]}`);
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\nvirtual-list.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('virtual-list.e2e: all checks passed');
