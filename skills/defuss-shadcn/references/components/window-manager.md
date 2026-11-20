---
name: Window Manager
type: MOL
section: desktop
why: The model of one desktop's windows - which are open, in what order, which is in front, which are minimized - published as one event, so a taskbar or any other view renders it; every window change goes through the Window component's own State API.
when: Any desktop-like UI with several windows and something that lists them (a taskbar, a window menu, a switcher). For windows alone use window - its df$.shadcn.win already moves, raises and arranges them.
where: dist/components/window-manager/window-manager.css + dist/components/window-manager/window-manager.js
supportedStates: default, desktop
---

# Pattern: Window Manager

## Native basis

A positioned element (`.window-manager`, usually also a `.window-desktop`)
that holds [Window](window.md) components -
non-modal `<dialog>`s. The windows stay windows: the manager reads their
markup (`open`, `data-active`, `data-minimized`, `data-maximized`, the
title) and drives them only through `df$.shadcn.windowApi` /
`df$.shadcn.win`. It adds the order they opened in, one change event, the
taskbar's click rule and "show desktop".

## Native Web APIs

- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - every window change shows in an attribute or the title text; one observer per manager
- [`<dialog>` `close` event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close_event) - heard on the way down (it does not bubble)
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `window-manager-change`
- [`queueMicrotask()`](https://developer.mozilla.org/en-US/docs/Web/API/queueMicrotask) - one change event per burst of mutations
- [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) - `data-share`: the browser windows that show the same page talk to each other, no server
- [`MouseEvent.screenX`](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/screenX) / [`Window.screenX`](https://developer.mozilla.org/en-US/docs/Web/API/Window/screenX) - windows are placed in screen coordinates across browser windows

---

## Structure

```html
<div class="window-desktop window-manager" id="desk" style="height: 24rem">
  <dialog class="window" open style="--window-x: 2rem; --window-y: 2rem; --window-w: 18rem">
    <header class="window-titlebar">
      <i data-lucide="notebook-pen" class="window-icon"></i>
      <h2 class="window-title">Notes</h2>
      <form method="dialog" class="window-controls">
        <button type="button" class="window-minimize" aria-label="Minimize"></button>
        <button type="button" class="window-maximize" aria-label="Maximize"></button>
        <button class="window-close" aria-label="Close"></button>
      </form>
    </header>
    <div class="window-body">…</div>
  </dialog>
  <!-- more windows -->
</div>
```

- Windows belong to the nearest `.window-manager` around them; a manager
  nested inside another keeps its own windows.
- Every window gets an id (the runtime gives one to a window without) - the
  model names windows by id.
- A [Taskbar](taskbar.md) with `data-taskbar-for="desk"`
  binds to it and sets `data-taskbar`: from then on a minimized window
  leaves the desktop for its taskbar button instead of rolling up to its
  title bar.
- A [Desktop Manager](desktop-manager.md) inside it lies
  under the windows and fills the area.

## Variants

| Attribute | Effect |
|-----------|--------|
| `data-taskbar` | Set by a bound Taskbar: minimized windows are hidden (their taskbar buttons bring them back) |
| `data-desktop-shown` | The `desktop` state: every window was minimized by "show desktop" |
| `data-share="name"` | One desktop across browser windows: every browser window showing the page with the same name takes part (see Notes) |
| `data-share-remote` | Set by the runtime on a window shown here only while another browser window drags it (inert, not in the model) |

## States

| State | Meaning |
|-------|---------|
| `default` | The windows as the reader left them; leaving `desktop` brings back the windows it minimized |
| `desktop` | Show the desktop: every open window minimized (a window that shows again ends it) |

```js
const desk = document.querySelector('#desk');
desk.api.setState('desktop'); // every window minimized
desk.api.setState('default'); // they come back
df$.shadcn.windowManager.windows(desk); // → [{ id, title, icon, state, active }, …]
```

`render(state)` returns the authored manager with the state's
`data-desktop-shown`; the windows are their own components.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type WindowManagerState = 'default' | 'desktop'</code> - `setState(name, config)` takes the config of the state it names (`WindowManagerStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The windows as the reader left them (leaving 'desktop' brings back the ones it minimized). No config. |
| `desktop` | Show the desktop: every open window minimized. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends WindowManagerState&gt;(name: S, config?: WindowManagerStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>WindowManagerStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: WindowManagerState; config: WindowManagerStateConfigs[WindowManagerState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: WindowManagerState; config: WindowManagerStateConfigs[WindowManagerState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: WindowManagerState; config: WindowManagerStateConfigs[WindowManagerState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: WindowManagerState; config: WindowManagerStateConfigs[WindowManagerState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: WindowManagerState; config: WindowManagerStateConfigs[WindowManagerState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.windowManagerApi.setState&lt;S extends WindowManagerState&gt;(el: HTMLElement, name: S, config?: WindowManagerStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>WindowManagerStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.windowManagerApi.getState(el: HTMLElement): { name: WindowManagerState; config: WindowManagerStateConfigs[WindowManagerState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: WindowManagerState; config: WindowManagerStateConfigs[WindowManagerState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.windowManagerApi.render(state: { name: WindowManagerState; config: WindowManagerStateConfigs[WindowManagerState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: WindowManagerState; config: WindowManagerStateConfigs[WindowManagerState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.windowManagerApi.store(el: HTMLElement): Store&lt;{ name: WindowManagerState; config: WindowManagerStateConfigs[WindowManagerState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: WindowManagerState; config: WindowManagerStateConfigs[WindowManagerState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.windowManagerApi.commit&lt;S extends WindowManagerState&gt;(el: HTMLElement, name: S, config?: WindowManagerStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>WindowManagerStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.windowManagerStates: WindowManagerState[]</code> | The declared states, 'default' first: <code>default</code>, <code>desktop</code>. |

### `df$.shadcn.windowManager`

| Member | Description |
|---|---|
| <code>windows(target: string \| HTMLElement): WindowManagerEntry[]</code> | The windows of a manager, in the order they opened. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window-manager element, its id or a selector</td></tr></table> <b>Returns</b> <code>WindowManagerEntry[]</code> - its open windows (an empty list when the target matches none) |
| <code>active(target: string \| HTMLElement): HTMLDialogElement \| undefined</code> | The window in front. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window-manager element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLDialogElement \| undefined</code> - the active window that is not minimized, undefined when none is |
| <code>toggle(target: string \| HTMLElement): string</code> | What a taskbar button does: a minimized window comes back to the front, the window in front is minimized, any other comes to the front. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window element, its id or a selector</td></tr></table> <b>Returns</b> <code>string</code> - the window's state afterwards, '' when the target matches none |
| <code>showDesktop(target: string \| HTMLElement): boolean</code> | Show the desktop (every window minimized), or bring the windows back when it shows. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window-manager element, its id or a selector</td></tr></table> <b>Returns</b> <code>boolean</code> - whether the desktop shows now |
| <code>cascade(target: string \| HTMLElement, step: number = 28): void</code> | Steps the windows diagonally from the top left - df$.shadcn.win.cascade inside this manager. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window-manager element, its id or a selector</td></tr><tr><td><code>step</code></td><td><code>number</code> = <code>28</code></td><td>px between two windows (default 28)</td></tr></table> |
| <code>tile(target: string \| HTMLElement): void</code> | Lays the windows side by side in a grid - df$.shadcn.win.tile inside this manager. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window-manager element, its id or a selector</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `window-manager-change` | Fires when the manager's windows change - one opened, closed, came to the front, was minimized or restored, or renamed. <code>detail</code>: <code>WindowManagerChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>windows</code></td><td><code>WindowManagerEntry[]</code></td><td>the open windows, in the order they opened</td></tr><tr><td><code>active</code></td><td><code>string</code></td><td>the id of the window in front, '' when none is</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `WindowManagerChangeDetail` | What window-manager-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>windows</code></td><td><code>WindowManagerEntry[]</code></td><td>the open windows, in the order they opened</td></tr><tr><td><code>active</code></td><td><code>string</code></td><td>the id of the window in front, '' when none is</td></tr></table> |
| `WindowManagerEntry` | One window as the manager publishes it. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the window's id (the runtime gives one to a window without)</td></tr><tr><td><code>title</code></td><td><code>string</code></td><td>its title (the .window-title text)</td></tr><tr><td><code>icon</code></td><td><code>string</code></td><td>the Lucide name of its .window-icon, '' when it has none or another kind of icon</td></tr><tr><td><code>glyph</code></td><td><code>string</code></td><td>the data-glyph of its .window-icon (a Desktop glyph that follows the look), '' when it has none</td></tr><tr><td><code>state</code></td><td><code>string</code></td><td>its Window state: default, maximized, minimized or closed</td></tr><tr><td><code>active</code></td><td><code>boolean</code></td><td>whether it is the window in front</td></tr></table> |

## ARIA

The manager adds no role: each window is a labelled non-modal dialog
(Window), the list a taskbar renders is that component's. Focus stays
where it is when a window opens or minimizes.

## Notes

- The model is published as `window-manager-change` on the manager (it
  bubbles): `{ windows, active }` - windows in the order they opened (one
  that closes and opens again goes last), `active` the id of the window in
  front, `''` when every window is minimized.
- `toggle(window)` is the taskbar rule: a minimized window comes back (as
  maximized when it was), the window in front is minimized, any other comes
  to the front.
- The front window is per desktop: two managers on one page each keep one
  active window (Window marks `data-active` within its nearest
  `.window-manager` / `.window-desktop`).
- The manager never moves, sizes or styles a window itself; `cascade()` and
  `tile()` are `df$.shadcn.win.cascade` / `tile` inside the manager, and
  sharing places windows through `df$.shadcn.win.move` / `resize`.
- **Across browser windows** (`data-share="name"`): open the same page in a
  second browser window beside the first and they are one desktop. A window
  dragged past the edge shows in the browser window it moves over (the part
  beyond this one's edge, `data-share-remote`, inert); dropped there, that
  browser window takes it - its own copy of the window (the same id) opens at
  the same place on the screen, with the same size and the values of its
  fields (the text in a Notepad) - and this one closes it. Dropped where no
  browser window is, it comes back inside its desktop. While it is shared, a
  drag may leave the desktop (Window reads `data-share`). Only windows both
  pages hold (by id) travel; a window created by script on one page stays.
  The browser windows talk over a `BroadcastChannel` named after
  `data-share` - same origin, no server; a sandboxed frame (a docs card) has
  none and the desktop stays where it is. Positions: a pointer event measures
  where the viewport sits on the screen, the browser frame is estimated until
  the first one.
