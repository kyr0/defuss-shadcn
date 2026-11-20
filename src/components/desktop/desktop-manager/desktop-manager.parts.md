<!-- The individual examples of Desktop Manager: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Desktop Manager"
<div
  class="desktop-manager"
  id="dm-demo"
  data-on-wallpaper=""
  role="listbox"
  aria-multiselectable="true"
  aria-label="Desktop"
  style="
    height: 19rem;
    border-radius: var(--radius-lg);
    --desktop-wallpaper: linear-gradient(160deg, oklch(0.45 0.12 250), oklch(0.32 0.08 200));
  "
>
  <div class="desktop-icon" role="option" data-value="computer">
    <span class="desktop-icon-image"><i data-lucide="monitor"></i></span>
    <span class="desktop-icon-label">Computer</span>
  </div>
  <div class="desktop-icon" role="option" data-value="documents">
    <span class="desktop-icon-image"><i data-lucide="folder"></i></span>
    <span class="desktop-icon-label">Documents</span>
  </div>
  <div class="desktop-icon" role="option" data-value="pictures">
    <span class="desktop-icon-image"><i data-lucide="images"></i></span>
    <span class="desktop-icon-label">Pictures</span>
  </div>
  <div class="desktop-icon" role="option" data-value="notes">
    <span class="desktop-icon-image"><i data-lucide="notebook-pen"></i></span>
    <span class="desktop-icon-label">Meeting notes.txt</span>
  </div>
  <div class="desktop-icon" role="option" data-value="terminal">
    <span class="desktop-icon-image"><i data-lucide="square-terminal"></i></span>
    <span class="desktop-icon-label">Terminal</span>
  </div>
  <div class="desktop-icon" role="option" data-value="trash">
    <span class="desktop-icon-image"><i data-lucide="trash-2"></i></span>
    <span class="desktop-icon-label">Recycle Bin</span>
  </div>
</div>
```

```html example part label="Desktop Manager (sm)"
<div
  class="desktop-manager"
  data-size="sm"
  role="listbox"
  aria-multiselectable="true"
  aria-label="Small icons"
  style="min-height: 0; height: 6rem"
>
  <div class="desktop-icon" role="option" data-value="a">
    <span class="desktop-icon-image"><i data-lucide="file-text"></i></span>
    <span class="desktop-icon-label">Small</span>
  </div>
</div>
```

```html example part label="Desktop Manager (lg)"
<div
  class="desktop-manager"
  data-size="lg"
  role="listbox"
  aria-multiselectable="true"
  aria-label="Large icons"
  style="min-height: 0; height: 8rem"
>
  <div class="desktop-icon" role="option" aria-selected="true" data-value="b">
    <span class="desktop-icon-image"><i data-lucide="file-text"></i></span>
    <span class="desktop-icon-label">Large, selected</span>
  </div>
</div>
```
