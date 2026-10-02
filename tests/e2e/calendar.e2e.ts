import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped calendar component. Loads the fixture
 * (month navigation + generated grid, mirroring the doc page) over HTTP in a
 * real browser, then verifies the rendered grid, month navigation, day
 * selection with its custom event, today/outside markers, keyboard cell
 * movement, and the named State API (view reset/preset) - the same files
 * consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/calendar.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const heading = (page: Page) => page.$eval('#cal-default .calendar-heading', (el) => el.textContent!.trim());
/** Steps #cal-default forward to a month whose grid shows days of BOTH
 *  neighbours - whether today's month does depends on the date (a month
 *  ending on the week's last day has no trailing spillover). */
const toSpilloverMonth = async (page: Page): Promise<number> => {
  for (let i = 0; i < 12; i++) {
    const sides = await page.$$eval('#cal-default .calendar-day[data-outside] button', (els) => els.map((el) => (el as HTMLElement).dataset.outside));
    if (sides.includes('prev') && sides.includes('next')) return i;
    await page.click('#cal-default [data-action="next-month"]');
  }
  throw new Error('no month with both spillovers within a year');
};
/** Steps #cal-default back n months - the checks after these start where the page opened. */
const backMonths = async (page: Page, n: number): Promise<void> => {
  for (let i = 0; i < n; i++) await page.click('#cal-default [data-action="prev-month"]');
};
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
    const steps = await toSpilloverMonth(page);
    const outside = await page.$$eval('#cal-default .calendar-day[data-outside] button', (els) =>
      els.map((el) => el.dataset.outside),
    );
    assert.ok(outside.includes('prev') && outside.includes('next'), 'both spillovers rendered');
    await backMonths(page, steps);
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
    const steps = await toSpilloverMonth(page);
    const before = await heading(page);
    await page.click('#cal-default button[data-outside="next"]');
    assert.notEqual(await heading(page), before, 'navigated into the next month');
    const selected = await page.$eval('#cal-default .calendar-day[data-selected] button', (el) => el.textContent);
    assert.ok(selected, 'the spillover day is selected in the new month');
    // back to one month past the opening month, where the checks below expect it
    await backMonths(page, steps);
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
  // -- range mode -------------------------------------------------------
  const marks = (owner: string) =>
    page.$eval(owner, (o) => ({
      start: o.querySelector('[data-range-start]')?.getAttribute('data-cal-date') ?? null,
      end: o.querySelector('[data-range-end]:not([data-range-preview])')?.getAttribute('data-cal-date') ?? null,
      inRange: Array.from(o.querySelectorAll('[data-in-range]:not([data-range-preview])')).map((c) => c.getAttribute('data-cal-date')),
      preview: Array.from(o.querySelectorAll('[data-range-preview]')).map((c) => c.getAttribute('data-cal-date')),
      selected: o.querySelectorAll('[aria-selected="true"]').length,
      attrs: [o.getAttribute('data-range-start'), o.getAttribute('data-range-end')],
    }));
  const day = (owner: string, iso: string) => `${owner} .calendar-day[data-cal-date="${iso}"]:not([data-outside]) button`;

  await check('range: authored data-range-start/-end render endpoints + the span (aria-selected)', async () => {
    const m = await marks('#cal-range');
    assert.equal(m.start, '2026-10-12');
    assert.equal(m.end, '2026-10-16');
    assert.deepEqual(m.inRange, ['2026-10-13', '2026-10-14', '2026-10-15']);
    assert.equal(m.selected, 5, 'start + 3 between + end');
  });

  await check('range: the band is visible (accent span) and endpoints are filled', async () => {
    const r = await page.evaluate(() => {
      const cell = (iso: string) => document.querySelector(`#cal-range [data-cal-date="${iso}"]`)!;
      return {
        between: getComputedStyle(cell('2026-10-14')).backgroundColor,
        outsideRange: getComputedStyle(cell('2026-10-20')).backgroundColor,
        startBtn: getComputedStyle(cell('2026-10-12').querySelector('button')!).backgroundColor,
        plainBtn: getComputedStyle(cell('2026-10-20').querySelector('button')!).backgroundColor,
        halfBand: getComputedStyle(cell('2026-10-12')).backgroundImage,
      };
    });
    assert.notEqual(r.between, r.outsideRange, 'days between carry the band');
    assert.notEqual(r.startBtn, r.plainBtn, 'endpoint is filled');
    assert.match(r.halfBand, /linear-gradient/, 'the band runs half into the start cell');
  });

  await check('range: 1st click starts anew, a click BEFORE the start restarts there, the next click closes', async () => {
    await page.evaluate(() => {
      (globalThis as any).__ranges = [];
      document.getElementById('cal-range')!.addEventListener('calendar:range', (e: Event) => (globalThis as any).__ranges.push([(e as CustomEvent).detail.startIso, (e as CustomEvent).detail.endIso]));
    });
    await page.click(day('#cal-range', '2026-10-20'));
    let m = await marks('#cal-range');
    assert.deepEqual([m.start, m.end], ['2026-10-20', null], 'a complete range + click = fresh start');
    await page.click(day('#cal-range', '2026-10-08'));
    m = await marks('#cal-range');
    assert.deepEqual([m.start, m.end], ['2026-10-08', null], 'an earlier day restarts - never an end before the start');
    await page.click(day('#cal-range', '2026-10-10'));
    m = await marks('#cal-range');
    assert.deepEqual([m.start, m.end], ['2026-10-08', '2026-10-10']);
    assert.deepEqual(m.attrs, ['2026-10-08', '2026-10-10'], 'owner mirrors the range');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__ranges), [['2026-10-20', null], ['2026-10-08', null], ['2026-10-08', '2026-10-10']]);
  });

  await check('range: disabled days (before data-min-date) never select', async () => {
    await page.click(day('#cal-range', '2026-10-02'), { force: true });
    const m = await marks('#cal-range');
    assert.deepEqual([m.start, m.end], ['2026-10-08', '2026-10-10']);
  });

  await check('range: outside days are hidden in range mode', async () => {
    const v = await page.$eval('#cal-range .calendar-day[data-outside]', (el) => getComputedStyle(el).visibility);
    assert.equal(v, 'hidden');
  });

  await check('two-month range: consecutive months, one pair of arrows, paging moves both', async () => {
    const headings = () =>
      page.evaluate(() => Array.from(document.querySelectorAll('#cal-stay .calendar-heading')).map((e) => e.textContent));
    const [a, b] = await headings();
    assert.ok(a && b && a !== b, 'two different months');
    const vis = await page.evaluate(() => [
      getComputedStyle(document.querySelector('#cal-stay-a [data-action="next-month"]')!).visibility,
      getComputedStyle(document.querySelector('#cal-stay-b [data-action="prev-month"]')!).visibility,
      getComputedStyle(document.querySelector('#cal-stay-a [data-action="prev-month"]')!).visibility,
      getComputedStyle(document.querySelector('#cal-stay-b [data-action="next-month"]')!).visibility,
    ]);
    assert.deepEqual(vis, ['hidden', 'hidden', 'visible', 'visible']);
    await page.click('#cal-stay-b [data-action="next-month"]');
    const [a2, b2] = await headings();
    assert.equal(a2, b, 'the first calendar now shows what the second showed');
    assert.notEqual(b2, b);
    await page.click('#cal-stay-a [data-action="prev-month"]');
    assert.deepEqual(await headings(), [a, b]);
  });

  await check('two-month range: hover previews the span across BOTH months; the end commits it', async () => {
    await page.click(day('#cal-stay', '2026-10-29'));
    await page.hover(day('#cal-stay', '2026-11-03'));
    let m = await marks('#cal-stay');
    assert.equal(m.start, '2026-10-29');
    assert.deepEqual(m.preview, ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03']);
    await page.click(day('#cal-stay', '2026-11-03'));
    m = await marks('#cal-stay');
    assert.deepEqual([m.start, m.end], ['2026-10-29', '2026-11-03']);
    assert.deepEqual(m.inRange, ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    assert.deepEqual(m.preview, [], 'no preview once committed');
  });

  await check('two-month range: form fields inside the wrapper receive the ISO dates', async () => {
    const v = await page.evaluate(() => [(document.getElementById('stay-in') as HTMLInputElement).value, (document.getElementById('stay-out') as HTMLInputElement).value]);
    assert.deepEqual(v, ['2026-10-29', '2026-11-03']);
  });

  await check('two-month range: ArrowRight crosses from the last day of one month into the next', async () => {
    await page.focus(day('#cal-stay', '2026-10-31'));
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement?.closest('.calendar-day')?.getAttribute('data-cal-date')), '2026-11-01');
    assert.equal(await page.evaluate(() => document.activeElement?.closest('.calendar')?.id), 'cal-stay-b');
  });

  await check("range state API: setState('default', { start, end }) + getState report the range; an end before the start is dropped", async () => {
    const r = await page.evaluate(() => {
      const c = document.getElementById('cal-range') as any;
      c.api.setState('default', { start: '2026-12-01', end: '2026-12-05' });
      const a = c.api.getState().config;
      c.api.setState('default', { start: '2026-12-10', end: '2026-12-02' });
      const b = c.api.getState().config;
      return [[a.rangeStart, a.rangeEnd, a.month], [b.rangeStart, b.rangeEnd]];
    });
    assert.deepEqual(r, [['2026-12-01', '2026-12-05', 11], ['2026-12-10', null]]);
  });

  // -- month / year picker -------------------------------------------------
  const jumpHeading = () => page.$eval('#cal-jump .calendar-heading', (el) => el.textContent!.trim());
  const jumpView = () => page.$eval('#cal-jump', (el) => (el as HTMLElement).dataset.view ?? 'days');

  await check('picker: a plain heading is upgraded to a real button that names what it does', async () => {
    const r = await page.$eval('#cal-jump .calendar-heading', (el) => ({ tag: el.tagName, type: (el as HTMLButtonElement).type, label: el.getAttribute('aria-label'), expanded: el.getAttribute('aria-expanded') }));
    assert.deepEqual(r, { tag: 'BUTTON', type: 'button', label: await jumpHeading() + ', choose a month and year', expanded: 'false' });
  });

  await check('picker: heading -> month grid (12 months, current filled, arrows step a year)', async () => {
    await page.click('#cal-jump .calendar-heading');
    assert.equal(await jumpView(), 'months');
    assert.equal(await jumpHeading(), '2026');
    const r = await page.$$eval('#cal-jump .calendar-pick', (bs) => ({ n: bs.length, current: bs.filter((b) => b.hasAttribute('aria-current')).map((b) => (b as HTMLElement).dataset.month) }));
    assert.deepEqual(r, { n: 12, current: ['8'] });
    assert.equal(await page.$eval('#cal-jump .calendar-grid', (g) => getComputedStyle(g).display), 'none');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-month')), '8', 'focus on the current month');
    await page.click('#cal-jump [data-action="prev-month"]');
    assert.equal(await jumpHeading(), '2025');
    assert.equal(await page.$eval('#cal-jump [data-action="prev-month"]', (b) => b.getAttribute('aria-label')), 'Previous year');
  });

  await check('picker: month grid heading -> year grid (12 years a page, arrows step 12)', async () => {
    await page.click('#cal-jump .calendar-heading');
    assert.equal(await jumpView(), 'years');
    const years = await page.$$eval('#cal-jump .calendar-pick', (bs) => bs.map((b) => Number((b as HTMLElement).dataset.year)));
    assert.equal(years.length, 12);
    assert.ok(years.includes(2025));
    await page.click('#cal-jump [data-action="prev-month"]');
    await page.click('#cal-jump [data-action="prev-month"]');
    const back = await page.$$eval('#cal-jump .calendar-pick', (bs) => bs.map((b) => Number((b as HTMLElement).dataset.year)));
    assert.equal(back[0], years[0] - 24, 'two pages back = 24 years');
  });

  await check('picker: years/months wholly before data-min-date are disabled', async () => {
    const r = await page.$$eval('#cal-jump .calendar-pick', (bs) => bs.map((b) => [Number((b as HTMLElement).dataset.year), (b as HTMLButtonElement).disabled] as [number, boolean]));
    for (const [y, off] of r) assert.equal(off, y < 2020, 'year ' + y);
  });

  await check('picker: pick a year -> its months -> pick a month -> that month\'s days (a few clicks, not hundreds)', async () => {
    // page forward to 2028's page and pick it
    await page.click('#cal-jump [data-action="next-month"]');
    await page.click('#cal-jump [data-action="next-month"]');
    await page.click('#cal-jump [data-action="next-month"]');
    await page.click('#cal-jump .calendar-pick[data-year="2028"]');
    assert.deepEqual([await jumpView(), await jumpHeading()], ['months', '2028']);
    await page.click('#cal-jump .calendar-pick[data-month="11"]');
    assert.equal(await jumpView(), 'days');
    const st = await page.$eval('#cal-jump', (c: any) => c.api.getState().config);
    assert.deepEqual([st.year, st.month, st.view], [2028, 11, 'days']);
    assert.ok((await jumpHeading()).endsWith('2028'));
    assert.equal(await page.evaluate(() => document.activeElement?.closest('.calendar-day')?.getAttribute('data-cal-date')?.slice(0, 7)), '2028-12', 'focus lands in the new month');
  });

  await check('picker: min-date months disabled in the months view; Escape returns to the days', async () => {
    await page.$eval('#cal-jump', (c: any) => c.api.setState('default', { year: 2020, month: 5 }));
    await page.click('#cal-jump .calendar-heading');
    const off = await page.$$eval('#cal-jump .calendar-pick', (bs) => bs.map((b) => (b as HTMLButtonElement).disabled));
    assert.deepEqual(off, [true, true, false, false, false, false, false, false, false, false, false, false]);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-month')), '6', 'arrows walk the grid');
    await page.keyboard.press('Escape');
    assert.equal(await jumpView(), 'days');
  });

  await check('picker: calendar:view reports every month change', async () => {
    const got = await page.evaluate(() => {
      const cal = document.getElementById('cal-jump') as any;
      const seen: string[] = [];
      cal.addEventListener('calendar:view', (e: any) => seen.push(e.detail.view + ':' + e.detail.year + '-' + e.detail.month));
      cal.querySelector('[data-action="next-month"]').click();
      return seen;
    });
    assert.deepEqual(got, ['days:2020-6']);
  });

  // -- dropdown caption --------------------------------------------------------
  await check('dropdown caption: native month + year selects replace the heading; years follow data-year-from/-to', async () => {
    const r = await page.$eval('#cal-dd', (c) => {
      const year = c.querySelector('.calendar-select[data-part="year"]') as HTMLSelectElement;
      const month = c.querySelector('.calendar-select[data-part="month"]') as HTMLSelectElement;
      return { hidden: (c.querySelector('.calendar-heading') as HTMLElement).hidden, first: year.options[0].value, last: year.options[year.options.length - 1].value, year: year.value, month: month.value, picker: !!c.querySelector('.calendar-picker') };
    });
    assert.deepEqual(r, { hidden: true, first: '2030', last: '1950', year: '2026', month: '8', picker: false });
  });

  await check('dropdown caption: choosing a year jumps straight there (a date of birth in one step)', async () => {
    await page.selectOption('#cal-dd .calendar-select[data-part="year"]', '1987');
    await page.selectOption('#cal-dd .calendar-select[data-part="month"]', '2');
    const st = await page.$eval('#cal-dd', (c: any) => c.api.getState().config);
    assert.deepEqual([st.year, st.month], [1987, 2]);
    assert.ok(await page.$('#cal-dd [data-cal-date="1987-03-15"]'));
    await page.click('#cal-dd [data-action="next-month"]');
    assert.equal(await page.$eval('#cal-dd .calendar-select[data-part="month"]', (s: any) => s.value), '3', 'arrows keep the selects in step');
  });

  // -- day data ----------------------------------------------------------------------
  await check('day data: marks from the JSON become data-mark; label names the day for assistive tech', async () => {
    const r = await page.$eval('#cal-days [data-cal-date="2026-12-25"]', (td) => ({
      mark: td.getAttribute('data-mark'), title: td.getAttribute('title'),
      aria: td.querySelector('button')!.getAttribute('aria-label'),
      color: getComputedStyle(td.querySelector('button')!).color,
      dot: getComputedStyle(td.querySelector('button')!, '::after').content,
    }));
    assert.equal(r.mark, 'holiday');
    assert.equal(r.title, 'Christmas Day');
    assert.match(r.aria!, /2026.*Christmas Day/);
    assert.equal(r.dot, '""');
    const plain = await page.$eval('#cal-days [data-cal-date="2026-12-22"] button', (b) => getComputedStyle(b).color);
    assert.notEqual(r.color, plain, 'a holiday looks different from an ordinary day');
  });

  await check('day data: disabled: true blocks the day (no selection)', async () => {
    const r = await page.$eval('#cal-days [data-cal-date="2026-12-18"]', (td) => [td.hasAttribute('data-disabled'), td.getAttribute('data-mark')]);
    assert.deepEqual(r, [true, 'booked']);
    assert.equal(await page.$eval('#cal-days [data-cal-date="2026-12-18"] button', (b) => getComputedStyle(b).opacity), '1', 'a blocked MARKED day keeps its look legible (no 0.35 fade)');
    await page.click('#cal-days [data-cal-date="2026-12-18"] button');
    assert.equal(await page.$eval('#cal-days', (c: any) => c.api.getState().config.selected), null);
  });

  await check('day data: a note is a second line under the number and the cells grow for it', async () => {
    const r = await page.$eval('#cal-days', (c) => {
      const td = c.querySelector('[data-cal-date="2026-12-08"]')!;
      const note = td.querySelector('.calendar-day-note');
      const num = td.querySelector('button')!.getBoundingClientRect();
      return { notes: c.hasAttribute('data-notes'), note: note?.textContent, below: note ? note.getBoundingClientRect().top > num.top + 8 : false, h: Math.round(td.getBoundingClientRect().height) };
    });
    assert.deepEqual(r, { notes: true, note: '€119', below: true, h: 48 });
  });

  await check('day data: text is escaped and an invalid mark name is ignored', async () => {
    const r = await page.$eval('#cal-days [data-cal-date="2026-12-09"]', (td) => ({ mark: td.getAttribute('data-mark'), bold: !!td.querySelector('b'), note: td.querySelector('.calendar-day-note')?.textContent }));
    assert.deepEqual(r, { mark: null, bold: false, note: '<b>x</b>' });
  });

  await check('day data: api.setDays replaces / merges the map without moving the view', async () => {
    await page.$eval('#cal-days', (c: any) => c.api.setDays({ '2026-12-03': { mark: 'event', label: 'Launch' } }, { merge: true }));
    const r = await page.$eval('#cal-days', (c: any) => ({
      launch: c.querySelector('[data-cal-date="2026-12-03"]').getAttribute('data-mark'),
      xmas: c.querySelector('[data-cal-date="2026-12-25"]').getAttribute('data-mark'),
      month: c.api.getState().config.month,
    }));
    assert.deepEqual(r, { launch: 'event', xmas: 'holiday', month: 11 });
    await page.$eval('#cal-days', (c: any) => c.api.setDays({}));
    assert.equal(await page.$eval('#cal-days', (c) => [c.querySelectorAll('[data-mark]').length, c.hasAttribute('data-notes')].join()), '0,false');
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
