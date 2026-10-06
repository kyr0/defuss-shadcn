---
name: Border Layout
type: ORG
why: A CSS grid with named areas places north, south, west and east around a center; each resizable region reuses the Resizer (pointer capture, keyboard, clamps) with its handle redrawn as a full-length divider - the runtime adds the layout rules: the center's minimum, collapsing, remembered sizes.
when: Application frames - an editor with a file tree and a terminal, a mail client, a dashboard with an inspector; any split that the user should be able to resize: two panes side by side (horizontal split), stacked (vertical split), three columns, nested splits. A single resizable box takes resizer; fixed columns take the grid utilities.
where: dist/components/border-layout/border-layout.css + dist/components/border-layout/border-layout.js (+ the resizer)
supportedStates: default, collapsed
---

# Pattern: Border Layout

## Native basis

A `.border-layout` CSS grid with five named areas - `north`, `south`,
`west`, `east`, `center` (after Java's BorderLayout, shadcn's Resizable
covers the same ground). A side region that should resize is a
**`.resizer`** wrapping its pane: inside a border layout the resizer's one
handle becomes a full-length divider on the region's inner edge - dragged
with pointer capture, moved with the arrow keys (`data-keys="edge"`), a
`role="separator"` with its splitter values. Regions you leave out take no
room, so the same frame is a horizontal split, a vertical split, three
columns or the full five.

---

