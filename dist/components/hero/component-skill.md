---
name: Hero
type: BLK
why: Headline, description and CTAs in one centered copy block - native flow layout and container queries, nothing to script.
when: First section of a marketing page; pair with the Product Showcase block when you need a video.
where: dist/components/hero/hero.css
supportedStates: default
---

# Pattern: Hero

## Native basis
Plain sectioning content: badge, `<h1>`, lead paragraph, CTA row.
`text-wrap: balance` optically balances the headline and container
queries swap the size step - no viewport coupling, no script.

---

## Native Web APIs
- [`text-wrap: balance`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - optical headline balancing
- [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - size steps follow the block, not the viewport
- [Button](../button/component-skill.md) - CTAs compose the shipped component

---

## Structure

```html
<section class="mk-hero">
  <div class="mk-hero-copy">
    <span class="mk-hero-badge">New features released</span>
    <h1 class="mk-hero-title">Make Better Decisions, With Ease</h1>
    <p class="mk-hero-desc">Your personal AI helps you cut through the noise.</p>
    <div class="mk-hero-actions">
      <button class="btn">Get Started</button>
    </div>
  </div>
</section>
```

CTAs compose the [Button](../button/component-skill.md) component.

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| `data-variant="split"` | Copy beside a picture or video (`.mk-hero-media`) - two columns, stacked when narrow |
| `data-variant="image"` | A full-bleed photo (`.mk-hero-bg`) behind the copy with a dark scrim, white text; a `data-variant="outline"` Button turns white on it |
| `data-variant="glow"` | A soft brand-colored light over a fading grid; the title fades into the page |
| `data-align="start"` | Start-aligned copy |
| `.mk-hero-pill` | An announcement link above the title: a Badge chip, the news, an arrow |
| `.mk-hero-form` + `.mk-hero-note` | An inline email signup (Input + Button) with a short note |
| `.mk-hero-proof` | Social proof: an Avatar group, stars and a line |
| `.mk-hero-stage` | The product under the copy: a framed screenshot with depth, fading into the page |

---

## ARIA

| Attribute | Element | Purpose                              |
|-----------|---------|--------------------------------------|
| `<h1>`    | title   | One per page - keep other sections h2 |

---

## Notes
- The hero is copy-only by design: media belongs to the [Product Showcase](../product-showcase/component-skill.md), which owns the video contract - compositing them keeps both blocks single-purpose.
- A container cannot query itself: the responsive rules target `.mk-hero-title` / `.mk-hero-actions` (descendants), which is why those selectors live in the `@container` block.
- Keep the CTA row to one primary + one secondary action; more competes with the page's own nav.
