---
name: FAQ
type: BLK
why: Icon-card answers stay visible - no disclosure widget to wire, so screen readers and crawlers see every answer.
when: Support section on a marketing page; for many long Q&As use the Accordion (native <details>) instead.
where: dist/components/faq/faq.css
supportedStates: default
---

# Pattern: FAQ

## Native basis
Sectioning `<article>`s in a grid - headings + paragraphs, nothing
interactive. If you need collapsing answers, that's the
[Accordion](accordion.md) (`<details name>` exclusive),
not this block.

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - self-contained Q&A unit
- [CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) - 1 → 2 → 3 columns by container width
- [`text-wrap: balance`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - question headings balance

---

## Structure

```html
<section class="mk-faq">
  <div class="mk-faq-head">
    <span class="mk-faq-eyebrow">Support</span>
    <h2 class="mk-faq-title">Frequently Asked Questions</h2>
  </div>
  <div class="mk-faq-grid">
    <article class="mk-faq-item">
      <span class="mk-faq-icon"><i data-lucide="sparkles"></i></span>
      <div class="mk-faq-text">
        <h3 class="mk-faq-question">What is Acme AI?</h3>
        <p class="mk-faq-answer">A personal AI workspace that cuts context switching.</p>
      </div>
    </article>
    <article class="mk-faq-item">
      <span class="mk-faq-icon"><i data-lucide="user"></i></span>
      <div class="mk-faq-text">
        <h3 class="mk-faq-question">Who is it for?</h3>
        <p class="mk-faq-answer">Creators, teams, and businesses of all sizes.</p>
      </div>
    </article>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| `data-variant="accordion"` (on `.mk-faq`) | The head centered above an Accordion (`.mk-faq-accordion`) - one answer open at a time |
| `.mk-faq-split` | The head (sticky from 52rem) beside the questions |
| `data-variant="cards"` (on `.mk-faq-grid`) | Each question and answer on a bordered card |
| `data-variant="numbered"` (on `.mk-faq-grid`) | A mono counter (01, 02…) instead of the icon, a rule on top |
| `.mk-faq-search` + `.mk-faq-topics` | A search field and topic links above the questions |
| `.mk-faq-contact` | "Still have questions?" with the team (Avatar group) and an action |

---

## ARIA

| Attribute | Element        | Purpose                          |
|-----------|----------------|----------------------------------|
| `<h3>`    | question       | Headings double as TOC anchors   |
| icon tile | `.mk-faq-icon` | Decorative - add `aria-hidden="true"` on the svg |

---

## Notes
- Visible-answer FAQs are indexed by search engines and read linearly - prefer this over accordions until the list is long.
- The icon tile is decoration next to a text question: keep the SVG `aria-hidden`.
- `mk-faq-item` caps at `max-width: 36rem` so prose lines stay readable in the 3-column layout.
- Every answer links to its detail page with `.mk-faq-link` (descriptive text + an arrow that nudges on hover).
