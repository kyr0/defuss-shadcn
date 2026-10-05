---
name: Menubar
type: MOL
why: A row of menu triggers that each open a dropdown menu (Popover API, anchor-positioned, submenus any depth); menubar.js adds the APG menubar keyboard model - one tab stop, arrows between menus, hover switching while one is open.
when: The persistent command bar of an app-like page - File / Edit / View / Help. One menu of actions takes dropdown; site navigation takes navbar or navigation-menu.
where: dist/components/menubar/menubar.css + dist/components/menubar/menubar.js (with dist/components/dropdown/dropdown.css + dropdown.js)
supportedStates: default, open
---

# Menubar

## Native basis

A `<div class="menubar" role="menubar">` of `<button class="menubar-trigger">`
triggers, each with `data-dropdown-trigger="menu-id"` and followed by its
`<div class="dropdown-content" role="menu" popover>` - the dropdown menu, with
everything it supports: groups, labels, shortcuts, checkbox and radio items,
disabled items and nested submenus. The menus sit inside the menubar element
so their keys reach it. After shadcn/ui's Menubar (Base UI / Radix).

## Native Web APIs

- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - each menu is a `popover="auto"`: opening one closes the other, submenus nest, light dismiss and Escape are native
- [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - menus under their trigger, submenus beside their item, flipping at the viewport edge
- [WAI-ARIA menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) - `role="menubar"` / `menuitem` / `menu` / `menuitemcheckbox` / `menuitemradio`, roving tabindex
- [`:dir()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:dir) - menus and submenus open the other way in RTL; the arrow keys follow
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

## Structure

```html
<div class="menubar" role="menubar" aria-label="Application">
  <button class="menubar-trigger" data-dropdown-trigger="mb-file">File</button>
  <div class="dropdown-content" id="mb-file" role="menu" popover aria-label="File">
    <button class="dropdown-item" role="menuitem" tabindex="-1">New Tab <span class="dropdown-shortcut">⌘T</span></button>
    <div class="dropdown-sub">
      <button class="dropdown-item dropdown-sub-trigger" role="menuitem" tabindex="-1">Share</button>
      <div class="dropdown-content dropdown-sub-content" role="menu" popover aria-label="Share">
        <button class="dropdown-item" role="menuitem" tabindex="-1">Email link</button>
      </div>
    </div>
    <div class="dropdown-separator" role="separator"></div>
    <button class="dropdown-item" role="menuitem" tabindex="-1" disabled>Print… <span class="dropdown-shortcut">⌘P</span></button>
  </div>

  <button class="menubar-trigger" data-dropdown-trigger="mb-view">View</button>
  <div class="dropdown-content" id="mb-view" role="menu" popover aria-label="View">
    <button class="dropdown-item dropdown-check" role="menuitemcheckbox" aria-checked="true" tabindex="-1">Show Bookmarks Bar</button>
  </div>
</div>
```

Everything inside a menu - items, groups, labels, shortcuts, checkbox /
radio items, `data-inset`, `data-variant="destructive"`, submenus - is the
dropdown's markup; see its skill.

## Variants (`data-variant` on `.menubar`)

| Value | Look |
|-------|------|
| *(none)* | Bordered bar on the background, a hairline shadow |
| `muted` | A `--muted` bar without border |
| `ghost` | Just the triggers - for a title bar or toolbar that already has a surface |

## Sizes (`data-size` on `.menubar`)

`sm` (1.625rem triggers) · *(default)* 1.875rem · `lg` (2.25rem). The menus
keep their own `data-size`.

## Keyboard

| Key | Where | Action |
|-----|-------|--------|
| Tab | bar | One stop: the last used trigger |
| ← / → | trigger | Previous / next trigger (wraps) |
| Home / End | trigger | First / last trigger |
| ↓ / Enter / Space | trigger | Open its menu, first item focused |
| ↑ | trigger | Open its menu, last item focused |
| ← / → | open menu | Previous / next menu (→ on a submenu item opens the submenu; ← in a submenu closes it first) |
| Esc | menu | Close it (a submenu: just that one), focus back to its trigger |
| Hover | trigger | While any menu is open, switches to the hovered trigger's menu |

## ARIA

| Element | Attribute |
|---------|-----------|
| `.menubar` | `role="menubar"` (added if missing), `aria-label` |
| `.menubar-trigger` | `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` (added by the scripts), roving `tabindex` |
| menus | `role="menu"` + `aria-label` |
| items | `menuitem` / `menuitemcheckbox` / `menuitemradio` with `aria-checked`, `tabindex="-1"`, `disabled` or `aria-disabled="true"` |

## States

| State | Meaning |
|-------|---------|
| `default` | Every menu closed |
| `open` | One menu open - `{ menu: 'menu-id' }` or `{ menu: index }` (default the first) |

```js
const bar = document.querySelector('.menubar');
bar.api.setState('open', { menu: 'mb-view' });
bar.api.getState(); // { name: 'open', config: { menu: 'mb-view' } }
```

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.menubarApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.menubarStates` = `default`, `open`.

## Notes

- Keep each menu right after its trigger inside `.menubar` - the bar's
  keyboard handling listens there.
- Load `dropdown.js` with `menubar.js` (per-component installs); `all.js`
  carries both.
- Checkbox and radio items toggle on click and keep the menu open; they fire
  `dropdown:select` (`detail: { item, value, checked }`).
