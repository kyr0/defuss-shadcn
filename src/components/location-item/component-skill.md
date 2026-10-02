---
name: Location Item
type: BLK
why: An <address> with real tel: and maps links; the open / closed state is one data attribute - no script.
when: Store, office and venue lists. Several places on a map use location-map; finding the nearest uses locator-search.
where: dist/components/location-item/location-item.css
supportedStates: default
---

# Pattern: Location Item

## Native basis
An `<article>`: an optional picture, the name and distance, an `<address>`, the status (`data-status="open|closed"`), a "Directions" link to a maps service and a `tel:` link.

Built from: [Button](../button/component-skill.md).

---

## Native Web APIs
- [`<address>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/address) - contact information
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
  <article class="mk-location-item">
    <img class="mk-location-item-media" src="https://picsum.photos/seed/loc-0/800/450" alt="">
    <div class="mk-location-item-body">
      <div class="mk-location-item-head"><h3 class="mk-location-item-name">Acme Lisbon</h3><span class="mk-location-item-distance">0.8 km</span></div>
      <address class="mk-location-item-address">Rua da Prata 120<br>1100-420 Lisboa, Portugal</address>
      <p class="mk-location-item-status" data-status="open">Open now · until 18:00</p>
      <div class="mk-location-item-actions">
        <a class="btn" data-variant="outline" data-size="sm" href="https://www.openstreetmap.org/search?query=Rua%20da%20Prata%20120%20Lisboa" target="_blank" rel="noopener"><i data-lucide="navigation"></i> Directions<span class="sr-only"> to Acme Lisbon (opens maps)</span></a>
        <a class="btn" data-variant="ghost" data-size="sm" href="tel:+351210001200"><i data-lucide="phone"></i> +351 21 000 1200</a>
      </div>
    </div>
  </article>
  <article class="mk-location-item">
    <img class="mk-location-item-media" src="https://picsum.photos/seed/loc-1/800/450" alt="">
    <div class="mk-location-item-body">
      <div class="mk-location-item-head"><h3 class="mk-location-item-name">Acme Berlin</h3><span class="mk-location-item-distance">2,310 km</span></div>
      <address class="mk-location-item-address">Torstraße 45<br>10119 Berlin, Germany</address>
      <p class="mk-location-item-status" data-status="closed">Closed · opens 09:00</p>
      <div class="mk-location-item-actions">
        <a class="btn" data-variant="outline" data-size="sm" href="https://www.openstreetmap.org/search?query=Torstra%C3%9Fe%2045%20Berlin" target="_blank" rel="noopener"><i data-lucide="navigation"></i> Directions<span class="sr-only"> to Acme Berlin (opens maps)</span></a>
        <a class="btn" data-variant="ghost" data-size="sm" href="tel:+493000004500"><i data-lucide="phone"></i> +49 30 0000 4500</a>
      </div>
    </div>
  </article>
  <article class="mk-location-item">
    <img class="mk-location-item-media" src="https://picsum.photos/seed/loc-2/800/450" alt="">
    <div class="mk-location-item-body">
      <div class="mk-location-item-head"><h3 class="mk-location-item-name">Acme Montreal</h3><span class="mk-location-item-distance">5,240 km</span></div>
      <address class="mk-location-item-address">4200 Boulevard Saint-Laurent<br>Montréal, QC H2W 2R2, Canada</address>
      <p class="mk-location-item-status" data-status="open">Open now · until 17:00</p>
      <div class="mk-location-item-actions">
        <a class="btn" data-variant="outline" data-size="sm" href="https://www.openstreetmap.org/search?query=4200%20Saint-Laurent%20Montreal" target="_blank" rel="noopener"><i data-lucide="navigation"></i> Directions<span class="sr-only"> to Acme Montreal (opens maps)</span></a>
        <a class="btn" data-variant="ghost" data-size="sm" href="tel:+15140004200"><i data-lucide="phone"></i> +1 514 000 4200</a>
      </div>
    </div>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card with a picture on top |
| `data-variant="compact"` | A row without the picture - for result lists |
| `data-status` | Open (green dot) / closed (muted dot) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| address | `<address>` | Contact semantics |
| directions | sr-only "(opens maps)" | Warns before leaving |
| phone | `href="tel:…"` | Calls on phones |

---

## Notes
- Status text always says the next change ("until 18:00", "opens 09:00") - not only open or closed.
