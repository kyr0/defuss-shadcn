---
name: Animation Canvas
type: TPL
section: guides
why: One board, slides side by side like a chess board - the viewport pan is one WAAPI transform and only the arriving slide animates, through the shared df$.anim engine (data-attribute declared) plus the shared motion entrances for its content; no canvas-private animation exists.
when: Spatial slide boards and zoomable story maps with directional navigation + an at-a-glance overview - not linear decks (use Presentation) and not scrollable pages.
where: dist/components/anim-canvas/anim-canvas.css + dist/components/anim-canvas/anim-canvas.js
supportedStates: default, overview
---

# Animation Canvas

## Native basis

`.anim-canvas` viewport (overflow hidden) + `.anim-canvas-slide` sections.
The runtime moves the slides into ONE `.anim-canvas-board` layer that carries
the pan/zoom `transform` (`transform-origin: 0 0`), positions every slide as
an absolute board cell (`--anim-canvas-width`/`--anim-canvas-height` units,
default 1280×720), and scales board units to the rendered viewport with a
`ResizeObserver` on the root - never a window resize listener. Slide
neighborhood is declared in markup (`data-east|west|north|south="<id>"`);
positions derive by BFS from the start slide at (0,0). Slide transitions play
through the **shared `df$.anim` engine** - the canvas composes the public
registry, it ships no animation of its own.

## Native Web APIs

