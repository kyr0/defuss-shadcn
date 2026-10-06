---
name: Cart Item
type: BLK
section: website
why: The Number Input component steps the quantity; the line total is an <output>; remove is a labelled button - all native controls.
when: Cart pages and mini carts. The totals go in cart-summary; checkout recap uses order-summary.
where: dist/components/cart-item/cart-item.css
supportedStates: default
---

# Pattern: Cart Item

## Native basis
An `<li>` in the cart list: thumbnail, name link, chosen options and unit price, a Number Input (with a visually hidden label naming the product), the line total as `<output for>` and a remove button.

Built from: [Number Input](../../forms-inputs/number-input/component-skill.md).

---

## Native Web APIs
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - a computed result
- [`inputmode`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode) - the right on-screen keyboard
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<ul class="mk-cart-list" aria-label="Cart, 2 items">
  <li class="mk-cart-item">
    <img class="mk-cart-item-image" src="https://picsum.photos/seed/prod-shirt/240/300" alt="">
    <div class="mk-cart-item-info">
      <h3 class="mk-cart-item-name"><a href="#">Linen shirt</a></h3>
      <p class="mk-cart-item-options">Sand · Size M</p>
      <p class="mk-cart-item-unit">€64.00 each</p>
    </div>
    <div class="mk-cart-item-qty">
      <label class="sr-only" for="ci-1-qty">Quantity of Linen shirt</label>
      <div class="number-input"><button type="button" data-action="decrement" aria-label="Decrease quantity of Linen shirt">−</button><input type="number" id="ci-1-qty" name="qty" min="0" max="10" value="1" inputmode="numeric"><button type="button" data-action="increment" aria-label="Increase quantity of Linen shirt">+</button></div>
    </div>
    <output class="mk-cart-item-total" for="ci-1-qty">€64.00</output>
    <button class="mk-cart-item-remove" type="button" aria-label="Remove Linen shirt from cart"><i data-lucide="x"></i></button>
  </li>
  <li class="mk-cart-item">
    <img class="mk-cart-item-image" src="https://picsum.photos/seed/prod-mug/240/300" alt="">
    <div class="mk-cart-item-info">
      <h3 class="mk-cart-item-name"><a href="#">Stoneware mug</a></h3>
      <p class="mk-cart-item-options">Oat · 350 ml</p>
      <p class="mk-cart-item-unit">€22.00 each</p>
    </div>
    <div class="mk-cart-item-qty">
      <label class="sr-only" for="ci-2-qty">Quantity of Stoneware mug</label>
      <div class="number-input"><button type="button" data-action="decrement" aria-label="Decrease quantity of Stoneware mug">−</button><input type="number" id="ci-2-qty" name="qty" min="0" max="10" value="2" inputmode="numeric"><button type="button" data-action="increment" aria-label="Increase quantity of Stoneware mug">+</button></div>
    </div>
    <output class="mk-cart-item-total" for="ci-2-qty">€44.00</output>
    <button class="mk-cart-item-remove" type="button" aria-label="Remove Stoneware mug from cart"><i data-lucide="x"></i></button>
  </li>
</ul>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A row: picture, details, quantity stepper, total, remove (wraps when narrow) |
| `data-variant="compact"` | Mini cart: small picture, "Qty 2" as text |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| quantity | sr-only `<label>` "Quantity of ..." | Every stepper names its product |
| total | `<output for>` | Tied to the quantity |
| remove | `aria-label="Remove … from cart"` | Unique per line |

---

## Notes
- Update totals on change and announce them (an `aria-live` region in the summary).
