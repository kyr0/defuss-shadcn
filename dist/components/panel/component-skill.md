---
name: Panel
type: MOL
why: A titled .card whose minimize / maximize tools are Swaps - a native checkbox each, so the face and the keyboard are the browser's; the runtime keeps the state in step and makes the panel a border-layout region that folds to its title bar (a vertical tab in west / east) like the ExtJS 4 border layout.
when: Titled, foldable tool areas - a file tree, an inspector, a console, dashboard widgets - and above all the regions of a border layout. A plain content box takes card; a disclosure inside flowing text takes collapsible / accordion; movable floating panes take window.
where: dist/components/panel/panel.css + dist/components/panel/panel.js (+ card, swap)
supportedStates: default, minimized, maximized, closed
---

# Pattern: Panel

## Native basis

A `<section class="card panel">` - the card gives the surface, border and
radius - with a `.panel-header` title bar (optional icon, the title, tools)
and a scrolling `.panel-body`. The minimize and maximize tools are
**Swaps**: a `<label class="swap">` around a hidden checkbox, two faces, no
script - checked = minimized / maximized. The runtime keeps the panel's
state and both checkboxes in step, and makes the panel a citizen of a
**Border Layout**: as a region's pane it folds the region with it -
north / south down to the title bar, west / east to a vertical tab with the
icon, title and restore tool still showing.

---

## Native Web APIs
- [`<input type="checkbox">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox) - the tools' state (via Swap): keyboard (Space), focus, `change`
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the swap faces follow their checkbox
- [`writing-mode`](https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode) - the vertical tab of a minimized west / east panel; logical paddings turn with it
- [`inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert) - the hidden body and a resting divider leave the tab order
- [`rotate`](https://developer.mozilla.org/en-US/docs/Web/CSS/rotate) - the minimize chevron points where the region folds
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `panel-change`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) / [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - motion, contrast and system colours

---

## Structure

```html
<section class="card panel" aria-labelledby="files-title" style="height:16rem">
  <header class="panel-header">
    <i data-lucide="folder" class="panel-icon" aria-hidden="true"></i>
    <h3 class="panel-title" id="files-title">Files</h3>
    <div class="panel-tools">
      <label class="swap panel-maximize">
        <input type="checkbox" aria-label="Maximize Files">
        <span class="swap-off"><i data-lucide="maximize-2"></i></span>
        <span class="swap-on"><i data-lucide="minimize-2"></i></span>
      </label>
      <label class="swap panel-minimize">
        <input type="checkbox" aria-label="Minimize Files">
        <span class="swap-off"><i data-lucide="chevron-up"></i></span>
        <span class="swap-on"><i data-lucide="chevron-down"></i></span>
      </label>
    </div>
  </header>
  <div class="panel-body">…</div>
  <footer class="panel-footer">12 files</footer>
</section>
```

- Both tools are optional; leave one out and that action is gone (a
  panel without `.panel-minimize` ignores the title-bar double-click too).
- **Closable**: a `.panel-close` button in `.panel-tools` (a plain button -
  closing is not a toggle) closes the panel; any
  `<button data-panel-open="panel-id">` opens it again. Closed, the panel is
  `hidden` and, in a border layout, its region and divider go with it - the
  center takes the room. Focus moves to the opener on close and to the
  panel's first tool on open. `data-panel-toggle="id"` does both (close /
  open) and keeps its `aria-expanded` in step.

```html
<button class="btn" data-variant="outline" data-panel-open="inspector">Inspector</button>
<section class="card panel" id="inspector" aria-labelledby="inspector-title">
  <header class="panel-header">
    <h3 class="panel-title" id="inspector-title">Inspector</h3>
    <div class="panel-tools">
      <button type="button" class="btn panel-close" data-variant="ghost" data-size="icon-sm" aria-label="Close Inspector">
        <i data-lucide="x"></i>
      </button>
    </div>
  </header>
  <div class="panel-body">…</div>
</section>
```
- `.panel-icon`, `.panel-footer` are optional; extra tools (`.btn` with
  `data-variant="ghost" data-size="icon-sm"`) go in `.panel-tools`.
- The minimize faces are `chevron-up` (off) / `chevron-down` (on): the CSS
  turns the tool to point where the panel folds (south 180°, west -90°,
  east 90°) - author them once.
