---
name: Desktop Manager
type: ATM
section: desktop
why: A multi-select listbox of desktop icons with the classic selection model - click, Ctrl / Cmd, Shift ranges, a rubber band drawn from an empty spot, Ctrl+A, arrows by place - and icons that drag to grid cells; opening, deleting and renaming are events the page answers.
when: The icon surface of a desktop or any spatial file view (a folder window's icon view). For a list with checkboxes use table or virtual-list; for a single pick use radio-group.
where: dist/components/desktop-manager/desktop-manager.css + dist/components/desktop-manager/desktop-manager.js
supportedStates: default, selected
---

# Pattern: Desktop Manager

## Native basis

A `role="listbox"` with `aria-multiselectable="true"` whose options are the
icons (`role="option"`, `aria-selected`). The icons sit on a CSS grid that
fills columns top to bottom; a dragged icon keeps its cell in an inline
`grid-area`. Pointer Events drive the band and the drag for mouse, pen and
touch alike (`touch-action: none` - the surface never scrolls).

## Native Web APIs

- [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) + [`setPointerCapture()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - one path for mouse, pen and touch; a fast band never loses the pointer
- [CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) `grid-auto-flow: column` - icons fill a column, then the next; `grid-area` keeps a dragged icon's cell
- [`getBoundingClientRect()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) - the band selects every icon it touches; arrows go to the nearest icon on screen
- [`contenteditable`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable) - F2 renames in place
- [WAI-ARIA listbox (multi-select)](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) - roving tabindex, `aria-selected`, Shift / Ctrl keys
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - the selection in system Highlight

---

## Structure

```html
<div class="desktop-manager" role="listbox" aria-multiselectable="true" aria-label="Desktop" style="height: 20rem">
  <div class="desktop-icon" role="option" aria-selected="false" data-value="computer">
    <span class="desktop-icon-image"><i data-lucide="monitor"></i></span>
    <span class="desktop-icon-label">Computer</span>
  </div>
  <div class="desktop-icon" role="option" aria-selected="false" data-value="documents">
    <span class="desktop-icon-image"><i data-lucide="folder"></i></span>
    <span class="desktop-icon-label">Documents</span>
  </div>
  <!-- more icons -->
</div>
```

- `.desktop-icon-image` holds any `<svg>`, `<img>` or Lucide `<i>`; the
  label wraps to two lines (all of it while the icon is selected).
- `data-value` names the icon in every event (default: its label).
- Inside a `.window-manager` the surface fills the area under the windows.
- A dragged icon gets `style="grid-area: row / col"`; `arrange()` removes
  them.

## Variants

| Attribute | Effect |
|-----------|--------|
| `data-size="sm"` / `"lg"` | Smaller / larger icons and cells (default: 2.5rem icons in 5.75rem cells) |
| `data-on-wallpaper` | White labels with a shadow - for a picture behind the icons |
| `--desktop-wallpaper` | A background (image, gradient) for the surface |
| `--desktop-icon-size` / `--desktop-icon-cell-w` / `--desktop-icon-cell-h` | The icon and its cell |

## Interaction

| Input | Effect |
|-------|--------|
| Click | Select that icon only |
| Ctrl / Cmd + click | Add or remove it |
| Shift + click | Select the range from the last clicked icon (icon order) |
| Press on an empty spot and drag | The rubber band: every icon it touches is selected while it is drawn; Ctrl / Cmd keeps the earlier selection |
| Click on an empty spot | Clear the selection |
| Drag a selected icon | Moves the whole selection; each lands on the grid cell under it (a taken one: the next free cell) |
| Double click | `desktop-open` with that icon |
| Arrows | The nearest icon in that direction on screen; Shift extends the range, Ctrl / Cmd moves without selecting |
| Space | Select the focused icon (Ctrl / Cmd + Space toggles it) |
| Ctrl / Cmd + A | Select every icon |
| Enter | `desktop-open` with every selected icon |
| Delete | `desktop-delete` with every selected icon |
| F2 | Rename the focused icon in place: Enter keeps it (`desktop-rename`), Escape or leaving puts the old label back |
| Escape | Clear the selection |

## States

| State | Meaning |
|-------|---------|
| `default` | No icon selected |
| `selected` | `{ values }` - the icons named are selected, every other is not |

```js
const desk = document.querySelector('#icons');
desk.api.setState('selected', { values: ['computer', 'trash'] });
desk.api.getState(); // → { name: 'selected', config: { values: ['computer', 'trash'] } }
desk.addEventListener('desktop-open', (e) => console.log(e.detail.values));
```

The selection is the truth: clicks, the band and keys change it without
setState and `getState()` reads it back. `render(state)` returns the
authored surface with each icon's `aria-selected`; the roving `tabindex`
and dragged places are runtime.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type DesktopManagerState = 'default' | 'selected'</code> - `setState(name, config)` takes the config of the state it names (`DesktopManagerStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | No icon selected. No config. |
| `selected` | Some icons selected. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>values?</code></td><td><code>string[]</code></td><td>the data-value of every selected icon</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends DesktopManagerState&gt;(name: S, config?: DesktopManagerStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DesktopManagerStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: DesktopManagerState; config: DesktopManagerStateConfigs[DesktopManagerState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: DesktopManagerState; config: DesktopManagerStateConfigs[DesktopManagerState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: DesktopManagerState; config: DesktopManagerStateConfigs[DesktopManagerState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: DesktopManagerState; config: DesktopManagerStateConfigs[DesktopManagerState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: DesktopManagerState; config: DesktopManagerStateConfigs[DesktopManagerState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.desktopManagerApi.setState&lt;S extends DesktopManagerState&gt;(el: HTMLElement, name: S, config?: DesktopManagerStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DesktopManagerStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.desktopManagerApi.getState(el: HTMLElement): { name: DesktopManagerState; config: DesktopManagerStateConfigs[DesktopManagerState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: DesktopManagerState; config: DesktopManagerStateConfigs[DesktopManagerState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.desktopManagerApi.render(state: { name: DesktopManagerState; config: DesktopManagerStateConfigs[DesktopManagerState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: DesktopManagerState; config: DesktopManagerStateConfigs[DesktopManagerState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.desktopManagerApi.store(el: HTMLElement): Store&lt;{ name: DesktopManagerState; config: DesktopManagerStateConfigs[DesktopManagerState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: DesktopManagerState; config: DesktopManagerStateConfigs[DesktopManagerState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.desktopManagerApi.commit&lt;S extends DesktopManagerState&gt;(el: HTMLElement, name: S, config?: DesktopManagerStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>DesktopManagerStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.desktopManagerStates: DesktopManagerState[]</code> | The declared states, 'default' first: <code>default</code>, <code>selected</code>. |

### `df$.shadcn.desktopManager`

| Member | Description |
|---|---|
| <code>select(target: string \| HTMLElement, values: string[]): string[]</code> | Select icons by value (every other one is unselected). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .desktop-manager element, its id or a selector</td></tr><tr><td><code>values</code></td><td><code>string[]</code></td><td>the data-value of each icon to select; an empty list clears the selection</td></tr></table> <b>Returns</b> <code>string[]</code> - the values selected now |
| <code>selected(target: string \| HTMLElement): string[]</code> | The selected icons. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .desktop-manager element, its id or a selector</td></tr></table> <b>Returns</b> <code>string[]</code> - their values, in icon order |
| <code>arrange(target: string \| HTMLElement): void</code> | Lines the icons up again in their markup order (drops every place they were dragged to). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .desktop-manager element, its id or a selector</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `desktop-rename` | Fires when an icon was renamed with F2 - its value and the new label (the page keeps the name). <code>detail</code>: <code>DesktopRenameDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>string</code></td><td>the renamed icon's data-value</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>its new label</td></tr></table> |
| `desktop-select` | Fires when the selection changes - by click, band, keys or setState. <code>detail</code>: <code>DesktopIconsDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>values</code></td><td><code>string[]</code></td><td>the data-value of every icon concerned, in icon order</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `DesktopIconsDetail` | What desktop-open, desktop-select and desktop-delete carry. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>values</code></td><td><code>string[]</code></td><td>the data-value of every icon concerned, in icon order</td></tr></table> |
| `DesktopRenameDetail` | What desktop-rename carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>string</code></td><td>the renamed icon's data-value</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>its new label</td></tr></table> |

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `role="listbox"` + `aria-multiselectable="true"` | `.desktop-manager` | Several icons can be selected |
| `aria-label` | `.desktop-manager` | Names the surface ("Desktop") |
| `role="option"` + `aria-selected` | `.desktop-icon` | Each icon and whether it is selected (the runtime adds `aria-selected="false"` where it is missing) |
| `tabindex` | `.desktop-icon` | Roving: one icon is the tab stop, arrows move it |

## Notes

- Opening, deleting and renaming are events: the page opens a window,
  removes an icon (or asks first), keeps the new name.
- The band is a `.desktop-manager-band` element the runtime draws inside the
  surface while a band is drawn (`data-selecting` on the surface).
- A press that moves less than 4px is a click: a click on one of several
  selected icons narrows the selection to it, a drag moves them all.
- Context menus are the page's: listen for `contextmenu` on an icon, select
  it with `df$.shadcn.desktopManager.select()` and open a Context Menu.
