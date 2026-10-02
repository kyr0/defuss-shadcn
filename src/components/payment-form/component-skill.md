---
name: Payment Form
type: BLK
why: The method tabs are radio inputs and :has(:checked) shows the matching panel; the card fields use cc-* autocomplete tokens and inputmode - no script.
when: The last step of checkout. Shipping comes from address-form and delivery-options.
where: dist/components/payment-form/payment-form.css
supportedStates: default
---

# Pattern: Payment Form

## Native basis
A `<fieldset>`: methods as radio "tabs" (`value="card|paypal|bank"`), one panel per method (`data-method`) shown with `:has()`; the card panel has number, expiry, security code and name with `autocomplete="cc-…"` and `inputmode="numeric"`.

Built from: [Input](../input/component-skill.md), [Label](../label/component-skill.md), [Checkbox](../checkbox/component-skill.md), [Radio](../radio/component-skill.md), [Button](../button/component-skill.md).

---

## Native Web APIs
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - the browser fills known fields
- [`inputmode`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode) - the right on-screen keyboard
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form

---

## Structure

```html
<form action="#" method="post">
<fieldset class="mk-payment-form">
  <legend>Payment</legend>
  <div class="mk-payment-form-methods">
    <label><input type="radio" name="method" value="card" checked><i data-lucide="credit-card"></i>Card</label>
    <label><input type="radio" name="method" value="paypal"><i data-lucide="wallet"></i>PayPal</label>
    <label><input type="radio" name="method" value="bank"><i data-lucide="landmark"></i>Bank transfer</label>
  </div>
  <div class="mk-payment-form-panel" data-method="card">
    <div class="mk-payment-form-fields">
      <div class="mk-payment-form-field mk-payment-form-number" data-span="full"><label class="label" for="pf-num">Card number</label><div class="mk-payment-form-number"><input class="input" id="pf-num" name="cc-number" autocomplete="cc-number" inputmode="numeric" pattern="[0-9 ]{13,23}" placeholder="1234 1234 1234 1234"><ul aria-hidden="true"><li>VISA</li><li>MC</li><li>AMEX</li></ul></div></div>
      <div class="mk-payment-form-field"><label class="label" for="pf-exp">Expiry</label><input class="input" id="pf-exp" name="cc-exp" autocomplete="cc-exp" inputmode="numeric" placeholder="MM / YY"></div>
      <div class="mk-payment-form-field"><label class="label" for="pf-cvc">Security code</label><input class="input" id="pf-cvc" name="cc-csc" autocomplete="cc-csc" inputmode="numeric" maxlength="4" placeholder="CVC"></div>
      <div class="mk-payment-form-field" data-span="full"><label class="label" for="pf-name">Name on card</label><input class="input" id="pf-name" name="cc-name" autocomplete="cc-name"></div>
    </div>
    <div class="checkbox-item"><input class="checkbox" type="checkbox" id="pf-save" name="save"><label for="pf-save">Save this card for next time</label></div>
  </div>
  <div class="mk-payment-form-panel" data-method="paypal"><p>You will be sent to PayPal to approve the payment, then back here to confirm.</p></div>
  <div class="mk-payment-form-panel" data-method="bank">
    <p>Transfer the total within 7 days. Your order ships when the money arrives.</p>
    <dl><div><dt>IBAN</dt><dd>PT50 0002 0123 1234 5678 9015 4</dd></div><div><dt>Reference</dt><dd>A-20481</dd></div></dl>
  </div>
  <button class="btn" data-size="lg" type="submit">Pay €88.90</button>
  <p class="mk-payment-form-note"><i data-lucide="lock"></i> Payments are encrypted and processed by our payment provider.</p>
</fieldset>
</form>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Method tabs; the checked one shows its panel |
| `.mk-payment-form-saved` | Saved cards as radio rows, with "use another card" |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| methods | `<fieldset>` of radios | A real radio group - arrow keys switch |
| card fields | `autocomplete="cc-number|cc-exp|cc-csc|cc-name"` | Autofill from the browser wallet |
| hidden panels | `display: none` | Inactive fields leave the tab order and validation |

---

## Notes
- Never store card numbers yourself - post them to your payment provider.
- Inactive panels are display: none, so their required fields are skipped... only when you remove `required` server-side too. Prefer one form per method.
