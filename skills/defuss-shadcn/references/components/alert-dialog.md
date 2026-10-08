---
name: Alert Dialog
type: MOL
section: feedback-status
why: A <dialog> that demands an answer - Escape and backdrop clicks deliberately do not dismiss it, forcing an explicit confirm or cancel.
when: Destructive or irreversible actions (delete, discard) that must be confirmed.
where: dist/components/alert-dialog/alert-dialog.css + dist/components/alert-dialog/alert-dialog.js
supportedStates: default, open
---

# Alert Dialog

## Native basis

`<dialog>` element used as a modal that requires user response. Unlike a standard dialog, it has no backdrop-close and no close button - the user must choose an action.

## Native Web APIs

- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) - native modal with focus trap and Escape-to-close
- [`showModal()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) - opens as modal with backdrop
- [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop) - native backdrop pseudo-element
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - entry animation starting values

## Structure

```html
<button class="btn" data-variant="outline" data-alert-dialog-trigger="my-alert-dialog">
  Delete Account
</button>

<dialog id="my-alert-dialog" class="alert-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="ad-title" aria-describedby="ad-desc">
  <div class="alert-dialog-content">
    <div class="alert-dialog-header">
      <h2 class="alert-dialog-title" id="ad-title">Are you absolutely sure?</h2>
      <p class="alert-dialog-description" id="ad-desc">
        This action cannot be undone. This will permanently delete your account.
      </p>
    </div>
    <div class="alert-dialog-footer">
      <button class="btn" data-variant="outline" data-alert-dialog-close>Cancel</button>
      <button class="btn" data-variant="destructive" data-alert-dialog-close>Delete</button>
    </div>
  </div>
</dialog>
```

## States

Declared states: `default` (closed) · `open` (shown modally). Escape and backdrop clicks never close it - only close buttons, `close()`, or the API.

```js
document.querySelector('#my-alert').api.setState('open');
document.querySelector('#my-alert').api.getState(); // { name: 'open', config: {} }
```

The state is the dialog's `open`: opening it with a trigger or a `commandfor` button and closing it with a close button is reported by `getState()` and `el.store` too, without `setState`.

The api is bound per dialog; the registry global is
`df$.shadcn.alertDialogApi` / `df$.shadcn.alertDialogStates` (camelCase).

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type AlertDialogState = 'default' | 'open'</code> - `setState(name, config)` takes the config of the state it names (`AlertDialogStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Closed. No config. |
| `open` | Open as a modal (showModal()) - the background is inert until it is answered. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends AlertDialogState&gt;(name: S, config?: AlertDialogStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AlertDialogStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: AlertDialogState; config: AlertDialogStateConfigs[AlertDialogState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: AlertDialogState; config: AlertDialogStateConfigs[AlertDialogState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: AlertDialogState; config: AlertDialogStateConfigs[AlertDialogState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: AlertDialogState; config: AlertDialogStateConfigs[AlertDialogState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: AlertDialogState; config: AlertDialogStateConfigs[AlertDialogState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.alertDialogApi.setState&lt;S extends AlertDialogState&gt;(el: HTMLElement, name: S, config?: AlertDialogStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AlertDialogStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.alertDialogApi.getState(el: HTMLElement): { name: AlertDialogState; config: AlertDialogStateConfigs[AlertDialogState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: AlertDialogState; config: AlertDialogStateConfigs[AlertDialogState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.alertDialogApi.render(state: { name: AlertDialogState; config: AlertDialogStateConfigs[AlertDialogState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: AlertDialogState; config: AlertDialogStateConfigs[AlertDialogState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.alertDialogApi.store(el: HTMLElement): Store&lt;{ name: AlertDialogState; config: AlertDialogStateConfigs[AlertDialogState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: AlertDialogState; config: AlertDialogStateConfigs[AlertDialogState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.alertDialogApi.commit&lt;S extends AlertDialogState&gt;(el: HTMLElement, name: S, config?: AlertDialogStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>AlertDialogStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.alertDialogStates: AlertDialogState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>. |


## Density

Set `data-density` on the `.alert-dialog` root. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | content padding 1rem |
| `comfortable` | content padding 1.5rem - identical to the unsized default |
| `spacious` | content padding 2rem |

## Accessibility

- Uses `role="alertdialog"` instead of `role="dialog"` - signals interruption
- `aria-labelledby` and `aria-describedby` link to title and description
- No backdrop click dismiss - user must make an explicit choice
- Escape key is disabled - user must use the action buttons
- Focus is trapped inside the dialog via native `showModal()`
- While the alert is modal, `html:has(dialog.alert-dialog:modal)` sets `overflow: hidden` + `scrollbar-gutter: stable` - the page behind cannot scroll and its position is preserved for when the alert closes (no JS scroll-lock).
