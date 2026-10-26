<!-- The individual examples of FAB: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="FAB (sm)"
<div class="fab" data-position="bottom-start" data-size="sm">
  <button class="btn fab-trigger" popovertarget="fab-7c" aria-label="Actions"
    ><span class="fab-icon" aria-hidden="true"><i data-lucide="plus"></i></span
  ></button>
  <div class="fab-menu" id="fab-7c" popover="">
    <button popovertarget="fab-7c" popovertargetaction="hide" class="fab-action"
      ><i data-lucide="sun"></i><span class="fab-label">Light</span></button
    >
    <button popovertarget="fab-7c" popovertargetaction="hide" class="fab-action"
      ><i data-lucide="moon"></i><span class="fab-label">Dark</span></button
    >
  </div>
</div>
```
