---
name: Article Navigation
type: BLK
why: Two links with rel="prev" / rel="next" in a nav - the relations are machine-readable; a two-column grid keeps a lone next link on its side, a container query stacks them when narrow.
when: At the end of an article or docs page. Page numbers take pagination; a list of further reading takes related-item.
where: dist/components/article-navigation/article-navigation.css
supportedStates: default
---

# Pattern: Article Navigation

## Native basis
A `<nav>` with two links - `rel="prev"` and `rel="next"` - each a direction label and the title. A lone next link keeps the end side; narrow, they stack.

Built from: [Progress](../progress/component-skill.md).

---

## Native Web APIs
- [`rel="prev" / "next"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel) - machine-readable sequence
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - stack when narrow
- [`:only-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/:only-child) - a lone next link keeps its side

---

## Structure

```html
<nav class="mk-article-nav" aria-label="More articles">
  <a class="mk-article-nav-link" href="#" rel="prev">
    <span class="mk-article-nav-dir"><i data-lucide="arrow-left" aria-hidden="true"></i> Previous</span>
    <span class="mk-article-nav-title">Designing for calm</span>
  </a>
  <a class="mk-article-nav-link" href="#" rel="next">
    <span class="mk-article-nav-dir">Next <i data-lucide="arrow-right" aria-hidden="true"></i></span>
    <span class="mk-article-nav-title">Testing sync with a lossy network</span>
  </a>
</nav>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | Two bordered cards |
| `data-variant="minimal"` | No cards - text under a rule |
| `data-variant="media"` | A square thumbnail on each card - the start for prev, the end for next |
| `data-variant="compact"` | Two small pills, titles truncated; wrap "Previous" / "Next" in a `<span>` and they hide visually (still read) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| nav | `<nav aria-label="More articles">` | Named, distinct from the site nav |
| links | `rel="prev"` / `rel="next"` | The sequence for browsers and readers |
| arrows | `aria-hidden` | The words "Previous" / "Next" carry the meaning |

---

## Notes
- The first article has only a next link, the last only a previous one - both keep their sides.
