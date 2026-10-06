---
name: Toolbar
type: ORG
section: actions
why: role=toolbar with arrow-key focus management across a button cluster.
when: Editor-style action bars above a content region.
where: dist/components/toolbar/toolbar.css + dist/components/toolbar/toolbar.js
supportedStates: default
---

# Pattern: Toolbar

## Native basis
`role="toolbar"` container. Groups related controls (buttons, toggles, separators) into a single keyboard-navigable bar.

---

## Native Web APIs
- [`role="toolbar"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/toolbar_role) - a container for grouped controls
- [`aria-orientation`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-orientation) - declares layout direction
- [WAI-ARIA Toolbar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) - keyboard navigation specification
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - maps toolbar border to system `ButtonText` in Windows High Contrast Mode

---

## Structure

```html
<div class="toolbar" role="toolbar" aria-label="Formatting" aria-orientation="horizontal">
  <div class="toggle-group" role="group" aria-label="Text style" data-type="multiple">
    <button class="toggle" aria-pressed="false">
      <svg aria-hidden="true" ...><!-- bold --></svg>
    </button>
    <button class="toggle" aria-pressed="false">
      <svg aria-hidden="true" ...><!-- italic --></svg>
    </button>
  </div>
  <div class="separator" data-orientation="vertical" role="separator"></div>
  <div class="toggle-group" role="group" aria-label="Alignment" data-type="single">
    <button class="toggle" aria-pressed="true">
      <svg aria-hidden="true" ...><!-- align-left --></svg>
    </button>
    <button class="toggle" aria-pressed="false">
      <svg aria-hidden="true" ...><!-- align-center --></svg>
    </button>
  </div>
  <div class="separator" data-orientation="vertical" role="separator"></div>
  <a class="btn" data-variant="link" href="#" target="_blank">Link</a>
</div>
```

---


## Sizes

Set `data-size` on the `.toolbar` root. The toolbar and its direct `.btn` / `.toggle` controls scale together - set the size once on the root.

| `data-size` | Effect |
|-------------|--------|
| `xs` | chrome 0.125rem, controls 1.75rem tall (0.75rem font) |
| `sm` | chrome 0.1875rem, controls 2rem tall (0.8125rem font) |
| `md` | chrome 0.25rem, controls 2.25rem tall - identical to the unsized default (.btn default) |
| `lg` | chrome 0.375rem, controls 2.75rem tall (1rem font) |
| `xl` | chrome 0.5rem, controls 3.25rem tall (1.125rem font) |

## Accessibility

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `role="toolbar"` | Container | Identifies the toolbar pattern |
| `aria-label` | Container | Accessible name |
| `aria-orientation` | Container | `horizontal` (default) or `vertical` |

### Keyboard

| Key | Action |
|-----|--------|
| `Tab` | Moves focus into/out of the toolbar (roving tabindex) |
| `→` / `←` | Moves focus between toolbar items (horizontal) |
| `↓` / `↑` | Moves focus between toolbar items (vertical) |
| `Home` / `End` | First / last item |

---

## States

The toolbar's only observable state is *which item holds the roving
tabindex*. Declared states: `default` (roving stop back at the authored
first position; `{ focus: n }` config parks it on item n instead).
`getState().config.rovingIndex` reports the current stop.

```js
document.querySelector('#formatting').api.setState('default');
document.querySelector('#formatting').api.getState(); // { name: 'default', config: { rovingIndex: 0 } }
```

The api is bound per toolbar; the registry global is
`df$.shadcn.toolbarApi` / `df$.shadcn.toolbarStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ToolbarState = 'default'</code> - `setState(name, config)` takes the config of the state it names (`ToolbarStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The toolbar with one item in the tab order (roving tabindex). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>focus?</code></td><td><code>number</code></td><td>the item to focus and put in the tab order, 0-based (default 0)</td></tr><tr><td><code>rovingIndex?</code></td><td><code>number</code></td><td>reported by getState(): the index of the item in the tab order</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ToolbarState&gt;(name: S, config?: ToolbarStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ToolbarStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ToolbarState; config: ToolbarStateConfigs[ToolbarState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ToolbarState; config: ToolbarStateConfigs[ToolbarState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ToolbarState; config: ToolbarStateConfigs[ToolbarState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ToolbarState; config: ToolbarStateConfigs[ToolbarState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ToolbarState; config: ToolbarStateConfigs[ToolbarState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.toolbarApi.setState&lt;S extends ToolbarState&gt;(el: HTMLElement, name: S, config?: ToolbarStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ToolbarStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.toolbarApi.getState(el: HTMLElement): { name: ToolbarState; config: ToolbarStateConfigs[ToolbarState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ToolbarState; config: ToolbarStateConfigs[ToolbarState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.toolbarApi.render(state: { name: ToolbarState; config: ToolbarStateConfigs[ToolbarState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ToolbarState; config: ToolbarStateConfigs[ToolbarState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.toolbarApi.store(el: HTMLElement): Store&lt;{ name: ToolbarState; config: ToolbarStateConfigs[ToolbarState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ToolbarState; config: ToolbarStateConfigs[ToolbarState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.toolbarApi.commit&lt;S extends ToolbarState&gt;(el: HTMLElement, name: S, config?: ToolbarStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ToolbarStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.toolbarStates: ToolbarState[]</code> | The declared states, 'default' first: <code>default</code>. |

## Notes

- Toolbars compose Toggle Groups, Button Groups, Buttons, and Separators.
- The toolbar handles roving tabindex - only one item is in the tab order at a time.
- Use vertical separators between logical groups of controls.
- The toolbar does not enforce selection logic - that's handled by the child components.
