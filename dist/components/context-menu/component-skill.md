---
name: Context Menu
type: ATM
why: Popover anchored to the pointer position on contextmenu - no positioning library involved.
when: Secondary per-item actions invoked with right-click or long-press.
where: dist/components/context-menu/context-menu.css + dist/components/context-menu/context-menu.js
supportedStates: default, open
---

# Context Menu

## Native basis

Popover API triggered by right-click.

## Native Web APIs

- [`popover` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover) - native popover
- [`contextmenu` event](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event) - right-click trigger

## Structure

```html
<div class="context-menu-trigger" data-context-menu="my-ctx">Right click here</div>
<div class="context-menu" id="my-ctx" popover>
  <button class="context-menu-item" role="menuitem">Cut</button>
  <button class="context-menu-item" role="menuitem">Copy</button>
  <button class="context-menu-item" role="menuitem">Paste</button>
</div>
```

## Density

Set `data-density` on the `.context-menu` root; container padding and item rows scale.

| Value | Effect |
| --- | --- |
| `compact` | Container 0.125rem, items 0.25rem |
| `comfortable` | 0.25rem / 0.375rem - identical to the unsized default |
| `spacious` | 0.375rem / 0.5rem |

## States

The api is bound **per menu popover**. Declared states: `default` (closed)
· `open` (shown; `{ x, y }` config positions it - viewport top-left when
no pointer coordinates exist).

```js
document.querySelector('#my-ctx').api.setState('open', { x: 40, y: 40 });
document.querySelector('#my-ctx').api.getState(); // { name: 'open', config: { x: 40, y: 40 } }
```

The registry global is `df$.shadcn.contextMenuApi` / `df$.shadcn.contextMenuStates` (camelCase).

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ContextMenuState = 'default' | 'open'</code> - `setState(name, config)` takes the config of the state it names (`ContextMenuStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Closed. No config. |
| `open` | Open at a point of the viewport. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>x?</code></td><td><code>number</code></td><td>the menu's left edge, px from the viewport's left (default 8)</td></tr><tr><td><code>y?</code></td><td><code>number</code></td><td>the menu's top edge, px from the viewport's top (default 8)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ContextMenuState&gt;(name: S, config?: ContextMenuStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ContextMenuStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ContextMenuState; config: ContextMenuStateConfigs[ContextMenuState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ContextMenuState; config: ContextMenuStateConfigs[ContextMenuState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ContextMenuState; config: ContextMenuStateConfigs[ContextMenuState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ContextMenuState; config: ContextMenuStateConfigs[ContextMenuState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ContextMenuState; config: ContextMenuStateConfigs[ContextMenuState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.contextMenuApi.setState&lt;S extends ContextMenuState&gt;(el: HTMLElement, name: S, config?: ContextMenuStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ContextMenuStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.contextMenuApi.getState(el: HTMLElement): { name: ContextMenuState; config: ContextMenuStateConfigs[ContextMenuState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ContextMenuState; config: ContextMenuStateConfigs[ContextMenuState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.contextMenuApi.render(state: { name: ContextMenuState; config: ContextMenuStateConfigs[ContextMenuState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ContextMenuState; config: ContextMenuStateConfigs[ContextMenuState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.contextMenuApi.store(el: HTMLElement): Store&lt;{ name: ContextMenuState; config: ContextMenuStateConfigs[ContextMenuState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ContextMenuState; config: ContextMenuStateConfigs[ContextMenuState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.contextMenuApi.commit&lt;S extends ContextMenuState&gt;(el: HTMLElement, name: S, config?: ContextMenuStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ContextMenuStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.contextMenuStates: ContextMenuState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>. |

## Notes

- The menu opens at the pointer (or the `setState('open', { x, y })`
  point). Where there is no room to the right or below, it opens toward the
  other side of the point - as a native menu does - and it never runs past
  the viewport.
