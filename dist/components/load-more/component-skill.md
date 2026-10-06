---
name: Load More
type: BLK
section: website
why: The button is a link to the next page (works without script); aria-busy on it switches the label to a spinner in CSS while your script fetches.
when: Feeds, galleries and catalogs where page numbers matter less. Exact pages use collection-pagination.
where: dist/components/load-more/load-more.css
supportedStates: default
---

# Pattern: Load More

## Native basis
A centered block: "Showing 24 of 248", a `<progress>`, and a Button-styled `<a href="?page=3">`; while loading, set `aria-busy="true"` on it - CSS shows the spinner and dims it.

Built from: [Progress](../progress/component-skill.md), [Button](../button/component-skill.md), [Spinner](../spinner/component-skill.md).

---

## Native Web APIs
- [`<progress>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) - native completion bar
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - a computed result
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - motion stands still on request

---

## Structure

```html
<div class="mk-load-more">
  <output>Showing <strong>24</strong> of <strong>248</strong> projects</output>
  <progress class="progress" value="24" max="248" aria-label="24 of 248 shown"></progress>
  <a class="btn mk-load-more-button" data-variant="outline" href="#">Load 24 more <i data-lucide="chevron-down"></i><span class="mk-load-more-spin" aria-hidden="true"></span></a>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Count, progress, button |
| `aria-busy="true"` | Loading: a spinner replaces the arrow; the button is inert to clicks |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| count | `<output>` | Updated after each batch |
| busy | `aria-busy="true"` | Announced as busy |
| focus | move focus to the first new item | After loading |

---

## Notes
- Keep the URL in sync with what is loaded so "back" returns to the same place.
