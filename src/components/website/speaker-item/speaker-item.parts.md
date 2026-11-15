<!-- The individual examples of Speaker Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Speaker Item"
<article class="mk-speaker-item" aria-labelledby="sp-1">
  <img class="mk-speaker-item-photo" src="images/mk-portrait.png" alt="Portrait of Sophie Tan" />
  <div class="mk-speaker-item-body">
    <h3 class="mk-speaker-item-name" id="sp-1">Sophie Tan</h3>
    <p class="mk-speaker-item-role">Head of Engineering, Acme</p>
    <a class="mk-speaker-item-talk" href="#"><i data-lucide="mic"></i>Sync that never fails</a>
  </div>
</article>
```

```html example part label="Speaker Item (compact)"
<article class="mk-speaker-item" data-variant="compact" aria-labelledby="sp-c1">
  <img class="mk-speaker-item-photo" src="images/mk-portrait.png" alt="Portrait of Sophie Tan" />
  <div class="mk-speaker-item-body">
    <h3 class="mk-speaker-item-name" id="sp-c1">Sophie Tan</h3>
    <p class="mk-speaker-item-role">Acme</p>
    <a class="mk-speaker-item-talk" href="#"><i data-lucide="mic"></i>Sync that never fails</a>
  </div>
</article>
```

```html example part label="Speaker Item (overlay)"
<article class="mk-speaker-item" data-variant="overlay" aria-labelledby="sp-o1">
  <img class="mk-speaker-item-photo" src="images/avatars/47-480.webp" alt="Portrait of Sophie Tan" />
  <div class="mk-speaker-item-body">
    <ul class="mk-speaker-item-tags" aria-label="Topics"
      ><li>Sync</li
      ><li>CRDTs</li></ul
    >
    <h3 class="mk-speaker-item-name" id="sp-o1">Sophie Tan</h3>
    <p class="mk-speaker-item-role">Head of Engineering, Acme</p>
    <a class="mk-speaker-item-talk" href="#"><i data-lucide="mic"></i>Sync that never fails</a>
  </div>
  <ul class="mk-speaker-item-social" aria-label="Sophie Tan elsewhere">
    <li
      ><a href="#" aria-label="Sophie Tan on LinkedIn"
        ><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"
          /></svg></a
    ></li>
    <li
      ><a href="#" aria-label="Sophie Tan on GitHub"
        ><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"
          /></svg></a
    ></li>
  </ul>
</article>
```
