---
name: Audio
type: MOL
section: multimedia
why: The native <audio> decodes, buffers, seeks and keeps the time; the component adds a State API (playing, time, rate, volume, muted, captions), one row of controls, controls anywhere on the page and a transcript line from the active caption cue.
when: Sound the page controls - a podcast episode, an interview, a field recording, a voice note with a Media Timeline. A styled episode card around the browser's own controls is the Website Audio Player block; a list of tracks uses Playlist Item.
where: dist/components/audio/audio.css + dist/components/audio/audio.js
supportedStates: default, playing
---

# Pattern: Audio

## Native basis

`<div class="audio" role="group">` holding a native `<audio>` without controls (its `src` or `<source>`s,
`preload`) and the controls of one row: the play toggle, a `.audio-body` with the title and the
`.audio-progress` scrubber between two readouts, an optional `.audio-captions` line, and the sound controls. The
`<audio>` keeps everything the platform gives it - decoding, buffering, `<track>` captions, media keys, `muted`.
Keep its native `controls` instead of the row if you like; the State API and the outside controls work either way.

---

## Native Web APIs
- [`<audio>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio) - playback, seeking and the time
- [`HTMLMediaElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement) - `play()`, `pause()`, `currentTime`, `playbackRate`, `volume`, `muted` and their events
- [`TextTrack`](https://developer.mozilla.org/en-US/docs/Web/API/TextTrack) - caption cues from a `<track>` or added by script, shown as a transcript line
- [`aria-pressed`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-pressed) - play and mute as toggle buttons
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - a narrow player drops the volume, rate and length

---

## Structure

```html
<div class="audio" id="harbour-audio" role="group" aria-label="A day at the harbour">
  <audio preload="metadata" src="videos/harbour.mp3"></audio>
  <button class="btn" data-variant="ghost" data-size="icon" data-audio-action="toggle" aria-pressed="false" aria-label="Play"><i data-lucide="play"></i><i data-lucide="pause"></i></button>
  <div class="audio-body">
    <span class="audio-title">A day at the harbour</span>
    <div class="audio-progress">
      <output class="audio-time" data-audio-output="time">0:00</output>
      <input class="slider" data-size="sm" type="range" min="0" max="24" step="0.1" value="0" data-audio-action="seek" aria-label="Seek">
      <output class="audio-time" data-audio-output="duration">0:24</output>
    </div>
    <p class="audio-captions"></p>
  </div>
  <button class="btn" data-variant="ghost" data-size="icon-sm" data-audio-action="mute" aria-pressed="false" aria-label="Mute"><i data-lucide="volume-2"></i><i data-lucide="volume-x"></i></button>
  <input class="slider" data-size="xs" type="range" min="0" max="1" step="0.05" value="1" data-audio-action="volume" aria-label="Volume">
</div>
```

Every part of the row is optional; leave out what the player does not need.

### Controls

The Video component's vocabulary with the `audio` prefix: a control carries `data-audio-action` (`toggle`, `play`,
`pause`, `skip` + `data-value`, `seek` on a range, `mute`, `volume` on a range, `rate` on a `<select>` or a button
with `data-value`, `captions`), a readout `data-audio-output` (`time`, `duration`, `remaining`). Inside the player
they drive it; anywhere else they name it with `data-audio-for="<the player's id>"` - on the control, or once on a
container of controls.

```html
<div class="button-group" data-audio-for="harbour-audio">
  <button class="btn" data-variant="outline" data-size="sm" data-audio-action="rate" data-value="1" aria-pressed="true">1×</button>
  <button class="btn" data-variant="outline" data-size="sm" data-audio-action="rate" data-value="1.5" aria-pressed="false">1.5×</button>
  <button class="btn" data-variant="outline" data-size="sm" data-audio-action="rate" data-value="2" aria-pressed="false">2×</button>
</div>
```

A toggle with two icons shows the first while off and the second while on.

### Volume, text tracks

The volume as a vertical slider: an `.audio-volume` holds the sound button and an `.audio-volume-panel` with a
vertical Slider (`data-orientation="vertical"`), shown above the button (`data-side="bottom"`: below) while the
pointer or the focus is on either - a compact row stays one line.

```html
<div class="audio-volume" data-side="bottom">
  <button class="btn" data-variant="ghost" data-size="icon-sm" data-audio-action="mute" aria-pressed="false" aria-label="Mute"><i data-lucide="volume-2"></i><i data-lucide="volume-x"></i></button>
  <div class="audio-volume-panel">
    <input class="slider" data-orientation="vertical" data-size="xs" type="range" min="0" max="1" step="0.05" value="0.8" data-audio-action="volume" aria-label="Volume">
  </div>
</div>
```

