<!-- The individual examples of Location Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Location Item"
<article class="mk-location-item">
  <img class="mk-location-item-media" src="https://picsum.photos/seed/loc-0/800/450" alt="" />
  <div class="mk-location-item-body">
    <div class="mk-location-item-head"
      ><h3 class="mk-location-item-name">Acme Lisbon</h3><span class="mk-location-item-distance">0.8 km</span></div
    >
    <address class="mk-location-item-address">Rua da Prata 120<br />1100-420 Lisboa, Portugal</address>
    <p class="mk-location-item-status" data-status="open">Open now · until 18:00</p>
    <div class="mk-location-item-actions">
      <a
        class="btn"
        data-variant="outline"
        data-size="sm"
        href="https://www.openstreetmap.org/search?query=Rua%20da%20Prata%20120%20Lisboa"
        target="_blank"
        rel="noopener"
        ><i data-lucide="navigation"></i> Directions<span class="sr-only"> to Acme Lisbon (opens maps)</span></a
      >
      <a class="btn" data-variant="ghost" data-size="sm" href="tel:+351210001200"
        ><i data-lucide="phone"></i> +351 21 000 1200</a
      >
    </div>
  </div>
</article>
```

```html example part label="Location Item (compact)"
<article class="mk-location-item" data-variant="compact">
  <div class="mk-location-item-body">
    <div class="mk-location-item-head"
      ><h3 class="mk-location-item-name">Acme Lisbon</h3><span class="mk-location-item-distance">0.8 km</span></div
    >
    <address class="mk-location-item-address">Rua da Prata 120<br />1100-420 Lisboa, Portugal</address>
    <p class="mk-location-item-status" data-status="open">Open now · until 18:00</p>
    <div class="mk-location-item-actions">
      <a
        class="btn"
        data-variant="outline"
        data-size="sm"
        href="https://www.openstreetmap.org/search?query=Rua%20da%20Prata%20120%20Lisboa"
        target="_blank"
        rel="noopener"
        ><i data-lucide="navigation"></i> Directions<span class="sr-only"> to Acme Lisbon (opens maps)</span></a
      >
      <a class="btn" data-variant="ghost" data-size="sm" href="tel:+351210001200"
        ><i data-lucide="phone"></i> +351 21 000 1200</a
      >
    </div>
  </div>
</article>
```