- Start folded with `data-minimized` (or a checked swap), filled with
  `data-maximized`.

### In a border layout

The panel is the region's pane - the `.resizer`'s wrapped element (or the
fixed region itself):

```html
<div class="border-layout" style="height:24rem">
  <div class="resizer border-layout-west">
    <section class="card panel" style="width:14rem" aria-labelledby="t-files">…</section>
  </div>
  <main class="border-layout-center">…</main>
  <div class="resizer border-layout-south">
    <section class="card panel" style="height:8rem" aria-labelledby="t-console">…</section>
  </div>
</div>
```

| Region | Minimized |
|--------|-----------|
| `north` / `south` | The region shrinks to the title bar's height |
| `west` / `east` | The title bar turns vertical (icon, title, restore tool) and the region shrinks to its width; maximize hides |
| `center` / outside a layout | The panel is its title bar - the space below is released |

The divider rests (`inert`) while its panel is minimized; the region gets
`data-panel-minimized` (a styling hook). Restoring brings the authored or
dragged size back. Inside a layout the panel drops its own border and
radius - the dividers frame it (`data-divider="gap"` cards it again).

---

## Variants

| Attribute | On | Meaning |
|-----------|----|---------|
| `data-minimized` | `.panel` | Title bar only (set by the runtime; author it to start folded) |
| `data-maximized` | `.panel` | Fills its border layout / `[data-panel-host]` / the viewport |
| `data-title-collapse="false"` | `.panel` | The title-bar double-click does not fold |
| `.panel-close` | a button in `.panel-tools` | Closes the panel (state `closed`) |
| `data-panel-open="id"` | any button | Opens that panel again |
| `data-panel-toggle="id"` | any button | Closes an open panel, opens a closed one; its `aria-expanded` follows the panel |
| `hidden` | `.panel` | Closed (set by the runtime; author it to start closed) |
| `data-flush` | `.panel-body` | No padding - for lists, tables, code |
| `data-panel-host` | any ancestor | What a maximized panel fills (border layouts are hosts already) |
| `data-region` | `.panel` | Set by the runtime: `north` · `south` · `west` · `east` · `center` |

## Sizes

The panel takes its size from the author (`width` / `height`) or from the
region's resizer; the title bar is 2.5rem, the tools 1.75rem with 1rem icons.

---

## Keyboard

