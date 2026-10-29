---
name: Tacho
type: ATM
section: multimedia
why: A native <meter> is the value - its range, its low / high / optimum regions, the accessible meter and the plain bar without scripting; the runtime draws a dial with a needle that moves like a real one.
when: A value around a middle or along a scale read at a glance - a tuner's cents, a pan position, a rev counter, a VU meter; a value someone sets is a knob, a progress a progress bar.
where: dist/components/tacho/tacho.css + dist/components/tacho/tacho.js
supportedStates: default, idle
---

# Tacho

## Native basis

`<meter class="tacho-meter">` in a `<div class="tacho">`: the value with its `min`, `max`, `low`, `high` and `optimum` - read as a meter by assistive technology (with an `aria-valuetext` the runtime writes), drawn as the browser's bar without scripting. The runtime draws the dial before it: an SVG arc with ticks and labels, the meter's three regions as coloured zones, and a needle on a pivot. The needle moves as a damped spring (it overshoots and settles, and bounces off its end stops) - JavaScript, because a CSS transition starts again from rest when its target moves on every frame (a tuner, a VU meter), and the spring keeps its speed.

## Native Web APIs

- [`<meter>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter) - the value, its range and its optimum, low and high regions
- [`aria-valuetext`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-valuetext) - the value in words (a tuner's note, frequency and cents)
- [`@media (scripting)`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/scripting) - the meter's own bar without scripting
- [`requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - the needle's spring, a listening tuner
- [`AnalyserNode`](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) - `listen()` reads what an audio node plays
- [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - labels and readouts in the page's locale
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - the needle jumps to its value
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast), [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

## Structure

```html
<div class="tacho" data-format="signed" data-ticks="25" data-minor="4">
  <span class="tacho-label">A</span>
  <meter class="tacho-meter" min="-50" max="50" low="-5" high="5" optimum="0" value="0" aria-label="Tuning in cents">0 cents</meter>
  <output class="tacho-value">440.0 Hz</output>
  <span class="tacho-caption">A4 · 0 ct</span>
</div>
```

`.tacho-label` (the big text above), `.tacho-value` (the readout under the pivot) and `.tacho-caption` are optional. Leave `.tacho-value` empty and it shows the value in its format; text written into it is its own (a tuner's frequency) until `setState` names `text: null`.

A pan position:

```html
<div class="tacho" id="pan" data-format="pan" data-sweep="90" data-ticks="25" data-minor="4">
  <span class="tacho-label">Pan</span>
  <meter class="tacho-meter" min="-50" max="50" value="-20" aria-label="Pan">L20</meter>
  <output class="tacho-value"></output>
</div>
<input class="slider" type="range" min="-50" max="50" value="-20" data-tacho-for="pan" aria-label="Pan" />
```

An `<input>` (a range, a number, a knob's input) inside an element with `data-tacho-for="<tacho id>"` - or carrying it - drives the value.

## Variants

| Attribute | Effect |
| --- | --- |
| `data-sweep="120"` | the arc's angle in degrees, 30 to 300 (default 120; 240 for a speedometer) |
| `data-ticks="10"` | the step between major ticks (default a round tenth of the range) |
| `data-minor="4"` | minor ticks between two majors (default 1) |
| `data-labels` | which majors carry a label: every one (default), `ends`, `none`, or a step (`25`) |
| `data-format` | `number` (default), `signed` (+12, -3.0), `pan` (L20, C, R15) or one added with `df$.shadcn.tacho.format()` |
| `data-unit`, `data-decimals` | the readout's unit and fraction digits (the scale's labels go without either: as many digits as they need) |
| `data-rest` | where the needle rests while idle (default the optimum of a zoned meter, else the middle; the minimum for a VU meter) |
| `data-needle` | `spring` (default: overshoots and settles), `smooth` (no overshoot), `instant` |
| `data-color` | the needle and pivot without zones: `chart-1` ... `chart-5`, `primary` (default the foreground) |
| meter `low` / `high` / `optimum` | the zones: the region holding the optimum is green, its neighbours amber, the one beyond red - the HTML meter's own regions; the needle and the label take the colour of the value's zone (`data-zone` on the root) |

## Sizes

| `data-size` | Width |
| --- | --- |
| `sm` | 10rem |
| (default) | 16rem |
| `lg` | 22rem |

`--tacho-size` sets any width; the label and the readout scale with it.

## ARIA

| Element | Attribute | Notes |
| --- | --- | --- |
| `meter.tacho-meter` | `aria-label` / `<label for>` | name it; it is the accessible element (`role="meter"`) |
| `meter.tacho-meter` | `aria-valuetext` | written by the runtime: the value in its format, or label, readout and caption ("A, 445.1 Hz, A4 · +12 ct") |
| `.tacho-dial` | `aria-hidden="true"` | the drawing |

## States

| State | Meaning |
| --- | --- |
| `default` | the needle on the value, the readouts written |
| `idle` | no signal (`data-idle`): the needle goes back to its rest, the readouts dim - a tuner that hears nothing |

Every state takes `{ value, label, text, caption }`, merged: `setState('default', { value: 12 })` moves the needle and keeps the readouts (a formatted readout follows the value).

```js
const tuner = document.querySelector('#tuner');
tuner.api.setState('default', { value: -12, label: 'E', text: '81.8 Hz', caption: 'E2 · -12 ct' });
tuner.api.getState(); // → { name: 'default', config: { value: -12, label: 'E', text: '81.8 Hz', caption: 'E2 · -12 ct' } }
```

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type TachoState = 'default' | 'idle'</code> - `setState(name, config)` takes the config of the state it names (`TachoStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Showing the value: the needle on it, the readouts written. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number</code></td><td>the meter's value, inside its min and max; getState() reports the live one</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>the big text above the dial (a tuner's note)</td></tr><tr><td><code>text?</code></td><td><code>string \| null</code></td><td>the readout under the pivot; null shows the value in its format (data-format)</td></tr><tr><td><code>caption?</code></td><td><code>string</code></td><td>the small text under the readout</td></tr></table> |
| `idle` | No signal (data-idle): the needle goes back to its rest (data-rest) and the readouts dim - a tuner that hears nothing. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number</code></td><td>the meter's value, inside its min and max; getState() reports the live one</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>the big text above the dial (a tuner's note)</td></tr><tr><td><code>text?</code></td><td><code>string \| null</code></td><td>the readout under the pivot; null shows the value in its format (data-format)</td></tr><tr><td><code>caption?</code></td><td><code>string</code></td><td>the small text under the readout</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends TachoState&gt;(name: S, config?: TachoStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TachoStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: TachoState; config: TachoStateConfigs[TachoState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: TachoState; config: TachoStateConfigs[TachoState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: TachoState; config: TachoStateConfigs[TachoState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: TachoState; config: TachoStateConfigs[TachoState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: TachoState; config: TachoStateConfigs[TachoState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.tachoApi.setState&lt;S extends TachoState&gt;(el: HTMLElement, name: S, config?: TachoStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TachoStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.tachoApi.getState(el: HTMLElement): { name: TachoState; config: TachoStateConfigs[TachoState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: TachoState; config: TachoStateConfigs[TachoState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.tachoApi.render(state: { name: TachoState; config: TachoStateConfigs[TachoState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: TachoState; config: TachoStateConfigs[TachoState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.tachoApi.store(el: HTMLElement): Store&lt;{ name: TachoState; config: TachoStateConfigs[TachoState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: TachoState; config: TachoStateConfigs[TachoState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.tachoApi.commit&lt;S extends TachoState&gt;(el: HTMLElement, name: S, config?: TachoStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>TachoStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.tachoStates: TachoState[]</code> | The declared states, 'default' first: <code>default</code>, <code>idle</code>. |

### `df$.shadcn.tacho`

| Member | Description |
|---|---|
| <code>value(target: string \| HTMLElement, value?: number): number</code> | The value, or set it (setState default with { value }: the needle swings to it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .tacho element, its meter, or a selector of either</td></tr><tr><td><code>value?</code></td><td><code>number</code></td><td>the value to show; leave it out to read</td></tr></table> <b>Returns</b> <code>number</code> - the value now; NaN for an unknown element |
| <code>tune(target: string \| HTMLElement, frequency: number \| null, options?: TachoTuneOptions): TachoPitch \| null</code> | Show a frequency on a tuner: the nearest note (or string) above in big letters, the frequency below the pivot, the cents on the needle (the meter's value - a tuner's meter runs from -50 to 50) and note, octave and cents in the caption. null: no signal - the idle state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .tacho element, its meter, or a selector of either</td></tr><tr><td><code>frequency</code></td><td><code>number \| null</code></td><td>the frequency in Hz, or null</td></tr><tr><td><code>options?</code></td><td><code>TachoTuneOptions</code></td><td>the pitch of A4, the strings to tune to, sharps or flats</td></tr></table> <b>Returns</b> <code>TachoPitch \| null</code> - the note and how far the frequency is from it; null for no signal or an unknown element |
| <code>listen(target: string \| HTMLElement, source: AudioNode \| null, options: TachoTuneOptions = {}): AnalyserNode \| null</code> | Tune to an audio node: every frame the pitch of what it plays is detected (detect()) and shown with tune(); a silence or a sound without a clear pitch for a few frames is the idle state. null stops. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .tacho element, its meter, or a selector of either</td></tr><tr><td><code>source</code></td><td><code>AudioNode \| null</code></td><td>the node to listen to (a microphone's MediaStreamAudioSourceNode, an oscillator, a gain), or null</td></tr><tr><td><code>options</code></td><td><code>TachoTuneOptions</code> = <code>{}</code></td><td>the pitch of A4, the strings to tune to, sharps or flats</td></tr></table> <b>Returns</b> <code>AnalyserNode \| null</code> - the AnalyserNode it reads, null when it stops or for an unknown element |
| <code>pitch(frequency: number, options?: TachoTuneOptions): TachoPitch</code> | The note nearest a frequency and how far it is - what tune() shows. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>frequency</code></td><td><code>number</code></td><td>the frequency in Hz</td></tr><tr><td><code>options?</code></td><td><code>TachoTuneOptions</code></td><td>the pitch of A4, the strings to tune to, sharps or flats</td></tr></table> <b>Returns</b> <code>TachoPitch</code> - the note, its octave, the cents off and the note's own frequency |
| <code>detect(samples: Float32Array, sampleRate: number): TachoDetection \| null</code> | The pitch of a signal (the McLeod pitch method, 50 Hz to 2 kHz) - what listen() runs on every frame. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>samples</code></td><td><code>Float32Array</code></td><td>the signal, at least a few periods of its lowest note (2048 samples at 48 kHz for 50 Hz)</td></tr><tr><td><code>sampleRate</code></td><td><code>number</code></td><td>its sample rate in Hz</td></tr></table> <b>Returns</b> <code>TachoDetection \| null</code> - the frequency and how clear the tone is; null for silence or no pitch |
| <code>settled(target: string \| HTMLElement): Promise&lt;void&gt;</code> | Wait for the needle to come to rest. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .tacho element, its meter, or a selector of either</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - a promise that resolves when the needle stands on its target |
| <code>format(name: string, format: (value: number, context: TachoFormatContext) =&gt; string): void</code> | Add a format tachos name in data-format - their scales and readouts are written again. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the format's name</td></tr><tr><td><code>format</code></td><td><code>(value: number, context: TachoFormatContext) =&gt; string</code></td><td>the value's text, from the value and the tacho's unit, decimals, locale, range and whether it is a label on the scale</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `tacho-change` | Fires when the value, a readout or the state changes - every value a tuner hears, every move of a bound input. <code>detail</code>: <code>TachoChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>number</code></td><td>the value</td></tr><tr><td><code>zone</code></td><td><code>string \| null</code></td><td>the zone it is in - optimum, suboptimum or even-less-good (the meter's own regions); null without low and high</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>the big text above the dial</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the readout under the pivot</td></tr><tr><td><code>caption</code></td><td><code>string</code></td><td>the small text under it</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `TachoChangeDetail` | What tacho-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>number</code></td><td>the value</td></tr><tr><td><code>zone</code></td><td><code>string \| null</code></td><td>the zone it is in - optimum, suboptimum or even-less-good (the meter's own regions); null without low and high</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>the big text above the dial</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the readout under the pivot</td></tr><tr><td><code>caption</code></td><td><code>string</code></td><td>the small text under it</td></tr></table> |
| `TachoConfig` | The config every state takes. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number</code></td><td>the meter's value, inside its min and max; getState() reports the live one</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>the big text above the dial (a tuner's note)</td></tr><tr><td><code>text?</code></td><td><code>string \| null</code></td><td>the readout under the pivot; null shows the value in its format (data-format)</td></tr><tr><td><code>caption?</code></td><td><code>string</code></td><td>the small text under the readout</td></tr></table> |
| `TachoDetection` | A pitch detect() found. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>frequency</code></td><td><code>number</code></td><td>the frequency in Hz</td></tr><tr><td><code>clarity</code></td><td><code>number</code></td><td>how periodic the signal is, 0 to 1 - above 0.9 it is a clear tone</td></tr></table> |
| `TachoFormatContext` | What a format gets besides the value. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>unit</code></td><td><code>string</code></td><td>the unit (data-unit), "" without one</td></tr><tr><td><code>decimals</code></td><td><code>number \| null</code></td><td>the fraction digits asked for (data-decimals - the readout's; a label on the scale gets null), null for the format's own</td></tr><tr><td><code>locale</code></td><td><code>string</code></td><td>the locale numbers are written in</td></tr><tr><td><code>min</code></td><td><code>number</code></td><td>the meter's min</td></tr><tr><td><code>max</code></td><td><code>number</code></td><td>the meter's max</td></tr><tr><td><code>tick</code></td><td><code>boolean</code></td><td>true for a label on the scale, false for the readout</td></tr></table> |
| `TachoPitch` | A note and how far a frequency is from it. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>note</code></td><td><code>string</code></td><td>the note's name: C, C♯ ... B (or with flats)</td></tr><tr><td><code>octave</code></td><td><code>number</code></td><td>its octave: A4 is 440 Hz</td></tr><tr><td><code>cents</code></td><td><code>number</code></td><td>how far the frequency is from it, in cents (100 to a semitone): below 0 flat, above 0 sharp</td></tr><tr><td><code>target</code></td><td><code>number</code></td><td>the note's own frequency in Hz</td></tr></table> |
| `TachoTuneOptions` | What tune() and listen() take. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>a4?</code></td><td><code>number</code></td><td>the pitch of A4 in Hz; default 440</td></tr><tr><td><code>strings?</code></td><td><code>string[]</code></td><td>tune to the nearest of these notes ("E2", "A2", "D3", "G3", "B3", "E4") instead of the nearest semitone</td></tr><tr><td><code>notation?</code></td><td><code>'sharp' \| 'flat'</code></td><td>write the black keys as sharps (default) or flats</td></tr></table> |

## Notes

- A tuner is a tacho from -50 to 50 cents with a narrow optimum (`low="-5" high="5" optimum="0"`): `df$.shadcn.tacho.tune(el, hz)` writes the nearest note above, the frequency below and the cents on the needle; `{ strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] }` tunes to the nearest string instead (its cents may pass the scale: the needle stops at its end, the caption has them). `listen(el, node)` does it for whatever an audio node plays - a microphone through `getUserMedia()` and `createMediaStreamSource()`, an instrument, an oscillator.
- The value is the meter's: it stays inside `min` and `max`. A value written into the meter from outside (`meter.value = 5`) is shown too.
- The needle's spring runs only while it moves; with `prefers-reduced-motion: reduce` it jumps. `df$.shadcn.tacho.settled(el)` waits for it.
- The zone colours are literal green and amber (the theme has no success or warning colour) and the theme's destructive colour; override `--tacho-optimum`, `--tacho-suboptimum` and `--tacho-worst`.
