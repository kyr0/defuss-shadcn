<!-- The individual examples of Dock: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Dock 2"
<nav class="dock" aria-label="Main">
  <label class="dock-item"
    ><input type="radio" name="d1" checked /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="house"></i></span
    ><span class="dock-label">Home</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="d1" /><span class="dock-icon" aria-hidden="true"><i data-lucide="search"></i></span
    ><span class="dock-label">Search</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="d1" /><span class="dock-icon" aria-hidden="true"><i data-lucide="inbox"></i></span
    ><span class="dock-label">Inbox</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="d1" /><span class="dock-icon" aria-hidden="true"><i data-lucide="user"></i></span
    ><span class="dock-label">Profile</span></label
  >
</nav>
```

```html example part label="Dock (xs)"
<nav
  class="dock"
  data-position="static"
  data-size="xs"
  style="border: 1px solid var(--border); border-radius: var(--radius-lg)"
  aria-label="Main"
>
  <label class="dock-item"
    ><input type="radio" name="size-xs" checked /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="house"></i></span
    ><span class="dock-label">Home</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-xs" /><span class="dock-icon" aria-hidden="true"><i data-lucide="search"></i></span
    ><span class="dock-label">Search</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-xs" /><span class="dock-icon" aria-hidden="true"><i data-lucide="inbox"></i></span
    ><span class="dock-label">Inbox</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-xs" /><span class="dock-icon" aria-hidden="true"><i data-lucide="user"></i></span
    ><span class="dock-label">Profile</span></label
  >
</nav>
```

```html example part label="Dock (sm)"
<nav
  class="dock"
  data-position="static"
  data-size="sm"
  style="border: 1px solid var(--border); border-radius: var(--radius-lg)"
  aria-label="Main"
>
  <label class="dock-item"
    ><input type="radio" name="size-sm" checked /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="house"></i></span
    ><span class="dock-label">Home</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-sm" /><span class="dock-icon" aria-hidden="true"><i data-lucide="search"></i></span
    ><span class="dock-label">Search</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-sm" /><span class="dock-icon" aria-hidden="true"><i data-lucide="inbox"></i></span
    ><span class="dock-label">Inbox</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-sm" /><span class="dock-icon" aria-hidden="true"><i data-lucide="user"></i></span
    ><span class="dock-label">Profile</span></label
  >
</nav>
```

```html example part label="Dock (md)"
<nav
  class="dock"
  data-position="static"
  data-size="md"
  style="border: 1px solid var(--border); border-radius: var(--radius-lg)"
  aria-label="Main"
>
  <label class="dock-item"
    ><input type="radio" name="size-md" checked /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="house"></i></span
    ><span class="dock-label">Home</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-md" /><span class="dock-icon" aria-hidden="true"><i data-lucide="search"></i></span
    ><span class="dock-label">Search</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-md" /><span class="dock-icon" aria-hidden="true"><i data-lucide="inbox"></i></span
    ><span class="dock-label">Inbox</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-md" /><span class="dock-icon" aria-hidden="true"><i data-lucide="user"></i></span
    ><span class="dock-label">Profile</span></label
  >
</nav>
```

```html example part label="Dock (lg)"
<nav class="dock" data-position="static" data-indicator="pill" data-size="lg" aria-label="Main">
  <label class="dock-item"
    ><input type="radio" name="emoji" checked /><span class="dock-icon" aria-hidden="true">🏠</span
    ><span class="dock-label">Home</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="emoji" /><span class="dock-icon" aria-hidden="true">🔥</span
    ><span class="dock-label">Trending</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="emoji" /><span class="dock-icon" aria-hidden="true"
      >🎵<span class="dock-dot"></span></span
    ><span class="dock-label">Music</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="emoji" /><span class="dock-icon" aria-hidden="true">⭐</span
    ><span class="dock-label">Favorites</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="emoji" /><span class="dock-icon" aria-hidden="true">🙂</span
    ><span class="dock-label">Me</span></label
  >
</nav>
```

```html example part label="Dock (xl)"
<nav
  class="dock"
  data-position="static"
  data-size="xl"
  style="border: 1px solid var(--border); border-radius: var(--radius-lg)"
  aria-label="Main"
