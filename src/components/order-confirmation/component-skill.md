---
name: Order Confirmation
type: BLK
why: Headings, a <dl> of the details and an ordered list of next steps; the check animation is SVG stroke-dashoffset with @starting-style-free CSS keyframes, off under reduced motion.
when: After payment succeeds. Shipment progress afterwards is tracking-status; a generic success is success-state.
where: dist/components/order-confirmation/order-confirmation.css
supportedStates: default
---

# Pattern: Order Confirmation

## Native basis
A `<section role="status">`: an animated check, the thank-you heading, the order number (`<code>`, selectable), a `<dl>` of date, payment, delivery address (`<address>`) and estimate, the next steps as an `<ol>` and two actions.

Built from: [Button](../button/component-skill.md).

---

## Native Web APIs
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`<address>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/address) - contact information
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - an ordered sequence
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - motion stands still on request

---

## Structure

```html
<section class="mk-order-confirmation" role="status" aria-labelledby="oc-title">
  <svg class="mk-order-confirmation-check" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22"/><path d="m14 25 7 7 13-15"/></svg>
  <h1 class="mk-order-confirmation-title" id="oc-title">Thank you, Anna!</h1>
  <p class="mk-order-confirmation-lead">Your order <code>A-20481</code> is confirmed. We sent the details to anna@example.com.</p>
  <dl class="mk-order-confirmation-details">
    <div><dt>Order date</dt><dd><time datetime="2026-10-01T14:32">1 October 2026, 14:32</time></dd></div>
    <div><dt>Payment</dt><dd>Visa •••• 4242 · €88.90</dd></div>
    <div><dt>Delivery to</dt><dd><address>Anna Silva<br>Rua da Prata 120, 2º<br>1100-420 Lisboa</address></dd></div>
    <div><dt>Estimated delivery</dt><dd><time datetime="2026-10-07">Tue 7</time> – <time datetime="2026-10-09">Thu 9 October</time></dd></div>
  </dl>
  <ol class="mk-order-confirmation-steps" aria-label="What happens next">
    <li><div>We pack your order <span>- usually within a day.</span></div></li>
    <li><div>You get a tracking link <span>by email when it ships.</span></div></li>
    <li><div>Not right? <span>Returns are free for 30 days.</span></div></li>
  </ol>
  <div class="mk-order-confirmation-actions">
    <a class="btn" href="#">Track your order</a>
    <a class="btn" data-variant="outline" href="#">Continue shopping</a>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A centered confirmation with details and next steps |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `role="status"` | Announced on arrival |
| order number | `<code>` with `user-select: all` | One click selects it |
| animation | `prefers-reduced-motion` | The check is drawn statically |

---

## Notes
- Send the same details by email and say so.
