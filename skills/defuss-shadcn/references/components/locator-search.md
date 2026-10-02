---
name: Locator Search
type: BLK
why: A <search> landmark and a GET form work without script; the "use my location" button is the one progressive addition (Geolocation API, on request only).
when: Store finders and venue locators with many places. A handful of places fit on location-map.
where: dist/components/locator-search/locator-search.css
supportedStates: default
---

# Pattern: Locator Search

## Native basis
A `<search>` with a `<form method="get">`: an address Input, a "Use my location" Button (the page script asks the Geolocation API), a radius Select and submit - then a summary and the results as compact location items.

Built from: [Input](input.md), [Select](select.md), [Button](button.md), [Location Item](location-item.md).

---

## Native Web APIs
- [`<search>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/search) - the search landmark
- [`Geolocation API`](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) - the visitor's position, on request
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - the browser fills known fields
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - a computed result
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-locator-search" aria-labelledby="ls-title">
  <h2 id="ls-title" class="sr-only">Find a store</h2>
  <search>
    <form class="mk-locator-search-form" action="#" method="get">
      <div class="mk-locator-search-row">
        <div class="mk-locator-search-field"><label class="label" for="ls-q">City, address or postcode</label><div class="mk-locator-search-query"><i data-lucide="search"></i><input class="input" id="ls-q" type="search" name="near" placeholder="e.g. Lisbon" autocomplete="address-level2" enterkeyhint="search"></div></div>
        <div class="mk-locator-search-field"><label class="label" for="ls-r">Within</label><select class="select" id="ls-r" name="radius"><option>5 km</option><option selected>25 km</option><option>100 km</option></select></div>
        <button class="btn" type="submit">Search</button>
      </div>
      <button class="mk-locator-search-geo" type="button" data-locate><i data-lucide="locate-fixed"></i> Use my location</button>
    </form>
  </search>
  <output class="mk-locator-search-summary" aria-live="polite"><strong>2 stores</strong> within 25 km of Lisbon</output>
  <div class="mk-locator-search-results">
    <article class="mk-location-item" data-variant="compact">
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
    <article class="mk-location-item" data-variant="compact">
      <div class="mk-location-item-body">
        <div class="mk-location-item-head"><h3 class="mk-location-item-name">Acme Belém</h3><span class="mk-location-item-distance">6.2 km</span></div>
        <address class="mk-location-item-address">Rua de Belém 84<br>1300-085 Lisboa</address>
        <p class="mk-location-item-status" data-status="open">Open now · until 19:00</p>
        <div class="mk-location-item-actions">
          <a class="btn" data-variant="outline" data-size="sm" href="https://www.openstreetmap.org/search?query=Rua%20da%20Prata%20120%20Lisboa" target="_blank" rel="noopener"><i data-lucide="navigation"></i> Directions<span class="sr-only"> to Acme Belém (opens maps)</span></a>
          <a class="btn" data-variant="ghost" data-size="sm" href="tel:+351210001200"><i data-lucide="phone"></i> +351 21 000 1200</a>
        </div>
      </div>
    </article>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card with the fields, then the results |
| `data-variant="inline"` | One row - for a hero or a header |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| landmark | `<search>` | A search landmark |
| location button | `<button type="button">` | Asks for the position only when pressed |
| summary | `<output aria-live="polite">` | Announces the result count or the position |

---

## Notes
- Never ask for the position on page load.
- The form works as a plain GET search without script.
