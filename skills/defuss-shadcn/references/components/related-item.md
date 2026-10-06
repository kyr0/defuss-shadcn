---
name: Related Item
type: BLK
why: An <article> whose title link stretches over the item - a thumbnail, a kind label and meta; line-clamp keeps titles to two lines.
when: "Read next" under an article, sidebars, resource lists. A story in a news list takes news-item; a post on a blog front takes blog-item.
where: dist/components/related-item/related-item.css
supportedStates: default
---

# Pattern: Related Item

## Native basis
An `<article>`: thumbnail, kind (Article, Guide, Video...), the title link stretched over the item, and meta.

---

## Native Web APIs
- [`line-clamp`](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp) - two-line titles
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - focus ring on the whole item
- [`translate`](https://developer.mozilla.org/en-US/docs/Web/CSS/translate) - the arrow nudges on hover

---

## Structure

```html
<article class="mk-related-item">
  <figure class="mk-related-item-media"><img src="images/mk-wide2.png" alt=""></figure>
  <div class="mk-related-item-body">
    <span class="mk-related-item-kind">Article</span>
    <h3 class="mk-related-item-title"><a href="#">Designing for calm</a></h3>
    <p class="mk-related-item-meta">24 Sep 2026 · 5 min read</p>
  </div>
</article>
<article class="mk-related-item">
  <figure class="mk-related-item-media"><img src="images/mk-square.png" alt=""></figure>
  <div class="mk-related-item-body">
    <span class="mk-related-item-kind">Guide</span>
    <h3 class="mk-related-item-title"><a href="#">Testing sync with a lossy network</a></h3>
    <p class="mk-related-item-meta">12 Sep 2026 · 11 min read</p>
  </div>
</article>
<article class="mk-related-item">
  <figure class="mk-related-item-media"><img src="images/mk-wide3.png" alt=""></figure>
  <div class="mk-related-item-body">
    <span class="mk-related-item-kind">Video</span>
    <h3 class="mk-related-item-title"><a href="#">Offline sync in four minutes</a></h3>
    <p class="mk-related-item-meta">4:12</p>
  </div>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A compact row: square thumbnail, kind, title, meta |
| `data-variant="card"` | Image above (16:9) |
| `data-variant="text"` | No image, rules between items, an arrow at the end |
| `data-variant="numbered"` | A big primary number from `data-rank`, no image - "read next" in order |
| `data-variant="overlay"` | The title over the image on a gradient, the image zooms on hover |
| `.mk-related-item-badge` | A label on the thumbnail - a duration, "Live" |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| item | `<article>` | The title link is its accessible name |
| thumbnail | `alt=""` | Decorative next to the title |
| arrow | `aria-hidden="true"` | Decorative |

---

## Notes
- Group related items under a heading ("Read next") in a list or grid.
