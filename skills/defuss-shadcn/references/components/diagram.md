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

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.diagramApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.diagramStates` = `default`, `playing`, `paused`, `active`.

### `df$.shadcn.diagram`

| Member | Description |
|---|---|
| `build(target, spec)` | Build a diagram from a spec (see markup) into a .diagram figure, replacing what it holds - or from { before, after } (two specs → one delta diagram, see diff). Returns the figure. |
| `markup(spec)` | The HTML of a spec - the same markup an author writes (server-side rendering, copy-paste). |
| `diff(before, after)` | Two specs → one spec annotated with added / removed / changed / moved / rewired (the delta source). |
| `redraw(target)` | Measure the nodes again and redraw every wire (after you moved or resized nodes yourself). |
| `play(target, step = 1)` | Play the steps from the first (or from `step`). |
| `pause(target)` | Pause on the current step. |
| `next(target)` | One step forward (pauses). |
| `prev(target)` | One step back (pauses). |
| `reset(target)` | The complete figure again (state 'default'). |
| `activate(target, ref)` | Activate a node (its data-node) or an edge (its data-edge, else "from->to"); null clears. |
| `activateNext(target)` | Activate the next node in the activation order (step order, then markup order; wraps around). |
| `activatePrev(target)` | Activate the previous node in the activation order (wraps around). |
| `active(target)` | What is active: { ref, kind ('node' / 'edge'), element, label, detail } - or null. |
| `order(target)` | The activation order - the node references next / previous walk through. |
| `properties(target, ref)` | A node's or an edge's properties as plain JSON - a node: { id, eyebrow, name, meta, tone, shape }; an edge: { from, to, label, line, tone, head, tail, curve }; a matrix row: { row, <column>: text … }. null when the reference names nothing. Feed it to a property grid to inspect it. |
| `propertySchema(target, ref)` | The property grid sourceConfig for properties(): the options for tone, shape, line, ends, curve; ids and ends read-only. |
| `setProperties(target, ref, props)` | Write properties back onto the node / edge / row (only what differs) and redraw - a property grid's change, applied. |
| `steps(target)` | The step plan: { max, current } - current is max in the complete figure. |

### Events

| Event | `detail` | Description |
|---|---|---|
| `diagram-activate` | `about ?? { ref: null, kind: null, element: null, label: '', detail: '' }` | Fires when the activation moves (a click, the keyboard, an outside control, setState) - the reference, 'node' or 'edge', the element, its label and detail; null detail fields when it is cleared. |
| `diagram-drawn` | `edges`, `panel` | Fires after a canvas's wires are drawn (init, resize, state change) - how many edges, and which delta panel ('before' / 'changes' / 'after', null outside a delta). |
| `diagram-step` | `step`, `max`, `label`, `state` | Fires on every step change - the step, the number of steps and the step's label. |

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
  (`--diagram-accent`, `--diagram-link`, `--diagram-added`, …).
- **On a slide** (a [Presentation](presentation.md)
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
