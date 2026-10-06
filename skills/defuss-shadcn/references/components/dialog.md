---
name: Dialog
type: MOL
why: Native <dialog> + showModal(): focus trap, Escape-to-close, ::backdrop, and inert background all come from the browser.
when: Modals for forms, detail views, or previews - unless the answer is mandatory (then alert-dialog).
where: dist/components/dialog/dialog.css + dist/components/dialog/dialog.js
supportedStates: default, open
---

# Pattern: Dialog

## States
Named states via the shared State API (AGENTS.md "State API"), bound per instance:
`default` (closed) and `open` (modal shown).

```js
document.querySelector('#my-dialog').api.setState('open');
document.querySelector('#my-dialog').api.getState(); // { name: 'open', config: {} }
```

Unknown state names throw. `globalThis.df$.shadcn.dialogStates` lists them.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type DialogState = 'default' | 'open'</code> - `setState(name, config)` takes the config of the state it names (`DialogStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Closed. No config. |
| `open` | Open as a modal (showModal()) - Escape and a backdrop click close it. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends DialogState&gt;(name: S, config?: DialogStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DialogStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: DialogState; config: DialogStateConfigs[DialogState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: DialogState; config: DialogStateConfigs[DialogState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: DialogState; config: DialogStateConfigs[DialogState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: DialogState; config: DialogStateConfigs[DialogState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: DialogState; config: DialogStateConfigs[DialogState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.dialogApi.setState&lt;S extends DialogState&gt;(el: HTMLElement, name: S, config?: DialogStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DialogStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.dialogApi.getState(el: HTMLElement): { name: DialogState; config: DialogStateConfigs[DialogState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: DialogState; config: DialogStateConfigs[DialogState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.dialogApi.render(state: { name: DialogState; config: DialogStateConfigs[DialogState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: DialogState; config: DialogStateConfigs[DialogState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.dialogApi.store(el: HTMLElement): Store&lt;{ name: DialogState; config: DialogStateConfigs[DialogState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: DialogState; config: DialogStateConfigs[DialogState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.dialogApi.commit&lt;S extends DialogState&gt;(el: HTMLElement, name: S, config?: DialogStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>DialogStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.dialogStates: DialogState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>. |

## Native basis
`<dialog>` element + `showModal()`. The browser provides:
- Focus trap (automatically)
- Escape key to close (automatically)
- `::backdrop` for overlay
- `aria-modal` behavior when opened with `showModal()`

Requires minimal JavaScript - only for trigger wiring and backdrop-click-to-close.

---

## Native Web APIs
- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) - native modal element with built-in focus trap and Escape-to-close
- [`HTMLDialogElement.showModal()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) - opens dialog as modal in the top layer with backdrop
- [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop) - pseudo-element for the overlay behind the modal
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - defines entry animation starting values

---

## Structure

```html
<!-- Trigger -->
<button class="btn" data-variant="default"
        data-dialog-trigger="my-dialog"
        aria-haspopup="dialog">
  Open
</button>

<!-- Dialog -->
<dialog id="my-dialog"
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-dialog-title">

  <div class="dialog-content">
    <div class="dialog-header">
      <h2 class="dialog-title" id="my-dialog-title">Dialog Title</h2>
      <p class="dialog-description">Supporting description.</p>
    </div>

    <div class="dialog-body">
      <!-- Content goes here -->
    </div>

    <div class="dialog-footer">
      <button class="btn" data-variant="outline" data-dialog-close>
        Cancel
      </button>
      <button class="btn" data-variant="default">
        Confirm
      </button>
    </div>
  </div>
</dialog>
```

---


## Density

Set `data-density` on the `.dialog` root. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | content padding 1rem |
| `comfortable` | content padding 1.5rem - identical to the unsized default |
| `spacious` | content padding 2rem |

## Sizes

| `data-size` | Max width  | Use case                         |
|-------------|------------|----------------------------------|
| `sm`        | `24rem`    | Confirmations, simple alerts     |
| `md`        | `28rem`    | Standard forms, content (default)|
| *(default)* | `28rem`    | Standard forms, content          |
| `lg`        | `32rem`    | Complex forms, rich content      |
| `xl`        | `40rem`    | Data-heavy, multi-column layouts |
| `full`      | `calc(100vw - 2rem)` | Full-screen modal        |

---

## ARIA

| Attribute            | Element     | Value                |
|----------------------|-------------|----------------------|
| `role="dialog"`      | `<dialog>`  | Identifies as dialog |
| `aria-modal="true"`  | `<dialog>`  | Content behind is inert |
| `aria-labelledby`    | `<dialog>`  | Points to title `id` |
| `aria-haspopup="dialog"` | trigger | Indicates dialog will open |

---

## Wiring conventions

- `data-dialog-trigger="[id]"` on any element → opens that dialog
- `data-dialog-close` on any element inside → closes the dialog
- Click on backdrop → closes (click lands on `<dialog>` itself)
- Place `<dialog>` elements as direct children of `<body>`

---

## Notes

- Animation uses CSS-only enter via `@starting-style` and exit via `transition` + `allow-discrete`.
- While the dialog is modal, `html:has(dialog.dialog:modal)` sets `overflow: hidden` + `scrollbar-gutter: stable` - the page behind cannot scroll and its position is preserved for when the dialog closes (no JS scroll-lock).
- The selector is `dialog.dialog` (element + class) to avoid styling native `<dialog>` elements used elsewhere.
- For forms inside dialogs, use the `dialog-body` wrapper for the form content.
