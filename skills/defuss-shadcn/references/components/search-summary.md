---
name: Search Summary
type: BLK
why: A polite live region (role="status") announces new counts as filters change - a sentence, not a widget.
when: At the top of search results and filtered collections. The query field itself is search-box.
where: dist/components/search-summary/search-summary.css
supportedStates: default
---

# Pattern: Search Summary

## Native basis
A `<div role="status">`: "<strong>248 results</strong> for 'calm software'", the time, a "did you mean" link and a clear-search link.

---

## Native Web APIs
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside

---

## Structure

```html
<div class="mk-search-summary" role="status">
  <p><strong>248 results</strong> for <q>calm sofware</q></p>
  <span class="mk-search-summary-time">0.04 s</span>
  <a class="mk-search-summary-clear" href="#">Clear search</a>
  <p class="mk-search-summary-suggest">Did you mean <a href="#">calm software</a>?</p>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Count, query, did-you-mean, time, clear |
| `data-variant="compact"` | Count and query only, small |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `role="status"` | New counts are announced politely |
| query | quoted text | Repeats what was searched |

---

## Notes
- Zero results deserve an empty-state with suggestions.
