<!-- The individual examples of Site Header: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Site Header (sticky)"
<header class="mk-header" data-variant="sticky">
  <div class="mk-header-inner">
    <a href="#" class="mk-header-brand"
      ><svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg
      ><span class="mk-header-name">Acme Inc.</span></a
    >
    <nav class="mk-header-nav" aria-label="Main">
      <ul class="nav-menu-list">
        <li class="nav-menu-item">
          <button class="nav-menu-trigger" popovertarget="mk-sh-sticky-products"
            >Products
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="m6 9 6 6 6-6" /></svg
          ></button>
          <div class="nav-menu-content" id="mk-sh-sticky-products" popover="">
            <a class="nav-menu-content-link" href="#"
              ><strong>Analytics</strong><p>View your dashboard and metrics</p></a
            >
            <a class="nav-menu-content-link" href="#"
              ><strong>Automation</strong><p>Build workflows and integrations</p></a
            >
          </div>
        </li>
        <li class="nav-menu-item"><a class="nav-menu-link" href="#">Pricing</a></li>
      </ul>
    </nav>
    <div class="mk-header-actions"
      ><button type="button" class="btn" data-size="sm">Get started</button
      ><button
        type="button"
        class="btn mk-header-menu"
        data-variant="ghost"
        data-size="icon"
        data-sheet-trigger="mk-sh-sticky-menu"
        aria-haspopup="dialog"
        aria-label="Open menu"
        ><svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="18" y2="18" /></svg></button
    ></div>
  </div>

  <dialog
    id="mk-sh-sticky-menu"
    class="sheet"
    data-side="right"
    role="dialog"
    aria-modal="true"
    aria-labelledby="mk-sh-sticky-menu-title"
  >
    <div class="sheet-content">
      <div class="sheet-header">
        <h2 class="sheet-title" id="mk-sh-sticky-menu-title">Acme Inc.</h2>
      </div>
      <div class="sheet-body">
        <p class="mk-header-sheet-label">Products</p>
        <ul class="mk-header-sheet-nav">
          <li
            ><a href="#" data-sheet-close="">Analytics <small>Dashboards</small></a></li
          >
          <li
            ><a href="#" data-sheet-close="">Automation <small>Workflows</small></a></li
          >
        </ul>
        <p class="mk-header-sheet-label">Company</p>
        <ul class="mk-header-sheet-nav">
          <li><a href="#" data-sheet-close="">Pricing</a></li>
        </ul>
      </div>
      <div class="sheet-footer mk-header-sheet-actions">
        <button type="button" class="btn" data-variant="outline">Login</button>
        <button type="button" class="btn">Get started</button>
      </div>
    </div>
  </dialog>
</header>
```

```html example part label="Site Header (floating)"
<header class="mk-header" data-variant="floating">
  <div class="mk-header-inner">
    <a href="#" class="mk-header-brand"
      ><svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg
      ><span class="mk-header-name">Acme Inc.</span></a
    >
    <nav class="mk-header-nav" aria-label="Main">
      <ul class="nav-menu-list">
        <li class="nav-menu-item"><a class="nav-menu-link" href="#" aria-current="page">Product</a></li>
        <li class="nav-menu-item"><a class="nav-menu-link" href="#">Pricing</a></li>
        <li class="nav-menu-item"><a class="nav-menu-link" href="#">Customers</a></li>
        <li class="nav-menu-item"><a class="nav-menu-link" href="#">Blog</a></li>
      </ul>
    </nav>
    <div class="mk-header-actions">
      <a class="btn mk-header-wide" data-variant="ghost" data-size="sm" href="#">Log in</a>
      <a class="btn" data-size="sm" href="#">Get started</a>
      <button
        type="button"
        class="btn mk-header-menu"
        data-variant="ghost"
        data-size="icon"
        data-sheet-trigger="hdr-float-menu"
        aria-haspopup="dialog"
        aria-label="Open menu"
        ><svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="18" y2="18" /></svg
      ></button>
    </div>
  </div>
  <dialog
    id="hdr-float-menu"
    class="sheet"
    data-side="right"
    role="dialog"
    aria-modal="true"
    aria-labelledby="hdr-float-menu-title"
  >
    <div class="sheet-content">
      <div class="sheet-header"><h2 class="sheet-title" id="hdr-float-menu-title">Acme Inc.</h2></div>
      <div class="sheet-body">
        <ul class="mk-header-sheet-nav">
          <li><a href="#" data-sheet-close="">Product</a></li>
          <li><a href="#" data-sheet-close="">Pricing</a></li>
          <li><a href="#" data-sheet-close="">Customers</a></li>
          <li><a href="#" data-sheet-close="">Blog</a></li>
        </ul>
      </div>
      <div class="sheet-footer mk-header-sheet-actions">
        <a class="btn" data-variant="outline" href="#">Log in</a>
        <a class="btn" href="#">Get started</a>
      </div>
    </div>
  </dialog>
</header>
```

```html example part label="Site Header (overlay)"
<header class="mk-header" data-variant="overlay">
  <div class="mk-header-inner">
    <a href="#" class="mk-header-brand"
      ><svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg
      ><span class="mk-header-name">Acme Inc.</span></a
    >
    <nav class="mk-header-nav" aria-label="Main">
      <ul class="nav-menu-list">
        <li class="nav-menu-item"><a class="nav-menu-link" href="#" aria-current="page">Journeys</a></li>
        <li class="nav-menu-item"><a class="nav-menu-link" href="#">Stories</a></li>
        <li class="nav-menu-item"><a class="nav-menu-link" href="#">About</a></li>
      </ul>
    </nav>
    <div class="mk-header-actions">
      <a class="btn" data-variant="secondary" data-size="sm" href="#">Book a trip</a>
      <button
        type="button"
        class="btn mk-header-menu"
        data-variant="ghost"
        data-size="icon"
        data-sheet-trigger="hdr-over-menu"
        aria-haspopup="dialog"
        aria-label="Open menu"
        ><svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="18" y2="18" /></svg
      ></button>
    </div>
  </div>
  <dialog
    id="hdr-over-menu"
    class="sheet"
    data-side="right"
    role="dialog"
    aria-modal="true"
    aria-labelledby="hdr-over-menu-title"
  >
    <div class="sheet-content">
      <div class="sheet-header"><h2 class="sheet-title" id="hdr-over-menu-title">Acme Inc.</h2></div>
      <div class="sheet-body">
        <ul class="mk-header-sheet-nav">
          <li><a href="#" data-sheet-close="">Journeys</a></li>
          <li><a href="#" data-sheet-close="">Stories</a></li>
          <li><a href="#" data-sheet-close="">About</a></li>
        </ul>
      </div>
      <div class="sheet-footer mk-header-sheet-actions">
        <a class="btn" data-variant="outline" href="#">Log in</a>
        <a class="btn" href="#">Get started</a>
      </div>
    </div>
  </dialog>
</header>
```
