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
