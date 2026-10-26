<!-- The individual examples of Press Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Press Item"
<article class="mk-press-item">
  <div class="mk-press-item-meta"
    ><span class="mk-press-item-publication">TechDaily</span><time datetime="2026-09-28">28 Sep 2026</time></div
  >
  <h3 class="mk-press-item-title"
    ><a href="#" target="_blank" rel="noopener"
      >Acme 4.0 makes offline-first the default for team software<span class="sr-only">
        (TechDaily, opens in a new tab)</span
      ></a
    ></h3
  >
  <span class="mk-press-item-more" aria-hidden="true">Read on TechDaily <i data-lucide="arrow-up-right"></i></span>
</article>
```

```html example part label="Press Item (quote)"
<article class="mk-press-item" data-variant="quote">
  <div class="mk-press-item-meta"
    ><span class="mk-press-item-publication">TechDaily</span><time datetime="2026-09-28">28 Sep 2026</time></div
  >
  <blockquote class="mk-press-item-quote"
    ><p>Sync that simply never fails - we tried, on a transatlantic flight.</p></blockquote
  >
  <h3 class="mk-press-item-title"
    ><a href="#" target="_blank" rel="noopener"
      >Acme 4.0 makes offline-first the default<span class="sr-only"> (TechDaily, opens in a new tab)</span></a
    ></h3
  >
  <span class="mk-press-item-more" aria-hidden="true">Read on TechDaily <i data-lucide="arrow-up-right"></i></span>
</article>
```

```html example part label="Press Item (compact)"
<article class="mk-press-item" data-variant="compact">
  <div class="mk-press-item-meta"
    ><span class="mk-press-item-publication">TechDaily</span><time datetime="2026-09-28">28 Sep 2026</time></div
  >
  <h3 class="mk-press-item-title"
    ><a href="#" target="_blank" rel="noopener"
      >Acme 4.0 makes offline-first the default for team software<span class="sr-only">
        (TechDaily, opens in a new tab)</span
      ></a
    ></h3
  >
  <span class="mk-press-item-more" aria-hidden="true">Read on TechDaily <i data-lucide="arrow-up-right"></i></span>
</article>
```
