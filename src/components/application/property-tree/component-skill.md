---
name: Property Tree
type: ATM
section: application
why: The Property Grid's in-place editing for a whole linked structure - one value (JSON, or with DSON Map, Set, Date, BigInt, RegExp, shared nodes and cycles) as a windowed tree of key / value rows; values, keys, types and entries edit in place with the shared cell editors, every edit one undo step.
when: Inspecting and editing a nested document - a configuration, an API response, a state store, a graph of objects that point at each other. One flat object with labels and rules per key is property-grid; many records with the same fields are data-grid; a hierarchy of records is data-tree.
where: dist/components/property-tree/property-tree.css + dist/components/property-tree/property-tree.js
supportedStates: default, editing
---

# Pattern: Property Tree

## Native basis

A `<div class="property-tree">` holding its value as JSON
(`<script type="application/json" class="property-tree-source">`) or DSON
(`type="application/dson"` - the [defuss-dson](https://www.npmjs.com/package/defuss-dson) module loads first), or a
value handed in by `df$.shadcn.propertyTree.configure()`. The runtime writes an ARIA `role="tree"` viewport whose rows
are the open branches - only the rows on screen exist, so a value of a hundred thousand nodes opens at once. Values
edit with the library's own controls (`.input`, `.switch`, `.select`, `.textarea`) through the shared cell editors -
the same ones the [Property Grid](../property-grid/component-skill.md), the Data Grid and the Data Tree use.

---

## Native Web APIs
- [WAI-ARIA tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) + [`aria-activedescendant`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-activedescendant) - one focus stop, arrows walk the rows
- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) + [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - the actions menu at its row's button
- [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) / [`Set`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) - edited in place, in their order
- [`structuredClone()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) - Duplicate copies a node with its cycles and shared nodes
- [`<input type="datetime-local">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local) - a Date edits as a date and time
- [JSON Pointer (RFC 6901)](https://www.rfc-editor.org/rfc/rfc6901) - every node's address
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `property-tree-beforechange` (cancelable) and `property-tree-change`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

```html
<div class="property-tree" id="config" aria-label="Service configuration" style="block-size: 20rem">
  <script type="application/json" class="property-tree-source">
    { "name": "checkout", "replicas": 3, "public": true, "limits": { "rps": 1200 }, "tags": ["payments"] }
  </script>
</div>
```

A DSON source keeps what JSON cannot - Map, Set, Date, BigInt, RegExp and references:

```html
<div class="property-tree" aria-label="Session">
  <script type="application/dson" class="property-tree-source">...</script>
</div>
```

Or from script - any value, functions for the hooks:

```js
df$.shadcn.propertyTree.configure('#config', {
  value: { user, settings: new Map([['theme', 'dark']]) },
  getEditorFn: (path, value, ctx) => null,      // an element, { el, getValue … }, null (built-in) or false (does not edit)
  validateFn: (path, value, ctx) => null,       // a message (or false) refuses the value; ctx.kind is 'key' for a key
  renderValue: (el, value, ctx) => false,       // fill el and return true to draw a value yourself
});
```

`ctx` = `{ path, pointer, key, kind, parent, root, tree }`. A `getEditorFn` editor follows the shared contract:
`{ el, getValue(), validate?(), focus?(), immediate?, multiline?, ownsEnter? }`.

### Rows

| Part | Shows |
|------|-------|
| `.property-tree-toggle` | The fold arrow of an object, array, Map or Set |
| `.property-tree-key` | The key (`data-key-kind`: `key`, `index`, `map`, `root`) |
| `.property-tree-value` | The value (`data-kind`), a container's size, or `.property-tree-ref` - a link to a node's first appearance (`ref` for a shared node, `cycle` for one that contains itself) |
| `.property-tree-type` | The kind: string, number, boolean, null, bigint, date, regexp, object, array, map, set, a typed array's name, ref |
| `.property-tree-actions` | Opens the actions menu (Add, Edit, Rename, Duplicate, Move up / down, As <type>, Copy path, Copy as JSON, Delete) |

### Editing

The value is edited **in place**: a node that appears twice stays one node, so an edit shows wherever it appears.
Every edit is one undo step (Ctrl / Cmd + Z, Ctrl / Cmd + Shift + Z or Y).

| Edit | How |
|------|-----|
| A value | Double-click it, Enter or F2 - by kind: string (Input; a #rrggbb colour input, a YYYY-MM-DD date input, a multi-line Textarea), number, boolean (Switch), bigint, Date (date and time), RegExp (`/source/flags`), null (JSON or text), an object or array without cycles as JSON |
| A key | Double-click it, Shift + Enter or Shift + F2 (object keys, string Map keys); a taken key is refused |
| Add | The menu, Insert, or Ctrl / Cmd + Enter on a container - a free key ("key", "key 2") or an item at the end |
| Remove | The menu, Delete, Ctrl / Cmd + Backspace |
| Duplicate | The menu, Ctrl / Cmd + D - a deep copy right after it |
| Move | The menu, Alt + Arrow Up / Down - array items, Map / Set entries, object keys |
| Type | The menu: As string, number, boolean, null, object, array, map, set, date, bigint - converted where it can be |

---

## Variants

| Attribute | On | Meaning |
|-----------|----|---------|
| (none) | `.property-tree` | Dense rows (28px) |
| `data-variant="comfortable"` | `.property-tree` | Roomier rows (34px) |
| `data-readonly` | `.property-tree` | An inspector: nothing edits, no actions |
| `data-hide-root` | `.property-tree` | No row for the root - its children start the tree |
| `data-root-label` | `.property-tree` | The root row's label (default "root") |
| `data-frame="none"` | `.property-tree` | No border or radius - inside a panel body |

Custom properties: `--property-tree-row-height`, `--property-tree-indent`, `--property-tree-key-width` (38%),
`--property-tree-font`. Set the tree's `block-size` (default 20rem) - its rows scroll inside it.

---

## Keyboard

| Key | Does |
|-----|------|
| Up / Down / Home / End / PageUp / PageDown | Move between rows |
| Right / Left | Open / close a container; to its first child / its parent |
| Enter | A container: fold; a reference: go to its first appearance; else edit the value |
| F2 / Shift + F2 | Edit the value / the key |
| Space | Select the row |
| Shift + F10, the context-menu key | The actions menu |
| Enter, Escape, Tab (in an editor) | Commit, cancel, commit and move on |

---

## States

| State | Meaning |
|-------|---------|
| `default` | The rows of the open branches |
| `editing` | One editor open - `config.editing` is its node's JSON Pointer (`editingKey: true`: its key), `data-editing` on the tree |

The config is the view: `{ expanded, selected, editing, editingKey, version }` - `expanded` lists the open branches'
pointers, `version` counts the edits, so `el.store` subscribers hear each one. The value itself is
`df$.shadcn.propertyTree.value(el)` - the live structure.

```js
const tree = document.querySelector('#config');
tree.api.setState('editing', { editing: '/replicas' });                 // open an editor
tree.addEventListener('property-tree-change', (e) => save(df$.shadcn.propertyTree.json(tree)));
df$.shadcn.propertyTree.set(tree, '/limits/rps', 2000);                 // one edit, one undo step
```

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type PropertyTreeState = 'default' | 'editing'</code> - `setState(name, config)` takes the config of the state it names (`PropertyTreeStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The rows of the open branches. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>expanded?</code></td><td><code>string[]</code></td><td>the JSON Pointers of the open branches</td></tr><tr><td><code>selected?</code></td><td><code>string \| null</code></td><td>the selected node's pointer, null for none</td></tr><tr><td><code>editing?</code></td><td><code>string \| null</code></td><td>the pointer of the node whose editor is open, null for none</td></tr><tr><td><code>editingKey?</code></td><td><code>boolean</code></td><td>the open editor renames the key instead of editing the value</td></tr><tr><td><code>version?</code></td><td><code>number</code></td><td>the number of edits so far - it moves on every edit</td></tr></table> |
| `editing` | One editor open - config.editing is its node's pointer, editingKey: true renames the key. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>expanded?</code></td><td><code>string[]</code></td><td>the JSON Pointers of the open branches</td></tr><tr><td><code>selected?</code></td><td><code>string \| null</code></td><td>the selected node's pointer, null for none</td></tr><tr><td><code>editing?</code></td><td><code>string \| null</code></td><td>the pointer of the node whose editor is open, null for none</td></tr><tr><td><code>editingKey?</code></td><td><code>boolean</code></td><td>the open editor renames the key instead of editing the value</td></tr><tr><td><code>version?</code></td><td><code>number</code></td><td>the number of edits so far - it moves on every edit</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends PropertyTreeState&gt;(name: S, config?: PropertyTreeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>PropertyTreeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: PropertyTreeState; config: PropertyTreeStateConfigs[PropertyTreeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: PropertyTreeState; config: PropertyTreeStateConfigs[PropertyTreeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: PropertyTreeState; config: PropertyTreeStateConfigs[PropertyTreeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: PropertyTreeState; config: PropertyTreeStateConfigs[PropertyTreeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: PropertyTreeState; config: PropertyTreeStateConfigs[PropertyTreeState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.propertyTreeApi.setState&lt;S extends PropertyTreeState&gt;(el: HTMLElement, name: S, config?: PropertyTreeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>PropertyTreeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.propertyTreeApi.getState(el: HTMLElement): { name: PropertyTreeState; config: PropertyTreeStateConfigs[PropertyTreeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: PropertyTreeState; config: PropertyTreeStateConfigs[PropertyTreeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.propertyTreeApi.render(state: { name: PropertyTreeState; config: PropertyTreeStateConfigs[PropertyTreeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: PropertyTreeState; config: PropertyTreeStateConfigs[PropertyTreeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.propertyTreeApi.store(el: HTMLElement): Store&lt;{ name: PropertyTreeState; config: PropertyTreeStateConfigs[PropertyTreeState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: PropertyTreeState; config: PropertyTreeStateConfigs[PropertyTreeState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.propertyTreeApi.commit&lt;S extends PropertyTreeState&gt;(el: HTMLElement, name: S, config?: PropertyTreeStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>PropertyTreeStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.propertyTreeStates: PropertyTreeState[]</code> | The declared states, 'default' first: <code>default</code>, <code>editing</code>. |

### `df$.shadcn.propertyTree`

| Member | Description |
|---|---|
| <code>configure(target: string \| HTMLElement, options: PropertyTreeOptions = {}): HTMLElement \| null</code> | Configure a tree. value: the structure to show and edit (edited in place). getEditorFn(path, value, ctx) returns an editor - an element or { el, getValue(), validate?(), focus?(), immediate?, multiline?, ownsEnter? } - null for the built-in one, false when the value does not edit. validateFn(path, value, ctx) returns a message (or false) to refuse a value - a new key too (ctx.kind is 'key'). renderValue(el, value, ctx) fills a value's cell (return true). urls: { dson } self-hosts the defuss-dson module. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>options</code></td><td><code>PropertyTreeOptions</code> = <code>{}</code></td><td>the value and the hooks to set (merged into the current options)</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the tree, null when the target matches none |
| <code>setValue(target: string \| HTMLElement, value: unknown): void</code> | Show another value (the history of edits starts again). Edits change it in place. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>any value: an object, an array, a Map ...</td></tr></table> |
| <code>value(target: string \| HTMLElement): unknown</code> | The value the tree shows - the live structure, every edit applied. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr></table> <b>Returns</b> <code>unknown</code> - the root value |
| <code>json(target: string \| HTMLElement, space?: number \| string): string</code> | The value as JSON: a node that appears again (a shared node, a cycle) becomes { "$ref": "&lt;its first pointer&gt;" }; a Map becomes an object, a Set an array, a Date its ISO string, a BigInt its digits. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>space?</code></td><td><code>number \| string</code></td><td>indentation, as JSON.stringify takes it</td></tr></table> <b>Returns</b> <code>string</code> - the JSON text |
| <code>dson(target: string \| HTMLElement): Promise&lt;string&gt;</code> | The value as DSON (defuss-dson: Map, Set, Date, BigInt, RegExp and references kept) - loads the module first. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;string&gt;</code> - the DSON text |
| <code>get(target: string \| HTMLElement, path: string \| PropertyTreePath): unknown</code> | The value at a path. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| PropertyTreePath</code></td><td>a JSON Pointer ("/owner/team") or the keys and indexes</td></tr></table> <b>Returns</b> <code>unknown</code> - the node there (the live one), undefined when there is none |
| <code>set(target: string \| HTMLElement, path: string \| PropertyTreePath, value: unknown): boolean</code> | Write a value at a path - one edit (property-tree-change, one undo step). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| PropertyTreePath</code></td><td>a JSON Pointer or the keys and indexes</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the new value</td></tr></table> <b>Returns</b> <code>boolean</code> - false when there is no such node or the edit was cancelled |
| <code>add(target: string \| HTMLElement, path: string \| PropertyTreePath, key?: unknown, value?: unknown, index?: number): PropertyTreePath \| null</code> | Add a child to a container: an object or a Map gets the key (made free: "key 2"), an array the item at index (default: the end), a Set the value. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| PropertyTreePath</code></td><td>the container's pointer or path</td></tr><tr><td><code>key?</code></td><td><code>unknown</code></td><td>the new key (objects and Maps)</td></tr><tr><td><code>value?</code></td><td><code>unknown</code></td><td>the new value (default '')</td></tr><tr><td><code>index?</code></td><td><code>number</code></td><td>arrays: where it goes</td></tr></table> <b>Returns</b> <code>PropertyTreePath \| null</code> - the new node's path, null when nothing was added |
| <code>remove(target: string \| HTMLElement, path: string \| PropertyTreePath): boolean</code> | Remove a node - one edit. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| PropertyTreePath</code></td><td>its pointer or path</td></tr></table> <b>Returns</b> <code>boolean</code> - false when there is no such node (or it is the root) |
| <code>rename(target: string \| HTMLElement, path: string \| PropertyTreePath, key: unknown): boolean</code> | Rename an object key or a Map key - one edit, the node keeps its place. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| PropertyTreePath</code></td><td>the node's pointer or path</td></tr><tr><td><code>key</code></td><td><code>unknown</code></td><td>the new key</td></tr></table> <b>Returns</b> <code>boolean</code> - false when it cannot be renamed (an array item, the root, the same key) |
| <code>setType(target: string \| HTMLElement, path: string \| PropertyTreePath, kind: string): boolean</code> | Change a node's type ('string', 'number', 'boolean', 'null', 'object', 'array', 'map', 'set', 'date', 'bigint') - the value is converted where it can be (an array to an object of its indexes, a string to a number ...). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| PropertyTreePath</code></td><td>the node's pointer or path</td></tr><tr><td><code>kind</code></td><td><code>string</code></td><td>the new type</td></tr></table> <b>Returns</b> <code>boolean</code> - false when it already has that type |
| <code>undo(target: string \| HTMLElement): boolean</code> | Undo the last edit. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - false when there is nothing to undo |
| <code>redo(target: string \| HTMLElement): boolean</code> | Redo the last undone edit. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - false when there is nothing to redo |
| <code>edit(target: string \| HTMLElement, path: string \| PropertyTreePath, key: boolean = false): boolean</code> | Open a value's editor (state 'editing') - the way to it opens first. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| PropertyTreePath</code></td><td>the node's pointer or path</td></tr><tr><td><code>key</code></td><td><code>boolean</code> = <code>false</code></td><td>true: rename its key instead</td></tr></table> <b>Returns</b> <code>boolean</code> - false when it does not edit (a reference, a Map, a value getEditorFn refuses) |
| <code>commit(target: string \| HTMLElement): boolean</code> | Commit the open editor. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - false when its value is refused (the editor stays open with the message); true otherwise |
| <code>cancel(target: string \| HTMLElement): void</code> | Close the open editor without writing. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr></table> |
| <code>reveal(target: string \| HTMLElement, path: string \| PropertyTreePath): boolean</code> | Open the way to a node, make it the active row and select it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| PropertyTreePath</code></td><td>the node's pointer or path</td></tr></table> <b>Returns</b> <code>boolean</code> - false when there is no such node |
| <code>expandAll(target: string \| HTMLElement, depth: number = Infinity): void</code> | Open every container down to a depth (default: all of them - mind a large value). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr><tr><td><code>depth</code></td><td><code>number</code> = <code>Infinity</code></td><td>how many levels below the root open</td></tr></table> |
| <code>collapseAll(target: string \| HTMLElement): void</code> | Close every container but the root. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .property-tree element or its selector</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `property-tree-beforechange` | Fires before an edit is applied - cancelable: preventDefault() keeps the value as it is. <code>detail</code>: <code>PropertyTreeChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>op</code></td><td><code>string</code></td><td>what happened: 'set' (a value), 'rename' (a key), 'add', 'remove', 'move', 'type', 'undo', 'redo'</td></tr><tr><td><code>path</code></td><td><code>PropertyTreePath</code></td><td>the node's path (for 'add': the new node's; for 'rename': the new key's)</td></tr><tr><td><code>pointer</code></td><td><code>string</code></td><td>the path as a JSON Pointer</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the new value (for 'rename': the new key)</td></tr><tr><td><code>oldValue</code></td><td><code>unknown</code></td><td>the value before (for 'rename': the old key)</td></tr></table> |
| `property-tree-change` | Fires after an edit was applied (or undone / redone) - what happened, where, the new and the old value. <code>detail</code>: <code>PropertyTreeChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>op</code></td><td><code>string</code></td><td>what happened: 'set' (a value), 'rename' (a key), 'add', 'remove', 'move', 'type', 'undo', 'redo'</td></tr><tr><td><code>path</code></td><td><code>PropertyTreePath</code></td><td>the node's path (for 'add': the new node's; for 'rename': the new key's)</td></tr><tr><td><code>pointer</code></td><td><code>string</code></td><td>the path as a JSON Pointer</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the new value (for 'rename': the new key)</td></tr><tr><td><code>oldValue</code></td><td><code>unknown</code></td><td>the value before (for 'rename': the old key)</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `PropertyTreeChangeDetail` | What property-tree-beforechange and property-tree-change carry. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>op</code></td><td><code>string</code></td><td>what happened: 'set' (a value), 'rename' (a key), 'add', 'remove', 'move', 'type', 'undo', 'redo'</td></tr><tr><td><code>path</code></td><td><code>PropertyTreePath</code></td><td>the node's path (for 'add': the new node's; for 'rename': the new key's)</td></tr><tr><td><code>pointer</code></td><td><code>string</code></td><td>the path as a JSON Pointer</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>the new value (for 'rename': the new key)</td></tr><tr><td><code>oldValue</code></td><td><code>unknown</code></td><td>the value before (for 'rename': the old key)</td></tr></table> |
| `PropertyTreeConfig` | The view - the tree's state config (merged on every setState). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>expanded?</code></td><td><code>string[]</code></td><td>the JSON Pointers of the open branches</td></tr><tr><td><code>selected?</code></td><td><code>string \| null</code></td><td>the selected node's pointer, null for none</td></tr><tr><td><code>editing?</code></td><td><code>string \| null</code></td><td>the pointer of the node whose editor is open, null for none</td></tr><tr><td><code>editingKey?</code></td><td><code>boolean</code></td><td>the open editor renames the key instead of editing the value</td></tr><tr><td><code>version?</code></td><td><code>number</code></td><td>the number of edits so far - it moves on every edit</td></tr></table> |
| `PropertyTreeContext` | What the hooks receive about a node. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>path</code></td><td><code>PropertyTreePath</code></td><td>the node's path</td></tr><tr><td><code>pointer</code></td><td><code>string</code></td><td>the path as a JSON Pointer ("/owner/team", "" for the root)</td></tr><tr><td><code>key</code></td><td><code>unknown</code></td><td>its key in its parent: an object key, an index, a Map key; null for the root</td></tr><tr><td><code>kind</code></td><td><code>string</code></td><td>what kind of node it is</td></tr><tr><td><code>parent</code></td><td><code>unknown</code></td><td>the container that holds it, null for the root</td></tr><tr><td><code>root</code></td><td><code>unknown</code></td><td>the whole value</td></tr><tr><td><code>tree</code></td><td><code>HTMLElement</code></td><td>the tree element</td></tr></table> |
| `PropertyTreeOptions` | What configure() takes - every key optional, merged into the tree's options. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>unknown</code></td><td>the value to show and edit - any structure (it is edited in place)</td></tr><tr><td><code>getEditorFn?</code></td><td><code>(path: PropertyTreePath, value: unknown, ctx: PropertyTreeContext) =&gt; HTMLElement \| CellEditor \| null \| false</code></td><td>an editor for a value: an element or a CellEditor; null: the built-in one; false: it does not edit</td></tr><tr><td><code>validateFn?</code></td><td><code>(path: PropertyTreePath, value: unknown, ctx: PropertyTreeContext) =&gt; string \| false \| null \| undefined</code></td><td>refuse a value (or a new key: ctx.kind is 'key'): a message, or false for a generic one; anything else accepts it</td></tr><tr><td><code>renderValue?</code></td><td><code>(el: HTMLElement, value: unknown, ctx: PropertyTreeContext) =&gt; boolean \| void</code></td><td>draw a value yourself: fill el (true) or leave it to the tree (false / nothing)</td></tr><tr><td><code>urls?</code></td><td><code>{ dson?: string }</code></td><td>self-hosted vendor files: { dson } - the defuss-dson ES module</td></tr></table> |
| `PropertyTreePath` | A path to a node: object keys and indexes (an array's, a Map's or a Set's entry), from the root. = <code>Array&lt;string \| number&gt;</code> |

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `aria-label` | `.property-tree` | Always - what the value is (the viewport takes it) |
| `role="tree"` + `aria-activedescendant` | `.property-tree-viewport` | Set: one focus stop, the active row is announced |
| `role="treeitem"`, `aria-level`, `aria-expanded`, `aria-selected` | each row | Set |
| `aria-label="key: value"` | each row | Set - a reference names the pointer it leads to |
| `aria-readonly="true"` | the viewport | `data-readonly` |
| `role="menu"` / `menuitem` / `menuitemradio` | the actions menu | Set - the type items say which is checked |
| `aria-invalid="true"` + `aria-describedby` | an editor | A refused value (the editor stays open) |
| `role="alert"` | `.property-tree-error` | The reason under the editor - announced |

---

## Notes
- **References are shown once**: the first appearance of a node - the shallowest, in key order - has its rows; every
  other one is a `ref` link, and a node inside itself a `cycle` link. Enter or a click on it goes there.
- **json()** writes JSON with `{ "$ref": "<pointer>" }` for a node seen before, a Map as an object, a Set as an array,
  a Date as its ISO string, a BigInt as its digits. **dson()** keeps everything (it loads defuss-dson first).
- The DSON module is pinned (`defuss-dson@1.1.2` on jsDelivr); `configure({ urls: { dson } })` self-hosts it.
- A Map, a Set, a typed array or an Error has no value editor - edit its entries, or change its type.
