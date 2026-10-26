<!-- The individual examples of Social Post: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Social Post (quote)"
<article class="mk-social-post" data-variant="quote">
  <header class="mk-social-post-head">
    <span class="avatar"><img class="avatar-image" src="images/mk-portrait2.png" alt="" /></span>
    <div class="mk-social-post-who"
      ><a class="mk-social-post-name" href="#"
        >Hannah Lee<svg
          class="mk-social-post-verified"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          role="img"
          aria-label="Verified account"
        >
          <path
            fill="currentColor"
            d="M12 1.5 14.6 4l3.6-.4.9 3.5 3.2 1.8-1.4 3.3 1.4 3.3-3.2 1.8-.9 3.5-3.6-.4L12 22.5 9.4 20l-3.6.4-.9-3.5-3.2-1.8L3.1 12 1.7 8.7l3.2-1.8.9-3.5 3.6.4Z"
          />
          <path
            d="m7.5 12.2 3 3 6-6.4"
            fill="none"
            stroke="#fff"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          /></svg></a
      ><span class="mk-social-post-handle">@hannahdesigns</span></div
    >
    <span class="mk-social-post-network" role="img" aria-label="Posted on X"
      ><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
        <path
          d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"
        /></svg
    ></span>
  </header>
  <div class="mk-social-post-text"
    ><p>Acme is the first tool my designers asked to keep after the trial. That never happens.</p></div
  >
  <footer class="mk-social-post-foot">
    <a class="mk-social-post-time" href="#"><time datetime="2026-09-12">Sep 12, 2026</time></a>
    <ul class="mk-social-post-stats"
      ><li><i data-lucide="heart"></i>320<span class="sr-only"> likes</span></li></ul
    >
  </footer>
</article>
```
