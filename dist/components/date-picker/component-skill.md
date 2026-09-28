---
name: Date Picker
type: ATM
why: Text field plus calendar in a popover, wired declaratively with command/commandfor attributes.
when: A form field where users type or pick a date - for a start-end date RANGE use the calendar's range mode (one span, one answer) instead of two separate fields.
where: dist/components/date-picker/date-picker.css
supportedStates: default
---

# Pattern: Date Picker

## Native basis
`<input type="date">` element with native browser date picker.

---

## Native Web APIs
- [`<input type="date">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date) - native date picker with calendar UI
- [`<input type="datetime-local">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local) - date and time picker

---

## Structure

### Date
```html
<label class="label" for="birthday">Birthday</label>
<input class="input" type="date" id="birthday">
```

### Date and time
```html
<label class="label" for="meeting">Meeting</label>
<input class="input" type="datetime-local" id="meeting">
```

### With constraints
```html
<input class="input" type="date" id="start" min="2024-01-01" max="2025-12-31">
```

---

## Sizes

| `data-size` | Box height | Font |
|-------------|------------|------|
| `xs` | 1.75rem | 0.75rem |
| `sm` | 2rem | 0.8125rem |
| `md` *(default)* | 2.25rem | 0.875rem |
| `lg` | 2.75rem | 1rem |
| `xl` | 3.25rem | 1.125rem |

Identical to `.input` (md = 2.25rem) so date fields row-align with the other inputs at every step.

---
## Range constraints

```html
<label class="label" for="trip">Travel date</label>
<input class="date-input" type="date" id="trip" min="2024-01-01" max="2026-12-31" aria-describedby="trip-hint">
<p class="date-input-hint" id="trip-hint">Between 1 Jan 2024 and 31 Dec 2026.</p>
```

- `min` / `max` constrain the calendar popup AND typed input: the browser flags a typed date outside the range (`validity.rangeUnderflow` / `rangeOverflow`) and blocks form submission with its own message.
- `.date-input` shows that state once the user has interacted (`:user-invalid` - an untouched empty field never turns red): destructive border and focus ring. `aria-invalid="true"` gives the same look for app-side errors.
- `.date-input-hint` (after the input, referenced by `aria-describedby`) states the allowed range up front and turns destructive with a warning sign when the field is invalid - the state never rests on colour alone. It is always rendered: no show/hide, no JavaScript.

## Notes

- Reuses the `.input` class - the native date picker provides the calendar UI.
- No custom calendar implementation needed - the browser handles it.
- The calendar popup is rendered by the OS/browser and cannot be styled.
- For a fully custom date picker, a custom calendar component would be needed.
