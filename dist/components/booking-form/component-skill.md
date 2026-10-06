---
name: Booking Form
type: BLK
section: website
why: Radio inputs are the selection state: :has(:checked) highlights the card or chip, disabled marks booked slots, the browser validates - no script.
when: Appointments, demos, consultations, table reservations. Event tickets use registration-form.
where: dist/components/booking-form/booking-form.css
supportedStates: default
---

# Pattern: Booking Form

## Native basis
A `<form>`: services as radio cards, an `<input type="date">`, time slots as radio chips (booked ones `disabled`), contact Inputs and a summary with the submit Button.

Built from: [Radio](../radio/component-skill.md), [Input](../input/component-skill.md), [Label](../label/component-skill.md), [Textarea](../textarea/component-skill.md), [Button](../button/component-skill.md).

---

## Native Web APIs
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<input type="date">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date) - a native date picker
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - the browser fills known fields
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-booking-form" aria-labelledby="bk-title">
  <h2 id="bk-title" class="sr-only">Book an appointment</h2>
  <form action="#" method="post">
    <div class="mk-booking-form-layout">
      <div style="display:grid;gap:2rem">
        <fieldset class="mk-booking-form-group">
          <legend>1. Choose a service</legend>
          <div class="mk-booking-form-options">
            <label class="mk-booking-form-option" for="bk-intro"><input class="radio" type="radio" name="service" id="bk-intro" value="bk-intro" checked required><span><strong>Intro call</strong><small>20 min · video</small></span><b>Free</b></label>
            <label class="mk-booking-form-option" for="bk-workshop"><input class="radio" type="radio" name="service" id="bk-workshop" value="bk-workshop" required><span><strong>Team workshop</strong><small>90 min · on site or video</small></span><b>€240</b></label>
            <label class="mk-booking-form-option" for="bk-review"><input class="radio" type="radio" name="service" id="bk-review" value="bk-review" required><span><strong>Workspace review</strong><small>45 min · video</small></span><b>€90</b></label>
          </div>
        </fieldset>
        <fieldset class="mk-booking-form-group">
          <legend>2. Pick a date and time</legend>
          <div class="mk-booking-form-field"><label class="label" for="bk-date">Date</label><input class="input" type="date" id="bk-date" name="date" min="2026-10-02" value="2026-10-06" required></div>
          <div class="mk-booking-form-slots" role="group" aria-label="Available times">
            <label class="mk-booking-form-slot"><input type="radio" name="slot" value="09:00" required><span>09:00</span></label><label class="mk-booking-form-slot"><input type="radio" name="slot" value="09:30" disabled required><span>09:30</span></label><label class="mk-booking-form-slot"><input type="radio" name="slot" value="10:00" checked required><span>10:00</span></label><label class="mk-booking-form-slot"><input type="radio" name="slot" value="11:30" required><span>11:30</span></label><label class="mk-booking-form-slot"><input type="radio" name="slot" value="13:00" disabled required><span>13:00</span></label><label class="mk-booking-form-slot"><input type="radio" name="slot" value="14:30" required><span>14:30</span></label><label class="mk-booking-form-slot"><input type="radio" name="slot" value="16:00" required><span>16:00</span></label><label class="mk-booking-form-slot"><input type="radio" name="slot" value="16:30" disabled required><span>16:30</span></label>
          </div>
          <span class="mk-booking-form-tz">Times in Lisbon time (WEST, UTC+1)</span>
        </fieldset>
      </div>
      <div style="display:grid;gap:2rem;align-content:start">
        <fieldset class="mk-booking-form-group">
          <legend>3. Your details</legend>
          <div class="mk-booking-form-fields">
            <div class="mk-booking-form-field"><label class="label" for="bk-name">Name</label><input class="input" id="bk-name" name="name" autocomplete="name" required></div>
            <div class="mk-booking-form-field"><label class="label" for="bk-email">Email</label><input class="input" id="bk-email" type="email" name="email" autocomplete="email" required></div>
            <div class="mk-booking-form-field" data-span="full"><label class="label" for="bk-notes">Anything we should know?</label><textarea class="textarea" id="bk-notes" name="notes" rows="3"></textarea></div>
          </div>
        </fieldset>
        <div class="mk-booking-form-summary">
          <p>You can change or cancel up to 24 hours before. We send a calendar invite right away.</p>
          <button class="btn" type="submit">Confirm booking</button>
        </div>
      </div>
    </div>
  </form>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Choices left, details and the summary right (from 52rem) |
| `data-variant="compact"` | One column on a card |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| groups | `<fieldset>` + `<legend>` | Service, date and time are named groups |
| slots | `<input type="radio" disabled>` | Booked slots are announced as unavailable |
| cards | `<label for>` | The whole card selects |

---

## Notes
- Show the time zone next to the slots.
- Confirm with a success-state and an email.
