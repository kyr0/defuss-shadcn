---
name: Discount Form
type: BLK
why: pattern + required check the format in the browser, :user-invalid and aria-invalid show the error - the applied state is plain markup with a remove button.
when: Cart and checkout. Gift cards with a balance need their own form; a promotion banner is offer-banner.
where: dist/components/discount-form/discount-form.css
supportedStates: default
---

# Pattern: Discount Form

## Native basis
A `<form>`: a labelled Input (`pattern`, `required`, `aria-describedby` → the error) and an Apply Button. A failed check from the server sets `aria-invalid="true"`; success renders `.mk-discount-form-applied` (`role="status"`) with the code, the saving and a remove button.

Built from: [Input](../input/component-skill.md), [Label](../label/component-skill.md), [Button](../button/component-skill.md).

---

## Native Web APIs
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form
- [`:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid) - errors show only after the user tried
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure, no script

---

## Structure

```html
<form class="mk-discount-form" action="#" method="post">
  <label class="label" for="dc-1">Discount code</label>
  <div class="mk-discount-form-row">
    <input class="input" id="dc-1" name="code" placeholder="e.g. AUTUMN30" pattern="[A-Za-z0-9]{4,12}" required autocomplete="off" spellcheck="false" aria-describedby="dc-1-err">
    <button class="btn" data-variant="outline" type="submit">Apply</button>
  </div>
  <p class="mk-discount-form-error" id="dc-1-err"><i data-lucide="circle-alert"></i><span>This code is not valid or has expired.</span></p>
</form>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Label, field and Apply on one row; the format error shows after a try (`:user-invalid`) |
| `aria-invalid="true"` | A server-side rejection: red field and the message |
| `.mk-discount-form-applied` | The applied code as a chip with the saving and remove |
| `data-variant="collapsed"` | Behind a "Have a code?" disclosure (`<details>`) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| error | `aria-describedby` → message | Read with the field |
| applied | `role="status"` | Announced when it appears |
| remove | `aria-label="Remove code …"` | Names the code |

---

## Notes
- Never clear the field on an error - let people fix a typo.
