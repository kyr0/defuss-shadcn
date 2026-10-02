---
name: Archive Index
type: BLK
why: Each year is a native <details name="archive"> - exclusive, keyboard-operable, animated with ::details-content and interpolate-size; months are plain links with counts.
when: A blog or news archive in a sidebar or on its own page. Topic-based navigation takes blog-header categories; deep trees take tree-view.
where: dist/components/archive-index/archive-index.css
supportedStates: default
---

# Pattern: Archive Index

## Native basis
A `<nav>` of `<details name="archive">` disclosures - one per year, exclusive by the shared `name`, animated with `::details-content` - each a list of month links with post counts.

Built from: [Timeline](../timeline/component-skill.md), [Badge](../badge/component-skill.md).

---

## Native Web APIs
- [`<details name>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - exclusive year disclosures
- [`::details-content`](https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content) - the open / close animation
- [`interpolate-size`](https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size) - animates to auto height
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the month being shown

---

## Structure

```html
<nav class="mk-archive-index" aria-labelledby="archive-title" style="max-width:18rem">
  <h2 class="mk-archive-index-title" id="archive-title">Archive</h2>
  <details class="mk-archive-index-year" name="archive" open>
    <summary>2026 <span class="mk-archive-index-count">31</span></summary>
    <ul>
      <li><a href="#" aria-current="page">October</a><span class="mk-archive-index-count">3</span></li>
      <li><a href="#">September</a><span class="mk-archive-index-count">6</span></li>
      <li><a href="#">August</a><span class="mk-archive-index-count">4</span></li>
      <li><a href="#">July</a><span class="mk-archive-index-count">5</span></li>
      <li><a href="#">June</a><span class="mk-archive-index-count">7</span></li>
      <li><a href="#">May</a><span class="mk-archive-index-count">6</span></li>
    </ul>
  </details>
  <details class="mk-archive-index-year" name="archive">
    <summary>2025 <span class="mk-archive-index-count">48</span></summary>
    <ul>
      <li><a href="#">December</a><span class="mk-archive-index-count">5</span></li>
      <li><a href="#">November</a><span class="mk-archive-index-count">4</span></li>
      <li><a href="#">October</a><span class="mk-archive-index-count">6</span></li>
      <li><a href="#">September</a><span class="mk-archive-index-count">3</span></li>
    </ul>
  </details>
  <details class="mk-archive-index-year" name="archive">
    <summary>2024 <span class="mk-archive-index-count">39</span></summary>
    <ul>
      <li><a href="#">December</a><span class="mk-archive-index-count">3</span></li>
      <li><a href="#">November</a><span class="mk-archive-index-count">4</span></li>
      <li><a href="#">October</a><span class="mk-archive-index-count">5</span></li>
    </ul>
  </details>
</nav>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A stack of year disclosures (exclusive via `name`) |
| `data-variant="columns"` | The years side by side (auto-fill 11rem columns), each open |
| `data-variant="calendar"` | Each year a 6 × 2 month grid shaded by `data-level` (0-4) - a contribution graph; `.mk-archive-index-legend` explains it |
| `.mk-archive-index-tags` | A tag cloud: `data-weight` 1-5 scales size and weight |
| `.mk-archive-index-months` | Month chips - pill links with counts (`aria-current` fills one); `.mk-archive-index-pick` adds a year's highlight |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| index | `<nav aria-labelledby>` | Named by its title |
| year | `<details>` / `<summary>` | Native disclosure - Enter / Space toggle |
| current month | `aria-current="page"` | Announced as current |

---

## Notes
- Drop `name` to let several years stay open at once.
- The counts are text - read with the link ("October 3").
