---
name: Comment Item
type: BLK
section: website
why: An <article> with an Avatar, an author link, a <time> permalink to the comment's own id, the text and ghost Buttons - replies nest in an <ol>; :target highlights the comment a permalink opens.
when: Comment threads, reviews, discussion boards. Chat messages take message / bubble.
where: dist/components/comment-item/comment-item.css
supportedStates: default
---

# Pattern: Comment Item

## Native basis
An `<article id>`: Avatar, author link (+ a Badge for roles), a `<time>` that links to the comment's own id, the text, actions (Buttons), and replies nested in an `<ol>` on a thread line. `:target` lights up the comment a permalink opens.

Built from: [Avatar](../../data-display/avatar/component-skill.md), [Badge](../../data-display/badge/component-skill.md), [Button](../../actions/button/component-skill.md), [Dropdown Menu](../../navigation/dropdown/component-skill.md), [Code Mockup](../../mockup/mockup-code/component-skill.md).

---

## Native Web APIs
- [`:target`](https://developer.mozilla.org/en-US/docs/Web/CSS/:target) - the permalinked comment lights up
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - the timestamp
- [`scroll-margin`](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-margin) - clears a sticky header
- [`overflow-wrap: anywhere`](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-wrap) - long URLs never overflow

---

## Structure

```html
<article class="mk-comment-item" id="c-1">
  <span class="avatar"><img class="avatar-image" src="images/mk-portrait2.png" alt=""></span>
  <div class="mk-comment-item-main">
    <header class="mk-comment-item-head">
      <a class="mk-comment-item-author" href="#">Hannah Lee</a>
      <a class="mk-comment-item-time" href="#c-1"><time datetime="2026-10-01T08:12">2 hours ago</time></a>
    </header>
    <div class="mk-comment-item-body"><p>The write-ahead log section finally made CRDTs click for me. Would love a follow-up on how you garbage-collect old operations.</p></div>
    <footer class="mk-comment-item-actions">
      <button type="button" class="btn" data-variant="ghost" data-size="xs" aria-label="Like (24)"><i data-lucide="thumbs-up"></i> 24</button>
      <button type="button" class="btn" data-variant="ghost" data-size="xs"><i data-lucide="reply"></i> Reply</button>
    </footer>
  </div>
  <ol class="mk-comment-item-replies">
    <li>
      <article class="mk-comment-item" id="c-2">
        <span class="avatar"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>
        <div class="mk-comment-item-main">
          <header class="mk-comment-item-head">
            <a class="mk-comment-item-author" href="#">Sophie Tan</a><span class="badge" data-variant="outline">Author</span>
            <a class="mk-comment-item-time" href="#c-2"><time datetime="2026-10-01T09:03">1 hour ago</time></a>
          </header>
          <div class="mk-comment-item-body"><p>That is next on the list! Short version: we compact once every replica has acknowledged an operation.</p></div>
          <footer class="mk-comment-item-actions">
            <button type="button" class="btn" data-variant="ghost" data-size="xs" aria-label="Like (11)"><i data-lucide="thumbs-up"></i> 11</button>
            <button type="button" class="btn" data-variant="ghost" data-size="xs"><i data-lucide="reply"></i> Reply</button>
          </footer>
        </div>
      </article>
    </li>
    <li>
      <article class="mk-comment-item" id="c-3">
        <span class="avatar"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>
        <div class="mk-comment-item-main">
          <header class="mk-comment-item-head">
            <a class="mk-comment-item-author" href="#">Aron Homberg</a>
            <a class="mk-comment-item-time" href="#c-3"><time datetime="2026-10-01T09:30">40 minutes ago</time></a>
          </header>
          <div class="mk-comment-item-body"><p>Seconded - and how it plays with the 30-day branch rule.</p></div>
          <footer class="mk-comment-item-actions">
            <button type="button" class="btn" data-variant="ghost" data-size="xs" aria-label="Like (3)"><i data-lucide="thumbs-up"></i> 3</button>
            <button type="button" class="btn" data-variant="ghost" data-size="xs"><i data-lucide="reply"></i> Reply</button>
          </footer>
        </div>
      </article>
    </li>
  </ol>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | Avatar, head, text, actions; replies on a thread line |
| `data-variant="compact"` | A tighter thread - small avatar, 14px text |
| `data-variant="deleted"` | The text replaced, muted and italic - the replies stay |
| `data-highlighted` / `:target` | A tinted, flashing background - the comment a permalink opened |
| `data-variant="voted"` | A score column (`.mk-comment-item-votes`: up, the score, down) before the avatar - Q&A |
| `data-variant="accepted"` | The accepted answer: a green rail and tint |
| `.mk-comment-item-reactions` | Emoji chips - toggle buttons with `aria-pressed` |
| `.mk-comment-item-thread` | Replies in a native `<details>` - "Show 2 replies" |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| comment | `<article id>` | One comment; the id makes the permalink |
| time | `<a href="#id"><time datetime>` | Permalink + machine-readable date |
| replies | `<ol>` | Ordered - announces the reply count |
| like | `aria-label="Like (12)"` | Name the action and its count |

---

## Notes
- Limit nesting to two or three levels - deeper threads read better flattened with "replying to".
- The flash is off under reduced motion; the tint stays.
