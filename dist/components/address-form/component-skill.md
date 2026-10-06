---
name: Address Form
type: BLK
why: The autocomplete tokens (name, address-line1, postal-code, country...) let browsers and password managers fill the whole form in one tap - no script.
when: Checkout, account settings, event shipping. Payment details are payment-form.
where: dist/components/address-form/address-form.css
supportedStates: default
---

# Pattern: Address Form

## Native basis
A `<fieldset>` of labelled Inputs with the standard `autocomplete` tokens in a 6-column grid (`data-span`), a country Select, a "billing address is the same" Checkbox - or saved addresses as radio cards.

Built from: [Input](../input/component-skill.md), [Select](../select/component-skill.md), [Checkbox](../checkbox/component-skill.md), [Label](../label/component-skill.md).

---

## Native Web APIs
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - the browser fills known fields
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<address>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/address) - contact information
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<fieldset class="mk-address-form">
  <legend>Shipping address</legend>
  <div class="mk-address-form-grid">
    <div class="mk-address-form-field"><label class="label" for="ad-country">Country / region</label><select class="select" id="ad-country" name="country" autocomplete="country"><option value="PT">Portugal</option><option value="DE">Germany</option><option value="FR">France</option></select></div>
    <div class="mk-address-form-field" data-span="4"><label class="label" for="ad-name">Full name</label><input class="input" id="ad-name" name="name" autocomplete="shipping name" required></div>
    <div class="mk-address-form-field" data-span="2"><label class="label" for="ad-org">Company <small>(optional)</small></label><input class="input" id="ad-org" name="organization" autocomplete="shipping organization"></div>
    <div class="mk-address-form-field"><label class="label" for="ad-l1">Street and number</label><input class="input" id="ad-l1" name="address1" autocomplete="shipping address-line1" required></div>
    <div class="mk-address-form-field"><label class="label" for="ad-l2">Apartment, floor <small>(optional)</small></label><input class="input" id="ad-l2" name="address2" autocomplete="shipping address-line2"></div>
    <div class="mk-address-form-field" data-span="2"><label class="label" for="ad-zip">Postal code</label><input class="input" id="ad-zip" name="postal" autocomplete="shipping postal-code" required></div>
    <div class="mk-address-form-field" data-span="4"><label class="label" for="ad-city">City</label><input class="input" id="ad-city" name="city" autocomplete="shipping address-level2" required></div>
    <div class="mk-address-form-field" data-span="3"><label class="label" for="ad-tel">Phone <small>(for the courier)</small></label><input class="input" id="ad-tel" type="tel" name="tel" autocomplete="shipping tel" inputmode="tel"></div>
    <div class="mk-address-form-field" data-span="3"><label class="label" for="ad-mail">Email</label><input class="input" id="ad-mail" type="email" name="email" autocomplete="email" required></div>
  </div>
  <div class="mk-address-form-same"><input class="checkbox" type="checkbox" id="ad-same" name="billing-same" checked><label for="ad-same">Billing address is the same</label></div>
</fieldset>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A 6-column grid of autofill fields (one column when narrow) |
| `data-span` | How many of the 6 columns a field takes |
| `.mk-address-form-saved` | Saved addresses as radio cards, plus "add a new address" |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| fields | `<label for>` + `autocomplete` | Every field labelled and autofillable |
| optional | "(optional)" in the label | Not color or an asterisk alone |
| saved | `<fieldset>` of radios | One choice; the address in `<address>` |

---

## Notes
- Ask for the country first - it decides the rest of the format.
- Do not split names into first / last unless you must.
