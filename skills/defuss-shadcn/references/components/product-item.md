---
name: Product Item
type: BLK
section: website
why: The name link covers the card; the heart is a checkbox read by :has(), the hover picture a CSS crossfade, the stars a clipped background - no script for any of it.
when: Product grids, carousels and search results. Cart lines are cart-item; saved items are wishlist-item.
where: dist/components/product-item/product-item.css
supportedStates: default
---

# Pattern: Product Item

## Native basis
An `<article>`: two pictures (the second fades in on hover), a Badge, a wishlist checkbox, the name link, a description, stars (`--mk-rating`), the price with `<del>` for the old one, color swatches and an add-to-cart Button.

Built from: [Badge](badge.md), [Button](button.md).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<del>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del) - the old price, announced as deleted
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - stable media boxes, no layout shift

---

## Structure

```html
  <article class="mk-product-item">
    <div class="mk-product-item-media">
      <img class="mk-product-item-image" src="https://picsum.photos/seed/prod-shirt/600/750" alt="">
      <img class="mk-product-item-image" data-hover src="https://picsum.photos/seed/prod-shirt-b/600/750" alt="">
      <span class="badge mk-product-item-badge" data-variant="default" data-sale>−20%</span>
      <label class="mk-product-item-wish"><input type="checkbox" name="wish" value="p1"><i data-lucide="heart"></i><span class="sr-only">Save Linen shirt to your wishlist</span></label>
    </div>
    <div class="mk-product-item-body">
      <h3 class="mk-product-item-name"><a href="#">Linen shirt</a></h3>
      <p class="mk-product-item-desc">Relaxed fit · Sand</p>
      <p class="mk-product-item-rating"><span class="mk-product-item-stars" style="--mk-rating:4.5" role="img" aria-label="4.5 out of 5 stars">★★★★★</span>(128)</p>
      <p class="mk-product-item-price"><strong>€64</strong> <del><span class="sr-only">was </span>€80</del></p>
      <ul class="mk-product-item-swatches" aria-label="Colors"><li style="--mk-swatch:#d8c9a9" aria-current="true"><span class="sr-only">Sand</span></li><li style="--mk-swatch:#2f3b4a"><span class="sr-only">Navy</span></li><li style="--mk-swatch:#f2efe8"><span class="sr-only">Off-white</span></li></ul>
    </div>
    <button class="btn mk-product-item-add" type="button" data-size="sm" aria-label="Add Linen shirt to cart"><i data-lucide="shopping-bag"></i> Add to cart</button>
  </article>
  <article class="mk-product-item">
    <div class="mk-product-item-media">
      <img class="mk-product-item-image" src="https://picsum.photos/seed/prod-mug/600/750" alt="">
      <img class="mk-product-item-image" data-hover src="https://picsum.photos/seed/prod-mug-b/600/750" alt="">
      <span class="badge mk-product-item-badge" data-variant="default">New</span>
      <label class="mk-product-item-wish"><input type="checkbox" name="wish" value="p2"><i data-lucide="heart"></i><span class="sr-only">Save Stoneware mug to your wishlist</span></label>
    </div>
    <div class="mk-product-item-body">
      <h3 class="mk-product-item-name"><a href="#">Stoneware mug</a></h3>
      <p class="mk-product-item-desc">Handmade · 350 ml</p>
      <p class="mk-product-item-rating"><span class="mk-product-item-stars" style="--mk-rating:4.9" role="img" aria-label="4.9 out of 5 stars">★★★★★</span>(412)</p>
      <p class="mk-product-item-price"><strong>€22</strong></p>
      <ul class="mk-product-item-swatches" aria-label="Colors"><li style="--mk-swatch:#c9b49a" aria-current="true"><span class="sr-only">Oat</span></li><li style="--mk-swatch:#5a6b5d"><span class="sr-only">Moss</span></li></ul>
    </div>
    <button class="btn mk-product-item-add" type="button" data-size="sm" aria-label="Add Stoneware mug to cart"><i data-lucide="shopping-bag"></i> Add to cart</button>
  </article>
  <article class="mk-product-item">
    <div class="mk-product-item-media">
      <img class="mk-product-item-image" src="https://picsum.photos/seed/prod-bag/600/750" alt="">
      <img class="mk-product-item-image" data-hover src="https://picsum.photos/seed/prod-bag-b/600/750" alt="">
      <label class="mk-product-item-wish"><input type="checkbox" name="wish" value="p3"><i data-lucide="heart"></i><span class="sr-only">Save Canvas tote to your wishlist</span></label>
    </div>
    <div class="mk-product-item-body">
      <h3 class="mk-product-item-name"><a href="#">Canvas tote</a></h3>
      <p class="mk-product-item-desc">Organic cotton</p>
      <p class="mk-product-item-rating"><span class="mk-product-item-stars" style="--mk-rating:4.2" role="img" aria-label="4.2 out of 5 stars">★★★★★</span>(57)</p>
      <p class="mk-product-item-price"><strong>€38</strong></p>
    </div>
    <button class="btn mk-product-item-add" type="button" data-size="sm" aria-label="Add Canvas tote to cart"><i data-lucide="shopping-bag"></i> Add to cart</button>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card: pictures, badge, heart, details, add to cart |
| `data-variant="horizontal"` | Picture beside the details - for lists and search |
| `data-variant="minimal"` | Centered name and price only - for editorial grids |
| `data-sale` (on the Badge) | A sale badge in the destructive color, solid over the photo |
| `--mk-rating` | The average rating (0–5) - fills the stars |
| `--mk-swatch` | A color swatch; `aria-current` marks the shown one |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| old price | `<del>` + sr-only "was" | Read as the previous price |
| stars | `role="img" aria-label="4.5 out of 5 stars"` | One label for the row |
| wishlist | a checkbox with sr-only label | Announced as checked / not checked |
| add | `aria-label="Add … to cart"` | Unique per card |

---

## Notes
- Keep one primary action per card.
- The hover picture is decorative (`alt=""`); describe the product in the name.
