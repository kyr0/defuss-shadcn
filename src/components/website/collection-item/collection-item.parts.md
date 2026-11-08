<!-- The individual examples of Collection Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Collection Item"
<article class="mk-collection-item">
  <img class="mk-collection-item-media" src="https://picsum.photos/seed/col-linen/800/1000" alt="" />
  <div class="mk-collection-item-body">
    <h3 class="mk-collection-item-title"><a href="#">Linen basics</a></h3>
    <p class="mk-collection-item-count">24 products</p>
    <span class="mk-collection-item-more" aria-hidden="true">Shop now <i data-lucide="arrow-right"></i></span>
  </div>
</article>
```

```html example part label="Collection Item (overlay)"
<article class="mk-collection-item" data-variant="overlay">
  <img class="mk-collection-item-media" src="https://picsum.photos/seed/col-o1/800/1000" alt="" />
  <div class="mk-collection-item-body">
    <h3 class="mk-collection-item-title"><a href="#">New in</a></h3>
    <p class="mk-collection-item-count">This week</p>
    <span class="mk-collection-item-more" aria-hidden="true">Shop now <i data-lucide="arrow-right"></i></span>
  </div>
</article>
```

```html example part label="Collection Item (stack)"
<article class="mk-collection-item" data-variant="stack" style="--mk-collection-tint: oklch(0.93 0.04 60)">
  <div class="mk-collection-item-stack">
    <img
      class="mk-collection-item-media"
      src="https://picsum.photos/id/1060/600/750"
      alt="A pour-over coffee being brewed"
    />
    <img
      class="mk-collection-item-media"
      src="https://picsum.photos/id/225/600/750"
      alt="A glass teapot of green tea"
    />
    <img
      class="mk-collection-item-media"
      src="https://picsum.photos/id/431/600/750"
      alt="A cappuccino with latte art"
    />
  </div>
  <span class="mk-collection-item-badge">New</span>
  <div class="mk-collection-item-body">
    <h3 class="mk-collection-item-title"><a href="#">Brew at home</a></h3>
    <p class="mk-collection-item-count">3 guides, 27 products</p>
    <span class="mk-collection-item-more" aria-hidden="true"
      >Shop the collection <i data-lucide="arrow-right"></i
    ></span>
  </div>
</article>
```
