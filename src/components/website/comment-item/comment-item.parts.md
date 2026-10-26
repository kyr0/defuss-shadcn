<!-- The individual examples of Comment Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Comment Item (compact)"
<article class="mk-comment-item" id="c-5" data-variant="compact">
  <span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait2.png" alt="" /></span>
  <div class="mk-comment-item-main">
    <header class="mk-comment-item-head">
      <a class="mk-comment-item-author" href="#">Priya Natarajan</a>
      <a class="mk-comment-item-time" href="#c-5"><time datetime="2026-09-28">3 days ago</time></a>
    </header>
    <div class="mk-comment-item-body"><p>Great write-up - bookmarked.</p></div>
    <footer class="mk-comment-item-actions">
      <button type="button" class="btn" data-variant="ghost" data-size="xs" aria-label="Like (2)"
        ><i data-lucide="thumbs-up"></i> 2</button
      >
      <button type="button" class="btn" data-variant="ghost" data-size="xs"><i data-lucide="reply"></i> Reply</button>
    </footer>
  </div>
</article>
```

```html example part label="Comment Item (deleted)"
<article class="mk-comment-item" id="c-6" data-variant="deleted">
  <span class="avatar"><img class="avatar-image" src="images/mk-portrait.png" alt="" /></span>
  <div class="mk-comment-item-main">
    <header class="mk-comment-item-head">
      <a class="mk-comment-item-author" href="#">Deleted user</a>
      <a class="mk-comment-item-time" href="#c-6"><time datetime="2026-09-28">3 days ago</time></a>
    </header>
    <div class="mk-comment-item-body"><p>This comment was removed by a moderator.</p></div>
    <footer class="mk-comment-item-actions">
      <button type="button" class="btn" data-variant="ghost" data-size="xs" aria-label="Like (0)"
        ><i data-lucide="thumbs-up"></i> 0</button
      >
      <button type="button" class="btn" data-variant="ghost" data-size="xs"><i data-lucide="reply"></i> Reply</button>
    </footer>
  </div>
</article>
```

```html example part label="Comment Item (voted)"
<article class="mk-comment-item" id="q-1" data-variant="voted">
  <div class="mk-comment-item-votes">
    <button class="btn" data-variant="ghost" data-size="icon-xs" type="button" aria-label="Upvote" aria-pressed="false"
      ><i data-lucide="chevron-up"></i
    ></button>
    <output aria-label="Score">7</output>
    <button
      class="btn"
      data-variant="ghost"
      data-size="icon-xs"
      type="button"
      aria-label="Downvote"
      aria-pressed="false"
      ><i data-lucide="chevron-down"></i
    ></button>
  </div>
  <span class="avatar"><img class="avatar-image" src="images/mk-portrait2.png" alt="" /></span>
  <div class="mk-comment-item-main">
    <header class="mk-comment-item-head">
      <a class="mk-comment-item-author" href="#">Priya Natarajan</a>
      <a class="mk-comment-item-time" href="#q-1"><time datetime="2026-09-30">yesterday</time></a>
    </header>
    <div class="mk-comment-item-body"
      ><p>How do I force a full resync on one device? Mine shows an old version of a doc.</p></div
    >
    <footer class="mk-comment-item-actions">
      <button type="button" class="btn" data-variant="ghost" data-size="xs" aria-label="Like (0)"
        ><i data-lucide="thumbs-up"></i> 0</button
      >
      <button type="button" class="btn" data-variant="ghost" data-size="xs"><i data-lucide="reply"></i> Reply</button>
    </footer>
  </div>
</article>
```

```html example part label="Comment Item (accepted)"
<article class="mk-comment-item" id="q-2" data-variant="accepted">
  <span class="avatar"><img class="avatar-image" src="images/mk-portrait.png" alt="" /></span>
  <div class="mk-comment-item-main">
    <header class="mk-comment-item-head">
      <a class="mk-comment-item-author" href="#">Sophie Tan</a
      ><span class="badge" data-variant="default"><i data-lucide="check"></i> Accepted answer</span>
      <a class="mk-comment-item-time" href="#q-2"><time datetime="2026-09-30T13:00">20 hours ago</time></a>
    </header>
    <div class="mk-comment-item-body">
      <p>Settings → Storage → Rebuild local cache. Or from the console:</p>
      <div class="mockup-code" data-chrome="none"><pre data-prefix="$"><code>acme sync --rebuild --device laptop</code></pre><pre data-prefix=">" data-tone="success"><code>Rebuilt 1,204 operations</code></pre></div>
    </div>
    <footer class="mk-comment-item-actions">
      <button type="button" class="btn" data-variant="ghost" data-size="xs" aria-label="Like (0)"
        ><i data-lucide="thumbs-up"></i> 0</button
      >
      <button type="button" class="btn" data-variant="ghost" data-size="xs"><i data-lucide="reply"></i> Reply</button>
    </footer>
  </div>
</article>
```
