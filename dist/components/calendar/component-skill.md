---
name: Calendar
type: ATM
why: Month grid with keyboard navigation and selection state via the State API.
when: Displaying or selecting days inside a larger date UI - pair with a popover for a full picker.
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
    <span class="calendar-heading" aria-live="polite">April 2026</span>
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

| Class                   | Description                        |
|-------------------------|------------------------------------|
| `calendar-day`          | Base day cell                      |
| `data-today`    | Today's date                       |
| `data-selected` | Selected date                      |
| `data-outside`  | Day from adjacent month            |
| `data-disabled` | Non-selectable date                |

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
- Arrow keys navigate the grid, Enter/Space selects a day
- Previous/next navigation buttons have `aria-label`
