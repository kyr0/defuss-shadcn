// -- Calendar -------------------------------------------------
// Interactive calendar grid with month navigation and day selection, plus
// the named-state API (AGENTS.md "State API"). The calendar's observable
// state is its view (visible month + selected day), so 'default' resets to
// today (or navigates/selects via { year, month, day }) and getState()
// reports the live view.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
// defussQuery: the callable runtime - the grid renders through df$(grid).morph()
// (plans/defuss-query-morph-integration.md §3 Tier-1: keyed DOM diffing replaces
// innerHTML so day-node identity + focus survive re-renders).
import { defussGlobals, defussQuery } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();
// id prefix source for calendars without their own #id (unique per element,
// so morph day-cell ids never collide between calendars on one page)
let calSeq = 0;

const calendarStates = ['default'];

/**
 * UI side of setState: 'default' (re)renders the view. Without config it
 * resets to today with no selection; { year, month, day } navigates to that
 * month (month is 0-based, like Date) and optionally selects a day;
 * { date: 'YYYY[-MM[-DD]]' } navigates by ISO string (day selects too);
 * { minDate/maxDate } set the selectable range ('' clears). All ranges are
 * read live from state in renderGrid, so attribute-style control via the
 * State API takes effect on the very next render.
 */
function triggerStateChange(cal, stateName, config) {
  const state = cal._calState;
  if (!state || stateName !== 'default') return;
  const now = new Date();
  if (typeof config?.minDate === 'string') state.minDate = config.minDate || null;
  if (typeof config?.maxDate === 'string') state.maxDate = config.maxDate || null;
  if (typeof config?.date === 'string' && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(config.date)) {
    const [y, m, d] = config.date.split('-').map(Number);
    state.year = y;
    state.month = (m ?? now.getMonth() + 1) - 1;
    state.selected = d ?? null;
  } else {
    state.year = config?.year ?? now.getFullYear();
    state.month = config?.month ?? now.getMonth();
    state.selected = config?.day ?? null;
  }
  renderCalendar(cal, state.year, state.month, state.selected);
}

// ISO yyyy-mm-dd of a cell's REAL date (outside cells resolve to their own
// month) - the morph key basis: identity, not filtered position (§3/guide)
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Registry-level API; pass the calendar element explicitly. Unknown names throw. */
export const calendarApi = {
  setState(cal, stateName, config = {}) {
    if (!calendarStates.includes(stateName)) {
      throw new Error(`calendar: unknown state "${stateName}" (supported: ${calendarStates.join(', ')})`);
    }
    triggerStateChange(cal, stateName, config);
    // state lives on the ELEMENT, not the module (many calendars per page)
    cal.dataset.stateName = stateName;
    cal._stateConfig = config;
  },
  getState(cal) {
    const state = cal._calState ?? {};
    return {
      name: cal.dataset.stateName || 'default',
      // live view - reflects nav clicks and day selection, not just setState
      config: {
        ...cal._stateConfig,
        year: state.year,
        month: state.month,
        selected: state.selected,
        minDate: state.minDate ?? null,
        maxDate: state.maxDate ?? null,
      },
    };
  },
};

df$.calendarApi = calendarApi;
df$.calendarStates = calendarStates;

const DAYS = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2024, 0, i))
);
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2024, i, 1))
);

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const isToday = (year, month, day) => {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
};

/**
 * Build one month's thead+tbody markup. Every day cell carries a stable
 * `id` (`<calId>-<ISO date>`) plus `data-cal-date` - morph matches cells by
 * id, so a re-render moves/reuses nodes instead of replacing them. The id
 * also carries the cell's full date, letting consumers (tests, custom
 * state APIs) read the selection as an ISO date via the grid.
 */
// ISO strings compare lexicographically - the range check needs no Date math
const isoInRange = (iso: string, min?: string | null, max?: string | null) =>
  (!min || iso >= min) && (!max || iso <= max);

