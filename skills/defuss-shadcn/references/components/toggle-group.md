---
name: Toggle Group
type: MOL
section: actions
why: Grouped toggle buttons with roving focus and single or multiple selection.
when: Sets of on/off options like text formatting (bold/italic/underline).
where: dist/components/toggle-group/toggle-group.css + dist/components/toggle-group/toggle-group.js
supportedStates: default, disabled
---

# Pattern: Toggle Group

## Native basis
`role="group"` container with `<button class="toggle">` items using `aria-pressed` for state. Supports single (radio-like) and multiple (checkbox-like) selection modes with roving tabindex keyboard navigation.

---

## Native Web APIs
- [`role="group"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/group_role) - groups related interactive elements semantically
- [`aria-pressed`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-pressed) - toggle pressed state on each button
- [`aria-label`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label) - accessible name for the group
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus rings
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - derived hover states from token colors
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses transitions for motion-sensitive users
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - Windows High Contrast Mode support

---

## Structure

### Single selection
```html
<div class="toggle-group" role="group" aria-label="Text alignment" data-type="single">
  <button class="toggle" aria-pressed="true" value="left">
    <svg aria-hidden="true" ...>...</svg>
  </button>
  <button class="toggle" aria-pressed="false" value="center">
    <svg aria-hidden="true" ...>...</svg>
  </button>
  <button class="toggle" aria-pressed="false" value="right">
    <svg aria-hidden="true" ...>...</svg>
  </button>
</div>
```

### Multiple selection
```html
<div class="toggle-group" role="group" aria-label="Text formatting" data-type="multiple">
  <button class="toggle" aria-pressed="true" value="bold">
    <svg aria-hidden="true" ...>...</svg>
  </button>
  <button class="toggle" aria-pressed="false" value="italic">
    <svg aria-hidden="true" ...>...</svg>
  </button>
  <button class="toggle" aria-pressed="false" value="underline">
    <svg aria-hidden="true" ...>...</svg>
  </button>
</div>
```

### With text
```html
<div class="toggle-group" role="group" aria-label="View mode" data-type="single" data-variant="outline">
  <button class="toggle" aria-pressed="true" value="list">
    <svg aria-hidden="true" ...>...</svg> List
  </button>
  <button class="toggle" aria-pressed="false" value="grid">
    <svg aria-hidden="true" ...>...</svg> Grid
  </button>
</div>
```

### Vertical
```html
<div class="toggle-group" role="group" aria-label="Alignment" data-type="single" data-orientation="vertical">
  <button class="toggle" aria-pressed="true"><svg aria-hidden="true" ...>...</svg></button>
  <button class="toggle" aria-pressed="false"><svg aria-hidden="true" ...>...</svg></button>
  <button class="toggle" aria-pressed="false"><svg aria-hidden="true" ...>...</svg></button>
</div>
```

### Disabled group
```html
<div class="toggle-group" role="group" aria-label="Formatting" data-type="multiple" data-disabled>
  <button class="toggle" aria-pressed="true" disabled>...</button>
  <button class="toggle" aria-pressed="false" disabled>...</button>
  <button class="toggle" aria-pressed="false" disabled>...</button>
</div>
```

---

## Variants

Inherits variants from `.toggle`:

| `data-variant` (on group) | Visual |
|---------------------------|--------|
| *(default)*               | Transparent background, no border |
| `outline`                 | 1px border + shadow on each item |

---

## Sizes

| `data-size` (on group) | Height  | Icon size |
|------------------------|---------|-----------|
| `xs`                   | 1.75rem | 1rem      |
| `sm`                   | 2rem    | 0.875rem  |
| `md`                   | 2.25rem | 1rem      |
| *(default)*            | 2.25rem | 1rem      |
| `lg`                   | 2.5rem  | 1.125rem  |
| `xl`                   | 3rem    | 1rem      |

---

## Data attributes

| Attribute | Element | Values | Purpose |
|-----------|---------|--------|---------|
| `data-type` | Group | `single` (default), `multiple` | Selection mode |
| `data-variant` | Group | `outline` | Visual variant, propagated to children |
| `data-size` | Group | `xs`, `sm`, `md`, `lg`, `xl` | Size, propagated to children |
| `data-orientation` | Group | `vertical` | Layout direction (default: horizontal) |
| `data-spacing` | Group | (boolean) | Adds gap between items, restores individual radii |
| `data-disabled` | Group | (boolean) | Disables all items in the group |

---

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `role="group"` | Container | Groups related toggle buttons |
| `aria-label` | Container | Accessible name for the group |
| `aria-pressed` | Each `<button>` | `"true"` / `"false"` toggle state |

---

## Keyboard

| Key | Action |
|-----|--------|
| `Tab` | Moves focus into/out of the group (one tab stop) |
| `ArrowRight` / `ArrowDown` | Moves focus to next item (wraps) |
| `ArrowLeft` / `ArrowUp` | Moves focus to previous item (wraps) |
| `Home` | Moves focus to first item |
| `End` | Moves focus to last item |
| `Space` / `Enter` | Toggles the focused item (native button behavior) |

Arrow direction follows `data-orientation`: horizontal uses Left/Right, vertical uses Up/Down.

---

## States

Declared states: `default` (enabled) · `disabled` (mirrors the documented
`data-disabled` attribute; CSS dims items and blocks pointer events).

```js
document.querySelector('#alignment').api.setState('disabled');
document.querySelector('#alignment').api.getState(); // { name: 'disabled', config: {} }
```

The api is bound per group; the registry global is
`df$.shadcn.toggleGroupApi` / `df$.shadcn.toggleGroupStates` (camelCase).

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ToggleGroupState = 'default' | 'disabled'</code> - `setState(name, config)` takes the config of the state it names (`ToggleGroupStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Enabled. No config. |
| `disabled` | Every item disabled (data-disabled on the group). No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ToggleGroupState&gt;(name: S, config?: ToggleGroupStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ToggleGroupStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ToggleGroupState; config: ToggleGroupStateConfigs[ToggleGroupState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ToggleGroupState; config: ToggleGroupStateConfigs[ToggleGroupState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ToggleGroupState; config: ToggleGroupStateConfigs[ToggleGroupState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ToggleGroupState; config: ToggleGroupStateConfigs[ToggleGroupState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ToggleGroupState; config: ToggleGroupStateConfigs[ToggleGroupState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.toggleGroupApi.setState&lt;S extends ToggleGroupState&gt;(el: HTMLElement, name: S, config?: ToggleGroupStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ToggleGroupStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.toggleGroupApi.getState(el: HTMLElement): { name: ToggleGroupState; config: ToggleGroupStateConfigs[ToggleGroupState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ToggleGroupState; config: ToggleGroupStateConfigs[ToggleGroupState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.toggleGroupApi.render(state: { name: ToggleGroupState; config: ToggleGroupStateConfigs[ToggleGroupState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ToggleGroupState; config: ToggleGroupStateConfigs[ToggleGroupState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.toggleGroupApi.store(el: HTMLElement): Store&lt;{ name: ToggleGroupState; config: ToggleGroupStateConfigs[ToggleGroupState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ToggleGroupState; config: ToggleGroupStateConfigs[ToggleGroupState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.toggleGroupApi.commit&lt;S extends ToggleGroupState&gt;(el: HTMLElement, name: S, config?: ToggleGroupStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ToggleGroupStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.toggleGroupStates: ToggleGroupState[]</code> | The declared states, 'default' first: <code>default</code>, <code>disabled</code>. |

## Notes

- Uses **roving tabindex**: only one item has `tabindex="0"` at a time; others have `tabindex="-1"`. Tab enters/exits the group as a single stop.
- `data-type="single"` enforces one-at-a-time selection (radio-like). Pressing the active item deselects it.
- `data-type="multiple"` allows any combination of pressed states (checkbox-like).
- The group propagates `data-variant`, `data-size` to child toggles via CSS selectors.
- Connected mode (default): adjacent toggle radii are collapsed; outline variant collapses double borders via negative margin.
- `data-spacing` adds gap and restores individual border-radius on each item.
- Disabled items are skipped during keyboard navigation.
- CSS uses logical properties (`border-start-start-radius`, `margin-inline-start`) for RTL support.
