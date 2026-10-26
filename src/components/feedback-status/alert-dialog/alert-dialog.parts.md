<!-- The individual examples of Alert Dialog: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Alert Dialog"
<dialog
  id="density-ad-compact"
  class="alert-dialog"
  data-density="compact"
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="dac-title"
>
  <div class="alert-dialog-content">
    <div class="alert-dialog-header">
      <h2 class="alert-dialog-title" id="dac-title">Compact density</h2>
      <p class="alert-dialog-description">Content padding is 1rem instead of the default 1.5rem.</p>
    </div>
    <div class="alert-dialog-footer"
      ><button class="btn" data-variant="outline" data-alert-dialog-close="">Close</button></div
    >
  </div>
</dialog>
```
