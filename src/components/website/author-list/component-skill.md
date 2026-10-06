---
name: Author List
type: BLK
section: website
why: A list of Avatars with name links and roles; the stack variant overlaps them and hides the names visually - they stay in the accessibility tree and the tab order.
when: Article contributors, a publication's masthead, an authors page. One author takes author-bio.
where: dist/components/author-list/author-list.css
supportedStates: default
---

# Pattern: Author List

## Native basis
A `<section>` with a `<ul>`: each contributor an Avatar, the name (a link), a role and an optional count. The stack variant overlaps the avatars and keeps the names for assistive tech.

Built from: [Avatar](../../data-display/avatar/component-skill.md), [Progress](../../feedback-status/progress/component-skill.md), [Tooltip](../../overlays/tooltip/component-skill.md), [Button](../../actions/button/component-skill.md).

---

## Native Web APIs
- [`clip-path`](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path) - visually hidden names (stack)
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - focus ring on the avatar
- [`auto-fill grid`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-columns) - the card grid

---

## Structure

```html
<section class="mk-author-list" aria-labelledby="contributors">
  <h2 class="mk-author-list-title" id="contributors">Contributors</h2>
  <ul class="mk-author-list-items">
    <li class="mk-author-list-item">
      <span class="avatar"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>
      <div class="mk-author-list-who"><a class="mk-author-list-name" href="#">Sophie Tan</a><span class="mk-author-list-role">Staff engineer</span></div>
      <span class="mk-author-list-count">42 articles</span>
    </li>
    <li class="mk-author-list-item">
      <span class="avatar"><img class="avatar-image" src="images/mk-portrait2.png" alt=""></span>
      <div class="mk-author-list-who"><a class="mk-author-list-name" href="#">Hannah Lee</a><span class="mk-author-list-role">Design lead</span></div>
      <span class="mk-author-list-count">18 articles</span>
    </li>
    <li class="mk-author-list-item">
      <span class="avatar"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>
      <div class="mk-author-list-who"><a class="mk-author-list-name" href="#">Aron Homberg</a><span class="mk-author-list-role">CEO</span></div>
      <span class="mk-author-list-count">9 articles</span>
    </li>
    <li class="mk-author-list-item">
      <span class="avatar"><img class="avatar-image" src="images/mk-portrait2.png" alt=""></span>
      <div class="mk-author-list-who"><a class="mk-author-list-name" href="#">Priya Natarajan</a><span class="mk-author-list-role">Product manager</span></div>
      <span class="mk-author-list-count">6 articles</span>
    </li>
  </ul>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | Rows: avatar, name + role, count at the end |
| `data-variant="grid"` | Contributor cards in an auto-fill grid |
| `data-variant="stack"` | Overlapping avatars + `.mk-author-list-summary` - names visually hidden, still announced and focusable |
| `data-variant="ranked"` | A leaderboard: the rank from `data-rank` (medals for 1-3), a Progress bar for each share |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| list | `<ul>` | Announces the count |
| names | links | In the stack variant they stay focusable - focus rings the avatar |
| portraits | `alt=""` | Redundant beside the names |

---

## Notes
- The stack variant reads well up to ~6 avatars; say "and 12 others" in the summary beyond that.
