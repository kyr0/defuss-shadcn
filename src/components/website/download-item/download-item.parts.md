<!-- The individual examples of Download Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Download Item"
<article class="mk-download-item">
  <span class="mk-download-item-file" data-ext="DMG" aria-hidden="true">DMG</span>
  <div class="mk-download-item-body">
    <h3 class="mk-download-item-name">Acme for macOS</h3>
    <p class="mk-download-item-desc">Universal build for Apple silicon and Intel.</p>
    <p class="mk-download-item-meta"
      ><span>v4.0.2</span><span>148 MB</span><span><time datetime="2026-09-28">28 Sep 2026</time></span></p
    >
    <details class="mk-download-item-checksum"
      ><summary>SHA-256</summary><code>9f2c…a41b 7e08 3d55 c1f0 66b2 e9a4 0c71</code></details
    >
  </div>
  <a
    class="btn"
    data-variant="outline"
    data-size="sm"
    href="#"
    download=""
    aria-label="Download Acme for macOS (DMG, 148 MB)"
    ><i data-lucide="download"></i> Download</a
  >
</article>
```

```html example part label="Download Item (card)"
<article class="mk-download-item" data-variant="card">
  <span class="mk-download-item-file" data-ext="PDF" aria-hidden="true">PDF</span>
  <div class="mk-download-item-body">
    <h3 class="mk-download-item-name">Security whitepaper</h3>
    <p class="mk-download-item-desc">How Acme stores, encrypts and hosts your data.</p>
    <p class="mk-download-item-meta"
      ><span>Edition 2026</span><span>2.4 MB</span><span><time datetime="2026-08-01">1 Aug 2026</time></span></p
    >
    <details class="mk-download-item-checksum"
      ><summary>SHA-256</summary><code>c8a1…0f3e 52d7 9e14 7ab0 c3f6 1d28 e5b9</code></details
    >
  </div>
  <a
    class="btn"
    data-variant="outline"
    data-size="sm"
    href="#"
    download=""
    aria-label="Download Security whitepaper (PDF, 2.4 MB)"
    ><i data-lucide="download"></i> Download</a
  >
</article>
```
