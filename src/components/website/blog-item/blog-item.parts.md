<!-- The individual examples of Blog Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Blog Item"
<article class="mk-blog-item">
  <figure class="mk-blog-item-media"><img src="images/mk-wide.png" alt="A whiteboard full of sketches" /></figure>
  <div class="mk-blog-item-body">
    <div class="mk-blog-item-meta"
      ><span class="badge" data-variant="secondary">Engineering</span><span>8 min read</span></div
    >
    <h3 class="mk-blog-item-title"><a href="#">How offline sync works in Acme 4.0</a></h3>
    <p class="mk-blog-item-excerpt"
      >CRDTs, a write-ahead log and a lot of patience: the design behind sync that never loses a keystroke.</p
    >
    <div class="mk-blog-item-byline">
      <span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait.png" alt="" /></span>
      <span class="mk-blog-item-author">Sophie Tan</span>
      <time class="mk-blog-item-date" datetime="2026-10-01">1 Oct 2026</time>
    </div>
  </div>
</article>
```

```html example part label="Blog Item (horizontal)"
<article class="mk-blog-item" data-variant="horizontal">
  <figure class="mk-blog-item-media"><img src="images/mk-wide2.png" alt="Two designers reviewing a layout" /></figure>
  <div class="mk-blog-item-body">
    <div class="mk-blog-item-meta"
      ><span class="badge" data-variant="secondary">Design</span><span>5 min read</span></div
    >
    <h3 class="mk-blog-item-title"><a href="#">Designing for calm</a></h3>
    <p class="mk-blog-item-excerpt"
      >Fewer badges, quieter colors, one primary action per screen - and why our metrics went up.</p
    >
    <div class="mk-blog-item-byline">
      <span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait2.png" alt="" /></span>
      <span class="mk-blog-item-author">Hannah Lee</span>
      <time class="mk-blog-item-date" datetime="2026-09-24">24 Sep 2026</time>
    </div>
  </div>
</article>
```

```html example part label="Blog Item (card)"
<article class="mk-blog-item" data-variant="card">
  <figure class="mk-blog-item-media"><img src="images/mk-wide.png" alt="A whiteboard full of sketches" /></figure>
  <div class="mk-blog-item-actions">
    <label class="swap" data-size="sm" data-variant="rotate">
      <input type="checkbox" aria-label="Save post" />
      <span class="swap-on"><i data-lucide="bookmark-check"></i></span>
      <span class="swap-off"><i data-lucide="bookmark"></i></span>
    </label>
  </div>
  <div class="mk-blog-item-body">
    <div class="mk-blog-item-meta"
      ><span class="badge" data-variant="secondary">Engineering</span><span>8 min read</span></div
    >
    <h3 class="mk-blog-item-title"><a href="#">How offline sync works in Acme 4.0</a></h3>
    <p class="mk-blog-item-excerpt">CRDTs, a write-ahead log and a lot of patience.</p>
    <div class="mk-blog-item-tags"
      ><a class="badge" data-variant="outline" href="#">#sync</a
      ><a class="badge" data-variant="outline" href="#">#crdt</a></div
    >
    <div class="mk-blog-item-byline">
      <span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait.png" alt="" /></span>
      <span class="mk-blog-item-author">Sophie Tan</span>
      <time class="mk-blog-item-date" datetime="2026-10-01">1 Oct 2026</time>
    </div>
  </div>
</article>
```

```html example part label="Blog Item (minimal)"
<article class="mk-blog-item" data-variant="minimal">
  <figure class="mk-blog-item-media"><img src="images/mk-wide.png" alt="" /></figure>
  <div class="mk-blog-item-body">
    <div class="mk-blog-item-meta"
      ><span class="badge" data-variant="secondary">Engineering</span><span>8 min read</span></div
    >
    <h3 class="mk-blog-item-title"><a href="#">How offline sync works in Acme 4.0</a></h3>
    <p class="mk-blog-item-excerpt"
      >CRDTs, a write-ahead log and a lot of patience: the design behind sync that never loses a keystroke.</p
    >
    <div class="mk-blog-item-byline">
      <span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait.png" alt="" /></span>
      <span class="mk-blog-item-author">Sophie Tan</span>
      <time class="mk-blog-item-date" datetime="2026-10-01">1 Oct 2026</time>
    </div>
  </div>
</article>
```

```html example part label="Blog Item (quote)"
<article class="mk-blog-item" data-variant="quote">
  <figure class="mk-blog-item-media"><img src="images/mk-wide.png" alt="" /></figure>
  <div class="mk-blog-item-body">
    <div class="mk-blog-item-meta"
      ><span class="badge" data-variant="secondary">Essay</span><span>6 min read</span></div
    >
    <h3 class="mk-blog-item-title"><a href="#">The best feature is the one you never have to explain.</a></h3>
    <p class="mk-blog-item-excerpt">On designing defaults that disappear.</p>
    <div class="mk-blog-item-byline">
      <span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait2.png" alt="" /></span>
      <span class="mk-blog-item-author">Hannah Lee</span>
      <time class="mk-blog-item-date" datetime="2026-10-01">1 Oct 2026</time>
    </div>
  </div>
</article>
```

```html example part label="Blog Item (podcast)"
<article class="mk-blog-item" data-variant="podcast">
  <figure class="mk-blog-item-media"><img src="images/mk-square.png" alt="The Calm Software podcast cover" /></figure>
  <div class="mk-blog-item-body">
    <div class="mk-blog-item-meta"
      ><span class="badge" data-variant="secondary">Podcast</span><span>Episode 42 · 38 min</span></div
    >
    <h3 class="mk-blog-item-title"><a href="#">Sync without tears</a></h3>
    <p class="mk-blog-item-excerpt">Sophie and Alex on CRDTs, outages, and shipping slowly on purpose.</p>
    <div class="mk-blog-item-byline">
      <span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait.png" alt="" /></span>
      <span class="mk-blog-item-author">Sophie Tan</span>
      <time class="mk-blog-item-date" datetime="2026-10-01">1 Oct 2026</time>
    </div>
  </div>
  <audio class="mk-blog-item-player" controls preload="none" src="videos/demo.mp4" aria-label="Play episode 42"></audio>
</article>
```
