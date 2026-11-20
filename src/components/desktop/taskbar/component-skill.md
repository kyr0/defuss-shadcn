---
name: Taskbar
type: MOL
section: desktop
why: A toolbar along a desktop's edge whose window buttons are the Window Manager's model - one per open window, pressed for the one in front, a click brings it forward or minimizes it; the Start Button, the page's launchers and the Tray sit in it.
when: A desktop with windows. For a dock of launchers only use dock; for an app's own toolbar use toolbar.
where: dist/components/taskbar/taskbar.css + dist/components/taskbar/taskbar.js
supportedStates: default
---

# Pattern: Taskbar

## Native basis

A `<nav>` with buttons. The window buttons are rendered by the runtime into
`.taskbar-windows` from the bound [Window Manager](../window-manager/component-skill.md)'s
`window-manager-change` event (`data-taskbar-for` names the manager);
everything else is authored. A `.desktop` wrapper lays the window area and
the bar out on any edge.

## Native Web APIs

- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - the manager's model arrives as `window-manager-change`
- [`aria-pressed`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-pressed) - the window in front
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the `.desktop` wrapper follows the bar's edge
- [`backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) - the translucent bar (none under reduced motion)

---

## Structure

```html
<div class="desktop" style="height: 24rem">
  <div class="window-desktop window-manager" id="desk">…windows…</div>
  <nav class="taskbar" data-taskbar-for="desk" aria-label="Taskbar">
    <button class="start-button" type="button" popovertarget="start" aria-haspopup="menu">…</button>
    <div class="taskbar-launchers">
      <button class="taskbar-launcher" type="button" aria-label="Files"><i data-lucide="folder"></i></button>
    </div>
    <div class="taskbar-windows" role="group" aria-label="Open windows"></div>
    <div class="tray" role="group" aria-label="Notification area">…</div>
  </nav>
</div>
```

- `.taskbar-windows` is the runtime's: a `button.taskbar-window` per open
  window (`data-window` = its id) with `.taskbar-window-icon` (the window's
  Lucide icon) and `.taskbar-window-title`.
- `.taskbar-launchers` holds the page's own buttons (what they open is the
  page's); leave it out when there are none.
- The [Start Button](../start-button/component-skill.md) and the
  [Tray](../tray/component-skill.md) are their own components.

## Variants

| Attribute | Effect |
|-----------|--------|
| `data-position="bottom"` (default) / `"top"` / `"left"` / `"right"` | The edge it sits on; left and right make a column with icon-only window buttons |
| `data-align="center"` | Start, launchers and window buttons centred; the Tray stays at the end |
| `--taskbar-size` | Its thickness (default 3rem) |

## States

| State | Meaning |
|-------|---------|
| `default` | The bar; `{ position, align }` move it and line its buttons up |

```js
const bar = document.querySelector('.taskbar');
bar.api.setState('default', { position: 'top', align: 'center' });
bar.api.getState(); // → { name: 'default', config: { position: 'top', align: 'center' } }
```

`render(state)` returns the authored bar with the state's `data-position`
and `data-align`; the window buttons are runtime.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type TaskbarState = 'default'</code> - `setState(name, config)` takes the config of the state it names (`TaskbarStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The bar - where it sits and how its buttons line up. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>position?</code></td><td><code>TaskbarPosition</code></td><td>the edge it sits on (data-position, default bottom)</td></tr><tr><td><code>align?</code></td><td><code>'start' \| 'center'</code></td><td>the window buttons from the start, or centred with the Start Button (data-align, default start)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends TaskbarState&gt;(name: S, config?: TaskbarStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TaskbarStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: TaskbarState; config: TaskbarStateConfigs[TaskbarState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: TaskbarState; config: TaskbarStateConfigs[TaskbarState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: TaskbarState; config: TaskbarStateConfigs[TaskbarState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: TaskbarState; config: TaskbarStateConfigs[TaskbarState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: TaskbarState; config: TaskbarStateConfigs[TaskbarState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.taskbarApi.setState&lt;S extends TaskbarState&gt;(el: HTMLElement, name: S, config?: TaskbarStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TaskbarStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.taskbarApi.getState(el: HTMLElement): { name: TaskbarState; config: TaskbarStateConfigs[TaskbarState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: TaskbarState; config: TaskbarStateConfigs[TaskbarState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.taskbarApi.render(state: { name: TaskbarState; config: TaskbarStateConfigs[TaskbarState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: TaskbarState; config: TaskbarStateConfigs[TaskbarState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.taskbarApi.store(el: HTMLElement): Store&lt;{ name: TaskbarState; config: TaskbarStateConfigs[TaskbarState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: TaskbarState; config: TaskbarStateConfigs[TaskbarState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.taskbarApi.commit&lt;S extends TaskbarState&gt;(el: HTMLElement, name: S, config?: TaskbarStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>TaskbarStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.taskbarStates: TaskbarState[]</code> | The declared states, 'default' first: <code>default</code>. |

### `df$.shadcn.taskbar`

| Member | Description |
|---|---|
| <code>manager(target: string \| HTMLElement): HTMLElement \| null</code> | The Window Manager a taskbar shows. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .taskbar element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - its .window-manager, null when it names none |

### Types

| Type | Description |
|---|---|
| `TaskbarPosition` | Where the bar sits. = <code>'bottom' \| 'top' \| 'left' \| 'right'</code> |

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `aria-label` | `.taskbar` | Names the landmark ("Taskbar") |
| `role="group"` + `aria-label` | `.taskbar-windows` | Names the list of open windows; arrows, Home and End move between them |
| `aria-pressed` | `.taskbar-window` | Set by the runtime: the window in front |
| `title` | `.taskbar-window` | The full title (it is cut short in the bar) |

## Notes

- Binding sets `data-taskbar` on the manager: minimized windows leave the
  desktop for their buttons.
- A click is `df$.shadcn.windowManager.toggle()`: a minimized window comes
  back, the one in front is minimized, any other comes to the front.
