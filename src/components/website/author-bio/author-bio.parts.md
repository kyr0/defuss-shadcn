<!-- The individual examples of Author Bio: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Author Bio (inline)"
<section class="mk-author-bio" data-variant="inline" aria-labelledby="bio-inline">
  <span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait2.png" alt="" /></span>
  <div class="mk-author-bio-body">
    <span class="mk-author-bio-label">By</span>
    <h2 class="mk-author-bio-name" id="bio-inline"
      ><button
        class="btn"
        data-variant="link"
        data-size="sm"
        type="button"
        popovertarget="bio-card"
        style="padding: 0; height: auto"
        >Hannah Lee</button
      ></h2
    >
    <p class="mk-author-bio-role">Design lead</p>
  </div>
  <div class="mk-author-bio-actions"
    ><button class="toggle" data-variant="outline" data-size="sm" aria-pressed="false"
      ><i data-lucide="user-plus"></i> Follow</button
    ></div
  >
</section>
```
