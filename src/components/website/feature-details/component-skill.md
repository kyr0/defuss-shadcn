---
name: Feature Details
type: BLK
section: website
why: Two-image feature split with a rule between - a grid with an auto-stretched divider column, no JS.
when: "Benefits" section of a marketing page; for a feature list without imagery use cards instead.
where: dist/components/feature-details/feature-details.css
supportedStates: default
---

# Pattern: Feature Details

## Native basis
CSS Grid (`1fr auto 1fr`) with a stretch divider column that only
appears at container width ≥ 48rem - below it the stack provides the
break, so the markup never swaps separators.

---

## Native Web APIs
- [CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) - `grid-template-columns: 1fr auto 1fr` split
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - square feature images
- [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - column counts follow the block
- [`text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balance headings, pretty body

---

## Structure

```html
<section class="mk-features">
  <div class="mk-features-head">
    <span class="mk-features-eyebrow">Benefits</span>
    <h2 class="mk-features-title">AI That Works Your Way</h2>
    <p class="mk-features-desc">Acme eliminates the work and shows what matters.</p>
  </div>
  <div class="mk-features-grid">
    <article class="mk-feature">
      <div class="mk-feature-copy">
        <h3 class="mk-feature-title">Intelligent Prioritization</h3>
        <p class="mk-feature-desc">Know exactly what to work on next.</p>
      </div>
      <figure class="mk-feature-media">
        <img src="images/mk-square.png" alt="Prioritized task list" />
      </figure>
    </article>
    <div class="mk-feature-sep" aria-hidden="true"></div>
    <article class="mk-feature">
      <div class="mk-feature-copy">
        <h3 class="mk-feature-title">Effortless Integration</h3>
        <p class="mk-feature-desc">Connects with the tools your team already uses.</p>
      </div>
      <figure class="mk-feature-media">
        <img src="images/mk-square.png" alt="Connected integrations" />
      </figure>
    </article>
  </div>
  <div class="mk-feature-cards">
    <div class="mk-feature-card">
      <h3 class="mk-feature-card-title"><i data-lucide="activity"></i>Smarter Analytics</h3>
      <p class="mk-feature-card-desc">Turn data into clarity with AI-powered insights.</p>
    </div>
    <div class="mk-feature-card">
      <h3 class="mk-feature-card-title"><i data-lucide="workflow"></i>Seamless Workflow</h3>
      <p class="mk-feature-card-desc">Stay in the zone without context switching.</p>
    </div>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| `.mk-features-bento` + `.mk-bento-tile` | A bento grid - `data-span="wide"` / `"tall"` tiles, `data-tone="primary"` for an accent tile |
| `.mk-feature-rows` + `.mk-feature-row` | Zig-zag rows: media and copy swap sides every other row; `.mk-feature-checks` lists the benefits |
| `.mk-features-tabs` | A Tabs component: the triggers are the feature list, the panel shows the feature |
| `data-variant="boxed"` (on `.mk-feature-cards`) | Benefit cards on surfaces with an icon tile, lifting on hover |

---

## ARIA

| Attribute     | Element          | Purpose                              |
|---------------|------------------|--------------------------------------|
| `aria-hidden` | divider          | Purely decorative rule               |
| heading order | h2 → h3          | Section → feature hierarchy          |

---

## Notes
- The divider is a styled `<div>` - the visual [Separator](../../primitives/separator/component-skill.md) component is also correct where a semantic break is wanted; keep one approach per page.
- Feature images need real `alt` text (they carry meaning here, unlike the decorative divider).
- Icon cards are `div`+`h3` pairs: no link or button until they actually navigate.
