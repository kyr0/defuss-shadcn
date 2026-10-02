---
name: Location Map
type: BLK
why: Pins are buttons with popovertarget; their cards are popovers placed by CSS anchor positioning - interactive, keyboard-accessible, no script and no map library.
when: A handful of places on a stylized map. Searching many places uses locator-search; a single address is location-item. Swap the SVG for an embedded map provider when you need real streets.
where: dist/components/location-map/location-map.css
supportedStates: default
---

# Pattern: Location Map

## Native basis
A map surface (an inline SVG - or an embedded map image) with absolutely placed pins (`--x` / `--y`): each pin is a `<button popovertarget>` whose `popover` card is anchored to it (`anchor-name` / `position-anchor`). A list beside it repeats every place as text.

---

## Native Web APIs
- [`Popover API`](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - light-dismiss panels without script
- [`CSS anchor positioning`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - popovers placed next to their trigger
- [`<address>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/address) - contact information
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-location-map" aria-labelledby="lm-title">
  <h2 id="lm-title" class="sr-only">Our cafés in Lisbon</h2>
  <div class="mk-location-map-layout">
    <div class="mk-location-map-canvas">
      <svg class="mk-location-map-art" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="800" height="500" class="mk-location-map-land"/>
      <path class="mk-location-map-water" d="M0 380 C120 350 220 420 340 400 S560 330 800 370 V500 H0 Z"/>
      <path class="mk-location-map-park" d="M520 80 h150 a20 20 0 0 1 20 20 v80 a20 20 0 0 1 -20 20 h-150 a20 20 0 0 1 -20 -20 v-80 a20 20 0 0 1 20 -20 Z"/>
      <g class="mk-location-map-roads"><path d="M0 120 H800"/><path d="M0 260 C200 250 420 300 800 240"/><path d="M180 0 V400"/><path d="M430 0 C440 160 400 260 420 420"/><path d="M640 0 V360"/></g>
      <g class="mk-location-map-streets"><path d="M0 60 H800"/><path d="M0 190 H800"/><path d="M90 0 V400"/><path d="M300 0 V400"/><path d="M540 0 V380"/><path d="M730 0 V360"/></g>
    </svg>
      <button class="mk-location-map-pin" type="button" popovertarget="lm-1" style="--x:24%;--y:38%;anchor-name:--lm-1" aria-label="Café Baixa"><i data-lucide="map-pin"></i></button>
    <div class="mk-location-map-popup" id="lm-1" popover style="position-anchor:--lm-1">
      <strong>Café Baixa</strong><address>Rua da Prata 120</address><a href="#">Directions <i data-lucide="arrow-up-right"></i></a>
    </div>
      <button class="mk-location-map-pin" type="button" popovertarget="lm-2" style="--x:58%;--y:30%;anchor-name:--lm-2" aria-label="Café Príncipe Real"><i data-lucide="map-pin"></i></button>
    <div class="mk-location-map-popup" id="lm-2" popover style="position-anchor:--lm-2">
      <strong>Café Príncipe Real</strong><address>Praça do Príncipe Real 5</address><a href="#">Directions <i data-lucide="arrow-up-right"></i></a>
    </div>
      <button class="mk-location-map-pin" type="button" popovertarget="lm-3" style="--x:76%;--y:62%;anchor-name:--lm-3" aria-label="Café Alfama"><i data-lucide="map-pin"></i></button>
    <div class="mk-location-map-popup" id="lm-3" popover style="position-anchor:--lm-3">
      <strong>Café Alfama</strong><address>Rua de São Miguel 18</address><a href="#">Directions <i data-lucide="arrow-up-right"></i></a>
    </div>
    </div>
    <ol class="mk-location-map-list">
      <li><b>1</b><strong>Café Baixa</strong><span>Rua da Prata 120 · open until 19:00</span></li>
      <li><b>2</b><strong>Café Príncipe Real</strong><span>Praça do Príncipe Real 5 · open until 20:00</span></li>
      <li><b>3</b><strong>Café Alfama</strong><span>Rua de São Miguel 18 · closed today</span></li>
    </ol>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | The map beside a list of the places (from 48rem) |
| `data-variant="full"` | The map alone, taller |
| `--x` / `--y` | A pin's position on the map, in percent |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| pins | `<button aria-label="…">` | Name the place; the popover opens on click / Enter, closes on Escape |
| map art | `aria-hidden="true"` | The list carries the same places as text |
| cards | `popover` + `<address>` | Light-dismiss, keyboard reachable |

---

## Notes
- Always repeat the places as a list - a map alone is not accessible.
- Where anchor positioning is unsupported, the card opens centered (the popover default).
