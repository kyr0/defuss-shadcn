<!-- The individual examples of Navbar: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Navbar (sm)"
<nav class="navbar" data-size="sm" aria-label="Size sm"
  ><div class="navbar-start"
    ><a class="navbar-brand" href="#top"><i data-lucide="hexagon"></i> Size sm</a></div
  ><div class="navbar-end"
    ><button class="btn" data-variant="ghost" data-size="icon" aria-label="Search"
      ><i data-lucide="search"></i></button></div
></nav>
```

```html example part label="Navbar (md)"
<nav class="navbar" data-size="md" aria-label="Size md"
  ><div class="navbar-start"
    ><a class="navbar-brand" href="#top"><i data-lucide="hexagon"></i> Size md</a></div
  ><div class="navbar-end"
    ><button class="btn" data-variant="ghost" data-size="icon" aria-label="Search"
      ><i data-lucide="search"></i></button></div
></nav>
```

```html example part label="Navbar (lg)"
<nav class="navbar" data-size="lg" aria-label="Size lg"
  ><div class="navbar-start"
    ><a class="navbar-brand" href="#top"><i data-lucide="hexagon"></i> Size lg</a></div
  ><div class="navbar-end"
    ><button class="btn" data-variant="ghost" data-size="icon" aria-label="Search"
      ><i data-lucide="search"></i></button></div
></nav>
```

```html example part label="Navbar (muted)"
<nav class="navbar" data-variant="muted" data-collapse="sm" aria-label="muted example">
  <div class="navbar-start"
    ><button
      class="btn navbar-toggle"
      data-variant="ghost"
      data-size="icon"
      popovertarget="nav-color-muted"
      aria-label="Menu"
      ><i data-lucide="menu"></i></button
    ><a class="navbar-brand" href="#top"><i data-lucide="hexagon"></i> Muted</a></div
  >
  <div class="navbar-end">
    <div class="navbar-collapse" id="nav-color-muted" popover="">
      <ul class="navbar-menu"
        ><li><a href="#c0" aria-current="page">Docs</a></li
        ><li><a href="#c0b">Blog</a></li></ul
      >
    </div>
    <button class="btn" data-variant="ghost" data-size="icon" aria-label="Search"><i data-lucide="search"></i></button>
  </div>
</nav>
```

```html example part label="Navbar (primary)"
<nav class="navbar" data-variant="primary" data-collapse="sm" aria-label="primary example">
  <div class="navbar-start"
    ><button
      class="btn navbar-toggle"
      data-variant="ghost"
      data-size="icon"
      popovertarget="nav-color-primary"
      aria-label="Menu"
      ><i data-lucide="menu"></i></button
    ><a class="navbar-brand" href="#top"><i data-lucide="hexagon"></i> Primary</a></div
  >
  <div class="navbar-end">
    <div class="navbar-collapse" id="nav-color-primary" popover="">
      <ul class="navbar-menu"
        ><li><a href="#c1" aria-current="page">Docs</a></li
        ><li><a href="#c1b">Blog</a></li></ul
      >
    </div>
    <button class="btn" data-variant="ghost" data-size="icon" aria-label="Search"><i data-lucide="search"></i></button>
  </div>
</nav>
```

```html example part label="Navbar (neutral)"
<nav class="navbar" data-variant="neutral" data-collapse="sm" aria-label="neutral example">
  <div class="navbar-start"
    ><button
      class="btn navbar-toggle"
      data-variant="ghost"
      data-size="icon"
      popovertarget="nav-color-neutral"
      aria-label="Menu"
      ><i data-lucide="menu"></i></button
    ><a class="navbar-brand" href="#top"><i data-lucide="hexagon"></i> Neutral</a></div
  >
  <div class="navbar-end">
    <div class="navbar-collapse" id="nav-color-neutral" popover="">
      <ul class="navbar-menu"
        ><li><a href="#c2" aria-current="page">Docs</a></li
        ><li><a href="#c2b">Blog</a></li></ul
      >
    </div>
    <button class="btn" data-variant="ghost" data-size="icon" aria-label="Search"><i data-lucide="search"></i></button>
  </div>
</nav>
```

```html example part label="Navbar (ghost)"
<nav class="navbar" data-variant="ghost" data-collapse="sm" aria-label="ghost example">
  <div class="navbar-start"
    ><button
      class="btn navbar-toggle"
      data-variant="ghost"
      data-size="icon"
      popovertarget="nav-color-ghost"
      aria-label="Menu"
      ><i data-lucide="menu"></i></button
    ><a class="navbar-brand" href="#top"><i data-lucide="hexagon"></i> Ghost</a></div
  >
  <div class="navbar-end">
    <div class="navbar-collapse" id="nav-color-ghost" popover="">
      <ul class="navbar-menu"
        ><li><a href="#c3" aria-current="page">Docs</a></li
        ><li><a href="#c3b">Blog</a></li></ul
      >
    </div>
    <button class="btn" data-variant="ghost" data-size="icon" aria-label="Search"><i data-lucide="search"></i></button>
  </div>
</nav>
```

```html example part label="Navbar (glass)"
<nav class="navbar" data-position="sticky" data-variant="glass" aria-label="Sticky example">
  <div class="navbar-start"
    ><a class="navbar-brand" href="#top"><i data-lucide="hexagon"></i> Acme</a></div
  >
  <div class="navbar-end"
    ><button class="btn" data-variant="ghost" data-size="icon" aria-label="Search"><i data-lucide="search"></i></button
  ></div>
</nav>
```

```html example part label="Navbar (floating)"
<nav class="navbar" data-variant="floating" data-collapse="md" aria-label="Floating example">
  <div class="navbar-start"
    ><button
      class="btn navbar-toggle"
      data-variant="ghost"
      data-size="icon"
      popovertarget="nav-floating-menu"
      aria-label="Menu"
      ><i data-lucide="menu"></i></button
    ><a class="navbar-brand" href="#top"><i data-lucide="hexagon"></i> Acme</a></div
  >
  <div class="navbar-center"
    ><div class="navbar-collapse" id="nav-floating-menu" popover="">
      <ul class="navbar-menu"
        ><li><a href="#f1" aria-current="page">Product</a></li
        ><li><a href="#f2">Pricing</a></li
        ><li><a href="#f3">Docs</a></li></ul
      >
    </div></div
  >
  <div class="navbar-end"><button class="btn" data-size="sm">Get started</button></div>
</nav>
```
