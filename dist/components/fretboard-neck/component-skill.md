---
name: Fretboard Neck
type: ATM
section: multimedia
why: The neck is its markup - a tuning, a capo, a shape and the notes as data attributes - and the runtime draws the strings, frets, inlays and fingers from it, so a page or a Fretboard sets what is played through one State API.
when: The whole neck of a fretted instrument with fingers on it - where a chord lies, the notes sounding and the next ones, a scale; one chord's diagram is the Chord Chart, a play-along tab the Fretboard (which drives a bound neck).
where: dist/components/fretboard-neck/fretboard-neck.css + dist/components/fretboard-neck/fretboard-neck.js
supportedStates: default
---

# Fretboard Neck

## Native basis

`<div class="fretboard-neck">` with the instrument and the fingers as data attributes: `data-tuning` names the strings, `data-shape` a chord's shape, `data-notes` and `data-next` the notes sounding and coming next, `data-capo` the capo. The runtime draws `.fretboard-neck-board` inside it (decorative, `aria-hidden`) and a hidden description that names what the picture shows; the root becomes a `role="img"` described by it. Every finger is a positioned element whose string and fret are custom properties, so one stylesheet draws both orientations and hands. The root scrolls when the neck is wider than its column.

## Native Web APIs

- [`role="img"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/img_role) + [`aria-describedby`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-describedby) - the neck read as one picture, described in words
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - a data attribute written by a page or a Fretboard draws the neck again
- [Logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) + `direction` - the right hand mirrors the neck
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - the faint shape, the halo of a note sounding
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast), [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

## Structure

```html
<div class="fretboard-neck" data-tuning="G C E A" data-shape="0003" data-notes="1/3" data-next="2/0" aria-label="C on a ukulele"></div>
```

The runtime draws inside it:

```html
<div class="fretboard-neck" data-tuning="G C E A" data-shape="0003" data-notes="1/3" role="img" aria-describedby="fretboard-neck-desc-1">
  <div class="fretboard-neck-board" aria-hidden="true" style="--fretboard-neck-strings: 4; --fretboard-neck-frets: 5">
    <div class="fretboard-neck-wires"></div>
    <span class="fretboard-neck-string-name" data-string="4" style="--fretboard-neck-s: 4">G</span>
    <span class="fretboard-neck-string" data-string="4" style="--fretboard-neck-s: 4"></span> ...
    <span class="fretboard-neck-inlay" style="--fretboard-neck-f: 3"></span>
    <span class="fretboard-neck-fret-number" style="--fretboard-neck-f: 3">3</span>
    <span class="fretboard-neck-dot" data-role="active" data-string="1" style="--fretboard-neck-s: 1; --fretboard-neck-f: 3">3</span>
  </div>
  <span class="fretboard-neck-desc" id="fretboard-neck-desc-1" hidden>G C E A neck; shape 0 0 0 3; sounding string 1 fret 3</span>
</div>
```

| Attribute | Meaning |
| --- | --- |
| `data-tuning` | The strings' names from the highest-numbered to the 1st (`"G C E A"`, `"E A D G B e"`) - labels only; their number is the strings drawn |
| `data-strings` | The strings without a tuning (default: the shape's, else 4) |
| `data-frets` | The frets shown, 3 to 24 (default: the capo + the highest fret named + 2, at least 3 + 2) |
| `data-shape` | A chord's shape, drawn faint: a fret per string from the string the tuning names first to the 1st (`"0003"`, `"x32010"`, `"x 10 12 12 12 10"` once a fret has two digits); `x` mutes a string (× at the nut) |
| `data-barre` | The fret the shape's barre lies on - one dashed line across its strings instead of their dots; never guessed |
| `data-notes` | The notes sounding, filled with their fret: `"string/fret"` pairs (`"3/2 2/3"`, string 1 = the highest) |
| `data-next` | The notes coming next, outlined (dashed) |
| `data-capo` | The capo's fret: its bold bar on that fret wire, the nut a thin line behind it; the shape's and the notes' frets count from it, as tabs for a capo are written |

A position named twice takes its strongest role: a note sounding over one coming next over the shape over a muted string. An open string (fret 0) has no finger on the board and shows nothing.

## Variants

| Attribute | Value | Visual |
| --- | --- | --- |
| `data-orientation` | `horizontal` (default) | Across, as the player sees the fretboard: the nut on the fretting hand's side, the 1st string on top - the order a tab draws the strings in |
| `data-orientation` | `vertical` | Upright, as a chord chart draws it: the nut on top, the strings from the highest-numbered on the left |
| `data-hand` | `left` (default) / `right` | The fretting hand: `right` mirrors the neck for a left-handed player |
| `data-colors` | `strings` | A chart colour per string (`--chart-1` for the 1st ... `--chart-5`, then over again): its line and its dots |

## Sizes

One size: a fret is 2.25rem wide at least, the strings 1.375rem apart; the neck grows to its column and scrolls past it.

## ARIA

| Element | Attribute | Notes |
| --- | --- | --- |
| `.fretboard-neck` | `role="img"` (unless authored) + `aria-describedby` | The runtime adds the description's id to any `aria-describedby` already there; give the neck an `aria-label` to name it |
| `.fretboard-neck-board` | `aria-hidden="true"` | The picture; the description carries the words |
| `.fretboard-neck-desc` | `hidden` | The tuning, the capo, the shape, the notes sounding and the next ones, written on every change |

## States

| State | Meaning |
| --- | --- |
| `default` | The neck with the fingers its config puts on it |

The state takes `{ shape, barre, notes, next, capo }`, merged into the current config - `notes` and `next` as
`"string/fret"` text or a list of `{ string, fret }`. A bound [Fretboard](../fretboard/component-skill.md) sets it as
its playhead moves; a data attribute written into the markup is what `getState()` reports.

```js
const neck = df$('#neck-c').get(0);
neck.api.setState('default', { shape: '0232', notes: '3/2 2/3' });
neck.api.getState(); // → { name: 'default', config: { shape: '0232', barre: null, notes: '3/2 2/3', next: '', capo: 0 } }
```

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type FretboardNeckState = 'default'</code> - `setState(name, config)` takes the config of the state it names (`FretboardNeckStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The neck with the fingers the config puts on it. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>shape?</code></td><td><code>string</code></td><td>a chord's shape, drawn faint: a fret per string from the string the tuning names first to the 1st ("0003", "x32010", "x 10 12 12 12 10"); "" for none</td></tr><tr><td><code>barre?</code></td><td><code>number \| null</code></td><td>the fret the shape's barre lies on, null for none</td></tr><tr><td><code>notes?</code></td><td><code>string \| FretboardNeckNote[]</code></td><td>the notes sounding, drawn filled with their fret: "string/fret" pairs ("3/2 2/3"; string 1 is the highest), or a list of { string, fret }</td></tr><tr><td><code>next?</code></td><td><code>string \| FretboardNeckNote[]</code></td><td>the notes coming next, drawn outlined - as notes</td></tr><tr><td><code>capo?</code></td><td><code>number</code></td><td>the capo's fret, 0 for none; the frets of the shape and the notes count from it</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends FretboardNeckState&gt;(name: S, config?: FretboardNeckStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>FretboardNeckStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: FretboardNeckState; config: FretboardNeckStateConfigs[FretboardNeckState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: FretboardNeckState; config: FretboardNeckStateConfigs[FretboardNeckState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: FretboardNeckState; config: FretboardNeckStateConfigs[FretboardNeckState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: FretboardNeckState; config: FretboardNeckStateConfigs[FretboardNeckState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: FretboardNeckState; config: FretboardNeckStateConfigs[FretboardNeckState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.fretboardNeckApi.setState&lt;S extends FretboardNeckState&gt;(el: HTMLElement, name: S, config?: FretboardNeckStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>FretboardNeckStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.fretboardNeckApi.getState(el: HTMLElement): { name: FretboardNeckState; config: FretboardNeckStateConfigs[FretboardNeckState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: FretboardNeckState; config: FretboardNeckStateConfigs[FretboardNeckState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.fretboardNeckApi.render(state: { name: FretboardNeckState; config: FretboardNeckStateConfigs[FretboardNeckState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: FretboardNeckState; config: FretboardNeckStateConfigs[FretboardNeckState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.fretboardNeckApi.store(el: HTMLElement): Store&lt;{ name: FretboardNeckState; config: FretboardNeckStateConfigs[FretboardNeckState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: FretboardNeckState; config: FretboardNeckStateConfigs[FretboardNeckState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.fretboardNeckApi.commit&lt;S extends FretboardNeckState&gt;(el: HTMLElement, name: S, config?: FretboardNeckStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>FretboardNeckStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.fretboardNeckStates: FretboardNeckState[]</code> | The declared states, 'default' first: <code>default</code>. |

### `df$.shadcn.fretboardNeck`

| Member | Description |
|---|---|
| <code>play(target: string \| HTMLElement, notes: string \| FretboardNeckNote[], config: FretboardNeckConfig = {}): FretboardNeckNote[]</code> | Put fingers on the neck - the notes sounding, and optionally a shape and the notes next (setState; what it does not name stays). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .fretboard-neck element or a selector of it</td></tr><tr><td><code>notes</code></td><td><code>string \| FretboardNeckNote[]</code></td><td>the notes sounding: "3/2 2/3" or a list of { string, fret }; [] or "" for none</td></tr><tr><td><code>config</code></td><td><code>FretboardNeckConfig</code> = <code>{}</code></td><td>the shape, barre, next notes or capo to show with them</td></tr></table> <b>Returns</b> <code>FretboardNeckNote[]</code> - the notes now, as { string, fret }; [] for an unknown element |

### Types

| Type | Description |
|---|---|
| `FretboardNeckConfig` | The config the state takes. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>shape?</code></td><td><code>string</code></td><td>a chord's shape, drawn faint: a fret per string from the string the tuning names first to the 1st ("0003", "x32010", "x 10 12 12 12 10"); "" for none</td></tr><tr><td><code>barre?</code></td><td><code>number \| null</code></td><td>the fret the shape's barre lies on, null for none</td></tr><tr><td><code>notes?</code></td><td><code>string \| FretboardNeckNote[]</code></td><td>the notes sounding, drawn filled with their fret: "string/fret" pairs ("3/2 2/3"; string 1 is the highest), or a list of { string, fret }</td></tr><tr><td><code>next?</code></td><td><code>string \| FretboardNeckNote[]</code></td><td>the notes coming next, drawn outlined - as notes</td></tr><tr><td><code>capo?</code></td><td><code>number</code></td><td>the capo's fret, 0 for none; the frets of the shape and the notes count from it</td></tr></table> |
| `FretboardNeckNote` | A note on the neck. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>string</code></td><td><code>number</code></td><td>the string, 1 = the highest</td></tr><tr><td><code>fret</code></td><td><code>number</code></td><td>the fret, 0 = open (nothing is drawn on an open string)</td></tr></table> |

## Notes

- A neck shows fingering: an open string shows nothing, a muted one an × at the nut (just behind the capo with one).
  A capo and a barre come from the markup (`data-capo`, `data-barre`), never from a guess.
- The orientation and the hand are the drawing only: the frets, strings and shapes stay what the markup says.
- Bound to a Fretboard (`data-fretboard-for="<id of the tab>"`) the tab sets the neck's tuning, frets, hand and colours
  unless the neck carries its own, and its state as the playhead moves - the chord sounding, its notes, the next ones,
  the score's capo.
