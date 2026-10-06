---
name: Window
type: ATM
section: application
why: A non-modal <dialog> - open / close, the close event and the × (a <form method="dialog"> submit) are the browser's, and resizing is native CSS resize; the runtime only moves windows by their title bar, raises the clicked one to the front and maximizes / minimizes.
when: Desktop-style UIs - several movable panels over one area (an editor, an inspector, a chat), app mockups, retro pages, tool palettes. For a single blocking question use dialog / alert-dialog; for a panel from an edge use sheet; for splitting fixed panes use resizer.
where: dist/components/window/window.css + dist/components/window/window.js
supportedStates: default, maximized, minimized, closed
---

# Pattern: Window

## Native basis

A `<dialog class="window" open>` - **non-modal** (`show()`, never
`showModal()`), so several windows share the page and the content around
them stays usable. The title bar holds an optional icon, the title and the
controls; the controls are a `<form method="dialog">`, so the × closes the
window natively, even without script. Windows sit `position: absolute` in a
`.window-desktop` (any positioned ancestor works) and are placed with
`--window-x` / `--window-y`.

The runtime adds what the platform can't: dragging by the title bar (pointer
capture; arrow keys when the bar has focus), raising the pressed window to
the front (`data-active` + z-index), maximize / minimize, and
`df$.shadcn.win` to create and arrange windows from script.

## Native Web APIs

- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) + [`show()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/show) - non-modal windows; `close()` and the `close` event
- [`<form method="dialog">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#method) - the × closes the window with no script
- [`resize`](https://developer.mozilla.org/en-US/docs/Web/CSS/resize) - `data-resizable` gives the native resize handle
- [`setPointerCapture()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - a fast drag never loses the window
- [`touch-action: none`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) - the title bar drags on touch screens instead of scrolling
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `window-focus`, `window-move`
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - control hover states from the tokens
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - no transitions; the active title bar in system Highlight

---

## Structure

```html
<div class="window-desktop" style="height: 24rem">
  <dialog class="window" open data-resizable
          style="--window-x: 2rem; --window-y: 2rem; --window-w: 22rem">
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
    <footer class="window-statusbar">3 notes</footer>
  </dialog>
</div>
```

- The control glyphs are drawn by CSS - leave the buttons empty, keep the
  `aria-label`s. Leave out a control you don't want (a dialog-like window
  with only the ×).
- `.window-icon` is any `<svg>`, `<img>` or lucide `<i>`, left of the title.
- `.window-toolbar` (optional) sits under the title bar - an app's
  menubar (`menubar` with `data-variant="ghost"`) and tool buttons.
- `.window-statusbar` is optional; `data-flush` on `.window-body` drops its
  padding (an editor, a canvas, a list that fills the window).
- The dialog is labelled by its `.window-title` (the runtime wires
  `aria-labelledby` when you haven't).
- A closed window is a `<dialog>` without `open` - open it with
  `df$.shadcn.win.open(el)` (or `el.api.setState('default')`).

---

## Position and size (on `.window`)

| Property / attribute | Default | Meaning |
|----------------------|---------|---------|
| `--window-x` / `--window-y` | `2rem` | Top-left corner inside the desktop (the runtime writes px while dragging) |
| `--window-w` | `24rem` | Width |
| `--window-h` | `auto` | Height |
| `data-resizable` | - | Native resize handle (bottom-right) |
| `data-maximized` | - | Starts maximized |
| `data-minimized` | - | Starts rolled up to its title bar |

## Chrome (`data-chrome`)

| Value | Look |
|-------|------|
| *(default)* / `windows` | Flat title bar, wide controls on the right, the × turns red on hover |
| `mac` | Traffic lights on the left (glyphs on hover), centred title |
| `linux` | GNOME-style round grey buttons on the right, centred bold title |
| `retro` | A bevelled 9x window: grey face, blue gradient title bar, square buttons |

The surface, borders and shadows come from the tokens (`--card`,
`--border`, `--muted`, `--shadow-lg`); `retro` and the traffic lights use
literal colours - they are what they are in every theme.

---

## Behaviour

| Action | Result |
|--------|--------|
| Press anywhere in a window | It comes to the front (`data-active`; the others dim their title) |
| Drag the title bar | Moves it; its bar stays inside the desktop so it can always be grabbed back |
| Title bar focused + arrows | Moves 16px (Shift: 64px) |
| Double-click the title bar | Maximize / restore |
| − | Minimize: rolls the window up to its title bar (again: restore) |
| □ | Maximize: fills the desktop (again: restore) |
| × | Closes the dialog (native) |

## Events

| Event | Detail | When |
|-------|--------|------|
| `window-focus` | `{ title }` | The window came to the front |
| `window-move` | `{ x, y }` | A drag or a keyboard move ended |
| `close` | - | Native - the window closed, however it happened |

---

## Imperative API - `df$.shadcn.win`

Every method takes the `.window` element, its id, or a selector.

| Method | Does |
|--------|------|
| `create({ title, icon, content, html, statusbar, x, y, width, height, chrome, resizable, parent, flush, id })` | Builds a window, adds it to `parent` (default: the first `.window-desktop`), opens and raises it; returns the dialog |
| `open(w, { x, y }?)` / `close(w)` | Open (and raise) / close |
| `focus(w)` | Bring to the front |
| `move(w, x, y)` / `resize(w, width, height?)` | Place / size (numbers are px) |
| `maximize(w)` / `minimize(w)` / `restore(w)` / `toggleMaximize(w)` | The window states |
| `active()` | The front-most open window |
| `list(scope?, all?)` | Open windows (every window with `all`) |
| `cascade(scope?)` / `tile(scope?)` | Arrange the open windows diagonally / in a grid |

```js
const w = df$.shadcn.win.create({ title: 'Untitled', icon: 'file', content: 'Hello' });
df$.shadcn.win.move(w, 40, 40);
df$.shadcn.win.tile();
```

---

## States

| State | Meaning |
|-------|---------|
| `default` | Open at its normal size (opens a closed window; `{ x, y }` moves it) |
| `maximized` | Fills the desktop |
| `minimized` | Rolled up to its title bar |
| `closed` | The dialog is closed - also entered when the × or `close()` closes it; the maximized / minimized flags go with it (a window reopens at its normal size) |

```js
const w = document.querySelector('#notes');
w.api.setState('maximized');
w.api.setState('default', { x: 24, y: 24 });
w.api.getState(); // → { name: 'default', config: { x: 24, y: 24 } }
```

The maximize / minimize buttons are labelled for the state the window is in -
from init on (an authored `data-maximized` window's button says "Restore").
`render(state)` returns the authored window with the state's `open` /
`data-maximized` / `data-minimized` and button labels; position, size and
stacking are runtime.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type WindowState = 'default' | 'maximized' | 'minimized' | 'closed'</code> - `setState(name, config)` takes the config of the state it names (`WindowStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Open at its normal size (opens a closed window). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>x?</code></td><td><code>number</code></td><td>move it: the left edge, px inside its desktop (with y)</td></tr><tr><td><code>y?</code></td><td><code>number</code></td><td>move it: the top edge, px inside its desktop (with x)</td></tr></table> |
| `maximized` | Fills the desktop. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>x?</code></td><td><code>number</code></td><td>reported by getState() until it closes: the left edge set last, px</td></tr><tr><td><code>y?</code></td><td><code>number</code></td><td>reported by getState() until it closes: the top edge set last, px</td></tr></table> |
| `minimized` | Rolled up to its title bar. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>x?</code></td><td><code>number</code></td><td>reported by getState() until it closes: the left edge set last, px</td></tr><tr><td><code>y?</code></td><td><code>number</code></td><td>reported by getState() until it closes: the top edge set last, px</td></tr></table> |
| `closed` | Closed - also after the close button or close(); it reopens at its normal size. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends WindowState&gt;(name: S, config?: WindowStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>WindowStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: WindowState; config: WindowStateConfigs[WindowState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: WindowState; config: WindowStateConfigs[WindowState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: WindowState; config: WindowStateConfigs[WindowState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: WindowState; config: WindowStateConfigs[WindowState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: WindowState; config: WindowStateConfigs[WindowState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.windowApi.setState&lt;S extends WindowState&gt;(el: HTMLElement, name: S, config?: WindowStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>WindowStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.windowApi.getState(el: HTMLElement): { name: WindowState; config: WindowStateConfigs[WindowState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: WindowState; config: WindowStateConfigs[WindowState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.windowApi.render(state: { name: WindowState; config: WindowStateConfigs[WindowState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: WindowState; config: WindowStateConfigs[WindowState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.windowApi.store(el: HTMLElement): Store&lt;{ name: WindowState; config: WindowStateConfigs[WindowState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: WindowState; config: WindowStateConfigs[WindowState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.windowApi.commit&lt;S extends WindowState&gt;(el: HTMLElement, name: S, config?: WindowStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>WindowStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.windowStates: WindowState[]</code> | The declared states, 'default' first: <code>default</code>, <code>maximized</code>, <code>minimized</code>, <code>closed</code>. |

### `df$.shadcn.win`

| Member | Description |
|---|---|
| <code>create(options: WindowCreateOptions = {}): HTMLDialogElement</code> | Builds a window element from options - the shape the skill documents. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>options</code></td><td><code>WindowCreateOptions</code> = <code>{}</code></td><td>title, body, place, size, look and where it opens</td></tr></table> <b>Returns</b> <code>HTMLDialogElement</code> - the new window (a &lt;dialog class="window"&gt;), open unless focus is false |
| <code>open(target: string \| HTMLElement, config: { x?: number; y?: number } = {}): HTMLDialogElement \| null</code> | Open a window (closed, minimized or not shown yet) - config is the state's config. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window element, its id or a selector</td></tr><tr><td><code>config</code></td><td><code>{ x?: number; y?: number }</code> = <code>{}</code></td><td>where it opens: { x, y } px</td></tr></table> <b>Returns</b> <code>HTMLDialogElement \| null</code> - the window, null when the target matches none |
| <code>close(target: string \| HTMLElement): HTMLDialogElement \| null</code> | Close it (the closed state). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLDialogElement \| null</code> - the window, null when the target matches none |
| <code>focus(target: string \| HTMLElement): HTMLDialogElement \| null</code> | Bring it to the front (the active window). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLDialogElement \| null</code> - the window, null when the target matches none |
| <code>move(target: string \| HTMLElement, x: number, y: number): WindowPosition \| null</code> | Move it to x, y (px, inside its desktop). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window element, its id or a selector</td></tr><tr><td><code>x</code></td><td><code>number</code></td><td>the left edge, px</td></tr><tr><td><code>y</code></td><td><code>number</code></td><td>the top edge, px</td></tr></table> <b>Returns</b> <code>WindowPosition \| null</code> - where it landed (kept reachable inside its desktop), null when the target matches none |
| <code>resize(target: string \| HTMLElement, width: number \| string, height?: number \| string): HTMLDialogElement \| null</code> | Size it: width (and height) as px numbers or CSS lengths. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window element, its id or a selector</td></tr><tr><td><code>width</code></td><td><code>number \| string</code></td><td>px, or a CSS length</td></tr><tr><td><code>height?</code></td><td><code>number \| string</code></td><td>px, or a CSS length; omitted, the height stays</td></tr></table> <b>Returns</b> <code>HTMLDialogElement \| null</code> - the window, null when the target matches none |
| <code>maximize(target: string \| HTMLElement): HTMLDialogElement \| null</code> | Fill the desktop. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLDialogElement \| null</code> - the window, null when the target matches none |
| <code>minimize(target: string \| HTMLElement): HTMLDialogElement \| null</code> | Minimize it to the taskbar. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLDialogElement \| null</code> - the window, null when the target matches none |
| <code>restore(target: string \| HTMLElement): HTMLDialogElement \| null</code> | Back to its normal size and place. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLDialogElement \| null</code> - the window, null when the target matches none |
| <code>toggleMaximize(target: string \| HTMLElement): HTMLDialogElement \| null</code> | Maximize it, or restore it when it is maximized. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .window element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLDialogElement \| null</code> - the window, null when the target matches none |
| <code>active(): HTMLDialogElement \| undefined</code> | The window in front. <b>Returns</b> <code>HTMLDialogElement \| undefined</code> - the active open window, undefined when none is open |
| <code>list(scope?: HTMLElement \| string, all: boolean = false): HTMLDialogElement[]</code> | Windows (open unless `all`) inside `scope` (default: the page). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>scope?</code></td><td><code>HTMLElement \| string</code></td><td>a desktop element, its id or a selector (default: the page)</td></tr><tr><td><code>all</code></td><td><code>boolean</code> = <code>false</code></td><td>true: closed windows too</td></tr></table> <b>Returns</b> <code>HTMLDialogElement[]</code> - the windows, in document order |
| <code>cascade(scope?: HTMLElement \| string, step: number = 28): void</code> | Steps the open windows diagonally from the top-left, front-most last. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>scope?</code></td><td><code>HTMLElement \| string</code></td><td>a desktop element, its id or a selector (default: the page)</td></tr><tr><td><code>step</code></td><td><code>number</code> = <code>28</code></td><td>px between two windows (default 28)</td></tr></table> |
| <code>tile(scope?: HTMLElement \| string): void</code> | Lays the open windows side by side in a grid that fills their desktop. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>scope?</code></td><td><code>HTMLElement \| string</code></td><td>a desktop element, its id or a selector (default: the page)</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `window-focus` | Fires when a window comes to the front - its title. <code>detail</code>: <code>WindowFocusDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>title</code></td><td><code>string</code></td><td>the title of the window now in front</td></tr></table> |
| `window-move` | Fires after a window was dragged (or moved with the keyboard) - its position. <code>detail</code>: <code>WindowPosition</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>x</code></td><td><code>number</code></td><td>from the desktop's left edge</td></tr><tr><td><code>y</code></td><td><code>number</code></td><td>from the desktop's top edge</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `WindowCreateOptions` | What create() takes - the shape the skill documents. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>title?</code></td><td><code>string</code></td><td>the title bar text (default 'Untitled')</td></tr><tr><td><code>icon?</code></td><td><code>string</code></td><td>a Lucide icon name for the title bar</td></tr><tr><td><code>content?</code></td><td><code>Node \| string</code></td><td>the body: a node, or text</td></tr><tr><td><code>html?</code></td><td><code>string</code></td><td>the body as markup (used when content is not a node)</td></tr><tr><td><code>statusbar?</code></td><td><code>string</code></td><td>a status bar line</td></tr><tr><td><code>id?</code></td><td><code>string</code></td><td>the window's id</td></tr><tr><td><code>x?</code></td><td><code>number \| string</code></td><td>left edge: px, or a CSS length (default: cascaded from the windows before it)</td></tr><tr><td><code>y?</code></td><td><code>number \| string</code></td><td>top edge: px, or a CSS length</td></tr><tr><td><code>width?</code></td><td><code>number \| string</code></td><td>width: px, or a CSS length</td></tr><tr><td><code>height?</code></td><td><code>number \| string</code></td><td>height: px, or a CSS length</td></tr><tr><td><code>chrome?</code></td><td><code>'windows' \| 'mac' \| 'linux' \| 'retro'</code></td><td>the look of the title bar</td></tr><tr><td><code>resizable?</code></td><td><code>boolean</code></td><td>the native resize handle (default true)</td></tr><tr><td><code>parent?</code></td><td><code>HTMLElement \| string</code></td><td>the desktop to open in: element, id or selector (default: the .window-desktop, else the body)</td></tr><tr><td><code>focus?</code></td><td><code>boolean</code></td><td>open in front, active (default true)</td></tr><tr><td><code>flush?</code></td><td><code>boolean</code></td><td>a body without padding (an app inside)</td></tr></table> |
| `WindowFocusDetail` | What window-focus carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>title</code></td><td><code>string</code></td><td>the title of the window now in front</td></tr></table> |
| `WindowPosition` | A window's place inside its desktop, px. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>x</code></td><td><code>number</code></td><td>from the desktop's left edge</td></tr><tr><td><code>y</code></td><td><code>number</code></td><td>from the desktop's top edge</td></tr></table> |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| `.window` | `aria-labelledby` → `.window-title` | Wired by the runtime when missing; the dialog role is native |
| control buttons | `aria-label` | "Minimize", "Maximize" / "Restore", "Close" - kept current by the runtime |
| `.window-titlebar` | `tabindex="0"` (set by the runtime) | Focus it to move the window with the arrow keys |

## Notes

- Non-modal on purpose: every window and the page stay usable. For a
  blocking dialog use the dialog component (`showModal()`).
- `dialog.js` does not claim `.window` dialogs - each component owns its
  dialog (AGENTS.md).
- Windows are clipped by their desktop (`overflow: hidden`); give the
  desktop a height.
- Stacking is page-wide: the pressed window is raised above every other.
