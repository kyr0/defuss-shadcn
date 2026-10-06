---
name: Article Header
type: BLK
section: website
why: An h1, a subtitle, a byline from Avatar + <time>, and a <figure> with <figcaption> - the cover variant layers the copy over the figure with a gradient, all CSS.
when: The top of a single article or post. A blog or news front takes blog-header / news-header.
where: dist/components/article-header/article-header.css
supportedStates: default
---

# Pattern: Article Header

## Native basis
A `<header>` - category link, the title (`h1`), a subtitle, the byline (Avatar, author link, `<time>`, read time) and an optional `<figure>` lead image with its `<figcaption>`.

Built from: [Avatar](../../data-display/avatar/component-skill.md), [Breadcrumb](../../navigation/breadcrumb/component-skill.md), [Badge](../../data-display/badge/component-skill.md), [Button](../../actions/button/component-skill.md), [Swap](../../actions/swap/component-skill.md), [Progress](../../feedback-status/progress/component-skill.md).

---

## Native Web APIs
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) - lead image + caption
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - publication date
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the title scales
- [`text-wrap: balance`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - even title lines

---

## Structure

```html
<header class="mk-article-header">
  <a class="mk-article-header-category" href="#">Engineering</a>
  <h1 class="mk-article-header-title">How offline sync works in Acme 4.0</h1>
  <p class="mk-article-header-subtitle">CRDTs, a write-ahead log and a lot of patience: the design behind sync that never loses a keystroke.</p>
  <div class="mk-article-header-byline">
    <span class="avatar"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>
    <div>
      <a class="mk-article-header-author" href="#">Sophie Tan</a>
      <div class="mk-article-header-meta"><time datetime="2026-10-01">1 October 2026</time><span>8 min read</span></div>
    </div>
  </div>
  <figure class="mk-article-header-media">
    <img src="images/mk-wide.png" alt="A whiteboard sketch of the sync pipeline">
    <figcaption>The first sketch of the sync pipeline, March 2026.</figcaption>
  </figure>
</header>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | Start-aligned, the lead image below the byline |
| `data-align="center"` | Centered copy |
| `data-variant="cover"` | The image fills the header, the copy sits on it (26rem tall, white text on a gradient) |
| `data-variant="split"` | The copy beside a 4:5 image - stacks when narrow |
| `data-variant="editorial"` | Serif title, italic subtitle, ornament rules around the byline |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title | `<h1>` | One per page |
| author photo | `alt=""` | Redundant beside the author name |
| dates | `<time datetime>` | Published / updated |
| lead image | `<figure>` + `<figcaption>` | Caption and credit |

---

## Notes
- Add an "Updated" `<time>` to the meta when the article changes after publication.
- In the cover variant the caption moves to the top-right corner as a credit.