const renderGrid = (year, month, selectedDay, calId, minDate?, maxDate?) => {
  const total = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  const prevTotal = daysInMonth(year, month - 1);

  let html = '<thead><tr>';
  for (let d = 0; d < 7; d++) {
    html += `<th class="calendar-day-label" scope="col">${DAYS[d]}</th>`;
  }
  html += '</tr></thead><tbody>';

  let dayNum = 1;
  let nextDayNum = 1;
  const rows = Math.ceil((startDay + total) / 7);

  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < 7; c++) {
      const cellIndex = r * 7 + c;
      if (cellIndex < startDay) {
        const prevDay = prevTotal - startDay + cellIndex + 1;
        const iso = isoDate(new Date(year, month - 1, prevDay));
        // outside days honor the range too: clicking one selects there, so an
        // out-of-range preview day must be disabled exactly like an in-month one
        const off = !isoInRange(iso, minDate, maxDate) ? ' data-disabled' : '';
        html += `<td class="calendar-day" data-outside${off} id="${calId}-${iso}" data-cal-date="${iso}"><button tabindex="-1" data-day="${prevDay}" data-outside="prev">${prevDay}</button></td>`;
      } else if (dayNum > total) {
        const iso = isoDate(new Date(year, month + 1, nextDayNum));
        const off = !isoInRange(iso, minDate, maxDate) ? ' data-disabled' : '';
        html += `<td class="calendar-day" data-outside${off} id="${calId}-${iso}" data-cal-date="${iso}"><button tabindex="-1" data-day="${nextDayNum}" data-outside="next">${nextDayNum}</button></td>`;
        nextDayNum++;
      } else {
        let attrs = '';
        if (isToday(year, month, dayNum)) attrs += ' data-today';
        if (dayNum === selectedDay) attrs += ' data-selected';
        const iso = isoDate(new Date(year, month, dayNum));
        if (!isoInRange(iso, minDate, maxDate)) attrs += ' data-disabled';
        html += `<td class="calendar-day"${attrs} id="${calId}-${iso}" data-cal-date="${iso}"><button data-day="${dayNum}">${dayNum}</button></td>`;
        dayNum++;
      }
    }
    html += '</tr>';
  }
  html += '</tbody>';
  return html;
};

/**
 * Render the calendar's view: heading text + keyed morph of the grid.
 * Focus policy (plans §3): keyboard focus that was on a day cell is
 * restored after the morph (the node usually survives - morph moves it);
 * an activation started elsewhere (nav buttons) keeps focus there. The
 * grid mirrors the selection as data-selected-date (ISO) - a single
 * stable place to read it.
 */
const renderCalendar = (el, year, month, selectedDay) => {
  const heading = el.querySelector('.calendar-heading');
  if (heading) heading.textContent = `${MONTHS[month]} ${year}`;
  const grid = el.querySelector('.calendar-grid');
  if (!grid) return;
  const st = el._calState ?? {};
  // the view + range mirror onto the ROOT as stable attributes - schema
  // observations (currentDate/minDate/maxDate) read them from one place, and
  // they survive grid morphs
  el.dataset.currentDate = selectedDay
    ? isoDate(new Date(year, month, selectedDay))
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  if (st.minDate) el.dataset.minDate = st.minDate;
  else el.removeAttribute('data-min-date');
  if (st.maxDate) el.dataset.maxDate = st.maxDate;
  else el.removeAttribute('data-max-date');

  // capture focus BEFORE the morph: the focused button's day cell carries
  // the ISO key on the <td> (data-cal-date), so walk up to the cell
  const active = el.ownerDocument.activeElement;
  const focusKey =
    active && el.contains(active)
      ? active.closest('.calendar-day')?.getAttribute('data-cal-date')
      : null;

  dfDollar(grid).morph(renderGrid(year, month, selectedDay, el.dataset.calId || '', st.minDate, st.maxDate));

  // refocus the cell's button (the td itself isn't focusable) - morph usually
  // kept it, but after a month change the old cell is gone; stay put then
  if (focusKey) grid.querySelector(`[data-cal-date="${focusKey}"] button`)?.focus();

  // selection mirrors onto the grid so it survives node reuse/replacement
  const selDate = el.querySelector('.calendar-day[data-selected]')?.getAttribute('data-cal-date');
  if (selDate) grid.setAttribute('data-selected-date', selDate);
  else grid.removeAttribute('data-selected-date');
};

