---
name: Command Palette
type: ATM
section: overlays
why: A <dialog class="command"> palette - filtering and keyboard navigation are the only JS; the modal is native.
when: ⌘K-style search or command surface across app features or documentation pages.
where: dist/components/command/command.css + dist/components/command/command.js
supportedStates: default, open
---

# Command

## Native basis

`<dialog>` + search input for a command palette. Uses `showModal()` for focus trap and Escape-to-close.

---

## Native Web APIs

- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) - modal with focus trap and Escape-to-close
- [`showModal()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) - opens dialog as modal with backdrop
- [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop) - scrim overlay behind the dialog
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - entry animation starting values
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus ring on items
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) - prevents scroll chaining in command list
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses open/close animations
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - maps highlights to system colors

---

## Structure

```html
<button class="btn" data-command-trigger="cmd">Open Command</button>
<dialog id="cmd" class="command" role="dialog" aria-modal="true" aria-label="Command menu">
  <div class="command-content">
    <div class="command-input-wrapper">
      <svg aria-hidden="true"><!-- search icon --></svg>
      <input class="command-input" type="text"
             placeholder="Type a command or search..."
             autocomplete="off" autocorrect="off" spellcheck="false">
    </div>
    <div class="command-list">
      <div class="command-group">
        <p class="command-group-heading">Suggestions</p>
        <button class="command-item">Calendar</button>
        <button class="command-item">Search Emoji</button>
      </div>
      <div class="command-separator"></div>
      <div class="command-group">
        <p class="command-group-heading">Settings</p>
        <button class="command-item">Profile <span class="command-shortcut">⌘P</span></button>
        <button class="command-item">Settings <span class="command-shortcut">⌘S</span></button>
      </div>
    </div>
    <div class="command-empty" hidden>No results found.</div>
  </div>
</dialog>
```

---

## Density

Set `data-density` on the `dialog.command` root; the palette rows, search wrapper and group headings scale.

| Value | Effect |
| --- | --- |
| `compact` | Item padding 0.375rem |
| `comfortable` | 0.5rem - identical to the unsized default |
| `spacious` | 0.625rem |

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `role="dialog"` | `<dialog>` | Identifies as a dialog |
| `aria-modal="true"` | `<dialog>` | Indicates modal behavior |
| `aria-label="Command menu"` | `<dialog>` | Labels the dialog for screen readers |
| `aria-hidden="true"` | Search icon `<svg>` | Hides decorative icon |
| `aria-disabled="true"` | Disabled `<button>` | Marks item as disabled |
| `data-highlighted` | Active `<button>` | JS-managed: visually highlights the keyboard-focused item |

---

## Keyboard

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + K` | Opens/closes the command palette (global) |
| `Escape` | Closes the dialog (native `<dialog>` behavior) |
| `Arrow Down` | Highlights the next visible item |
| `Arrow Up` | Highlights the previous visible item |
| `Enter` | Activates the highlighted item |
| `Home` | Highlights the first visible item |
| `End` | Highlights the last visible item |

---

## States

Declared states: `default` (closed) · `open` (shown modally with the search input focused).

```js
document.querySelector('#cmd').api.setState('open');
document.querySelector('#cmd').api.getState(); // { name: 'open', config: {} }
```

The api is bound per palette dialog; the registry global is
`df$.shadcn.commandApi` / `df$.shadcn.commandStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type CommandState = 'default' | 'open'</code> - `setState(name, config)` takes the config of the state it names (`CommandStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Closed. No config. |
| `open` | Open as a modal, its search input focused. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends CommandState&gt;(name: S, config?: CommandStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>CommandStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: CommandState; config: CommandStateConfigs[CommandState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: CommandState; config: CommandStateConfigs[CommandState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: CommandState; config: CommandStateConfigs[CommandState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: CommandState; config: CommandStateConfigs[CommandState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: CommandState; config: CommandStateConfigs[CommandState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.commandApi.setState&lt;S extends CommandState&gt;(el: HTMLElement, name: S, config?: CommandStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>CommandStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.commandApi.getState(el: HTMLElement): { name: CommandState; config: CommandStateConfigs[CommandState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: CommandState; config: CommandStateConfigs[CommandState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.commandApi.render(state: { name: CommandState; config: CommandStateConfigs[CommandState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: CommandState; config: CommandStateConfigs[CommandState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.commandApi.store(el: HTMLElement): Store&lt;{ name: CommandState; config: CommandStateConfigs[CommandState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: CommandState; config: CommandStateConfigs[CommandState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.commandApi.commit&lt;S extends CommandState&gt;(el: HTMLElement, name: S, config?: CommandStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>CommandStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.commandStates: CommandState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>. |

## Notes

- The search input filters items by text content - groups with no matching items are hidden automatically.
- When all items are filtered out, the `.command-empty` element is shown.
- Separators are hidden during filtering to avoid visual orphans.
- The `data-command-trigger` attribute on any element wires it as a trigger button via JS.
- `Cmd/Ctrl+K` is registered as a global keyboard shortcut.
- Items with `aria-disabled="true"` are excluded from keyboard navigation and filtering.
- The dialog uses `showModal()` - focus is trapped inside and Escape closes it natively.
- On close, the search input is cleared and all items are restored.
- No JavaScript positioning is needed - the dialog uses CSS `position: fixed` with `top: 15%`.
- While the palette is modal, `html:has(dialog.command:modal)` sets `overflow: hidden` + `scrollbar-gutter: stable` - the page behind cannot scroll and its position is preserved for when the palette closes (no JS scroll-lock).
