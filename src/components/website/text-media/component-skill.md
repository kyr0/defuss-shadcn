---
name: Text Media
type: BLK
section: website
why: Copy and a figure in a two-column container-query grid; the overlap is a negative margin - no script.
when: Explaining one idea with a visual. Product features in a row use feature-details; a whole scenario uses use-case.
where: dist/components/text-media/text-media.css
supportedStates: default
---

# Pattern: Text Media

## Native basis
A `<section>`: an eyebrow, a heading, paragraphs, an optional check list and link, beside a `<figure>` with an `<img>`, an SVG illustration or a `<video>`.

---

## Native Web APIs
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) - media with its caption
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) - native playback controls
- [`text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balanced titles, pretty paragraphs

---

## Structure

```html
<section class="mk-text-media" aria-labelledby="tm-1">
  <div class="mk-text-media-layout">
    <div class="mk-text-media-copy">
      <span class="mk-text-media-eyebrow">Offline first</span>
      <h2 class="mk-text-media-title" id="tm-1">Your work travels with you</h2>
      <p class="mk-text-media-text">Every change is saved on your device first and synced when you are back online - on a plane, in a tunnel, at the cabin.</p>
      <ul class="mk-text-media-list"><li><i data-lucide="check"></i>Edits never wait for the network</li><li><i data-lucide="check"></i>Conflicts resolve themselves</li><li><i data-lucide="check"></i>Works on every device</li></ul>
      <a class="mk-text-media-link" href="#">How sync works <i data-lucide="arrow-right"></i></a>
    </div>
    <figure class="mk-text-media-media"><img src="https://picsum.photos/seed/tm-cabin/1000/750" alt="A laptop on a table in a mountain cabin"></figure>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Text left, media right (from 48rem) |
| `data-variant="reverse"` | Media left |
| `data-variant="overlap"` | A wide picture with the text card overlapping its edge |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `<section aria-labelledby>` | Named by the heading |
| media | `alt` / `<figcaption>` | Describe the picture if it carries information |

---

## Notes
- Alternate default and reverse down a page.
- Videos get controls, never autoplay with sound.
