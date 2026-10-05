---
name: Property Grid
type: ATM
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

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.propertyGridApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.propertyGridStates` = `default`, `editing`.

### `df$.shadcn.propertyGrid`

| Member | Description |
|---|---|
| `configure(target, options = {})` | Configure a grid. source: the JSON object to show and edit. sourceConfig: per key or path ("owner.team") - { displayName, type ('string' \| 'number' \| 'boolean' \| 'enum' \| 'color' \| 'date' \| 'text' \| 'json'), options (enum values or { value, label }), readOnly, hidden, description, and the rules required, min, max, integer, step, minLength, maxLength, pattern, minItems, maxItems, message (replaces the rule's own message). validateFn(key, value, ctx) returns a message (or false) to refuse a value. keyRenderFn(key, value, ctx) / valueRenderFn(value, key, ctx) return the cell's content (text or a node; null = the default rendering). getEditorFn(key, value, ctx) returns an editor - an input / select element, or { el, getValue(), validate?(), focus?(), immediate?, ownsEnter? } - null for the built-in one, false for read-only. ctx = { path, depth, type, config, source, grid }. |
| `setSource(target, source)` | Show another object (a copy is kept - the grid never mutates what you pass). |
| `getSource(target)` | A copy of the object the grid holds now - every committed edit included. |
| `setProperty(target, path, value)` | Write one property ("a.b" or ['a', 'b']) - fires property-grid-change like an edit. |
| `getProperty(target, path)` | One property's value ("a.b" or ['a', 'b']). |
| `edit(target, path)` | Open a property's editor (state 'editing'). |
| `commit(target)` | Commit the open editor; false when its value is invalid. |
| `cancel(target)` | Close the open editor without writing. |
| `expand(target, path)` | Expand a group (an object / array property). |
| `collapse(target, path)` | Collapse a group. |

### Events

| Event | `detail` | Description |
|---|---|---|
| `property-grid-beforechange` | `path`, `key`, `value`, `oldValue` | Fires before a committed value is written - cancelable: preventDefault() keeps the old value. detail.path is the property's path ("owner.team"). |
| `property-grid-change` | `path`, `key`, `value`, `oldValue`, `source` | Fires after a value was written - its path, key, the new and the old value and the whole new source object. |

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
