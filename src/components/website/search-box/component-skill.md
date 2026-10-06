---
name: Search Box
type: BLK
section: website
why: A <search> landmark around a GET form: it works without script and the URL is shareable; the expanding variant is a :focus-within transition.
when: Site and app search. Suggestions while typing are search-suggestions; the results page uses search-summary and search-result.
where: dist/components/search-box/search-box.css
supportedStates: default
---

# Pattern: Search Box

## Native basis
A `<search>` with a `<form method="get">`: a visually hidden label, a search icon, an `<input type="search" name="q">` (`enterkeyhint="search"`), a Kbd shortcut hint and submit.

Built from: [Input](../../forms-inputs/input/component-skill.md), [Kbd](../../primitives/kbd/component-skill.md), [Select](../../forms-inputs/select/component-skill.md), [Button](../../actions/button/component-skill.md).

---

## Native Web APIs
- [`<search>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/search) - the search landmark
- [`<kbd>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd) - keyboard input
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<search class="mk-search-box">
  <form action="#" method="get" role="search">
    <label class="sr-only" for="sb-1">Search</label>
    <span class="mk-search-box-field"><i data-lucide="search"></i><input class="input" id="sb-1" type="search" name="q" placeholder="Search docs, tasks and people" autocomplete="off" enterkeyhint="search"><kbd class="kbd">⌘K</kbd></span>
    <button class="btn" type="submit">Search</button>
  </form>
</search>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Field with icon and ⌘K hint, submit beside it |
| `data-variant="large"` | A hero search with a scope Select |
| `data-variant="pill"` | A rounded field without a button |
| `data-variant="expand"` | An icon-width field that widens on focus |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| landmark | `<search>` | Search landmark |
| label | visually hidden `<label>` | Placeholder is not a label |
| shortcut | `<kbd>` | Decorative hint; wire the key separately |

---

## Notes
- Keep the query in the field on the results page.
