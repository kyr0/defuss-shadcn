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
- [Button](button.md) - CTAs compose the shipped component

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

CTAs compose the [Button](button.md) component.

---

## ARIA

| Attribute | Element | Purpose                              |
|-----------|---------|--------------------------------------|
| `<h1>`    | title   | One per page - keep other sections h2 |

---

## Notes
- The hero is copy-only by design: media belongs to the [Product Showcase](product-showcase.md), which owns the video contract - compositing them keeps both blocks single-purpose.
- A container cannot query itself: the responsive rules target `.mk-hero-title` / `.mk-hero-actions` (descendants), which is why those selectors live in the `@container` block.
- Keep the CTA row to one primary + one secondary action; more competes with the page's own nav.
