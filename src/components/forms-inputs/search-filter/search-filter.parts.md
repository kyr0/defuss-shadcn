<!-- The individual examples of Search & Filter: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Search & Filter (sm)"
<div class="search-box" data-size="sm">
  <i data-lucide="search"></i>
  <input type="search" value="small" aria-label="Small search" />
  <button type="button" class="search-box-clear" aria-label="Clear search"></button>
</div>
```

```html example part label="Search & Filter (lg)"
<div class="search-box" data-size="lg">
  <i data-lucide="search"></i>
  <input type="search" value="large" aria-label="Large search" />
  <button type="button" class="search-box-clear" aria-label="Clear search"></button>
</div>
```

```html example part label="Search & Filter (muted)"
<div class="search-box" data-variant="muted">
  <i data-lucide="search"></i>
  <input type="search" placeholder="Search messages" aria-label="Search messages" />
  <span class="search-box-hint">in #general</span>
  <button type="button" class="search-box-clear" aria-label="Clear search"></button>
</div>
```
