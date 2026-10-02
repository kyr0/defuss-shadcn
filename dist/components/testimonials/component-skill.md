---
name: Testimonials
type: BLK
why: A pull-quote plus photo cards with floating review overlays - backdrop-filter and stacking replace any JS layering.
when: Social-proof band on a marketing page; for short quotes without photos a plain blockquote is enough.
where: dist/components/testimonials/testimonials.css
supportedStates: default
---

# Pattern: Testimonials

## Native basis
`<blockquote>`/`<figcaption>` semantics; the review card floats over its
photo with `position` + `z-index` + `color-mix(... transparent)` +
`backdrop-filter: blur()` - the browser composites it, no libraries.

---

## Native Web APIs
- [`<blockquote>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote) - quoted-content semantics
- [`backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) - translucent readable overlay
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - 80% background tint
- [`isolation`](https://developer.mozilla.org/en-US/docs/Web/CSS/isolation) - contained stacking context
- [`prefers-reduced-transparency`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency) - solid overlay fallback

---

## Structure

```html
<section class="mk-testimonials">
  <div class="mk-testimonial-quote-block">
    <div class="mk-testimonial-context">
      <i data-lucide="message-square-quote"></i>
      <span>Loved by talented teams...</span>
    </div>
    <div class="mk-testimonial-layout">
      <blockquote class="mk-testimonial-quote">Huge boost in productivity since adopting Acme.</blockquote>
      <div class="mk-testimonial-brand">
        <svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true"><!-- logo --></svg>
        <span class="mk-testimonial-brand-name">Logoipsum</span>
      </div>
    </div>
    <span class="mk-testimonial-date">June, 2025</span>
  </div>
  <div class="mk-testimonial-cards">
    <figure class="mk-testimonial-card">
      <img src="images/mk-portrait.png" alt="Aron Homberg" />
      <figcaption class="mk-testimonial-card-body">
        <div class="mk-testimonial-card-info">
          <div class="mk-stars" aria-label="5 out of 5 stars">
            <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15 9 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 9"/></svg>
          </div>
          <span class="mk-testimonial-card-name">Aron Homberg</span>
          <span class="mk-testimonial-card-role">Product Manager</span>
        </div>
      </figcaption>
    </figure>
  </div>
</section>
```

Repeat the star `<svg>` five times; the star polygon above is shortened for brevity - copy the full lucide `star` path (with `fill: currentColor` from `.mk-stars svg`).

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A photo card - the review floats over the picture |
| `data-variant="quote"` | A quote card: stars, the review, the author with an Avatar |
| `data-variant="wall"` (on `.mk-testimonial-cards`) | A masonry wall of quote cards - CSS columns, cards of any length |
| `.mk-testimonial-marquee` + `-track` | Rows gliding sideways (`data-direction="reverse"` on the second); pauses on hover / focus, scrolls by hand under reduced motion |
| `.mk-testimonial-spotlight` | One big quote, centered, with the author and the company |
| `.mk-testimonial-card-metric` | A result line in a quote card ("+42% faster releases") |

---

## ARIA

| Attribute    | Element       | Purpose                                  |
|--------------|---------------|------------------------------------------|
| `aria-label` | `.mk-stars`   | "5 out of 5 stars" - SVGs stay hidden    |
| `aria-hidden`| star `svg`s   | Decorative once the group is labeled     |
| `<figcaption>`| card body    | Names the person in the photo            |

---

## Notes
- Star rating is an inline SVG group; label the group, hide the children - never one SR announcement per SVG.
- The overlay uses `margin-block-start: auto` inside a flex `.mk-testimonial-card` (`items-end`) - the card stays photo-dominant at any aspect.
- Photos need `alt` with the person's name; the role line adds the context a face can't convey.
- Two card styles: `data-variant="quote"` (stars, the review in `.mk-testimonial-card-text`, the author in `.mk-testimonial-card-author` with an Avatar) and the photo card (the review floats over the picture). Quote cards flow one column on phones, as many 16rem columns as fit above.