The text tracks are keyed as the Video's are (`<script type="application/json" class="audio-tracks">`, a Media
Timeline's text rows, `<track>` elements): `captions` is the key of the one shown, and a `data-audio-action="captions"`
button opens a Dropdown Menu of them when there are two or more.

### Transcript line

A `<track kind="captions">` in the `<audio>`, or a captions track a Media Timeline adds from its JSON, fills
`.audio-captions` with the active cue - the words as they are spoken; `captions` in the config (or a `captions`
control) shows or hides it.

---

## Variants

| Attribute | Behavior |
|---|---|
| Default | One row in a bordered card |
| `data-variant="compact"` | No frame, no title - the controls alone, for a row in a list or a sentence |

---

## ARIA

| Element | Attribute | Notes |
|---|---|---|
| player | `role="group"` + `aria-label` | Names what plays |
| play, mute | `aria-pressed` | Toggle buttons with a constant `aria-label` ("Play" pressed = playing) |
| scrubber | `aria-label`, `aria-valuetext` | The runtime writes "0:12 of 0:24" as the value text |
| transcript line | - | Plain text, read with the player |

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
const audio = document.querySelector('#harbour-audio');
audio.api.setState('playing', { time: 6 });
audio.store.subscribe(({ name, config }) => console.log(name, config.time));
```

## Notes

- Give the player an `id` to bind controls from outside it (`data-audio-for`) or a Media Timeline (`data-media`).
- The time, the scrubber and the readouts move by themselves and are not part of `render()`; the toggles, the
  volume and rate controls and the `muted` attribute are.
- `preload="none"` keeps a page of many episodes light; the length then shows once playback starts.
- Offer a transcript for spoken audio - a captions track gives one line at a time; the full text belongs on the page.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type AudioState = 'default' | 'playing'</code> - `setState(name, config)` takes the config of the state it names (`AudioStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Paused - at the start, wherever it was paused, or at the end. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>the playback position to seek to, seconds; getState() reports the live position</td></tr><tr><td><code>rate?</code></td><td><code>number</code></td><td>the playback rate - 1 is normal speed, 2 twice as fast</td></tr><tr><td><code>volume?</code></td><td><code>number</code></td><td>the volume, 0 to 1</td></tr><tr><td><code>muted?</code></td><td><code>boolean</code></td><td>the sound is off</td></tr><tr><td><code>captions?</code></td><td><code>string \| boolean</code></td><td>the key of the text track to show (its id, a &lt;track&gt;'s id or srclang - see the captions menu), '' for none; true shows the current or first one, false none. getState() reports the key shown</td></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>the audio's length, seconds - reported by getState() (0 until the metadata loaded), never set</td></tr></table> |
| `playing` | Playing. A browser may refuse to start sound without a click on the page (autoplay rules): the state then stays default. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>the playback position to seek to, seconds; getState() reports the live position</td></tr><tr><td><code>rate?</code></td><td><code>number</code></td><td>the playback rate - 1 is normal speed, 2 twice as fast</td></tr><tr><td><code>volume?</code></td><td><code>number</code></td><td>the volume, 0 to 1</td></tr><tr><td><code>muted?</code></td><td><code>boolean</code></td><td>the sound is off</td></tr><tr><td><code>captions?</code></td><td><code>string \| boolean</code></td><td>the key of the text track to show (its id, a &lt;track&gt;'s id or srclang - see the captions menu), '' for none; true shows the current or first one, false none. getState() reports the key shown</td></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>the audio's length, seconds - reported by getState() (0 until the metadata loaded), never set</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends AudioState&gt;(name: S, config?: AudioStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AudioStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: AudioState; config: AudioStateConfigs[AudioState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: AudioState; config: AudioStateConfigs[AudioState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: AudioState; config: AudioStateConfigs[AudioState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: AudioState; config: AudioStateConfigs[AudioState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: AudioState; config: AudioStateConfigs[AudioState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.audioApi.setState&lt;S extends AudioState&gt;(el: HTMLElement, name: S, config?: AudioStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AudioStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.audioApi.getState(el: HTMLElement): { name: AudioState; config: AudioStateConfigs[AudioState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: AudioState; config: AudioStateConfigs[AudioState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.audioApi.render(state: { name: AudioState; config: AudioStateConfigs[AudioState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: AudioState; config: AudioStateConfigs[AudioState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.audioApi.store(el: HTMLElement): Store&lt;{ name: AudioState; config: AudioStateConfigs[AudioState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: AudioState; config: AudioStateConfigs[AudioState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.audioApi.commit&lt;S extends AudioState&gt;(el: HTMLElement, name: S, config?: AudioStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>AudioStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.audioStates: AudioState[]</code> | The declared states, 'default' first: <code>default</code>, <code>playing</code>. |

### `df$.shadcn.audio`

| Member | Description |
|---|---|
| <code>play(target: string \| HTMLElement): Promise&lt;void&gt;</code> | Start playback (the playing state). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .audio element or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves once playback started, or the browser refused it (the state then reads default) |
| <code>pause(target: string \| HTMLElement): void</code> | Pause (the default state). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .audio element or its selector</td></tr></table> |
| <code>toggle(target: string \| HTMLElement): boolean</code> | Play when paused, pause when playing - what a toggle control does. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .audio element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - true when it plays now |
| <code>seek(target: string \| HTMLElement, time: number): void</code> | Go to a time; playing stays playing. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .audio element or its selector</td></tr><tr><td><code>time</code></td><td><code>number</code></td><td>seconds from the start (clamped to the audio's length)</td></tr></table> |
| <code>skip(target: string \| HTMLElement, seconds: number): void</code> | Move by some seconds - forward, or back with a negative number. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .audio element or its selector</td></tr><tr><td><code>seconds</code></td><td><code>number</code></td><td>how far to move</td></tr></table> |
| <code>mute(target: string \| HTMLElement, muted?: boolean): void</code> | Switch the sound off or on. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .audio element or its selector</td></tr><tr><td><code>muted?</code></td><td><code>boolean</code></td><td>true for off; default: the opposite of now</td></tr></table> |
| <code>volume(target: string \| HTMLElement, volume: number): void</code> | Set the volume. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .audio element or its selector</td></tr><tr><td><code>volume</code></td><td><code>number</code></td><td>0 to 1</td></tr></table> |
| <code>rate(target: string \| HTMLElement, rate: number): void</code> | Set the playback rate. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .audio element or its selector</td></tr><tr><td><code>rate</code></td><td><code>number</code></td><td>1 is normal speed, 0.5 half, 2 twice as fast</td></tr></table> |
| <code>captions(target: string \| HTMLElement, key?: string \| boolean): void</code> | Show a text track by its key, or none. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .audio element or its selector</td></tr><tr><td><code>key?</code></td><td><code>string \| boolean</code></td><td>the track's key, '' or false for none, true for the current or first one; default: none when one shows, else the current or first one</td></tr></table> |
| <code>tracks(target: string \| HTMLElement, tracks: AudioTextTrack[], replace?: boolean): string[]</code> | Add or update the player's own text tracks by key - while it plays too: a track that shows keeps showing with its new cues. The captions menu lists every track of the audio (a Media Timeline's text rows and &lt;track&gt; elements as well). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .audio element or its selector</td></tr><tr><td><code>tracks</code></td><td><code>AudioTextTrack[]</code></td><td>the tracks, each with its id</td></tr><tr><td><code>replace?</code></td><td><code>boolean</code></td><td>also retire the player's own tracks not listed</td></tr></table> <b>Returns</b> <code>string[]</code> - the keys listed |

### Types

| Type | Description |
|---|---|
| `AudioConfig` | The config both states take - every key optional; only the keys passed are applied. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>the playback position to seek to, seconds; getState() reports the live position</td></tr><tr><td><code>rate?</code></td><td><code>number</code></td><td>the playback rate - 1 is normal speed, 2 twice as fast</td></tr><tr><td><code>volume?</code></td><td><code>number</code></td><td>the volume, 0 to 1</td></tr><tr><td><code>muted?</code></td><td><code>boolean</code></td><td>the sound is off</td></tr><tr><td><code>captions?</code></td><td><code>string \| boolean</code></td><td>the key of the text track to show (its id, a &lt;track&gt;'s id or srclang - see the captions menu), '' for none; true shows the current or first one, false none. getState() reports the key shown</td></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>the audio's length, seconds - reported by getState() (0 until the metadata loaded), never set</td></tr></table> |
| `AudioCue` | One cue of a text track. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>start?</code></td><td><code>number</code></td><td>where it starts, seconds</td></tr><tr><td><code>end?</code></td><td><code>number</code></td><td>where it ends, seconds</td></tr><tr><td><code>text?</code></td><td><code>string</code></td><td>the words</td></tr></table> |
| `AudioTextTrack` | A text track of the player's own - in its script.audio-tracks JSON or handed to tracks(). The same shape as a Media Timeline's text rows. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>its key, unique on the audio: captions "&lt;key&gt;" shows it</td></tr><tr><td><code>kind?</code></td><td><code>string</code></td><td>subtitles or captions - what is heard (the menu's Subtitles); descriptions - what is seen (its Video captions)</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>its name in the captions menu; default: the id</td></tr><tr><td><code>lang?</code></td><td><code>string</code></td><td>its language (BCP 47, "de")</td></tr><tr><td><code>default?</code></td><td><code>boolean</code></td><td>shown first when the audio shows no other track yet</td></tr><tr><td><code>items</code></td><td><code>AudioCue[]</code></td><td>its cues</td></tr></table> |
