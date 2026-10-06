---
name: Sortable
type: ATM
why: Native HTML drag-and-drop reordering with a handle and a drop indicator.
when: Lists whose order the user controls - todo lists, table row ordering.
where: dist/components/sortable/sortable.css + dist/components/sortable/sortable.js
supportedStates: default
---

# Sortable

## Native basis

HTML Drag and Drop API + keyboard reordering for accessible drag-and-drop lists. Uses native `draggable`, `DataTransfer`, and DOM manipulation - no SortableJS or drag libraries.

## Native Web APIs

- [Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) - native drag/drop with `dragstart`, `dragover`, `drop`, `dragend` events
- [`draggable`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/draggable) - makes elements natively draggable
- [`DataTransfer`](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer) - drag operation data and `effectAllowed`/`dropEffect`
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `sortable-change` event dispatched on reorder
- [`aria-live`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-live) - live region announces position changes to screen readers
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus ring on items
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses transitions
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - Windows High Contrast Mode support
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - enhanced contrast support

## Structure

### Default (vertical)

```html
<ul class="sortable" role="listbox" aria-label="Reorder items">
  <li class="sortable-item" draggable="true" role="option" tabindex="0">
    <span class="sortable-handle"><i data-lucide="grip-vertical"></i></span>
    <span>Item 1</span>
  </li>
  <li class="sortable-item" draggable="true" role="option" tabindex="-1">
    <span class="sortable-handle"><i data-lucide="grip-vertical"></i></span>
    <span>Item 2</span>
  </li>
  <li class="sortable-item" draggable="true" role="option" tabindex="-1">
    <span class="sortable-handle"><i data-lucide="grip-vertical"></i></span>
    <span>Item 3</span>
  </li>
</ul>
```

### Horizontal

```html
<ul class="sortable" role="listbox" aria-label="Reorder items" data-orientation="horizontal">
  <li class="sortable-item" draggable="true" role="option" tabindex="0">
    <span>Item A</span>
  </li>
  <li class="sortable-item" draggable="true" role="option" tabindex="-1">
    <span>Item B</span>
  </li>
</ul>
```

### Disabled item

```html
<li class="sortable-item" aria-disabled="true" tabindex="-1">
  <span class="sortable-handle"><i data-lucide="grip-vertical"></i></span>
  <span>Locked item</span>
</li>
```

### Move buttons (tap / click reordering)
Native drag-and-drop mostly never starts on touch screens. Give every item
Up / Down buttons and the list can be sorted by tapping - and without a
mouse, visibly, next to the `Alt + Arrow` shortcut.
```html
<ul class="sortable" aria-label="Task priority">
  <li class="sortable-item" draggable="true" tabindex="0">
    <span class="sortable-handle">⋮⋮</span>
    <span>Build components</span>
    <span class="sortable-moves">
      <button type="button" class="sortable-move" data-move="up"><svg aria-hidden="true">…</svg></button>
      <button type="button" class="sortable-move" data-move="down"><svg aria-hidden="true">…</svg></button>
    </span>
  </li>
</ul>
```
- `data-move="up"` = one slot earlier, `"down"` = one slot later (left / right in a horizontal list). Locked slots are stepped over, like every move.
- The JS disables Up on the first movable item and Down on the last (re-synced after every move), and labels an unlabelled button "Move {item} up/down".
- Focus stays on the pressed button, so repeated taps keep moving the same item; when the move disables it (list edge), focus passes to its twin.
- Buttons grow to 44px under `pointer: coarse` (touch). Do not put them in `role="option"` items - interactive content inside an option is invalid ARIA; a plain `<ul>`/`<li>` list is right here.

### Connected lists (`data-group`)
Lists with the same `data-group` exchange items - drag from one to the
other, and reorder inside each.
```html
<ul class="sortable" aria-label="Backlog" data-group="tasks" data-empty="Drop tasks here">…</ul>
<ul class="sortable" aria-label="Done" data-group="tasks" data-empty="Drop tasks here">…</ul>
```
- Drop on a row = before / after it; drop on the list's free space (gap, padding, empty list) = at the end (the list shows a dashed outline while you hover it).
- An empty grouped list keeps a height and becomes a dashed drop zone; `data-empty` is its text.
- Keyboard: `Alt` + the cross-axis arrow (`Alt + →` / `Alt + ←` for vertical lists, `Alt + ↓` / `Alt + ↑` for horizontal) moves the focused item to the next / previous list of the group (document order), at the same position.
- The `aria-label` of each list names it in the announcement ("Write tests, moved to Done, position 3 of 3").

