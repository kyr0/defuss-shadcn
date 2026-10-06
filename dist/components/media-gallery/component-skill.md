---
name: Media Gallery
type: BLK
section: website
why: The layout switch is three radio inputs read by :has() - no script; the slideshow is a modal <dialog> with a scroll-snapped track.
when: Albums, project galleries, event photos. One picture with a large view is gallery-item; a single hero picture is the image component.
where: dist/components/media-gallery/media-gallery.css
supportedStates: default
---

# Pattern: Media Gallery

## Native basis
A `<section>`: a header with the count, a radio group for the layout (grid / masonry / filmstrip - `:has(:checked)` switches the list), a slideshow Button (`commandfor` → `<dialog>`), the pictures as a list of `<figure>`s, and the dialog with a `scroll-snap` track.

Built from: [Button](../button/component-skill.md), [Dialog](../dialog/component-skill.md).

---

## Native Web APIs
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`CSS scroll snap`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap) - rows that snap per item
- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) - native dialog; method="dialog" forms close it
- [`commandfor / command`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#command) - a button opens a dialog declaratively
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching

---

## Structure

```html
<section class="mk-media-gallery" aria-labelledby="mg-title">
  <header class="mk-media-gallery-head">
    <h2 id="mg-title">Lisbon, autumn 2026</h2>
    <span>8 photos</span>
    <div class="mk-media-gallery-tools">
      <div class="mk-media-gallery-views" role="radiogroup" aria-label="Layout">
        <label><input type="radio" name="mg-view" value="grid" checked><i data-lucide="layout-grid"></i><span class="sr-only">Grid</span></label>
        <label><input type="radio" name="mg-view" value="masonry"><i data-lucide="layout-dashboard"></i><span class="sr-only">Masonry</span></label>
        <label><input type="radio" name="mg-view" value="strip"><i data-lucide="gallery-horizontal"></i><span class="sr-only">Filmstrip</span></label>
      </div>
      <button class="btn" data-variant="outline" data-size="sm" type="button" commandfor="mg-viewer" command="show-modal"><i data-lucide="play"></i> Slideshow</button>
    </div>
  </header>
  <ul class="mk-media-gallery-grid">
    <li><figure><img src="https://picsum.photos/seed/mg-1/800/600" alt="Harbour at dawn"></figure></li>
    <li><figure><img src="https://picsum.photos/seed/mg-2/600/800" alt="Stairs in Alfama"></figure></li>
    <li><figure><img src="https://picsum.photos/seed/mg-3/800/500" alt="River light"></figure></li>
    <li><figure><img src="https://picsum.photos/seed/mg-4/600/600" alt="Tiles"></figure></li>
    <li><figure><img src="https://picsum.photos/seed/mg-5/800/600" alt="Market morning"></figure></li>
    <li><figure><img src="https://picsum.photos/seed/mg-6/600/900" alt="Old tram"></figure></li>
    <li><figure><img src="https://picsum.photos/seed/mg-7/800/600" alt="Coastline"></figure></li>
    <li><figure><img src="https://picsum.photos/seed/mg-8/700/500" alt="Rooftops"></figure></li>
  </ul>
  <dialog class="mk-media-gallery-viewer" id="mg-viewer" aria-label="Slideshow: Lisbon, autumn 2026">
    <div class="mk-media-gallery-viewer-inner">
      <ul class="mk-media-gallery-track" tabindex="0" aria-label="Photos - scroll sideways">
        <li><img src="https://picsum.photos/seed/mg-1/1600/1200" alt="Harbour at dawn"><p>1 / 8 · Harbour at dawn</p></li>
        <li><img src="https://picsum.photos/seed/mg-2/1200/1600" alt="Stairs in Alfama"><p>2 / 8 · Stairs in Alfama</p></li>
        <li><img src="https://picsum.photos/seed/mg-3/1600/1000" alt="River light"><p>3 / 8 · River light</p></li>
        <li><img src="https://picsum.photos/seed/mg-4/1200/1200" alt="Tiles"><p>4 / 8 · Tiles</p></li>
        <li><img src="https://picsum.photos/seed/mg-5/1600/1200" alt="Market morning"><p>5 / 8 · Market morning</p></li>
        <li><img src="https://picsum.photos/seed/mg-6/1200/1800" alt="Old tram"><p>6 / 8 · Old tram</p></li>
        <li><img src="https://picsum.photos/seed/mg-7/1600/1200" alt="Coastline"><p>7 / 8 · Coastline</p></li>
        <li><img src="https://picsum.photos/seed/mg-8/1400/1000" alt="Rooftops"><p>8 / 8 · Rooftops</p></li>
      </ul>
      <p class="mk-media-gallery-hint">Swipe, scroll or use ← → · Esc closes</p>
      <form method="dialog"><button class="mk-media-gallery-close" aria-label="Close slideshow"><i data-lucide="x"></i></button></form>
    </div>
  </dialog>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Grid (default) | Square crops in an even grid |
| Masonry | CSS columns - every picture in its own ratio |
| Filmstrip | One row that scrolls and snaps |
| Slideshow | A full-screen modal dialog with a track that snaps per picture (swipe, scroll or arrow keys) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| layout | `role="radiogroup"` of labelled radios | Arrow keys switch the layout |
| slideshow | `<dialog>` + `aria-label` | Modal, Escape closes |
| track | `tabindex="0"` + `aria-label` | Scrollable with the keyboard |

---

## Notes
- Keep alt text on every picture - the slideshow repeats them.
