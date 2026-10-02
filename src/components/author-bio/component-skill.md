---
name: Author Bio
type: BLK
why: An Avatar, a heading with the author link, a role, a paragraph and a list of icon Buttons - semantic HTML, no script.
when: Under an article, on an author page, in a sidebar. Several contributors take author-list.
where: dist/components/author-bio/author-bio.css
supportedStates: default
---

# Pattern: Author Bio

## Native basis
A labelled `<section>`: the portrait (Avatar), a label, the name as a heading linking to the author page, a role, the biography and a list of links (icon Buttons).

Built from: [Avatar](../avatar/component-skill.md), [Button](../button/component-skill.md), [Statistic](../statistic/component-skill.md), [Toggle](../toggle/component-skill.md), [Popover](../popover/component-skill.md).

---

## Native Web APIs
- [`<section aria-labelledby>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/section) - a named region
- [`text-wrap: pretty`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - the biography

---

## Structure

```html
<section class="mk-author-bio" aria-labelledby="bio-1">
  <span class="avatar" data-size="lg"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>
  <div class="mk-author-bio-body">
    <span class="mk-author-bio-label">Written by</span>
    <h2 class="mk-author-bio-name" id="bio-1"><a href="#">Sophie Tan</a></h2>
    <p class="mk-author-bio-role">Staff engineer, Sync team</p>
    <p class="mk-author-bio-text">Sophie leads the sync team at Acme. Before that she built storage engines at two databases you have heard of. She writes about distributed systems, testing, and calm engineering.</p>
    <ul class="mk-author-bio-links">
      <li><a class="btn" data-variant="ghost" data-size="icon-sm" href="#" rel="me" aria-label="Website"><i data-lucide="globe"></i></a></li>
      <li><a class="btn" data-variant="ghost" data-size="icon-sm" href="#" rel="me" aria-label="Email Sophie"><i data-lucide="mail"></i></a></li>
      <li><a class="btn" data-variant="ghost" data-size="icon-sm" href="#" aria-label="RSS feed of Sophie's posts"><i data-lucide="rss"></i></a></li>
    </ul>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A row between rules - under an article |
| `data-variant="card"` | A raised profile card: a primary wash, a shadow, the portrait ringed in the primary colour; `.mk-author-bio-topics` (Badges) and `.mk-author-bio-actions` fit it |
| `.mk-author-bio-topics` | The topics the author writes about - a row of Badges |
| `data-variant="centered"` | A centered profile stack - portrait on top |
| `data-variant="cover"` | A banner image (`.mk-author-bio-cover`) on top, the portrait overlapping it - a profile card |
| `data-variant="inline"` | A compact byline - one row, small portrait, the text and links hidden |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| bio | `<section aria-labelledby>` | Named by the author heading |
| portrait | `alt=""` | Redundant beside the name |
| icon links | `aria-label` | Every icon-only link names its destination |

---

## Notes
- Use `rel="me"` on the author's own profile links.
- Pick the heading level for the page outline - h2 under an article.
