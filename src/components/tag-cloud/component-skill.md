---
name: Tag Cloud
type: BLK
why: A list of links; one data attribute sets the size step, the count is text - no script.
when: Blog and knowledge-base sidebars, archive pages. The tags of one item are tag-list.
where: dist/components/tag-cloud/tag-cloud.css
supportedStates: default
---

# Pattern: Tag Cloud

## Native basis
A `<ul>` of tag links with `data-weight="1"`…`"5"` (frequency buckets) and the count in the link text for screen readers.

---

## Native Web APIs
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - a navigation landmark

---

## Structure

```html
<ul class="mk-tag-cloud" aria-label="Topics">
  <li><a href="#" data-weight="5">design<span class="sr-only"> (128 posts)</span></a></li>
  <li><a href="#" data-weight="4">engineering<span class="sr-only"> (96 posts)</span></a></li>
  <li><a href="#" data-weight="4">product<span class="sr-only"> (88 posts)</span></a></li>
  <li><a href="#" data-weight="3">async<span class="sr-only"> (54 posts)</span></a></li>
  <li><a href="#" data-weight="3">offline<span class="sr-only"> (47 posts)</span></a></li>
  <li><a href="#" data-weight="2">accessibility<span class="sr-only"> (31 posts)</span></a></li>
  <li><a href="#" data-weight="2">hiring<span class="sr-only"> (22 posts)</span></a></li>
  <li><a href="#" data-weight="1">typography<span class="sr-only"> (12 posts)</span></a></li>
  <li><a href="#" data-weight="2">culture<span class="sr-only"> (26 posts)</span></a></li>
  <li><a href="#" data-weight="1">security<span class="sr-only"> (9 posts)</span></a></li>
  <li><a href="#" data-weight="3">research<span class="sr-only"> (40 posts)</span></a></li>
  <li><a href="#" data-weight="2">remote<span class="sr-only"> (19 posts)</span></a></li>
</ul>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A cloud: five sizes and strengths by data-weight |
| `data-variant="pills"` | Even pills with the count |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| frequency | the count as text (sr-only in the cloud) | Size is not the only cue |

---

## Notes
- Bucket frequencies into five weights - do not size by raw counts.
