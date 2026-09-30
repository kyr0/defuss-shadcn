---
name: Window
type: ATM
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
| `closed` | The dialog is closed - also entered when the × or `close()` closes it |

```js
const w = document.querySelector('#notes');
w.api.setState('maximized');
w.api.setState('default', { x: 24, y: 24 });
w.api.getState(); // → { name: 'default', config: { x: 24, y: 24 } }
```

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
