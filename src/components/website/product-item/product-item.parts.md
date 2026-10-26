<!-- The individual examples of Product Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Product Item"
<article class="mk-product-item">
  <div class="mk-product-item-media">
    <img class="mk-product-item-image" src="https://picsum.photos/seed/prod-bag/600/750" alt="" />
    <img class="mk-product-item-image" data-hover="" src="https://picsum.photos/seed/prod-bag-b/600/750" alt="" />
    <label class="mk-product-item-wish"
      ><input type="checkbox" name="wish" value="p3" /><i data-lucide="heart"></i
      ><span class="sr-only">Save Canvas tote to your wishlist</span></label
    >
  </div>
  <div class="mk-product-item-body">
    <h3 class="mk-product-item-name"><a href="#">Canvas tote</a></h3>
    <p class="mk-product-item-desc">Organic cotton</p>
    <p class="mk-product-item-rating"
      ><span class="mk-product-item-stars" style="--mk-rating: 4.2" role="img" aria-label="4.2 out of 5 stars"
        >★★★★★</span
      >(57)</p
    >
    <p class="mk-product-item-price"><strong>€38</strong></p>
  </div>
  <button class="btn mk-product-item-add" type="button" data-size="sm" aria-label="Add Canvas tote to cart"
    ><i data-lucide="shopping-bag"></i> Add to cart</button
  >
</article>
```

```html example part label="Product Item (horizontal)"
<article class="mk-product-item" data-variant="horizontal">
  <div class="mk-product-item-media">
    <img class="mk-product-item-image" src="https://picsum.photos/seed/prod-bag/600/750" alt="" />
    <img class="mk-product-item-image" data-hover="" src="https://picsum.photos/seed/prod-bag-b/600/750" alt="" />
    <label class="mk-product-item-wish"
      ><input type="checkbox" name="wish" value="p5" /><i data-lucide="heart"></i
      ><span class="sr-only">Save Canvas tote to your wishlist</span></label
    >
  </div>
  <div class="mk-product-item-body">
    <h3 class="mk-product-item-name"><a href="#">Canvas tote</a></h3>
    <p class="mk-product-item-desc">Organic cotton</p>
    <p class="mk-product-item-rating"
      ><span class="mk-product-item-stars" style="--mk-rating: 4.2" role="img" aria-label="4.2 out of 5 stars"
        >★★★★★</span
      >(57)</p
    >
    <p class="mk-product-item-price"><strong>€38</strong></p>
  </div>
  <button class="btn mk-product-item-add" type="button" data-size="sm" aria-label="Add Canvas tote to cart"
    ><i data-lucide="shopping-bag"></i> Add to cart</button
  >
</article>
```

```html example part label="Product Item (minimal)"
<article class="mk-product-item" data-variant="minimal">
  <div class="mk-product-item-media">
    <img class="mk-product-item-image" src="https://picsum.photos/seed/prod-vase/600/750" alt="" />
    <img class="mk-product-item-image" data-hover="" src="https://picsum.photos/seed/prod-vase-b/600/750" alt="" />
    <label class="mk-product-item-wish"
      ><input type="checkbox" name="wish" value="pm0" /><i data-lucide="heart"></i
      ><span class="sr-only">Save Ceramic vase to your wishlist</span></label
    >
  </div>
  <div class="mk-product-item-body">
    <h3 class="mk-product-item-name"><a href="#">Ceramic vase</a></h3>
    <p class="mk-product-item-desc">Home</p>
    <p class="mk-product-item-price"><strong>€48</strong></p>
  </div>
  <button class="btn mk-product-item-add" type="button" data-size="sm" aria-label="Add Ceramic vase to cart"
    ><i data-lucide="shopping-bag"></i> Add to cart</button
  >
</article>
```