## Native Web APIs
- [CSS grid `grid-template-areas`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-areas) - the five regions; `data-dominant` swaps which sides span
- [`setPointerCapture()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - the drag (the Resizer's)
- [`role="separator"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/separator_role) + [`aria-valuenow`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-valuenow) - each divider is a window splitter; its value is the region size
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - the frame shrinks: sides give way so the center keeps its minimum
- [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) - `data-save` remembers sizes and folded regions (through a `persisted()` defuss-store store: validated, memory when storage is blocked)
- [`border-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/border-style) - dashed, dotted, double dividers
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) / [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - system-colour and full-contrast dividers

---

## Structure

```html
<div class="border-layout" style="height: 24rem">
  <div class="resizer border-layout-north"><header class="border-layout-pane" style="height:3rem">North</header></div>
  <div class="resizer border-layout-west"><nav class="border-layout-pane" style="width:14rem" aria-label="Files">West</nav></div>
  <main class="border-layout-center border-layout-pane">Center</main>
  <div class="resizer border-layout-east"><aside class="border-layout-pane" style="width:12rem" aria-label="Inspector">East</aside></div>
  <div class="resizer border-layout-south"><footer class="border-layout-pane" style="height:6rem">South</footer></div>
</div>
```

- Give the layout a height (or put it in a sized box): the center takes
  what the sides leave.
- The pane's own `width` (west/east) or `height` (north/south) is its
  starting size; dragging writes px there.
- The runtime sets each region's resizer up - `data-handles` (the inner
  edge), `data-axis`, `data-keys="edge"`, `data-min="48"` - unless you author
  them; authored `data-min` / `data-max` bound the drag.
- A region without `.resizer` is fixed (a static divider line); leave a
  region out entirely and it takes no room.
- `.border-layout-pane` adds padding for text panes (optional).

### Splits

```html
<!-- horizontal split: two panes side by side -->
<div class="border-layout">
  <div class="resizer border-layout-west"><div style="width:50%">One</div></div>
  <div class="border-layout-center">Two</div>
</div>

<!-- vertical split: two panes stacked -->
<div class="border-layout">
  <div class="resizer border-layout-north"><div style="height:50%">One</div></div>
  <div class="border-layout-center">Two</div>
</div>
```

Nest a border layout in a center (with `data-frame="none"`) for more.

---

## Layout (on `.border-layout`)

| Attribute | Default | Meaning |
|-----------|---------|---------|
| `data-dominant` | `ns` | `ns`: north and south span the full width; `we`: west and east span the full height |
| `data-center-min` | `120` | px the center always keeps - sides stop there, and give way when the frame shrinks |
| `data-collapsible` | - | Every region folds (double-click its divider, or Enter on it); per region: `data-collapsible` on its resizer |
| `data-save` | - | A key: sizes and folded regions are remembered (a persisted store in `localStorage`) |
| `data-frame="none"` | - | No border / radius / surface - fills a window or a nested center |

## Dividers

| Attribute (layout or one region) | Values |
|----------------------------------|--------|
| `data-divider` | `solid` (default) · `dashed` · `dotted` · `double` · `thick` · `none` (invisible, still draggable) · `gap` (layout only - regions float as cards in a gutter) |
| `data-grip` | `dots` (a small dotted card) · `bar` (a pill) · `none` |

| Custom property | Default | For |
|-----------------|---------|-----|
| `--border-layout-divider-color` | `var(--border)` | the line |
| `--border-layout-divider-width` | `1px` | the line (dotted 2px, double / thick 4px) |
| `--border-layout-accent` | `var(--ring)` | hover, focus, drag |

A custom handle is plain CSS on top: the divider is
`.border-layout > .resizer > .resizer-handle` (`::before` = the line,
`::after` = the grip).

---

## Keyboard

| Key (divider focused) | Does |
|-----------------------|------|
| ← → / ↑ ↓ | Move the divider 10px the way the arrow points (Shift: 100px) |
| Home / End | Region to its minimum / maximum |
| Enter | Fold / unfold (collapsible regions) |

## Events

| Event | Detail | When |
|-------|--------|------|
| `resizer-resize` | `{ axis, width, height }` | A region resized (the Resizer's, bubbles to the layout) |
| `border-layout-collapse` | `{ region, collapsed }` | A region folded or unfolded |

## Imperative API - `df$.shadcn.borderLayout`

| Method | Does |
|--------|------|
| `collapse(layout, 'west')` / `expand(layout, 'west')` / `toggle(layout, 'west')` | Fold / unfold a region |
| `resize(layout, 'west', 280)` | Set a region's size in px (clamped) |
| `sizes(layout)` | `{ north, south, west, east }` in px (0 when folded) |

---

## States

| State | Meaning |
|-------|---------|
| `default` | Every region open; setting it restores the authored sizes |
| `collapsed` | One or more regions folded - `{ regions: ['west', 'south'] }` or `{ region: 'west' }` |

```js
const layout = df$('#ide').get(0);
layout.api.setState('collapsed', { regions: ['east'] });
layout.api.getState(); // → { name: 'collapsed', config: { regions: ['east'] } }
layout.api.setState('default');
```

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type BorderLayoutState = 'default' | 'collapsed'</code> - `setState(name, config)` takes the config of the state it names (`BorderLayoutStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Every region open at its authored size. No config. |
| `collapsed` | One or more regions folded away (their dividers stay). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>regions?</code></td><td><code>BorderLayoutSide[]</code></td><td>the regions to fold</td></tr><tr><td><code>region?</code></td><td><code>BorderLayoutSide</code></td><td>one region to fold (when regions is not given)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends BorderLayoutState&gt;(name: S, config?: BorderLayoutStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>BorderLayoutStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: BorderLayoutState; config: BorderLayoutStateConfigs[BorderLayoutState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: BorderLayoutState; config: BorderLayoutStateConfigs[BorderLayoutState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: BorderLayoutState; config: BorderLayoutStateConfigs[BorderLayoutState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: BorderLayoutState; config: BorderLayoutStateConfigs[BorderLayoutState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: BorderLayoutState; config: BorderLayoutStateConfigs[BorderLayoutState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.borderLayoutApi.setState&lt;S extends BorderLayoutState&gt;(el: HTMLElement, name: S, config?: BorderLayoutStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>BorderLayoutStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.borderLayoutApi.getState(el: HTMLElement): { name: BorderLayoutState; config: BorderLayoutStateConfigs[BorderLayoutState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: BorderLayoutState; config: BorderLayoutStateConfigs[BorderLayoutState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.borderLayoutApi.render(state: { name: BorderLayoutState; config: BorderLayoutStateConfigs[BorderLayoutState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: BorderLayoutState; config: BorderLayoutStateConfigs[BorderLayoutState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.borderLayoutApi.store(el: HTMLElement): Store&lt;{ name: BorderLayoutState; config: BorderLayoutStateConfigs[BorderLayoutState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: BorderLayoutState; config: BorderLayoutStateConfigs[BorderLayoutState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.borderLayoutApi.commit&lt;S extends BorderLayoutState&gt;(el: HTMLElement, name: S, config?: BorderLayoutStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>BorderLayoutStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.borderLayoutStates: BorderLayoutState[]</code> | The declared states, 'default' first: <code>default</code>, <code>collapsed</code>. |

### `df$.shadcn.borderLayout`

| Member | Description |
|---|---|
| <code>collapse(target: string \| HTMLElement, side: BorderLayoutSide): void</code> | Folds a region away (its divider stays). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .border-layout element, its id or a selector</td></tr><tr><td><code>side</code></td><td><code>BorderLayoutSide</code></td><td>the region</td></tr></table> |
| <code>expand(target: string \| HTMLElement, side: BorderLayoutSide): void</code> | Brings a folded region back. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .border-layout element, its id or a selector</td></tr><tr><td><code>side</code></td><td><code>BorderLayoutSide</code></td><td>the region</td></tr></table> |
| <code>toggle(target: string \| HTMLElement, side: BorderLayoutSide): boolean</code> | Folds or unfolds a region. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .border-layout element, its id or a selector</td></tr><tr><td><code>side</code></td><td><code>BorderLayoutSide</code></td><td>the region</td></tr></table> <b>Returns</b> <code>boolean</code> - true when the region is collapsed now (false also when the layout has no such region) |
| <code>resize(target: string \| HTMLElement, side: BorderLayoutSide, px: number): void</code> | Sets a region's size (clamped by the resizer's limits). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .border-layout element, its id or a selector</td></tr><tr><td><code>side</code></td><td><code>BorderLayoutSide</code></td><td>the region</td></tr><tr><td><code>px</code></td><td><code>number</code></td><td>the width (west / east) or height (north / south) in px</td></tr></table> |
| <code>sizes(target: string \| HTMLElement): Partial&lt;Record&lt;BorderLayoutSide, number&gt;&gt;</code> | The current sizes: { west: 240, east: 0 (collapsed), ... }. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .border-layout element, its id or a selector</td></tr></table> <b>Returns</b> <code>Partial&lt;Record&lt;BorderLayoutSide, number&gt;&gt;</code> - px per region the layout has - 0 for a collapsed one |

### Events

| Event | Description |
|---|---|
| `border-layout-collapse` | Fires when a region folds away or comes back - which region, and whether it is collapsed now. <code>detail</code>: <code>BorderLayoutCollapseDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>region</code></td><td><code>BorderLayoutSide</code></td><td>the region that folded or came back</td></tr><tr><td><code>collapsed</code></td><td><code>boolean</code></td><td>whether it is collapsed now</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `BorderLayoutCollapseDetail` | What border-layout-collapse carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>region</code></td><td><code>BorderLayoutSide</code></td><td>the region that folded or came back</td></tr><tr><td><code>collapsed</code></td><td><code>boolean</code></td><td>whether it is collapsed now</td></tr></table> |
| `BorderLayoutSide` | A region that folds and resizes - the center takes what is left. = <code>'north' \| 'south' \| 'west' \| 'east'</code> |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| divider | `role="separator"`, `aria-label="Resize {region}"`, `aria-controls` → the pane, `aria-valuenow` / `-min` / `-max` | The window-splitter pattern; set by the runtime (the name comes from the region's `aria-label`) |
| panes | landmarks (`<nav>`, `<main>`, `<aside>`...) with `aria-label` | Name side panes - the divider labels reuse the name |

## Notes

- Built on the Resizer: load `resizer.js` too (all.js has both).
- Percent sizes work as a start (`width: 30%`); a drag writes px.
- Nested layouts: each divider belongs to its own layout (`>` selectors).
