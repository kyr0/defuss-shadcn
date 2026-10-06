---
name: Menubar
type: MOL
section: navigation
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

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type MenubarState = 'default' | 'open'</code> - `setState(name, config)` takes the config of the state it names (`MenubarStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Every menu closed. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>menu?</code></td><td><code>string \| null</code></td><td>reported by getState(): null - no menu is open</td></tr></table> |
| `open` | One menu open. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>menu?</code></td><td><code>string \| number \| null</code></td><td>the menu to open: its id (its trigger's data-dropdown-trigger), or its index; default the first. getState() reports the open menu's id</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends MenubarState&gt;(name: S, config?: MenubarStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MenubarStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: MenubarState; config: MenubarStateConfigs[MenubarState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: MenubarState; config: MenubarStateConfigs[MenubarState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: MenubarState; config: MenubarStateConfigs[MenubarState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: MenubarState; config: MenubarStateConfigs[MenubarState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: MenubarState; config: MenubarStateConfigs[MenubarState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.menubarApi.setState&lt;S extends MenubarState&gt;(el: HTMLElement, name: S, config?: MenubarStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MenubarStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.menubarApi.getState(el: HTMLElement): { name: MenubarState; config: MenubarStateConfigs[MenubarState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: MenubarState; config: MenubarStateConfigs[MenubarState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.menubarApi.render(state: { name: MenubarState; config: MenubarStateConfigs[MenubarState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: MenubarState; config: MenubarStateConfigs[MenubarState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.menubarApi.store(el: HTMLElement): Store&lt;{ name: MenubarState; config: MenubarStateConfigs[MenubarState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: MenubarState; config: MenubarStateConfigs[MenubarState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.menubarApi.commit&lt;S extends MenubarState&gt;(el: HTMLElement, name: S, config?: MenubarStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>MenubarStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.menubarStates: MenubarState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>. |

## Notes

- Keep each menu right after its trigger inside `.menubar` - the bar's
  keyboard handling listens there.
- Load `dropdown.js` with `menubar.js` (per-component installs); `all.js`
  carries both.
- Checkbox and radio items toggle on click and keep the menu open; they fire
  `dropdown:select` (`detail: { item, value, checked }`).