## Orientation

| `data-orientation` | Direction | Nav keys | Reorder keys |
| --- | --- | --- | --- |
| _(default)_ | Vertical (column) | `↑` / `↓` | `Alt + ↑` / `Alt + ↓` |
| `horizontal` | Horizontal (row) | `←` / `→` | `Alt + ←` / `Alt + →` |

## Density

Set `data-density` on the `.sortable` root; list gap and item padding scale.

| Value | Effect |
| --- | --- |
| `compact` | Gap 0.125rem, item padding 0.375rem 0.5rem |
| `comfortable` | 0.25rem / 0.5rem 0.75rem - identical to the unsized default |
| `spacious` | 0.375rem / 0.625rem 1rem |

## States

| `data-*` / attribute | Element | Visual |
| --- | --- | --- |
| `data-dragging` | `.sortable-item` | Reduced opacity + shadow + dashed border |
| `data-over="before"` | `.sortable-item` | Primary-colored top (or start) border |
| `data-over="after"` | `.sortable-item` | Primary-colored bottom (or end) border |
| `data-active` | `.sortable-item` | Ring border + accent background (keyboard focus) |
| `aria-disabled="true"` | `.sortable-item` | Reduced opacity, not draggable, keeps its position (fixed slot) |

### State API

The list's observable state is its item order plus the active item. Declared
states: `default` (restores the authored order after any moves; `{ index }`
activates one item). `getState().config` reports the live `order` (labels)
and `activeIndex`.

```js
document.querySelector('#tasks').api.setState('default');
document.querySelector('#tasks').api.getState(); // { name: 'default', config: { order: [...], activeIndex: -1 } }
```

