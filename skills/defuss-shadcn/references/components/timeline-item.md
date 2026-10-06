---
name: Timeline Item
type: BLK
section: website
why: A <time> and a heading in a list item; the line and dots are borders and pseudo-elements - no script.
when: Company history, "our story" and milestone pages. Generic event lists are the timeline component; numbered workflow stages are process-step.
where: dist/components/timeline-item/timeline-item.css
supportedStates: default
---

# Pattern: Timeline Item

## Native basis
An `<li class="mk-timeline-item">` inside an `<ol class="mk-timeline-list">`: a `<time>`, a dot on a vertical line, a title, a paragraph and an optional picture.

---

## Native Web APIs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - an ordered sequence
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<ol class="mk-timeline-list">
  <li class="mk-timeline-item">
    <time class="mk-timeline-item-date" datetime="2016">2016</time>
    <div class="mk-timeline-item-body">
      <h3 class="mk-timeline-item-title">A flat in Lisbon</h3>
      <p class="mk-timeline-item-text">Alex and Sophie quit their jobs and build the first prototype on a kitchen table.</p>
    </div>
  </li>
  <li class="mk-timeline-item">
    <time class="mk-timeline-item-date" datetime="2018">2018</time>
    <div class="mk-timeline-item-body">
      <h3 class="mk-timeline-item-title">The first thousand teams</h3>
      <p class="mk-timeline-item-text">Word of mouth only - we still have no marketing budget.</p>
    </div>
  </li>
  <li class="mk-timeline-item" data-variant="milestone">
    <time class="mk-timeline-item-date" datetime="2021-03">March 2021</time>
    <div class="mk-timeline-item-body">
      <h3 class="mk-timeline-item-title">Acme 2.0 and offline sync</h3>
      <p class="mk-timeline-item-text">A two-year rewrite ships: Acme works on a plane, in a tunnel, anywhere.</p>
      <img class="mk-timeline-item-media" src="https://picsum.photos/seed/tl-launch/900/506" alt="">
    </div>
  </li>
  <li class="mk-timeline-item">
    <time class="mk-timeline-item-date" datetime="2024">2024</time>
    <div class="mk-timeline-item-body">
      <h3 class="mk-timeline-item-title">Berlin and Montreal</h3>
      <p class="mk-timeline-item-text">Two new offices, forty people, still profitable.</p>
    </div>
  </li>
  <li class="mk-timeline-item">
    <time class="mk-timeline-item-date" datetime="2026">2026</time>
    <div class="mk-timeline-item-body">
      <h3 class="mk-timeline-item-title">Twelve thousand teams</h3>
      <p class="mk-timeline-item-text">And the calmest release we have ever shipped.</p>
    </div>
  </li>
</ol>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Date column, dot on the line, the story |
| `data-variant="milestone"` | A bigger, filled dot and a highlighted card - for the turning points |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| list | `<ol>` | The order is chronological |
| date | `<time datetime>` | A machine-readable year or date |

---

## Notes
- Oldest first reads like a story; newest first reads like news - pick one.
