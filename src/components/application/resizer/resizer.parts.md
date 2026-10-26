<!-- The individual examples of Resizer: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Resizer (divider)"
<div
  class="resizer"
  data-variant="divider"
  data-handles="e"
  data-axis="w"
  data-keys="edge"
  data-min="140"
  data-max="360"
>
  <nav
    style="
      width: 12rem;
      height: 100%;
      padding: 0.75rem;
      border-inline-end: 1px solid var(--border);
      background: var(--muted);
      box-sizing: border-box;
    "
  >
    <p style="margin: 0 0 0.5rem; font-weight: 600">Inbox</p>
    <p style="margin: 0; color: var(--muted-foreground); font-size: 0.875rem"
      >Drag my right edge, or Tab to it and press ← / →. Double-click it to reset.</p
    >
  </nav>
</div>
```
