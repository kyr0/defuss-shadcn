---
name: Wishlist Item
type: BLK
section: website
why: A list item with real buttons and a stock state in one data attribute - status reads as text, not color alone. No script.
when: Wishlists and "saved for later" lists. Items in the cart are cart-item; catalog cards are product-item.
where: dist/components/wishlist-item/wishlist-item.css
supportedStates: default
---

# Pattern: Wishlist Item

## Native basis
An `<li>`: thumbnail, name link, options, stock (`data-stock="in|low|out"`), the saved date, the price and actions - Add to cart (or "Notify me" when out of stock) and a labelled remove button.

Built from: [Button](button.md).

---

## Native Web APIs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside

---

## Structure

```html
<ul class="mk-wishlist-list" aria-label="Wishlist, 3 items">
  <li class="mk-wishlist-item">
    <img class="mk-wishlist-item-image" src="https://picsum.photos/seed/prod-throw/300/375" alt="">
    <div class="mk-wishlist-item-info">
      <h3 class="mk-wishlist-item-name"><a href="#">Wool throw</a></h3>
      <p class="mk-wishlist-item-options">Oat · 130 × 180 cm</p>
      <p class="mk-wishlist-item-stock" data-stock="in">In stock</p>
      <p class="mk-wishlist-item-added">Saved <time datetime="2026-09-28">3 days ago</time></p>
    </div>
    <strong class="mk-wishlist-item-price">€120.00</strong>
    <div class="mk-wishlist-item-actions">
      <button class="btn" data-size="sm" type="button" aria-label="Add Wool throw to cart"><i data-lucide="shopping-bag"></i> Add to cart</button>
      <button class="mk-wishlist-item-remove" type="button" aria-label="Remove Wool throw from wishlist"><i data-lucide="trash-2"></i></button>
    </div>
  </li>
  <li class="mk-wishlist-item">
    <img class="mk-wishlist-item-image" src="https://picsum.photos/seed/prod-vase/300/375" alt="">
    <div class="mk-wishlist-item-info">
      <h3 class="mk-wishlist-item-name"><a href="#">Ceramic vase</a></h3>
      <p class="mk-wishlist-item-options">Speckled white</p>
      <p class="mk-wishlist-item-stock" data-stock="low">Only 2 left</p>
      <p class="mk-wishlist-item-added">Saved <time datetime="2026-09-24">1 week ago</time></p>
    </div>
    <strong class="mk-wishlist-item-price">€48.00</strong>
    <div class="mk-wishlist-item-actions">
      <button class="btn" data-size="sm" type="button" aria-label="Add Ceramic vase to cart"><i data-lucide="shopping-bag"></i> Add to cart</button>
      <button class="mk-wishlist-item-remove" type="button" aria-label="Remove Ceramic vase from wishlist"><i data-lucide="trash-2"></i></button>
    </div>
  </li>
  <li class="mk-wishlist-item">
    <img class="mk-wishlist-item-image" src="https://picsum.photos/seed/prod-lamp/300/375" alt="">
    <div class="mk-wishlist-item-info">
      <h3 class="mk-wishlist-item-name"><a href="#">Paper lamp</a></h3>
      <p class="mk-wishlist-item-options">Ø 45 cm</p>
      <p class="mk-wishlist-item-stock" data-stock="out">Out of stock</p>
      <p class="mk-wishlist-item-added">Saved <time datetime="2026-09-17">2 weeks ago</time></p>
    </div>
    <strong class="mk-wishlist-item-price">€89.00</strong>
    <div class="mk-wishlist-item-actions">
      <a class="btn" data-variant="outline" data-size="sm" href="#">Notify me</a>
      <button class="mk-wishlist-item-remove" type="button" aria-label="Remove Paper lamp from wishlist"><i data-lucide="trash-2"></i></button>
    </div>
  </li>
</ul>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A row: picture, details, price, actions |
| `data-variant="card"` | A card for a grid |
| `data-stock` | In stock (green) / low (amber) / out (muted, picture faded) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| stock | text | "Only 2 left" - the dot is decorative |
| remove | `aria-label="Remove … from wishlist"` | Unique per item |

---

## Notes
- Offer "Notify me" instead of a disabled Add to cart.
