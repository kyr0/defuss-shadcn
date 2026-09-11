---
name: Table of Contents
type: BLK
why: A section-nav block of heading links with active-section tracking classes — pure markup, the observer is the host's.
when: Docs/blog/spec pages with in-page sections that deserve a persistent rail.
where: dist/components/toc/toc.css
supportedStates: default
---

# Pattern: Table of Contents

## Native basis
`<nav>` with a title paragraph and one `<a>` per section heading. Native fragment links do the scrolling; the active link is marked with `aria-current="location"`.

---

## Native Web APIs
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) — landmark for major navigation
- [URL fragment (`:target`)](https://developer.mozilla.org/en-US/docs/Web/CSS/:target) — native deep links
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current) — marks the link for the section in view
- [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) — the host's way to track the visible section and move `aria-current` (behavior, not shipped)
- [`position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position) — the rail follows the scroll without JS

---

## Structure

```html
<nav class="toc" aria-label="On this page">
  <p class="toc-title">On This Page</p>
  <a class="toc-link" href="#installation">Installation</a>
  <a class="toc-link" href="#usage">Usage</a>
  <a class="toc-link" href="#api" aria-current="location">API</a>
  <a class="toc-link" href="#faq">FAQ</a>
</nav>
```

---

## Parts

| Class        | Purpose                                             |
|--------------|-----------------------------------------------------|
| `.toc`       | the nav block (host positions it — rail, sticky…)   |
| `.toc-title` | small caps group label                              |
| `.toc-link`  | a section link; left border when current            |

## States

| State   | Markup                              |
|---------|-------------------------------------|
| default | plain links                         |
| current | `aria-current="location"` on a link |

---

## Accessibility

- Give the nav a name: `aria-label="On this page"`.
- The current section is announced via `aria-current="location"` — update it from the host's IntersectionObserver; never use color alone.
- `forced-colors: active` keeps the current marker visible via system colors.

## Notes

- Build the link list at build time from the page's headings (ids + text) — a hand-maintained ToC drifts immediately.
