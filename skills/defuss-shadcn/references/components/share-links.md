---
name: Share Links
type: BLK
why: Share intents are plain <a href> URLs - no third-party scripts, no tracking; copy link and the native share sheet are two lines of page script (navigator.clipboard / navigator.share).
when: Under or beside an article, on a product page. A single "copy link" action can stay a Button.
where: dist/components/share-links/share-links.css
supportedStates: default
---

# Pattern: Share Links

## Native basis
A labelled group of Buttons: share-intent `<a href>` links (X, LinkedIn - no third-party script, no tracking), `mailto:`, and buttons the page wires to `navigator.clipboard` and `navigator.share`.

Built from: [Button](button.md), [Popover](popover.md), [Input](input.md), [Toast](toast.md).

---

## Native Web APIs
- [`navigator.clipboard`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) - copy link
- [`navigator.share()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) - the native share sheet
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - the copy confirmation
- [`writing-mode`](https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode) - the vertical label

---

## Structure

```html
<div class="mk-share-links" role="group" aria-label="Share this article">
  <span class="mk-share-links-label">Share</span>
  <ul class="mk-share-links-list">
    <li><a class="btn" data-variant="outline" data-size="icon-sm" href="https://x.com/intent/post?url=https%3A%2F%2Fexample.com%2Fcalm-software&amp;text=Calm%20software" target="_blank" rel="noopener" aria-label="Share on X"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/></svg></a></li>
    <li><a class="btn" data-variant="outline" data-size="icon-sm" href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Fcalm-software" target="_blank" rel="noopener" aria-label="Share on LinkedIn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5 3.5A2.5 2.5 0 1 1 5 8.5 2.5 2.5 0 0 1 5 3.5ZM3 10h4v11H3V10Zm7 0h3.8v1.6h.1c.5-1 1.8-1.9 3.6-1.9 3.9 0 4.5 2.5 4.5 5.8V21h-4v-4.9c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v5h-4V10Z"/></svg></a></li>
    <li><a class="btn" data-variant="outline" data-size="icon-sm" href="mailto:?subject=Calm%20software&amp;body=https%3A%2F%2Fexample.com%2Fcalm-software" aria-label="Share by email"><i data-lucide="mail"></i></a></li>
    <li><button type="button" class="btn" data-variant="outline" data-size="icon-sm" data-share="copy" aria-label="Copy link"><i data-lucide="link"></i></button></li>
  </ul>
  <output class="mk-share-links-status" id="share-status"></output>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A row of icon buttons |
| `data-variant="labeled"` | Buttons with text ("Post", "LinkedIn", "Copy link") |
| `data-variant="vertical"` | A column rail with a vertical label - make it `position: sticky` beside an article |
| `data-variant="brand"` | Each network in its colour - `data-network` (`x`, `linkedin`, `bluesky`, `mastodon`, `email`, `link`) on the button |
| `data-variant="pill"` | A floating rounded toolbar |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| group | `role="group" aria-label="Share this article"` | Names the set |
| icon links | `aria-label` | "Share on X", "Copy link" |
| new tab | `target="_blank" rel="noopener"` | Intents open in a new tab |
| confirmation | `<output>` | Announces "Link copied" politely |

---

## Notes
- The component ships no script: wire `[data-share="copy"]` to `navigator.clipboard.writeText(location.href)` and `[data-share="native"]` to `navigator.share()` - hide the native button when `navigator.share` is missing.
- Encode the URL in intent links (`encodeURIComponent`).
