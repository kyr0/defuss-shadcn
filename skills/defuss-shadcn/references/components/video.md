---
name: Video
type: MOL
section: multimedia
why: The native <video> decodes, buffers, seeks and keeps the time; the component adds a State API (playing, time, rate, volume, muted, captions), controls anywhere on the page and a captions overlay that also works in full screen.
when: A video the page controls - a lesson, a product film, a clip with a Media Timeline or a transcript beside it. A styled frame around the browser's own controls with nothing to drive it is the Website Video Player block; an animation is a Motion or an Animation Canvas.
where: dist/components/video/video.css + dist/components/video/video.js
supportedStates: default, playing
---

# Pattern: Video

## Native basis

`<figure class="video">` around a `<div class="video-frame">` that holds a native `<video>` (its `<source>`s,
`poster`, `preload`, `playsinline`) and an optional `.video-captions` overlay, followed by an optional
`.video-controls` bar. The `<video>` keeps everything the platform gives it - decoding, buffering, `<track>`
captions, media keys, `muted`, `autoplay`. Without the bar it can keep its native `controls`; the State API and
the outside controls work either way.

---

## Native Web APIs
- [`<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) - playback, seeking, the time and the poster
- [`HTMLMediaElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement) - `play()`, `pause()`, `currentTime`, `playbackRate`, `volume`, `muted` and their events
- [`TextTrack`](https://developer.mozilla.org/en-US/docs/Web/API/TextTrack) - caption cues from a `<track>` or added by script (`cuechange`, `activeCues`)
- [`Fullscreen API`](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) - the whole player full screen, captions and controls included
- [`aria-pressed`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-pressed) - play, mute and captions as toggle buttons
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - a narrow player drops the volume, skip and length
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - the overlay bar fades only where motion is welcome

---

## Structure

```html
<figure class="video" id="harbour-video">
  <div class="video-frame">
    <video preload="metadata" playsinline poster="videos/harbour-poster.jpg">
      <source src="videos/harbour.webm" type="video/webm">
      <source src="videos/harbour.mp4" type="video/mp4">
    </video>
    <div class="video-captions"></div>
  </div>
  <div class="video-controls">
    <button class="btn" data-variant="ghost" data-size="icon-sm" data-video-action="toggle" aria-pressed="false" aria-label="Play"><i data-lucide="play"></i><i data-lucide="pause"></i></button>
    <button class="btn" data-variant="ghost" data-size="icon-sm" data-video-action="skip" data-value="-5" aria-label="Back 5 seconds"><i data-lucide="rotate-ccw"></i></button>
    <output class="video-time" data-video-output="time">0:00</output>
    <input class="slider" data-size="sm" type="range" min="0" max="24" step="0.1" value="0" data-video-action="seek" aria-label="Seek">
    <output class="video-time" data-video-output="duration">0:24</output>
    <button class="btn" data-variant="ghost" data-size="icon-sm" data-video-action="mute" aria-pressed="false" aria-label="Mute"><i data-lucide="volume-2"></i><i data-lucide="volume-x"></i></button>
    <input class="slider" data-size="xs" type="range" min="0" max="1" step="0.05" value="1" data-video-action="volume" aria-label="Volume">
    <button class="btn" data-variant="ghost" data-size="icon-sm" data-video-action="captions" aria-pressed="true" aria-label="Captions"><i data-lucide="captions-off"></i><i data-lucide="captions"></i></button>
    <button class="btn" data-variant="ghost" data-size="icon-sm" data-video-action="fullscreen" aria-pressed="false" aria-label="Full screen"><i data-lucide="maximize"></i><i data-lucide="minimize"></i></button>
  </div>
  <script type="application/json" class="video-tracks">
    { "version": 1, "tracks": [
      { "id": "bild-de", "kind": "descriptions", "label": "Deutsch", "lang": "de", "items": [
        { "start": 0, "end": 6, "text": "Morgendämmerung über dem Hafen." }
      ] }
    ] }
  </script>
</figure>
```

Every part of the bar is optional; leave out what the player does not need.

### Controls

A control carries `data-video-action`; a readout `data-video-output`. Inside the player they drive it; anywhere
else on the page they name it with `data-video-for="<the player's id>"` - on the control itself, or once on a
container of controls (a Toolbar):

| `data-video-action` | On | Does |
|---|---|---|
| `toggle` | a button | play when paused, pause when playing - `aria-pressed` follows |
| `play`, `pause` | a button | that, always |
| `skip` + `data-value="-5"` | a button | move by that many seconds (negative: back) |
| `seek` | `<input type="range">` | the scrubber: its value is the time, its `max` the length |
| `mute` | a button | sound off / on - `aria-pressed` follows |
| `volume` | `<input type="range" min="0" max="1">` | the volume |
| `rate` | a `<select>` of rates, or a button with `data-value` | the playback rate (a button is pressed while its rate plays) |
| `captions` | a button | the captions overlay on / off - `aria-pressed` follows; with two or more text tracks it opens the captions menu |
| `fullscreen` | a button | the player full screen and back (hidden where the page may not go full screen) |

| `data-video-output` | Shows |
|---|---|
| `time` | the current time (`0:12`, `1:02:03` past an hour) |
| `duration` | the length |
| `remaining` | the time left (`-0:12`) |

```html
<div class="toolbar" data-video-for="harbour-video" aria-label="Playback">
  <button class="btn" data-variant="outline" data-size="sm" data-video-action="toggle" aria-pressed="false">Play</button>
  <output data-video-output="time">0:00</output>
</div>
```

A toggle with two icons shows the first while off and the second while on.

The volume as a vertical slider: a `.video-volume` holds the sound button and a `.video-volume-panel` with a
vertical Slider (`data-orientation="vertical"`); the panel shows above the button (`data-side="bottom"`: below)
while the pointer or the focus is on either, and the row keeps one button's width.

```html
<div class="video-volume">
  <button class="btn" data-variant="ghost" data-size="icon-sm" data-video-action="mute" aria-pressed="false" aria-label="Mute"><i data-lucide="volume-2"></i><i data-lucide="volume-x"></i></button>
  <div class="video-volume-panel">
    <input class="slider" data-orientation="vertical" data-size="xs" type="range" min="0" max="1" step="0.05" value="1" data-video-action="volume" aria-label="Volume">
  </div>
</div>
```

### Captions, subtitles and the menu

The player's text tracks are keyed, whatever brings them: its own JSON (`<script type="application/json"
class="video-tracks">`: `version`, `labels`, `tracks` of `id`, `kind`, `label`, `lang`, `default`, `items` of
`start` / `end` / `text` - a Media Timeline's text rows have the same shape), a Media Timeline's text rows (keyed
by their id), and `<track>` elements (keyed by their id, else their srclang, else their label). `captions` - in
the config and in `getState()` - is the key of the track shown in `.video-captions`, `""` for none.

| `kind` | Menu group | Carries |
|---|---|---|
| `subtitles`, `captions` | Subtitles | what is heard - the words, the sounds |
| `descriptions` | Video captions | what is seen - the picture, scene by scene |

With one track the captions button turns it off and on. With two or more it opens a Dropdown Menu (load
dropdown.css + dropdown.js; the player writes the menu into itself): Off, then a radio item per group with one
track, a submenu per group with more - the choice is the state's `captions`. `labels` names the groups (`off`,
`subtitles`, `descriptions` - "Off", "Subtitles", "Video captions" by default). `df$.shadcn.video.tracks()`
adds or updates tracks by key, also while the video plays. The track that last turned on by itself (a `<track
default>`, the browser's own menu) is taken as the choice; the player keeps the chosen one `hidden` (the browser
draws nothing of its own) and every other one `disabled`.

The menu the runtime writes, after the controls:

```html
<div class="dropdown-content" role="menu" popover id="harbour-video-captions-menu" data-size="sm" data-align="end" aria-label="Captions">
  <button class="dropdown-item dropdown-radio" role="menuitemradio" aria-checked="false" tabindex="-1" data-value="">Off</button>
  <div class="dropdown-separator" role="separator"></div>
  <div class="dropdown-sub">
    <button class="dropdown-item dropdown-sub-trigger" role="menuitem" tabindex="-1">Subtitles<span class="dropdown-shortcut" data-video-menu-current></span></button>
    <div class="dropdown-content dropdown-sub-content" role="menu" popover aria-label="Subtitles" data-size="sm">
      <button class="dropdown-item dropdown-radio" role="menuitemradio" aria-checked="true" tabindex="-1" data-value="sub-en">English</button>
      <button class="dropdown-item dropdown-radio" role="menuitemradio" aria-checked="false" tabindex="-1" data-value="sub-de">Deutsch</button>
    </div>
  </div>
  <div class="dropdown-separator" role="separator"></div>
  <button class="dropdown-item dropdown-radio" role="menuitemradio" aria-checked="false" tabindex="-1" data-value="bild-de">Video captions<span class="dropdown-shortcut">Deutsch</span></button>
</div>
```

---

## Variants

| Attribute | Behavior |
|---|---|
| Default | The bar under the picture, in a bordered card |
| `data-variant="overlay"` | The bar over the picture's foot on a dark scrim, hidden while the video plays and no pointer or focus is on the player; the captions move up while it shows |

`--video-ratio` sets the frame's ratio (default `16 / 9`).

---

## ARIA

| Element | Attribute | Notes |
|---|---|---|
| play, mute, captions | `aria-pressed` | Toggle buttons with a constant `aria-label` ("Play" pressed = playing) |
| icon-only buttons | `aria-label` | Every icon button names its action |
| scrubber | `aria-label`, `aria-valuetext` | The runtime writes "0:12 of 0:24" as the value text |
| volume | `aria-label` | A native range: arrows, Home / End |
| captions overlay | - | Plain text over the picture, read with the figure |
| captions button with a menu | `aria-haspopup="menu"`, `aria-expanded` | Written by the Dropdown Menu; arrows, Enter and Escape in the menu |

---

## States

| State | Meaning |
|---|---|
| `default` | Paused - at the start, wherever it was paused, or at the end. |
| `playing` | Playing. A browser may refuse to start sound without a click on the page (autoplay rules); the state then stays `default`. |

Both take the same config, merged into the current one - only the keys passed change something: `time` (seek),
`rate`, `volume` (0-1), `muted`, `captions` (a track's key, `""` for none; `true` / `false` accepted). `getState()`
reports them live, with the `duration`.

```js
const video = document.querySelector('#harbour-video');
video.api.setState('playing', { time: 12, rate: 1.5 });
video.store.subscribe(({ name, config }) => console.log(name, config.time));
```

## Notes

- Give the player an `id` to bind controls from outside it (`data-video-for`) or a Media Timeline (`data-media`).
- The time, the scrubber and the readouts move by themselves and are not part of `render()`; the toggles, the
  volume and rate controls and the `muted` attribute are.
- A click on the picture plays or pauses (a `<video controls>` keeps its own behavior).
- Full screen needs a click or a key press; in a frame whose permissions policy forbids it (a sandboxed frame
  without `allow="fullscreen *"` - WebKit needs the `*` for an opaque origin) the control hides.
- A caption `<track>` from another origin needs `crossorigin` on the `<video>` and CORS on the server.
- Never autoplay with sound; `muted autoplay playsinline` is the one autoplay browsers allow everywhere.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type VideoState = 'default' | 'playing'</code> - `setState(name, config)` takes the config of the state it names (`VideoStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Paused - at the start, wherever it was paused, or at the end. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>the playback position to seek to, seconds; getState() reports the live position</td></tr><tr><td><code>rate?</code></td><td><code>number</code></td><td>the playback rate - 1 is normal speed, 2 twice as fast</td></tr><tr><td><code>volume?</code></td><td><code>number</code></td><td>the volume, 0 to 1</td></tr><tr><td><code>muted?</code></td><td><code>boolean</code></td><td>the sound is off</td></tr><tr><td><code>captions?</code></td><td><code>string \| boolean</code></td><td>the key of the text track to show (its id, a &lt;track&gt;'s id or srclang - see the captions menu), '' for none; true shows the current or first one, false none. getState() reports the key shown</td></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>the video's length, seconds - reported by getState() (0 until the metadata loaded), never set</td></tr></table> |
| `playing` | Playing. A browser may refuse to start sound without a click on the page (autoplay rules): the state then stays default. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>the playback position to seek to, seconds; getState() reports the live position</td></tr><tr><td><code>rate?</code></td><td><code>number</code></td><td>the playback rate - 1 is normal speed, 2 twice as fast</td></tr><tr><td><code>volume?</code></td><td><code>number</code></td><td>the volume, 0 to 1</td></tr><tr><td><code>muted?</code></td><td><code>boolean</code></td><td>the sound is off</td></tr><tr><td><code>captions?</code></td><td><code>string \| boolean</code></td><td>the key of the text track to show (its id, a &lt;track&gt;'s id or srclang - see the captions menu), '' for none; true shows the current or first one, false none. getState() reports the key shown</td></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>the video's length, seconds - reported by getState() (0 until the metadata loaded), never set</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends VideoState&gt;(name: S, config?: VideoStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>VideoStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: VideoState; config: VideoStateConfigs[VideoState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: VideoState; config: VideoStateConfigs[VideoState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: VideoState; config: VideoStateConfigs[VideoState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: VideoState; config: VideoStateConfigs[VideoState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: VideoState; config: VideoStateConfigs[VideoState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.videoApi.setState&lt;S extends VideoState&gt;(el: HTMLElement, name: S, config?: VideoStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>VideoStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.videoApi.getState(el: HTMLElement): { name: VideoState; config: VideoStateConfigs[VideoState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: VideoState; config: VideoStateConfigs[VideoState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.videoApi.render(state: { name: VideoState; config: VideoStateConfigs[VideoState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: VideoState; config: VideoStateConfigs[VideoState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.videoApi.store(el: HTMLElement): Store&lt;{ name: VideoState; config: VideoStateConfigs[VideoState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: VideoState; config: VideoStateConfigs[VideoState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.videoApi.commit&lt;S extends VideoState&gt;(el: HTMLElement, name: S, config?: VideoStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>VideoStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.videoStates: VideoState[]</code> | The declared states, 'default' first: <code>default</code>, <code>playing</code>. |

### `df$.shadcn.video`

| Member | Description |
|---|---|
| <code>play(target: string \| HTMLElement): Promise&lt;void&gt;</code> | Start playback (the playing state). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .video element or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves once playback started, or the browser refused it (the state then reads default) |
| <code>pause(target: string \| HTMLElement): void</code> | Pause (the default state). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .video element or its selector</td></tr></table> |
| <code>toggle(target: string \| HTMLElement): boolean</code> | Play when paused, pause when playing - what a toggle control does. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .video element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - true when it plays now |
| <code>seek(target: string \| HTMLElement, time: number): void</code> | Go to a time; playing stays playing. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .video element or its selector</td></tr><tr><td><code>time</code></td><td><code>number</code></td><td>seconds from the start (clamped to the video's length)</td></tr></table> |
| <code>skip(target: string \| HTMLElement, seconds: number): void</code> | Move by some seconds - forward, or back with a negative number. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .video element or its selector</td></tr><tr><td><code>seconds</code></td><td><code>number</code></td><td>how far to move</td></tr></table> |
| <code>mute(target: string \| HTMLElement, muted?: boolean): void</code> | Switch the sound off or on. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .video element or its selector</td></tr><tr><td><code>muted?</code></td><td><code>boolean</code></td><td>true for off; default: the opposite of now</td></tr></table> |
| <code>volume(target: string \| HTMLElement, volume: number): void</code> | Set the volume. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .video element or its selector</td></tr><tr><td><code>volume</code></td><td><code>number</code></td><td>0 to 1</td></tr></table> |
| <code>rate(target: string \| HTMLElement, rate: number): void</code> | Set the playback rate. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .video element or its selector</td></tr><tr><td><code>rate</code></td><td><code>number</code></td><td>1 is normal speed, 0.5 half, 2 twice as fast</td></tr></table> |
| <code>captions(target: string \| HTMLElement, key?: string \| boolean): void</code> | Show a text track by its key, or none. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .video element or its selector</td></tr><tr><td><code>key?</code></td><td><code>string \| boolean</code></td><td>the track's key, '' or false for none, true for the current or first one; default: none when one shows, else the current or first one</td></tr></table> |
| <code>tracks(target: string \| HTMLElement, tracks: VideoTextTrack[], replace?: boolean): string[]</code> | Add or update the player's own text tracks by key - while it plays too: a track that shows keeps showing with its new cues. The captions menu lists every track of the video (a Media Timeline's text rows and &lt;track&gt; elements as well). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .video element or its selector</td></tr><tr><td><code>tracks</code></td><td><code>VideoTextTrack[]</code></td><td>the tracks, each with its id</td></tr><tr><td><code>replace?</code></td><td><code>boolean</code></td><td>also retire the player's own tracks not listed</td></tr></table> <b>Returns</b> <code>string[]</code> - the keys listed |
| <code>fullscreen(target: string \| HTMLElement): Promise&lt;void&gt;</code> | Show the player full screen (controls and captions included), or leave full screen. Browsers allow it only from a click or a key press. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .video element or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when the change is done or refused |

### Types

| Type | Description |
|---|---|
| `VideoConfig` | The config both states take - every key optional; only the keys passed are applied. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>the playback position to seek to, seconds; getState() reports the live position</td></tr><tr><td><code>rate?</code></td><td><code>number</code></td><td>the playback rate - 1 is normal speed, 2 twice as fast</td></tr><tr><td><code>volume?</code></td><td><code>number</code></td><td>the volume, 0 to 1</td></tr><tr><td><code>muted?</code></td><td><code>boolean</code></td><td>the sound is off</td></tr><tr><td><code>captions?</code></td><td><code>string \| boolean</code></td><td>the key of the text track to show (its id, a &lt;track&gt;'s id or srclang - see the captions menu), '' for none; true shows the current or first one, false none. getState() reports the key shown</td></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>the video's length, seconds - reported by getState() (0 until the metadata loaded), never set</td></tr></table> |
| `VideoCue` | One cue of a text track. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>start?</code></td><td><code>number</code></td><td>where it starts, seconds</td></tr><tr><td><code>end?</code></td><td><code>number</code></td><td>where it ends, seconds</td></tr><tr><td><code>text?</code></td><td><code>string</code></td><td>the words</td></tr></table> |
| `VideoTextTrack` | A text track of the player's own - in its script.video-tracks JSON or handed to tracks(). The same shape as a Media Timeline's text rows. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>its key, unique on the video: captions "&lt;key&gt;" shows it</td></tr><tr><td><code>kind?</code></td><td><code>string</code></td><td>subtitles or captions - what is heard (the menu's Subtitles); descriptions - what is seen (its Video captions)</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>its name in the captions menu; default: the id</td></tr><tr><td><code>lang?</code></td><td><code>string</code></td><td>its language (BCP 47, "de")</td></tr><tr><td><code>default?</code></td><td><code>boolean</code></td><td>shown first when the video shows no other track yet</td></tr><tr><td><code>items</code></td><td><code>VideoCue[]</code></td><td>its cues</td></tr></table> |
