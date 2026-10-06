---
name: Property Grid
type: ATM
section: application
why: The ExtJS property grid as a native table - one JSON object as two dense columns (key, value), nested objects and arrays as folding groups, in-place editors chosen by type (or by getEditorFn), keyRenderFn / valueRenderFn for the cells; the object is the store's state, replaced on every committed edit.
when: Inspecting and editing one object - the selection of a designer (Studio), a service's settings, a node's properties, a record's raw fields. Many records with the same columns are data-grid; a form a user fills in once is form.
where: dist/components/property-grid/property-grid.css + dist/components/property-grid/property-grid.js
supportedStates: default, editing
---

# Pattern: Property Grid

## Native basis

A `<div class="property-grid">` holding the source as JSON
(`<script type="application/json" class="property-grid-source">`) and,
optionally, per-key settings (`.property-grid-config`). The component
renders a `<table>`: a `<th scope="row">` per key, a `<td>` per value,
nested objects / arrays as group rows with a toggle `<button
aria-expanded>`. A value edits in place with the library's own controls
(`.input`, `.select`, `.switch`, `.textarea`) or a native color / date input;
the object is never mutated - each committed edit replaces it.

---

## Native Web APIs
- [`<table>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table) + [`<th scope="row">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th) - each value is announced with its key
- [`<input type="color">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/color) / [`type="date"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date) / [`type="number"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/number) - the editors by type; [`valueAsNumber`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/valueAsNumber) keeps numbers numbers
- [`structuredClone()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) - the source is copied in and out, never shared
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `property-grid-beforechange` (cancelable) and `property-grid-change`
- [`position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky) - the header row stays while the rows scroll
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

```html
<div class="property-grid" id="settings" aria-label="Service settings">
  <script type="application/json" class="property-grid-source">
    { "name": "checkout-api", "replicas": 3, "public": true, "region": "eu-west-1",
      "accent": "#3b82f6", "launched": "2025-03-14", "limits": { "rps": 1200 } }
  </script>
  <script type="application/json" class="property-grid-config">
    { "name": { "displayName": "Service", "readOnly": true },
      "region": { "options": ["eu-west-1", "us-east-1"] },
      "limits.rps": { "displayName": "Requests / s", "min": 0 } }
  </script>
</div>
```

Or from script - functions included:

```js
df$.shadcn.propertyGrid.configure('#settings', {
  source: { name: 'checkout-api', replicas: 3, public: true },
  sourceConfig: { name: { readOnly: true } },
  keyRenderFn: (key, value, ctx) => null,          // text or a node for the key cell; null = default
  valueRenderFn: (value, key, ctx) => null,        // text or a node for the value cell
  getEditorFn: (key, value, ctx) => null,          // an element, { el, getValue … }, null (built-in) or false (read-only)
});
```

`ctx` = `{ path, depth, type, config, source, grid }`. A `getEditorFn`
object: `{ el, getValue(), validate?() → message, focus?(), immediate?,
multiline?, ownsEnter? }` - `immediate` commits on `change` (a switch, a
select), `multiline` / `ownsEnter` leave Enter to the editor (a textarea's
new line, a Combobox tag input adding a tag) - Ctrl / Cmd + Enter or leaving
the cell commits. An editor can be any component: clone a `<template>` (the
docs page builds a Combobox tag input that way) and read it back in
`getValue`.

`validateFn(key, value, ctx)` returns a message (or `false`) to refuse a
value - across keys too (`ctx.source`).

### sourceConfig (per key, or per path like `"limits.rps"`)

| Field | Meaning |
|-------|---------|
| `displayName` | The key's label |
| `type` | `string`, `number`, `boolean`, `enum`, `color`, `date`, `text` (multi-line), `json` (edit a group as JSON) - else detected from the value (`#rrggbb` → color, `YYYY-MM-DD` → date, a line break → text) |
| `options` | Enum values - `["a", "b"]` or `[{ "value": 1, "label": "One" }]` |
| `readOnly` / `hidden` | Shown without editing / not shown |
| `description` | The key's tooltip |
| `min` / `max` / `step` / `integer` | Number limits (validated) |
| `required`, `minLength` / `maxLength`, `pattern`, `minItems` / `maxItems` | Validation rules |
| `message` | Replaces a broken rule's own message |

---

## Variants

| Attribute | On | Meaning |
|-----------|----|---------|
| (none) | `.property-grid` | Dense rows (1.875rem) |
| `data-variant="comfortable"` | `.property-grid` | Roomier rows (2.375rem) |
| `data-sort="asc\|desc"` | `.property-grid` | Keys sorted (arrays keep their order); default: the source's order |
| `data-readonly` | `.property-grid` | Nothing edits |
| `data-headless` | `.property-grid` | No Property / Value header row |
| `data-frame="none"` | `.property-grid` | No border or radius - inside a panel body (`data-flush`) |
| `data-key-label` / `data-value-label` | `.property-grid` | The header labels |
| `data-empty-text` | `.property-grid` | What an empty source says |

Custom properties: `--property-grid-key-width` (42%), `--property-grid-row`,
`--property-grid-indent`, `--property-grid-pad-x`, `--property-grid-font`.

---

## Keyboard

| Key | Does |
|-----|------|
| ↑ / ↓ / Home / End / PageUp / PageDown | Move between rows (one row in the tab order) |
| Enter / F2 | Edit the value (on a group: fold / unfold) |
| ← / → | Fold / unfold a group |
| Enter (in an editor) | Commit (a textarea: Ctrl / Cmd + Enter) |
| Escape | Cancel the edit |
| Tab / Shift + Tab | Commit and move to the next / previous row |

---

## States

| State | Meaning |
|-------|---------|
| `default` | The table - every key and value of the source |
| `editing` | One value open in its editor - `config.editing` is its path (`data-editing` on the grid) |

The config is `{ source, editing, collapsed }` (merged on every setState): the
JSON object is part of the state, so `el.store` sees every committed edit.

```js
const grid = document.querySelector('#settings');
grid.api.setState('editing', { editing: 'replicas' });   // open an editor
grid.store.subscribe(({ config }) => save(config.source)); // every committed edit
grid.addEventListener('property-grid-change', (e) => console.log(e.detail.path, e.detail.value));
```

Registry globals: `df$.shadcn.propertyGridApi` / `df$.shadcn.propertyGridStates`;
`df$.shadcn.propertyGrid` has `configure`, `setSource`, `getSource`,
`setProperty`, `getProperty`, `edit`, `commit`, `cancel`, `expand`, `collapse`.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type PropertyGridState = 'default' | 'editing'</code> - `setState(name, config)` takes the config of the state it names (`PropertyGridStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The table - every key and value of the source. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source?</code></td><td><code>PropertyGridSource</code></td><td>the object shown (a copy is kept); replacing it rebuilds the table</td></tr><tr><td><code>editing?</code></td><td><code>string \| null</code></td><td>the open editor's path - null closes it</td></tr><tr><td><code>collapsed?</code></td><td><code>string[]</code></td><td>the paths of the collapsed groups</td></tr></table> |
| `editing` | One value open in its editor (data-editing on the grid). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>editing?</code></td><td><code>string \| null</code></td><td>the path of the property to edit ("owner.team")</td></tr><tr><td><code>source?</code></td><td><code>PropertyGridSource</code></td><td>the object shown</td></tr><tr><td><code>collapsed?</code></td><td><code>string[]</code></td><td>the paths of the collapsed groups</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends PropertyGridState&gt;(name: S, config?: PropertyGridStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>PropertyGridStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: PropertyGridState; config: PropertyGridStateConfigs[PropertyGridState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: PropertyGridState; config: PropertyGridStateConfigs[PropertyGridState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: PropertyGridState; config: PropertyGridStateConfigs[PropertyGridState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: PropertyGridState; config: PropertyGridStateConfigs[PropertyGridState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: PropertyGridState; config: PropertyGridStateConfigs[PropertyGridState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.propertyGridApi.setState&lt;S extends PropertyGridState&gt;(el: HTMLElement, name: S, config?: PropertyGridStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>PropertyGridStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.propertyGridApi.getState(el: HTMLElement): { name: PropertyGridState; config: PropertyGridStateConfigs[PropertyGridState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: PropertyGridState; config: PropertyGridStateConfigs[PropertyGridState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.propertyGridApi.render(state: { name: PropertyGridState; config: PropertyGridStateConfigs[PropertyGridState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: PropertyGridState; config: PropertyGridStateConfigs[PropertyGridState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.propertyGridApi.store(el: HTMLElement): Store&lt;{ name: PropertyGridState; config: PropertyGridStateConfigs[PropertyGridState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: PropertyGridState; config: PropertyGridStateConfigs[PropertyGridState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.propertyGridApi.commit&lt;S extends PropertyGridState&gt;(el: HTMLElement, name: S, config?: PropertyGridStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>PropertyGridStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.propertyGridStates: PropertyGridState[]</code> | The declared states, 'default' first: <code>default</code>, <code>editing</code>. |

### `df$.shadcn.propertyGrid`

| Member | Description |
|---|---|
| <code>configure(target: string \| HTMLElement, options: PropertyGridOptions = {}): HTMLElement \| null</code> | Configure a grid. source: the JSON object to show and edit. sourceConfig: per key or path ("owner.team") - { displayName, type ('string' \| 'number' \| 'boolean' \| 'enum' \| 'color' \| 'date' \| 'text' \| 'json'), options (enum values or { value, label }), readOnly, hidden, description, and the rules required, min, max, integer, step, minLength, maxLength, pattern, minItems, maxItems, message (replaces the rule's own message). validateFn(key, value, ctx) returns a message (or false) to refuse a value. keyRenderFn(key, value, ctx) / valueRenderFn(value, key, ctx) return the cell's content (text or a node; null = the default rendering). getEditorFn(key, value, ctx) returns an editor - an input / select element, or { el, getValue(), validate?(), focus?(), immediate?, ownsEnter? } - null for the built-in one, false for read-only. ctx = { path, depth, type, config, source, grid }. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-grid element or its selector</td></tr><tr><td><code>options</code></td><td><code>PropertyGridOptions</code> = <code>{}</code></td><td>the source and the hooks to set (merged into the current options)</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the grid, null when the target matches none |
| <code>setSource(target: string \| HTMLElement, source: PropertyGridSource): void</code> | Show another object (a copy is kept - the grid never mutates what you pass). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-grid element or its selector</td></tr><tr><td><code>source</code></td><td><code>PropertyGridSource</code></td><td>the object to show</td></tr></table> |
| <code>getSource(target: string \| HTMLElement): PropertyGridSource</code> | A copy of the object the grid holds now - every committed edit included. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-grid element or its selector</td></tr></table> <b>Returns</b> <code>PropertyGridSource</code> - the object, with every committed edit |
| <code>setProperty(target: string \| HTMLElement, path: string \| string[], value: PropertyGridValue): void</code> | Write one property ("a.b" or ['a', 'b']) - fires property-grid-change like an edit. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-grid element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| string[]</code></td><td>the property: "a.b" or ['a', 'b']</td></tr><tr><td><code>value</code></td><td><code>PropertyGridValue</code></td><td>the new value (a copy is written)</td></tr></table> |
| <code>getProperty(target: string \| HTMLElement, path: string \| string[]): PropertyGridValue</code> | One property's value ("a.b" or ['a', 'b']). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-grid element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| string[]</code></td><td>the property: "a.b" or ['a', 'b']</td></tr></table> <b>Returns</b> <code>PropertyGridValue</code> - a copy of its value (undefined when there is no such property) |
| <code>edit(target: string \| HTMLElement, path: string \| string[]): void</code> | Open a property's editor (state 'editing'). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-grid element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| string[]</code></td><td>the property: "a.b" or ['a', 'b']</td></tr></table> |
| <code>commit(target: string \| HTMLElement): boolean</code> | Commit the open editor. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-grid element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - false when its value is invalid (the editor stays open with the message); true otherwise |
| <code>cancel(target: string \| HTMLElement): void</code> | Close the open editor without writing. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-grid element or its selector</td></tr></table> |
| <code>expand(target: string \| HTMLElement, path: string \| string[]): void</code> | Expand a group (an object / array property). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-grid element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| string[]</code></td><td>the property: "a.b" or ['a', 'b']</td></tr></table> |
| <code>collapse(target: string \| HTMLElement, path: string \| string[]): void</code> | Collapse a group. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-grid element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| string[]</code></td><td>the property: "a.b" or ['a', 'b']</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `property-grid-beforechange` | Fires before a committed value is written - cancelable: preventDefault() keeps the old value. detail.path is the property's path ("owner.team"). <code>detail</code>: <code>PropertyGridBeforeChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>path</code></td><td><code>string</code></td><td>the property's path, dotted ("owner.team")</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>its own key</td></tr><tr><td><code>value</code></td><td><code>PropertyGridValue</code></td><td>the value about to be written</td></tr><tr><td><code>oldValue</code></td><td><code>PropertyGridValue</code></td><td>the value it holds now</td></tr></table> |
| `property-grid-change` | Fires after a value was written - its path, key, the new and the old value and the whole new source object. <code>detail</code>: <code>PropertyGridChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>path</code></td><td><code>string</code></td><td>the property's path, dotted ("owner.team")</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>its own key</td></tr><tr><td><code>value</code></td><td><code>PropertyGridValue</code></td><td>the value written</td></tr><tr><td><code>oldValue</code></td><td><code>PropertyGridValue</code></td><td>the value it held</td></tr><tr><td><code>source</code></td><td><code>PropertyGridSource</code></td><td>a copy of the whole new object</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `PropertyGridBeforeChangeDetail` | What property-grid-beforechange carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>path</code></td><td><code>string</code></td><td>the property's path, dotted ("owner.team")</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>its own key</td></tr><tr><td><code>value</code></td><td><code>PropertyGridValue</code></td><td>the value about to be written</td></tr><tr><td><code>oldValue</code></td><td><code>PropertyGridValue</code></td><td>the value it holds now</td></tr></table> |
| `PropertyGridChangeDetail` | What property-grid-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>path</code></td><td><code>string</code></td><td>the property's path, dotted ("owner.team")</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>its own key</td></tr><tr><td><code>value</code></td><td><code>PropertyGridValue</code></td><td>the value written</td></tr><tr><td><code>oldValue</code></td><td><code>PropertyGridValue</code></td><td>the value it held</td></tr><tr><td><code>source</code></td><td><code>PropertyGridSource</code></td><td>a copy of the whole new object</td></tr></table> |
| `PropertyGridContext` | Where a hook is called for: what keyRenderFn / valueRenderFn / getEditorFn / validateFn receive. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>path</code></td><td><code>string[]</code></td><td>the property's path</td></tr><tr><td><code>depth?</code></td><td><code>number</code></td><td>how deep it is nested (render hooks)</td></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the type it edits as</td></tr><tr><td><code>config</code></td><td><code>PropertyGridKeyConfig \| undefined</code></td><td>its sourceConfig settings, undefined when it has none</td></tr><tr><td><code>source</code></td><td><code>PropertyGridSource</code></td><td>the whole object the grid holds</td></tr><tr><td><code>grid</code></td><td><code>HTMLElement</code></td><td>the grid element</td></tr></table> |
| `PropertyGridEditor` | A custom editor getEditorFn may return (an input / select element works too). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the editor element, placed in the value cell</td></tr><tr><td><code>getValue</code></td><td><code>() =&gt; PropertyGridValue</code></td><td>the value it holds now</td></tr><tr><td><code>validate?</code></td><td><code>() =&gt; string</code></td><td>a message when the value is not acceptable, '' when it is</td></tr><tr><td><code>focus?</code></td><td><code>() =&gt; void</code></td><td>focus the editor (default: el.focus())</td></tr><tr><td><code>immediate?</code></td><td><code>boolean</code></td><td>commit on every change (a checkbox, a select) instead of on Enter / blur</td></tr><tr><td><code>ownsEnter?</code></td><td><code>boolean</code></td><td>Enter belongs to the editor (Ctrl / Cmd + Enter commits)</td></tr></table> |
| `PropertyGridKeyConfig` | One key's settings in sourceConfig - by its path ("owner.team"), else by its own key. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>displayName?</code></td><td><code>string</code></td><td>shown instead of the key</td></tr><tr><td><code>type?</code></td><td><code>PropertyGridType</code></td><td>how it edits</td></tr><tr><td><code>options?</code></td><td><code>Array&lt;string \| number \| { value: string \| number; label: string }&gt;</code></td><td>the choices of an enum: values, or { value, label }</td></tr><tr><td><code>readOnly?</code></td><td><code>boolean</code></td><td>shown, not editable</td></tr><tr><td><code>hidden?</code></td><td><code>boolean</code></td><td>not shown</td></tr><tr><td><code>description?</code></td><td><code>string</code></td><td>the key's tooltip</td></tr><tr><td><code>required?</code></td><td><code>boolean</code></td><td>a value is needed</td></tr><tr><td><code>min?</code></td><td><code>number</code></td><td>numbers: the smallest allowed</td></tr><tr><td><code>max?</code></td><td><code>number</code></td><td>numbers: the largest allowed</td></tr><tr><td><code>integer?</code></td><td><code>boolean</code></td><td>numbers: whole numbers only</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>numbers: the editor's step</td></tr><tr><td><code>minLength?</code></td><td><code>number</code></td><td>text: the fewest characters</td></tr><tr><td><code>maxLength?</code></td><td><code>number</code></td><td>text: the most characters</td></tr><tr><td><code>pattern?</code></td><td><code>string</code></td><td>text: a regular expression (source) the whole value must match</td></tr><tr><td><code>minItems?</code></td><td><code>number</code></td><td>arrays: the fewest items</td></tr><tr><td><code>maxItems?</code></td><td><code>number</code></td><td>arrays: the most items</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>replaces the message of whichever rule fails</td></tr></table> |
| `PropertyGridOptions` | What configure() takes - every key optional, merged into the grid's options. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source?</code></td><td><code>PropertyGridSource</code></td><td>the object to show and edit (a copy is kept)</td></tr><tr><td><code>sourceConfig?</code></td><td><code>Record&lt;string, PropertyGridKeyConfig&gt;</code></td><td>per key or path: label, type, choices, rules</td></tr><tr><td><code>validateFn?</code></td><td><code>(key: string, value: PropertyGridValue, ctx: PropertyGridContext) =&gt; string \| false \| null \| undefined</code></td><td>refuse a value: return a message, or false for a generic one; anything else accepts it</td></tr><tr><td><code>keyRenderFn?</code></td><td><code>(key: string, value: PropertyGridValue, ctx: PropertyGridContext) =&gt; string \| Node \| null</code></td><td>the key cell's content: text or a node; null keeps the default</td></tr><tr><td><code>valueRenderFn?</code></td><td><code>(value: PropertyGridValue, key: string, ctx: PropertyGridContext) =&gt; string \| Node \| null</code></td><td>the value cell's content: text or a node; null keeps the default</td></tr><tr><td><code>getEditorFn?</code></td><td><code>(key: string, value: PropertyGridValue, ctx: PropertyGridContext) =&gt; HTMLElement \| PropertyGridEditor \| null \| false</code></td><td>an editor for a property: an element or a PropertyGridEditor; null: the built-in one; false: read-only</td></tr></table> |
| `PropertyGridSource` | The object a grid shows and edits.  |
| `PropertyGridType` | How a property edits; without one it follows its value (a #rrggbb string: color, YYYY-MM-DD: date, multi-line: text). = <code>'string' \| 'number' \| 'boolean' \| 'enum' \| 'color' \| 'date' \| 'text' \| 'json'</code> |
| `PropertyGridValue` | A JSON value - what a property holds. = <code>string \| number \| boolean \| null \| PropertyGridValue[] \| { [key: string]: PropertyGridValue }</code> |

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `aria-label` | `.property-grid` | Always - what the object is |
| `role="group"` | `.property-grid` | Set when none is given |
| `<th scope="row">` | each key | Always - the value cell is announced with its key |
| `aria-expanded` | a group's toggle button | Set: whether its children show |
| `aria-label="key: edit"` | an editable value cell | Set |
| `aria-invalid="true"` + `aria-describedby` | an editor | A value that fails validation (the editor stays open) |
| `role="alert"` | `.property-grid-error` | The reason under the editor - announced |

---

## Notes
- **The source is copied** - `configure` / `setSource` keep a copy,
  `getSource` hands one out, `property-grid-change` carries one: nothing
  outside can mutate the grid's object behind its back.
- **Types stay types**: numbers commit as numbers (an empty number field as
  `null`), switches as booleans, enum values as the option's own value.
- A group edits as JSON only when `getEditorFn` or `sourceConfig` says so
  (`type: "json"`); otherwise it folds.
- In a [Panel](../panel/component-skill.md) with a `.panel-close` tool the
  grid is an inspector that can be closed and reopened (`data-panel-open`).
