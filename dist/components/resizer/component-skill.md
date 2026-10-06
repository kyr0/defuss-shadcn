---
name: Resizer
type: ATM
why: Pointer capture + box geometry give edge/corner drag handles for any single container - with a classes mode that keeps sizing declarative (the sizing.css ladder stays the source of truth).
when: When a demo surface, canvas, or panel must be user-resizable on more than the native CSS `resize` corner - or when the size should stay expressed as w-/h- classes instead of inline px.
where: dist/components/resizer/resizer.css + dist/components/resizer/resizer.js
supportedStates: default
---

Wraps exactly **one** container element (the wrapper's first element child) and
adds draggable resize handles on any subset of its 8 positions.

## Native basis

Pointer Events (pointer capture) drive the drag; `getBoundingClientRect()` reads
the box; sizing mode "classes" mutates the element's `class` so the shipped
`sizing.css` utilities stay the single source of size truth. Keyboard parity
uses plain keydown handling on `role="separator"` handles.

## Native Web APIs

- [Pointer Events (`setPointerCapture`)](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - drag continues outside the handle, no document-level listeners
- [`lostpointercapture`](https://developer.mozilla.org/en-US/docs/Web/API/Element/lostpointercapture_event) + `buttons === 0` move guard - a release the document cannot see (outside an iframe) still ends the drag
- [`touch-action: none`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) - the browser yields the gesture to the drag
- [`role="separator"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/separator_role) - a resizable divider is exactly what the ARIA role describes
- [KeyboardEvents](https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event) - arrow-key resize parity for every handle
- [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - `data-width`/`data-height` writes (CodeExample State panel) apply back into the box
- [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `resizer-resize` lets consumers (e.g. the CodeExample toolbar) mirror live sizes

## Structure

```html
<div class="resizer" data-handles="all" data-resize-mode="px" data-min="120">
  <div class="card" style="width:20rem;height:12rem;">…the ONE wrapped element…</div>
</div>
```

The runtime appends the handles (`data-ce-chrome` marked - sandbox-safe):

```html
<span class="resizer-handle" data-handle="se" role="separator" tabindex="0" aria-label="Resize bottom-right corner"></span>
```

## Variants (data attributes on the wrapper)

| Attribute | Values | Default | Behavior |
| --- | --- | --- | --- |
| `data-handles` | space list of `n e s w ne nw se sw`, or `all` | `se` | which handles get placed |
| `data-resize-mode` | `px` \| `classes` \| `controlled` | `px` | inline px / w-N-h-N classes (sizing.css ladder, integer steps 16–96) / size owned by the consumer via `resizer-resize` events |
| `data-axis` | `both` \| `w` \| `h` | `both` | which axes any handle resizes |
| `data-variant` | `divider` | - | a split pane's edge: edge handles become full-length strips, invisible until hovered / focused / dragged (then a thin line), no dashed outline while resizing, and a double-click on a handle resets to the authored size. Corners keep their chip |
| `data-keys` | `edge` | - | the arrows move the handle's edge (a divider - the window-splitter pattern): ArrowLeft grows a box from its `w` handle, ArrowDown from its `s` handle. Without it ArrowRight/Up grow |
| `data-min` / `data-max` | px | `80` / `2000` | shared clamp; per-axis `data-min-w`/`data-max-w`/`data-min-h`/`data-max-h` override |
| `data-step` | px | `1` | drag quantization (px mode) |
| `data-w-classes` / `data-h-classes` | space list of tokens | integer `w-16…w-96` | custom classes-mode ladder |
| `data-width` / `data-height` | px (written by runtime) | - | observation mirror; external writes are applied back |

## States

Named states via the shared State API (AGENTS.md "State API"), bound per instance:
`default` (the authored size, snapshotted at init; accepts a `{ width, height }`
px config).

```js
document.querySelector('#panel').api.setState('default');           // authored size
document.querySelector('#panel').api.setState('default', { width: 320 });
document.querySelector('#panel').api.getState(); // { name: 'default', config: { width, height, mode } }
```

Actions (schema contract): `reset` dispatches `resizer-reset` on the wrapper,
equivalent to `setState('default')`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ResizerState = 'default'</code> - `setState(name, config)` takes the config of the state it names (`ResizerStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The panes at a size; no config restores the authored one. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>width?</code></td><td><code>number</code></td><td>the resized pane's width, px</td></tr><tr><td><code>height?</code></td><td><code>number</code></td><td>its height, px</td></tr><tr><td><code>mode?</code></td><td><code>string</code></td><td>reported by getState(): how the size is applied (data-resize-mode: px, classes or controlled)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ResizerState&gt;(name: S, config?: ResizerStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ResizerStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ResizerState; config: ResizerStateConfigs[ResizerState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ResizerState; config: ResizerStateConfigs[ResizerState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ResizerState; config: ResizerStateConfigs[ResizerState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ResizerState; config: ResizerStateConfigs[ResizerState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ResizerState; config: ResizerStateConfigs[ResizerState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.resizerApi.setState&lt;S extends ResizerState&gt;(el: HTMLElement, name: S, config?: ResizerStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ResizerStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.resizerApi.getState(el: HTMLElement): { name: ResizerState; config: ResizerStateConfigs[ResizerState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ResizerState; config: ResizerStateConfigs[ResizerState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.resizerApi.render(state: { name: ResizerState; config: ResizerStateConfigs[ResizerState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ResizerState; config: ResizerStateConfigs[ResizerState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.resizerApi.store(el: HTMLElement): Store&lt;{ name: ResizerState; config: ResizerStateConfigs[ResizerState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ResizerState; config: ResizerStateConfigs[ResizerState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.resizerApi.commit&lt;S extends ResizerState&gt;(el: HTMLElement, name: S, config?: ResizerStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ResizerStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.resizerStates: ResizerState[]</code> | The declared states, 'default' first: <code>default</code>. |

### Events

| Event | Description |
|---|---|
| `resizer-resize` | Fires while the divider moves (pointer or keys) - the axis and the new width / height. <code>detail</code>: <code>ResizerResizeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>axis</code></td><td><code>'w' \| 'h'</code></td><td>the axis that moved: 'w' (width) or 'h' (height)</td></tr><tr><td><code>width</code></td><td><code>number</code></td><td>the resized pane's width now, px</td></tr><tr><td><code>height</code></td><td><code>number</code></td><td>its height now, px</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `ResizerResizeDetail` | What resizer-resize carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>axis</code></td><td><code>'w' \| 'h'</code></td><td>the axis that moved: 'w' (width) or 'h' (height)</td></tr><tr><td><code>width</code></td><td><code>number</code></td><td>the resized pane's width now, px</td></tr><tr><td><code>height</code></td><td><code>number</code></td><td>its height now, px</td></tr></table> |

## ARIA

| Aspect | Handling |
| --- | --- |
| Handle role | `role="separator"` + `aria-label` naming the position (edge handles also get `aria-orientation`) |
| Keyboard | Tab focuses handles; ArrowRight/Up grow, ArrowLeft/Down shrink (Shift ×10); Home/End jump to min/max. With `data-keys="edge"` an edge handle moves with the arrow that points its way |
| Drag feedback | wrapper gets `data-resizing` - dashed outline + active handle highlight |

## Notes

- **A split pane:** `data-variant="divider" data-handles="e" data-axis="w" data-keys="edge"` on the wrapper of a sidebar or list column - drag or arrow keys move the edge, a double-click restores the authored width. Give the wrapper the column's height (`height: 100%` in a grid or a stretched flex item) so the strip runs the full length.

- The wrapper must have exactly one element child - init skips empty wrappers.
  Inline `style="resize:none"` on the child neutralizes native CSS resize (the
  runtime also sets it); side/top-edge handles need the wrapper's `overflow`
  to stay visible (default).
- Classes mode measures each ladder token once (cached) and picks the nearest;
  authored `w-*`/`h-*` classes outside the ladder are left alone.
- Controlled mode fires `resizer-resize` (`detail: { axis, width, height }`) and
  writes nothing - the CodeExample preview toolbar uses this to drive the
  sandbox iframe size from any of 8 handles.
- The `data-width`/`data-height` mirror updates on every applied change
  (drag, keyboard, panel edit, setState) - that is what the machine contract
  (`resizer.schema.json`) observes.
- Pointer capture is **document-scoped**: a drag started inside an iframe and
  released over the parent page produces no `pointerup` here. The drag ends
  anyway via three guards - `lostpointercapture`, a captured `pointermove`
  with `buttons === 0`, and a document-level `pointercancel` (which the
  CodeExample sandbox bridge dispatches when the HOST reports the release).
  Without them the example would stay "stuck resizing" until the next click.