function init() {
document.querySelectorAll('.calendar:not([data-init])').forEach((cal) => {
  cal.dataset.init = '';
  // stable id prefix for the grid's day-cell morph keys (§3) - the
  // generated fallback uses a dfsc- prefix so it can't collide with any
  // calendar's real #id
  cal.dataset.calId = cal.id || `dfsc-${++calSeq}`;
  const now = new Date();
    // state lives on the ELEMENT, not module scope (AGENTS.md "State API")
    const state = (cal._calState = {
      year: now.getFullYear(),
      month: now.getMonth(),
      selected: null,
      // selectable range authored as attributes (ISO substrings - the markup
      // may carry 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD' bounds, compared as given)
      minDate: cal.dataset.minDate || null,
      maxDate: cal.dataset.maxDate || null,
    });
    // authored view (not just range): data-current-date = 'YYYY-MM' / 'YYYY-MM-DD'
    if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(cal.dataset.currentDate ?? '')) {
      const [y, m, d] = cal.dataset.currentDate!.split('-').map(Number);
      state.year = y;
      state.month = (m ?? now.getMonth() + 1) - 1;
      state.selected = d ?? null;
    }
    // bind-scope the api per instance: `$('#my-calendar').api.setState('default', { year: 2024, month: 0, day: 15 })`
    cal.api = {
      setState: (stateName, config) => calendarApi.setState(cal, stateName, config),
      getState: () => calendarApi.getState(cal),
    };

    renderCalendar(cal, state.year, state.month, state.selected);

    /* Navigation */
    cal.addEventListener('click', (e) => {
      const nav = e.target.closest('.calendar-nav');
      if (nav) {
        const action = nav.dataset.action;
        if (action === 'prev-month') {
          state.month--;
          if (state.month < 0) { state.month = 11; state.year--; }
          state.selected = null;
        } else if (action === 'next-month') {
          state.month++;
          if (state.month > 11) { state.month = 0; state.year++; }
          state.selected = null;
        }
        renderCalendar(cal, state.year, state.month, state.selected);
        return;
      }

      /* Day selection */
      const dayBtn = e.target.closest('.calendar-day button');
      if (dayBtn && !dayBtn.closest('[data-disabled]')) {
        const day = parseInt(dayBtn.dataset.day, 10);
        const outside = dayBtn.dataset.outside;
        if (outside === 'prev') {
          state.month--;
          if (state.month < 0) { state.month = 11; state.year--; }
          state.selected = day;
        } else if (outside === 'next') {
          state.month++;
          if (state.month > 11) { state.month = 0; state.year++; }
          state.selected = day;
        } else {
          state.selected = day;
        }
        renderCalendar(cal, state.year, state.month, state.selected);

        /* Dispatch custom event */
        cal.dispatchEvent(new CustomEvent('calendar:select', {
          detail: { date: new Date(state.year, state.month, state.selected) },
          bubbles: true
        }));
      }
    });

    /* Keyboard navigation in grid */
    cal.addEventListener('keydown', (e) => {
      const dayBtn = e.target.closest('.calendar-day button');
      if (!dayBtn) return;

      const allBtns = Array.from(cal.querySelectorAll('.calendar-day button'));
      const idx = allBtns.indexOf(dayBtn);
      let next = null;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          next = allBtns[idx + 1];
          break;
        case 'ArrowLeft':
          e.preventDefault();
          next = allBtns[idx - 1];
          break;
        case 'ArrowDown':
          e.preventDefault();
          next = allBtns[idx + 7];
          break;
        case 'ArrowUp':
          e.preventDefault();
          next = allBtns[idx - 7];
          break;
      }
      if (next) next.focus();
    });
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
