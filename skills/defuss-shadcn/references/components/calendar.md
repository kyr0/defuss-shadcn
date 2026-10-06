---
name: Calendar
type: ATM
section: data-display
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

| View (`data-view` on the root) | Heading shows | Arrows step | A pick... |
| --- | --- | --- | --- |
| days (no attribute) | September 2026 | a month | selects the day |
| `months` | 2026 | a year | shows that month's days |
| `years` | `2016 – 2027` | 12 years | shows that year's months |

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

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type CalendarState = 'default'</code> - `setState(name, config)` takes the config of the state it names (`CalendarStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The month view; without a config it shows today's month. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>year?</code></td><td><code>number</code></td><td>the year to show</td></tr><tr><td><code>month?</code></td><td><code>number</code></td><td>the month to show, 0-11</td></tr><tr><td><code>day?</code></td><td><code>number</code></td><td>the day of that month to select</td></tr><tr><td><code>selected?</code></td><td><code>number \| null</code></td><td>the selected day (what getState() reports; setState accepts it back)</td></tr><tr><td><code>date?</code></td><td><code>string</code></td><td>'YYYY-MM' or 'YYYY-MM-DD': show that month (and select that day) - instead of year / month / day</td></tr><tr><td><code>minDate?</code></td><td><code>string \| null</code></td><td>the earliest selectable day, 'YYYY-MM-DD' ('' clears it)</td></tr><tr><td><code>maxDate?</code></td><td><code>string \| null</code></td><td>the latest selectable day, 'YYYY-MM-DD' ('' clears it)</td></tr><tr><td><code>start?</code></td><td><code>string \| null</code></td><td>a range picker: the range's first day, 'YYYY-MM-DD' (null clears the range) - moves the view to it</td></tr><tr><td><code>end?</code></td><td><code>string \| null</code></td><td>a range picker: the range's last day, 'YYYY-MM-DD' (never before start)</td></tr><tr><td><code>view?</code></td><td><code>'days' \| 'months' \| 'years'</code></td><td>reported by getState(): the panel shown</td></tr><tr><td><code>rangeStart?</code></td><td><code>string \| null</code></td><td>reported by getState() in a range picker: the range's first day</td></tr><tr><td><code>rangeEnd?</code></td><td><code>string \| null</code></td><td>reported by getState() in a range picker: the range's last day</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends CalendarState&gt;(name: S, config?: CalendarStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>CalendarStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: CalendarState; config: CalendarStateConfigs[CalendarState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: CalendarState; config: CalendarStateConfigs[CalendarState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: CalendarState; config: CalendarStateConfigs[CalendarState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: CalendarState; config: CalendarStateConfigs[CalendarState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: CalendarState; config: CalendarStateConfigs[CalendarState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.calendarApi.setState&lt;S extends CalendarState&gt;(el: HTMLElement, name: S, config?: CalendarStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>CalendarStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.calendarApi.getState(el: HTMLElement): { name: CalendarState; config: CalendarStateConfigs[CalendarState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: CalendarState; config: CalendarStateConfigs[CalendarState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.calendarApi.render(state: { name: CalendarState; config: CalendarStateConfigs[CalendarState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: CalendarState; config: CalendarStateConfigs[CalendarState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.calendarApi.store(el: HTMLElement): Store&lt;{ name: CalendarState; config: CalendarStateConfigs[CalendarState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: CalendarState; config: CalendarStateConfigs[CalendarState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.calendarApi.commit&lt;S extends CalendarState&gt;(el: HTMLElement, name: S, config?: CalendarStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>CalendarStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.calendarApi.setDays(cal: HTMLElement, days: Record&lt;string, CalendarDay&gt;, options: { merge?: boolean } = {}): void</code> | Day data for this calendar (a range picker: for its whole .calendar-range). Replaces the map unless { merge: true }; re-renders without moving the view. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>cal</code></td><td><code>HTMLElement</code></td><td>the .calendar element</td></tr><tr><td><code>days</code></td><td><code>Record&lt;string, CalendarDay&gt;</code></td><td>the day data by ISO date ('YYYY-MM-DD')</td></tr><tr><td><code>options</code></td><td><code>{ merge?: boolean }</code> = <code>{}</code></td><td>merge: true adds to the current map instead of replacing it</td></tr></table> |
| <code>df$.shadcn.calendarStates: CalendarState[]</code> | The declared states, 'default' first: <code>default</code>. |

### Events

| Event | Description |
|---|---|
| `calendar:range` | Fires when a range is complete (its second date) - start and end as Dates and as ISO dates. <code>detail</code>: <code>CalendarRangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>start</code></td><td><code>Date \| null</code></td><td>the first date as a Date (local midnight), null while unset</td></tr><tr><td><code>end</code></td><td><code>Date \| null</code></td><td>the last date as a Date, null while unset</td></tr><tr><td><code>startIso</code></td><td><code>string \| null</code></td><td>the first date as YYYY-MM-DD, null while unset</td></tr><tr><td><code>endIso</code></td><td><code>string \| null</code></td><td>the last date as YYYY-MM-DD, null while unset</td></tr></table> |
| `calendar:select` | Fires when a day is picked (click or Enter) - the date. <code>detail</code>: <code>CalendarSelectDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>date</code></td><td><code>Date</code></td><td>the selected day, local midnight</td></tr></table> |
| `calendar:view` | Fires when the panel changes - the view (days, months, years) and the year and month it shows. <code>detail</code>: <code>CalendarViewDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>view</code></td><td><code>'days' \| 'months' \| 'years'</code></td><td>the panel shown: days of a month, the months of a year, or a page of years</td></tr><tr><td><code>year</code></td><td><code>number</code></td><td>the year it shows</td></tr><tr><td><code>month</code></td><td><code>number</code></td><td>the month it shows, 0-11</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `CalendarDay` | One day's data - from the calendar's JSON &lt;script class="calendar-days"&gt; or setDays(). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>mark?</code></td><td><code>string</code></td><td>a mark name: 'holiday' (red number), 'event' (primary dot), 'booked' (struck through) or any name (a neutral dot, style it yourself)</td></tr><tr><td><code>note?</code></td><td><code>string \| number</code></td><td>a second line under the number (a price, a count)</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>added to the day's title and accessible name</td></tr><tr><td><code>disabled?</code></td><td><code>boolean</code></td><td>true: the day cannot be picked</td></tr></table> |
| `CalendarRangeDetail` | What calendar:range carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>start</code></td><td><code>Date \| null</code></td><td>the first date as a Date (local midnight), null while unset</td></tr><tr><td><code>end</code></td><td><code>Date \| null</code></td><td>the last date as a Date, null while unset</td></tr><tr><td><code>startIso</code></td><td><code>string \| null</code></td><td>the first date as YYYY-MM-DD, null while unset</td></tr><tr><td><code>endIso</code></td><td><code>string \| null</code></td><td>the last date as YYYY-MM-DD, null while unset</td></tr></table> |
| `CalendarSelectDetail` | What calendar:select carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>date</code></td><td><code>Date</code></td><td>the selected day, local midnight</td></tr></table> |
| `CalendarViewDetail` | What calendar:view carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>view</code></td><td><code>'days' \| 'months' \| 'years'</code></td><td>the panel shown: days of a month, the months of a year, or a page of years</td></tr><tr><td><code>year</code></td><td><code>number</code></td><td>the year it shows</td></tr><tr><td><code>month</code></td><td><code>number</code></td><td>the month it shows, 0-11</td></tr></table> |


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
