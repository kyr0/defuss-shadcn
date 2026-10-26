<!-- The individual examples of Sheet: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Sheet"
<dialog
  id="density-sheet-compact"
  class="sheet"
  data-side="right"
  data-density="compact"
  role="dialog"
  aria-modal="true"
  aria-labelledby="ds-c-title"
>
  <div class="sheet-content">
    <div class="sheet-header">
      <h2 class="sheet-title" id="ds-c-title">Compact density</h2>
      <p class="sheet-description">Content padding is 1rem instead of the default 1.5rem.</p>
    </div>
  </div>
  <button class="sheet-close-x" data-sheet-close="" aria-label="Close"
    ><svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" /></svg
  ></button>
</dialog>
```
