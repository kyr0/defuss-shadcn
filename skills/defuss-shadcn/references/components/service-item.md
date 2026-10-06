---
name: Service Item
type: BLK
section: website
why: One heading link stretched over the card; the hover lift and arrow are CSS transitions - no script.
when: Agency and consultancy service grids. Product capabilities use feature-details; an applied scenario uses use-case.
where: dist/components/service-item/service-item.css
supportedStates: default
---

# Pattern: Service Item

## Native basis
An `<article>` with an icon tile (or a picture), a heading whose link covers the card, a description and a "Learn more" cue (decorative - the title link is the accessible name).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balanced titles, pretty paragraphs

---

## Structure

```html
  <article class="mk-service-item">
    <span class="mk-service-item-icon"><i data-lucide="compass"></i></span>
    <h3 class="mk-service-item-title"><a href="#">Strategy</a></h3>
    <p class="mk-service-item-desc">Roadmaps and research that tell you what to build next - and what to stop.</p>
    <span class="mk-service-item-more" aria-hidden="true">Learn more <i data-lucide="arrow-right"></i></span>
  </article>
  <article class="mk-service-item">
    <span class="mk-service-item-icon"><i data-lucide="pen-tool"></i></span>
    <h3 class="mk-service-item-title"><a href="#">Product design</a></h3>
    <p class="mk-service-item-desc">Interfaces your customers understand on the first try.</p>
    <span class="mk-service-item-more" aria-hidden="true">Learn more <i data-lucide="arrow-right"></i></span>
  </article>
  <article class="mk-service-item">
    <span class="mk-service-item-icon"><i data-lucide="code"></i></span>
    <h3 class="mk-service-item-title"><a href="#">Engineering</a></h3>
    <p class="mk-service-item-desc">Fast, accessible web and mobile apps, shipped every week.</p>
    <span class="mk-service-item-more" aria-hidden="true">Learn more <i data-lucide="arrow-right"></i></span>
  </article>
  <article class="mk-service-item">
    <span class="mk-service-item-icon"><i data-lucide="line-chart"></i></span>
    <h3 class="mk-service-item-title"><a href="#">Growth</a></h3>
    <p class="mk-service-item-desc">Experiments, analytics and onboarding that turn trials into customers.</p>
    <span class="mk-service-item-more" aria-hidden="true">Learn more <i data-lucide="arrow-right"></i></span>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card: icon tile, title, description, an arrow cue that slides on hover |
| `data-variant="image"` | A picture on top instead of the icon |
| `data-variant="inline"` | No card - the icon beside the text, for dense lists |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title link | `<a>` in `<h3>` | The accessible name of the card |
| "Learn more" | `aria-hidden="true"` | A visual cue only - screen readers hear the title once |

---

## Notes
- Four to six services read best; more belong on their own page.
