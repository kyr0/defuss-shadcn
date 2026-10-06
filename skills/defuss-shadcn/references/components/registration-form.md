---
name: Registration Form
type: BLK
section: website
why: Radio cards and checkboxes hold every choice (:has(:checked) shows it); fieldsets name the groups; the browser validates - no script.
when: Conference and event sign-up. Appointments use booking-form; account creation is signup-form.
where: dist/components/registration-form/registration-form.css
supportedStates: default
---

# Pattern: Registration Form

## Native basis
A `<form>` of `<fieldset>`s: tickets as radio cards (price, perks, "few left" Badge), attendee Inputs with `autocomplete`, workshops as Checkboxes, a dietary Select, an accessibility Textarea, consent and the total.

Built from: [Radio](radio.md), [Checkbox](checkbox.md), [Input](input.md), [Select](select.md), [Textarea](textarea.md), [Badge](badge.md), [Button](button.md).

---

## Native Web APIs
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - the browser fills known fields
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - a computed result
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-registration-form" aria-labelledby="reg-title">
  <h2 id="reg-title" class="sr-only">Register for Acme Summit 2026</h2>
  <form action="#" method="post">
    <fieldset class="mk-registration-form-group">
      <legend>Ticket</legend>
      <div class="mk-registration-form-tickets">
        <label class="mk-registration-form-ticket" for="rg-standard"><input class="radio" type="radio" name="ticket" id="rg-standard" value="rg-standard" checked required><span class="mk-registration-form-ticket-name">Standard</span><b>€290</b><small>Both days, lunch, recordings.</small></label>
        <label class="mk-registration-form-ticket" for="rg-workshop"><input class="radio" type="radio" name="ticket" id="rg-workshop" value="rg-workshop" required><span class="mk-registration-form-ticket-name">Standard + Workshops <span class="badge" data-variant="secondary" data-size="sm">Few left</span></span><b>€440</b><small>Everything in Standard plus two hands-on workshops.</small></label>
        <label class="mk-registration-form-ticket" for="rg-stream"><input class="radio" type="radio" name="ticket" id="rg-stream" value="rg-stream" required><span class="mk-registration-form-ticket-name">Online</span><b>€90</b><small>Live stream, Q&amp;A and recordings.</small></label>
      </div>
    </fieldset>
    <fieldset class="mk-registration-form-group">
      <legend>Attendee</legend>
      <div class="mk-registration-form-fields">
        <div class="mk-registration-form-field"><label class="label" for="rg-name">Full name</label><input class="input" id="rg-name" name="name" autocomplete="name" required></div>
        <div class="mk-registration-form-field"><label class="label" for="rg-email">Email</label><input class="input" id="rg-email" type="email" name="email" autocomplete="email" required></div>
        <div class="mk-registration-form-field"><label class="label" for="rg-org">Company</label><input class="input" id="rg-org" name="organization" autocomplete="organization"></div>
        <div class="mk-registration-form-field"><label class="label" for="rg-role">Role</label><input class="input" id="rg-role" name="role" autocomplete="organization-title"></div>
      </div>
    </fieldset>
    <fieldset class="mk-registration-form-group">
      <legend>Workshops <small style="font-weight:400;color:var(--muted-foreground)">(with the workshop ticket)</small></legend>
      <div class="mk-registration-form-choices">
        <div class="checkbox-item"><input class="checkbox" type="checkbox" id="rg-w1" name="workshops" value="sync"><label for="rg-w1">Offline-first sync, hands on</label><small>12 seats left</small></div>
        <div class="checkbox-item"><input class="checkbox" type="checkbox" id="rg-w2" name="workshops" value="a11y" checked><label for="rg-w2">Accessible components from scratch</label><small>4 seats left</small></div>
      </div>
    </fieldset>
    <fieldset class="mk-registration-form-group">
      <legend>Your needs</legend>
      <div class="mk-registration-form-fields">
        <div class="mk-registration-form-field"><label class="label" for="rg-diet">Dietary preference</label><select class="select" id="rg-diet" name="diet"><option>No preference</option><option>Vegetarian</option><option>Vegan</option><option>Gluten-free</option></select></div>
        <div class="mk-registration-form-field" data-span="full"><label class="label" for="rg-a11y">Accessibility needs</label><textarea class="textarea" id="rg-a11y" name="access" rows="2" placeholder="Step-free access, captions, a quiet room…"></textarea></div>
      </div>
    </fieldset>
    <div class="mk-registration-form-total">
      <div><span>Total incl. VAT</span><output name="total" for="rg-standard rg-workshop rg-stream">€290</output></div>
      <button class="btn" data-size="lg" type="submit">Register</button>
    </div>
  </form>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Tickets as cards (a row from 40rem), the attendee, workshops, needs, the total and submit |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| tickets | `<fieldset>` of radios | One choice, announced with its price |
| workshops | `<fieldset>` of checkboxes | Several choices |
| total | `<output>` | The computed price |

---

## Notes
- Ask about accessibility needs - and read the answers.
