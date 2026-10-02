---
name: Stats
type: BLK
why: Metric band = a grid of rule-led numbers; text alignment and tabular-nums do what a chart library would.
when: "Trusted by teams everywhere" social proof with hard numbers; not a data dashboard.
where: dist/components/stats/stats.css
supportedStates: default
---

# Pattern: Stats

## Native basis
CSS Grid columns plus a `border-left` rule per metric; numbers set
`font-variant-numeric: tabular-nums` so digits align without monospace
fonts. No counters, no animation libraries.

---

## Native Web APIs
- [`font-variant-numeric`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric#tabular-nums) - aligned digit columns
- [CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) - 2-up metric grid beside the photo
- [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - side-by-side only when wide

---

## Structure

```html
<section class="mk-stats">
  <div class="mk-stats-copy">
    <div class="mk-stats-head">
      <h2 class="mk-stats-title">Trusted by Teams Everywhere</h2>
      <p class="mk-stats-desc">Thousands of teams move faster with Acme.</p>
    </div>
    <div class="mk-stats-grid">
      <div class="mk-stat">
        <span class="mk-stat-value">12,500+</span>
        <span class="mk-stat-label">Projects completed</span>
        <a href="#" class="btn mk-stat-link" data-variant="link" data-size="default">Our clients</a>
      </div>
      <div class="mk-stat">
        <span class="mk-stat-value">94%</span>
        <span class="mk-stat-label">User satisfaction</span>
      </div>
    </div>
  </div>
  <figure class="mk-stats-media">
    <img src="images/mk-square.png" alt="Team collaborating around a table" />
  </figure>
</section>
```

Link CTAs compose the [Button](button.md) `link` variant; `.mk-stat-link` flushes it to the rule.

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| `data-variant="cards"` (on `.mk-stats-grid`) | Each metric on a card, its accent on the edge, a sparkline (`.mk-stat-spark`) below |
| `.mk-stats-band` | Big centered numbers on a dark band, separated by rules |
| `.mk-stats-rings` | Percentages as Radial Progress rings |

---

## ARIA

| Attribute | Element          | Purpose                                   |
|-----------|------------------|-------------------------------------------|
| `<h2>`    | section title    | Landmark heading for skip-nav             |
| `alt`     | photo            | Describes the scene, not "image"          |

---

## Notes
- Values are prose (`12,500+`, `38% faster`) - use `Intl.NumberFormat` in JS only if values must be localized at runtime.
- The metric's left rule is decorative; don't reach for [Separator](separator.md) per item - borders scale with the text.
- Keep metric CTA links to ≤1 per stat; more turns proof into navigation.
- Each metric gets an accent from the chart palette (`--chart-1`…`--chart-4`, by position) on its edge rule; `.mk-stat-trend` (`data-trend="up|down"`) is a trend chip in the Statistic component's colours.
