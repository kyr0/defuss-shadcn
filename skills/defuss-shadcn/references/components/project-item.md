---
name: Project Item
type: BLK
why: A figure and a stretched heading link; the caption reveal and zoom are CSS transitions keyed to :hover and :focus-within - no script.
when: Portfolio and work grids. The full project page is project-details; client results are case-preview.
where: dist/components/project-item/project-item.css
supportedStates: default
---

# Pattern: Project Item

## Native basis
An `<article>` with a `<figure>`, a title link covering the card, category and year, and optional tags.

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) - media with its caption
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - stable media boxes, no layout shift

---

## Structure

```html
  <article class="mk-project-item">
    <figure class="mk-project-item-media"><img src="https://picsum.photos/seed/proj-a/800/600" alt=""></figure>
    <div class="mk-project-item-body">
      <h3 class="mk-project-item-title"><a href="#">Nordlicht Coffee</a></h3>
      <p class="mk-project-item-meta"><span>Brand identity</span><span>2026</span></p>
      <ul class="mk-project-item-tags"><li>Branding</li><li>Packaging</li></ul>
    </div>
  </article>
  <article class="mk-project-item">
    <figure class="mk-project-item-media"><img src="https://picsum.photos/seed/proj-b/800/600" alt=""></figure>
    <div class="mk-project-item-body">
      <h3 class="mk-project-item-title"><a href="#">Atlas Transit app</a></h3>
      <p class="mk-project-item-meta"><span>Product design</span><span>2025</span></p>
      <ul class="mk-project-item-tags"><li>iOS</li><li>Android</li></ul>
    </div>
  </article>
  <article class="mk-project-item">
    <figure class="mk-project-item-media"><img src="https://picsum.photos/seed/proj-c/800/600" alt=""></figure>
    <div class="mk-project-item-body">
      <h3 class="mk-project-item-title"><a href="#">Museo Digital</a></h3>
      <p class="mk-project-item-meta"><span>Website</span><span>2025</span></p>
      <ul class="mk-project-item-tags"><li>Web</li><li>CMS</li><li>A11y</li></ul>
    </div>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | The picture, then title, category and year under it |
| `data-variant="overlay"` | The caption slides up over the picture on hover or keyboard focus |
| `data-variant="wide"` | A 21:9 picture for one featured project |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title link | `<a>` in `<h3>` | The project name is the accessible name |
| overlay | `:focus-within` | The caption also appears for keyboard users |

---

## Notes
- Use pictures of the same ratio across a grid.
- Put no more than three tags on a card.
