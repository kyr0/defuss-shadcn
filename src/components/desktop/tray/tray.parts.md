<!-- The individual examples of Tray: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Tray"
<div class="tray" id="tray-demo" data-seconds="" data-date="" lang="de" role="group" aria-label="Notification area">
  <button class="tray-item" type="button" aria-label="Network" popovertarget="tray-net"
    ><i data-lucide="wifi"></i
  ></button>
  <button class="tray-item" type="button" aria-label="Notifications, 3 new" data-badge="3"
    ><i data-lucide="bell"></i
  ></button>
  <time class="tray-clock"></time>
  <button class="tray-show-desktop" type="button" aria-label="Show desktop"></button>
</div>
```
