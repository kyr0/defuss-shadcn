---
name: Navbar
type: ORG
section: navigation
why: A <nav> app bar with start / center / end regions; the responsive menu is ONE popover shown inline on wide screens and opened by a toggle on narrow ones - no JavaScript.
when: The top bar of an app or site - brand, primary links, search, account menu. For a marketing page header block use site-header; for mega-menus use navigation-menu.
where: dist/components/navbar/navbar.css
supportedStates: default
---

# Pattern: Navbar

## Native basis

A `<nav>` (or `<header>` holding one) with three flex regions. Submenus are
`<details>`; the responsive menu is a `popover` element opened by a
`popovertarget` button. CSS-only.

## Native Web APIs

- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - the navigation landmark (name it with `aria-label`)
- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - the collapsed menu: light dismiss, Escape, focus return
- [`anchor-scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/anchor-scope) + [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - the menu drops under its own toggle, many navbars per page
- [`<details>` / `<summary>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - submenus (`name="…"` = one open at a time)
- [`aria-current="page"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the active link
- [`backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) - the glass variant

---

## Structure

```html
<nav class="navbar" aria-label="Main">
  <div class="navbar-start">
    <a class="navbar-brand" href="/"><img src="logo.svg" alt=""> Acme</a>
  </div>
  <div class="navbar-center">
    <ul class="navbar-menu">
      <li><a href="/docs" aria-current="page">Docs</a></li>
      <li>
        <details name="nav">
          <summary>Products</summary>
          <ul>
            <li><a href="/cloud">Cloud</a></li>
            <li><a href="/edge">Edge</a></li>
          </ul>
        </details>
      </li>
    </ul>
  </div>
  <div class="navbar-end">
    <button class="btn" data-variant="ghost" data-size="icon" aria-label="Search">…</button>
  </div>
</nav>
```

- `.navbar-start` and `.navbar-end` share the free space equally, so
  `.navbar-center` is centered on the bar; leave a region out if unused.
- Any component fits inside: buttons, `input`, `dropdown`, `avatar`,
  `indicator` (a cart count), `badge`.

### Responsive collapse

```html
<nav class="navbar" data-collapse="lg" aria-label="Main">
  <div class="navbar-start">
    <button class="btn navbar-toggle" data-variant="ghost" data-size="icon" popovertarget="main-menu" aria-label="Menu">☰</button>
    <a class="navbar-brand" href="/">Acme</a>
  </div>
  <div class="navbar-center">
    <div class="navbar-collapse" id="main-menu" popover>
      <ul class="navbar-menu">…</ul>
    </div>
  </div>
  <div class="navbar-end">…</div>
</nav>
```

`data-collapse` = `sm` / `md` / `lg` (collapse below 40 / 48 / 64rem) or
`always`. Above the breakpoint the `.navbar-collapse` popover renders inline
and the `.navbar-toggle` is hidden; below it the toggle shows and opens the
same element as a popover anchored under it (the menu turns vertical,
submenus indent). One menu in the markup - no duplicated mobile list.

---

## Variants (`data-variant`)

| Value | Look |
| --- | --- |
| *(none)* | Page background, bottom border |
| `muted` | `--muted` bar |
| `primary` | `--primary` bar, `--primary-foreground` text |
| `neutral` | A charcoal bar (the inverse colors softened to 78%) |
| `ghost` | Transparent, no border |
| `glass` | Translucent + `backdrop-filter` blur - over images or scrolling content |
| `floating` | Rounded, bordered all round, a shadow - a pill inside a padded container |

Menu links take the bar's text color (a muted mix at rest, full on hover,
a tint for `aria-current="page"`); `ghost` / `link` buttons on `primary` /
`neutral` bars do too.

## Sizes (`data-size`)

`sm` (3rem) · `md` (3.5rem, default) · `lg` (4.5rem) - the minimum height.

## Position (`data-position`)

`sticky` - sticks to the top of its scroll container (`z-index: 40`).

---

## ARIA

| Element | Attribute |
| --- | --- |
| `<nav class="navbar">` | `aria-label="Main"` (a second nav: another name) |
| active link | `aria-current="page"` |
| `.navbar-toggle` | `aria-label="Menu"` - `popovertarget` wires `aria-expanded` natively |
| icon-only buttons | `aria-label` |

## Notes

- Everything is CSS: the popover handles Escape, outside click and focus.
- Submenus in a collapsed menu open in place (indented), not as panels.
- The docs site header is this pattern: brand, toggle, search, actions.
