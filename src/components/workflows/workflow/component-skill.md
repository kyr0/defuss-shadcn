---
name: Workflow
type: MOL
section: workflows
why: A worker draws every connection and far node into one canvas and only the cards near the view get HTML, so a workflow of 10,000 nodes and 100,000 connections stays a bounded page - and every card you edit is the system's own form markup, typed ports and all.
when: Node-based editors - AI image and text pipelines, ETL and data flows, automations, build graphs, any typed directed graph a reader edits and runs. For a graph to explore rather than edit, graph-explorer; for a diagram drawn as illustration, diagram; for a text-defined chart, mermaid.
where: dist/components/workflows.css + dist/components/workflows.js (the extra bundle - load it after all.css / all.js; per component: dist/components/workflow/workflow.css + workflow.js)
supportedStates: default, readonly
---

# Pattern: Workflow

## Native basis

A `<div class="workflow">` becomes one focusable `role="application"` viewport over a
workflow document: nodes with typed input and output ports, connections between them,
groups and nested subworkflows. The graph is plain JSON - a `<script type="application/json"
class="workflow-source">` inside the element, or `data-generate` for a synthetic one. A Web
Worker started from the component's own source keeps a derived scene (node geometry, cached
connection curves, a multilevel spatial hash) and draws the connections and every node far
from the view into an `OffscreenCanvas`; the main thread mounts HTML cards only for the nodes
near the view (at most 150, above zoom 0.55) and moves them by transform. Everything around
the editor - a node palette, an outline, an inspector, a breadcrumb, readouts and toolbar
buttons - are **outlets** the page places where it likes, typically Panels and a Toolbar.

## Native Web APIs

- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) + [`Blob` URLs](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) - the scene and the drawing live off the main thread; a classic Blob worker also starts inside an opaque-origin sandbox
- [`OffscreenCanvas`](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) + [`ImageBitmapRenderingContext`](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmapRenderingContext) - connections and far nodes, drawn in the worker; the bitmap moves to the page without a copy
- [Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) - each frame's bitmap crosses threads for free
- [`requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - one frame for the cards, the groups and the corrected bitmap
- [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) + [`setPointerCapture()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - pan, pinch, drag, resize, connect, marquee
- [HTML Drag and Drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) - node types from the palette onto the canvas
- [`structuredClone()`](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone) - every committed value is a frozen copy; undo keeps the values a change touched
- [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) - a run and an arrangement are cancellable
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) + [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - the viewport refits; attributes written from outside and a theme change apply at once
- [`<fieldset disabled>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - a card's controls in the readonly state
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - card bands and group tints from the type colors and the theme
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) / [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - no transitions, stronger lines and borders, system colors

## Structure

### A workflow from JSON, with its node types

```html
<div class="workflow" id="pipeline" aria-label="Text pipeline" style="--workflow-height: 28rem">
  <script type="application/json" class="workflow-types">
    [
      {
        "type": "prompt", "label": "Prompt", "category": "Inputs", "color": "chart-1",
        "ports": [{ "id": "text", "direction": "output", "type": "text" }],
        "defaults": { "text": "A lighthouse at dawn" },
        "fields": [{ "key": "text", "label": "Prompt", "kind": "textarea", "rows": 3 }]
      },
      {
        "type": "preview", "label": "Preview", "category": "Outputs", "color": "chart-3",
        "ports": [{ "id": "value", "direction": "input", "type": "any" }],
        "fields": [{ "key": "value", "label": "Result", "kind": "output" }]
      }
    ]
  </script>
  <script type="application/json" class="workflow-source">
    {
      "schemaVersion": 1, "id": "pipeline", "title": "Text pipeline",
      "nodes": [
        { "id": "a", "type": "prompt", "title": "Prompt", "x": 0, "y": 0, "width": 260, "height": 200,
          "ports": [{ "id": "text", "direction": "output", "type": "text" }], "data": { "text": "A lighthouse at dawn" } },
        { "id": "b", "type": "preview", "title": "Preview", "x": 360, "y": 0, "width": 260, "height": 160,
          "ports": [{ "id": "value", "direction": "input", "type": "any" }], "data": {} }
      ],
      "edges": [{ "id": "e1", "source": { "node": "a", "port": "text" }, "target": { "node": "b", "port": "value" } }],
      "groups": []
    }
  </script>
</div>
```

### A synthetic workflow of 10,000 nodes and 100,000 connections

```html
<div class="workflow" id="big" data-generate="10000" data-edges="100000" data-seed="7"
     aria-label="A synthetic workflow of 10,000 nodes"></div>
```

### Outlets, outputs and actions

```html
<div class="toolbar" role="toolbar" aria-label="Workflow">
  <button class="btn" data-variant="ghost" data-size="sm" type="button"
          data-workflow-for="pipeline" data-workflow-action="undo">Undo</button>
  <button class="btn" data-variant="ghost" data-size="sm" type="button"
          data-workflow-for="pipeline" data-workflow-action="arrange">Arrange</button>
  <button class="btn" data-size="sm" type="button"
          data-workflow-for="pipeline" data-workflow-action="run">Run</button>
</div>
<aside data-workflow-for="pipeline" data-workflow-outlet="palette"></aside>
<aside data-workflow-for="pipeline" data-workflow-outlet="inspector"></aside>
<output data-workflow-for="pipeline" data-workflow-output="nodes"></output>
```

Outlets (`data-workflow-outlet`): `palette` (the node types by category, a search; click or drag to
add; `data-workflow-types="ag-* report"` lists only those names - `prefix*` for every name that
starts so - read on each render: a load, a registration, a search), `outline` (groups and nodes, a search; a click flies there), `inspector` (the selection:
title, lock, data as JSON, ports and connections; a connection's route; the keys when nothing is
selected), `breadcrumb` (the subworkflow path as a Breadcrumb). Outputs (`data-workflow-output`):
`title`, `nodes`, `edges`, `groups`, `selection`, `zoom`, `drawn` (connections drawn, "sampled"
under budget; `data-sampled` then), `cards`, `renderer`, `frame`, `status`, `depth`. Actions
(`data-workflow-action`; disabled while they cannot apply): `undo`, `redo`, `fit`, `fit-selection`,
`zoom-in`, `zoom-out`, `arrange`, `group` (`data-workflow-title` names it), `ungroup`, `collapse`,
`duplicate`, `copy`, `paste`, `delete`, `select-all`, `align-left`, `align-top`, `run`, `cancel`,
`parent`, `top`, `enter`, `import`, `export`, `readonly` (`aria-pressed`), `add`
(`data-workflow-type`).

### Fields: custom editors, renderers, labels

A field shows a control - or, when it has `render`, a custom editor (`edit` or `editor: "external"`) or
the kind `value` / `output` / `image`, its value. A custom editor's value is a `role="button"` with
`aria-haspopup="dialog"`, and the default label ends in an arrow (`.workflow-field-edit-icon`).

```js
df$.shadcn.workflow.register(document.getElementById('pipeline'), {
  type: 'job', label: 'Job', ports: [{ id: 'in', direction: 'input', type: 'text' }],
  fields: [
    // a wizard in a Dialog collects one object; render() draws it in the card
    { key: 'config', label: 'Config', kind: 'value', height: 92,
      edit: (value, context) => openWizard(value),          // resolves the new value, or undefined
      render: (value, context) => badgesFor(value) },       // text or a node
    // the label follows the value
    { key: 'temperature', label: 'Temperature', kind: 'slider', min: 0, max: 2, step: 0.1,
      renderLabel: (value) => (value > 1.2 ? '🔥 Temperature' : null) },
    // the page edits it: workflow-field-edit (cancelable), then setField()
    { key: 'notes', label: 'Notes', kind: 'textarea', editor: 'external' },
  ],
});
```

`layout: 'list'` on a type, or `data-layout="list"` on the editor, draws the fields as a Property Grid
list (`.property-grid[data-layout="list"]`: labels above values, a value edits in place); a node
without a type then lists its whole data. A JSON type's field lends `edit` / `render` / `renderLabel`
from the global type of the same name, as the type lends `run` and `mount`.

### Connection types: look and label

A connection's type - its `type`, else its source port's type - lends its look and its label. The canvas
draws the line (color, `dash` solid / dashed / dotted, `width` 0.5 to 12); the labels
(`button.workflow-edge-label`, a click selects the connection) and the moving dashes
(`svg.workflow-edge-flow path`, for `animated` connections and the ones into a running node) are drawn
for the connections in view, at most 300. A label sits halfway along its connection, else further
along it (40 %, 60 %, 30 % ...), else just beside it, where it covers neither a card nor another label; with no free place
it hides (`data-crowded`) until the view gives it room - the selected connection's label always shows.
Far off (below 55 % zoom) the canvas draws each card with its title at a readable size on screen, and a
group's title grows the same way (up to 4x, from the `--workflow-zoom` the editor sets on its group layer).

```js
const W = df$.shadcn.workflow;
// every connection that leaves a "tensor" port: thick, its label the shape the last run sent
W.registerEdge('global', { type: 'tensor', color: 'chart-2', width: 3,
  render: (edge, { value }) => (Array.isArray(value) ? `[${value.length}]` : 'tensor') });
// a connection names its own type and may override the look
// { "id": "e3", "type": "fallback", "dash": "dotted", "label": "on empty", "source": ..., "target": ... }
W.setEdge(pipeline, 'e3', { animated: true, color: 'var(--destructive)' });   // one undoable change
```

### A navigator: a Data Tree of the document

```html
<button class="toggle" id="follow" type="button" aria-pressed="true">Follow</button>
<input class="input" data-tree-filter="nav" aria-label="Find a node" placeholder="Find a node…">
<div class="data-tree" id="nav" aria-label="Nodes" data-label-field="title" data-exclusive data-persist="none"></div>
```

```js
const W = df$.shadcn.workflow, T = df$.shadcn.dataTree;
T.setSource(nav, W.tree(pipeline));                         // groups, nodes, nodes inside subworkflows
nav.addEventListener('data-tree-select', (e) => e.detail.record.kind !== 'group' &&
  W.reveal(pipeline, e.detail.record.path, { camera: follow.getAttribute('aria-pressed') === 'true' }));
pipeline.addEventListener('workflow-select', (e) => e.detail.selected.length === 1 &&
  T.reveal(nav, [...e.detail.path, e.detail.selected[0]].join('/')));
```

## Variants

| Attribute | Effect |
| --- | --- |
| `data-generate="n"` (+ `data-edges`, `data-seed`, `data-stage`, `data-groups`, `data-collapsed`) | a synthetic workflow: n nodes in stages, connections between them, groups of stages |
| `data-readonly` | the readonly state: look, select, run - no edit |
| `data-selected="a b"` / `data-selected-edge="e1"` | the selection (written back on every change) |
| `data-camera="x y zoom"` | the starting view (default: fit) |
| `data-minimap="none"` | no minimap |
| `data-controls="none"` | no zoom controls |
| `data-worker="none"` | draw on the main thread (the fallback, also taken when no worker starts) |
| `data-layout="list"` | every card's fields (a typeless node: its data) as a Property Grid list - labels above values, a value edits in place; a type's `layout` wins |
| `--workflow-height` | the editor's height (default 32rem) |

Node types (`script.workflow-types` or `df$.shadcn.workflow.register`) draw their cards: `fields`
are the system's own controls bound to a data key - `text` and `number` (Input), `textarea`
(Textarea), `select` (Select), `slider` (Slider with a readout), `checkbox` (Checkbox), `switch`
(Switch), `color`, `image` (shows a URL from the data or the run's output), `output` (shows the
run's output for that key), `value` (shows the data - a summary, or `render()`); `edit` /
`editor: "external"` give a field a custom editor, `render` / `renderLabel` draw its value and label;
`mount(host, node, context)` draws a body of your own. `color`
is a theme chart color (`chart-1` ... `chart-5`) or a CSS color; a port type's color is one of
eight fixed hues picked by the type's name, so `image` looks the same in every workflow.

## Sizes

The editor fills its container's width and is `--workflow-height` high (default `32rem`, at
least `12rem`). Cards keep their document size and scale with the zoom.

## ARIA

| Element | Attribute | Notes |
| --- | --- | --- |
| `.workflow` | `role="application"`, `aria-roledescription="workflow editor"`, `tabindex="0"` | one tab stop for the canvas keys; give it an `aria-label` |
| `.workflow` | `aria-busy="true"` (and `data-running`) while a run is in flight | removed when the run ends - done, error or cancelled |
| `.workflow-edge-label` | `<button tabindex="-1">`, `aria-label` = "Connection" and its label | a click selects the connection; the inspector and the keys edit it |
| `.workflow-node` | `role="group"`, `aria-label` = the title | its ports and fields are reachable by Tab |
| `.workflow-port` | `<button>` with `aria-label` = direction, name and type | Enter on one port, then on another, connects |
| `.workflow-group-toggle` | `aria-expanded`, `aria-label` | collapses and expands a group |
| `.workflow-live` | `aria-live="polite"` | connections, errors and arrangements are announced |
| `.workflow-controls` | `role="toolbar"` | zoom out, zoom to 100 %, zoom in, fit |

Keys on the focused editor: arrows nudge the selection (Shift: further), Alt + arrow follows a
connection, ⌘/Ctrl Z / ⇧Z undo and redo, ⌘ C / V / D copy, paste, duplicate, ⌘ A selects all,
Delete removes, F fits (⇧F the selection), + / − / 0 zoom, Enter opens a subworkflow, Space +
drag pans, Escape cancels a drag or a pending connection.

## Notes

- **History**: every edit is one labelled change; `history()` lists the changes of the level the editor shows
  (each subworkflow level keeps its own, the last 100) and how many are applied, `travel(at)` undoes or redoes
  one change at a time until `at` are applied - a revision list steps through them. Each step is a
  `workflow-change`, as an undo is.
- **The budget**: at most 150 HTML cards, 3,000 canvas-drawn nodes (30,000 plain boxes below 12 %
  zoom) and 5,000 connections a
  frame. A frame that costs more than 20 ms draws fewer connections (`drawn` says "sampled"); a
  run of fast frames earns them back. Nothing is deleted - the selection's connections and the
  selected connection are always drawn. Below zoom 0.55 every node is drawn on the canvas.
- **One frame**: cards and groups move with the live camera; the worker's last bitmap is moved
  and scaled by a corrective transform until the next one arrives, so a pan never waits on it.
- **Connections are checked**: an output connects to an input of the same type, `any`, or a type
  the input `accepts`; an input takes one connection unless `maxConnections` says more (`0`:
  any number); no cycles unless the document's `policy.allowCycles`; no duplicates. A refused
  connection says why (`workflow-error`). Dragging from an occupied input moves its connection;
  dropping on a card picks its first free port that fits; compatible ports grow while you drag.
- **Atomic edits**: every change is one transaction - all its patches or none - and one undo step.
  Drags preview without committing and commit once on release.
- **Running**: the run action runs the node types' `run(node, { inputs, signal, progress })`
  handlers in the page in topological order - or an adapter from `configure(el, { execution })`
  that runs elsewhere and reports each node's state. Cards show queued / running (with progress) /
  success / error; the canvas marks far nodes the same way.
- **Formats**: `load()` and the import action read the native JSON, a ComfyUI API prompt and a
  Gradio workflow (schema 2); `toComfy()` / `toGradio()` write them back. Import refuses invalid
  documents and keeps the current one.
- **Subworkflows**: a node with a `subgraph` (its ports bound to the subgraph's `inputs` /
  `outputs`) shows a stacked card; double click, Enter or the enter action opens it, the parent
  action or the breadcrumb leaves it and writes the edit back as one undoable change.

## States

| State | Meaning |
| --- | --- |
| `default` | editable |
| `readonly` | looked at, selected and run - not changed (`data-readonly`; card controls disabled) |

Config `{ selected, edge, camera }` - merged per setState; a selection and a connection are never
selected together. The camera is read live and moves the view when passed; it is not markup.

```js
el.api.setState('readonly', { selected: ['b'] });
el.api.setState('default', { camera: { x: 40, y: 40, zoom: 0.8 } });
```

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type WorkflowState = 'default' | 'readonly'</code> - `setState(name, config)` takes the config of the state it names (`WorkflowStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | editable <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>selected?</code></td><td><code>string[]</code></td><td>the selected node ids (data-selected)</td></tr><tr><td><code>edge?</code></td><td><code>string \| null</code></td><td>the selected connection's id (data-selected-edge); nodes and a connection are never selected together</td></tr><tr><td><code>camera?</code></td><td><code>WorkflowCamera \| null</code></td><td>the camera; set to move the view</td></tr></table> |
| `readonly` | looked at, selected and run - not changed <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>selected?</code></td><td><code>string[]</code></td><td>the selected node ids (data-selected)</td></tr><tr><td><code>edge?</code></td><td><code>string \| null</code></td><td>the selected connection's id (data-selected-edge); nodes and a connection are never selected together</td></tr><tr><td><code>camera?</code></td><td><code>WorkflowCamera \| null</code></td><td>the camera; set to move the view</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends WorkflowState&gt;(name: S, config?: WorkflowStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>WorkflowStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: WorkflowState; config: WorkflowStateConfigs[WorkflowState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: WorkflowState; config: WorkflowStateConfigs[WorkflowState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: WorkflowState; config: WorkflowStateConfigs[WorkflowState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: WorkflowState; config: WorkflowStateConfigs[WorkflowState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: WorkflowState; config: WorkflowStateConfigs[WorkflowState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.workflowApi.setState&lt;S extends WorkflowState&gt;(el: HTMLElement, name: S, config?: WorkflowStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>WorkflowStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.workflowApi.getState(el: HTMLElement): { name: WorkflowState; config: WorkflowStateConfigs[WorkflowState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: WorkflowState; config: WorkflowStateConfigs[WorkflowState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.workflowApi.render(state: { name: WorkflowState; config: WorkflowStateConfigs[WorkflowState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: WorkflowState; config: WorkflowStateConfigs[WorkflowState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.workflowApi.store(el: HTMLElement): Store&lt;{ name: WorkflowState; config: WorkflowStateConfigs[WorkflowState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: WorkflowState; config: WorkflowStateConfigs[WorkflowState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.workflowApi.commit&lt;S extends WorkflowState&gt;(el: HTMLElement, name: S, config?: WorkflowStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>WorkflowStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.workflowStates: WorkflowState[]</code> | The declared states, 'default' first: <code>default</code>, <code>readonly</code>. |

### `df$.shadcn.workflow`

| Member | Description |
|---|---|
| <code>register(scope: 'global' \| string \| HTMLElement, definition: WorkflowNodeType): ()</code> | Registers a node type: its ports, defaults, card controls and run handler. 'global' makes it known to every workflow on the page; an element (or its selector) to that one only, where it wins over a global type. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>scope</code></td><td><code>'global' \| string \| HTMLElement</code></td><td>'global', a .workflow element or its selector</td></tr><tr><td><code>definition</code></td><td><code>WorkflowNodeType</code></td><td>the node type</td></tr></table> <b>Returns</b> <code>()</code> - removes the type again |
| <code>registerEdge(scope: 'global' \| string \| HTMLElement, definition: WorkflowEdgeType): ()</code> | Registers a connection type - the look (color, dash, width, animated) and the label renderer of the connections that name it in `type`, or leave an output port of that type. A connection's own values win. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>scope</code></td><td><code>'global' \| string \| HTMLElement</code></td><td>'global', a .workflow element or its selector</td></tr><tr><td><code>definition</code></td><td><code>WorkflowEdgeType</code></td><td>the connection type</td></tr></table> <b>Returns</b> <code>()</code> - removes the type again |
| <code>setEdge(target: string \| HTMLElement, id: string, update: Partial&lt;Omit&lt;WorkflowEdge, 'id' \| 'source' \| 'target'&gt;&gt;): boolean</code> | Changes a connection - its label, type, route, color, dash, width, animated or data (undefined removes a key): one undoable change and a workflow-change. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the connection's id</td></tr><tr><td><code>update</code></td><td><code>Partial&lt;Omit&lt;WorkflowEdge, 'id' \| 'source' \| 'target'&gt;&gt;</code></td><td>the values to change</td></tr></table> <b>Returns</b> <code>boolean</code> - false when there is no such connection |
| <code>load(target: string \| HTMLElement, document: WorkflowDocument \| Record&lt;string, WorkflowJson&gt;): void</code> | Replaces the workflow with a document (any format: native, a ComfyUI API prompt, a Gradio workflow); history starts over, the view fits. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>document</code></td><td><code>WorkflowDocument \| Record&lt;string, WorkflowJson&gt;</code></td><td>the document</td></tr></table> |
| <code>export(target: string \| HTMLElement): WorkflowDocument</code> | The whole document as JSON - a subworkflow being edited is written back into its node. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr></table> <b>Returns</b> <code>WorkflowDocument</code> - the document, nodes / edges / groups sorted by id |
| <code>addNode(target: string \| HTMLElement, type: string, at?: WorkflowPoint): string \| undefined</code> | Adds a node of a registered type. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the node type</td></tr><tr><td><code>at?</code></td><td><code>WorkflowPoint</code></td><td>where its center goes, world units (default: the middle of the view)</td></tr></table> <b>Returns</b> <code>string \| undefined</code> - the new node's id, or undefined when refused (readonly, unknown type) |
| <code>node(target: string \| HTMLElement, type: string, at: WorkflowPoint, overrides?: Partial&lt;WorkflowNode&gt;): WorkflowNode</code> | A node of a registered type, not yet added: its ports, defaults and a height that fits its fields - for building a document in script and loading it with load(). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector (its own types, then the global ones)</td></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the node type</td></tr><tr><td><code>at</code></td><td><code>WorkflowPoint</code></td><td>its top-left corner, world units</td></tr><tr><td><code>overrides?</code></td><td><code>Partial&lt;WorkflowNode&gt;</code></td><td>fields to set on it (id, title, data merged into the defaults, width, height, groupId)</td></tr></table> <b>Returns</b> <code>WorkflowNode</code> - the node |
| <code>connect(target: string \| HTMLElement, source: WorkflowEndpoint, to: WorkflowEndpoint): string</code> | Connects an output port to an input port - checked like a drag: types, free capacity, no cycle. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>source</code></td><td><code>WorkflowEndpoint</code></td><td>the output end</td></tr><tr><td><code>to</code></td><td><code>WorkflowEndpoint</code></td><td>the input end</td></tr></table> <b>Returns</b> <code>string</code> - the new connection's id (throws with the reason when refused) |
| <code>commit(target: string \| HTMLElement, label: string, patches: WorkflowPatch[]): void</code> | Applies patches as one undoable transaction - all or nothing: an invalid batch changes nothing and throws. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>what the change is called in the history</td></tr><tr><td><code>patches</code></td><td><code>WorkflowPatch[]</code></td><td>the new values (no value removes)</td></tr></table> |
| <code>undo(target: string \| HTMLElement): void</code> | Undoes the last change. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr></table> |
| <code>redo(target: string \| HTMLElement): void</code> | Redoes the last undone change. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr></table> |
| <code>history(target: string \| HTMLElement): WorkflowHistory</code> | The change history of the level the editor shows: every change by its label and how many are applied - the steps undo and redo walk (at most the last 100). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr></table> <b>Returns</b> <code>WorkflowHistory</code> - the changes, oldest first, and the position |
| <code>travel(target: string \| HTMLElement, at: number): void</code> | Moves through the history: undoes or redoes one change at a time until `at` changes are applied (0: the document as loaded). Each step is a workflow-change, as an undo or a redo is; nothing happens while read-only. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>at</code></td><td><code>number</code></td><td>how many changes stay applied</td></tr></table> |
| <code>select(target: string \| HTMLElement, ids: string[], edge?: string): void</code> | Selects nodes - or one connection. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>ids</code></td><td><code>string[]</code></td><td>the node ids</td></tr><tr><td><code>edge?</code></td><td><code>string</code></td><td>a connection id instead (the nodes are then ignored)</td></tr></table> |
| <code>focus(target: string \| HTMLElement, id: string): void</code> | Moves the view to a node and selects it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the node id</td></tr></table> |
| <code>setField(target: string \| HTMLElement, id: string, key: string, value: WorkflowJson): boolean</code> | Writes one field of a node of the shown level - one undoable change, workflow-field-change follows. The value must be JSON (a node's data is). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the node id</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>the data key</td></tr><tr><td><code>value</code></td><td><code>WorkflowJson</code></td><td>the new value</td></tr></table> <b>Returns</b> <code>boolean</code> - false when refused: read only, no such node, not JSON |
| <code>getField(target: string \| HTMLElement, id: string, key: string): WorkflowJson \| undefined</code> | One field of a node of the shown level. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the node id</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>the data key</td></tr></table> <b>Returns</b> <code>WorkflowJson \| undefined</code> - a copy of its value, undefined when the node or the key is missing |
| <code>editField(target: string \| HTMLElement, id: string, key: string): Promise&lt;boolean&gt;</code> | Opens a field's editor - what a click on its value does: a custom editor gets workflow-field-edit (cancelable) and then the field's edit(); an inline control gets the focus (the view moves to the node when it has no card). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the node id</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>the data key</td></tr></table> <b>Returns</b> <code>Promise&lt;boolean&gt;</code> - resolves true when a value was written (a custom editor) or a control took the focus |
| <code>tree(target: string \| HTMLElement): WorkflowTreeRow[]</code> | The whole document as rows for a Data Tree: groups, nodes and the nodes inside subworkflows, each with its parent row - the subworkflow being edited included as it is now. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr></table> <b>Returns</b> <code>WorkflowTreeRow[]</code> - the rows, a parent before its children |
| <code>reveal(target: string \| HTMLElement, path: string[], options?: { camera?: boolean }): boolean</code> | Shows a node anywhere in the document: enters the subworkflows on its way (and leaves the ones off it), selects it and - with camera - moves the view to it. The focus stays where it is. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>path</code></td><td><code>string[]</code></td><td>a tree row's path: the subworkflow node ids from the top, then the node's id</td></tr><tr><td><code>options?</code></td><td><code>{ camera?: boolean }</code></td><td>camera: true moves the view to the node (default false: only the selection changes)</td></tr></table> <b>Returns</b> <code>boolean</code> - false when the path leads nowhere |
| <code>fit(target: string \| HTMLElement, selection?: boolean): void</code> | Fits the workflow, or the selection, into the view. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>selection?</code></td><td><code>boolean</code></td><td>true: only the selected nodes</td></tr></table> |
| <code>camera(target: string \| HTMLElement, camera?: WorkflowCamera): WorkflowCamera</code> | The camera, or moves it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>camera?</code></td><td><code>WorkflowCamera</code></td><td>the camera to move to (omit to read)</td></tr></table> <b>Returns</b> <code>WorkflowCamera</code> - the camera after the move |
| <code>arrange(target: string \| HTMLElement): Promise&lt;void&gt;</code> | Arranges the nodes in layers (left to right along the connections) in a worker - one undoable change. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when the nodes moved |
| <code>run(target: string \| HTMLElement): Promise&lt;void&gt;</code> | Runs the workflow: the configured execution adapter, else the node types' run() handlers in the page. Every node shows its state; resolves when the run ends (it never rejects - workflow-run says how it ended). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when the run ended |
| <code>cancel(target: string \| HTMLElement): void</code> | Cancels a run. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr></table> |
| <code>setRuntime(target: string \| HTMLElement, id: string, state: WorkflowRuntime): void</code> | Sets a node's run state from outside - a server's progress, a queue. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the node id</td></tr><tr><td><code>state</code></td><td><code>WorkflowRuntime</code></td><td>its run state</td></tr></table> |
| <code>configure(target: string \| HTMLElement, options: { execution?: WorkflowExecutionAdapter \| null }): void</code> | Configures how the workflow runs. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>options</code></td><td><code>{ execution?: WorkflowExecutionAdapter \| null }</code></td><td>execution: an adapter that runs documents (null: the built-in one)</td></tr></table> |
| <code>enter(target: string \| HTMLElement, id: string): void</code> | Opens a node's subworkflow (its card shows a stack); the breadcrumb outlet and the parent action lead back. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the node id</td></tr></table> |
| <code>leave(target: string \| HTMLElement, levels?: number): void</code> | Leaves subworkflows, writing their changes back into their nodes. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>levels?</code></td><td><code>number</code></td><td>how many levels up (default 1)</td></tr></table> |
| <code>stats(target: string \| HTMLElement): WorkflowStats \| null</code> | What the last frame drew: the budgets at work. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr></table> <b>Returns</b> <code>WorkflowStats \| null</code> - the frame's numbers, or null before the first frame |
| <code>action(target: string \| HTMLElement, name: string): void</code> | Runs an action by name - what a data-workflow-action button does. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr><tr><td><code>name</code></td><td><code>string</code></td><td>undo, redo, fit, fit-selection, zoom-in, zoom-out, arrange, group, ungroup, collapse, duplicate, copy, paste, delete, select-all, align-left, align-top, run, cancel, parent, top, enter, import, export or readonly</td></tr></table> |
| <code>generate(spec?: WorkflowGenerateSpec): WorkflowDocument</code> | A synthetic workflow - stages of nodes with typed ports and connections between them; the same spec gives the same workflow. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>spec?</code></td><td><code>WorkflowGenerateSpec</code></td><td>how many nodes and connections, the seed, the stage height, groups</td></tr></table> <b>Returns</b> <code>WorkflowDocument</code> - the document |
| <code>validate(document: WorkflowDocument): string \| null</code> | Checks a document - its structure and its graph: endpoints, port types and capacity, duplicates, cycles, groups, subworkflow interfaces. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>document</code></td><td><code>WorkflowDocument</code></td><td>the document</td></tr></table> <b>Returns</b> <code>string \| null</code> - null when valid, else the first problem |
| <code>fromComfy(prompt: WorkflowComfyPrompt): WorkflowDocument</code> | Reads a ComfyUI API prompt (each node id with its class_type and inputs) as a workflow document. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>prompt</code></td><td><code>WorkflowComfyPrompt</code></td><td>the prompt</td></tr></table> <b>Returns</b> <code>WorkflowDocument</code> - the document |
| <code>toComfy(document: WorkflowDocument): WorkflowComfyPrompt</code> | Writes a workflow of imported comfy:* nodes back as a ComfyUI API prompt. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>document</code></td><td><code>WorkflowDocument</code></td><td>the document</td></tr></table> <b>Returns</b> <code>WorkflowComfyPrompt</code> - the prompt |
| <code>fromGradio(workflow: Record&lt;string, WorkflowJson&gt;): WorkflowDocument</code> | Reads a Gradio workflow (schema_version "2") as a workflow document; unknown fields are kept in the data. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>workflow</code></td><td><code>Record&lt;string, WorkflowJson&gt;</code></td><td>the Gradio workflow</td></tr></table> <b>Returns</b> <code>WorkflowDocument</code> - the document |
| <code>toGradio(document: WorkflowDocument): Record&lt;string, WorkflowJson&gt;</code> | Writes a workflow of imported gradio:* nodes back as a Gradio workflow (schema_version "2"). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>document</code></td><td><code>WorkflowDocument</code></td><td>the document</td></tr></table> <b>Returns</b> <code>Record&lt;string, WorkflowJson&gt;</code> - the Gradio workflow |
| <code>destroy(target: string \| HTMLElement): void</code> | Stops a workflow: the worker ends, the listeners go, the outlets empty, the State API unbinds. data-init stays, so it does not start again by itself - remove the attribute to start it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .workflow element or its selector</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `workflow-change` | a committed transaction: an edit, an undo, a redo, an arrangement <code>detail</code>: <code>WorkflowChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>label</code></td><td><code>string</code></td><td>what changed, in words ("Move nodes", "Undo Connect")</td></tr><tr><td><code>version</code></td><td><code>number</code></td><td>the store's version after the change</td></tr><tr><td><code>undo</code></td><td><code>boolean</code></td><td>true for undo and redo</td></tr><tr><td><code>patches</code></td><td><code>readonly WorkflowPatch[]</code></td><td>the entities it touched</td></tr></table> |
| `workflow-error` | an action was refused or failed: a connection that does not fit, an import that cannot be read <code>detail</code>: <code>WorkflowErrorDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>message</code></td><td><code>string</code></td><td>why</td></tr></table> |
| `workflow-field-change` | a node's field took a new value: its control, a custom editor or setField() - undo and redo are workflow-change only <code>detail</code>: <code>WorkflowFieldChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>nodeId</code></td><td><code>string</code></td><td>the node</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>the data key</td></tr><tr><td><code>value</code></td><td><code>WorkflowJson</code></td><td>the new value</td></tr><tr><td><code>oldValue</code></td><td><code>WorkflowJson \| undefined</code></td><td>the value it held (undefined: none)</td></tr><tr><td><code>path</code></td><td><code>string[]</code></td><td>the ids of the subworkflow nodes the node is inside, from the top</td></tr></table> |
| `workflow-field-edit` | a field's custom editor is asked for (a click on its value, Enter, editField()) - preventDefault() and write the value with setField() <code>detail</code>: <code>WorkflowFieldEditDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>nodeId</code></td><td><code>string</code></td><td>the node</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>the data key</td></tr><tr><td><code>value</code></td><td><code>WorkflowJson \| undefined</code></td><td>a copy of the value it holds</td></tr><tr><td><code>path</code></td><td><code>string[]</code></td><td>the ids of the subworkflow nodes the node is inside, from the top</td></tr></table> |
| `workflow-navigate` | the view entered or left a subworkflow <code>detail</code>: <code>WorkflowNavigateDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>path</code></td><td><code>string[]</code></td><td>the titles from the top workflow down to the one shown</td></tr></table> |
| `workflow-node-state` | one node's run state changed <code>detail</code>: <code>WorkflowNodeStateDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>nodeId</code></td><td><code>string</code></td><td>the node</td></tr><tr><td><code>state</code></td><td><code>WorkflowRuntime</code></td><td>its run state</td></tr></table> |
| `workflow-run` | a run started (running) or ended (done, error, cancelled) <code>detail</code>: <code>WorkflowRunDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>status</code></td><td><code>'running' \| 'done' \| 'error' \| 'cancelled'</code></td><td>running, done, error or cancelled</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>the error message</td></tr></table> |
| `workflow-select` | the selection changed: a click, a marquee, select-all, setState, reveal() <code>detail</code>: <code>WorkflowSelectDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>selected</code></td><td><code>string[]</code></td><td>the selected node ids</td></tr><tr><td><code>edge</code></td><td><code>string \| null</code></td><td>the selected connection, or null</td></tr><tr><td><code>path</code></td><td><code>string[]</code></td><td>the ids of the subworkflow nodes the view is inside, from the top ([] at the top)</td></tr></table> |
| `workflow-view` | the camera came to rest (no change for 150 ms) <code>detail</code>: <code>WorkflowViewDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>camera</code></td><td><code>WorkflowCamera</code></td><td>the camera</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `WorkflowCamera` | The camera: the screen position of the world origin and the zoom factor. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>x</code></td><td><code>number</code></td><td>screen x of the world origin, in CSS pixels</td></tr><tr><td><code>y</code></td><td><code>number</code></td><td>screen y of the world origin, in CSS pixels</td></tr><tr><td><code>zoom</code></td><td><code>number</code></td><td>the zoom factor, 0.025 to 3</td></tr></table> |
| `WorkflowChangeDetail` | Detail of workflow-change: a committed transaction (an edit, an undo, a redo). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>label</code></td><td><code>string</code></td><td>what changed, in words ("Move nodes", "Undo Connect")</td></tr><tr><td><code>version</code></td><td><code>number</code></td><td>the store's version after the change</td></tr><tr><td><code>undo</code></td><td><code>boolean</code></td><td>true for undo and redo</td></tr><tr><td><code>patches</code></td><td><code>readonly WorkflowPatch[]</code></td><td>the entities it touched</td></tr></table> |
| `WorkflowComfyNode` | One node of a ComfyUI API prompt. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>class_type</code></td><td><code>string</code></td><td>the node class</td></tr><tr><td><code>inputs</code></td><td><code>Record&lt;string, WorkflowJson&gt;</code></td><td>parameters and links ([source node id, output slot]) by input name</td></tr><tr><td><code>_meta?</code></td><td><code>{ title?: string }</code></td><td>the title</td></tr></table> |
| `WorkflowComfyPrompt` | A ComfyUI API prompt: each node id names its node (not LiteGraph's visual workflow JSON). = <code>Record&lt;string, WorkflowComfyNode&gt;</code> |
| `WorkflowConfig` | The state config: the selection and the camera (merged per setState). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>selected?</code></td><td><code>string[]</code></td><td>the selected node ids (data-selected)</td></tr><tr><td><code>edge?</code></td><td><code>string \| null</code></td><td>the selected connection's id (data-selected-edge); nodes and a connection are never selected together</td></tr><tr><td><code>camera?</code></td><td><code>WorkflowCamera \| null</code></td><td>the camera; set to move the view</td></tr></table> |
| `WorkflowDocument` | A workflow document, schema version 1 - plain JSON, the format export() writes and load() reads. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>schemaVersion</code></td><td><code>1</code></td><td>always 1</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the document id</td></tr><tr><td><code>title</code></td><td><code>string</code></td><td>the title</td></tr><tr><td><code>nodes</code></td><td><code>WorkflowNode[]</code></td><td>the nodes</td></tr><tr><td><code>edges</code></td><td><code>WorkflowEdge[]</code></td><td>the connections</td></tr><tr><td><code>groups</code></td><td><code>WorkflowGroup[]</code></td><td>the groups</td></tr><tr><td><code>inputs?</code></td><td><code>WorkflowInterfacePort[]</code></td><td>inputs when used as a subworkflow</td></tr><tr><td><code>outputs?</code></td><td><code>WorkflowInterfacePort[]</code></td><td>outputs when used as a subworkflow</td></tr><tr><td><code>metadata?</code></td><td><code>Record&lt;string, WorkflowJson&gt;</code></td><td>free JSON</td></tr><tr><td><code>policy?</code></td><td><code>{ allowCycles: boolean }</code></td><td>allowCycles: true permits loops (the default refuses a connection that closes one)</td></tr></table> |
| `WorkflowEdge` | A connection from an output port to an input port. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>unique within its workflow</td></tr><tr><td><code>source</code></td><td><code>WorkflowEndpoint</code></td><td>the output end</td></tr><tr><td><code>target</code></td><td><code>WorkflowEndpoint</code></td><td>the input end</td></tr><tr><td><code>route?</code></td><td><code>'bezier' \| 'orthogonal' \| 'straight'</code></td><td>how it is drawn: bezier (default), orthogonal or straight</td></tr><tr><td><code>points?</code></td><td><code>WorkflowPoint[]</code></td><td>reroute points it passes through, in order</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>a label</td></tr><tr><td><code>color?</code></td><td><code>string</code></td><td>a CSS color for the line (default: its connection type's, else its port type's color)</td></tr><tr><td><code>type?</code></td><td><code>string</code></td><td>the connection type - a registered WorkflowEdgeType lends its look and its label renderer (default: the source port's type)</td></tr><tr><td><code>dash?</code></td><td><code>'solid' \| 'dashed' \| 'dotted'</code></td><td>the line: solid (default), dashed or dotted</td></tr><tr><td><code>width?</code></td><td><code>number</code></td><td>the line width in pixels, 0.5 to 12 (default 1.75)</td></tr><tr><td><code>animated?</code></td><td><code>boolean</code></td><td>true: dashes travel along the line from source to target</td></tr><tr><td><code>data?</code></td><td><code>Record&lt;string, WorkflowJson&gt;</code></td><td>the connection's own parameters - plain JSON</td></tr></table> |
| `WorkflowEdgeContext` | What a connection type's label renderer receives besides the connection. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source</code></td><td><code>WorkflowNode</code></td><td>the node the connection leaves</td></tr><tr><td><code>target</code></td><td><code>WorkflowNode</code></td><td>the node it enters</td></tr><tr><td><code>port</code></td><td><code>WorkflowPort \| undefined</code></td><td>the output port it leaves</td></tr><tr><td><code>value</code></td><td><code>WorkflowJson \| undefined</code></td><td>what the last run sent through it: the source's output at that port</td></tr><tr><td><code>runtime</code></td><td><code>WorkflowRuntime</code></td><td>the source node's run state</td></tr><tr><td><code>selected</code></td><td><code>boolean</code></td><td>true while the connection is selected</td></tr><tr><td><code>workflow</code></td><td><code>HTMLElement</code></td><td>the .workflow element</td></tr></table> |
| `WorkflowEdgeType` | A connection type: the look and the label of the connections that name it - or leave a port of that type. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the name a connection carries in type, or a port type: connections from a port of that type take it</td></tr><tr><td><code>color?</code></td><td><code>string</code></td><td>a CSS color or a theme chart color (chart-1 ... chart-5)</td></tr><tr><td><code>dash?</code></td><td><code>'solid' \| 'dashed' \| 'dotted'</code></td><td>solid, dashed or dotted</td></tr><tr><td><code>width?</code></td><td><code>number</code></td><td>the line width in pixels, 0.5 to 12</td></tr><tr><td><code>animated?</code></td><td><code>boolean</code></td><td>true: dashes travel along the line</td></tr><tr><td><code>render?</code></td><td><code>(edge: WorkflowEdge, context: WorkflowEdgeContext) =&gt; string \| Node \| null</code></td><td>draws the connection's label: text or a node (null: the connection's label, else none)</td></tr></table> |
| `WorkflowEndpoint` | One end of a connection: a node's port. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>node</code></td><td><code>string</code></td><td>the node id</td></tr><tr><td><code>port</code></td><td><code>string</code></td><td>the port id</td></tr></table> |
| `WorkflowErrorDetail` | Detail of workflow-error: an action was refused or failed. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>message</code></td><td><code>string</code></td><td>why</td></tr></table> |
| `WorkflowExecutionAdapter` | Runs a whole workflow somewhere - in the page, on a server - and reports each node's state. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>run</code></td><td><code>(document: WorkflowDocument, context: { signal: AbortSignal; emit: (event: WorkflowExecutionEvent) =&gt; void }) =&gt; Promise&lt;void&gt;</code></td><td>runs the document; emit() reports node states; resolves when done, rejects on failure</td></tr></table> |
| `WorkflowExecutionEvent` | A run state change of one node, sent by an execution adapter. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>nodeId</code></td><td><code>string</code></td><td>the node</td></tr><tr><td><code>state</code></td><td><code>WorkflowRuntime</code></td><td>its new run state</td></tr></table> |
| `WorkflowField` | A declarative control in a node card - drawn with the system's form components, bound to a key of the data. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>key</code></td><td><code>string</code></td><td>the data key the control edits (or, for output, the output port shown)</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>the label above the control</td></tr><tr><td><code>kind</code></td><td><code>'text' \| 'textarea' \| 'number' \| 'select' \| 'slider' \| 'checkbox' \| 'switch' \| 'color' \| 'image' \| 'output' \| 'value'</code></td><td>text, textarea, number, select, slider, checkbox, switch, color, image (shows a URL), output (shows a result) or value (shows the value, edited by a custom editor)</td></tr><tr><td><code>editor?</code></td><td><code>'inline' \| 'external'</code></td><td>'external': the page edits the value - a click fires workflow-field-edit and the page writes with setField() (the way a JSON type names a custom editor)</td></tr><tr><td><code>edit?</code></td><td><code>(value: WorkflowJson \| undefined, context: WorkflowFieldContext) =&gt; Promise&lt;WorkflowJson \| undefined&gt; \| WorkflowJson \| undefined</code></td><td>a custom editor - a dialog, a window, a wizard: resolves with the new value, or undefined to keep the old one</td></tr><tr><td><code>render?</code></td><td><code>(value: WorkflowJson \| undefined, context: WorkflowFieldContext) =&gt; string \| Node \| null</code></td><td>draws the value in the card instead of a control - for aggregate values: text or a node (null: the default summary)</td></tr><tr><td><code>renderLabel?</code></td><td><code>(value: WorkflowJson \| undefined, context: WorkflowFieldContext) =&gt; string \| Node \| null</code></td><td>draws the label: text or a node (null: the default - the label, with an arrow when a custom editor edits it)</td></tr><tr><td><code>height?</code></td><td><code>number</code></td><td>the room the field takes in a new card, world units (default: by its kind)</td></tr><tr><td><code>options?</code></td><td><code>string[]</code></td><td>select: the choices</td></tr><tr><td><code>min?</code></td><td><code>number</code></td><td>number / slider: the minimum</td></tr><tr><td><code>max?</code></td><td><code>number</code></td><td>number / slider: the maximum</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>number / slider: the step</td></tr><tr><td><code>placeholder?</code></td><td><code>string</code></td><td>text / textarea: the placeholder</td></tr><tr><td><code>rows?</code></td><td><code>number</code></td><td>textarea: the rows (default 3)</td></tr></table> |
| `WorkflowFieldChangeDetail` | Detail of workflow-field-change: a node's field took a new value - from its control, a custom editor or setField(). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>nodeId</code></td><td><code>string</code></td><td>the node</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>the data key</td></tr><tr><td><code>value</code></td><td><code>WorkflowJson</code></td><td>the new value</td></tr><tr><td><code>oldValue</code></td><td><code>WorkflowJson \| undefined</code></td><td>the value it held (undefined: none)</td></tr><tr><td><code>path</code></td><td><code>string[]</code></td><td>the ids of the subworkflow nodes the node is inside, from the top</td></tr></table> |
| `WorkflowFieldContext` | What a field's hooks (edit, render, renderLabel) receive besides its value. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>node</code></td><td><code>WorkflowNode</code></td><td>the node the field belongs to</td></tr><tr><td><code>field</code></td><td><code>WorkflowField</code></td><td>the field</td></tr><tr><td><code>runtime</code></td><td><code>WorkflowRuntime</code></td><td>the node's run state</td></tr><tr><td><code>workflow</code></td><td><code>HTMLElement</code></td><td>the .workflow element</td></tr><tr><td><code>readonly</code></td><td><code>boolean</code></td><td>true while the workflow is read only</td></tr><tr><td><code>custom</code></td><td><code>boolean</code></td><td>true when the field has a custom editor (edit or editor: 'external')</td></tr></table> |
| `WorkflowFieldEditDetail` | Detail of workflow-field-edit: a field's custom editor is asked for - cancelable: preventDefault() and write the value with setField(). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>nodeId</code></td><td><code>string</code></td><td>the node</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>the data key</td></tr><tr><td><code>value</code></td><td><code>WorkflowJson \| undefined</code></td><td>a copy of the value it holds</td></tr><tr><td><code>path</code></td><td><code>string[]</code></td><td>the ids of the subworkflow nodes the node is inside, from the top</td></tr></table> |
| `WorkflowGenerateSpec` | A synthetic workflow: how many nodes and connections, how they are arranged. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>nodes?</code></td><td><code>number</code></td><td>how many nodes, 1 to 100,000 (default 1,000)</td></tr><tr><td><code>edges?</code></td><td><code>number</code></td><td>how many connections (default: twice the nodes); always a DAG from stage to stage</td></tr><tr><td><code>seed?</code></td><td><code>number</code></td><td>the seed: the same seed gives the same workflow (default 1)</td></tr><tr><td><code>stage?</code></td><td><code>number</code></td><td>nodes per stage, the column height (default: the square root of the nodes)</td></tr><tr><td><code>groups?</code></td><td><code>number</code></td><td>wrap blocks of stages in groups, this many stages each (default 0: no groups)</td></tr><tr><td><code>collapsed?</code></td><td><code>boolean</code></td><td>collapse every other group</td></tr></table> |
| `WorkflowGroup` | A group: a titled frame around nodes; groups nest and collapse. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>unique within its workflow</td></tr><tr><td><code>title</code></td><td><code>string</code></td><td>the frame's title</td></tr><tr><td><code>x</code></td><td><code>number</code></td><td>left edge</td></tr><tr><td><code>y</code></td><td><code>number</code></td><td>top edge</td></tr><tr><td><code>width</code></td><td><code>number</code></td><td>width</td></tr><tr><td><code>height</code></td><td><code>number</code></td><td>height</td></tr><tr><td><code>parentId?</code></td><td><code>string</code></td><td>the group it sits in</td></tr><tr><td><code>collapsed?</code></td><td><code>boolean</code></td><td>true: drawn as one small header, its connections end there</td></tr><tr><td><code>color?</code></td><td><code>string</code></td><td>a CSS color for the frame</td></tr></table> |
| `WorkflowHistory` | The change history of the level the editor shows (each subworkflow level keeps its own). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>changes</code></td><td><code>string[]</code></td><td>every change by its label, oldest first: the applied ones, then the undone ones in redo order</td></tr><tr><td><code>at</code></td><td><code>number</code></td><td>how many of them are applied (0: none - the document as loaded)</td></tr></table> |
| `WorkflowInterfacePort` | A named input or output of a workflow used as a subworkflow: bound to a port inside it. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the port id the node shows outside</td></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the port type</td></tr><tr><td><code>endpoint</code></td><td><code>WorkflowEndpoint</code></td><td>the port inside the workflow it stands for</td></tr></table> |
| `WorkflowJson` | A JSON value - what node data, outputs and metadata hold. = <code>null \| boolean \| number \| string \| WorkflowJson[] \| { [key: string]: WorkflowJson }</code> |
| `WorkflowNavigateDetail` | Detail of workflow-navigate: the view entered or left a subworkflow. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>path</code></td><td><code>string[]</code></td><td>the titles from the top workflow down to the one shown</td></tr></table> |
| `WorkflowNode` | A node: a card with typed ports, data and an optional nested workflow. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>unique within its workflow</td></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the node type - the registry's definition draws its controls</td></tr><tr><td><code>title</code></td><td><code>string</code></td><td>the card's title</td></tr><tr><td><code>x</code></td><td><code>number</code></td><td>left edge, world units</td></tr><tr><td><code>y</code></td><td><code>number</code></td><td>top edge, world units</td></tr><tr><td><code>width</code></td><td><code>number</code></td><td>width, at least 80</td></tr><tr><td><code>height</code></td><td><code>number</code></td><td>height, at least 40</td></tr><tr><td><code>ports</code></td><td><code>WorkflowPort[]</code></td><td>the ports, inputs and outputs in their order</td></tr><tr><td><code>data</code></td><td><code>Record&lt;string, WorkflowJson&gt;</code></td><td>the node's parameters - plain JSON</td></tr><tr><td><code>groupId?</code></td><td><code>string</code></td><td>the group the node belongs to</td></tr><tr><td><code>locked?</code></td><td><code>boolean</code></td><td>true: the node cannot be moved, resized or deleted</td></tr><tr><td><code>subgraph?</code></td><td><code>WorkflowDocument</code></td><td>a nested workflow; its inputs and outputs are the node's ports</td></tr></table> |
| `WorkflowNodeContext` | What a custom node view gets: write the node's data, ask for another height. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>updateData</code></td><td><code>(data: Record&lt;string, WorkflowJson&gt;) =&gt; void</code></td><td>merges values into the node's data (one undoable change)</td></tr><tr><td><code>requestResize</code></td><td><code>(height: number) =&gt; void</code></td><td>asks for a new card height</td></tr></table> |
| `WorkflowNodeStateDetail` | Detail of workflow-node-state: one node's run state changed. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>nodeId</code></td><td><code>string</code></td><td>the node</td></tr><tr><td><code>state</code></td><td><code>WorkflowRuntime</code></td><td>its run state</td></tr></table> |
| `WorkflowNodeType` | A node type: its ports, defaults, controls and, optionally, how it runs. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the type name nodes carry</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>the name in the palette and a new node's title</td></tr><tr><td><code>description?</code></td><td><code>string</code></td><td>a line under the name in the palette</td></tr><tr><td><code>category?</code></td><td><code>string</code></td><td>the palette group</td></tr><tr><td><code>color?</code></td><td><code>string</code></td><td>a theme chart color (chart-1 ... chart-5) or a CSS color for the card's accent</td></tr><tr><td><code>ports</code></td><td><code>WorkflowPort[]</code></td><td>the ports a new node gets</td></tr><tr><td><code>width?</code></td><td><code>number</code></td><td>a new node's width (default 260)</td></tr><tr><td><code>height?</code></td><td><code>number</code></td><td>a new node's height (default: what its ports and fields need)</td></tr><tr><td><code>defaults?</code></td><td><code>Record&lt;string, WorkflowJson&gt;</code></td><td>a new node's data</td></tr><tr><td><code>fields?</code></td><td><code>WorkflowField[]</code></td><td>controls drawn in the card</td></tr><tr><td><code>layout?</code></td><td><code>'controls' \| 'list'</code></td><td>controls: each field its control (the default); list: a Property Grid list - labels above values, a value edits in place</td></tr><tr><td><code>mount?</code></td><td><code>(host: HTMLElement, node: WorkflowNode, context: WorkflowNodeContext) =&gt; WorkflowNodeView</code></td><td>a custom card body: mount it into host, return its view</td></tr><tr><td><code>run?</code></td><td><code>(node: WorkflowNode, context: WorkflowRunContext) =&gt; Promise&lt;Record&lt;string, WorkflowJson&gt;&gt; \| Record&lt;string, WorkflowJson&gt;</code></td><td>runs the node: returns its outputs by output port</td></tr></table> |
| `WorkflowNodeView` | A mounted custom node view. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>update</code></td><td><code>(node: WorkflowNode, runtime: WorkflowRuntime) =&gt; void</code></td><td>the node or its run state changed</td></tr><tr><td><code>destroy</code></td><td><code>() =&gt; void</code></td><td>the card goes away - release listeners</td></tr></table> |
| `WorkflowPatch` | One change of a transaction: the new value of one node, edge or group (no value: removed). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>kind</code></td><td><code>'nodes' \| 'edges' \| 'groups'</code></td><td>which collection</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the entity's id</td></tr><tr><td><code>value?</code></td><td><code>WorkflowNode \| WorkflowEdge \| WorkflowGroup</code></td><td>the new value; absent removes the entity</td></tr></table> |
| `WorkflowPoint` | A point in workflow (world) coordinates. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>x</code></td><td><code>number</code></td><td>horizontal position</td></tr><tr><td><code>y</code></td><td><code>number</code></td><td>vertical position</td></tr></table> |
| `WorkflowPort` | A typed port of a node: inputs on the left edge, outputs on the right. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>unique within its node</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>the text shown beside the port (default: the id)</td></tr><tr><td><code>direction</code></td><td><code>'input' \| 'output'</code></td><td>input or output</td></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the value type; an output connects to an input of the same type, 'any', or a type the input accepts</td></tr><tr><td><code>maxConnections?</code></td><td><code>number</code></td><td>how many connections the port takes - inputs default to 1, outputs to any number; 0 means any number</td></tr><tr><td><code>optional?</code></td><td><code>boolean</code></td><td>true: the node runs without this input</td></tr><tr><td><code>accepts?</code></td><td><code>string[]</code></td><td>further output types this input accepts</td></tr></table> |
| `WorkflowRunContext` | What a node type's run handler gets besides the node. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>inputs</code></td><td><code>Record&lt;string, WorkflowJson[]&gt;</code></td><td>the values arriving at each input port, one per connection</td></tr><tr><td><code>signal</code></td><td><code>AbortSignal</code></td><td>aborts when the run is cancelled</td></tr><tr><td><code>progress</code></td><td><code>(value: number) =&gt; void</code></td><td>reports progress, 0 to 1</td></tr></table> |
| `WorkflowRunDetail` | Detail of workflow-run: a run started or ended. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>status</code></td><td><code>'running' \| 'done' \| 'error' \| 'cancelled'</code></td><td>running, done, error or cancelled</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>the error message</td></tr></table> |
| `WorkflowRuntime` | A node's run state - what the card's status badge and progress bar show. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>status</code></td><td><code>'idle' \| 'queued' \| 'running' \| 'success' \| 'error' \| 'cancelled'</code></td><td>idle, queued, running, success, error or cancelled</td></tr><tr><td><code>progress?</code></td><td><code>number</code></td><td>0 to 1 while running</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>an error or status message</td></tr><tr><td><code>output?</code></td><td><code>WorkflowJson</code></td><td>what the node produced, by output port</td></tr></table> |
| `WorkflowSelectDetail` | Detail of workflow-select: the selection changed. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>selected</code></td><td><code>string[]</code></td><td>the selected node ids</td></tr><tr><td><code>edge</code></td><td><code>string \| null</code></td><td>the selected connection, or null</td></tr><tr><td><code>path</code></td><td><code>string[]</code></td><td>the ids of the subworkflow nodes the view is inside, from the top ([] at the top)</td></tr></table> |
| `WorkflowStats` | What the last frame drew - the budgets at work. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>frame</code></td><td><code>number</code></td><td>the frame number</td></tr><tr><td><code>drawMs</code></td><td><code>number</code></td><td>milliseconds spent drawing</td></tr><tr><td><code>edges</code></td><td><code>number</code></td><td>connections drawn</td></tr><tr><td><code>nodes</code></td><td><code>number</code></td><td>nodes drawn on the canvas</td></tr><tr><td><code>domNodes</code></td><td><code>number</code></td><td>HTML node cards mounted</td></tr><tr><td><code>edgeBudget</code></td><td><code>number</code></td><td>the current connection budget</td></tr><tr><td><code>edgesTruncated</code></td><td><code>boolean</code></td><td>true: more connections were in view than the budget allowed (sampled)</td></tr><tr><td><code>renderer</code></td><td><code>'worker' \| 'main'</code></td><td>worker (OffscreenCanvas) or main (the fallback)</td></tr><tr><td><code>zoom</code></td><td><code>number</code></td><td>the zoom factor</td></tr></table> |
| `WorkflowTreeRow` | One row of tree(): a group, a node or a subworkflow node, linked to its parent row - the records of a Data Tree. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the row id: the node ids from the top joined by '/', a group's as '&lt;level&gt;#&lt;group id&gt;'</td></tr><tr><td><code>parentId</code></td><td><code>string \| null</code></td><td>the parent row: its group, the subworkflow node it is inside, or null at the top</td></tr><tr><td><code>title</code></td><td><code>string</code></td><td>the node's or group's title</td></tr><tr><td><code>kind</code></td><td><code>'node' \| 'subworkflow' \| 'group'</code></td><td>node, subworkflow (a node holding a workflow) or group</td></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the node type ('group' for a group)</td></tr><tr><td><code>path</code></td><td><code>string[]</code></td><td>what reveal() takes: the subworkflow node ids from the top, then the node's id (a group: its level)</td></tr></table> |
| `WorkflowViewDetail` | Detail of workflow-view: the camera came to rest. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>camera</code></td><td><code>WorkflowCamera</code></td><td>the camera</td></tr></table> |
