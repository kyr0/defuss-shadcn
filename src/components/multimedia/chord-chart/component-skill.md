---
name: Chord Chart
type: ATM
section: multimedia
why: A <figure> with its <figcaption> is the chord's name and picture; the runtime draws the grid from data-shape - dots, the × of a muted string, a barre, a capo - so a chart is written as one attribute and changed through its State API.
when: A chord diagram of a fretted instrument - a song sheet's chord legend, a lesson, a chord library; the whole neck with the notes sounding is the Fretboard Neck, a play-along tab the Fretboard.
where: dist/components/chord-chart/chord-chart.css + dist/components/chord-chart/chord-chart.js
supportedStates: default, active
---

# Chord Chart

## Native basis

`<figure class="chord-chart">` with a `<figcaption>` - the chord's name - and the shape in `data-shape`: a fret per string, from the string the tuning names first (a ukulele's G, a guitar's low E) to the 1st. The runtime draws the grid after the caption as a `role="img"` element whose `aria-label` reads the chord ("C: 0 0 0 3"). The strings and fret wires are two CSS gradients; the dots, the × and the barre are positioned by custom properties, so one stylesheet draws every orientation and hand.

## Native Web APIs

- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) + [`<figcaption>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption) - the chart and its name
- [`role="img"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/img_role) + `aria-label` - the drawn grid read as one picture
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - another shape, barre, capo or name written into the markup is drawn again
- [Logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) + `direction` - the right hand mirrors the grid
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - the active chart's tint, a muted string's × in its string colour
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast), [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

## Structure

```html
<figure class="chord-chart" data-shape="0003">
  <figcaption>C</figcaption>
</figure>
```

The runtime adds the grid after the caption:

```html
<figure class="chord-chart" data-shape="0003">
  <figcaption>C</figcaption>
  <div class="chord-chart-grid" role="img" aria-label="C: 0 0 0 3" style="--chord-chart-strings: 4; --chord-chart-frets: 4">
    <span class="chord-chart-dot" data-string="1" style="--chord-chart-i: 3; --chord-chart-r: 2"></span>
  </div>
</figure>
```

| Attribute | Meaning |
| --- | --- |
| `data-shape` | A fret per string from the string the tuning names first to the 1st: `"0003"` (C on a ukulele), `"x32010"` (C on a guitar), a space- or comma-separated list once a fret has two digits (`"x 10 12 12 12 10"`); `x` mutes a string, `0` leaves it open |
| `data-barre` | The fret one finger presses across several strings - from the first to the last string at that fret, every string between pressed there or higher; a dashed line, never guessed from the frets |
| `data-capo` | The fret a capo clamps: the shape counts from it, the capo is the bold bar with the strings going on behind it |
| `data-active` | The chord sounding - the `active` state |
| `data-strings` | The strings drawn without a shape (default 4) |

A shape above the 4th fret is drawn from its lowest fret, its number named below the grid ("5fr"); the grid shows four frets or as many as the shape spans (up to six).

## Variants

| Attribute | Value | Visual |
| --- | --- | --- |
| `data-orientation` | `horizontal` (default) | Across, as the player sees the fretboard looking down at it: the nut on the fretting hand's side, the frets away from it, the 1st string on top - the order a tab draws the strings in |
| `data-orientation` | `vertical` | Upright, the classic chord chart: the nut on top, the strings from the highest-numbered on the left |
| `data-hand` | `left` (default) / `right` | The fretting hand: `right` mirrors the grid for a left-handed player (across the nut on the right, upright the 1st string on the left) |
| `data-colors` | `strings` | A chart colour per string (`--chart-1` for the 1st ... `--chart-5`, then over again): its dot, its × mixed toward the text colour |

## Sizes

One size: a fret is 1rem across (0.875rem upright), a string 0.75rem apart (1rem upright).

## ARIA

| Element | Attribute | Notes |
| --- | --- | --- |
| `.chord-chart-grid` | `role="img"` + `aria-label` | Written by the runtime: the name, the frets from the first string to the 1st, the barre and the capo ("F: 1 3 3 2 1 1, barre at fret 1, capo 3") |
| `figcaption` | - | The chord's name, also read as the figure's caption |

## States

| State | Meaning |
| --- | --- |
| `default` | The chart at rest |
| `active` | The chord sounding (`data-active`): its frame, caption and dots in the primary colour - the Fretboard marks the chart of the chord its playhead is in |

Every state takes `{ name, shape, barre, capo }`, merged into the current config - the caption, `data-shape`, `data-barre` and `data-capo`. A change written into the markup (another `data-shape`, a caption) is what `getState()` reports.

```js
const chart = df$('#chart-c').get(0);
chart.api.setState('active', { name: 'Am', shape: '2000' });
chart.api.getState(); // → { name: 'active', config: { name: 'Am', shape: '2000', barre: null, capo: 0 } }
```

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ChordChartState = 'default' | 'active'</code> - `setState(name, config)` takes the config of the state it names (`ChordChartStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The chart at rest. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>name?</code></td><td><code>string</code></td><td>the chord's name - the caption</td></tr><tr><td><code>shape?</code></td><td><code>string</code></td><td>the shape: a fret per string, from the string the tuning names first (a ukulele's G) to the 1st - "0003", "x32010", "x 10 12 12 12 10" for frets past 9; x mutes a string</td></tr><tr><td><code>barre?</code></td><td><code>number \| null</code></td><td>the fret a barre lies on (one finger across the strings pressed there), null for none</td></tr><tr><td><code>capo?</code></td><td><code>number</code></td><td>the capo's fret, 0 for none</td></tr></table> |
| `active` | The chord sounding now (data-active): its frame, caption and dots in the primary colour. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>name?</code></td><td><code>string</code></td><td>the chord's name - the caption</td></tr><tr><td><code>shape?</code></td><td><code>string</code></td><td>the shape: a fret per string, from the string the tuning names first (a ukulele's G) to the 1st - "0003", "x32010", "x 10 12 12 12 10" for frets past 9; x mutes a string</td></tr><tr><td><code>barre?</code></td><td><code>number \| null</code></td><td>the fret a barre lies on (one finger across the strings pressed there), null for none</td></tr><tr><td><code>capo?</code></td><td><code>number</code></td><td>the capo's fret, 0 for none</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ChordChartState&gt;(name: S, config?: ChordChartStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ChordChartStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ChordChartState; config: ChordChartStateConfigs[ChordChartState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ChordChartState; config: ChordChartStateConfigs[ChordChartState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ChordChartState; config: ChordChartStateConfigs[ChordChartState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ChordChartState; config: ChordChartStateConfigs[ChordChartState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ChordChartState; config: ChordChartStateConfigs[ChordChartState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.chordChartApi.setState&lt;S extends ChordChartState&gt;(el: HTMLElement, name: S, config?: ChordChartStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ChordChartStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.chordChartApi.getState(el: HTMLElement): { name: ChordChartState; config: ChordChartStateConfigs[ChordChartState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ChordChartState; config: ChordChartStateConfigs[ChordChartState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.chordChartApi.render(state: { name: ChordChartState; config: ChordChartStateConfigs[ChordChartState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ChordChartState; config: ChordChartStateConfigs[ChordChartState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.chordChartApi.store(el: HTMLElement): Store&lt;{ name: ChordChartState; config: ChordChartStateConfigs[ChordChartState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ChordChartState; config: ChordChartStateConfigs[ChordChartState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.chordChartApi.commit&lt;S extends ChordChartState&gt;(el: HTMLElement, name: S, config?: ChordChartStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ChordChartStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.chordChartStates: ChordChartState[]</code> | The declared states, 'default' first: <code>default</code>, <code>active</code>. |

### `df$.shadcn.chordChart`

| Member | Description |
|---|---|
| <code>chord(target: string \| HTMLElement, chord?: ChordChartConfig): Required&lt;ChordChartConfig&gt; \| null</code> | The chord a chart shows, or show another (setState in its current state - the rest of the chord stays). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .chord-chart element or a selector of it</td></tr><tr><td><code>chord?</code></td><td><code>ChordChartConfig</code></td><td>the name, shape, barre and capo to show; leave it out to read</td></tr></table> <b>Returns</b> <code>Required&lt;ChordChartConfig&gt; \| null</code> - the chord now; null for an unknown element |
| <code>parse(shape: string): ChordChartShape \| null</code> | Read a shape's text. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>shape</code></td><td><code>string</code></td><td>"0003", "x32010" or "x 10 12 12 12 10"</td></tr></table> <b>Returns</b> <code>ChordChartShape \| null</code> - each string's fret (x muted), from the string the tuning names first to the 1st; null for a shape that is none |

### Types

| Type | Description |
|---|---|
| `ChordChartConfig` | The config every state takes. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>name?</code></td><td><code>string</code></td><td>the chord's name - the caption</td></tr><tr><td><code>shape?</code></td><td><code>string</code></td><td>the shape: a fret per string, from the string the tuning names first (a ukulele's G) to the 1st - "0003", "x32010", "x 10 12 12 12 10" for frets past 9; x mutes a string</td></tr><tr><td><code>barre?</code></td><td><code>number \| null</code></td><td>the fret a barre lies on (one finger across the strings pressed there), null for none</td></tr><tr><td><code>capo?</code></td><td><code>number</code></td><td>the capo's fret, 0 for none</td></tr></table> |
| `ChordChartShape` | A shape read: each string's fret (x for a muted one), from the string the tuning names first to the 1st. = <code>(number \| 'x')[]</code> |

## Notes

- A chart shows fingering: an open string has no finger on the board and shows nothing, a muted one an ×. A barre and a
  capo come from the markup (`data-barre`, `data-capo`), never from a guess - `x33211`'s 1st and 2nd string at fret 1
  are two fingers unless `data-barre="1"` says one finger lies across.
- A barre the shape cannot hold (fewer than two strings at its fret, or a string between them lower) is none.
- The orientation and the hand are the drawing only: the shape stays what the markup says.
- The [Fretboard](../fretboard/component-skill.md) writes one chart per chord into its chords outlet
  (`data-fretboard-outlet="chords"`) and sets the chart of the chord sounding `active`; a chart written by hand is the
  same component.
