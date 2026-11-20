<!-- The individual examples of Taskbar: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Taskbar"
<nav class="taskbar" data-taskbar-for="tb-desk-l" data-position="left" aria-label="Taskbar on the left">
  <button class="start-button" data-variant="icon" type="button" aria-haspopup="menu">
    <i data-lucide="layout-grid" class="start-button-icon"></i>
    <span class="start-button-label">Start</span>
  </button>
  <div class="taskbar-windows" role="group" aria-label="Open windows"></div>
</nav>
```
