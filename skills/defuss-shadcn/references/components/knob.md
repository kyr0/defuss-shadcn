---
name: Knob
type: MOL
section: multimedia
why: A native range input under a drawn dial - the form value, the keys and the accessible slider stay the browser's, while the knob turns on any scale, shows the sources that modulate it as rings, lets a drag far from it turn it finer, and takes a typed value in a Number Input.
when: The parameters of an audio plugin, a synthesizer or a mixer - frequency, gain, time, depth, pan - where many controls share little room and a value moves on a curve. A plain value on a line is the Slider; a number typed in is the Number Input.
where: dist/components/knob/knob.css + dist/components/knob/knob.js
supportedStates: default, adjusting, disabled
---

# Pattern: Knob

## Native basis

`<input type="range">` inside a `<div class="knob">`. The input keeps the value in the knob's own units (`min`,
`max`, `step`, `value`, `name`): a form submits it, a reset restores it, `<label for>` names it and assistive
technology reads it as a slider - with the value's text as `aria-valuetext`. The runtime draws the dial over it (the
input stays focusable and takes the keys) and maps the turn onto the value through the knob's scale. Without scripting
the input shows as the plain range.

## Native Web APIs
- [`<input type="range">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range) - the value, its range and step, form submission and reset
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - the value's text as the knob writes it
- [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) + [`setPointerCapture()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - one drag for mouse, pen and touch, held by the knob wherever the pointer goes
- [`conic-gradient()`](https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/conic-gradient) + [`mask`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask) - every arc and ring, painted from custom properties
- [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - the readout in the page's locale
- [`@media (scripting)`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/scripting) - the plain range without scripting
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - focus and disabled styles from the input
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors), [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast), [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [WAI-ARIA Slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) - the keys

## Structure

```html
<div class="knob" data-scale="exponential" data-format="si" data-unit="Hz" data-default="1000">
  <input class="knob-input" type="range" id="cutoff" name="cutoff" min="20" max="20000" step="any" value="1000" />
  <label class="knob-label" for="cutoff">Cutoff</label>
  <output class="knob-value" for="cutoff">1.00 kHz</output>
  <script type="application/json" class="knob-rings">
    [
      { "id": "lfo", "label": "LFO 1", "amount": 0.15, "bipolar": true, "color": "chart-2" },
      { "id": "env", "label": "Envelope 2", "amount": 0.3, "color": "chart-4" }
    ]
  </script>
</div>
```

| Part | Does |
|---|---|
| `.knob` | The knob: its scale, format, unit, origin, default, size, colour and drag settings as `data-*` |
| `input.knob-input` | The value in the knob's units: `min` / `max` (the ends of the turn), `step` (`any`, or a step the value snaps to - set to `any` when missing), `value`, `name`, `disabled` |
| `.knob-label` | Its name - a `<label for>` the input, or `aria-label` on the input |
| `output.knob-value` | The value as the knob writes it - the runtime keeps it current |
| `script.knob-rings` | The sources that move the value: a JSON array of rings |
| `.knob-dial` | Drawn by the runtime before the input: the rings, the marks of the steps, the value ring, the face and its pointer |
| `.knob-editor` | A [Number Input](number-input.md) (`data-size="xs"`) the runtime lays over the readout while the value is typed in - load `number-input.css` with the knob |

### Typing the value in

A double click on the readout - or Enter on the knob - opens the editor over it:

```html
<div class="number-input knob-editor" data-size="xs">
  <input type="number" id="knob-rings-1-edit" min="20" max="20000" step="any" value="1000" aria-label="Cutoff" enterkeyhint="done" />
  <label class="number-input-unit" for="knob-rings-1-edit">Hz</label>
</div>
```

It carries the knob's range and step and its unit - a percent knob is typed in percent (`25` for 0.25), a time knob in
seconds. Enter or leaving the field sets the value, settled on the range and step; Escape keeps the old one. The
editor lies over the knob: nothing moves while it is open.

### Scales - `data-scale`

How a position on the turn (0 to 1) maps to a value from `min` to `max`:

| Scale | Value at a position `p` | For |
|---|---|---|
| `linear` (default) | `min + p (max - min)` | mix, depth, pan |
| `exponential` | `min (max / min)^p` - every ratio turns as far | frequency, time, Q - `min` and `max` of one sign |
| `logarithmic` | the mirror of exponential: fast at the start, fine at the end | `min` and `max` of one sign |
| `power` | `min + (max - min) p^k`, `k` = `data-exponent` (default 2: fine at the start; 0.5: fine at the end) | attack, release, curves |
| `decibel` | a gain on an audio taper: the amplitude grows as `p^k` (`data-exponent`, default 3); the turn runs from `min` dB to `max` dB | level, volume, sends |
| any name | a scale the page adds with `df$.shadcn.knob.scale(name, { value, position })` | |

A scale that fails (an exponential range that crosses 0) is linear. The value is settled on the input's `step`
afterwards - a stepped knob (semitones, voices) snaps whatever its scale.

### Formats - `data-format`

| Format | Writes |
|---|---|
| `number` (default) | the value with `data-decimals` fraction digits (default: those of the input's step; with step="any" 0 for a range of 100 or more, 1 for 10 or more, else 2) and `data-unit` |
| `si` | a metric prefix and three significant digits - `440 Hz`, `1.20 kHz`, `500 mHz` |
| `percent` | a fraction as a percentage - 0.5 is `50%` |
| `time` | seconds, below one in milliseconds - `250 ms`, `1.20 s` |
| `signed` | always with its sign - `+12 st`, `-6.0 dB` |
| any name | a format the page adds with `df$.shadcn.knob.format(name, fn)` |

Numbers are written in the page's locale (the nearest `lang`).

### Rings - `script.knob-rings`

| Field | Meaning |
|---|---|
| `id` | The source, unique on the knob - `df$.shadcn.knob.modulate()` names it |
| `label` | Its name ("LFO 1") - the ring's title, and the input's description ("Modulated by LFO 1 (± 15 %)") |
| `amount` | How far it moves the knob, as a share of the turn, -1 to 1 |
| `bipolar` | It swings both ways around the value (an LFO); else it moves away from it (an envelope, a macro) |
| `color` | `chart-1` ... `chart-5`, `primary`, `destructive` or a CSS colour - default the chart colour of its number |

The value ring is the innermost: its arc runs from the origin to the value. The first ring sits next to it, the
others around it. A ring shows its range - from the value to value + amount, or both ways - and, while its source
runs (`modulate()`), the arc to where it moves the value now; the value ring then marks the effective value, the
value moved by every running source.

## Variants

| Attribute | Does |
|---|---|
| `data-variant="flat"` | No face - the rings and the pointer only |
| `data-color="chart-1"` ... `"chart-5"` / `"destructive"` | The value arc's colour (default `--primary`) |
| `data-origin="0"` | The value arc starts at this value - a bipolar knob (pan, detune) fills from its centre |
| `data-ticks` | A mark at every step of a stepped knob (`step="1"`), between the value ring and the face - none for more than 49 steps |
| `data-ticks="5"` | That many marks spread over the turn (the quarters; on an exponential delay from 1 ms to 1 s, `"4"` marks the decades) |
| `data-default="1000"` | The value a reset goes back to (double click, Ctrl / Cmd + click, Delete) - default the input's authored value |
| `data-radius="96"` | The precision radius in px (default the dial's width): within it a drag turns at full speed, beyond it the speed is the radius over the distance |
| `data-travel="200"` | The horizontal drag in px that turns the knob from end to end at full speed (default 200) |

## Sizes

| Size | Knob |
|---|---|
| `data-size="sm"` | 2.25rem |
| default | 3rem |
| `data-size="lg"` | 4.5rem |

`--knob-size`, `--knob-thickness`, `--knob-ring-thickness` and `--knob-ring-gap` set them freely. A knob grows by a ring slot per ring; `--knob-reserve: 1` (on the knob or a row of knobs) keeps that many slots free on every knob, so knobs with rings and without line up.

## ARIA

| Element | Role / attribute | Notes |
|---|---|---|
| `input.knob-input` | `slider` (native) | Named by its `<label for>` or `aria-label`; `aria-valuenow` is the value |
| `input.knob-input` | `aria-valuetext` | The value as the readout writes it ("1.00 kHz") - kept by the runtime |
| `input.knob-input` | `aria-describedby` | The runtime adds the rings' description ("Modulated by LFO 1 (± 15 %), Envelope 2 (+ 30 %)") |
| `.knob-dial` | `aria-hidden="true"` | Drawn by the runtime - the input is what assistive technology reads |
| keys | Right / Up, Left / Down | One step: the input's `step`, else 1 % of the turn (Shift: 0.1 %) |
| keys | Page Up / Page Down, Home / End | 10 % of the turn; the ends |
| keys | Delete / Backspace | Back to the default |
| keys | Escape | During a drag: back to where it started |
| keys | Enter | Type the value in (the editor's field is named like the knob) |

## States

| State | Meaning |
|---|---|
| `default` | At rest: the pointer and the arc from the origin show the value, the readout writes it. |
| `adjusting` | Being turned: a drag enters it and returns to `default` when it ends. The precision radius (dashed) and the circle through the pointer show around the dial. |
| `disabled` | The input is disabled: no drag, no keys, and a form leaves it out. An input authored `disabled` starts here. |

Every state takes `{ value }`, merged into the current config: the value in the knob's units, settled on its range and
step. `getState()` reports the live value - also one a drag or a key set.

```js
const knob = document.querySelector('#cutoff-knob');
knob.api.setState('default', { value: 440 });
knob.addEventListener('knob-change', (e) => console.log(e.detail.value, e.detail.text, e.detail.committed));
df$.shadcn.knob.modulate(knob, { lfo: Math.sin(t), env: 0.8 });
```

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type KnobState = 'default' | 'adjusting' | 'disabled'</code> - `setState(name, config)` takes the config of the state it names (`KnobStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | At rest: the pointer and the arc from the origin show the value, the readout writes it. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number</code></td><td>the value in the knob's units, between the input's min and max and on its step; getState() reports the live one</td></tr></table> |
| `adjusting` | Being turned: the precision radius and the pointer's reach show around the dial - a drag enters it and returns to default when it ends. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number</code></td><td>the value in the knob's units, between the input's min and max and on its step; getState() reports the live one</td></tr></table> |
| `disabled` | Disabled: the input is disabled - no drag, no keys, and a form leaves it out. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number</code></td><td>the value in the knob's units, between the input's min and max and on its step; getState() reports the live one</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends KnobState&gt;(name: S, config?: KnobStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>KnobStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: KnobState; config: KnobStateConfigs[KnobState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: KnobState; config: KnobStateConfigs[KnobState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: KnobState; config: KnobStateConfigs[KnobState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: KnobState; config: KnobStateConfigs[KnobState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: KnobState; config: KnobStateConfigs[KnobState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.knobApi.setState&lt;S extends KnobState&gt;(el: HTMLElement, name: S, config?: KnobStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>KnobStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.knobApi.getState(el: HTMLElement): { name: KnobState; config: KnobStateConfigs[KnobState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: KnobState; config: KnobStateConfigs[KnobState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.knobApi.render(state: { name: KnobState; config: KnobStateConfigs[KnobState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: KnobState; config: KnobStateConfigs[KnobState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.knobApi.store(el: HTMLElement): Store&lt;{ name: KnobState; config: KnobStateConfigs[KnobState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: KnobState; config: KnobStateConfigs[KnobState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.knobApi.commit&lt;S extends KnobState&gt;(el: HTMLElement, name: S, config?: KnobStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>KnobStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.knobStates: KnobState[]</code> | The declared states, 'default' first: <code>default</code>, <code>adjusting</code>, <code>disabled</code>. |

### `df$.shadcn.knob`

| Member | Description |
|---|---|
| <code>value(target: string \| HTMLElement, value?: number): number</code> | The knob's value, or set it (setState with { value }: settled on the range and step, the change told). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .knob element, its input, or a selector of either</td></tr><tr><td><code>value?</code></td><td><code>number</code></td><td>the value to set; leave it out to read</td></tr></table> <b>Returns</b> <code>number</code> - the value now; NaN for an unknown element |
| <code>position(target: string \| HTMLElement): number</code> | Where the value stands on the knob's turn. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .knob element, its input, or a selector of either</td></tr></table> <b>Returns</b> <code>number</code> - the position, 0 (the start of the turn) to 1 (its end); NaN for an unknown element |
| <code>reset(target: string \| HTMLElement): number</code> | Back to the default value (data-default, else the input's authored value) - what a double click does. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .knob element, its input, or a selector of either</td></tr></table> <b>Returns</b> <code>number</code> - the value now; NaN for an unknown element |
| <code>rings(target: string \| HTMLElement, list?: KnobRing[]): KnobRing[]</code> | The rings around the knob, or replace them - the live values of the sources that stay are kept. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .knob element, its input, or a selector of either</td></tr><tr><td><code>list?</code></td><td><code>KnobRing[]</code></td><td>the new rings; leave it out to read</td></tr></table> <b>Returns</b> <code>KnobRing[]</code> - a copy of the rings now |
| <code>modulate(target: string \| HTMLElement, values: Record&lt;string, number \| null&gt; \| null): number</code> | The live outputs of the sources - each ring shows how far its source moves the knob now, the value ring the effective value. A unipolar source runs from 0 to 1, a bipolar one from -1 to 1. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .knob element, its input, or a selector of either</td></tr><tr><td><code>values</code></td><td><code>Record&lt;string, number \| null&gt; \| null</code></td><td>the outputs by ring id (null for a ring: no live value); null: none at all</td></tr></table> <b>Returns</b> <code>number</code> - the effective value - the knob's value moved by every live source, inside its range |
| <code>scale(name: string, scale: KnobScale): void</code> | Add a scale knobs name in data-scale - the knobs on it are drawn again. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the scale's name</td></tr><tr><td><code>scale</code></td><td><code>KnobScale</code></td><td>its value() and position(), each the inverse of the other</td></tr></table> |
| <code>format(name: string, format: (value: number, context: KnobFormatContext) =&gt; string): void</code> | Add a format knobs name in data-format - the knobs in it write their values again. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the format's name</td></tr><tr><td><code>format</code></td><td><code>(value: number, context: KnobFormatContext) =&gt; string</code></td><td>the value's text, from the value and the knob's unit, decimals, locale and range</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `knob-change` | Fires when the value changes - while a drag goes on (committed: false) and when a change is done. <code>detail</code>: <code>KnobChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>number</code></td><td>the value</td></tr><tr><td><code>position</code></td><td><code>number</code></td><td>its position on the turn, 0 to 1</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the value as the readout writes it ("1.20 kHz")</td></tr><tr><td><code>committed</code></td><td><code>boolean</code></td><td>true when the change is done (a drag ended, a key, a reset, setState), false while a drag goes on</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `KnobChangeDetail` | What knob-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>number</code></td><td>the value</td></tr><tr><td><code>position</code></td><td><code>number</code></td><td>its position on the turn, 0 to 1</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the value as the readout writes it ("1.20 kHz")</td></tr><tr><td><code>committed</code></td><td><code>boolean</code></td><td>true when the change is done (a drag ended, a key, a reset, setState), false while a drag goes on</td></tr></table> |
| `KnobConfig` | The config every state takes. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number</code></td><td>the value in the knob's units, between the input's min and max and on its step; getState() reports the live one</td></tr></table> |
| `KnobFormatContext` | What a format gets besides the value. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>unit</code></td><td><code>string</code></td><td>the unit (data-unit), "" without one</td></tr><tr><td><code>decimals</code></td><td><code>number \| null</code></td><td>the fraction digits asked for (data-decimals), null for the format's own</td></tr><tr><td><code>locale</code></td><td><code>string</code></td><td>the locale numbers are written in</td></tr><tr><td><code>min</code></td><td><code>number</code></td><td>the value at the start of the turn</td></tr><tr><td><code>max</code></td><td><code>number</code></td><td>the value at the end of the turn</td></tr><tr><td><code>step</code></td><td><code>number \| null</code></td><td>the input's step, null for any</td></tr></table> |
| `KnobRange` | What a scale maps between. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>min</code></td><td><code>number</code></td><td>the value at the start of the turn - the input's min</td></tr><tr><td><code>max</code></td><td><code>number</code></td><td>the value at the end of the turn - the input's max</td></tr><tr><td><code>exponent</code></td><td><code>number</code></td><td>the curve of the power and decibel scales (data-exponent)</td></tr></table> |
| `KnobRing` | A ring around the knob: an automation or modulation source that moves its value. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>unique on the knob - modulate() names the source by it</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>the source's name ("LFO 1") - the ring's title and its description for assistive technology</td></tr><tr><td><code>amount</code></td><td><code>number</code></td><td>how far the source moves the knob, as a share of its turn: -1 to 1 (0.25 = a quarter of the turn up)</td></tr><tr><td><code>color?</code></td><td><code>string</code></td><td>a theme colour (chart-1 ... chart-5, primary, destructive) or a CSS colour; default the chart colour of its number</td></tr><tr><td><code>bipolar?</code></td><td><code>boolean</code></td><td>the source swings both ways around the value (an LFO), not away from it (an envelope)</td></tr></table> |
| `KnobScale` | A scale: how a position on the knob's turn (0 to 1) maps to a value, and back. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>(position: number, range: KnobRange) =&gt; number</code></td><td>the value at a position of the turn</td></tr><tr><td><code>position</code></td><td><code>(value: number, range: KnobRange) =&gt; number</code></td><td>the position of a value - the inverse of value()</td></tr></table> |

## Notes

- The drag: press on the dial and move left or right - right turns it up. Within the radius the knob follows the
  pointer at full speed; farther away (above, below or to the side) the same move turns it less, the speed being the
  radius over the distance (down to 2 %), so a far move sets a value finely. Shift slows any drag ten times. Escape
  puts it back where it started.
- A drag changes the value as it goes: the input's `input` event and `knob-change` (`committed: false`) follow it,
  `change` and `knob-change` (`committed: true`) come once when it ends. A key, a reset and `setState` commit at once.
- A value written from outside (`input.value = 5` and an `input` event) is shown and not sent back; a form reset
  restores the authored value.
- A source's live output runs from 0 to 1 (unipolar) or -1 to 1 (bipolar): it moves the value by amount × output,
  as a share of the turn. Live outputs are not state: they move on by themselves.
- The value's text is the readout, the input's `aria-valuetext` and the event's `text`; another `data-format`,
  `data-unit`, `data-scale` or range redraws the same value.
- The dial is geometry, not text: it turns clockwise in any writing direction.
- The knob never moves: its width is the dial's and the label's - the value's text is contained and spills out on
  both sides when it grows ("0.0 dB" to "-60.0 dB"), and the editor lies over it.
- A stepped knob (`step="1"`, `step="0.05"`) moves step by step whatever drives it: a drag snaps to the steps as
  it goes, an arrow moves one step, a typed value settles on the nearest.
