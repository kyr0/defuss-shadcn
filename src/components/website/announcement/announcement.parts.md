<!-- The individual examples of Announcement: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Announcement (floating, open)"
<dialog class="mk-announcement" data-variant="floating" open aria-labelledby="ann-4">
  <div class="mk-announcement-inner">
    <i data-lucide="sparkles"></i>
    <p id="ann-4">You can now share spaces with guests.</p>
    <a href="#">Try it</a>
    <form method="dialog"
      ><button class="mk-announcement-close" aria-label="Dismiss tip"><i data-lucide="x"></i></button
    ></form>
  </div>
</dialog>
```