| Key | Does |
|-----|------|
| Tab | Reaches each tool (the swaps' checkboxes) |
| Space | Toggles the focused tool |
| Escape | Restores a maximized panel (focus returns to its maximize tool) |

## Events

| Event | Detail | When |
|-------|--------|------|
| `panel-change` | `{ state, previous, region }` | The panel was minimized, maximized, closed or restored (bubbles) |

## Imperative API - `df$.shadcn.panel`

| Method | Does |
|--------|------|
| `minimize(panel)` / `maximize(panel)` / `restore(panel)` | Set the state (an element, an id or a selector) |
| `toggle(panel)` | Minimize or restore; returns whether it is now minimized |
| `close(panel)` / `open(panel)` | Close it / bring it back |

---

## States

| State | Meaning |
|-------|---------|
| `default` | Title bar and body at the authored size |
| `minimized` | The title bar only - in a border layout region, the region folds with it |
| `maximized` | Fills its border layout, `[data-panel-host]` or the viewport |
| `closed` | Gone - `hidden`; in a border layout its region and divider go too |

```js
const panel = df$('#files').get(0);
panel.api.setState('minimized');
panel.api.getState(); // → { name: 'minimized', config: {} }
panel.api.setState('default');
```

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type PanelState = 'default' | 'minimized' | 'maximized' | 'closed'</code> - `setState(name, config)` takes the config of the state it names (`PanelStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The title bar and body at the authored size. No config. |
| `minimized` | The title bar only - in a border layout region, the region folds with it. No config. |
| `maximized` | Fills its border layout, [data-panel-host] or the viewport. No config. |
| `closed` | Gone (hidden) - in a border layout, its region and divider go too. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends PanelState&gt;(name: S, config?: PanelStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>PanelStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: PanelState; config: PanelStateConfigs[PanelState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: PanelState; config: PanelStateConfigs[PanelState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: PanelState; config: PanelStateConfigs[PanelState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: PanelState; config: PanelStateConfigs[PanelState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: PanelState; config: PanelStateConfigs[PanelState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.panelApi.setState&lt;S extends PanelState&gt;(el: HTMLElement, name: S, config?: PanelStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>PanelStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.panelApi.getState(el: HTMLElement): { name: PanelState; config: PanelStateConfigs[PanelState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: PanelState; config: PanelStateConfigs[PanelState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.panelApi.render(state: { name: PanelState; config: PanelStateConfigs[PanelState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: PanelState; config: PanelStateConfigs[PanelState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.panelApi.store(el: HTMLElement): Store&lt;{ name: PanelState; config: PanelStateConfigs[PanelState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: PanelState; config: PanelStateConfigs[PanelState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.panelApi.commit&lt;S extends PanelState&gt;(el: HTMLElement, name: S, config?: PanelStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>PanelStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.panelStates: PanelState[]</code> | The declared states, 'default' first: <code>default</code>, <code>minimized</code>, <code>maximized</code>, <code>closed</code>. |

### `df$.shadcn.panel`

| Member | Description |
|---|---|
| <code>minimize(target: string \| HTMLElement): HTMLElement \| null</code> | Title bar only - in a border layout region, the region shrinks with it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .panel element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the panel, null when the target matches none |
| <code>maximize(target: string \| HTMLElement): HTMLElement \| null</code> | Fills its border layout / [data-panel-host] / the viewport. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .panel element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the panel, null when the target matches none |
| <code>restore(target: string \| HTMLElement): HTMLElement \| null</code> | Back to title bar + body at the authored size. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .panel element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the panel, null when the target matches none |
| <code>close(target: string \| HTMLElement): HTMLElement \| null</code> | Closes the panel (hidden; in a border layout its region goes too). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .panel element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the panel, null when the target matches none |
| <code>open(target: string \| HTMLElement): HTMLElement \| null</code> | Opens a closed panel again (title bar + body). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .panel element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the panel, null when the target matches none |
| <code>toggle(target: string \| HTMLElement): boolean</code> | Minimizes or restores. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .panel element, its id or a selector</td></tr></table> <b>Returns</b> <code>boolean</code> - true when it is minimized now (false also when the target matches no panel) |

### Events

| Event | Description |
|---|---|
| `panel-change` | Fires when the panel changes state - the new state, the previous one and the border-layout region it sits in. <code>detail</code>: <code>PanelChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>'default' \| 'minimized' \| 'maximized' \| 'closed'</code></td><td>the state the panel is in now (a panelStates name: the State API throws on any other, so the dispatch casts its string)</td></tr><tr><td><code>previous</code></td><td><code>'default' \| 'minimized' \| 'maximized' \| 'closed'</code></td><td>the state it left</td></tr><tr><td><code>region</code></td><td><code>'north' \| 'south' \| 'west' \| 'east' \| 'center' \| null</code></td><td>the border-layout region it sits in, null outside a border layout</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `PanelChangeDetail` | What panel-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>'default' \| 'minimized' \| 'maximized' \| 'closed'</code></td><td>the state the panel is in now (a panelStates name: the State API throws on any other, so the dispatch casts its string)</td></tr><tr><td><code>previous</code></td><td><code>'default' \| 'minimized' \| 'maximized' \| 'closed'</code></td><td>the state it left</td></tr><tr><td><code>region</code></td><td><code>'north' \| 'south' \| 'west' \| 'east' \| 'center' \| null</code></td><td>the border-layout region it sits in, null outside a border layout</td></tr></table> |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| `.panel` | `aria-labelledby` → the title | A named region (`<section>`) |
| tool checkboxes | `aria-label` ("Minimize Files", "Maximize Files") | Checked = minimized / maximized; the minimize tool gets `aria-controls` → the body |
| `.panel-body` | `inert` while minimized | Set by the runtime |
| `.panel-icon` | `aria-hidden="true"` | Decorative |

## Notes

- Load card.css and swap.css with it (all.css has them).
- A panel as a region pane needs nothing extra: the runtime finds its
  region (`data-region`) at init.
- Nested layouts: a maximized panel fills its nearest border layout.
