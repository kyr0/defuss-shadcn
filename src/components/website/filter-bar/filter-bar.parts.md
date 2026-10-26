<!-- The individual examples of Filter Bar: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Filter Bar (sticky)"
<div class="mk-filter-bar" data-variant="sticky">
  <form action="#" method="get" aria-label="Filters" style="padding-inline: 0.75rem">
    <label class="mk-filter-bar-chip"><input type="checkbox" name="open" checked />Open now</label>
    <label class="mk-filter-bar-chip"><input type="checkbox" name="wifi" />Wi-Fi</label>
    <label class="mk-filter-bar-chip"><input type="checkbox" name="quiet" />Quiet</label>
    <output class="mk-filter-bar-count">12 cafés</output>
  </form>
</div>
```
