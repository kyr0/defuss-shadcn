---
name: News Item
type: BLK
section: website
why: An <article> whose headline link stretches over the whole item (::after inset 0) - one tab stop, one click target, the headline as its name; line-clamp trims the summary.
when: News fronts, press pages, "latest updates" lists. A blog post preview with byline takes blog-item; a link under an article takes related-item.
where: dist/components/news-item/news-item.css
supportedStates: default
---

# Pattern: News Item

## Native basis
An `<article>`: category, `<time>`, the headline link - stretched over the item with `::after`, so the whole item is one click target and one tab stop - a clamped summary and an optional image.

Built from: [Badge](badge.md), [Avatar](avatar.md), [Skeleton](skeleton.md), [Button](button.md).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - one self-contained story
- [`line-clamp`](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp) - three-line summary
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - focus ring on the whole item
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - 4:3 thumbnails, 16:9 lead

---

## Structure

```html
<article class="mk-news-item">
  <div class="mk-news-item-body">
    <div class="mk-news-item-meta">
      <span class="mk-news-item-category">Product</span>
      <time datetime="2026-10-01">1 Oct 2026</time>
    </div>
    <h3 class="mk-news-item-title"><a href="#">Acme 4.0 ships with offline sync and shared spaces</a></h3>
    <p class="mk-news-item-summary">Offline sync, a faster editor and shared spaces for small teams: what is new in the biggest release since launch.</p>
  </div>
  <figure class="mk-news-item-media"><img src="images/mk-wide.png" alt="The Acme 4.0 editor on a laptop"></figure>
</article>
<article class="mk-news-item">
  <div class="mk-news-item-body">
    <div class="mk-news-item-meta">
      <span class="mk-news-item-category">Company</span>
      <time datetime="2026-09-28">28 Sep 2026</time>
    </div>
    <h3 class="mk-news-item-title"><a href="#">A million weekly users, still forty people</a></h3>
    <p class="mk-news-item-summary">The company crossed a million weekly users this summer - and kept its team at forty people.</p>
  </div>
  <figure class="mk-news-item-media"><img src="images/mk-wide2.png" alt="The Acme team at their offsite"></figure>
</article>
<article class="mk-news-item">
  <div class="mk-news-item-body">
    <div class="mk-news-item-meta">
      <span class="mk-news-item-category">Engineering</span>
      <span class="mk-news-item-live">Live</span><time datetime="2026-10-01T09:41">09:41</time>
    </div>
    <h3 class="mk-news-item-title"><a href="#">Status: sync delays in eu-west are resolved</a></h3>
    <p class="mk-news-item-summary">A post-mortem of Tuesday's 42-minute outage and the three changes it led to.</p>
  </div>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A row: meta, headline, summary - the thumbnail at the end |
| `data-variant="lead"` | The top story: 16:9 image above, a 32px headline |
| `data-variant="compact"` | A headline list: time in front, no image, no summary |
| `data-variant="card"` | On a surface: 16:9 image on top, footer (author, tag Badges) at the bottom |
| `data-variant="overlay"` | The copy over the image on a dark gradient |
| `data-variant="ranked"` | "Most read": a big outlined number from `data-rank`, no image or summary |
| `data-variant="live"` | A live-blog entry: the time on a rail with a dot (`data-key` turns it red - a key moment) |
| `data-video="4:12"` | On `.mk-news-item-media`: a play glyph and the duration |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| item | `<article>` | One story; the headline link is its accessible name |
| headline | `<h3><a>` | The only link - the stretched ::after makes the rest clickable |
| image | `alt` describing the photo | Or `alt=""` when it only decorates |
| date | `<time datetime>` | Machine-readable |

---

## Notes
- Keep extra links out of the item - the stretched link covers it. Put tags and authors outside, or raise them with `position: relative; z-index: 1`.
- `.mk-news-item-live` pulses (still under reduced motion).
- The footer (`.mk-news-item-footer`) sits above the stretched link - its tag Badges and links stay clickable.
- While loading, render the item with Skeleton bars and `aria-busy="true"` - the layout holds.
