---
name: Site Header
type: BLK
why: A marketing page header is pure layout - flexbox + a container query replace any JS show/hide of the nav.
when: Top of a marketing/landing page - for the doc site's own chrome use <site-header> instead.
where: dist/components/site-header/site-header.css
supportedStates: default
---

# Pattern: Site Header

## Native basis
`<header>` landmark with `<nav>`; no script. The nav collapses via a
container query (`@container`), so the block adapts to the width it is
placed in, not the viewport. Dropdowns compose the
[navigation-menu](../navigation-menu/component-skill.md) component: trigger
buttons wired with `popovertarget` and `popover` panels - the Popover API
handles open/close, Escape, and light dismiss natively.

---

## Native Web APIs
- [`<header>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/header) - banner landmark
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - navigation landmark with `aria-label`
- [`position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky_positioning) - opt-in sticky header, no scroll JS
- [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - width-aware nav collapse
- [`popovertarget` / `popover`](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - declarative dropdown triggers, zero JS
- [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - panels place below their trigger (from navigation-menu)
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus rings

---

## Structure

```html
<header class="mk-header">
  <div class="mk-header-inner">
    <a href="#" class="mk-header-brand">
      <i data-lucide="zap"></i>
      <span class="mk-header-name">Acme Inc.</span>
    </a>
    <nav class="mk-header-nav" aria-label="Main">
      <ul class="nav-menu-list">
        <li class="nav-menu-item">
          <button class="nav-menu-trigger" popovertarget="nav-products">
            Products
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div class="nav-menu-content" id="nav-products" popover>
            <a class="nav-menu-content-link" href="#"><strong>Analytics</strong><p>View your dashboard</p></a>
          </div>
        </li>
        <li class="nav-menu-item"><a class="nav-menu-link" href="#">Pricing</a></li>
      </ul>
    </nav>
    <div class="mk-header-actions">
      <button class="btn" data-variant="ghost" data-size="sm">Login</button>
      <button class="btn" data-size="sm">Get started</button>
    </div>
  </div>
</header>
```

Actions compose the [Button](../button/component-skill.md) component; the nav
composes [Navigation Menu](../navigation-menu/component-skill.md) - its JS
wires the CSS anchor names per trigger→panel pair (no `.nav-menu` wrapper
needed, only `.nav-menu-trigger[popovertarget]` + `.nav-menu-content[popover]`),
so each panel positions under its trigger; unwired panels open at the viewport
origin instead.

---

## Variants

| `data-variant` | Purpose                                        |
|----------------|------------------------------------------------|
| `sticky`       | Header sticks to the top on scroll (opt-in)    |
| `data-variant="floating"` | A blurred pill that floats over the page and stays on top (sticky) |
| `data-variant="overlay"` | Transparent over a hero picture, white text - place it in a positioned wrapper |
| `data-variant="centered"` | The brand in the middle, the nav left, the actions right |
| `data-elevate` | With `data-variant="sticky"`: gains a rule and a shadow once the page scrolls (scroll-driven) |
| `.mk-header-announcement` | An announcement bar above the header row |
| `.mk-header-search` | An inline search field (shown from 48rem) |
| `.mk-header-icon` + `.mk-header-count` | An icon button with a count bubble (cart, inbox) |

---

## ARIA

| Attribute        | Element | Purpose                          |
|------------------|---------|----------------------------------|
| `aria-label`     | `nav`   | Names the navigation region      |
| native `:focus`  | links   | Keyboard traversal, no JS needed |

---

## Notes
- Icons render via lucide (`<i data-lucide="…">` + `lucide.createIcons()`); an inline `<svg>` works identically with zero dependencies.
- `.mk-header-nav` is hidden below a 30rem **container** width - put the header in a wide container to see the links.
- Plain destinations are `.nav-menu-link` anchors; only sections that open a dropdown get a trigger `<button>`.
- Give each `nav-menu-content` id a page-unique prefix (ids are document-global; two headers on one page collide otherwise).
- Narrow (below 40rem of header width): the nav hides and `.mk-header-menu` (a ghost icon Button with `data-sheet-trigger`) opens a Sheet (`<dialog class="sheet" data-side="right">`) holding the navigation - `.mk-header-sheet-label` group labels, `.mk-header-sheet-nav` lists of 44px tap targets (links carry `data-sheet-close`), `.mk-header-sheet-actions` for the buttons. Secondary actions marked `.mk-header-wide` (Login) hide on narrow widths.
