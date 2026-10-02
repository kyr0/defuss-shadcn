---
name: Contents
type: BLK
why: A nav of fragment links; nesting shows the outline, aria-current="location" the section in view (set by your scroll observer or server-side) - the links work alone.
when: Long articles and docs pages. Navigation between pages is docs-navigation; the site-wide trail is breadcrumbs.
where: dist/components/contents/contents.css
supportedStates: default
---

# Pattern: Contents

## Native basis
A `<nav aria-labelledby>` titled "On this page" with a nested `<ol>` of `#fragment` links; `aria-current="location"` marks the section in view.

---

## Native Web APIs
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - a navigation landmark
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current page / step / item
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure, no script
- [`CSS counters`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_counter_styles/Using_CSS_counters) - numbering without markup

---

## Structure

```html
<nav class="mk-contents" aria-labelledby="toc-1">
  <p class="mk-contents-title" id="toc-1">On this page</p>
  <ol>
      <li><a href="#" aria-current="location">Turn it on</a></li>
      <li><a href="#">How sync works</a>
        <ol><li><a href="#">The write-ahead log</a></li><li><a href="#">Merging changes</a></li></ol>
      </li>
      <li><a href="#">Conflicts</a></li>
      <li><a href="#">Troubleshooting</a></li>
    </ol>
</nav>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A rail: the current section lights the line |
| `data-variant="boxed"` | A numbered box at the start of the article |
| `data-variant="dropdown"` | A `<details>` "On this page" - for small screens |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| landmark | `<nav aria-labelledby>` | "On this page" |
| current | `aria-current="location"` | The section in view |
| links | fragment links | Work without script |

---

## Notes
- Two levels deep at most.
