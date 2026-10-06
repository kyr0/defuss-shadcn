---
name: Diagram
type: ATM
why: Illustrative diagrams an agent can write as plain HTML - nodes on a CSS grid, relationships as an ordered list (readable without JavaScript), wires drawn into an SVG layer from the measured layout, labels kept clear of every box, wire and text. The theme's colors (chart colors for accents and changes), radius and monospace; the only state is the picture's - step-by-step reveal, an activated box or arrow (click, keyboard or outside controls) and a before / changes / after delta from one annotated source. No Mermaid, no dependency.
when: Architecture, flows, state machines, ER and schema, sequences, org charts, swimlanes, layers, containment, loops, data platforms, matrices, fishbones, Wardley maps, journeys, kanban, story maps, quadrants, policy traces. Data charts (values on axes) are chart; text-defined diagrams you already have in Mermaid syntax are mermaid.
where: dist/components/diagram/diagram.css + dist/components/diagram/diagram.js
supportedStates: default, playing, paused, active
---

# Pattern: Diagram

## Native basis

A `<figure>`: an optional `<figcaption>`, a `.diagram-canvas` holding the nodes
(HTML elements laid out by CSS grid, a free canvas or a radial ring) and an
`<ol class="diagram-edges">` - the relationships as an ordered list. Without
JavaScript the figure is a set of labelled boxes plus a readable list
("api → orders gRPC"); with it the list becomes a screen-reader list and the
component draws the wires: an SVG layer behind the nodes, masked HTML labels
above them, re-measured on every resize. The visual grammar (paper + ink + one
focal accent, mono eyebrows, rounded orthogonal connectors, masked labels,
the before / changes / after ledger) is adapted from
[diagram-design](https://github.com/cathrynlavery/diagram-design) by Cathryn
Lavery (MIT) - re-implemented as a standalone component.

---

## Native Web APIs
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) / [`<figcaption>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption) - the diagram and its caption as one unit
- [CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) + [subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid) - nodes placed by `--col` / `--row` / `--span`; phase banners align to the columns
- [CSS trigonometric functions](https://developer.mozilla.org/en-US/docs/Web/CSS/sin) - `sin()` / `cos()` place a loop's stations on a ring
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - wires follow the layout at every width
- [SVG paths](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths) + [`pathLength`](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/pathLength) - rounded elbows, curves, typed ends; the draw-in animation
- [CSS Motion Path](https://developer.mozilla.org/en-US/docs/Web/CSS/offset-path) + [Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) - a flow token travels a wire
- [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the delta view goes side by side when there is room
- [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) - `data-autoplay` plays once when the figure comes into view (on a slide: on every arrival)
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - tints from the theme's chart colors (in oklab: no hue drift toward the paper)
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - the step status line and outside outputs name what is shown / active
- [`aria-pressed`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-pressed) - interactive nodes are toggle buttons (matrix rows: `aria-selected`)
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

```html
<figure class="diagram" data-type="architecture" aria-label="Checkout service">
  <figcaption class="diagram-caption">
    <span class="diagram-eyebrow">Architecture</span>
    <span class="diagram-title">Checkout service</span>
    <span class="diagram-dek">One sentence on what to notice.</span>
  </figcaption>
  <div class="diagram-canvas" style="--cols:4">
    <!-- a zone behind nodes placed on the same cells -->
    <div class="diagram-group" data-node="vpc" style="--col:2;--row:1;--span:3;--rspan:2">
      <span class="diagram-group-label">VPC · eu-west-1</span>
    </div>
    <div class="diagram-node" data-node="web" style="--col:1;--row:1">
      <span class="diagram-node-eyebrow">Client</span>
      <span class="diagram-node-name">Web app</span>
      <span class="diagram-node-meta">React · SSR</span>
    </div>
    <div class="diagram-node" data-node="api" data-tone="accent" style="--col:2;--row:1">…</div>
    <div class="diagram-node" data-node="db" data-shape="store" style="--col:4;--row:1">…</div>
  </div>
  <ol class="diagram-edges">
    <li class="diagram-edge" data-from="web" data-to="api">HTTPS</li>
    <li class="diagram-edge" data-from="api" data-to="db" data-line="dashed" data-tone="accent">SQL</li>
  </ol>
</figure>
```

- **Nodes are named by `data-node`**, never by `id` - endpoints, clones (the
  delta panels) and specs all refer to that name.
- **Placement** is CSS: `--col` / `--row` (1-based) and `--span` / `--rspan` on
  the grid canvas (`--cols` on the canvas); `--x` / `--y` (percent) on a free
  canvas; `--i` (with `--n` on the canvas) on a radial one. Placement never
  inherits - a group's children place themselves in the group.
- **Endpoints**: `data-from` / `data-to` name a node - `api`, a side
  `api:left` (`top` / `right` / `bottom` / `left`), or a field row
  `orders#customer_id` (`<li data-field="customer_id">` inside the node).
  Ports on one side fan out; parallel connectors in one gap never overlap.
- The edge's text is its label (masked, drawn on the wire). `data-from-label`
  / `data-to-label` add end labels (cardinality, multiplicity).

---

## Variants

### Types (`data-type` on the figure)

A type is a preset over the same primitives (layout, spacing, special wiring).

| Type | Layout / wiring |
|------|-----------------|
| `architecture`, `flow`, `state`, `er`, `db-schema`, `uml-class`, `deployment`, `dependency`, `topology`, `data-lake`, `medallion`, `high-level`, `process`, `data-flow`, `swimlane`, `story-map`, `policy-trace` | Grid canvas + elbow wires |
| `organigram` | Grid + bus routing: one shared trunk per parent (same as `data-route="bus"`) |
| `sequence` | Participants on top, the edge list inside the canvas - one row per message, lifelines drawn |
| `timeline` | One axis; events at `--x`, `data-side="below"` alternates; `.diagram-tick` labels; `.diagram-span` ranges |
| `layers` | Full-width stacked bands |
| `nested` | Groups inside groups (containment) |
| `loop` | Radial ring around a `data-hub` node; `data-curve="curve"` arcs |
| `wardley` | Free canvas, four evolution bands, `.diagram-axis` x / y |
| `quadrant` | Consultant 2×2: four named scenarios in reading order + two driver axes |
| `journey` | Stage columns, a sentiment band (`.diagram-band`, dots at `--sentiment` 0..1) |
| `fishbone` | Categories (`data-bone`, `data-side="below"`) and the effect (`data-effect`); spine and 60° bones drawn |
| `kanban` | Column groups (`data-shape="column"`) holding cards |
| `matrix` | A `<table class="diagram-matrix">` - permissions (`data-perm`), heat (`--v` 0..1), probabilities |
| `complex-state`, `state-lifecycle` | State variants: zones / bands + elbows |

### Node shapes (`data-shape`)

| Shape | Use |
|-------|-----|
| (none) | Rectangle - a service, step, state, card |
| `pill` | Start / end of a flow |
| `diamond` | Decision |
| `store` | Database / bucket (cylinder) |
| `start` / `end` | State-machine initial / final dot (text below, kept for screen readers) |
| `dot` | Positioned point - Wardley component, journey sentiment (label above) |
| `ghost` | Invisible anchor - a movement target, a junction |
| `bar` | Full-width bar (orchestration, identity, cross-cutting) |
| `circle` | Round node |
| `note` | Italic serif annotation, no box |
| `status` | Policy outcome chip - `data-status="pass\|fail\|skip\|unreached"` (symbol + text, never color alone) |
| `class` / `entity` | Centered header over `.diagram-node-fields` / `.diagram-node-ops` compartments |

### Tones (`data-tone` on nodes, groups, edges)

`accent` (the one focal element - use once or twice), `link`, `muted`,
`external` (dashed, third-party), `warn`, `ok`, `danger`, `bronze` /
`silver` / `gold` (medallion tiers). Kanban cards also take
`data-status="blocked|waiting|done"`. Every tone is a theme color:
accent `--chart-2`, link `--chart-4`, ok / added `--chart-3`, warn /
changed `--chart-1`, danger / removed `--destructive`, tiers
`--chart-5` / `--chart-3` / `--chart-1`.

### Edges

| Attribute | Values | Default |
|-----------|--------|---------|
| `data-curve` | `elbow` (rounded orthogonal), `straight`, `curve` (bends away from the center), `around` (a back-edge routed outside the stack) | `elbow` |
| `data-line` | `dashed` (async, return), `dotted`, `thick` | solid |
| `data-head` / `data-tail` | `arrow`, `open`, `triangle` (UML inheritance), `triangle-filled`, `diamond` (composition), `diamond-open` (aggregation), `dot`, `one`, `one-one`, `many`, `one-many`, `zero-many`, `zero-one`, `none` | `arrow` / `none` |
| `data-tone` | `accent`, `link`, `ink`, `ok`, `danger` | muted ink |
| `data-flow` | tokens travel the wire (ms a pass, default 2400) | - |
| `data-flow-tokens` / `data-flow-delay` | tokens on the wire (1-8) / ms before this wire starts - a pipeline hands the stream on edge by edge | `1` / `0` |
| `data-edge` | the edge's reference for activation | `from->to` |
| `data-detail` | what an outside `<output>` says when it is active (nodes too) | the meta / nothing |
| `data-bend` | curve strength for `curve` | `0.22` |

### Other parts

`.diagram-group` (+ `.diagram-group-label`, `.diagram-group-meta` WIP chip,
`data-shape="lane|column"`, `data-over`), `.diagram-phases` (chevron banner
on the grid's columns), `.diagram-cell` (plain grid text,
`data-role="head|label|mono|center"`), `.diagram-tag` (pain marker / risk
tag), `.diagram-rule` (a labelled cut line, e.g. the release cut),
`.diagram-note`, `.diagram-band` + `.diagram-band-labels` (journey
sentiment), `.diagram-axis[data-axis="x|y"]`, `.diagram-legend` (`data-swatch`), node parts
`.diagram-node-fields` (`data-field`, `data-key="pk|fk|uq"`),
`.diagram-node-ops`, `.diagram-node-chips`, `data-badge` (corner chip:
`×3`, `4 in`), `data-label-side="above|below|left|right"` on a dot (set
by the component to the side its wires leave free unless authored).

### Steps (`data-steps`)

`data-steps` adds the toolbar (previous · play/pause · next · replay · show
all + the status line); `data-autoplay` plays once when the figure scrolls
into view (never under reduced motion) - `data-autoplay="1000"` waits that
long first (hidden until then). On a presentation slide (`[data-slide]`)
it replays on every arrival of the slide (a spec: `"autoplay": 1000`). The order:

- **explicit** - any element with `data-step="N"` enters at step N (its
  descendants with it; `0` = always shown); an edge without one enters with
  its later endpoint; `data-step-label` names a step in the status line;
- **automatic** (no `data-step` anywhere) - nodes in document order, one a
  step (table rows when there are no nodes); a group enters with its first
  node; scaffolding without nodes is always shown; a sequence plays its
  messages in order.

Future elements are hidden and a step reveals its elements one at a time:
each box fades in over `--diagram-step-ms` (800ms), the next one
`--diagram-element-ms` (900ms) later (its beat, `--step-i`), each wire
draws in just after its later end, and when the last element is in the step
rests for `--diagram-hold` (400ms) - about one element a second. A minified
stylesheet's `0.9s` spelling works as well as `900ms`. Keyboard (on the toolbar): ← / →
step, Space play / pause, Home first, End all, R replay.

### Interactive (`data-interactive`)

Every node and every edge becomes activatable: a click on a box, a wire or a
label (or Tab to a box + Enter / Space) activates it; it and what it touches
stay lit (`related`), everything else is dimmed; a second click, a click on
the empty canvas or Escape clears; ← / → / ↑ / ↓ walk the activation order
(nodes in step order, then markup order). Nodes become `role="button"` with
`aria-pressed`; a table row (a matrix) keeps its role and gets
`aria-selected` - give rows a `data-node` to make them activatable.

### Outside controls (no script)

```html
<button class="btn" data-diagram-for="checkout" data-diagram-action="next">Next</button>
<button class="btn" data-diagram-for="checkout" data-diagram-action="activate" data-diagram-ref="gw">The gateway</button>
<output data-diagram-for="checkout">Press Next.</output>
```

`data-diagram-action`: `next` / `prev` (walk the activation, wrapping
around), `activate` (with `data-diagram-ref`), `clear`, `play`,
`pause`, `step-next`, `step-prev`, `reset`. An `<output
data-diagram-for>` names what is active - "name - detail" (`data-detail`,
else the node's meta; an edge: "from → to · label"); its own text returns when
nothing is.

### Delta (`data-delta`)

One annotated source → three panels: **Before** (added things hidden,
`data-before` text and `data-before-style` placement restored), **Changes**
(everything, marked, with the ledger) and **After** (removed things hidden).

| Attribute | On | Meaning |
|-----------|----|---------|
| `data-change="added\|removed\|changed\|moved\|rewired"` | node, group, edge, field row, table row / cell, cell | What happened to it |
| `data-before="old text"` | any text element | Its text in Before (the ledger says old → new) |
| `data-before-style="--col:1;--row:2"` | node | Its placement in Before (moved) |
| `data-before-from` / `data-before-to` | edge | Its ends in Before (rewired) |
| `data-change-note` / `data-change-label` | changed element | Ledger text / name |
| `data-fit="none"` | figure | Keep the canvas 1:1 - by default a figure narrower than its diagram scales the canvas down to fit (to 0.7; narrower still, it scrolls), and the column gaps give before that |
| `data-delta="columns\|rows"` | figure | Force side by side / stacked (default: side by side from a 96rem container) |
| `data-delta-labels="Then\|Delta\|Now"` | figure | Panel titles |

### Parametric (a spec)

`<script type="application/json" class="diagram-spec">` inside an empty
figure, or `df$.shadcn.diagram.build(el, spec)`, renders a spec into the
same markup: `{ type, eyebrow, title, caption, cols, phases, groups: [{ id,
label, col, row, span, rspan, shape, tone, parent }], nodes: [{ id, name,
eyebrow, meta, col, row, span, shape, tone, badge, fields, ops, step,
parent }], edges: [{ from, to, label, line, tone, head, tail, curve, step,
flow, fromLabel, toLabel }] }`. `{ before, after }` (two specs) builds a delta
diagram: `diff()` marks added / removed / changed / moved / rewired.

---

## States

| State | Meaning |
|-------|---------|
| `default` | The complete, static figure (no step attributes) |
| `playing` | Playing the steps - `config.step` is the step on screen (from 1 when none is given); the clock moves on once the step's elements have appeared one a beat (`--diagram-element-ms`, 900ms) and it has rested `--diagram-hold` (400ms); it pauses on the last |
| `paused` | Stopped on `config.step` (the last step when none is given) |
| `active` | A node or an edge is active - `config.ref` is its `data-node` or its edge reference (`data-edge`, else `"from->to"`); the complete figure, with `data-active` on it and `data-active-state="active|related|dimmed"` on nodes and edges |

In `playing` / `paused` the figure carries `data-step-current` and every
stepped element `data-step-state="past|current|future"`.

```js
const el = document.querySelector('#checkout');
el.api.setState('paused', { step: 2 });   // show the first two steps
el.api.setState('playing', { step: 1 });  // play from the start
el.store.subscribe(({ name, config }) => console.log(name, config.step));
el.addEventListener('diagram-step', (e) => console.log(e.detail.label));
el.api.setState('active', { ref: 'gw' });  // activate the gateway
el.addEventListener('diagram-activate', (e) => console.log(e.detail.label, e.detail.detail));
```

Registry globals: `df$.shadcn.diagramApi` / `df$.shadcn.diagramStates`;
`df$.shadcn.diagram` has `build`, `markup`, `diff`, `redraw`, `play`,
`pause`, `next`, `prev`, `reset`, `steps`, `activate`, `activateNext`,
`activatePrev`, `active`, `order`.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type DiagramState = 'default' | 'playing' | 'paused' | 'active'</code> - `setState(name, config)` takes the config of the state it names (`DiagramStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The complete, static figure. No config. |
| `playing` | Playing the steps: the clock moves on once a step's elements have appeared. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>the step on screen, 1-based (default 1)</td></tr></table> |
| `paused` | Stopped on a step. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>the step shown, 1-based (default: the last)</td></tr></table> |
| `active` | A node or an edge is active - the complete figure, the rest dimmed. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>ref</code></td><td><code>string</code></td><td>the node's data-node, or the edge's data-edge (else "from-&gt;to")</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends DiagramState&gt;(name: S, config?: DiagramStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DiagramStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: DiagramState; config: DiagramStateConfigs[DiagramState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: DiagramState; config: DiagramStateConfigs[DiagramState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: DiagramState; config: DiagramStateConfigs[DiagramState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: DiagramState; config: DiagramStateConfigs[DiagramState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: DiagramState; config: DiagramStateConfigs[DiagramState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.diagramApi.setState&lt;S extends DiagramState&gt;(el: HTMLElement, name: S, config?: DiagramStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DiagramStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.diagramApi.getState(el: HTMLElement): { name: DiagramState; config: DiagramStateConfigs[DiagramState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: DiagramState; config: DiagramStateConfigs[DiagramState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.diagramApi.render(state: { name: DiagramState; config: DiagramStateConfigs[DiagramState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: DiagramState; config: DiagramStateConfigs[DiagramState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.diagramApi.store(el: HTMLElement): Store&lt;{ name: DiagramState; config: DiagramStateConfigs[DiagramState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: DiagramState; config: DiagramStateConfigs[DiagramState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.diagramApi.commit&lt;S extends DiagramState&gt;(el: HTMLElement, name: S, config?: DiagramStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>DiagramStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.diagramStates: DiagramState[]</code> | The declared states, 'default' first: <code>default</code>, <code>playing</code>, <code>paused</code>, <code>active</code>. |

### `df$.shadcn.diagram`

| Member | Description |
|---|---|
| <code>build(target: string \| HTMLElement, spec: DiagramSpec \| DiagramDelta): HTMLElement \| null</code> | Build a diagram from a spec (see markup) into a .diagram figure, replacing what it holds - or from { before, after } (two specs → one delta diagram, see diff). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr><tr><td><code>spec</code></td><td><code>DiagramSpec \| DiagramDelta</code></td><td>the diagram, or { before, after } for a delta</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the figure, null when the target matches none |
| <code>markup(spec: DiagramSpec \| DiagramDelta): string</code> | The HTML of a spec - the same markup an author writes (server-side rendering, copy-paste). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>spec</code></td><td><code>DiagramSpec \| DiagramDelta</code></td><td>the diagram, or { before, after } for a delta</td></tr></table> <b>Returns</b> <code>string</code> - the figure's inner markup (caption, canvas, edge list) |
| <code>diff(before: DiagramSpec, after: DiagramSpec): DiagramSpec</code> | Two specs → one spec annotated with added / removed / changed / moved / rewired (the delta source). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>before</code></td><td><code>DiagramSpec</code></td><td>the diagram before</td></tr><tr><td><code>after</code></td><td><code>DiagramSpec</code></td><td>the diagram after</td></tr></table> <b>Returns</b> <code>DiagramSpec</code> - one spec: the after state, every element marked with its change |
| <code>redraw(target: string \| HTMLElement): void</code> | Measure the nodes again and redraw every wire (after you moved or resized nodes yourself). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr></table> |
| <code>play(target: string \| HTMLElement, step: number = 1): void</code> | Play the steps from the first (or from `step`). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr><tr><td><code>step</code></td><td><code>number</code> = <code>1</code></td><td>the step to start at, 1-based</td></tr></table> |
| <code>pause(target: string \| HTMLElement): void</code> | Pause on the current step. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr></table> |
| <code>next(target: string \| HTMLElement): void</code> | One step forward (pauses). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr></table> |
| <code>prev(target: string \| HTMLElement): void</code> | One step back (pauses). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr></table> |
| <code>reset(target: string \| HTMLElement): void</code> | The complete figure again (state 'default'). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr></table> |
| <code>activate(target: string \| HTMLElement, ref: string \| null): void</code> | Activate a node (its data-node) or an edge (its data-edge, else "from-&gt;to"); null clears. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr><tr><td><code>ref</code></td><td><code>string \| null</code></td><td>null or '' clears; else a node (its data-node) or an edge (its data-edge, else "from-&gt;to")</td></tr></table> |
| <code>activateNext(target: string \| HTMLElement): void</code> | Activate the next node in the activation order (step order, then markup order; wraps around). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr></table> |
| <code>activatePrev(target: string \| HTMLElement): void</code> | Activate the previous node in the activation order (wraps around). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr></table> |
| <code>active(target: string \| HTMLElement): DiagramActivation \| null</code> | What is active: { ref, kind ('node' / 'edge'), element, label, detail } - or null. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr></table> <b>Returns</b> <code>DiagramActivation \| null</code> - the active node or edge, null when nothing is active |
| <code>order(target: string \| HTMLElement): string[]</code> | The activation order - the node references next / previous walk through. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr></table> <b>Returns</b> <code>string[]</code> - the nodes' data-node values, in that order |
| <code>properties(target: string \| HTMLElement, ref: string): Record&lt;string, string&gt; \| null</code> | A node's or an edge's properties as plain JSON - a node: { id, eyebrow, name, meta, tone, shape }; an edge: { from, to, label, line, tone, head, tail, curve }; a matrix row: { row, &lt;column&gt;: text ... }. null when the reference names nothing. Feed it to a property grid to inspect it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr><tr><td><code>ref</code></td><td><code>string</code></td><td>a node (its data-node) or an edge (its data-edge, else "from-&gt;to")</td></tr></table> <b>Returns</b> <code>Record&lt;string, string&gt; \| null</code> - its properties as strings, null when the reference names nothing |
| <code>propertySchema(target: string \| HTMLElement, ref: string): Record&lt;string, { readOnly?: boolean; options?: string[] }&gt;</code> | The property grid sourceConfig for properties(): the options for tone, shape, line, ends, curve; ids and ends read-only. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr><tr><td><code>ref</code></td><td><code>string</code></td><td>a node (its data-node) or an edge (its data-edge, else "from-&gt;to")</td></tr></table> <b>Returns</b> <code>Record&lt;string, { readOnly?: boolean; options?: string[] }&gt;</code> - per property: readOnly, or the options to choose from ({} when the reference names nothing) |
| <code>setProperties(target: string \| HTMLElement, ref: string, props: Record&lt;string, string&gt;): boolean</code> | Write properties back onto the node / edge / row (only what differs) and redraw - a property grid's change, applied. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr><tr><td><code>ref</code></td><td><code>string</code></td><td>a node (its data-node) or an edge (its data-edge, else "from-&gt;to")</td></tr><tr><td><code>props</code></td><td><code>Record&lt;string, string&gt;</code></td><td>the properties to write (properties() names them)</td></tr></table> <b>Returns</b> <code>boolean</code> - false when the reference names nothing |
| <code>steps(target: string \| HTMLElement): { max: number; current: number }</code> | The step plan: { max, current } - current is max in the complete figure. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr></table> <b>Returns</b> <code>{ max: number; current: number }</code> - the number of steps and the step shown |

### Events

| Event | Description |
|---|---|
| `diagram-activate` | Fires when the activation moves (a click, the keyboard, an outside control, setState) - the reference, 'node' or 'edge', the element, its label and detail; null detail fields when it is cleared. <code>detail</code>: <code>DiagramActivation</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>ref</code></td><td><code>string \| null</code></td><td>the reference: a node's data-node, an edge's reference</td></tr><tr><td><code>kind</code></td><td><code>'node' \| 'edge' \| null</code></td><td>what it is</td></tr><tr><td><code>element</code></td><td><code>HTMLElement \| null</code></td><td>its element</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>its name (an edge: "from → to · label")</td></tr><tr><td><code>detail</code></td><td><code>string</code></td><td>its data-detail, else a node's meta</td></tr></table> |
| `diagram-drawn` | Fires after a canvas's wires are drawn (init, resize, state change) - how many edges, and which delta panel ('before' / 'changes' / 'after', null outside a delta). <code>detail</code>: <code>DiagramDrawnDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>edges</code></td><td><code>number</code></td><td>how many edges were drawn</td></tr><tr><td><code>panel</code></td><td><code>'before' \| 'changes' \| 'after' \| null</code></td><td>the delta panel drawn, null outside a delta</td></tr></table> |
| `diagram-step` | Fires on every step change - the step, the number of steps and the step's label. <code>detail</code>: <code>DiagramStepDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>step</code></td><td><code>number</code></td><td>the step shown now, 1-based</td></tr><tr><td><code>max</code></td><td><code>number</code></td><td>the number of steps</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>the step's label (data-step-label), '' when it has none</td></tr><tr><td><code>state</code></td><td><code>'playing' \| 'paused'</code></td><td>whether the steps are playing or paused</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `DiagramActivation` | What is active - active() returns it, diagram-activate carries it (null fields when cleared). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>ref</code></td><td><code>string \| null</code></td><td>the reference: a node's data-node, an edge's reference</td></tr><tr><td><code>kind</code></td><td><code>'node' \| 'edge' \| null</code></td><td>what it is</td></tr><tr><td><code>element</code></td><td><code>HTMLElement \| null</code></td><td>its element</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>its name (an edge: "from → to · label")</td></tr><tr><td><code>detail</code></td><td><code>string</code></td><td>its data-detail, else a node's meta</td></tr></table> |
| `DiagramChange` | What a delta (diff) marks on a node, a group or an edge. = <code>'added' \| 'removed' \| 'changed' \| 'moved' \| 'rewired'</code> |
| `DiagramDelta` | Two specs - build() and markup() render the delta between them. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>before</code></td><td><code>DiagramSpec</code></td><td>the diagram before</td></tr><tr><td><code>after</code></td><td><code>DiagramSpec</code></td><td>the diagram after</td></tr></table> |
| `DiagramDrawnDetail` | What diagram-drawn carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>edges</code></td><td><code>number</code></td><td>how many edges were drawn</td></tr><tr><td><code>panel</code></td><td><code>'before' \| 'changes' \| 'after' \| null</code></td><td>the delta panel drawn, null outside a delta</td></tr></table> |
| `DiagramEdgeSpec` | An edge of a spec. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id?</code></td><td><code>string</code></td><td>its data-edge (default "from-&gt;to")</td></tr><tr><td><code>from?</code></td><td><code>string</code></td><td>the node it leaves ("node" or "node.field")</td></tr><tr><td><code>to?</code></td><td><code>string</code></td><td>the node it reaches</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>its label</td></tr><tr><td><code>line?</code></td><td><code>'solid' \| 'dashed' \| 'dotted' \| 'thick'</code></td><td>its stroke (default 'solid')</td></tr><tr><td><code>tone?</code></td><td><code>DiagramTone</code></td><td>its color role</td></tr><tr><td><code>head?</code></td><td><code>'arrow' \| 'open' \| 'triangle' \| 'diamond' \| 'dot' \| 'one' \| 'many' \| 'none'</code></td><td>the end at `to` (default 'arrow')</td></tr><tr><td><code>tail?</code></td><td><code>'arrow' \| 'open' \| 'triangle' \| 'diamond' \| 'dot' \| 'one' \| 'many' \| 'none'</code></td><td>the end at `from` (default 'none')</td></tr><tr><td><code>curve?</code></td><td><code>'elbow' \| 'straight' \| 'curve' \| 'around'</code></td><td>its route (default 'elbow')</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>the step it appears in</td></tr><tr><td><code>flow?</code></td><td><code>boolean \| string</code></td><td>data moving along it: true, or the number of tokens</td></tr><tr><td><code>fromLabel?</code></td><td><code>string</code></td><td>a label at the `from` end (a cardinality)</td></tr><tr><td><code>toLabel?</code></td><td><code>string</code></td><td>a label at the `to` end</td></tr><tr><td><code>change?</code></td><td><code>DiagramChange</code></td><td>a delta mark</td></tr><tr><td><code>before?</code></td><td><code>{ label?: string; from?: string; to?: string }</code></td><td>a delta: its label or ends before</td></tr></table> |
| `DiagramField` | One field row of a node (an entity's column, a class's attribute). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>string</code></td><td>its name</td></tr><tr><td><code>key?</code></td><td><code>string</code></td><td>a key marker ('pk', 'fk', ...) - a wire to a field leaves and enters at its row</td></tr><tr><td><code>type?</code></td><td><code>string</code></td><td>its type, shown at the right</td></tr><tr><td><code>change?</code></td><td><code>DiagramChange</code></td><td>a delta mark</td></tr></table> |
| `DiagramGroupSpec` | A group (a zone, a lane, a column) of a spec. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>its data-node: what nodes name as their parent</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>its label</td></tr><tr><td><code>shape?</code></td><td><code>string</code></td><td>its shape ('column' for a kanban column, ...)</td></tr><tr><td><code>tone?</code></td><td><code>DiagramTone</code></td><td>its color role</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>the step it appears in</td></tr><tr><td><code>parent?</code></td><td><code>string</code></td><td>the group it sits in</td></tr><tr><td><code>change?</code></td><td><code>DiagramChange</code></td><td>a delta mark</td></tr></table> |
| `DiagramNodeSpec` | A node of a spec. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>its data-node: what edges and activation name it by</td></tr><tr><td><code>name?</code></td><td><code>string</code></td><td>the main text</td></tr><tr><td><code>eyebrow?</code></td><td><code>string</code></td><td>the small text above the name</td></tr><tr><td><code>meta?</code></td><td><code>string</code></td><td>the small text under the name</td></tr><tr><td><code>shape?</code></td><td><code>'box' \| 'pill' \| 'diamond' \| 'store' \| 'circle' \| 'dot' \| 'bar' \| 'note' \| 'activity' \| 'class' \| 'start' \| 'end' \| 'ghost'</code></td><td>its shape (default 'box')</td></tr><tr><td><code>tone?</code></td><td><code>DiagramTone</code></td><td>its color role</td></tr><tr><td><code>status?</code></td><td><code>string</code></td><td>a status word (data-status)</td></tr><tr><td><code>badge?</code></td><td><code>string</code></td><td>a corner badge</td></tr><tr><td><code>fields?</code></td><td><code>Array&lt;string \| DiagramField&gt;</code></td><td>field rows (a string is a field name)</td></tr><tr><td><code>ops?</code></td><td><code>string[]</code></td><td>operation rows (a class's methods)</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>the step it appears in (data-steps)</td></tr><tr><td><code>parent?</code></td><td><code>string</code></td><td>the group it sits in</td></tr><tr><td><code>change?</code></td><td><code>DiagramChange</code></td><td>a delta mark</td></tr><tr><td><code>note?</code></td><td><code>string</code></td><td>the delta's note on the change</td></tr><tr><td><code>before?</code></td><td><code>Partial&lt;Pick&lt;DiagramNodeSpec, 'name' \| 'eyebrow' \| 'meta' \| 'col' \| 'row' \| 'span' \| 'rspan' \| 'x' \| 'y'&gt;&gt;</code></td><td>a delta: the text and place it had before</td></tr></table> |
| `DiagramSpec` | A diagram as JSON - the same figure an author writes as markup. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>type?</code></td><td><code>string</code></td><td>the diagram type (data-type: architecture, flow, state, er, sequence, ...)</td></tr><tr><td><code>title?</code></td><td><code>string</code></td><td>the caption's title</td></tr><tr><td><code>eyebrow?</code></td><td><code>string</code></td><td>the caption's eyebrow</td></tr><tr><td><code>caption?</code></td><td><code>string</code></td><td>the caption's text under the title</td></tr><tr><td><code>cols?</code></td><td><code>number</code></td><td>grid columns</td></tr><tr><td><code>style?</code></td><td><code>string</code></td><td>more inline CSS on the canvas</td></tr><tr><td><code>phases?</code></td><td><code>Array&lt;string \| { name: string; span?: number }&gt;</code></td><td>a phase header row (a string is a phase name)</td></tr><tr><td><code>groups?</code></td><td><code>DiagramGroupSpec[]</code></td><td>the groups</td></tr><tr><td><code>nodes?</code></td><td><code>DiagramNodeSpec[]</code></td><td>the nodes</td></tr><tr><td><code>edges?</code></td><td><code>DiagramEdgeSpec[]</code></td><td>the edges</td></tr><tr><td><code>steps?</code></td><td><code>boolean \| number</code></td><td>reveal it step by step (data-steps; a number: the step time in ms)</td></tr><tr><td><code>autoplay?</code></td><td><code>boolean \| number</code></td><td>play the steps on its own (data-autoplay; a number: the delay in ms)</td></tr><tr><td><code>interactive?</code></td><td><code>boolean</code></td><td>clickable: boxes and wires activate (data-interactive)</td></tr></table> |
| `DiagramStepDetail` | What diagram-step carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>step</code></td><td><code>number</code></td><td>the step shown now, 1-based</td></tr><tr><td><code>max</code></td><td><code>number</code></td><td>the number of steps</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>the step's label (data-step-label), '' when it has none</td></tr><tr><td><code>state</code></td><td><code>'playing' \| 'paused'</code></td><td>whether the steps are playing or paused</td></tr></table> |
| `DiagramTone` | A tone: a node's or an edge's color role (none: the ink). = <code>'none' \| 'accent' \| 'link' \| 'ink' \| 'muted' \| 'external' \| 'warn' \| 'ok' \| 'danger'</code> |

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `aria-label` / `<figcaption>` | `.diagram` | Always - names the figure |
| (list semantics) | `.diagram-edges` | The relationships - visually hidden once wired, still read |
| `aria-hidden="true"` | `.diagram-wires`, `.diagram-wire-labels` | Set: drawn duplicates of the list |
| `role="toolbar"` + `aria-label` | `.diagram-controls` | Set with `data-steps` |
| `aria-pressed` | play button | Set: true while playing |
| `<output aria-live="polite">` | `.diagram-status` | "Step 3 of 7 · API gateway" |
| `role="button"` + `tabindex="0"` + `aria-pressed` | interactive nodes | Set with `data-interactive` (table rows: `aria-selected`, no role) |
| `<output data-diagram-for>` | outside | Names the active node or edge |

Status is never color alone: change badges carry `+ − Δ → ⇄`, the ledger
names each change, policy outcomes print PASS / FAIL / SKIPPED / NOT
REACHED with a symbol, kanban states use dashes and bars.

---

## Notes
- **Everything is the theme's**: paper `--card`, ink `--foreground`, lines
  mixed from them, accent / link / change colors from `--chart-1..5` and
  `--destructive`, corners from `--radius` (the wire elbows follow the
  node rounding - a square theme draws square elbows), all text in
  `--font-mono`. Re-key a figure through its local properties
  (`--diagram-accent`, `--diagram-link`, `--diagram-added`, ...).
- **On a slide** (a [Presentation](../presentation/component-skill.md)
  `[data-slide]`) the figure takes the slide's palette - paper and ink of a
  paper slide plus the deck's accent, the ink pair on `data-theme="ink"`.
  The artboard is 1600 × 900, so scale the figure up with a wrapper
  (`transform: scale(1.4); transform-origin: 0 0` and a width of the
  unscaled canvas) - the wires measure through any transform. Give it
  `data-autoplay="1000"` and it replays on every arrival of the slide.
- **Readable by construction**: routes avoid nodes and text, labels take the
  spot that covers no box, no text, no other label and no other wire; give
  long labels room (`--diagram-gap-x` / `-y`) rather than squeezing them.
- **Illustration first**: write the picture as markup; the only state is
  steps, the activation and the delta - an agent can generate all three.
- **One focal accent**: the reference grammar allows one or two accent
  elements a figure - the thing to notice.
- `df$.shadcn.diagram.redraw(el)` after you move or resize nodes yourself;
  resizes, font loading and state changes redraw on their own.
- The toolbar uses the button component's classes (`.btn`); load
  `button.css` when you pick files individually.
- Diagrams scroll horizontally on narrow screens instead of squeezing labels.
