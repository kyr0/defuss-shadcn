---
name: Case Preview
type: BLK
section: website
why: A stretched heading link and a figure; the picture zooms on hover with a CSS transition - no script.
when: Customer and portfolio grids. The full story is case-study; anonymous scenarios are use-case.
where: dist/components/case-preview/case-preview.css
supportedStates: default
---

# Pattern: Case Preview

## Native basis
An `<article>`: a picture, the client mark and industry Badge, a title link that covers the card and the headline metric.

Built from: [Badge](badge.md).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) - media with its caption
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching

---

## Structure

```html
  <article class="mk-case-preview">
    <figure class="mk-case-preview-media"><img src="https://picsum.photos/seed/case-nw/800/500" alt=""></figure>
    <div class="mk-case-preview-body">
      <div class="mk-case-preview-meta"><span class="mk-case-preview-logo">Northwind</span><span class="badge" data-variant="outline">Logistics</span></div>
      <h3 class="mk-case-preview-title"><a href="#">How Northwind cut planning meetings in half</a></h3>
      <p class="mk-case-preview-metric"><strong>−52%</strong> meeting time</p>
      <span class="mk-case-preview-more" aria-hidden="true">Read the case study <i data-lucide="arrow-up-right"></i></span>
    </div>
  </article>
  <article class="mk-case-preview">
    <figure class="mk-case-preview-media"><img src="https://picsum.photos/seed/case-gx/800/500" alt=""></figure>
    <div class="mk-case-preview-body">
      <div class="mk-case-preview-meta"><span class="mk-case-preview-logo">Globex</span><span class="badge" data-variant="outline">Research</span></div>
      <h3 class="mk-case-preview-title"><a href="#">Globex brings 400 researchers onto one wiki</a></h3>
      <p class="mk-case-preview-metric"><strong>400</strong> researchers</p>
      <span class="mk-case-preview-more" aria-hidden="true">Read the case study <i data-lucide="arrow-up-right"></i></span>
    </div>
  </article>
  <article class="mk-case-preview">
    <figure class="mk-case-preview-media"><img src="https://picsum.photos/seed/case-it/800/500" alt=""></figure>
    <div class="mk-case-preview-body">
      <div class="mk-case-preview-meta"><span class="mk-case-preview-logo">Initech</span><span class="badge" data-variant="outline">SaaS</span></div>
      <h3 class="mk-case-preview-title"><a href="#">Initech ships weekly instead of quarterly</a></h3>
      <p class="mk-case-preview-metric"><strong>12×</strong> more releases</p>
      <span class="mk-case-preview-more" aria-hidden="true">Read the case study <i data-lucide="arrow-up-right"></i></span>
    </div>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card: picture on top, client, title, the headline metric |
| `data-variant="wide"` | Picture beside the text - for one featured story |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title link | `<a>` in `<h3>` | The card's accessible name |
| client mark | text | Use the company name as text (or an `<img alt>` for a logo) |

---

## Notes
- Lead with the client's result, not your service.
