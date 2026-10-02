---
name: News Header
type: BLK
why: A header with an h1, a <time> dateline and a nav of topic links (aria-current marks the current one) - the topic row scrolls natively, no tab script.
when: On a newsroom / press / changelog front. A blog front takes blog-header; a single story takes article-header.
where: dist/components/news-header/news-header.css
supportedStates: default
---

# Pattern: News Header

## Native basis
A `<header>` with the title (`h1`), a `<time>` dateline and a `<nav>` of topic links - `aria-current` marks the current topic, the row scrolls on its own when it overflows.

Built from: [Breadcrumb](../breadcrumb/component-skill.md), [Indicator](../indicator/component-skill.md), [Input](../input/component-skill.md), [Button](../button/component-skill.md), [Toggle Group](../toggle-group/component-skill.md).

---

## Native Web APIs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dateline
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current topic
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) - the topic row scrolls in place
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the title scales

---

## Structure

```html
<header class="mk-news-header">
  <div class="mk-news-header-top">
    <span class="mk-news-header-kicker">Newsroom</span>
    <time class="mk-news-header-date" datetime="2026-10-01">Thursday, 1 October 2026</time>
  </div>
  <h1 class="mk-news-header-title">Acme News</h1>
  <p class="mk-news-header-desc">Product updates, company announcements and the stories behind them - written by the people who build Acme.</p>
  <nav class="mk-news-header-topics" aria-label="Topics">
    <a href="#" aria-current="page">All news</a>
    <a href="#">Product</a>
    <a href="#">Company</a>
    <a href="#">Engineering</a>
    <a href="#">Security</a>
    <a href="#">Press</a>
  </nav>
</header>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | Start-aligned: kicker + dateline, title, context, an underlined topic row |
| `data-variant="masthead"` | A newspaper front: centered serif title between rules, double-ruled topic row |
| `data-variant="bar"` | One compact row: title, topics, tools (search, view switch, subscribe) |
| `data-wrap` (on the topics) | Topics break onto more lines instead of scrolling; without it a row that overflows fades out at its end under a › hint (a scroll-driven animation - gone at the end, absent when everything fits) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| topics | `<nav aria-label="Topics">` | A named navigation landmark |
| current topic | `aria-current="page"` | Announced as current; styled from the attribute |
| dateline | `<time datetime>` | Machine-readable date |

---

## Notes
- Use one `<h1>` per page - the news header usually owns it.
- The topic row scrolls horizontally on narrow screens; keep the current topic early in the list.
