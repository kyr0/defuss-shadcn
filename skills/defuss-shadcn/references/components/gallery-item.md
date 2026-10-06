---
name: Gallery Item
type: BLK
section: website
why: A button with commandfor / command="show-modal" opens a <dialog> - focus trap, Escape and backdrop are the browser's; a method="dialog" form closes it. No script.
when: Photo grids, portfolios, product shots. A whole collection with shared controls is media-gallery; a plain responsive picture is the image component.
where: dist/components/gallery-item/gallery-item.css
supportedStates: default
---

# Pattern: Gallery Item

## Native basis
A `<figure>`: a `<button commandfor command="show-modal">` around the thumbnail, a `<figcaption>`, and a `<dialog>` with the large picture, its caption and a close button in a `<form method="dialog">`.

---

## Native Web APIs
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) - media with its caption
- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) - native dialog; method="dialog" forms close it
- [`commandfor / command`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#command) - a button opens a dialog declaratively
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - entry animations
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching

---

## Structure

```html
  <figure class="mk-gallery-item">
    <button class="mk-gallery-item-open" type="button" commandfor="gi-1" command="show-modal" aria-label="Enlarge: Harbour at dawn">
      <img src="https://picsum.photos/seed/gal-harbour/800/600" alt="Harbour at dawn">
      <span class="mk-gallery-item-zoom" aria-hidden="true"><i data-lucide="maximize-2"></i></span>
    </button>
    <figcaption class="mk-gallery-item-caption">Harbour at dawn <span>Lisbon, 2026</span></figcaption>
    <dialog class="mk-gallery-item-viewer" id="gi-1" aria-label="Harbour at dawn">
      <div class="mk-gallery-item-viewer-inner">
        <img src="https://picsum.photos/seed/gal-harbour/1600/1200" alt="Harbour at dawn">
        <p>Harbour at dawn <span>Lisbon, 2026</span></p>
        <form method="dialog"><button class="mk-gallery-item-close" aria-label="Close"><i data-lucide="x"></i></button></form>
      </div>
    </dialog>
  </figure>
  <figure class="mk-gallery-item">
    <button class="mk-gallery-item-open" type="button" commandfor="gi-2" command="show-modal" aria-label="Enlarge: Hills after rain">
      <img src="https://picsum.photos/seed/gal-hills/800/600" alt="Hills after rain">
      <span class="mk-gallery-item-zoom" aria-hidden="true"><i data-lucide="maximize-2"></i></span>
    </button>
    <figcaption class="mk-gallery-item-caption">Hills after rain <span>Sintra, 2026</span></figcaption>
    <dialog class="mk-gallery-item-viewer" id="gi-2" aria-label="Hills after rain">
      <div class="mk-gallery-item-viewer-inner">
        <img src="https://picsum.photos/seed/gal-hills/1600/1200" alt="Hills after rain">
        <p>Hills after rain <span>Sintra, 2026</span></p>
        <form method="dialog"><button class="mk-gallery-item-close" aria-label="Close"><i data-lucide="x"></i></button></form>
      </div>
    </dialog>
  </figure>
  <figure class="mk-gallery-item">
    <button class="mk-gallery-item-open" type="button" commandfor="gi-3" command="show-modal" aria-label="Enlarge: Tram 28">
      <img src="https://picsum.photos/seed/gal-street/800/600" alt="Tram 28">
      <span class="mk-gallery-item-zoom" aria-hidden="true"><i data-lucide="maximize-2"></i></span>
    </button>
    <figcaption class="mk-gallery-item-caption">Tram 28 <span>Alfama, 2025</span></figcaption>
    <dialog class="mk-gallery-item-viewer" id="gi-3" aria-label="Tram 28">
      <div class="mk-gallery-item-viewer-inner">
        <img src="https://picsum.photos/seed/gal-street/1600/1200" alt="Tram 28">
        <p>Tram 28 <span>Alfama, 2025</span></p>
        <form method="dialog"><button class="mk-gallery-item-close" aria-label="Close"><i data-lucide="x"></i></button></form>
      </div>
    </dialog>
  </figure>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Picture, then the caption; a zoom glyph appears on hover |
| `data-variant="overlay"` | The caption over the picture on hover / focus |
| `data-variant="framed"` | A white print frame with a shadow, slightly turned |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| open | `<button aria-label="Enlarge: …">` | Names the picture |
| viewer | `<dialog aria-label>` opened modal | Focus moves in, Escape closes, the page is inert |
| close | `<button aria-label="Close">` in `form[method=dialog]` | Closes natively |

---

## Notes
- Give every picture real alt text - it is both the thumbnail and the large view.
- The dialog sits inside the figure; it renders in the top layer.
