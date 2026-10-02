---
name: Tag List
type: BLK
why: A labelled list of links; colors come from one custom property per tag. No script.
when: Under a post title, on a card, in a task. All tags of a site are tag-cloud.
where: dist/components/tag-list/tag-list.css
supportedStates: default
---

# Pattern: Tag List

## Native basis
A `<ul aria-label="Tags">` of tag links; the colored variant sets `--mk-tag-color` per tag.

---

## Native Web APIs
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - tints derived from the theme tokens

---

## Structure

```html
<ul class="mk-tag-list" aria-label="Tags"><li><a href="#">Engineering</a></li><li><a href="#">Offline</a></li><li><a href="#">CRDT</a></li><li><a href="#">Performance</a></li></ul>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Outlined chips |
| `data-variant="plain"` | #hashtags as text links |
| `data-variant="colored"` | Tinted labels from `--mk-tag-color` |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| list | `aria-label="Tags"` | Named group |
| hash | `#` drawn by CSS in the plain variant | Not read as "number sign" |

---

## Notes
- Three to five tags per item.
