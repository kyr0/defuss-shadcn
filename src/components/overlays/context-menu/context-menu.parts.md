<!-- The individual examples of Context Menu: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="context-menu-trigger"
<div class="context-menu-trigger" data-context-menu="demo-ctx">Right click here</div>
```

```html example part label="context-menu"
<div class="context-menu" id="demo-ctx" popover="">
  <button class="context-menu-item" role="menuitem">Cut</button>
  <button class="context-menu-item" role="menuitem">Copy</button>
  <button class="context-menu-item" role="menuitem">Paste</button>
  <div class="context-menu-separator"></div>
  <button class="context-menu-item" role="menuitem">Select All</button>
</div>
```
