<!-- The individual examples of Related Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Related Item"
<article class="mk-related-item">
  <figure class="mk-related-item-media"><img src="images/mk-wide2.png" alt="" /></figure>
  <div class="mk-related-item-body">
    <span class="mk-related-item-kind">Article</span>
    <h3 class="mk-related-item-title"><a href="#">Designing for calm</a></h3>
    <p class="mk-related-item-meta">24 Sep 2026 · 5 min read</p>
  </div>
</article>
```

```html example part label="Related Item (card)"
<article class="mk-related-item" data-variant="card">
  <figure class="mk-related-item-media"><img src="images/mk-wide2.png" alt="" /></figure>
  <div class="mk-related-item-body">
    <span class="mk-related-item-kind">Article</span>
    <h3 class="mk-related-item-title"><a href="#">Designing for calm</a></h3>
    <p class="mk-related-item-meta">24 Sep 2026 · 5 min read</p>
  </div>
</article>
```

```html example part label="Related Item (text)"
<article class="mk-related-item" data-variant="text">
  <div class="mk-related-item-body">
    <span class="mk-related-item-kind">Article</span>
    <h3 class="mk-related-item-title"><a href="#">Designing for calm</a></h3>
    <p class="mk-related-item-meta">24 Sep 2026 · 5 min read</p>
  </div>
  <i data-lucide="arrow-right" class="mk-related-item-arrow" aria-hidden="true"></i>
</article>
```

```html example part label="Related Item (numbered)"
<article class="mk-related-item" data-variant="numbered" data-rank="1">
  <div class="mk-related-item-body">
    <span class="mk-related-item-kind">Sync, explained</span>
    <h3 class="mk-related-item-title"><a href="#">Part 1: Why CRDTs</a></h3>
    <p class="mk-related-item-meta">6 min read</p>
  </div>
</article>
```

```html example part label="Related Item (overlay)"
<article class="mk-related-item" data-variant="overlay">
  <figure class="mk-related-item-media"
    ><img src="images/mk-wide3.png" alt="" /><span class="mk-related-item-badge">4:12</span></figure
  >
  <div class="mk-related-item-body">
    <span class="mk-related-item-kind">Video</span>
    <h3 class="mk-related-item-title"><a href="#">Offline sync in four minutes</a></h3>
    <p class="mk-related-item-meta">1 Oct 2026</p>
  </div>
</article>
```
