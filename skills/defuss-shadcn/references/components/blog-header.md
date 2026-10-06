---
name: Blog Header
type: BLK
section: website
why: An h1, a description, Buttons and a nav of category links (aria-current marks the current one) - chips are plain links, so filtering is a real URL with no script.
when: The front of a blog or a category page. A news front takes news-header; a single post takes article-header.
where: dist/components/blog-header/blog-header.css
supportedStates: default
---

# Pattern: Blog Header

## Native basis
A `<header>` with the title (`h1`), an editorial description, optional actions (Buttons - subscribe, RSS) and a `<nav>` of category links; `aria-current` marks the current category. Each category is a real URL - no filter script.

Built from: [Button](button.md), [Input](input.md), [Toggle Group](toggle-group.md), [Select](select.md).

---

## Native Web APIs
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current category
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the title scales
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color-mix) - the banner glow

---

## Structure

```html
<header class="mk-blog-header">
  <div class="mk-blog-header-copy">
    <span class="mk-blog-header-eyebrow">The Acme Blog</span>
    <h1 class="mk-blog-header-title">Notes on building calm software</h1>
    <p class="mk-blog-header-desc">Essays on product, engineering and design from the team behind Acme - one post a week, no hot takes.</p>
  </div>
  <div class="mk-blog-header-actions">
    <a class="btn" data-size="sm" href="#"><i data-lucide="mail"></i> Subscribe</a>
    <a class="btn" data-variant="outline" data-size="sm" href="#" type="application/rss+xml"><i data-lucide="rss"></i> RSS</a>
  </div>
  <nav class="mk-blog-header-categories" aria-label="Categories">
    <a href="#" aria-current="page">All posts</a>
    <a href="#">Engineering</a>
    <a href="#">Design</a>
    <a href="#">Product</a>
    <a href="#">Company</a>
  </nav>
</header>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | Start-aligned copy, actions, category chips |
| `data-align="center"` | Everything centered |
| `data-variant="banner"` | On a muted surface with a primary glow |
| `data-variant="split"` | The copy beside a tilted featured image (`.mk-blog-header-media`) - stacks when narrow |
| `data-variant="editorial"` | A serif italic masthead between ornaments; categories as underlined text |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| categories | `<nav aria-label="Categories">` | A named navigation landmark |
| current category | `aria-current="page"` | Announced as current; drawn filled |
| RSS | `<a href="/feed.xml" type="application/rss+xml">` | Feed readers and browsers recognise it |

---

## Notes
- The categories are links - each is a URL the server (or the SSG) renders; no client-side filtering.
- For a search box use Search & Filter beside the chips.
