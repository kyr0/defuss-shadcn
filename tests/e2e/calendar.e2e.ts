import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped calendar component. Loads the fixture
 * (month navigation + generated grid, mirroring the doc page) over HTTP in a
 * real browser, then verifies the rendered grid, month navigation, day
 * selection with its custom event, today/outside markers, keyboard cell
 * movement, and the named State API (view reset/preset) — the same files
 * consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/calendar.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const heading = (page: Page) => page.$eval('#cal-default .calendar-heading', (el) => el.textContent!.trim());
const dayCount = (page: Page) => page.$$eval('#cal-default .calendar-day:not([data-outside])', (els) => els.length);
const selectedDay = (page: Page) =>
  page.$eval('#cal-default .calendar-day[data-selected] button', (el) => el.textContent).catch(() => null);

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

  await check('calendar.js rendered a grid for the current month', async () => {
    await page.waitForFunction(() => document.querySelectorAll('#cal-default .calendar-day').length > 0);
    const now = new Date();
    const monthName = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(now);
    assert.equal(await heading(page), `${monthName} ${now.getFullYear()}`);
    // cells per day of the month (not day-of-month!): days-in-month for view
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    assert.equal(await dayCount(page), daysInMonth, 'one cell per day of the month');
    // day labels row
    assert.equal(await page.$$eval('#cal-default .calendar-day-label', (els) => els.length), 7);
  });

  await check('calendar.css applied (grid + button sizing)', async () => {
    const style = await page.$eval('#cal-default', (el) => {
      const cs = getComputedStyle(el);
      return { padding: cs.padding, radius: cs.borderTopLeftRadius };
    });
    assert.notEqual(style.padding, '0px', 'padded surface');
  });

  await check('today is marked with data-today', async () => {
    const today = await page.$eval('#cal-default .calendar-day[data-today] button', (el) => el.textContent);
    assert.equal(Number(today), new Date().getDate());
  });

  await check('leading/trailing days are marked data-outside', async () => {
    const outside = await page.$$eval('#cal-default .calendar-day[data-outside] button', (els) =>
      els.map((el) => el.dataset.outside),
    );
    assert.ok(outside.includes('prev') && outside.includes('next'), 'both spillovers rendered');
  });

  await check('next/prev month navigation updates the heading', async () => {
    await page.click('#cal-default [data-action="next-month"]');
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const monthName = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(next);
    assert.equal(await heading(page), `${monthName} ${next.getFullYear()}`);
    assert.equal(
      await dayCount(page),
      new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
      'grid holds the full next month',
    );
    await page.click('#cal-default [data-action="prev-month"]');
    const now = new Date();
    const cur = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(now);
    assert.equal(await heading(page), `${cur} ${now.getFullYear()}`, 'back to today');
  });

  await check('clicking a day selects it and dispatches calendar:select', async () => {
    const promise = page.evaluate(
      () =>
        new Promise<{ day: number }>((resolve) => {
          document.querySelector('#cal-default')!.addEventListener(
            'calendar:select',
            (e) => resolve({ day: (e as CustomEvent).detail.date.getDate() }),
            { once: true },
          );
          (document.querySelector('.calendar-day:not([data-outside]) button') as HTMLElement).click();
        }),
    );
    const day = (await promise).day;
    assert.equal(await selectedDay(page), String(day), 'data-selected moves to the clicked day');
  });

  // -- morph identity (plans/defuss-query-morph-integration.md §3 Tier-1) ----
  await check('grid cells carry stable ISO ids + data-cal-date', async () => {
    const info = await page.evaluate(() => {
      const grid = document.querySelector('#cal-default .calendar-grid')!;
      const cell = grid.querySelector('.calendar-day:not([data-outside])')!;
      return { id: cell.id, iso: cell.getAttribute('data-cal-date'), prefix: cell.id.startsWith('cal-default-') };
    });
    assert.ok(info.prefix, `cell id is <calId>-<iso> (got ${info.id})`);
    assert.equal(info.id, `cal-default-${info.iso}`, 'id suffix === data-cal-date');
    assert.match(info.iso!, /^\d{4}-\d{2}-\d{2}$/, 'data-cal-date is ISO');
  });

  await check('selection re-render preserves day-node identity + focus (morph)', async () => {
    const marked = await page.evaluate(() => {
      const now = new Date();
      const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
      const btn = document.querySelector(`#cal-default-${iso} button`) as HTMLElement;
      (btn as any).__morphSentinel = 1;
      btn.focus();
      btn.click(); // selecting THIS day re-renders the grid (data-selected lands on it)
      const after = document.querySelector(`#cal-default-${iso} button`) as HTMLElement;
      return {
        kept: (after as any)?.__morphSentinel === 1,
        focused: document.activeElement === after,
        selected: !!document.querySelector('#cal-default .calendar-day[data-selected]'),
      };
    });
    assert.ok(marked.kept, 'morph reuses the day node across the selection re-render');
    assert.ok(marked.focused, 'focus stays on the activated day cell (render focus policy)');
    assert.ok(marked.selected, 'selection landed on the morphed cell');
    // the grid mirrors the selection as an ISO date for stable reads
    const selIso = await page.$eval('#cal-default .calendar-grid', (el) => el.getAttribute('data-selected-date'));
    assert.match(selIso!, /^\d{4}-\d{2}-\d{2}$/, 'grid mirrors data-selected-date (ISO)');
  });

  await check('clicking an outside day navigates to that month', async () => {
    // the spillover marker lives on the <button> (the <td> carries bare
    // data-outside), and clicking it advances the view + selects that day
    await page.click('button[data-outside="next"]');
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const monthName = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(next);
    assert.match(await heading(page), new RegExp(monthName), 'navigated into next month');
    const selected = await page.$eval('#cal-default .calendar-day[data-selected] button', (el) => el.textContent);
    assert.ok(selected, 'the spillover day is selected in the new month');
  });

  await check('arrow keys move focus between day cells', async () => {
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.calendar-day button');
      (btns[0] as HTMLElement).focus();
    });
    await page.keyboard.press('ArrowRight');
    const focused = await page.evaluate(
      () => document.activeElement === document.querySelectorAll('.calendar-day button')[1],
    );
    assert.ok(focused, 'ArrowRight focuses the next cell');
    await page.keyboard.press('ArrowLeft');
    assert.equal(
      await page.evaluate(() => document.activeElement === document.querySelectorAll('.calendar-day button')[0]),
      true,
    );
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  await check("state API: setState('default', { year, month, day }) navigates + selects", async () => {
    await page.$eval('#cal-default', (el) =>
      (el as HTMLElement).api!.setState('default', { year: 2025, month: 0, day: 15 }),
    );
    const jan = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2025, 0));
    assert.equal(await heading(page), `${jan} 2025`);
    assert.equal(await selectedDay(page), '15');
    const state = await page.$eval('#cal-default', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.config.year, 2025);
    assert.equal(state.config.month, 0);
    assert.equal(state.config.selected, 15);
  });

  await check("state API: setState('default') with no config resets to today", async () => {
    await page.$eval('#cal-default', (el) => (el as HTMLElement).api!.setState('default'));
    const now = new Date();
    const monthName = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(now);
    assert.equal(await heading(page), `${monthName} ${now.getFullYear()}`);
    assert.equal(await selectedDay(page), null, 'selection cleared');
  });

  await check('state API: getState reflects nav clicks (no setState involved)', async () => {
    await page.click('#cal-default [data-action="next-month"]');
    const now = new Date();
    const state = await page.$eval('#cal-default', (el) => (el as HTMLElement).api!.getState());
    const expected = new Date(now.getFullYear(), now.getMonth() + 1);
    assert.equal(state.config.month, expected.getMonth(), 'live month mirrored into config');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#cal-default') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  // -- Density: frame padding 8/12/16px + day hit-areas 24/32/40px ----------
  await check('data-density scales frame padding and day hit-areas', async () => {
    const rows = await page.evaluate(() =>
      ['cal-den-compact', 'cal-den-comfortable', 'cal-den-spacious'].map((id) => {
        const cal = document.getElementById(id)!;
        const pad = getComputedStyle(cal).padding;
        const btn = cal.querySelector('.calendar-day button')!;
        return [pad, btn ? Math.round(btn.getBoundingClientRect().height) : -1] as [string, number];
      }),
    );
    assert.equal(rows.map((r) => r[0]).join('/'), '8px/12px/16px', `frame paddings, got ${rows.map((r) => r[0]).join('/')}`);
    assert.equal(rows.map((r) => r[1]).join('/'), '24/32/40', `day button heights, got ${rows.map((r) => r[1]).join('/')}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.calendarApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.calendarStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#cal-default'),
    }));
    assert.ok(reg.hasApi, 'df$.calendarApi.setState missing');
    assert.deepEqual(reg.states, ['default']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ncalendar.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('calendar.e2e: all checks passed');
