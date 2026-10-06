---
name: Resource Item
type: BLK
section: website
why: A card whose title link covers it; the type label and the action cue change with the resource - no script.
when: Resource libraries, learning centers, "further reading". A file with format and size is download-item; a help topic is help-category.
where: dist/components/resource-item/resource-item.css
supportedStates: default
---

# Pattern: Resource Item

## Native basis
An `<article>`: the type with an icon, a title link stretched over the card, a description, the format or length and a decorative action cue ("Read", "Download", "Watch").

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
  <article class="mk-resource-item">
    <div class="mk-resource-item-body">
      <span class="mk-resource-item-type"><i data-lucide="book-open"></i>Guide</span>
      <h3 class="mk-resource-item-title"><a href="#">Planning a launch with five teams</a></h3>
      <p class="mk-resource-item-desc">A step-by-step playbook with a board template.</p>
      <p class="mk-resource-item-meta">12 min read</p>
    </div>
    <span class="mk-resource-item-cta" aria-hidden="true">Read the guide <i data-lucide="arrow-right"></i></span>
  </article>
  <article class="mk-resource-item">
    <div class="mk-resource-item-body">
      <span class="mk-resource-item-type"><i data-lucide="layout-template"></i>Template</span>
      <h3 class="mk-resource-item-title"><a href="#">Weekly async update</a></h3>
      <p class="mk-resource-item-desc">Replace your status meeting with one doc.</p>
      <p class="mk-resource-item-meta">Acme template · 2.1k uses</p>
    </div>
    <span class="mk-resource-item-cta" aria-hidden="true">Use template <i data-lucide="arrow-right"></i></span>
  </article>
  <article class="mk-resource-item">
    <div class="mk-resource-item-body">
      <span class="mk-resource-item-type"><i data-lucide="file-text"></i>Whitepaper</span>
      <h3 class="mk-resource-item-title"><a href="#">Security & data handling</a></h3>
      <p class="mk-resource-item-desc">Encryption, hosting and compliance in detail.</p>
      <p class="mk-resource-item-meta">PDF · 24 pages</p>
    </div>
    <span class="mk-resource-item-cta" aria-hidden="true">Download <i data-lucide="arrow-right"></i></span>
  </article>
  <article class="mk-resource-item">
    <div class="mk-resource-item-body">
      <span class="mk-resource-item-type"><i data-lucide="video"></i>Webinar</span>
      <h3 class="mk-resource-item-title"><a href="#">Async teams at 400 people</a></h3>
      <p class="mk-resource-item-desc">Recording of the October session with Q&A.</p>
      <p class="mk-resource-item-meta">48 min · recording</p>
    </div>
    <span class="mk-resource-item-cta" aria-hidden="true">Watch <i data-lucide="arrow-right"></i></span>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card: type, title, description, meta, action cue |
| `data-variant="compact"` | A row - for long lists |
| `data-variant="featured"` | A picture beside the text - one highlighted resource |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title link | `<a>` in `<h3>` | The card's name |
| cue | `aria-hidden="true"` | Visual only |

---

## Notes
- State the format and length - people choose by time.
