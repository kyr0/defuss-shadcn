---
name: Blog Item
type: BLK
section: website
why: An <article> whose title link stretches over the item - one tab stop and click target; a Badge for the category, an Avatar byline, line-clamp for the excerpt, flex-wrap for the horizontal fallback.
when: Post lists and grids on a blog front or a category page. A news story takes news-item; a link under an article takes related-item; a landing-page teaser row takes blog.
where: dist/components/blog-item/blog-item.css
supportedStates: default
---

# Pattern: Blog Item

## Native basis
An `<article>` - image, category (Badge) + read time, the title link stretched over the item, a clamped excerpt and the byline (Avatar, name, `<time>`).

Built from: [Badge](../badge/component-skill.md), [Avatar](../avatar/component-skill.md), [Swap](../swap/component-skill.md).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - one post
- [`line-clamp`](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp) - three-line excerpt
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - 3:2 images
- [`scale`](https://developer.mozilla.org/en-US/docs/Web/CSS/scale) - the image zooms on hover

---

## Structure

```html
<article class="mk-blog-item">
  <figure class="mk-blog-item-media"><img src="images/mk-wide.png" alt="A whiteboard full of sketches"></figure>
  <div class="mk-blog-item-body">
    <div class="mk-blog-item-meta"><span class="badge" data-variant="secondary">Engineering</span><span>8 min read</span></div>
    <h3 class="mk-blog-item-title"><a href="#">How offline sync works in Acme 4.0</a></h3>
    <p class="mk-blog-item-excerpt">CRDTs, a write-ahead log and a lot of patience: the design behind sync that never loses a keystroke.</p>
    <div class="mk-blog-item-byline">
      <span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>
      <span class="mk-blog-item-author">Sophie Tan</span>
      <time class="mk-blog-item-date" datetime="2026-10-01">1 Oct 2026</time>
    </div>
  </div>
</article>
<article class="mk-blog-item">
  <figure class="mk-blog-item-media"><img src="images/mk-wide2.png" alt="Two designers reviewing a layout"></figure>
  <div class="mk-blog-item-body">
    <div class="mk-blog-item-meta"><span class="badge" data-variant="secondary">Design</span><span>5 min read</span></div>
    <h3 class="mk-blog-item-title"><a href="#">Designing for calm</a></h3>
    <p class="mk-blog-item-excerpt">Fewer badges, quieter colors, one primary action per screen - and why our metrics went up.</p>
    <div class="mk-blog-item-byline">
      <span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait2.png" alt=""></span>
      <span class="mk-blog-item-author">Hannah Lee</span>
      <time class="mk-blog-item-date" datetime="2026-09-24">24 Sep 2026</time>
    </div>
  </div>
</article>
<article class="mk-blog-item">
  <figure class="mk-blog-item-media"><img src="images/mk-wide3.png" alt="A small team around a table"></figure>
  <div class="mk-blog-item-body">
    <div class="mk-blog-item-meta"><span class="badge" data-variant="secondary">Company</span><span>4 min read</span></div>
    <h3 class="mk-blog-item-title"><a href="#">Why we stay small</a></h3>
    <p class="mk-blog-item-excerpt">A million users, forty people. What we say no to, and how we decide.</p>
    <div class="mk-blog-item-byline">
      <span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>
      <span class="mk-blog-item-author">Aron Homberg</span>
      <time class="mk-blog-item-date" datetime="2026-09-17">17 Sep 2026</time>
    </div>
  </div>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A vertical card: 3:2 image, meta, title, excerpt, byline |
| `data-variant="horizontal"` | Image beside the copy - wraps to image-above when the copy would drop under 18rem |
| `data-variant="featured"` | The copy over the image on a dark gradient (24rem tall) |
| `data-variant="card"` | On a card surface, lifted on hover; the byline on a rule |
| `data-variant="minimal"` | Typographic: the date in a column, no image |
| `data-variant="quote"` | A pull-quote post on the primary surface |
| `data-variant="podcast"` | A square cover beside the copy, an `<audio>` player (`.mk-blog-item-player`) below |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| item | `<article>` | The title link is its accessible name |
| image | `alt` | Describe the photo, or `alt=""` when decorative |
| author photo | `alt=""` | Redundant beside the name |
| date | `<time datetime>` | Machine-readable |

---

## Notes
- Lay several items out with grid utilities (`grid grid-cols-3 gap-8`) or `repeat(auto-fill, minmax(18rem, 1fr))`.
- The image zoom on hover is off under reduced motion.
- `.mk-blog-item-tags` and `.mk-blog-item-actions` (a bookmark Swap on the image) sit above the stretched link - they stay clickable.
