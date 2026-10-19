---
name: Media Timeline
type: MOL
section: multimedia
why: A video or audio has one time; the timeline lays the metadata of that time out under it (regions, markers, spans) from one JSON and keeps both in step - the media moves the playhead, the playhead moves the media - with captions as the media's own text track.
when: Navigating and explaining a recording - chapters, speakers, detected sounds or scenes, annotations, captions - with an info panel that follows the playhead. A record of events with dates (a changelog, a project history) is the Data Display Timeline.
where: dist/components/media-timeline/media-timeline.css + dist/components/media-timeline/media-timeline.js
supportedStates: default, playing
---

# Pattern: Media Timeline

## Native basis

`<div class="media-timeline" role="group">` with a `<script type="application/json" class="media-timeline-source">`
of timeline metadata and an optional `.media-timeline-header` (a title, readouts, zoom buttons). `data-media`
names the media it drives: a Video or Audio component, or a bare `<video>` / `<audio>`. The runtime renders the
rows, the ruler and the playhead after the header; the playhead is a native slider (`role="slider"`) in the
keyboard order. The media stays the clock: the timeline reads and seeks its `currentTime` and listens to its
events, so it works with the browser's own controls too.

---

## Native Web APIs
- [`HTMLMediaElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement) - the clock: `currentTime`, `play()`, `pause()` and their events
- [`TextTrack`](https://developer.mozilla.org/en-US/docs/Web/API/TextTrack) + [`VTTCue`](https://developer.mozilla.org/en-US/docs/Web/API/VTTCue) - a text row (subtitles, captions, descriptions) becomes a keyed text track of the media
- [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - the units of the scale rows (1 min, 30 s) in the text's language
- [`Web Animations API`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) - the playhead runs between events without a script per frame
- [`Pointer capture`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - a drag keeps seeking outside the timeline
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - the ruler's labels follow the width while it fits
- [`slider role`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/slider_role) - the playhead as a slider: arrows, Page Up / Down, Home / End
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - a narrow timeline narrows its label column

---

## Structure

```html
<div class="media-timeline" id="harbour-timeline" role="group" aria-label="Harbour timeline" data-media="harbour-video">
  <div class="media-timeline-header">
    <span class="media-timeline-title">Timeline</span>
    <output class="media-timeline-time" data-media-timeline-output="time">0:00</output>
    <button class="btn" data-variant="ghost" data-size="icon-sm" data-media-timeline-action="zoom-out" aria-label="Zoom out"><i data-lucide="zoom-out"></i></button>
    <button class="btn" data-variant="ghost" data-size="icon-sm" data-media-timeline-action="fit" aria-label="Fit"><i data-lucide="scan"></i></button>
    <button class="btn" data-variant="ghost" data-size="icon-sm" data-media-timeline-action="zoom-in" aria-label="Zoom in"><i data-lucide="zoom-in"></i></button>
  </div>
  <script type="application/json" class="media-timeline-source">
    {
      "version": 1,
      "duration": 24,
      "tracks": [
        { "id": "scenes", "label": "Scenes", "items": [
          { "id": "dawn", "start": 0, "end": 6, "label": "Dawn", "info": { "text": "First light over the harbour.", "fields": { "Sun": "6°" } } },
          { "id": "morning", "start": 6, "end": 12, "label": "Morning" }
        ] },
        { "id": "cuts", "label": "Cuts", "kind": "markers", "items": [{ "time": 6, "label": "Cut" }] },
        { "id": "day", "label": "Daylight", "color": "chart-4", "items": [{ "span": ["dawn", "morning"], "label": "Daylight" }] },
        { "id": "cc", "label": "Captions", "kind": "captions", "lang": "en", "items": [
          { "start": 0.5, "end": 4.5, "text": "[Waves roll in under the dawn sky]" }
        ] }
      ]
    }
  </script>
</div>
```

### The metadata (version 1)

| Field | Meaning |
|---|---|
| `duration` | The length in seconds - default: the media's, else the end of the last item |
| `tracks[]` | The rows, top to bottom: `id`, `label`, `kind`, `for`, `color`, `background`, `lang` and `default` (text rows), `items` |
| track `kind` | `regions` (default); `video` / `audio` - the clips of a picture or a sound track (a glyph by the label); `markers`; the text rows `subtitles` and `captions` (what is heard) and `descriptions` (what is seen) |
| track `for` | The id of the row this one annotates: it renders directly above it - rows naming one row in data order, the first on top (a verse of a song, a news flash of a broadcast, the aggregations of an analysis) |
| track `background` | Tints the row and its label: a theme colour name or a CSS colour |
| `scales[]` | Ruler rows, coarsest first: `unit` (`h`, `min`, `s`, `frame`), `divisions` (minor ticks per unit), `fps` (frame rows, default 25), `label`. Each labels its unit within the row above (seconds 0 to 59 under minutes); without it the one ruler picks its own interval |
| `events[]` | Moments with no row: `time` + `text` - an events outlet lists them |
| item `start` + `end` | A region, in seconds |
| item `time` | A marker - a moment (a `markers` track's items are markers) |
| item `span` | The ids of other items: a region from the earliest start to the latest end among them (a span may name spans) |
| item `id` | Default `<track id>-<index>`; a span names items by it |
| item `label` / `text` | The text on the item; a caption's words go in `text` |
| item `color` | `chart-1` ... `chart-5`, `primary`, `secondary`, `accent`, `muted`, `destructive`, or any CSS colour - default: the track's, else the next chart colour |
| item `info` | What an info outlet shows while the playhead is inside it: `title` (default: the label), `text`, `fields` (name → value) |

Overlapping regions of one track stack in lanes. A text row becomes a text track of the media, keyed by the row's
id (its cues replaced whenever the data changes, also while the media plays; a row gone from the data is retired):
a bare `<video>` draws the one it shows (the one marked `default`, else the first), a Video component lists them
in its captions menu and shows the chosen one in its overlay, an Audio component in its transcript line.

### Controls, readouts and info outlets

Inside the timeline, or anywhere with `data-media-timeline-for="<the timeline's id>"`:

| Attribute | Does |
|---|---|
| `data-media-timeline-action="zoom-in"` / `"zoom-out"` / `"fit"` | Scale by 1.5, back, or fit the whole length (zoom 0) |
| `data-media-timeline-action="toggle"` | Play / pause the media |
| `data-media-timeline-action="seek"` + `data-value` | Go to that time and pause |
| `data-media-timeline-action="loop-clear"` | Clear the loop - `disabled` while there is none (author it disabled) |
| `data-media-timeline-output="time"` / `"duration"` / `"active"` / `"loop"` | The playhead's time, the length, the labels of the items under the playhead, the loop ("0:06 - 0:08") |
| `data-media-timeline-outlet="info"` | A Card per item under the playhead that carries `info`; the outlet's own content shows when there is none |
| `data-media-timeline-outlet="events"` | The data's `events` as a list: each time a button that seeks there and pauses, then the text; the latest event the playhead passed carries `aria-current`; the outlet's own content when there are none |

```html
<aside data-media-timeline-for="harbour-timeline" data-media-timeline-outlet="info">
  <p class="text-sm text-muted-foreground">Play the clip - what is happening shows here.</p>
</aside>
<div data-media-timeline-for="harbour-timeline" data-media-timeline-outlet="events"><p>Nothing logged.</p></div>
<p data-media-timeline-for="harbour-timeline">
  <output data-media-timeline-output="loop"></output>
  <button class="btn" data-variant="outline" data-size="sm" data-media-timeline-action="loop-clear" disabled>Clear loop</button>
</p>
```

The runtime writes an events outlet's list as:

```html
<ol class="media-timeline-events">
  <li class="media-timeline-event" data-event="0" aria-current="true">
    <button type="button" class="media-timeline-event-time" data-media-timeline-action="seek" data-value="13">0:13</button>
    <span>The bell buoy rings.</span>
  </li>
</ol>
```

### The loop

A press on the ruler that drags draws a loop region (yellow) - a click there still seeks, a double click there
clears it; `[` / `]` set its start / end at the playhead, Escape clears it; `setState(name, { loop: { start, end } })`
or `df$.shadcn.mediaTimeline.loop()` set it in code. While a loop is set playback stays inside it: setting it
moves the playhead to its start (when it stands outside), play from outside starts at its start, and at its end
playback returns to its start - with the media or with the timeline's own clock. `media-timeline-loop` reports
every change.

---

## Variants

| Attribute | Behavior |
|---|---|
| Default | Fits the whole length into the width |
| `data-zoom="40"` | Starts zoomed: pixels per second; the rows scroll and the playhead stays in view while it plays |
| `data-label="..."` | The playhead slider's accessible name (default "Playback position") |

`--media-timeline-lane` (row height per lane), `--media-timeline-ruler` and `--media-timeline-labels` (the label
column) size it.

---

## ARIA

| Element | Attribute | Notes |
|---|---|---|
| timeline | `role="group"` + `aria-label` | Names the timeline |
| playhead | `role="slider"`, `aria-valuenow` / `-max` / `-text` | Written by the runtime ("0:12 of 0:24"); Arrow keys move 1 s (Shift: 5 s), Page Up / Down 10 s, Home / End the ends, `[` / `]` the loop's ends, Escape clears the loop |
| events outlet | `aria-current="true"` | On the latest event the playhead passed |
| rows, ruler | `aria-hidden="true"` | The pictures of the data; the info outlet and the readouts carry the words |
| zoom buttons | `aria-label` | Icon buttons name their action |

---

## States

| State | Meaning |
|---|---|
| `default` | The media is paused (without media: the timeline's own clock stands) - the playhead stands. |
| `playing` | The media plays and the playhead moves with it; without media the timeline's own clock runs to the end of the length, then lands in `default`. A browser may refuse to start sound without a click (autoplay rules); the state then stays `default`. |

Both take the same config, merged into the current one - only the keys passed change something: `time` (the
media seeks there), `zoom` (pixels per second, 0 = fit), `data` (re-renders; the playhead stays), `loop`
(`{ start, end }` or `null`). `getState()` reports the live time and the loop.

```js
const timeline = document.querySelector('#harbour-timeline');
timeline.api.setState('default', { time: 12 });
timeline.api.setState('default', { data: { version: 1, tracks: [] } });
timeline.addEventListener('media-timeline-change', (e) => console.log(e.detail.active));
```

## Notes

- The media is the clock: with a `data-media` target the timeline's time IS the media's `currentTime`. Without
  one the timeline keeps its own clock - a click or a key moves the playhead, `playing` runs it at normal speed
  to the end of the length and stops there (`default`): a timeline of metadata alone can be played through.
- A re-render (new `data`, a new zoom, a new width while it fits) keeps the playhead, the scroll position and the
  focus.
- The rendered rows are the runtime's and not part of `render()`; the data (in its script, when it differs from
  what the script says) and `data-zoom` are.
- The item text is set as text - markup in a label or an info field is shown, never run.
- Many items at a high zoom are cheap: positions are percentages, the ticks are gradients; only the labels of the
  ruler are elements, as many as fit.
- A colour from the data is a theme name (`data-color`) or a CSS colour `CSS.supports` accepts (an inline
  variable); anything else falls back to the track's colour. The loop's yellow is a literal: the theme has no
  highlight token.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type MediaTimelineState = 'default' | 'playing'</code> - `setState(name, config)` takes the config of the state it names (`MediaTimelineStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The media is paused (without media: the timeline's own clock stands) - the playhead stands. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>the playhead's time, seconds - the controlled media seeks there; getState() reports the live time</td></tr><tr><td><code>zoom?</code></td><td><code>number</code></td><td>the scale in pixels per second; 0 fits the whole length into the width</td></tr><tr><td><code>data?</code></td><td><code>MediaTimelineData</code></td><td>the timeline metadata - new data re-renders the timeline, the playhead stays</td></tr><tr><td><code>loop?</code></td><td><code>MediaTimelineLoop \| null</code></td><td>the loop region playback stays inside, null for none - a drag on the ruler makes one</td></tr></table> |
| `playing` | The media plays and the playhead moves with it (without media: the timeline's own clock runs to the end of the length, then lands in default). A browser may refuse to start sound without a click (autoplay rules) - the state then stays default. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>the playhead's time, seconds - the controlled media seeks there; getState() reports the live time</td></tr><tr><td><code>zoom?</code></td><td><code>number</code></td><td>the scale in pixels per second; 0 fits the whole length into the width</td></tr><tr><td><code>data?</code></td><td><code>MediaTimelineData</code></td><td>the timeline metadata - new data re-renders the timeline, the playhead stays</td></tr><tr><td><code>loop?</code></td><td><code>MediaTimelineLoop \| null</code></td><td>the loop region playback stays inside, null for none - a drag on the ruler makes one</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends MediaTimelineState&gt;(name: S, config?: MediaTimelineStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MediaTimelineStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: MediaTimelineState; config: MediaTimelineStateConfigs[MediaTimelineState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: MediaTimelineState; config: MediaTimelineStateConfigs[MediaTimelineState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: MediaTimelineState; config: MediaTimelineStateConfigs[MediaTimelineState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: MediaTimelineState; config: MediaTimelineStateConfigs[MediaTimelineState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: MediaTimelineState; config: MediaTimelineStateConfigs[MediaTimelineState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.mediaTimelineApi.setState&lt;S extends MediaTimelineState&gt;(el: HTMLElement, name: S, config?: MediaTimelineStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MediaTimelineStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.mediaTimelineApi.getState(el: HTMLElement): { name: MediaTimelineState; config: MediaTimelineStateConfigs[MediaTimelineState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: MediaTimelineState; config: MediaTimelineStateConfigs[MediaTimelineState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.mediaTimelineApi.render(state: { name: MediaTimelineState; config: MediaTimelineStateConfigs[MediaTimelineState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: MediaTimelineState; config: MediaTimelineStateConfigs[MediaTimelineState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.mediaTimelineApi.store(el: HTMLElement): Store&lt;{ name: MediaTimelineState; config: MediaTimelineStateConfigs[MediaTimelineState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: MediaTimelineState; config: MediaTimelineStateConfigs[MediaTimelineState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.mediaTimelineApi.commit&lt;S extends MediaTimelineState&gt;(el: HTMLElement, name: S, config?: MediaTimelineStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>MediaTimelineStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.mediaTimelineStates: MediaTimelineState[]</code> | The declared states, 'default' first: <code>default</code>, <code>playing</code>. |

### `df$.shadcn.mediaTimeline`

| Member | Description |
|---|---|
| <code>load(target: string \| HTMLElement, data: MediaTimelineData): void</code> | Replace the timeline metadata: the timeline re-renders, the playhead stays where it is (setState with { data }). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .media-timeline element or its selector</td></tr><tr><td><code>data</code></td><td><code>MediaTimelineData</code></td><td>the timeline metadata (version 1)</td></tr></table> |
| <code>data(target: string \| HTMLElement): MediaTimelineData</code> | The current timeline metadata, as loaded. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .media-timeline element or its selector</td></tr></table> <b>Returns</b> <code>MediaTimelineData</code> - a copy of the data; an empty timeline when the element is unknown |
| <code>seek(target: string \| HTMLElement, time: number): void</code> | Move the playhead - the controlled media seeks with it; playing stays playing. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .media-timeline element or its selector</td></tr><tr><td><code>time</code></td><td><code>number</code></td><td>seconds from the start</td></tr></table> |
| <code>zoom(target: string \| HTMLElement, pxPerSecond: number): void</code> | Set the scale. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .media-timeline element or its selector</td></tr><tr><td><code>pxPerSecond</code></td><td><code>number</code></td><td>pixels per second; 0 fits the whole length into the width</td></tr></table> |
| <code>loop(target: string \| HTMLElement, start?: number \| null, end?: number): MediaTimelineLoop \| null</code> | Set the loop region - playback stays inside it: the playhead goes to its start, its end returns there - or clear it (setState with { loop }). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .media-timeline element or its selector</td></tr><tr><td><code>start?</code></td><td><code>number \| null</code></td><td>where it starts, seconds; null (or nothing) clears the loop</td></tr><tr><td><code>end?</code></td><td><code>number</code></td><td>where it ends, seconds; default: the end of the length</td></tr></table> <b>Returns</b> <code>MediaTimelineLoop \| null</code> - the loop region now, null when there is none |
| <code>active(target: string \| HTMLElement, time?: number): MediaTimelineActive[]</code> | The items under the playhead, or under another time. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .media-timeline element or its selector</td></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>seconds; default: the playhead's time</td></tr></table> <b>Returns</b> <code>MediaTimelineActive[]</code> - the regions there, in track order (markers are moments and never under it) |

### Events

| Event | Description |
|---|---|
| `media-timeline-change` | Fires when the items under the playhead change - as it moves, after a seek and after new data. <code>detail</code>: <code>MediaTimelineChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time</code></td><td><code>number</code></td><td>the playhead's time, seconds</td></tr><tr><td><code>active</code></td><td><code>MediaTimelineActive[]</code></td><td>the items under the playhead, in track order</td></tr></table> |
| `media-timeline-loop` | Fires when the loop region is set, moved or cleared - by a drag on the ruler, a key, setState or the API. <code>detail</code>: <code>MediaTimelineLoopDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>loop</code></td><td><code>MediaTimelineLoop \| null</code></td><td>the loop region now, null when it was cleared</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `MediaTimelineActive` | An item under the playhead. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>track</code></td><td><code>string</code></td><td>its track's id</td></tr><tr><td><code>item</code></td><td><code>string</code></td><td>its id</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>its label</td></tr><tr><td><code>start</code></td><td><code>number</code></td><td>where it starts, seconds</td></tr><tr><td><code>end</code></td><td><code>number</code></td><td>where it ends, seconds</td></tr></table> |
| `MediaTimelineChangeDetail` | What media-timeline-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time</code></td><td><code>number</code></td><td>the playhead's time, seconds</td></tr><tr><td><code>active</code></td><td><code>MediaTimelineActive[]</code></td><td>the items under the playhead, in track order</td></tr></table> |
| `MediaTimelineConfig` | The config both states take - every key optional; only the keys passed are applied. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>the playhead's time, seconds - the controlled media seeks there; getState() reports the live time</td></tr><tr><td><code>zoom?</code></td><td><code>number</code></td><td>the scale in pixels per second; 0 fits the whole length into the width</td></tr><tr><td><code>data?</code></td><td><code>MediaTimelineData</code></td><td>the timeline metadata - new data re-renders the timeline, the playhead stays</td></tr><tr><td><code>loop?</code></td><td><code>MediaTimelineLoop \| null</code></td><td>the loop region playback stays inside, null for none - a drag on the ruler makes one</td></tr></table> |
| `MediaTimelineData` | The timeline metadata (version 1). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>version</code></td><td><code>number</code></td><td>the format version - 1</td></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>the length in seconds; default: the media's, else the end of the last item</td></tr><tr><td><code>tracks</code></td><td><code>MediaTimelineTrack[]</code></td><td>the rows, top to bottom - a row with for sits above the row it names</td></tr><tr><td><code>scales?</code></td><td><code>MediaTimelineScale[]</code></td><td>the ruler's rows, coarsest first; default: one ruler that picks its own interval</td></tr><tr><td><code>events?</code></td><td><code>MediaTimelineEvent[]</code></td><td>moments with a text and no row of their own - an events outlet lists them</td></tr></table> |
| `MediaTimelineEvent` | A moment of the recording an events outlet lists. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time</code></td><td><code>number</code></td><td>when, seconds</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>what happens</td></tr></table> |
| `MediaTimelineInfo` | What an info outlet shows for an item. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>title?</code></td><td><code>string</code></td><td>the card's title; default: the item's label</td></tr><tr><td><code>text?</code></td><td><code>string</code></td><td>a paragraph</td></tr><tr><td><code>fields?</code></td><td><code>Record&lt;string, string \| number&gt;</code></td><td>name → value pairs, shown as a list</td></tr></table> |
| `MediaTimelineItem` | One region, marker or span of a track. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id?</code></td><td><code>string</code></td><td>unique in the data - a span names items by it; default: "&lt;track id&gt;-&lt;index&gt;"</td></tr><tr><td><code>start?</code></td><td><code>number</code></td><td>a region's start, seconds</td></tr><tr><td><code>end?</code></td><td><code>number</code></td><td>a region's end, seconds</td></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>a marker's time, seconds</td></tr><tr><td><code>span?</code></td><td><code>string[]</code></td><td>the ids of other items: this region runs from the earliest start to the latest end among them</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>the text on the item (a caption's words: text)</td></tr><tr><td><code>text?</code></td><td><code>string</code></td><td>a caption's words</td></tr><tr><td><code>color?</code></td><td><code>string</code></td><td>the item's colour - a theme colour name or a CSS colour; default: its track's</td></tr><tr><td><code>info?</code></td><td><code>MediaTimelineInfo</code></td><td>what the info outlet shows while the playhead is inside the item</td></tr></table> |
| `MediaTimelineLoop` | A loop region. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>start</code></td><td><code>number</code></td><td>where it starts, seconds</td></tr><tr><td><code>end</code></td><td><code>number</code></td><td>where it ends, seconds</td></tr></table> |
| `MediaTimelineLoopDetail` | What media-timeline-loop carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>loop</code></td><td><code>MediaTimelineLoop \| null</code></td><td>the loop region now, null when it was cleared</td></tr></table> |
| `MediaTimelineScale` | One row of the ruler. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>unit</code></td><td><code>'h' \| 'min' \| 's' \| 'frame'</code></td><td>its unit: hours, minutes, seconds or frames</td></tr><tr><td><code>divisions?</code></td><td><code>number</code></td><td>minor ticks per unit (10 on seconds: tenths) - drawn while they stand 4px apart</td></tr><tr><td><code>fps?</code></td><td><code>number</code></td><td>frames per second of a frame row (default 25)</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>the row's label in the label column</td></tr></table> |
| `MediaTimelineTrack` | One row of the timeline. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>unique in the data - events, the info outlet, a for and the captions key name it</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>the row's label; default: the id</td></tr><tr><td><code>kind?</code></td><td><code>'regions' \| 'video' \| 'audio' \| 'markers' \| 'subtitles' \| 'captions' \| 'descriptions'</code></td><td>regions (default: start + end), video / audio (the clips of a picture or a sound track - what for names), markers (one time each), or a text row whose items the media shows: subtitles and captions (what is heard), descriptions (what is seen)</td></tr><tr><td><code>for?</code></td><td><code>string</code></td><td>the id of the track this row annotates: it renders directly above it, rows naming one track in data order</td></tr><tr><td><code>color?</code></td><td><code>string</code></td><td>the default colour of its items: chart-1 ... chart-5, primary, secondary, accent, muted, destructive, or a CSS colour</td></tr><tr><td><code>background?</code></td><td><code>string</code></td><td>the row's background: a theme colour name or a CSS colour</td></tr><tr><td><code>lang?</code></td><td><code>string</code></td><td>a text row's language (BCP 47, "en")</td></tr><tr><td><code>default?</code></td><td><code>boolean</code></td><td>a text row shown first when the media shows no other text yet</td></tr><tr><td><code>items</code></td><td><code>MediaTimelineItem[]</code></td><td>what the row shows</td></tr></table> |
