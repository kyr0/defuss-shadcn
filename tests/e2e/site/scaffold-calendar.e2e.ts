import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { chooseLanguage, renderedLanguage, translationGaps } from '../lib/translation.ts';

/**
 * Why: the calendar scaffold is a clickdummy whose promise is that a calendar works - the views agree on the days,
 * the weeks and the events, the settings reach every Calendar component, events are made, changed and deleted, and
 * Find a time tells the truth: a slot it lights up as "All free" has no busy block in any lane. This drives the
 * generated full-screen page (dist/documentation/application/app-calendar.html, built from the scaffold page's own
 * example fence) with the clock fixed at Tuesday 17 November 2026, 10:20.
 */
const PAGE = '/dist/documentation/application/app-calendar.html';
const NOW = new Date('2026-11-17T10:20:00');
const server = startServer();
const browser = await chromium.launch();
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

async function open(p: Page, hash = ''): Promise<void> {
  await offlineJsdelivr(p);
  await p.clock.setFixedTime(NOW);
  await p.goto(`${server.url}${PAGE}${hash}`);
  await p.waitForFunction(() => document.querySelector('[data-ag]')?.hasAttribute('data-ag-ready'), undefined, { timeout: 15_000 });
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await open(page);
  const view = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.ag-view')].filter((v) => !v.hidden).map((v) => v.id));
  const title = () => page.textContent('[data-ag-title]');
  const heads = () => page.$$eval('[data-ag-grid="week"] .ag-dayhead', (b) => b.map((x) => x.textContent!.replace(/\s+/g, ' ').trim()));
  const go = async (hash: string) => {
    await page.evaluate((h) => (location.hash = h), hash);
    await page.waitForFunction((h) => location.hash === h, hash);
    await page.waitForTimeout(150);
  };
  const evIn = (day: string, name: string) => `.ag-col[data-day="${day}"] .ag-ev:has(b:text-is("${name}"))`;
  const setting = async (id: string, value: string | boolean) => {
    await page.click('[data-dialog-trigger="ag-settings"]');
    if (typeof value === 'boolean') await page.setChecked(`#${id}`, value);
    else await page.selectOption(`#${id}`, value);
    await page.click('#ag-settings [data-dialog-close]');
  };

  await check('opens on this week: Sunday to Saturday (English), today marked, week 47, the now line at 10:20', async () => {
    assert.deepEqual(await view(), ['ag-v-week']);
    assert.equal(await title(), 'November 2026');
    assert.deepEqual(await heads(), ['Sun 15', 'Mon 16', 'Tue 17', 'Wed 18', 'Thu 19', 'Fri 20', 'Sat 21']);
    assert.equal(await page.getAttribute('.ag-dayhead[data-today]', 'data-ag-goto'), '2026-11-17');
    assert.equal(await page.textContent('[data-ag-weekchip]'), 'Week 47');
    assert.equal(await page.textContent('[data-ag-wk]'), 'W47', 'the ISO week of the row\'s Thursday, not of its Sunday');
    assert.equal(await page.$eval('.ag-col[data-day="2026-11-17"] .ag-now', (n) => (n as HTMLElement).style.getPropertyValue('--s')), '620');
    assert.equal(await page.getAttribute('[data-ag-views] .toggle[value="week"]', 'aria-pressed'), 'true');
  });

  await check('events: a weekday repeat shows Monday to Friday; overlapping events share their slot; the past is dimmed', async () => {
    const standups = await page.$$eval('.ag-col .ag-ev', (es) => es.filter((e) => e.querySelector('b')!.textContent === 'Daily stand-up').map((e) => e.closest('.ag-col')!.getAttribute('data-day')));
    assert.deepEqual(standups, ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']);
    const cols = await page.$$eval('.ag-col[data-day="2026-11-18"] .ag-ev', (es) =>
      Object.fromEntries(es.map((e) => [e.querySelector('b')!.textContent, [(e as HTMLElement).style.getPropertyValue('--col'), (e as HTMLElement).style.getPropertyValue('--cols-n')]])),
    );
    assert.deepEqual(cols['Copy deadline'], ['0', '2']);
    assert.deepEqual(cols['Pairing with Jonas'], ['1', '2']);
    assert.equal(await page.$eval(evIn('2026-11-16', 'Sprint planning'), (e) => e.hasAttribute('data-past')), true);
    assert.equal(await page.$eval(evIn('2026-11-18', 'Copy deadline'), (e) => e.hasAttribute('data-past')), false);
    assert.equal(await page.textContent('.ag-tg-allday .ag-bar'), "Lena's birthday");
  });

  await check('paging: Next and Previous move a week, Today returns; J / K and D / M / Y / W keys; the address holds view and date', async () => {
    await page.click('[data-ag-step="1"]');
    await page.waitForFunction(() => location.hash === '#/week/2026-11-24');
    assert.deepEqual((await heads())[0], 'Sun 22');
    await page.click('[data-ag-today]');
    await page.waitForFunction(() => location.hash === '#/week/2026-11-17');
    await page.keyboard.press('j');
    await page.waitForFunction(() => location.hash === '#/week/2026-11-24');
    await page.keyboard.press('k');
    await page.keyboard.press('m');
    await page.waitForFunction(() => location.hash === '#/month/2026-11-17');
    assert.deepEqual(await view(), ['ag-v-month']);
    assert.equal(await page.getAttribute('[data-ag-views] .toggle[value="month"]', 'aria-pressed'), 'true');
    await page.keyboard.press('y');
    await page.waitForFunction(() => location.hash === '#/year/2026-11-17');
    await page.keyboard.press('d');
    await page.waitForFunction(() => location.hash === '#/day/2026-11-17');
    assert.equal(await title(), 'Tuesday, November 17, 2026');
    await page.goBack();
    await page.waitForFunction(() => location.hash === '#/year/2026-11-17');
    await page.click('[data-ag-views] .toggle[value="week"]');
    await page.waitForFunction(() => location.hash === '#/week/2026-11-17');
  });

  await check('month: weeks with their calendar weeks, chips per day, "+N more" opens the day', async () => {
    await go('#/month/2026-11-17');
    assert.equal(await page.$$eval('.ag-mweek', (w) => w.length), 5);
    assert.deepEqual(await page.$$eval('.ag-wk', (w) => w.map((x) => x.textContent)), ['45', '46', '47', '48', '49']);
    assert.equal(await page.$eval('.ag-mday[data-today]', (d) => d.getAttribute('data-day')), '2026-11-17');
    assert.equal(await page.textContent('.ag-mday[data-day="2026-11-18"] .ag-more'), '+2 more');
    await page.click('.ag-mday[data-day="2026-11-18"] .ag-more');
    await page.waitForFunction(() => location.hash === '#/day/2026-11-18');
    assert.ok(await page.$(evIn('2026-11-18', 'Customer call: Acme')), 'the day shows what "more" hid');
    await go('#/month/2026-11-17');
    await page.click('.ag-wk >> text=47');
    await page.waitForFunction(() => location.hash === '#/week/2026-11-15');
  });

  await check('year: twelve Calendar components with the events as day data (holidays red); a month name opens the month, a day the day', async () => {
    await go('#/year/2026-11-17');
    assert.equal(await page.$$eval('[data-ag-year] > .calendar', (c) => c.length), 12);
    assert.equal(await page.getAttribute('#ag-y-11 [data-cal-date="2026-12-25"]', 'data-mark'), 'holiday');
    assert.equal(await page.getAttribute('#ag-y-10 [data-cal-date="2026-11-18"]', 'data-mark'), 'event');
    assert.equal(await page.$$eval('#ag-y-0 tbody th.calendar-week', (w) => w.length) > 0, true, 'calendar weeks in every month');
    await page.click('#ag-y-2 .calendar-heading');
    await page.waitForFunction(() => location.hash === '#/month/2026-03-01');
    await go('#/year/2026-11-17');
    await page.click('#ag-y-5 [data-cal-date="2026-06-09"] button');
    await page.waitForFunction(() => location.hash === '#/day/2026-06-09');
  });

  await check('the mini calendar follows the view and opens a day; days with events carry a dot', async () => {
    await go('#/week/2026-11-17');
    assert.equal(await page.getAttribute('#ag-mini .calendar-grid', 'data-selected-date'), '2026-11-17');
    assert.equal(await page.getAttribute('#ag-mini [data-cal-date="2026-11-20"]', 'data-mark'), 'event');
    await page.click('#ag-mini [data-cal-date="2026-11-26"] button');
    await page.waitForFunction(() => location.hash === '#/week/2026-11-26');
    assert.deepEqual((await heads())[0], 'Sun 22');
    await go('#/week/2026-11-17');
  });

  await check('settings: week start Monday and calendar weeks reach every Calendar and every grid; weekends hide; kept after a reload', async () => {
    await setting('ag-s-weekstart', 'monday');
    assert.equal(await page.getAttribute('[data-ag]', 'data-week-start'), 'monday');
    assert.deepEqual((await heads())[0], 'Mon 16');
    assert.equal(await page.textContent('#ag-mini .calendar-day-label'), 'Mon');
    assert.equal(await page.textContent('#ag-mini tbody tr:first-child th.calendar-week'), '44');
    await setting('ag-s-weeknumbers', false);
    assert.equal(await page.$$eval('#ag-mini th.calendar-week', (w) => w.length), 0);
    assert.equal(await page.isVisible('[data-ag-weekchip]'), false);
    await setting('ag-s-weekends', false);
    assert.deepEqual(await heads(), ['Mon 16', 'Tue 17', 'Wed 18', 'Thu 19', 'Fri 20']);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-ag]')?.hasAttribute('data-ag-ready'));
    assert.deepEqual(await heads(), ['Mon 16', 'Tue 17', 'Wed 18', 'Thu 19', 'Fri 20'], 'the settings are kept');
    await setting('ag-s-weekends', true);
    await setting('ag-s-weeknumbers', true);
    await setting('ag-s-weekstart', 'locale');
    assert.deepEqual((await heads())[0], 'Sun 15');
    assert.equal(await page.textContent('#ag-mini tbody tr:first-child th.calendar-week'), '45');
  });

  await check('a calendar switched off hides its events everywhere', async () => {
    await page.uncheck('#ag-cal-personal');
    assert.equal(await page.$(evIn('2026-11-18', 'Lunch with Sofia')), null);
    assert.equal(await page.$(evIn('2026-11-20', 'Dentist')), null);
    await page.check('#ag-cal-personal');
    assert.ok(await page.$(evIn('2026-11-18', 'Lunch with Sofia')));
  });

  await check('the event card: click an event - its time, calendar, place and people; Edit changes it, Delete removes it', async () => {
    await page.click(evIn('2026-11-18', 'Customer call: Acme'));
    assert.equal(await page.$eval('#ag-detail', (d) => d.matches(':popover-open')), true);
    assert.equal(await page.textContent('[data-ag-d="when"]'), 'Wednesday, November 18, 2026, 4:00 PM – 4:45 PM');
    assert.equal(await page.textContent('[data-ag-d="cal"]'), 'Work');
    assert.equal(await page.textContent('[data-ag-d="loc"]'), 'Video call');
    await page.click('#ag-detail [data-ag-edit]');
    assert.equal(await page.inputValue('#ag-e-title'), 'Customer call: Acme');
    assert.equal(await page.inputValue('#ag-e-stime'), '16:00');
    await page.fill('#ag-e-title', 'Customer call: Acme (renewal)');
    await page.fill('#ag-e-stime', '17:00');
    await page.fill('#ag-e-etime', '17:30');
    await page.click('#ag-editor [type="submit"]');
    assert.equal(await page.$eval('#ag-editor', (d) => (d as HTMLDialogElement).open), false);
    const moved = await page.$eval(evIn('2026-11-18', 'Customer call: Acme (renewal)'), (e) => (e as HTMLElement).style.getPropertyValue('--s'));
    assert.equal(moved, '1020');
    await page.click(evIn('2026-11-18', 'Customer call: Acme (renewal)'));
    await page.click('#ag-detail [data-ag-delete]');
    assert.equal(await page.$(evIn('2026-11-18', 'Customer call: Acme (renewal)')), null);
  });

  await check('creating: a double-click makes an hour at that slot, a drag one as long as the drag; the end may not precede the start', async () => {
    const col = await page.$eval('.ag-col[data-day="2026-11-19"]', (c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width / 2, h: r.height };
    });
    // the afternoon in sight: scroll the grid, then read where the column starts
    await page.$eval('.ag-tg-scroll', (s) => ((s as HTMLElement).scrollTop = 600));
    const top = await page.$eval('.ag-col[data-day="2026-11-19"]', (c) => c.getBoundingClientRect().top);
    const yy = (min: number) => top + (min / 1440) * col.h + 2;
    await page.mouse.dblclick(col.x, yy(15 * 60 + 10));
    assert.equal(await page.$eval('#ag-editor', (d) => (d as HTMLDialogElement).open), true);
    assert.deepEqual(
      [await page.inputValue('#ag-e-sdate'), await page.inputValue('#ag-e-stime'), await page.inputValue('#ag-e-etime')],
      ['2026-11-19', '15:00', '16:00'],
    );
    await page.fill('#ag-e-title', 'Kickoff');
    await page.selectOption('#ag-e-cal', 'family');
    // an end before the start is refused
    await page.fill('#ag-e-etime', '14:00');
    await page.click('#ag-editor [type="submit"]');
    assert.equal(await page.$eval('#ag-editor', (d) => (d as HTMLDialogElement).open), true, 'still open');
    assert.equal(await page.$eval('#ag-e-edate', (i) => (i as HTMLInputElement).validationMessage), 'An event ends after it starts.');
    await page.fill('#ag-e-etime', '16:00');
    await page.click('#ag-editor [type="submit"]');
    const made = await page.$eval(evIn('2026-11-19', 'Kickoff'), (e) => [(e as HTMLElement).style.getPropertyValue('--s'), (e as HTMLElement).style.getPropertyValue('--c')]);
    assert.deepEqual(made, ['900', 'oklch(0.7 0.16 55)']);
    // a drag from 13:00 to 14:30 on Friday
    const fri = await page.$eval('.ag-col[data-day="2026-11-20"]', (c) => c.getBoundingClientRect().left + 20);
    await page.mouse.move(fri, yy(13 * 60 + 5));
    await page.mouse.down();
    await page.mouse.move(fri, yy(14 * 60 + 5), { steps: 4 });
    await page.mouse.move(fri, yy(14 * 60 + 35), { steps: 4 });
    await page.mouse.up();
    assert.deepEqual([await page.inputValue('#ag-e-stime'), await page.inputValue('#ag-e-etime')], ['13:00', '14:45']);
    await page.click('#ag-editor [data-dialog-close]');
  });

  await check('the editor\'s range Calendar (two months) sets the dates: an all-day event over three days is one bar', async () => {
    await page.click('[data-ag-new]');
    await page.fill('#ag-e-title', 'Workshop days');
    await page.check('#ag-e-allday');
    assert.equal(await page.$eval('#ag-e-stime', (i) => (i as HTMLInputElement).disabled), true);
    await page.click('.ag-pick summary');
    await page.click('#ag-e-range .calendar-day:not([data-outside])[data-cal-date="2026-11-18"] button');
    await page.click('#ag-e-range .calendar-day:not([data-outside])[data-cal-date="2026-11-20"] button');
    assert.deepEqual([await page.inputValue('#ag-e-sdate'), await page.inputValue('#ag-e-edate')], ['2026-11-18', '2026-11-20']);
    await page.click('#ag-editor [type="submit"]');
    await page.waitForFunction(() => location.hash.startsWith('#/week/2026-11-18'));
    const bar = await page.$eval('.ag-tg-allday .ag-bar:text-is("Workshop days")', (b) => (b as HTMLElement).style.gridColumn);
    assert.equal(bar, '5 / 8', 'Wednesday to Friday');
  });

  await check('search: a match opens its day and its card', async () => {
    await page.fill('[data-ag-search]', 'dentist');
    await page.waitForSelector('[data-ag-results]:not([hidden]) [data-ag-hit]');
    await page.click('[data-ag-hit]');
    await page.waitForFunction(() => location.hash === '#/day/2026-11-20');
    await page.waitForFunction(() => document.getElementById('ag-detail')!.matches(':popover-open'));
    assert.equal(await page.textContent('[data-ag-d="title"]'), 'Dentist');
  });

  await check('find a time: a lane per person in their colour; every "All free" band has no busy block in any lane', async () => {
    await go('#/find');
    assert.deepEqual(await view(), ['ag-v-find']);
    assert.equal(await page.$$eval('[data-ag-board] .ag-fcol', (c) => c.length), 5, 'the next seven days, weekdays only');
    assert.equal(await page.$$eval('[data-ag-board] .ag-fcol', (c) => c[0].querySelectorAll('.ag-lane').length), 4);
    const clash = await page.$$eval('[data-ag-board] .ag-fcol', (cols) =>
      cols.flatMap((col) => {
        const v = (e: Element, k: string) => Number((e as HTMLElement).style.getPropertyValue(k));
        const busy = [...col.querySelectorAll('.ag-lane i')].map((i) => [v(i, '--s'), v(i, '--s') + v(i, '--d')]);
        return [...col.querySelectorAll('[data-ag-free]')].filter((f) => busy.some(([s, e]) => s < v(f, '--s') + v(f, '--d') && e > v(f, '--s'))).map(() => col.getAttribute('data-day'));
      }),
    );
    assert.deepEqual(clash, []);
    assert.ok((await page.$$eval('[data-ag-free]', (f) => f.length)) > 0, 'some time when all four are free');
    assert.equal(await page.textContent('[data-ag-sugg] li:first-child .badge'), 'Everyone');
    // a fifth person: a fifth lane
    await page.fill('[data-ag-add] input', 'Ada Lovelace');
    await page.click('[data-ag-add] button');
    assert.equal(await page.$$eval('[data-ag-board] .ag-fcol', (c) => c[0].querySelectorAll('.ag-lane').length), 5);
    await page.uncheck('#ag-p-ada-lovelace');
  });

  await check('find a time: the range Calendar chooses the days; the poll starts from the calendars, votes cycle, Book makes the event', async () => {
    await page.click('#ag-f-range .calendar-day:not([data-outside])[data-cal-date="2026-11-23"] button');
    await page.click('#ag-f-range .calendar-day:not([data-outside])[data-cal-date="2026-11-25"] button');
    assert.deepEqual(await page.$$eval('[data-ag-board] .ag-fcol', (c) => c.map((x) => x.getAttribute('data-day'))), ['2026-11-23', '2026-11-24', '2026-11-25']);
    const first = await page.getAttribute('[data-ag-sugg] li:first-child', 'data-ag-sug');
    await page.click('[data-ag-sugg] li:first-child [data-ag-addopt]');
    assert.equal(await page.$$eval('[data-ag-poll] thead th[data-opt]', (h) => h.length), 1);
    assert.deepEqual(await page.$$eval('[data-ag-poll] .ag-vote', (v) => v.map((x) => x.getAttribute('data-vote'))), ['yes', 'yes', 'yes', 'yes'], 'everyone free: yes for all');
    await page.click('[data-ag-poll] .ag-vote[data-person="mira"]');
    assert.equal(await page.getAttribute('[data-ag-poll] .ag-vote[data-person="mira"]', 'data-vote'), 'maybe');
    assert.equal(await page.textContent('[data-ag-poll] [data-opt-score]'), '3 yes · 1 if need be');
    // a busy slot cannot join the poll: the toast names who is busy
    const busyLane = await page.$('[data-ag-board] .ag-lane i');
    assert.ok(busyLane, 'a busy block');
    await page.fill('#ag-f-title', 'Roadmap kickoff');
    await page.click('[data-ag-bookbtn]');
    const [day] = first!.split('@');
    await page.waitForFunction((d) => location.hash === '#/day/' + d, day);
    assert.ok(await page.$(evIn(day, 'Roadmap kickoff')), 'booked into the calendar');
    await page.click(evIn(day, 'Roadmap kickoff'));
    assert.equal(await page.$$eval('[data-ag-d="people"] .avatar', (a) => a.length), 3, 'with the three others invited');
  });

  await check('no script errors along the way', async () => {
    assert.deepEqual(errors, []);
  });

  await check('routing: a deep link opens its view and date; translation: German frame, dates and a Monday week start, every target in both languages', async () => {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await open(p, '#/month/2027-02-01');
    assert.equal(await p.textContent('[data-ag-title]'), 'February 2027');
    assert.deepEqual(await translationGaps(p, '[data-ag]'), [], 'every target and attribute in English and German');
    assert.equal(await renderedLanguage(p, '[data-ag]'), 'en');
    await chooseLanguage(p, 'de');
    assert.equal(await renderedLanguage(p, '[data-ag]'), 'de');
    assert.equal(await p.textContent('[data-ag-title]'), 'Februar 2027');
    assert.equal((await p.textContent('[data-ag-views] .toggle[value="week"]'))!.trim(), 'Woche');
    await p.evaluate(() => (location.hash = '#/week/2026-11-17'));
    await p.waitForFunction(() => location.hash === '#/week/2026-11-17');
    await p.waitForTimeout(150);
    assert.equal(await p.textContent('[data-ag-grid="week"] .ag-dayhead >> nth=0'), 'Mo 16', 'German weeks start on Monday');
    assert.equal(await p.textContent('[data-ag-weekchip]'), 'KW 47');
    assert.equal(await p.textContent('#ag-mini .calendar-day-label'), 'Mo');
    await p.close();
  });

  await check('narrow: the day first, the sidebar folded, nothing wider than the screen', async () => {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await open(p);
    assert.equal(await p.$eval('#ag-v-day', (v) => (v as HTMLElement).hidden), false);
    assert.equal(await p.$eval('[data-ag]', (a) => a.hasAttribute('data-side-closed')), true);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await p.click('[data-ag-sidebar]');
    assert.equal(await p.isVisible('#ag-mini'), true);
    await p.click('#ag-mini [data-cal-date="2026-11-19"] button');
    await p.waitForFunction(() => location.hash === '#/day/2026-11-19');
    assert.equal(await p.$eval('[data-ag]', (a) => a.hasAttribute('data-side-closed')), true, 'a pick folds it again');
    await p.close();
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`scaffold-calendar.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-calendar.e2e: all checks passed');
