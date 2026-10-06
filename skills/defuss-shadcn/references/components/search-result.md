---
name: Search Result
type: BLK
section: website
why: An article with a stretched title link and <mark>ed matches - all text, all native.
when: Search results pages and command-palette lists. Catalog grids are product-item.
where: dist/components/search-result/search-result.css
supportedStates: default
---

# Pattern: Search Result

## Native basis
An `<article>`: the path (section › page), the title link (stretched), a snippet with `<mark>` matches, meta (type, date) and optionally a thumbnail or a price.

---

## Native Web APIs
- [`<mark>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark) - highlighted matches
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`line-clamp`](https://developer.mozilla.org/en-US/docs/Web/CSS/line-clamp) - excerpts cut after N lines

---

## Structure

```html
  <article class="mk-search-result">
    <div class="mk-search-result-body">
      <p class="mk-search-result-path">Docs <span aria-hidden="true">›</span> Guides</p>
      <h3 class="mk-search-result-title"><a href="#">Offline sync</a></h3>
      <p class="mk-search-result-snippet">Every change is written to your device first. When you are back online, Acme sends the changes - <mark>sync</mark> never waits for the network, and conflicts resolve themselves.</p>
      <p class="mk-search-result-meta">Guide · updated 28 Sep 2026</p>
    </div>
  </article>
  <article class="mk-search-result">
    <div class="mk-search-result-body">
      <p class="mk-search-result-path">Help <span aria-hidden="true">›</span> Sync &amp; offline</p>
      <h3 class="mk-search-result-title"><a href="#"><mark>Sync</mark> is stuck on one device</a></h3>
      <p class="mk-search-result-snippet">If one device stops syncing, sign out and back in. Your unsynced changes are kept on the device until the <mark>sync</mark> completes.</p>
      <p class="mk-search-result-meta">Help article · 3 min read</p>
    </div>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Path, title, snippet, meta |
| `data-variant="media"` | A thumbnail beside the text |
| `data-variant="product"` | A square picture and the price |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| matches | `<mark>` | Announced as highlighted by some readers |
| path | `›` hidden from AT | Read as the words only |

---

## Notes
- Snippets should show the matched sentence, not the first one.