- [Web Animations API (`el.animate()`)](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate) - the board pan/zoom and every engine keyframe (`fill: 'both'`)
- [`df$.anim` engine](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) - the shared animation registry (`fadeIn/Out`, `slideIn/Out`, `zoomIn/Out`, `popIn/Out`, `spinIn/Out`, `flipIn/Out`, `skewIn/Out`, `blurIn/Out`, `wipeIn/Out`, `irisIn/Out`, `blocksIn/Out`) the canvas plays by name
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - re-scales/re-frames the board on every viewport resize
- [`inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert) - inactive slides leave tab order and AT (lifted in overview, where every tile is clickable)
- [`data-*` attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-*) - the relation map (`data-east`...) and per-slide animation declarations (`data-anim-in`...) are the entire authoring surface
- [`transform: translate() scale()` + `transform-origin`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform) - board units → viewport mapping (1:1 framing and the overview zoom-out)
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - engine durations and the board pan collapse to 1ms (built in, required)
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - overview tiles and chrome keep system-color outlines

## Structure

```html
<div class="anim-canvas" style="--anim-canvas-width: 1280; --anim-canvas-height: 720; --anim-canvas-gap: 80" data-pan-duration="1500">
  <!-- Slide 1 (first .anim-canvas-slide, or the one carrying data-active)
       starts active at board position (0,0); every other position derives
       by BFS over the relations: east = x+1, west = x−1, south = y+1,
       north = y−1. -->
  <section class="anim-canvas-slide" id="s1" data-active
           data-east="s2" data-south="s3"
           data-anim-in="zoomIn">
    <!-- content builds in on every arrival (shared motion controller) -->
    <h2 data-df-entrance="up">…</h2>
    <p data-df-entrance="up" style="--df-motion-delay: 200ms">…</p>
  </section>
  <section class="anim-canvas-slide" id="s2" data-west="s1" data-south="s4"
           data-anim-in="blocksIn" data-anim-in-direction="north"
           data-anim-in-blocks="6" data-anim-in-stagger="70"
           data-anim-in-color="var(--primary)">…</section>
  <section class="anim-canvas-slide" id="s3" data-north="s1" data-east="s4"
           data-anim-in="irisIn" data-anim-in-origin="50% 50%">…</section>
  <section class="anim-canvas-slide" id="s4" data-north="s2" data-west="s3">…</section>

  <!-- optional chrome: directional + overview controls (click delegation) -->
  <div class="anim-canvas-controls">
    <button type="button" class="anim-canvas-control" data-anim-canvas-go="west" aria-label="West slide">←</button>
    <button type="button" class="anim-canvas-control" data-anim-canvas-go="east" aria-label="East slide">→</button>
    <button type="button" class="anim-canvas-control" data-anim-canvas-go="overview" aria-label="Toggle overview">⛶</button>
  </div>
</div>
```

Relation and animation contract per slide:

| Attribute | Meaning |
|-----------|---------|
| `id` | REQUIRED - relations reference slides by id |
| `data-active` | the initially active slide (default: the first) |
| `data-east` / `data-west` / `data-north` / `data-south` | id of the neighbor in that direction (the chess-board edges) |
| `data-anim-in` | engine animation this slide ARRIVES with (default `slideIn` with the travel direction). There is no out-animation: the slide you leave stays still and pans out of frame (a leftover `data-anim-out` is ignored with a console warning) |
| `data-anim-in-direction` | `north` / `south` / `east` / `west` (default: the travel direction) |
| `data-anim-in-delay` | ms before the arrival starts (default: ~35% of the pan, so the slide materializes as the camera reaches it) |
| `data-anim-in-duration` / `-easing` / `-origin` / `-distance` / `-blocks` / `-stagger` / `-color` | discrete per-slide engine config; absent values fall back to the engine defaults |

Root attributes: `--anim-canvas-width` / `--anim-canvas-height` (board units,
inline style or CSS), `--anim-canvas-gap` (gutter between cells in board units,
default 80; `0` = flush cells), `data-pan-duration` (board pan ms, default 1500),
`data-current-slide` (live id mirror, written by the runtime),
`data-overview` (overview mode flag).

## Variants

None - there are no `data-variant` / `data-size` axes. Art direction is the
local custom-property surface (`--anim-canvas-width`, `--anim-canvas-height`,
`--anim-canvas-gap`)
plus the per-slide animation declarations; slide surfaces read `--card` /
`--border` / `--radius-lg` from the active theme.

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `aria-hidden="true"` + `inert` | every non-active `.anim-canvas-slide` | off-stage slides hold no interactive surface (both lift in overview, where every tile is visible and clickable) |
| `aria-label` | root / slides | canvas + slide names for AT |
| `aria-label` on each `[data-anim-canvas-go]` | controls | the directional buttons are icon glyphs - name them |

## Keyboard

| Key | Action |
|-----|--------|
| `→` | east neighbor (`data-east` of the active slide) |
| `←` | west neighbor |
| `↑` | north neighbor |
| `↓` | south neighbor |
| `O` / `Escape` | toggle the overview |

Keys route to the focused canvas, else the first canvas intersecting the
viewport. Editable elements are never hijacked (the shared `bindGlobalKeys`
listener filters them), and a direction with no neighbor is never swallowed:
the key keeps its default behavior at the board's edge.

## States

| State | Meaning |
|-------|---------|
| `default` | one slide framed 1:1; `setState('default', { slide: 's2' })` focuses that slide (plays its declared transition), bare `setState('default')` re-frames the active slide |
| `overview` | the whole board zoomed out with ~8% margin (`[data-overview]` on the root); every slide is a clickable tile - clicking one zooms back into it |

```js
const canvas = document.querySelector('.anim-canvas');
canvas.api.setState('overview');                        // zoom out to the board
canvas.api.setState('default', { slide: 's3' });        // zoom into slide s3
canvas.api.getState();                                  // { name, config: { slide, overview } }
```

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type AnimCanvasState = 'default' | 'overview'</code> - `setState(name, config)` takes the config of the state it names (`AnimCanvasStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | One slide framed 1:1. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>slide?</code></td><td><code>string</code></td><td>the id of the slide to focus (plays its declared transition); without it the active slide is framed again. getState() reports the active slide's id</td></tr><tr><td><code>overview?</code></td><td><code>boolean</code></td><td>reported by getState(): whether the board is zoomed out (false here)</td></tr></table> |
| `overview` | The whole board zoomed out, every slide a clickable tile ([data-overview] on the root). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>boolean</code></td><td>false zooms back into the active slide instead</td></tr><tr><td><code>slide?</code></td><td><code>string</code></td><td>reported by getState(): the id of the active slide</td></tr><tr><td><code>overview?</code></td><td><code>boolean</code></td><td>reported by getState(): whether the board is zoomed out</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends AnimCanvasState&gt;(name: S, config?: AnimCanvasStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AnimCanvasStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: AnimCanvasState; config: AnimCanvasStateConfigs[AnimCanvasState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: AnimCanvasState; config: AnimCanvasStateConfigs[AnimCanvasState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: AnimCanvasState; config: AnimCanvasStateConfigs[AnimCanvasState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: AnimCanvasState; config: AnimCanvasStateConfigs[AnimCanvasState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: AnimCanvasState; config: AnimCanvasStateConfigs[AnimCanvasState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.animCanvasApi.setState&lt;S extends AnimCanvasState&gt;(el: HTMLElement, name: S, config?: AnimCanvasStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AnimCanvasStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.animCanvasApi.getState(el: HTMLElement): { name: AnimCanvasState; config: AnimCanvasStateConfigs[AnimCanvasState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: AnimCanvasState; config: AnimCanvasStateConfigs[AnimCanvasState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.animCanvasApi.render(state: { name: AnimCanvasState; config: AnimCanvasStateConfigs[AnimCanvasState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: AnimCanvasState; config: AnimCanvasStateConfigs[AnimCanvasState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.animCanvasApi.store(el: HTMLElement): Store&lt;{ name: AnimCanvasState; config: AnimCanvasStateConfigs[AnimCanvasState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: AnimCanvasState; config: AnimCanvasStateConfigs[AnimCanvasState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.animCanvasApi.commit&lt;S extends AnimCanvasState&gt;(el: HTMLElement, name: S, config?: AnimCanvasStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>AnimCanvasStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.animCanvasStates: AnimCanvasState[]</code> | The declared states, 'default' first: <code>default</code>, <code>overview</code>. |

## Notes

- **The relation map is the board.** Positions are never authored - they
  derive from `data-east|west|north|south` by BFS. Dangling id refs,
  conflicting positions, unreachable slides and two slides on one cell all
  fail loud with a `console.error` naming the slides; the map must be
  consistent (wiring s1→s2→s4 and s1→s3→s4 means both paths must land s4 on
  the same cell).
- **Everything animated is the shared engine.** `data-anim-in` names a
  `df$.anim` channel and content uses the shared motion entrances; the canvas adds no animation vocabulary of its
  own. Declared names are validated at init - a typo throws at load, not
  mid-transition.
- **Only the arriving slide animates.** The slide you leave stays still - it
  simply pans out of frame (any arrival still in flight on it snaps to its
  settled end). The target's `data-anim-in` starts when the pan is ~35% there
  (`data-anim-in-delay` overrides), so it materializes as the camera reaches it.
- **Content builds in on every arrival.** `[data-df-entrance]`,
  `[data-df-draw]` and `[data-count]` descendants replay through the shared
  motion controller (the same calls presentation makes), offset by the
  arrival. Each element keeps its authored timing - inline
  `--df-motion-delay` or a `[data-df-stagger]` grade - with the offset on top.
  Zooming into a tile from the overview builds its content too.
- **`blocksIn` is an arrival curtain.** The target arrives fully covered and the
  panels roll off it (the engine's `blocksOut` reveal). Always set an explicit
  `data-anim-in-color` that CONTRASTS with the slide surface (e.g.
  `var(--primary)`) - the default `currentColor` can blend in invisibly.
- **Overview click-to-zoom**: in `[data-overview]` every slide gets
  `cursor: pointer` (CSS) and clicking a tile makes it active and zooms in.
- **Missing declarations default to the travel direction**: arriving from the
  east plays `slideIn` direction `east` on the target.
- The docs CodeExample bridge round-trips serialized DOM - init is
  idempotent for an already-built `.anim-canvas-board`.
