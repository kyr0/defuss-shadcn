<!-- The individual examples of Article Navigation: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Article Navigation (compact)"
<nav class="mk-article-nav" data-variant="compact" aria-label="Series">
  <a class="mk-article-nav-link" href="#" rel="prev">
    <span class="mk-article-nav-dir"><i data-lucide="arrow-left" aria-hidden="true"></i> <span>Previous</span></span>
    <span class="mk-article-nav-title">Part 1: Why CRDTs</span>
  </a>
  <a class="mk-article-nav-link" href="#" rel="next">
    <span class="mk-article-nav-dir"><span>Next</span> <i data-lucide="arrow-right" aria-hidden="true"></i></span>
    <span class="mk-article-nav-title">Part 3: Testing with a lossy network</span>
  </a>
</nav>
```
