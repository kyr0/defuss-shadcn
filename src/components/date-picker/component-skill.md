---
name: Date Picker
type: ATM
why: Text field plus calendar in a popover, wired declaratively with command/commandfor attributes.
when: A form field where users type or pick a date.
where: dist/components/date-picker/date-picker.css
supportedStates: default
---

# Pattern: Date Picker

## Native basis
`<input type="date">` element with native browser date picker.

---

## Native Web APIs
- [`<input type="date">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date) — native date picker with calendar UI
- [`<input type="datetime-local">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local) — date and time picker

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
## Notes

- Reuses the `.input` class — the native date picker provides the calendar UI.
- No custom calendar implementation needed — the browser handles it.
- The calendar popup is rendered by the OS/browser and cannot be styled.
- For a fully custom date picker, a custom calendar component would be needed.
