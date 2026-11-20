---
name: Start Menu
type: MOL
section: desktop
why: A popover the Start Button opens with no script; the runtime adds what a start menu needs - search as you type over every item, folders that open beside their item, arrows and Enter, and one start-select event that the page turns into an app.
when: The menu of a desktop's Start Button - apps, folders, the user, power. For a command palette use command; for a menu on any button use dropdown.
where: dist/components/start-menu/start-menu.css + dist/components/start-menu/start-menu.js
supportedStates: default, open
---

# Pattern: Start Menu

## Native basis

A `popover` element (`.start-menu`) opened by a
[Start Button](../start-button/component-skill.md)'s `popovertarget`; each
folder's items are a nested `popover` (`.start-menu-sub`) the folder item
names with `aria-controls`. The browser light-dismisses them and keeps them
in the top layer; CSS anchor positioning places the menu on its button
(flipped when there is no room) and a folder beside its item.

## Native Web APIs

- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - the menu and its folders; light dismiss, Escape, top layer
- [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) + [`position-try-fallbacks`](https://developer.mozilla.org/en-US/docs/Web/CSS/position-try-fallbacks) - above the button, below it near the top edge; folders beside their item
- [`toggle` event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/toggle_event) - focus into the search on open, `aria-expanded` on the button
- [`display: contents`](https://developer.mozilla.org/en-US/docs/Web/CSS/display#contents) - while searching, a folder's items join the result list
- [`checkVisibility()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility) - arrows walk only the items that show
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - the focused item in Highlight

---

## Structure

```html
<div class="start-menu" id="start" popover aria-label="Start">
  <div class="start-menu-head">
    <span class="avatar" data-size="sm"><img class="avatar-image" src="…" alt="" /></span>
    <span>Aron</span>
  </div>
  <label class="start-menu-search">
    <i data-lucide="search"></i>
    <input type="search" placeholder="Search apps" aria-label="Search apps" />
  </label>
  <p class="start-menu-heading">Pinned</p>
  <div class="start-menu-pinned" role="group" aria-label="Pinned">
    <button class="start-menu-item" type="button" data-value="notes">
      <span class="start-menu-icon"><i data-lucide="notebook-pen"></i></span>
      <span class="start-menu-label">Notes</span>
    </button>
  </div>
  <p class="start-menu-heading">All apps</p>
  <div class="start-menu-list" role="group" aria-label="All apps">
    <button class="start-menu-item" type="button" aria-controls="start-tools">
      <span class="start-menu-icon"><i data-lucide="folder"></i></span>
      <span class="start-menu-label">Accessories</span>
    </button>
    <div class="start-menu-sub" id="start-tools" popover aria-label="Accessories">
      <button class="start-menu-item" type="button" data-value="calculator">
        <span class="start-menu-icon"><i data-lucide="calculator"></i></span>
        <span class="start-menu-label">Calculator</span>
      </button>
    </div>
    <button class="start-menu-item" type="button" data-value="terminal">
      <span class="start-menu-icon"><i data-lucide="terminal"></i></span>
      <span class="start-menu-label">Terminal</span>
    </button>
  </div>
  <p class="start-menu-empty" hidden>No results</p>
  <div class="start-menu-foot">
    <button class="start-menu-item" type="button" data-value="settings">
      <span class="start-menu-icon"><i data-lucide="settings"></i></span>
      <span class="start-menu-label">Settings</span>
    </button>
    <button class="start-menu-item" type="button" data-value="shutdown" aria-label="Shut down">
      <span class="start-menu-icon"><i data-lucide="power"></i></span>
    </button>
  </div>
</div>
```

- Every part but the items is optional: a classic menu is a list with
  folders and a foot; a modern one leads with the search and the pinned
  grid.
- `data-value` names the item in `start-select` (default: its label).
- A folder is an item with `aria-controls` naming its `.start-menu-sub`;
  folders nest.
- `.start-menu-empty` shows when a search finds nothing.

## Variants

A desktop look (`data-look` on the desktop) arranges the same parts: two
columns with a user banner, a list with a vertical brand strip (98) or without one (95), a tiled
grid.

## Interaction

| Input | Effect |
|-------|--------|
| Start Button, Ctrl+Esc | Open / close (focus goes to the search, else the first item) |
| Typing | Searches every item - folders' too - by label; Enter picks the first match |
| Arrow Down / Up | The next / previous item of the list the focus is in |
| Arrow Right / hover on a folder | Opens it beside its item |
| Arrow Left, Escape in a folder | Closes it, back to its item |
| Enter, click | Picks: `start-select` `{ value, label }`, the menu closes |
| Escape, a click outside | Closes the menu (the popover's light dismiss) |

## States

| State | Meaning |
|-------|---------|
| `default` | Closed |
| `open` | Open; `{ query }` searches |

```js
const menu = document.querySelector('#start');
menu.api.setState('open', { query: 'calc' });
menu.addEventListener('start-select', (e) => openApp(e.detail.value));
```

`render(state)` returns the authored menu with the search text as the
input's `value`; open itself lives in the top layer, not in an attribute.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type StartMenuState = 'default' | 'open'</code> - `setState(name, config)` takes the config of the state it names (`StartMenuStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Closed. No config. |
| `open` | Open. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>query?</code></td><td><code>string</code></td><td>the search text (the items that match show)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends StartMenuState&gt;(name: S, config?: StartMenuStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>StartMenuStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: StartMenuState; config: StartMenuStateConfigs[StartMenuState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: StartMenuState; config: StartMenuStateConfigs[StartMenuState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: StartMenuState; config: StartMenuStateConfigs[StartMenuState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: StartMenuState; config: StartMenuStateConfigs[StartMenuState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: StartMenuState; config: StartMenuStateConfigs[StartMenuState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.startMenuApi.setState&lt;S extends StartMenuState&gt;(el: HTMLElement, name: S, config?: StartMenuStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>StartMenuStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.startMenuApi.getState(el: HTMLElement): { name: StartMenuState; config: StartMenuStateConfigs[StartMenuState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: StartMenuState; config: StartMenuStateConfigs[StartMenuState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.startMenuApi.render(state: { name: StartMenuState; config: StartMenuStateConfigs[StartMenuState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: StartMenuState; config: StartMenuStateConfigs[StartMenuState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.startMenuApi.store(el: HTMLElement): Store&lt;{ name: StartMenuState; config: StartMenuStateConfigs[StartMenuState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: StartMenuState; config: StartMenuStateConfigs[StartMenuState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.startMenuApi.commit&lt;S extends StartMenuState&gt;(el: HTMLElement, name: S, config?: StartMenuStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>StartMenuStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.startMenuStates: StartMenuState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>. |

### `df$.shadcn.startMenu`

| Member | Description |
|---|---|
| <code>open(target: string \| HTMLElement, query: string = ''): HTMLElement \| null</code> | Open the menu (with a search text). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .start-menu element, its id or a selector</td></tr><tr><td><code>query</code></td><td><code>string</code> = <code>''</code></td><td>the text to search for ('' shows everything)</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the menu, null when the target matches none |
| <code>close(target: string \| HTMLElement): HTMLElement \| null</code> | Close the menu. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .start-menu element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the menu, null when the target matches none |
| <code>toggle(target: string \| HTMLElement): boolean</code> | Open it when closed, close it when open. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .start-menu element, its id or a selector</td></tr></table> <b>Returns</b> <code>boolean</code> - whether it is open now |

### Events

| Event | Description |
|---|---|
| `start-select` | Fires when an item is picked - its value and label; the menu closes. <code>detail</code>: <code>StartSelectDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>string</code></td><td>the picked item's data-value (else its label)</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>the picked item's label</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `StartSelectDetail` | What start-select carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>string</code></td><td>the picked item's data-value (else its label)</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>the picked item's label</td></tr></table> |

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `aria-label` | `.start-menu`, `.start-menu-sub` | Names the menu and each folder |
| `aria-haspopup="menu"` + `aria-expanded` | folder items | Set by the runtime on every item with `aria-controls` |
| `aria-expanded` | the Start Button | Set by the runtime while the menu is open |
| `role="group"` + `aria-label` | `.start-menu-pinned`, `.start-menu-list` | Names the groups |
| `aria-label` | an icon-only item | Its name (a power button) |

## Notes

- The page decides what an item opens: listen for `start-select` on the menu
  (it bubbles).
- While searching, the pinned grid, the headings and the folder items step
  aside; the matches of every list and folder show in one list.
- The menu clears its search when it closes.
