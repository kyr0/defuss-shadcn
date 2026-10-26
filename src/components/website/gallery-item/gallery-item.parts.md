<!-- The individual examples of Gallery Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Gallery Item"
<figure class="mk-gallery-item">
  <button
    class="mk-gallery-item-open"
    type="button"
    commandfor="gi-1"
    command="show-modal"
    aria-label="Enlarge: Harbour at dawn"
  >
    <img src="https://picsum.photos/seed/gal-harbour/800/600" alt="Harbour at dawn" />
    <span class="mk-gallery-item-zoom" aria-hidden="true"><i data-lucide="maximize-2"></i></span>
  </button>
  <figcaption class="mk-gallery-item-caption">Harbour at dawn <span>Lisbon, 2026</span></figcaption>
  <dialog class="mk-gallery-item-viewer" id="gi-1" aria-label="Harbour at dawn">
    <div class="mk-gallery-item-viewer-inner">
      <img src="https://picsum.photos/seed/gal-harbour/1600/1200" alt="Harbour at dawn" />
      <p>Harbour at dawn <span>Lisbon, 2026</span></p>
      <form method="dialog"
        ><button class="mk-gallery-item-close" aria-label="Close"><i data-lucide="x"></i></button
      ></form>
    </div>
  </dialog>
</figure>
```

```html example part label="Gallery Item (overlay)"
<figure class="mk-gallery-item" data-variant="overlay">
  <button
    class="mk-gallery-item-open"
    type="button"
    commandfor="gi-4"
    command="show-modal"
    aria-label="Enlarge: Morning market"
  >
    <img src="https://picsum.photos/seed/gal-o1/800/600" alt="Morning market" />
    <span class="mk-gallery-item-zoom" aria-hidden="true"><i data-lucide="maximize-2"></i></span>
  </button>
  <figcaption class="mk-gallery-item-caption">Morning market <span>Porto</span></figcaption>
  <dialog class="mk-gallery-item-viewer" id="gi-4" aria-label="Morning market">
    <div class="mk-gallery-item-viewer-inner">
      <img src="https://picsum.photos/seed/gal-o1/1600/1200" alt="Morning market" />
      <p>Morning market <span>Porto</span></p>
      <form method="dialog"
        ><button class="mk-gallery-item-close" aria-label="Close"><i data-lucide="x"></i></button
      ></form>
    </div>
  </dialog>
</figure>
```

```html example part label="Gallery Item (framed)"
<figure class="mk-gallery-item" data-variant="framed">
  <button
    class="mk-gallery-item-open"
    type="button"
    commandfor="gi-7"
    command="show-modal"
    aria-label="Enlarge: Summer, 1998"
  >
    <img src="https://picsum.photos/seed/gal-f1/800/600" alt="Summer, 1998" />
    <span class="mk-gallery-item-zoom" aria-hidden="true"><i data-lucide="maximize-2"></i></span>
  </button>
  <figcaption class="mk-gallery-item-caption">Summer, 1998 <span>Algarve</span></figcaption>
  <dialog class="mk-gallery-item-viewer" id="gi-7" aria-label="Summer, 1998">
    <div class="mk-gallery-item-viewer-inner">
      <img src="https://picsum.photos/seed/gal-f1/1600/1200" alt="Summer, 1998" />
      <p>Summer, 1998 <span>Algarve</span></p>
      <form method="dialog"
        ><button class="mk-gallery-item-close" aria-label="Close"><i data-lucide="x"></i></button
      ></form>
    </div>
  </dialog>
</figure>
```
