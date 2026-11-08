---
name: Collection Item
type: BLK
section: website
why: A picture and a heading link stretched over the card; the zoom and arrow are CSS transitions - no script.
when: Shop home pages and category overviews. A single product is product-item; editorial categories are category-menu.
where: dist/components/collection-item/collection-item.css
supportedStates: default
---

# Pattern: Collection Item

## Native basis
An `<article>`: a picture, the collection name as a link covering the card, the number of products and a decorative "Shop now" cue.

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - stable media boxes, no layout shift

---

## Structure

```html
  <article class="mk-collection-item">
    <img class="mk-collection-item-media" src="https://picsum.photos/seed/col-linen/800/1000" alt="">
    <div class="mk-collection-item-body">
      <h3 class="mk-collection-item-title"><a href="#">Linen basics</a></h3>
      <p class="mk-collection-item-count">24 products</p>
      <span class="mk-collection-item-more" aria-hidden="true">Shop now <i data-lucide="arrow-right"></i></span>
    </div>
  </article>
  <article class="mk-collection-item">
    <img class="mk-collection-item-media" src="https://picsum.photos/seed/col-knit/800/1000" alt="">
    <div class="mk-collection-item-body">
      <h3 class="mk-collection-item-title"><a href="#">Autumn knitwear</a></h3>
      <p class="mk-collection-item-count">18 products</p>
      <span class="mk-collection-item-more" aria-hidden="true">Shop now <i data-lucide="arrow-right"></i></span>
    </div>
  </article>
  <article class="mk-collection-item">
    <img class="mk-collection-item-media" src="https://picsum.photos/seed/col-home/800/1000" alt="">
    <div class="mk-collection-item-body">
      <h3 class="mk-collection-item-title"><a href="#">Home & table</a></h3>
      <p class="mk-collection-item-count">42 products</p>
      <span class="mk-collection-item-more" aria-hidden="true">Shop now <i data-lucide="arrow-right"></i></span>
    </div>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A 4:5 picture, the name and count below; the card lifts and its picture casts a shadow on hover / focus |
| `data-variant="overlay"` | The name over the picture with a scrim; a glass badge; the cue rises on hover / focus (shown on touch screens) |
| `data-variant="stack"` | Three pictures in `.mk-collection-item-stack` as prints on a tinted panel (`--mk-collection-tint`), fanned out on hover / focus |
| `data-variant="banner"` | A wide 21:9 banner - copy on the start side |
| `.mk-collection-item-badge` | A short label over the picture (New, Bestseller); `data-tone="sale"` turns it red for a reduction |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title link | `<a>` in `<h3>` | The card's accessible name |
| cue | `aria-hidden="true"` | "Shop now" is visual only |
| pictures | `alt` | Say what each photo shows; the title link stays the card's name |
| badge | text | Read with the card - keep it to a word or two |

---

## Notes
- The badge ignores the pointer, so a click on it still follows the title link that covers the card.
- The stack needs three pictures: the first two fan out to the sides, the third stays in front.
- Pictures of one collection should share a ratio across the grid.
