---
name: Envelope
type: ATM
section: multimedia
why: One JSON object of parameters drawn as the curve of an audio plugin and edited by its handles - an ADSR, a compressor's transfer curve, a filter's or an EQ's response (Web Audio's own, from BiquadFilterNode.getFrequencyResponse) - and the same parameters drive Web Audio.
when: Synth envelopes, compressors, filters and EQs - with knobs bound to the parameters; a single value on a dial is a knob, a value over time on a track is the media timeline.
where: dist/components/envelope/envelope.css + dist/components/envelope/envelope.js
supportedStates: default, playing, editing, disabled
---

# Envelope

## Native basis

A `<div class="envelope">` holding its parameters as JSON in a `<script type="application/json" class="envelope-source">`. The runtime draws the curve into an inline SVG and lays focusable `role="slider"` handles over it. A filter's curve is the response the Web Audio API computes for its bands (`BiquadFilterNode.getFrequencyResponse()` on an `OfflineAudioContext`), so the curve on screen is exactly the filter `connect()` builds. Knobs, range inputs, number inputs, selects and checkboxes bound to a parameter (`data-envelope-param`) stay the native form controls and follow the curve both ways.

## Native Web APIs

- [`BiquadFilterNode.getFrequencyResponse()`](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/getFrequencyResponse) - the filter and EQ curves, computed by the browser's own filters
- [`OfflineAudioContext`](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext) - a context for the curves that never plays a sound
- [`AudioParam.setValueCurveAtTime()`](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setValueCurveAtTime) - `schedule()` writes an ADSR into a gain or a frequency, its bends included
- [`DynamicsCompressorNode`](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode) - `connect()` on a compressor curve; its `reduction` is shown live
- [`AnalyserNode`](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) - the level going into a connected compressor
- [`<script type="application/json">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script) - the parameters as data in the markup
- [`vector-effect: non-scaling-stroke`](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/vector-effect) - one SVG stretched over the plot, its strokes kept at their width
- [`Pointer Events`](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) + [`setPointerCapture()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - a handle dragged with mouse, pen or touch
- [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - times, levels, frequencies in the page's locale
- [WAI-ARIA slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) - each handle is a slider with its value in words
- [`requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - an ADSR's playback, a connected compressor's live level
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast), [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

## Structure

```html
<div class="envelope" id="amp-env" aria-label="Amp envelope">
  <script type="application/json" class="envelope-source">
    { "attack": 0.01, "decay": 0.3, "sustain": 0.6, "release": 0.8, "decayCurve": 0.6, "releaseCurve": 0.5 }
  </script>
</div>
<button class="btn" type="button" data-envelope-for="amp-env" data-envelope-action="gate">Hold to play</button>
<div class="knob" data-envelope-for="amp-env" data-envelope-param="attack" data-scale="power" data-exponent="3" data-format="time">
  <input class="knob-input" type="range" id="amp-attack" min="0" max="5" step="any" value="0.01" />
  <label class="knob-label" for="amp-attack">Attack</label>
  <output class="knob-value" for="amp-attack">10 ms</output>
</div>
```

The runtime adds `.envelope-graph` after the source (the plot, the handles, a compressor's meter, an ADSR's phase strip) and a hidden description of the whole curve (`aria-describedby`). The root gets `role="group"`; give it a name with `aria-label` or `aria-labelledby`.

### Kinds (`data-kind`)

| `data-kind` | Parameters | Handles |
| --- | --- | --- |
| `adsr` (default) | `delay`?, `attack`, `hold`?, `decay`, `sustain` (0 to 1), `release` - seconds, up to 32; `attackCurve`, `decayCurve`, `releaseCurve` (-1 to 1: 0 straight, above 0 fast first, below 0 slow first). `delay` and `hold` show only when they are given. | delay, attack, hold (time), decay (time and sustain level), release (time), one bend per slope (its middle) |
| `dynamics` | `threshold` (dB, to 0), `ratio` (1 to 100 - 100 is drawn as ∞:1, a limiter), `knee` (dB, 0 to 24), `makeup` (dB), `attack`, `release` (seconds) | threshold (left / right; Up / Down: the knee), ratio (up / down, at 0 dB in) |
| `filter` | `bands`: each `{ id?, label?, type, frequency, Q?, gain?, slope?, on?, color? }` - the BiquadFilterNode types `lowpass`, `highpass`, `bandpass`, `lowshelf`, `highshelf`, `peaking`, `notch`, `allpass`; `Q` is the resonance in dB for lowpass / highpass (Web Audio's meaning) and the quality factor otherwise; `slope` 12 / 24 / 36 / 48 dB per octave for the cuts; `on: false` leaves a band out | one per band: left / right the frequency, up / down the gain (peaking, shelves) or the resonance (cuts); the wheel and Page Up / Down its Q |

### Bound controls, actions and outputs

Inside the envelope, or anywhere with `data-envelope-for="<envelope id>"` (on the element or a container):

| Attribute | Meaning |
| --- | --- |
| `data-envelope-param="attack"` | a `.knob`, `input` or `select` showing and setting a parameter; a band's as `<band>.<param>` (`low.gain`, `2.frequency` - the band's `id`, else its number from 1); a checkbox for `on` |
| `data-envelope-action="gate"` | held (pointer, Space, Enter): the gate is open while it is pressed - `aria-pressed` follows |
| `data-envelope-action="trigger"` | a click plays the envelope with a gate of `data-value` seconds (default: to the sustain and a quarter second more) |
| `data-envelope-action="stop"` / `"reset"` | stop playback now / the authored parameters back |
| `data-envelope-output="value"` | the live level (ADSR, a percent) or the level coming out (compressor) |
| `data-envelope-output="phase"` | the phase: Delay, Attack, Hold, Decay, Sustain, Release (a compressor: Attack, Release) |
| `data-envelope-output="reduction"` | a compressor's gain reduction |

## Variants

| Attribute | Effect |
| --- | --- |
| `data-color="chart-1"` ... `"chart-5"`, `"destructive"` | the curve's colour (default `--primary`) |
| `data-range="48"` | the span: a compressor's floor in dB below 0 (default 60), a filter's ± dB (default 24) |
| `data-length="2"` | an ADSR's plot spans at least this many seconds (it grows with its stages otherwise) |
| `data-readonly` | the curve without handles - for playback and display |
| `aria-disabled="true"` | authored disabled: the `disabled` state |
| band `color` | a band's handle and own curve: a theme colour or a CSS colour (default the chart colour of its number) |

## Sizes

| `data-size` | Plot height |
| --- | --- |
| `sm` | 6rem |
| (default) | 9rem |
| `lg` | 14rem |

`--envelope-height` sets any height; a compressor's plot is square (up to 1.75 times the height).

## ARIA

| Element | Attribute | Notes |
| --- | --- | --- |
| `.envelope` | `role="group"` + `aria-label` / `aria-labelledby` | set by the runtime when missing; `aria-describedby` points at the description of the whole curve |
| `.envelope-handle` | `role="slider"`, `aria-label`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` | the text names every value the handle moves ("Decay 300 ms, sustain 60%") |
| `.envelope` | `aria-disabled="true"` | the disabled state: the handles leave the tab order |
| gate button | `aria-pressed` | follows the gate |

Keys on a handle: Left / Right its time or frequency (times by 10 %, frequencies by a semitone), Up / Down its level, gain, resonance, ratio or bend, Shift finer, Page Up / Down a band's Q, Delete / Backspace the authored values, Escape ends a drag where it started. A double click or Ctrl / Cmd + click on a handle puts its authored values back; Shift slows a drag down ten times.

## States

| State | Meaning |
| --- | --- |
| `default` | at rest: the curve and its handles |
| `playing` | an ADSR after its gate opened (until its release ends), a compressor while levels come in (`input()` or a connected chain), a filter while it is modulated (`modulate()`) - a dot shows the live value, an ADSR its phase |
| `editing` | a handle is dragged (config `handle`): it shows its value - a drag enters it and returns to `default` when it ends |
| `disabled` | `aria-disabled`, no handle moves, playback stops |

The config is the parameters, merged: `setState('default', { params: { attack: 0.2 } })` changes the attack and keeps the rest. `playing` takes `gate` (seconds) for an ADSR.

```js
const env = document.querySelector('#amp-env');
env.api.setState('playing', { gate: 0.5 }); // the attack, decay, half a second of gate, the release
env.api.getState(); // → { name: 'playing', config: { params: { attack: 0.01, ... } } }
```

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type EnvelopeState = 'default' | 'playing' | 'editing' | 'disabled'</code> - `setState(name, config)` takes the config of the state it names (`EnvelopeStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | At rest: the curve and its handles. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>params?</code></td><td><code>Partial&lt;EnvelopeAdsr&gt; \| Partial&lt;EnvelopeDynamics&gt; \| EnvelopeFilter</code></td><td>the curve's parameters (EnvelopeAdsr, EnvelopeDynamics or EnvelopeFilter, by data-kind); a setState may name only some of them - getState() reports them all</td></tr><tr><td><code>gate?</code></td><td><code>number</code></td><td>playing an ADSR: the gate's length in seconds - left out, the gate stays open until noteOff()</td></tr><tr><td><code>handle?</code></td><td><code>string</code></td><td>editing: the handle being edited (its data-handle)</td></tr></table> |
| `playing` | Playing: an ADSR after its gate opened (until its release ends), a compressor while levels come in, a filter while it is modulated - the curve shows the live value. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>params?</code></td><td><code>Partial&lt;EnvelopeAdsr&gt; \| Partial&lt;EnvelopeDynamics&gt; \| EnvelopeFilter</code></td><td>the curve's parameters (EnvelopeAdsr, EnvelopeDynamics or EnvelopeFilter, by data-kind); a setState may name only some of them - getState() reports them all</td></tr><tr><td><code>gate?</code></td><td><code>number</code></td><td>playing an ADSR: the gate's length in seconds - left out, the gate stays open until noteOff()</td></tr><tr><td><code>handle?</code></td><td><code>string</code></td><td>editing: the handle being edited (its data-handle)</td></tr></table> |
| `editing` | A handle is dragged: it shows its value - a drag enters it and returns to default when it ends. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>params?</code></td><td><code>Partial&lt;EnvelopeAdsr&gt; \| Partial&lt;EnvelopeDynamics&gt; \| EnvelopeFilter</code></td><td>the curve's parameters (EnvelopeAdsr, EnvelopeDynamics or EnvelopeFilter, by data-kind); a setState may name only some of them - getState() reports them all</td></tr><tr><td><code>gate?</code></td><td><code>number</code></td><td>playing an ADSR: the gate's length in seconds - left out, the gate stays open until noteOff()</td></tr><tr><td><code>handle?</code></td><td><code>string</code></td><td>editing: the handle being edited (its data-handle)</td></tr></table> |
| `disabled` | Disabled: aria-disabled, no handle moves; playback stops. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>params?</code></td><td><code>Partial&lt;EnvelopeAdsr&gt; \| Partial&lt;EnvelopeDynamics&gt; \| EnvelopeFilter</code></td><td>the curve's parameters (EnvelopeAdsr, EnvelopeDynamics or EnvelopeFilter, by data-kind); a setState may name only some of them - getState() reports them all</td></tr><tr><td><code>gate?</code></td><td><code>number</code></td><td>playing an ADSR: the gate's length in seconds - left out, the gate stays open until noteOff()</td></tr><tr><td><code>handle?</code></td><td><code>string</code></td><td>editing: the handle being edited (its data-handle)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends EnvelopeState&gt;(name: S, config?: EnvelopeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>EnvelopeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: EnvelopeState; config: EnvelopeStateConfigs[EnvelopeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: EnvelopeState; config: EnvelopeStateConfigs[EnvelopeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: EnvelopeState; config: EnvelopeStateConfigs[EnvelopeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: EnvelopeState; config: EnvelopeStateConfigs[EnvelopeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: EnvelopeState; config: EnvelopeStateConfigs[EnvelopeState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.envelopeApi.setState&lt;S extends EnvelopeState&gt;(el: HTMLElement, name: S, config?: EnvelopeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>EnvelopeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.envelopeApi.getState(el: HTMLElement): { name: EnvelopeState; config: EnvelopeStateConfigs[EnvelopeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: EnvelopeState; config: EnvelopeStateConfigs[EnvelopeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.envelopeApi.render(state: { name: EnvelopeState; config: EnvelopeStateConfigs[EnvelopeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: EnvelopeState; config: EnvelopeStateConfigs[EnvelopeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.envelopeApi.store(el: HTMLElement): Store&lt;{ name: EnvelopeState; config: EnvelopeStateConfigs[EnvelopeState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: EnvelopeState; config: EnvelopeStateConfigs[EnvelopeState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.envelopeApi.commit&lt;S extends EnvelopeState&gt;(el: HTMLElement, name: S, config?: EnvelopeStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>EnvelopeStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.envelopeStates: EnvelopeState[]</code> | The declared states, 'default' first: <code>default</code>, <code>playing</code>, <code>editing</code>, <code>disabled</code>. |

### `df$.shadcn.envelope`

| Member | Description |
|---|---|
| <code>params(target: string \| HTMLElement, params?: Partial&lt;EnvelopeAdsr&gt; \| Partial&lt;EnvelopeDynamics&gt; \| EnvelopeFilter): EnvelopeParams \| null</code> | The parameters, or change some of them (the others stay; each on its range). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr><tr><td><code>params?</code></td><td><code>Partial&lt;EnvelopeAdsr&gt; \| Partial&lt;EnvelopeDynamics&gt; \| EnvelopeFilter</code></td><td>the parameters to change; leave it out to read</td></tr></table> <b>Returns</b> <code>EnvelopeParams \| null</code> - a copy of the parameters now; null for an unknown element |
| <code>noteOn(target: string \| HTMLElement): void</code> | Open an ADSR's gate: the attack starts from the level it is at, the sustain holds until noteOff(). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr></table> |
| <code>noteOff(target: string \| HTMLElement): void</code> | Close the gate: the release runs from the level it is at, then playback ends. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr></table> |
| <code>trigger(target: string \| HTMLElement, gate?: number): void</code> | Play an ADSR with a gate of a length. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr><tr><td><code>gate?</code></td><td><code>number</code></td><td>the gate's length in seconds; default until the sustain is reached and a quarter second more</td></tr></table> |
| <code>stop(target: string \| HTMLElement): void</code> | Stop playback now - no release; a compressor's level and a filter's modulation are cleared too. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr></table> |
| <code>valueAt(target: string \| HTMLElement, time: number, gate?: number): { value: number; phase: string }</code> | An ADSR's level and phase at a time - what playback shows and schedule() writes. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr><tr><td><code>time</code></td><td><code>number</code></td><td>seconds after the gate opened</td></tr><tr><td><code>gate?</code></td><td><code>number</code></td><td>the gate's length in seconds; leave it out for a gate still open</td></tr></table> <b>Returns</b> <code>{ value: number; phase: string }</code> - the level (0 to 1) and the phase (delay, attack, hold, decay, sustain, release or idle) |
| <code>schedule(target: string \| HTMLElement, param: AudioParam, options: EnvelopeScheduleOptions = {}): number</code> | Write an ADSR into a Web Audio parameter: the attack, decay and sustain from the start, the release after the gate - sampled curves (setValueCurveAtTime), so the bends are kept. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr><tr><td><code>param</code></td><td><code>AudioParam</code></td><td>the AudioParam to drive (a GainNode's gain, a filter's frequency)</td></tr><tr><td><code>options</code></td><td><code>EnvelopeScheduleOptions</code> = <code>{}</code></td><td>when the gate opens and how long it stays, and the parameter's range</td></tr></table> <b>Returns</b> <code>number</code> - the context time the release ends |
| <code>input(target: string \| HTMLElement, level: number \| null, time?: number): number</code> | A compressor gets a level: its reduction follows at the attack and release times, the curve shows the level in and out and the meter the reduction. null ends it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr><tr><td><code>level</code></td><td><code>number \| null</code></td><td>the level going in, in dB; null: no more levels (back to default)</td></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>the level's time in seconds; default now - give it for levels that are not live</td></tr></table> <b>Returns</b> <code>number</code> - the gain reduction in dB (0 or more) |
| <code>transfer(target: string \| HTMLElement, level: number): number</code> | A compressor's curve: the level coming out for a level going in (the makeup included, no attack or release). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr><tr><td><code>level</code></td><td><code>number</code></td><td>the level going in, in dB</td></tr></table> <b>Returns</b> <code>number</code> - the level coming out, in dB; NaN for an element that is no compressor |
| <code>modulate(target: string \| HTMLElement, values: Record&lt;string, Partial&lt;Pick&lt;EnvelopeBand, 'frequency' \| 'gain' \| 'Q'&gt;&gt; \| null&gt; \| null): void</code> | A filter's live values - the curve shows them over the authored one (dashed) while any is set, the chains follow. Values are absolute: { cutoff: { frequency: 2400 } }. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr><tr><td><code>values</code></td><td><code>Record&lt;string, Partial&lt;Pick&lt;EnvelopeBand, 'frequency' \| 'gain' \| 'Q'&gt;&gt; \| null&gt; \| null</code></td><td>by band (id or number from 1): its frequency, gain or Q now, null for none; null: none at all</td></tr></table> |
| <code>response(target: string \| HTMLElement, frequencies: number[]): number[]</code> | A filter's response - the curve drawn, with its live values. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr><tr><td><code>frequencies</code></td><td><code>number[]</code></td><td>the frequencies in Hz</td></tr></table> <b>Returns</b> <code>number[]</code> - the level in dB at each frequency (the bands that are on, added) |
| <code>connect(target: string \| HTMLElement, context: BaseAudioContext): EnvelopeChain \| null</code> | Web Audio nodes that follow the curve: a filter's BiquadFilterNodes in a row (each band, a cut as many times as its slope says), or a compressor's DynamicsCompressorNode and makeup gain - whose input level and live reduction the curve then shows while the context runs. The node's ratio stops at 20, its knee at 40 dB and its release at 1 s, and its knee is the browser's. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .envelope element or a selector of it</td></tr><tr><td><code>context</code></td><td><code>BaseAudioContext</code></td><td>the AudioContext (or OfflineAudioContext) to make the nodes in</td></tr></table> <b>Returns</b> <code>EnvelopeChain \| null</code> - the chain's input and output, the compressor, and disconnect(); null for an ADSR or an unknown element |

### Events

| Event | Description |
|---|---|
| `envelope-change` | Fires when the parameters change - while a drag goes on (committed: false) and when a change is done. <code>detail</code>: <code>EnvelopeChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>params</code></td><td><code>EnvelopeParams</code></td><td>the parameters now</td></tr><tr><td><code>handle</code></td><td><code>string \| null</code></td><td>the handle or bound parameter that changed them, null for setState and the API</td></tr><tr><td><code>committed</code></td><td><code>boolean</code></td><td>true when the change is done (a drag ended, a key, setState), false while a drag goes on</td></tr></table> |
| `envelope-phase` | Fires when the phase changes - an ADSR's stage, a compressor's attack or release - and with idle when playback ends. <code>detail</code>: <code>EnvelopeValueDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>number</code></td><td>an ADSR: the level, 0 to 1; a compressor: the gain reduction in dB (0 or more)</td></tr><tr><td><code>phase</code></td><td><code>string</code></td><td>an ADSR: delay, attack, hold, decay, sustain, release or idle; a compressor: attack, release or idle</td></tr><tr><td><code>time</code></td><td><code>number</code></td><td>an ADSR: seconds since the gate opened; a compressor: the time of the level in seconds</td></tr><tr><td><code>input?</code></td><td><code>number</code></td><td>a compressor: the level going in, in dB</td></tr><tr><td><code>output?</code></td><td><code>number</code></td><td>a compressor: the level coming out, in dB (the reduction and the makeup applied)</td></tr></table> |
| `envelope-value` | Fires on every frame of a playing ADSR and with every level a compressor gets - drive other components from it. <code>detail</code>: <code>EnvelopeValueDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>number</code></td><td>an ADSR: the level, 0 to 1; a compressor: the gain reduction in dB (0 or more)</td></tr><tr><td><code>phase</code></td><td><code>string</code></td><td>an ADSR: delay, attack, hold, decay, sustain, release or idle; a compressor: attack, release or idle</td></tr><tr><td><code>time</code></td><td><code>number</code></td><td>an ADSR: seconds since the gate opened; a compressor: the time of the level in seconds</td></tr><tr><td><code>input?</code></td><td><code>number</code></td><td>a compressor: the level going in, in dB</td></tr><tr><td><code>output?</code></td><td><code>number</code></td><td>a compressor: the level coming out, in dB (the reduction and the makeup applied)</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `EnvelopeAdsr` | The parameters of an ADSR envelope (data-kind="adsr", the default): times in seconds, levels 0 to 1. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>delay?</code></td><td><code>number</code></td><td>the wait before the attack - the stage shows only when the key is given</td></tr><tr><td><code>attack</code></td><td><code>number</code></td><td>the rise from 0 to the peak</td></tr><tr><td><code>hold?</code></td><td><code>number</code></td><td>the time the peak is held - the stage shows only when the key is given</td></tr><tr><td><code>decay</code></td><td><code>number</code></td><td>the fall from the peak to the sustain level</td></tr><tr><td><code>sustain</code></td><td><code>number</code></td><td>the level held while the gate stays open, 0 to 1</td></tr><tr><td><code>release</code></td><td><code>number</code></td><td>the fall to 0 after the gate closes</td></tr><tr><td><code>attackCurve?</code></td><td><code>number</code></td><td>the attack's bend, -1 to 1: 0 is a straight line, above 0 fast first, below 0 slow first</td></tr><tr><td><code>decayCurve?</code></td><td><code>number</code></td><td>the decay's bend, -1 to 1</td></tr><tr><td><code>releaseCurve?</code></td><td><code>number</code></td><td>the release's bend, -1 to 1</td></tr></table> |
| `EnvelopeBand` | A band of a filter or an EQ - the parameters of a Web Audio BiquadFilterNode. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id?</code></td><td><code>string</code></td><td>the band's name in a bound parameter ("low.gain") and in modulate(); without one it is its number from 1</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>the band's name for people ("Low cut")</td></tr><tr><td><code>type</code></td><td><code>BiquadFilterType</code></td><td>the BiquadFilterNode type: lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch or allpass</td></tr><tr><td><code>frequency</code></td><td><code>number</code></td><td>the cutoff, centre or corner frequency in Hz, 20 to 20 000</td></tr><tr><td><code>Q?</code></td><td><code>number</code></td><td>the resonance in dB for lowpass and highpass (Web Audio's meaning), the quality factor for bandpass, peaking, notch and allpass; shelves take none</td></tr><tr><td><code>gain?</code></td><td><code>number</code></td><td>the gain in dB of peaking and the shelves</td></tr><tr><td><code>slope?</code></td><td><code>number</code></td><td>lowpass and highpass: the slope in dB per octave - 12, 24, 36 or 48 (that many filters in a row)</td></tr><tr><td><code>on?</code></td><td><code>boolean</code></td><td>false: the band is drawn dashed and left out of the response</td></tr><tr><td><code>color?</code></td><td><code>string</code></td><td>a theme colour (chart-1 ... chart-5, primary, destructive) or a CSS colour; default the chart colour of its number</td></tr></table> |
| `EnvelopeChain` | The audio nodes connect() made - put them between a source and a destination. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>input</code></td><td><code>AudioNode</code></td><td>connect the source to it</td></tr><tr><td><code>output</code></td><td><code>AudioNode</code></td><td>connect it to the destination</td></tr><tr><td><code>compressor</code></td><td><code>DynamicsCompressorNode \| null</code></td><td>the compressor of a dynamics curve (its live reduction is shown), null for a filter</td></tr><tr><td><code>disconnect</code></td><td><code>() =&gt; void</code></td><td>take the nodes apart and stop following the curve</td></tr></table> |
| `EnvelopeChangeDetail` | What envelope-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>params</code></td><td><code>EnvelopeParams</code></td><td>the parameters now</td></tr><tr><td><code>handle</code></td><td><code>string \| null</code></td><td>the handle or bound parameter that changed them, null for setState and the API</td></tr><tr><td><code>committed</code></td><td><code>boolean</code></td><td>true when the change is done (a drag ended, a key, setState), false while a drag goes on</td></tr></table> |
| `EnvelopeConfig` | The config every state takes. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>params?</code></td><td><code>Partial&lt;EnvelopeAdsr&gt; \| Partial&lt;EnvelopeDynamics&gt; \| EnvelopeFilter</code></td><td>the curve's parameters (EnvelopeAdsr, EnvelopeDynamics or EnvelopeFilter, by data-kind); a setState may name only some of them - getState() reports them all</td></tr><tr><td><code>gate?</code></td><td><code>number</code></td><td>playing an ADSR: the gate's length in seconds - left out, the gate stays open until noteOff()</td></tr><tr><td><code>handle?</code></td><td><code>string</code></td><td>editing: the handle being edited (its data-handle)</td></tr></table> |
| `EnvelopeDynamics` | The parameters of a compressor (data-kind="dynamics"): levels in dB, times in seconds. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>threshold</code></td><td><code>number</code></td><td>the level above which the gain is reduced</td></tr><tr><td><code>ratio</code></td><td><code>number</code></td><td>how much a level above the threshold is reduced: 4 = 4 dB in, 1 dB out; 100 and more is a limiter</td></tr><tr><td><code>knee</code></td><td><code>number</code></td><td>the width of the soft knee around the threshold, in dB (0: a hard knee)</td></tr><tr><td><code>makeup</code></td><td><code>number</code></td><td>the gain added after the reduction</td></tr><tr><td><code>attack</code></td><td><code>number</code></td><td>how fast the reduction follows a rising level</td></tr><tr><td><code>release</code></td><td><code>number</code></td><td>how fast it lets go when the level falls</td></tr></table> |
| `EnvelopeFilter` | The parameters of a filter or an EQ (data-kind="filter"). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>bands</code></td><td><code>EnvelopeBand[]</code></td><td>the bands, their responses added in dB</td></tr></table> |
| `EnvelopeParams` | The parameters of a curve - the ones of its kind. = <code>EnvelopeAdsr \| EnvelopeDynamics \| EnvelopeFilter</code> |
| `EnvelopeScheduleOptions` | What schedule() writes and how. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>start?</code></td><td><code>number</code></td><td>the context time the gate opens; default the context's current time</td></tr><tr><td><code>gate?</code></td><td><code>number</code></td><td>the gate's length in seconds; default until the sustain is reached and a quarter second more</td></tr><tr><td><code>min?</code></td><td><code>number</code></td><td>the parameter's value at level 0; default 0</td></tr><tr><td><code>max?</code></td><td><code>number</code></td><td>the parameter's value at level 1; default 1</td></tr><tr><td><code>scale?</code></td><td><code>'linear' \| 'exponential'</code></td><td>"exponential" maps the level onto min ... max on a log scale (a frequency); default "linear"</td></tr></table> |
| `EnvelopeValueDetail` | What envelope-phase and envelope-value carry. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>number</code></td><td>an ADSR: the level, 0 to 1; a compressor: the gain reduction in dB (0 or more)</td></tr><tr><td><code>phase</code></td><td><code>string</code></td><td>an ADSR: delay, attack, hold, decay, sustain, release or idle; a compressor: attack, release or idle</td></tr><tr><td><code>time</code></td><td><code>number</code></td><td>an ADSR: seconds since the gate opened; a compressor: the time of the level in seconds</td></tr><tr><td><code>input?</code></td><td><code>number</code></td><td>a compressor: the level going in, in dB</td></tr><tr><td><code>output?</code></td><td><code>number</code></td><td>a compressor: the level coming out, in dB (the reduction and the makeup applied)</td></tr></table> |

## Notes

- The source is the parameters as authored; a committed change writes the new ones back into it (compact JSON), the authored text comes back when the parameters do.
- An ADSR's sustain is drawn a quarter as long as its other stages; its playback dot moves through it and waits at its end while the gate stays open. A gate closed before the sustain releases from the level reached - the dot shows the real level, off the drawn curve. A gate opened again starts the attack from the level it is at.
- A compressor's dot is the level in and out after the attack and release: above the curve while it attacks, settling onto it. `input(level, time)` takes levels with their times (levels that are not live); `connect()` measures them.
- `connect()` builds the Web Audio nodes and keeps them on the curve (filters rebuilt when a band's type, slope or on changes). The browser's compressor stops its ratio at 20, its knee at 40 dB and its release at 1 s, and its knee curve is its own.
- Drive other components from the events: `envelope-value` every frame of a playing ADSR (a Knob's ring through `df$.shadcn.knob.modulate()`, a filter through `df$.shadcn.envelope.modulate()`).
- Without Web Audio (no `OfflineAudioContext`) a filter is drawn flat.
