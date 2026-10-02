---
name: Download Item
type: BLK
why: An <a download> link with the format and size in its name; the checksum is a <details> - no script.
when: Download pages, release assets, press kits. A resource to read online is resource-item.
where: dist/components/download-item/download-item.css
supportedStates: default
---

# Pattern: Download Item

## Native basis
An `<article>`: a file badge (`data-ext` colors it), name, description, version / size / `<time>`, a `<details>` with the SHA-256 and an `<a download>` Button.

Built from: [Button](button.md).

---

## Native Web APIs
- [`download`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#download) - the link saves the file
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure, no script
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates

---

## Structure

```html
  <article class="mk-download-item">
    <span class="mk-download-item-file" data-ext="DMG" aria-hidden="true">DMG</span>
    <div class="mk-download-item-body">
      <h3 class="mk-download-item-name">Acme for macOS</h3>
      <p class="mk-download-item-desc">Universal build for Apple silicon and Intel.</p>
      <p class="mk-download-item-meta"><span>v4.0.2</span><span>148 MB</span><span><time datetime="2026-09-28">28 Sep 2026</time></span></p>
      <details class="mk-download-item-checksum"><summary>SHA-256</summary><code>9f2c…a41b 7e08 3d55 c1f0 66b2 e9a4 0c71</code></details>
    </div>
    <a class="btn" data-variant="outline" data-size="sm" href="#" download aria-label="Download Acme for macOS (DMG, 148 MB)"><i data-lucide="download"></i> Download</a>
  </article>
  <article class="mk-download-item">
    <span class="mk-download-item-file" data-ext="EXE" aria-hidden="true">EXE</span>
    <div class="mk-download-item-body">
      <h3 class="mk-download-item-name">Acme for Windows</h3>
      <p class="mk-download-item-desc">Windows 10 and 11, 64-bit.</p>
      <p class="mk-download-item-meta"><span>v4.0.2</span><span>132 MB</span><span><time datetime="2026-09-28">28 Sep 2026</time></span></p>
      <details class="mk-download-item-checksum"><summary>SHA-256</summary><code>41d0…77e2 9b13 0aa6 f2c8 15e4 b7d9 3c02</code></details>
    </div>
    <a class="btn" data-variant="outline" data-size="sm" href="#" download aria-label="Download Acme for Windows (EXE, 132 MB)"><i data-lucide="download"></i> Download</a>
  </article>
  <article class="mk-download-item">
    <span class="mk-download-item-file" data-ext="PDF" aria-hidden="true">PDF</span>
    <div class="mk-download-item-body">
      <h3 class="mk-download-item-name">Security whitepaper</h3>
      <p class="mk-download-item-desc">How Acme stores, encrypts and hosts your data.</p>
      <p class="mk-download-item-meta"><span>Edition 2026</span><span>2.4 MB</span><span><time datetime="2026-08-01">1 Aug 2026</time></span></p>
      <details class="mk-download-item-checksum"><summary>SHA-256</summary><code>c8a1…0f3e 52d7 9e14 7ab0 c3f6 1d28 e5b9</code></details>
    </div>
    <a class="btn" data-variant="outline" data-size="sm" href="#" download aria-label="Download Security whitepaper (PDF, 2.4 MB)"><i data-lucide="download"></i> Download</a>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A row |
| `data-variant="card"` | A card for a grid |
| `data-ext` | Badge color by format: PDF, ZIP, DMG, EXE (others neutral) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| download | `aria-label="Download Acme for macOS (DMG, 148 MB)"` | Format and size before the click |
| checksum | `<details>` | On request, copyable |

---

## Notes
- Always state the size - people on metered connections decide by it.