The api is bound per list; the registry global is
`df$.shadcn.sortableApi` / `df$.shadcn.sortableStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type SortableState = 'default'</code> - `setState(name, config)` takes the config of the state it names (`SortableStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The authored order (setting it restores that order). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>index?</code></td><td><code>number</code></td><td>the item to make active (roving focus), 0-based</td></tr><tr><td><code>order?</code></td><td><code>string[]</code></td><td>reported by getState(): the items' labels in the current order</td></tr><tr><td><code>activeIndex?</code></td><td><code>number</code></td><td>reported by getState(): the active item's index, -1 for none</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends SortableState&gt;(name: S, config?: SortableStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>SortableStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: SortableState; config: SortableStateConfigs[SortableState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: SortableState; config: SortableStateConfigs[SortableState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: SortableState; config: SortableStateConfigs[SortableState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: SortableState; config: SortableStateConfigs[SortableState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: SortableState; config: SortableStateConfigs[SortableState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.sortableApi.setState&lt;S extends SortableState&gt;(el: HTMLElement, name: S, config?: SortableStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>SortableStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.sortableApi.getState(el: HTMLElement): { name: SortableState; config: SortableStateConfigs[SortableState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: SortableState; config: SortableStateConfigs[SortableState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.sortableApi.render(state: { name: SortableState; config: SortableStateConfigs[SortableState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: SortableState; config: SortableStateConfigs[SortableState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.sortableApi.store(el: HTMLElement): Store&lt;{ name: SortableState; config: SortableStateConfigs[SortableState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: SortableState; config: SortableStateConfigs[SortableState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.sortableApi.commit&lt;S extends SortableState&gt;(el: HTMLElement, name: S, config?: SortableStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>SortableStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.sortableStates: SortableState[]</code> | The declared states, 'default' first: <code>default</code>. |

### Events

| Event | Description |
|---|---|
| `sortable-change` | Fires after a move (drag or keyboard) - the item, its new index, and the positions it moved from and to. <code>detail</code>: <code>SortableChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>item</code></td><td><code>HTMLElement</code></td><td>the item that moved</td></tr><tr><td><code>index</code></td><td><code>number</code></td><td>its index in this list now; -1 on the list it left</td></tr><tr><td><code>from?</code></td><td><code>HTMLElement</code></td><td>a move between lists, on the list it joined: the list it came from</td></tr><tr><td><code>to?</code></td><td><code>HTMLElement \| null</code></td><td>a move between lists, on the list it left: the list it went to</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `SortableChangeDetail` | What sortable-change carries - one event per list a move touches. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>item</code></td><td><code>HTMLElement</code></td><td>the item that moved</td></tr><tr><td><code>index</code></td><td><code>number</code></td><td>its index in this list now; -1 on the list it left</td></tr><tr><td><code>from?</code></td><td><code>HTMLElement</code></td><td>a move between lists, on the list it joined: the list it came from</td></tr><tr><td><code>to?</code></td><td><code>HTMLElement \| null</code></td><td>a move between lists, on the list it left: the list it went to</td></tr></table> |

## Keyboard

| Key | Action |
| --- | --- |
| `↓` / `→` | Move focus to next item |
| `↑` / `←` | Move focus to previous item |
| `Home` | Move focus to first item |
| `End` | Move focus to last item |
| `Alt + ↓` / `Alt + →` | Move focused item down / right |
| `Alt + ↑` / `Alt + ←` | Move focused item up / left |
| `Alt + →` / `Alt + ←` (vertical, `data-group`) | Move focused item to the next / previous connected list |
| `Enter` / `Space` on a `.sortable-move` | Move the item one slot up / down (focus stays on the button) |

Arrow direction depends on orientation - vertical uses `↑`/`↓`, horizontal uses `←`/`→`.

## ARIA

| Attribute | Element | Purpose |
| --- | --- | --- |
| `role="listbox"` | `.sortable` | Identifies container as a reorderable list |
| `aria-label` | `.sortable` | Accessible name for the list |
| `role="option"` | `.sortable-item` | Individual draggable item |
| `draggable="true"` | `.sortable-item` | Enables native drag |
| `tabindex` | `.sortable-item` | Roving tabindex: `0` on active, `-1` on others |
| `aria-disabled="true"` | `.sortable-item` | Marks item as non-interactive and locks its position |
| `aria-live="assertive"` | `.sortable-live` | Live region announces reorder to screen readers |

## Events

| Event | Target | `detail` |
| --- | --- | --- |
| `sortable-change` | `.sortable` | `{ item: HTMLElement, index: number }` - `index` is the item's new position in the full list, locked items included |
| `sortable-change` (connected lists) | receiving `.sortable` | `{ item, index, from }` - `from` is the list the item came from |
| `sortable-change` (connected lists) | the list it left | `{ item, index: -1, to }` - `to` is the list it went to |

Dispatched via `CustomEvent` after every reorder (drag-drop, keyboard or move button).

## Notes

- JS handles `dragstart`, `dragend`, `dragover`, `dragleave`, and `drop` for mouse/touch reordering.
- Keyboard reordering uses `Alt + Arrow` following the WAI-ARIA APG rearrangeable listbox pattern.
- A `.sortable-live` region is auto-created by JS if not present in the markup.
- `user-select: none` prevents text selection during drag.
- `cursor: grab` / `cursor: grabbing` provides visual feedback.
- Drop position is calculated from pointer midpoint - items drop before or after the target.
- `prefers-reduced-motion: reduce` suppresses transitions.
- `forced-colors: active` maps to system colors for High Contrast Mode.
- Disabled items (`aria-disabled="true"`) are skipped by keyboard navigation and cannot be dragged - and they **keep their position**. A locked item is a fixed slot: the other items move around it, never push it. Moving an item onto a locked slot (Alt+Arrow, or dropping on its position) continues to the next free slot in the direction of travel, and the item on the other side shifts across - so a locked row in the middle stays a fixed divider and the groups above and below keep their size. At the list's edge (nothing free beyond the lock) the move is a no-op.
- The `sortable-change` event bubbles so ancestors can listen for reorder events.
