<!-- The individual examples of News Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="News Item (compact)"
<article class="mk-news-item" data-variant="compact">
  <div class="mk-news-item-body">
    <div class="mk-news-item-meta">
      <span class="mk-news-item-category">Product</span>
      <time datetime="2026-10-01T09:41">09:41</time>
    </div>
    <h3 class="mk-news-item-title"><a href="#">Offline sync rolls out to every workspace</a></h3>
  </div>
</article>
```

```html example part label="News Item (overlay)"
<article class="mk-news-item" data-variant="overlay">
  <div class="mk-news-item-body">
    <div class="mk-news-item-meta">
      <span class="mk-news-item-category">Product</span>
      <time datetime="2026-10-01">1 Oct 2026</time>
    </div>
    <h3 class="mk-news-item-title"><a href="#">The calmest release we have ever shipped</a></h3>
    <p class="mk-news-item-summary">Offline sync, shared spaces and a faster editor.</p>
  </div>
  <figure class="mk-news-item-media"><img src="images/mk-wide3.png" alt="The new shared spaces view" /></figure>
</article>
```

```html example part label="News Item (ranked)"
<article class="mk-news-item" data-variant="ranked" data-rank="1">
  <div class="mk-news-item-body">
    <div class="mk-news-item-meta">
      <span class="mk-news-item-category">Product</span>
      <time datetime="2026-10-01">3k reads</time>
    </div>
    <h3 class="mk-news-item-title"><a href="#">Offline sync rolls out to every workspace</a></h3>
  </div>
</article>
```

```html example part label="News Item (card)"
<article class="mk-news-item" data-variant="card">
  <div class="mk-news-item-body">
    <div class="mk-news-item-meta"
      ><span class="mk-news-item-category">Company</span><time datetime="2026-09-28">28 Sep</time></div
    >
    <h3 class="mk-news-item-title"><a href="#">A million weekly users, still forty people</a></h3>
    <p class="mk-news-item-summary"
      >The company crossed a million weekly users this summer - and kept its team at forty people.</p
    >
    <div class="mk-news-item-footer"
      ><span class="avatar" data-size="xs"><img class="avatar-image" src="images/mk-portrait2.png" alt="" /></span
      ><span>Aron Homberg</span><a class="badge" data-variant="outline" href="#">Culture</a></div
    >
  </div>
  <figure class="mk-news-item-media"><img src="images/mk-wide2.png" alt="The team at their offsite" /></figure>
</article>
```

```html example part label="News Item (live)"
<article class="mk-news-item" data-variant="live">
  <div class="mk-news-item-body">
    <div class="mk-news-item-meta"><time datetime="2026-10-01T09:30">09:30</time></div>
    <h3 class="mk-news-item-title"><a href="#">Keynote: "never lose a keystroke"</a></h3>
    <p class="mk-news-item-summary">Sophie Tan walks through the sync design live on stage.</p>
    <figure class="mk-news-item-media"><img src="images/mk-wide.png" alt="Sophie Tan on stage" /></figure>
  </div>
</article>
```
