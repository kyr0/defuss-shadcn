---
name: Order Summary
type: BLK
section: website
why: A list and a <dl>; the mobile version is a <details> whose summary shows the total - opens and closes natively, no script.
when: Beside the checkout steps and on the confirmation page. In the cart use cart-item + cart-summary.
where: dist/components/order-summary/order-summary.css
supportedStates: default
---

# Pattern: Order Summary

## Native basis
An `<aside>` (or a `<details>` for the collapsible variant): the items as a list with a quantity badge on each thumbnail, then a `<dl>` of subtotal, discount, shipping and the total.

---

## Native Web APIs
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure, no script
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside

---

## Structure

```html
<aside class="mk-order-summary" aria-labelledby="os-title">
  <h2 class="mk-order-summary-title" id="os-title">Your order</h2>
  <ul class="mk-order-summary-items">
    <li><span class="mk-order-summary-thumb"><img src="https://picsum.photos/seed/prod-shirt/160/200" alt=""><b aria-label="Quantity 1">1</b></span><span class="mk-order-summary-name">Linen shirt<small>Sand · M</small></span><span class="mk-order-summary-price">€64.00</span></li>
    <li><span class="mk-order-summary-thumb"><img src="https://picsum.photos/seed/prod-mug/160/200" alt=""><b aria-label="Quantity 2">2</b></span><span class="mk-order-summary-name">Stoneware mug<small>Oat</small></span><span class="mk-order-summary-price">€44.00</span></li>
  </ul>
  <dl class="mk-order-summary-totals">
    <div><dt>Subtotal</dt><dd>€108.00</dd></div>
    <div data-discount><dt>Discount (AUTUMN30)</dt><dd>−€24.00</dd></div>
    <div><dt>Shipping · Standard</dt><dd>€4.90</dd></div>
    <div data-total><dt>Total <small>incl. €16.62 VAT</small></dt><dd>€88.90</dd></div>
  </dl>
</aside>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Items and the breakdown on a muted panel |
| `data-variant="collapsible"` | A `<details>`: "Show order summary" with the total; opens to the full summary |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| quantity badge | `aria-label="Quantity 2"` | The number has a name |
| collapsible | `<details>` + `<summary>` | Native disclosure with the total in the summary |

---

## Notes
- Keep it identical to what the customer will be charged.
