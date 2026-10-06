---
name: Blog
type: BLK
section: website
why: Post cards are `<a>` + `<img>` + clamped text - line-clamp and aspect-ratio give the editorial layout for free.
when: Insights/news teasers on a marketing page; the full article list is a table or card grid instead.
where: dist/components/blog/blog.css
supportedStates: default
---

# Pattern: Blog

## Native basis
The whole card is a single `<a>` wrapping the preview - one tab stop,
one click target. Excerpt clamping uses `-webkit-line-clamp` (shipped
everywhere), media uses `aspect-ratio`; authors compose the
[Avatar](avatar.md) component.

---

## Native Web APIs
- [`line-clamp`](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp) - 3-line excerpt cut with ellipsis
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - 3:2 preview frames
- [Avatar](avatar.md) - author identity row
- [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - 1 → 2 → 3 columns

---

## Structure

```html
<section class="mk-blog">
  <div class="mk-blog-head">
    <div class="mk-blog-head-copy">
      <span class="mk-blog-eyebrow">Blog</span>
      <h2 class="mk-blog-title">Acme Inc. Insights</h2>
      <p class="mk-blog-desc">Tips to work smarter and finish faster.</p>
    </div>
    <a href="#" class="btn mk-blog-see-all" data-variant="secondary">See all</a>
  </div>
  <div class="mk-blog-grid">
    <a href="#" class="mk-blog-card">
      <figure class="mk-blog-media">
        <img src="images/mk-wide.png" alt="Team in flow at a whiteboard" />
      </figure>
      <div class="mk-blog-body">
        <div class="mk-blog-meta">
          <span class="mk-blog-category">Productivity</span>
          <span class="mk-blog-read">8 min read</span>
        </div>
        <div class="mk-blog-copy">
          <h3 class="mk-blog-card-title">5 Ways AI Helps Teams Stay in Flow</h3>
          <p class="mk-blog-excerpt">Simple ways to cut distractions and keep your team focused.</p>
        </div>
        <div class="mk-blog-author">
          <span class="avatar" data-size="sm">
            <img class="avatar-image" src="images/mk-portrait.png" alt="" />
          </span>
          <div class="flex flex-col">
            <span class="mk-blog-author-name">Sophie Tan</span>
            <time class="mk-blog-author-date" datetime="2025-09-04">4 Sept, 2025</time>
          </div>
        </div>
      </div>
    </a>
  </div>
</section>
```

The author avatar is decorative next to the visible name → `alt=""` on the author image.

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| `data-variant="featured"` (on `.mk-blog-grid`) | The first post spans two columns and two rows (from 44rem) |
| `data-variant="list"` | Rows: the picture beside the text, separated by rules |
| `data-variant="minimal"` | Text only - a strong rule on top of each post (leave out the figure) |
| `data-variant="overlay"` | The text on the picture with a scrim; the picture zooms on hover |
| `data-variant="carousel"` | One row that scrolls sideways and snaps per post |
| `.mk-blog-filters` | Category links above the grid; `aria-current` fills the active one |

---

## ARIA

| Attribute   | Element          | Purpose                                |
|-------------|------------------|----------------------------------------|
| `<time>`    | date             | Machine-readable date, human format    |
| `alt=""`    | author photo     | Redundant beside the name text         |
| one `<h3>`  | card title       | Headings stay navigable across cards   |

---

## Notes
- Card links need distinct accessible names - the `<h3>` title provides it; don't duplicate the title in `alt` AND `aria-label`.
- "See all" sits `margin-inline-start: auto` and only shows ≥ 48rem container width (source's `hidden lg:flex`).
- Hover only dims the image (`opacity .9`) - never transform-lift whole cards; motion-sensitive users get none of it under reduced-motion.
- The read time (`.mk-blog-read`) is a muted pill with a clock glyph.
