<!-- The individual examples of Button: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Button"
<button class="btn"><span aria-hidden="true">🚀</span> Launch</button>
```

```html example part label="Button (xs)"
<button class="btn" data-size="xs">Action</button>
```

```html example part label="Button (sm)"
<button class="btn" data-size="sm">Run stagger</button>
```

```html example part label="Button (lg)"
<button class="btn" data-size="lg">Action</button>
```

```html example part label="Button (icon-sm)"
<button class="btn" data-size="icon-sm" type="submit" aria-label="Send"><i data-lucide="arrow-up"></i></button>
```

```html example part label="Button (icon-sm, disabled)"
<button class="btn" data-size="icon-sm" type="submit" data-send="" aria-label="Send" disabled
  ><i data-lucide="arrow-up"></i
></button>
```

```html example part label="Button (default)"
<button class="btn" data-variant="default">Default</button>
```

```html example part label="Button (default, disabled)"
<button class="btn" data-variant="default" disabled aria-busy="true">
  <svg
    class="spinner"
    data-size="xs"
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
  Loading…
</button>
```

```html example part label="Button (default, sm)"
<button class="btn" data-variant="default" data-size="sm">Read more</button>
```

```html example part label="Button (secondary)"
<button class="btn" data-variant="secondary">Secondary</button>
```

```html example part label="Button (secondary, disabled)"
<button class="btn" data-variant="secondary" disabled>Secondary</button>
```

```html example part label="Button (secondary, xs)"
<button
  class="btn"
  data-variant="secondary"
  data-size="xs"
  type="button"
  data-toast="All apps"
  data-toast-desc="Every app is pinned already."
  >All apps <i data-lucide="chevron-right"></i
></button>
```

```html example part label="Button (secondary, sm)"
<button class="btn" data-variant="secondary" data-size="sm">Join</button>
```

```html example part label="Button (secondary, lg)"
<a class="btn" data-variant="secondary" data-size="lg" href="#">Get the app</a>
```

```html example part label="Button (outline)"
<button class="btn" data-variant="outline">Outline</button>
```

```html example part label="Button (outline, disabled)"
<button class="btn" data-variant="outline" disabled>Outline</button>
```

```html example part label="Button (outline, xs)"
<button class="btn" data-variant="outline" data-size="xs">Extra Small</button>
```

```html example part label="Button (outline, sm)"
<button class="btn" data-variant="outline" data-size="sm">Small</button>
```

```html example part label="Button (outline, sm, disabled)"
<button class="btn" data-variant="outline" data-size="sm" type="button" id="ed-store-restore" disabled
  ><i data-lucide="history"></i> Restore</button
>
```

```html example part label="Button (outline, md)"
<button class="btn" data-variant="outline" data-size="md">Medium</button>
```

```html example part label="Button (outline, lg)"
<button class="btn" data-variant="outline" data-size="lg">Large</button>
```

```html example part label="Button (outline, xl)"
<button class="btn" data-variant="outline" data-size="xl">Extra Large</button>
```

```html example part label="Button (outline, icon)"
<button class="btn" data-variant="outline" data-size="icon" aria-label="Settings">
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
    />
    <circle cx="12" cy="12" r="3" />
  </svg>
</button>
```

```html example part label="Button (outline, icon-xs)"
<button class="btn" data-variant="outline" data-size="icon-xs" aria-label="Settings extra small">
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
    />
    <circle cx="12" cy="12" r="3" />
  </svg>
</button>
```

```html example part label="Button (outline, icon-sm)"
<button class="btn" data-variant="outline" data-size="icon-sm" aria-label="Settings small">
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
    />
    <circle cx="12" cy="12" r="3" />
  </svg>
</button>
```

```html example part label="Button (outline, icon-lg)"
<button class="btn" data-variant="outline" data-size="icon-lg" aria-label="Settings large">
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
    />
    <circle cx="12" cy="12" r="3" />
  </svg>
</button>
```

```html example part label="Button (outline, icon-xl)"
<button class="btn" data-variant="outline" data-size="icon-xl" aria-label="Settings extra large">
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
    />
    <circle cx="12" cy="12" r="3" />
  </svg>
</button>
```

```html example part label="Button (ghost)"
<button class="btn" data-variant="ghost">Ghost</button>
```

```html example part label="Button (ghost, xs)"
<button type="button" class="btn" data-variant="ghost" data-size="xs" aria-label="Like (24)"
  ><i data-lucide="thumbs-up"></i> 24</button
>
```

```html example part label="Button (ghost, sm)"
<button class="btn" data-variant="ghost" data-size="sm"><i data-lucide="link-2"></i> Link </button>
```

```html example part label="Button (ghost, lg)"
<a class="btn" data-variant="ghost" data-size="lg" href="#"
  >Watch the demo
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" /></svg
></a>
```

```html example part label="Button (ghost, icon)"
<button class="btn" data-variant="ghost" data-size="icon" aria-label="Like"
  ><span aria-hidden="true" style="font-size: 1.125rem">👍</span></button
>
```

```html example part label="Button (ghost, icon-xs)"
<button class="btn" data-variant="ghost" data-size="icon-xs" type="button" aria-label="Copy"
  ><i data-lucide="copy"></i
></button>
```

```html example part label="Button (ghost, icon-sm)"
<button class="btn" data-variant="ghost" data-size="icon-sm" aria-label="Download Q3 report.pdf"
  ><i data-lucide="download"></i
></button>
```

```html example part label="Button (ghost, icon-sm, disabled)"
<button class="btn" data-variant="ghost" data-size="icon-sm" type="button" data-br="back" aria-label="Back" disabled
  ><i data-lucide="arrow-left"></i
></button>
```

```html example part label="Button (destructive)"
<button class="btn" data-variant="destructive">Destructive</button>
```

```html example part label="Button (link)"
<button class="btn px-4" data-variant="link">Link</button>
```

```html example part label="Button (link, sm)"
<button
  class="btn"
  data-variant="link"
  data-size="sm"
  type="button"
  popovertarget="bio-card"
  style="padding: 0; height: auto"
  >Hannah Lee</button
>
```

```html example part label="Button (link, default)"
<a href="#" class="btn mk-stat-link" data-variant="link" data-size="default">Our clients</a>
```

```html example part label="Button (soft)"
<button class="btn" data-variant="soft">Soft</button>
```

```html example part label="Button (dashed)"
<button class="btn" data-variant="dashed"><i data-lucide="plus"></i> Add item</button>
```
