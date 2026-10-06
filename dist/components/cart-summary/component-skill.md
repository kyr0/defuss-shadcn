---
name: Cart Summary
type: BLK
section: website
why: A <dl> for the breakdown, a native <progress> toward free shipping and a polite live region for the total - no script needed to render.
when: Beside cart-item rows, or in a mini cart. During checkout use order-summary.
where: dist/components/cart-summary/cart-summary.css
supportedStates: default
---

# Pattern: Cart Summary

## Native basis
An `<aside>`: a Progress field ("€16 to free shipping"), a `<dl>` of subtotal, discount, shipping and tax, the total (`aria-live="polite"`), the checkout Button, the accepted payment methods and a security note.

Built from: [Progress](../progress/component-skill.md), [Button](../button/component-skill.md).

---

## Native Web APIs
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`<progress>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) - native completion bar
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - a computed result

---

## Structure

```html
<aside class="mk-cart-summary" aria-labelledby="cs-title" style="max-width:24rem">
  <h2 class="mk-cart-summary-title" id="cs-title">Order summary</h2>
  <div class="mk-cart-summary-shipping"><label for="cs-free">Add <strong>€16.00</strong> more for free shipping</label><progress class="progress" id="cs-free" value="84" max="100">84%</progress></div>
  <dl class="mk-cart-summary-lines">
    <div><dt>Subtotal (3 items)</dt><dd>€108.00</dd></div>
    <div data-discount><dt>Discount · AUTUMN30</dt><dd>−€24.00</dd></div>
    <div><dt>Shipping</dt><dd>€4.90</dd></div>
    <div><dt>VAT (included)</dt><dd>€16.62</dd></div>
  </dl>
  <div class="mk-cart-summary-total"><span>Total<small>incl. VAT</small></span><output aria-live="polite">€88.90</output></div>
  <a class="btn mk-cart-summary-checkout" data-size="lg" href="#">Checkout <i data-lucide="arrow-right"></i></a>
  <ul class="mk-cart-summary-pay" aria-label="We accept"><li>VISA</li><li>MASTERCARD</li><li>PAYPAL</li><li>APPLE PAY</li><li>KLARNA</li></ul>
  <p class="mk-cart-summary-note"><i data-lucide="lock"></i> Secure checkout · 30-day returns</p>
</aside>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card with progress, breakdown, total, checkout, payments, note |
| `data-variant="compact"` | Subtotal and checkout only - for a mini cart |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| total | `<output aria-live="polite">` | Announced when the cart changes |
| progress | `<progress>` + label | Free-shipping goal as a real progress bar |
| discount | text, not color | "−€24" - the minus is in the text |

---

## Notes
- Show taxes and shipping before checkout - surprises lose carts.
