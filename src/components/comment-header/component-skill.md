---
name: Comment Header
type: BLK
why: A heading with the count (Badge) and a native Select (or links with aria-current) for the order - the page re-renders by the chosen order, no list script.
when: Above a comment thread or a reviews list. A section intro without sorting takes section-header.
where: dist/components/comment-header/comment-header.css
supportedStates: default
---

# Pattern: Comment Header

## Native basis
A `<header>`: the title with the comment count (a Badge), the sort - a native Select inside its `<label>`, or sort links with `aria-current` - and optional actions.

Built from: [Badge](../badge/component-skill.md), [Select](../select/component-skill.md), [Button](../button/component-skill.md), [Toggle Group](../toggle-group/component-skill.md), [Avatar](../avatar/component-skill.md), [Alert](../alert/component-skill.md).

---

## Native Web APIs
- [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select) - the sort order
- [`<label>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label) - wraps "Sort by" + the select
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current sort link

---

## Structure

```html
<header class="mk-comment-header">
  <h2 class="mk-comment-header-title">Comments <span class="badge" data-variant="secondary">128</span></h2>
  <div class="mk-comment-header-actions">
    <label class="mk-comment-header-sort">Sort by
      <select class="select" data-size="sm" name="sort">
        <option>Top</option>
        <option>Newest</option>
        <option>Oldest</option>
      </select>
    </label>
    <button type="button" class="btn" data-variant="outline" data-size="sm"><i data-lucide="bell"></i> Follow</button>
  </div>
</header>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | Title + count, sort and actions over a rule |
| `data-variant="plain"` | No rule under the header |
| `.mk-comment-header-people` | Who is talking: an Avatar group and a sentence, on its own row |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title | `<h2>` | Names the thread - point the thread section's `aria-labelledby` at it |
| sort | `<label>` + `<select>` | Or a `<nav aria-label="Sort comments">` of links with `aria-current` |
| count | text in the heading | "Comments 128" - read with the title |

---

## Notes
- A select sorts with a tiny change handler (or `onchange="this.form.submit()"` in a GET form); links need no script at all.
