---
name: Delivery Options
type: BLK
why: A radio group is the selection; :has(:checked) highlights the card; arrival dates are <time>s - no script.
when: Checkout, between address-form and payment-form.
where: dist/components/delivery-options/delivery-options.css
supportedStates: default
---

# Pattern: Delivery Options

## Native basis
A `<fieldset>` of radio cards (`<label>` around each `<input type="radio">`): an icon, the method, "Arrives `<time>`…", optional detail (pickup store) and the price.

Built from: [Radio](radio.md).

---

## Native Web APIs
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates

---

## Structure

```html
<fieldset class="mk-delivery-options" style="max-width:34rem">
  <legend>Delivery</legend>
  <label class="mk-delivery-options-option" for="dl-std">
    <input class="radio" type="radio" name="delivery" id="dl-std" value="dl-std" checked required>
    <span class="mk-delivery-options-icon" aria-hidden="true"><i data-lucide="truck"></i></span>
    <span class="mk-delivery-options-text"><strong>Standard</strong><small>Arrives <time datetime="2026-10-07">Tue 7 – Thu 9 Oct</time></small></span>
    <b class="mk-delivery-options-price">Free</b>
  </label>
  <label class="mk-delivery-options-option" for="dl-exp">
    <input class="radio" type="radio" name="delivery" id="dl-exp" value="dl-exp" required>
    <span class="mk-delivery-options-icon" aria-hidden="true"><i data-lucide="zap"></i></span>
    <span class="mk-delivery-options-text"><strong>Express</strong><small>Arrives <time datetime="2026-10-03">tomorrow, Fri 3 Oct</time></small></span>
    <b class="mk-delivery-options-price">€9.90</b>
  </label>
  <label class="mk-delivery-options-option" for="dl-pick">
    <input class="radio" type="radio" name="delivery" id="dl-pick" value="dl-pick" required>
    <span class="mk-delivery-options-icon" aria-hidden="true"><i data-lucide="store"></i></span>
    <span class="mk-delivery-options-text"><strong>Pick up in store</strong><small>Arrives <time datetime="2026-10-02">today after 16:00</time></small><small>Acme Lisbon · Rua da Prata 120</small></span>
    <b class="mk-delivery-options-price">Free</b>
  </label>
</fieldset>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A list of rows |
| `data-variant="grid"` | Cards side by side |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| group | `<fieldset>` + `<legend>` | Named "Delivery" |
| option | `<label>` around the radio | Method, date and price read together |
| price | text "Free" | Never only a color |

---

## Notes
- Show arrival dates, not "3–5 business days".
