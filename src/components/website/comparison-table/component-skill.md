---
name: Comparison Table
type: BLK
section: website
why: A <table> with row and column headers is the accessible way to compare; position: sticky keeps the criteria in view while the table scrolls sideways.
when: Product vs. competitors, plan vs. plan, before vs. after. Plan prices with buy buttons use pricing.
where: dist/components/comparison-table/comparison-table.css
supportedStates: default
---

# Pattern: Comparison Table

## Native basis
A `<table>` (the Table component) with `<th scope="col">` per alternative and `<th scope="row">` per criterion; checks and crosses are labelled SVGs; `data-highlight` marks your column.

Built from: [Table](../../data-display/table/component-skill.md), [Badge](../../data-display/badge/component-skill.md).

---

## Native Web APIs
- [`<table>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table) - real tabular data
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - tints derived from the theme tokens
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<div class="mk-comparison-table">
  <table class="table">
    <caption>Acme compared with typical alternatives, October 2026</caption>
    <thead>
      <tr class="table-row"><th class="table-head" scope="col">Criteria</th><th class="table-head" scope="col" data-highlight>Acme</th><th class="table-head" scope="col">Spreadsheets</th><th class="table-head" scope="col">Classic PM tools</th></tr>
    </thead>
    <tbody>
      <tr class="table-row"><th class="table-cell" scope="row">Docs and tasks in one place</th><td class="table-cell" data-highlight><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Yes" class="mk-comparison-yes"><path d="M20 6 9 17l-5-5"/></svg></td><td class="table-cell"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" role="img" aria-label="No" class="mk-comparison-no"><path d="M18 6 6 18M6 6l12 12"/></svg></td><td class="table-cell"><span class="mk-comparison-partial">Partly</span></td></tr>
      <tr class="table-row"><th class="table-cell" scope="row">Works offline</th><td class="table-cell" data-highlight><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Yes" class="mk-comparison-yes"><path d="M20 6 9 17l-5-5"/></svg></td><td class="table-cell"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Yes" class="mk-comparison-yes"><path d="M20 6 9 17l-5-5"/></svg></td><td class="table-cell"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" role="img" aria-label="No" class="mk-comparison-no"><path d="M18 6 6 18M6 6l12 12"/></svg></td></tr>
      <tr class="table-row"><th class="table-cell" scope="row">Real-time collaboration</th><td class="table-cell" data-highlight><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Yes" class="mk-comparison-yes"><path d="M20 6 9 17l-5-5"/></svg></td><td class="table-cell"><span class="mk-comparison-partial">Partly</span></td><td class="table-cell"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Yes" class="mk-comparison-yes"><path d="M20 6 9 17l-5-5"/></svg></td></tr>
      <tr class="table-row"><th class="table-cell" scope="row">Setup time</th><td class="table-cell" data-highlight>Minutes</td><td class="table-cell">Minutes</td><td class="table-cell">Weeks</td></tr>
      <tr class="table-row"><th class="table-cell" scope="row">Price per seat</th><td class="table-cell" data-highlight>€8</td><td class="table-cell">€0 – €12</td><td class="table-cell">€15 – €30</td></tr>
    </tbody>
  </table>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A table; the first column sticks while it scrolls sideways; the highlighted column is tinted with a top rule |
| `.mk-comparison-versus` | Two sides, each a list of points with checks or crosses |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| headers | `<th scope="col|row">` | Every cell is announced with its criterion and alternative |
| icons | `role="img" aria-label="Yes|No"` | The symbols carry text |
| caption | `<caption>` | Says what is compared |

---

## Notes
- Keep criteria factual and verifiable; date the comparison.
