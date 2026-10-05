---
name: Navigation Menu
type: ATM
why: Primary site/app menu with hover/focus-triggered popover panels.
when: Top-level navigation, optionally with mega-menu panels per item.
where: dist/components/navigation-menu/navigation-menu.css + dist/components/navigation-menu/navigation-menu.js
supportedStates: default, open
---

# Navigation Menu

## Native basis

`<nav>` + `<ul>` for site-level navigation with dropdown panels.

## Native Web APIs

- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - navigation landmark
- [`popover` API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - dropdown panels without JS show/hide
- [`popovertarget`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#popovertarget) - declarative button→popover trigger
- [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - positions dropdown relative to trigger
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - entry animation for popover
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus ring
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - rotates chevron when dropdown is open
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses animations
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - maps dropdown border to system color

---

## Structure

```html
<nav class="nav-menu" aria-label="Main">
  <ul class="nav-menu-list">
    <li class="nav-menu-item"><a class="nav-menu-link" href="#">Home</a></li>
    <li class="nav-menu-item">
      <button class="nav-menu-trigger" popovertarget="nav-dd">
        Products
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="nav-menu-content" id="nav-dd" popover>
        <a class="nav-menu-content-link" href="#">
          <strong>Analytics</strong>
          <p>View your dashboard</p>
        </a>
        <a class="nav-menu-content-link" href="#">
          <strong>Reports</strong>
          <p>Generate custom reports</p>
        </a>
      </div>
    </li>
  </ul>
</nav>
```

---


## Megamenu

A panel can be a whole page of navigation - still one native popover per
trigger:

```html
<div class="nav-menu-content" id="products" data-width="wide" popover>
  <div class="nav-menu-grid" data-columns="3">
    <div class="nav-menu-section">
      <p class="nav-menu-heading">Build</p>
      <a class="nav-menu-content-link" href="…">
        <span class="nav-menu-icon"><svg>…</svg></span>
        <strong>Components</strong>
        <p>Tokens-first UI parts</p>
      </a>
    </div>
    …
    <a class="nav-menu-feature" href="…"><img src="…" alt=""><strong>Case study</strong><p>…</p></a>
    <div class="nav-menu-footer"><span>New: …</span><a href="…">What's new →</a></div>
  </div>
</div>
```

| Part / attribute | Effect |
| --- | --- |
| `data-width="wide"` (panel) | the panel takes the whole `.nav-menu`'s width (anchor-scoped, CSS only) |
| `data-width="full"` (panel) | the panel spans the page; its content stays within 72rem |
| `.nav-menu-grid` | columns: auto-fit (min 12rem) or `data-columns="2"` / `"3"` / `"4"` |
| `.nav-menu-section` + `.nav-menu-heading` | a column with an uppercase heading |
| `.nav-menu-icon` in a `.nav-menu-content-link` | icon │ title over description |
| `.nav-menu-feature` | a promo block (optional image, title, text) |
| `.nav-menu-footer` | a full-width row under the columns |
| `data-orientation="vertical"` (nav) | a side menu - panels fly out to the right, below the trigger when there is no room |
| `data-orientation="responsive"` (nav) | vertical below 48rem, horizontal above; fixed columns collapse to one |

The open trigger stays highlighted; `aria-current="page"` marks the page's
link. Arrowless triggers: leave the chevron svg out. In a `navbar`, put the
`.nav-menu` in `.navbar-center` and use `data-width="full"` panels.

## Density

Set `data-density` on the `.nav-menu` nav. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | top-level item gap 0.125rem |
| `comfortable` | gap 0.25rem - identical to the unsized default |
| `spacious` | gap 0.375rem |

## Sizes

Set `data-size` on the `.nav-menu` nav; links/triggers and the popover rows scale together.

| `data-size` | Link padding | Link font |
|-------------|--------------|-----------|
| `xs` | 0.25rem 0.5rem | 0.75rem |
| `sm` | 0.375rem 0.625rem | 0.8125rem |
| `md` | 0.5rem 0.75rem | 0.875rem |
| *(none)* | 0.5rem 0.75rem | 0.875rem |
| `lg` | 0.625rem 1rem | 1rem |
| `xl` | 0.75rem 1.25rem | 1.125rem |

`md` equals the unsized default.

---
## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `aria-label` | `<nav>` | Accessible name for the navigation |
| `aria-hidden="true"` | chevron `<svg>` | Decorative indicator, hidden from screen readers |

---

## Keyboard

| Key | Action |
|-----|--------|
| `Tab` | Moves focus between nav items |
| `Enter` / `Space` | Opens dropdown (on trigger) |
| `Escape` | Closes dropdown (native popover behavior) |

---

## States

Declared states: `default` (hidden) · `open` (shown via native showPopover()).

```js
document.querySelector('#my-menu').api.setState('open');
document.querySelector('#my-menu').api.getState(); // { name: 'open', config: {} }
```

The api is bound per `.nav-menu-content` element; the registry global is
`df$.shadcn.navigationMenuApi` / `df$.shadcn.navigationMenuStates` (camelCase).

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.navigationMenuApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.navigationMenuStates` = `default`, `open`.

## Notes

- The `popover` API handles open/close - no JS click handlers needed.
- `popovertarget` on the button declaratively toggles the popover. No `togglePopover()` calls.
- CSS anchor positioning aligns the dropdown to its trigger. The JS only sets unique `anchor-name` / `position-anchor` pairs.
- The chevron rotates via `:has(+ .nav-menu-content:popover-open)` - no JS class toggling.
- Icon-only triggers must have `aria-label`.
- Dropdown content typically contains `nav-menu-content-link` items with a title and optional description.