>
  <label class="dock-item"
    ><input type="radio" name="size-xl" checked /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="house"></i></span
    ><span class="dock-label">Home</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-xl" /><span class="dock-icon" aria-hidden="true"><i data-lucide="search"></i></span
    ><span class="dock-label">Search</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-xl" /><span class="dock-icon" aria-hidden="true"><i data-lucide="inbox"></i></span
    ><span class="dock-label">Inbox</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="size-xl" /><span class="dock-icon" aria-hidden="true"><i data-lucide="user"></i></span
    ><span class="dock-label">Profile</span></label
  >
</nav>
```

```html example part label="Dock (muted)"
<nav class="dock" data-position="static" data-variant="muted" style="border-radius: var(--radius-lg)" aria-label="Main">
  <label class="dock-item"
    ><input type="radio" name="color-muted" checked /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="house"></i></span
    ><span class="dock-label">Home</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-muted" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="search"></i></span
    ><span class="dock-label">Search</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-muted" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="inbox"></i></span
    ><span class="dock-label">Inbox</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-muted" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="user"></i></span
    ><span class="dock-label">Profile</span></label
  >
</nav>
```

```html example part label="Dock (primary)"
<nav
  class="dock"
  data-position="static"
  data-variant="primary"
  style="border-radius: var(--radius-lg)"
  aria-label="Main"
>
  <label class="dock-item"
    ><input type="radio" name="color-primary" checked /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="house"></i></span
    ><span class="dock-label">Home</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-primary" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="search"></i></span
    ><span class="dock-label">Search</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-primary" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="inbox"></i></span
    ><span class="dock-label">Inbox</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-primary" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="user"></i></span
    ><span class="dock-label">Profile</span></label
  >
</nav>
```

```html example part label="Dock (neutral)"
<nav
  class="dock"
  data-position="static"
  data-variant="neutral"
  style="border-radius: var(--radius-lg)"
  aria-label="Main"
>
  <label class="dock-item"
    ><input type="radio" name="color-neutral" checked /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="house"></i></span
    ><span class="dock-label">Home</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-neutral" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="search"></i></span
    ><span class="dock-label">Search</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-neutral" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="inbox"></i></span
    ><span class="dock-label">Inbox</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-neutral" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="user"></i></span
    ><span class="dock-label">Profile</span></label
  >
</nav>
```

```html example part label="Dock (glass)"
<nav class="dock" data-attach="container" data-variant="glass" aria-label="Main">
  <label class="dock-item"
    ><input type="radio" name="color-glass" checked /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="house"></i></span
    ><span class="dock-label">Home</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-glass" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="search"></i></span
    ><span class="dock-label">Search</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-glass" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="inbox"></i></span
    ><span class="dock-label">Inbox</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="color-glass" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="user"></i></span
    ><span class="dock-label">Profile</span></label
  >
</nav>
```

```html example part label="Dock (floating)"
<nav class="dock" data-variant="floating" data-attach="container" aria-label="Main">
  <label class="dock-item"
    ><input type="radio" name="float" checked /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="house"></i></span
    ><span class="dock-label">Home</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="float" /><span class="dock-icon" aria-hidden="true"><i data-lucide="calendar"></i></span
    ><span class="dock-label">Plan</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="float" /><span class="dock-icon" aria-hidden="true"
      ><i data-lucide="chart-column"></i></span
    ><span class="dock-label">Stats</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="float" /><span class="dock-icon" aria-hidden="true"><i data-lucide="settings"></i></span
    ><span class="dock-label">Settings</span></label
  >
</nav>
```

```html example part label="Dock (floating, lg)"
<nav
  class="dock"
  data-position="static"
  data-variant="floating"
  data-effect="magnify"
  data-labels="none"
  data-size="lg"
  aria-label="Apps"
>
  <label class="dock-item"
    ><input type="radio" name="mag" /><span class="dock-icon" aria-hidden="true">📁</span
    ><span class="dock-label">Files</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="mag" checked /><span class="dock-icon" aria-hidden="true">🌐</span
    ><span class="dock-label">Browser</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="mag" /><span class="dock-icon" aria-hidden="true"
      >✉️<span class="dock-badge">4</span></span
    ><span class="dock-label">Mail</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="mag" /><span class="dock-icon" aria-hidden="true">🎵</span
    ><span class="dock-label">Music</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="mag" /><span class="dock-icon" aria-hidden="true">📷</span
    ><span class="dock-label">Photos</span></label
  >
  <label class="dock-item"
    ><input type="radio" name="mag" /><span class="dock-icon" aria-hidden="true">⚙️</span
    ><span class="dock-label">Settings</span></label
  >
</nav>
```
