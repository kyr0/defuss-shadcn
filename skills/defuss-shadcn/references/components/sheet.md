---
name: Sheet
type: MOL
section: overlays
why: A <dialog> variant that slides in from an edge - native modal semantics with transform-only animation.
when: Off-canvas panels: mobile menus, filter drawers, detail side panels.
where: dist/components/sheet/sheet.css + dist/components/sheet/sheet.js
supportedStates: default, open
---

# Pattern: Sheet

## Native basis
`<dialog>` element + `showModal()`. Same native benefits as Dialog:
- Focus trap (automatically)
- Escape key to close (automatically)
- `::backdrop` for overlay
- `aria-modal` behavior when opened with `showModal()`

A sheet is a dialog variant that slides in from an edge of the screen.
Uses `data-side` attribute to control which edge: `top`, `right`, `bottom`, `left`.

---

## Native Web APIs
- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) - native modal element with built-in focus trap and Escape-to-close
- [`HTMLDialogElement.showModal()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) - opens sheet as modal in the top layer with backdrop
- [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop) - pseudo-element for the overlay behind the sheet
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - defines entry animation starting values for slide-in transition

---

## Structure

```html
<!-- Trigger -->
<button class="btn" data-variant="outline"
        data-sheet-trigger="my-sheet"
        aria-haspopup="dialog">
  Open Sheet
</button>

<!-- Sheet -->
<dialog id="my-sheet"
        class="sheet"
        data-side="right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-sheet-title">

  <div class="sheet-content">
    <div class="sheet-header">
      <h2 class="sheet-title" id="my-sheet-title">Sheet Title</h2>
      <p class="sheet-description">Supporting description.</p>
    </div>

    <div class="sheet-body">
      <!-- Content goes here -->
    </div>

    <div class="sheet-footer">
      <button class="btn" data-variant="outline" data-sheet-close>
        Cancel
      </button>
      <button class="btn" data-variant="default">
        Save changes
      </button>
    </div>
  </div>

  <button class="sheet-close-x" data-sheet-close aria-label="Close">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  </button>
</dialog>
```

---

## Sides

| `data-side` | Behavior                           |
|-------------|------------------------------------|
| `right`     | Slides in from right edge (default) |
| `left`      | Slides in from left edge            |
| `top`       | Slides down from top edge           |
| `bottom`    | Slides up from bottom edge          |

---


## Density

Set `data-density` on the `.sheet` root. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | content padding 1rem |
| `comfortable` | content padding 1.5rem - identical to the unsized default |
| `spacious` | content padding 2rem |

## ARIA

| Attribute            | Element          | Value                |
|----------------------|------------------|----------------------|
| `role="dialog"`      | `<dialog>`       | Identifies as dialog |
| `aria-modal="true"`  | `<dialog>`       | Content behind is inert |
| `aria-labelledby`    | `<dialog>`       | Points to title `id` |
| `aria-haspopup="dialog"` | trigger     | Indicates dialog will open |
| `aria-label="Close"` | `sheet-close-x`  | Labels the X button  |

---

## Wiring conventions

- `data-sheet-trigger="[id]"` on any element → opens that sheet
- `data-sheet-close` on any element inside → closes the sheet
- Click on backdrop → closes (click lands on `<dialog>` itself)
- Place `<dialog>` elements as direct children of `<body>`

---

## States

Declared states: `default` (closed) · `open` (shown modally via showModal()).

```js
document.querySelector('#sheet-right').api.setState('open');
document.querySelector('#sheet-right').api.getState(); // { name: 'open', config: {} }
```

The api is bound per sheet element; the registry global is
`df$.shadcn.sheetApi` / `df$.shadcn.sheetStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type SheetState = 'default' | 'open'</code> - `setState(name, config)` takes the config of the state it names (`SheetStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Closed. No config. |
| `open` | Open as a modal panel from its side (showModal()). No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends SheetState&gt;(name: S, config?: SheetStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>SheetStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: SheetState; config: SheetStateConfigs[SheetState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: SheetState; config: SheetStateConfigs[SheetState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: SheetState; config: SheetStateConfigs[SheetState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: SheetState; config: SheetStateConfigs[SheetState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: SheetState; config: SheetStateConfigs[SheetState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.sheetApi.setState&lt;S extends SheetState&gt;(el: HTMLElement, name: S, config?: SheetStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>SheetStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.sheetApi.getState(el: HTMLElement): { name: SheetState; config: SheetStateConfigs[SheetState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: SheetState; config: SheetStateConfigs[SheetState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.sheetApi.render(state: { name: SheetState; config: SheetStateConfigs[SheetState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: SheetState; config: SheetStateConfigs[SheetState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.sheetApi.store(el: HTMLElement): Store&lt;{ name: SheetState; config: SheetStateConfigs[SheetState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: SheetState; config: SheetStateConfigs[SheetState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.sheetApi.commit&lt;S extends SheetState&gt;(el: HTMLElement, name: S, config?: SheetStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>SheetStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.sheetStates: SheetState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>. |

## Notes

- While a sheet is modal, `html:has(dialog.sheet:modal)` sets `overflow: hidden` + `scrollbar-gutter: stable` - the page behind cannot scroll and its position is preserved for when the sheet closes (no JS scroll-lock).
- Right/left sheets have a fixed width of `24rem` with `max-width: 100vw` for small screens.
- Top/bottom sheets are full width with `height: auto` - they size to their content. Their `.sheet-content` column caps at `48rem` and centers, so content doesn't stretch to the viewport edges.
- The selector is `dialog.sheet` (element + class) to avoid conflicts with `dialog.dialog`.
- The `sheet-header` has `padding-right: 2rem` to avoid overlapping the close button.
