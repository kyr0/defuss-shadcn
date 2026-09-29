---
name: Calendar
type: ATM
why: Month grid with keyboard navigation and selection state via the State API - a single date or a start-end range (one span across one or several months).
when: Picking a day, or a date RANGE as one answer (a stay, a report period, a holiday request, a filter) - data-mode="range" or a two-month .calendar-range; pair with a popover for a full picker. For a plain native date field use date-picker.
where: dist/components/calendar/calendar.css + dist/components/calendar/calendar.js
supportedStates: default
---

# Calendar

## Native basis

`<table>` element rendered as a month grid with navigation controls. Uses `role="grid"` for accessible day cell navigation.

## Native Web APIs

- [`<table>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table) - tabular grid for the month
- [`role="grid"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/grid_role) - ARIA grid pattern for 2D keyboard navigation
- [`<button>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button) - navigation and day selection buttons

## Structure

```html
<div class="calendar">
  <div class="calendar-header">
    <button class="calendar-nav" data-action="prev-month" aria-label="Previous month">
      <svg><!-- chevron left --></svg>
    </button>
    <button type="button" class="calendar-heading" aria-live="polite">April 2026</button>
    <button class="calendar-nav" data-action="next-month" aria-label="Next month">
      <svg><!-- chevron right --></svg>
    </button>
  </div>
  <table class="calendar-grid" role="grid">
    <thead>
      <tr>
        <th class="calendar-day-label" abbr="Sunday" scope="col">Su</th>
        <th class="calendar-day-label" abbr="Monday" scope="col">Mo</th>
        <!-- ... -->
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="calendar-day" data-outside="">29</td>
        <td class="calendar-day">1</td>
        <!-- ... -->
      </tr>
    </tbody>
  </table>
</div>
```

## Day cell states

(Plus `data-mark` / `data-note` from the day data - see "Day data".)


| Class                   | Description                        |
|-------------------------|------------------------------------|
| `calendar-day`          | Base day cell                      |
| `data-today`    | Today's date                       |
| `data-selected` | Selected date                      |
| `data-outside`  | Day from adjacent month            |
| `data-disabled` | Non-selectable date                |
| `data-range-start` / `data-range-end` | Range endpoints (filled) |
| `data-in-range` | Day between the endpoints (the band) |
| `data-range-span` | Endpoint that joins a band (the band runs half into it) |
| `data-range-preview` | Would-be span while hovering/focusing after the start |

## Jumping to a month or year

The heading is a **button** (a plain `<span class="calendar-heading">` is
upgraded to one by the JS): it switches the calendar's view.

| View (`data-view` on the root) | Heading shows | Arrows step | A pick… |
| --- | --- | --- | --- |
| days (no attribute) | September 2026 | a month | selects the day |
| `months` | 2026 | a year | shows that month's days |
| `years` | 2016 – 2027 | 12 years | shows that year's months |

The heading cycles days → months → years → days; `Escape` returns to the
days; arrow keys walk the 4-column month / year grid. Months and years
wholly outside `data-min-date` / `data-max-date` are disabled. The picker is
a `.calendar-picker` the JS inserts after the grid (buttons
`.calendar-pick[data-month|data-year]`, the current one `aria-current`).

**Dropdown caption** - `data-caption="dropdown"` replaces the heading with
native month and year `<select class="calendar-select">`s (the fastest way to
a date of birth: open the year, type it). Years run from `data-year-from` to
`data-year-to` (defaults: the min / max date's year, else 100 years back to
10 ahead).

```html
<div class="calendar" data-caption="dropdown" data-year-from="1920" data-max-date="2026-09-28">…</div>
```

## Day data: marks, notes, blocked days

A map from ISO date to `{ mark?, note?, label?, disabled? }`, given either
as JSON inside the calendar (inside the `.calendar-range` for a range
picker) or with `api.setDays(map, { merge })`:

```html
<div class="calendar">
  …
  <script type="application/json" class="calendar-days">
    { "2026-12-25": { "mark": "holiday", "label": "Christmas Day" },
      "2026-12-18": { "mark": "booked", "label": "Office closed", "disabled": true },
      "2026-12-08": { "note": "€119" } }
  </script>
</div>
```

| Field | Becomes | Look |
| --- | --- | --- |
| `mark` | `data-mark="…"` on the cell | `holiday`: red number · `event`: primary dot · `booked`: struck through, hatched · any other name: a neutral dot - style `.calendar-day[data-mark="name"]` |
| `note` | `<span class="calendar-day-note">` under the number | second line (price, count); the calendar gets `data-notes` and taller cells |
| `label` | `title` + the day's accessible name | "Friday, 25 December 2026, Christmas Day, €129" |
| `disabled: true` | `data-disabled` | unselectable, like a day outside min / max |

**Per-month data**: `calendar:view` (`detail: { view, year, month }`) fires
whenever the visible month changes - answer it with `api.setDays(…, { merge: true })`
for that month (a fetch in an app). Every render reads the map, so the view
never moves when the data changes.

## Date range

A range is **one answer**: a start and an end, drawn as one span.

```html
<!-- one month -->
<div class="calendar" data-mode="range" data-range-start="2026-10-12" data-range-end="2026-10-16" aria-label="Report period">
  <div class="calendar-header">…</div>
  <table class="calendar-grid" role="grid"></table>
</div>

<!-- two consecutive months, one shared range, form fields -->
<div class="calendar-range" role="group" aria-label="Stay dates" data-range-start="2026-10-12" data-range-end="2026-10-15">
  <div class="calendar">…header + grid…</div>
  <div class="calendar">…header + grid…</div>
  <div class="calendar-range-footer">
    <input type="hidden" name="check-in" data-range-input="start">
    <input type="hidden" name="check-out" data-range-input="end">
  </div>
</div>
```

- **Owner:** a `.calendar[data-mode="range"]`, or a `.calendar-range` wrapper that turns its calendars into ONE picker - consecutive months, paging together (only the first month's back arrow and the last month's forward arrow show), one shared range drawn across every grid. `data-current-date="YYYY-MM"` on the owner picks the first month when no range is preset.
- **Picking:** the first click sets the start, the second the end. A click **before** the start restarts there - an end can never precede its start. A click after a complete range starts a new one. Disabled days (`data-min-date` / `data-max-date`) never select; outside days are hidden in range mode.
- **Preview:** after the start, hovering or focusing a later day previews the span (`data-range-preview` - lighter band, outlined end), across months.
- **Source of truth:** `data-range-start` / `data-range-end` (ISO) on the owner - preset them in markup; they always mirror the live choice. Inputs inside the owner marked `data-range-input="start"` / `"end"` receive the ISO dates (`change` fires), so the range submits with the form.
- **Event:** every pick fires `calendar:range` on the owner (bubbles) with `detail = { start, end, startIso, endIso }` (`Date`s; `end`/`endIso` null until closed).
- **State API:** `api.setState('default', { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' })` on any calendar of the owner sets the range (an end before the start is dropped; `''` clears); `getState().config` adds `rangeStart` / `rangeEnd`.

## Rendering (morph)

The grid renders through the core `df$` runtime: `df$(grid).morph(nextHtml)`
(see the "DOM Querying & Morphing" guide). Each day `<td>` is generated with a
stable `id` (`<calendar id>-<ISO date>`, e.g. `cal-1-2026-04-15`) and a
`data-cal-date` attribute carrying that ISO date - morph matches by id, so
re-renders move/reuse day nodes instead of replacing them (focus survives a
selection re-render; a keyboard-activated cell regains focus). The grid
mirrors the selection as `data-selected-date` (ISO) for a stable read target.
Outside cells resolve to their real month's date, so keys are identities, not
positions.

## States

The calendar's observable state is its view: visible month + selected day.
Declared states: `default` (reset to today's month, no selection;
`{ year, month, day }` config - 0-based month - navigates/selects).
`getState().config` reports the live `year`/`month`/`selected`.

```js
document.querySelector('#my-calendar').api.setState('default', { year: 2025, month: 0, day: 15 });
document.querySelector('#my-calendar').api.getState(); // { name: 'default', config: { year: 2025, month: 0, selected: 15 } }
```

The api is bound per calendar; the registry global is
`df$.shadcn.calendarApi` / `df$.shadcn.calendarStates`.


## Density

Set `data-density` on the `.calendar` root. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | frame 0.5rem, day cells 1.75rem (hit-area 1.5rem) |
| `comfortable` | frame 0.75rem, day cells 2.25rem (hit-area 2rem) - identical to the unsized default |
| `spacious` | frame 1rem, day cells 2.75rem (hit-area 2.5rem) |

## Accessibility

- Month heading uses `aria-live="polite"` for navigation announcements
- Day cells are focusable buttons within the grid
- Arrow keys navigate the grid, Enter/Space selects a day; in range mode arrows move by calendar day across every month shown (ArrowRight on the 31st lands on the 1st of the next grid)
- Selected days carry `aria-selected="true"` (the single selection, or both endpoints and every day between); forced-colors mode paints them in the system Highlight pair
- Give a range owner a name (`role="group" aria-label="Stay dates"` on `.calendar-range`, `aria-label` on a range `.calendar`)
- Previous/next navigation buttons have `aria-label`
