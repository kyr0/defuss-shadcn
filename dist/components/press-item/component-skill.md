---
name: Press Item
type: BLK
why: An article whose external headline link covers the item, with the outlet and a <time> - and a new-tab hint for screen readers. No script.
when: Press and "in the news" pages. Your own announcements are news-item; customer quotes are testimonials.
where: dist/components/press-item/press-item.css
supportedStates: default
---

# Pattern: Press Item

## Native basis
An `<article>`: the publication and a `<time>`, an optional `<blockquote>`, and the headline as an external link (`target="_blank" rel="noopener"`) that covers the card.

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`<blockquote>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote) - a quoted post with its source
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside

---

## Structure

```html
  <article class="mk-press-item">
    <div class="mk-press-item-meta"><span class="mk-press-item-publication">TechDaily</span><time datetime="2026-09-28">28 Sep 2026</time></div>
    <h3 class="mk-press-item-title"><a href="#" target="_blank" rel="noopener">Acme 4.0 makes offline-first the default for team software<span class="sr-only"> (TechDaily, opens in a new tab)</span></a></h3>
    <span class="mk-press-item-more" aria-hidden="true">Read on TechDaily <i data-lucide="arrow-up-right"></i></span>
  </article>
  <article class="mk-press-item">
    <div class="mk-press-item-meta"><span class="mk-press-item-publication" style="font-family:var(--font-serif)">The Ledger</span><time datetime="2026-08-12">12 Aug 2026</time></div>
    <h3 class="mk-press-item-title"><a href="#" target="_blank" rel="noopener">The 40-person company quietly taking on the giants<span class="sr-only"> (The Ledger, opens in a new tab)</span></a></h3>
    <span class="mk-press-item-more" aria-hidden="true">Read on The Ledger <i data-lucide="arrow-up-right"></i></span>
  </article>
  <article class="mk-press-item">
    <div class="mk-press-item-meta"><span class="mk-press-item-publication">Wired Weekly</span><time datetime="2026-07-03">3 Jul 2026</time></div>
    <h3 class="mk-press-item-title"><a href="#" target="_blank" rel="noopener">Why calm software is the next big thing in productivity<span class="sr-only"> (Wired Weekly, opens in a new tab)</span></a></h3>
    <span class="mk-press-item-more" aria-hidden="true">Read on Wired Weekly <i data-lucide="arrow-up-right"></i></span>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card: outlet and date, the headline, "Read on …" |
| `data-variant="quote"` | A pull quote from the article leads, in the serif face |
| `data-variant="compact"` | A list row: outlet, headline and date on one line |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| headline link | sr-only "(outlet, opens in a new tab)" | Warns before leaving the site |
| quote | `<blockquote>` | Quoted text from the article |

---

## Notes
- Quote one sentence, never a paragraph; always link the source.
