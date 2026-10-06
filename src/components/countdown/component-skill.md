---
name: Countdown
type: ATM
why: Numbers that roll to a new value with CSS alone - set --value, the digits turn like an odometer (mod() / round() pick each digit column); the optional script makes it a live, accessible timer.
when: Launch / sale / event countdowns, timers, clocks, animated counters (0-999 per value). For a progress fraction use progress; for a static figure use statistic.
where: dist/components/countdown/countdown.css + dist/components/countdown/countdown.js
supportedStates: default, running, paused, finished
---

# Pattern: Countdown

## Native basis

A `<span class="countdown">` holding one `<span style="--value:N">N</span>`
per number. CSS draws the digits as two rolling columns (`::before` = tens and
hundreds, `::after` = ones) and moves them to `--value`; the span's own text
is the accessible fallback. `countdown.js` is only needed for a ticking timer.

## Native Web APIs

- [CSS `mod()`](https://developer.mozilla.org/en-US/docs/Web/CSS/mod) / [`round()`](https://developer.mozilla.org/en-US/docs/Web/CSS/round) - pick the digit columns from `--value`
- [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) - a typed length carries the digit size into the value spans
- [`content` alt text](https://developer.mozilla.org/en-US/docs/Web/CSS/content#alternative_text) - `content: "…" / ""` keeps the digit lists silent for screen readers
- [`overflow: clip`](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow) - a one-digit window on one axis only
- [`font-variant-numeric: tabular-nums`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric) - equal-width digits, no jitter
- [`role="timer"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/timer_role) - a live timer that does not interrupt
- [`Intl.DurationFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DurationFormat) - the timer's spoken label ("2 days, 4 hours, ...")
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `countdown:finished`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - values change without the roll

---

## Structure

### A value (CSS only)

```html
<span class="countdown" data-size="2xl">
  <span style="--value:59" aria-live="polite">59</span>
</span>
```

Change it by setting `--value` **and** the text (or `api.setState('default', { value })`).
Values run 0-999; leading zeros are dropped unless `data-digits`.

### A clock

```html
<span class="countdown" data-size="xl" data-digits="2">
  <span style="--value:10">10</span>:<span style="--value:24">24</span>:<span style="--value:59">59</span>
</span>
```

Anything between the value spans (a colon, a unit letter) is plain text.

### A timer (JS)

```html
<div class="countdown-group" data-until="2026-12-31T23:59:59Z">
  <div class="countdown-unit" data-variant="muted">
    <span class="countdown" data-size="xl"><span data-unit="days" style="--value:0">0</span></span>
    <span class="countdown-label">days</span>
  </div>
  <div class="countdown-unit" data-variant="muted">
    <span class="countdown" data-size="xl" data-digits="2"><span data-unit="hours" style="--value:0">0</span></span>
    <span class="countdown-label">hours</span>
  </div>
  <!-- minutes, seconds -->
</div>
```

- `data-until` (an ISO date) or `data-duration` (seconds) on a
  `.countdown-group` - or on a single `.countdown` - makes it a timer; the
  script fills every `[data-unit]` (`days` / `hours` / `minutes` / `seconds`)
  once a second. The largest unit present absorbs the rest (no `days` span →
  hours go past 24).
- `data-paused` - authored paused (start with `setState('running')`).
- It gets `role="timer"` and a spoken `aria-label` from `Intl.DurationFormat`
  (unless you set `aria-label` yourself).
- At zero it fires `countdown:finished` (bubbles) and reads
  `data-state-name="finished"` - style it from there.

## Digits (`data-digits`)

| Value | 7 renders as |
| --- | --- |
| *(none)* | `7` - leading zeros roll away |
| `2` | `07` |
| `3` | `007` |

## Sizes (`data-size`)

`sm` 0.875rem · `md` 1rem · `lg` 1.5rem · `xl` 2.25rem · `2xl` 3.75rem · `3xl` 6rem - or set a `font-size` yourself (the digits are `1em`).

## Speed (`data-speed`)

`fast` (0.4s) · `slow` (1.6s) - the roll's duration (default 1s).

## Composition

| Class | Role |
| --- | --- |
| `.countdown-group` | A wrapping row of units (a timer root when it has `data-until` / `data-duration`) |
| `.countdown-unit` | A value over a label |
| `.countdown-label` | The small uppercase label |

`.countdown-unit[data-variant]` boxes it: `muted`, `primary`, `outline`.

---

## ARIA

| Element | Attribute |
| --- | --- |
| timer root | `role="timer"` (set by the script) + `aria-label` (spoken remaining time) |
| a standalone changing value | `aria-live="polite"` if every change should be announced |
| value spans | their text IS the value - keep it in sync with `--value` |

## States

| State | Meaning |
| --- | --- |
| `default` | As authored: a timer restarts from `data-until` / `data-duration`; a plain countdown takes `config.value` / `config.values` (by unit) or returns to its authored values |
| `running` | Ticking - resumes, or starts toward `config.until` / `config.duration` |
| `paused` | Frozen at the remaining time |
| `finished` | At zero; `countdown:finished` fired |

```js
document.querySelector('#launch').api.setState('running', { duration: 90 });
document.querySelector('#launch').api.getState(); // → { name: 'running', config: { remaining: 90, values: {…} } }
```

The registry global is `df$.shadcn.countdownApi` / `df$.shadcn.countdownStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type CountdownState = 'default' | 'running' | 'paused' | 'finished'</code> - `setState(name, config)` takes the config of the state it names (`CountdownStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | As authored: a timer restarts from data-until / data-duration; a plain countdown shows the given values, else its authored ones. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>number</code></td><td>a plain countdown: the first unit's value (0-999)</td></tr><tr><td><code>values?</code></td><td><code>Record&lt;string, number&gt;</code></td><td>a plain countdown: values by unit name (data-unit: days, hours, minutes, seconds)</td></tr><tr><td><code>remaining?</code></td><td><code>number</code></td><td>reported by getState() on a timer: the seconds left</td></tr></table> |
| `running` | Ticking - resumes, or starts toward a new deadline. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>until?</code></td><td><code>string</code></td><td>the deadline, a date Date.parse reads</td></tr><tr><td><code>duration?</code></td><td><code>number</code></td><td>the deadline as seconds from now (used when until is not given)</td></tr><tr><td><code>values?</code></td><td><code>Record&lt;string, number&gt;</code></td><td>reported by getState(): the values shown, by unit</td></tr><tr><td><code>remaining?</code></td><td><code>number</code></td><td>reported by getState(): the seconds left</td></tr></table> |
| `paused` | Frozen at the remaining time. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>values?</code></td><td><code>Record&lt;string, number&gt;</code></td><td>reported by getState(): the values shown, by unit</td></tr><tr><td><code>remaining?</code></td><td><code>number</code></td><td>reported by getState(): the seconds left</td></tr></table> |
| `finished` | At zero - countdown:finished fired. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>values?</code></td><td><code>Record&lt;string, number&gt;</code></td><td>reported by getState(): the values shown, by unit (all 0)</td></tr><tr><td><code>remaining?</code></td><td><code>number</code></td><td>reported by getState(): 0</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends CountdownState&gt;(name: S, config?: CountdownStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>CountdownStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: CountdownState; config: CountdownStateConfigs[CountdownState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: CountdownState; config: CountdownStateConfigs[CountdownState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: CountdownState; config: CountdownStateConfigs[CountdownState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: CountdownState; config: CountdownStateConfigs[CountdownState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: CountdownState; config: CountdownStateConfigs[CountdownState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.countdownApi.setState&lt;S extends CountdownState&gt;(el: HTMLElement, name: S, config?: CountdownStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>CountdownStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.countdownApi.getState(el: HTMLElement): { name: CountdownState; config: CountdownStateConfigs[CountdownState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: CountdownState; config: CountdownStateConfigs[CountdownState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.countdownApi.render(state: { name: CountdownState; config: CountdownStateConfigs[CountdownState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: CountdownState; config: CountdownStateConfigs[CountdownState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.countdownApi.store(el: HTMLElement): Store&lt;{ name: CountdownState; config: CountdownStateConfigs[CountdownState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: CountdownState; config: CountdownStateConfigs[CountdownState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.countdownApi.commit&lt;S extends CountdownState&gt;(el: HTMLElement, name: S, config?: CountdownStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>CountdownStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.countdownStates: CountdownState[]</code> | The declared states, 'default' first: <code>default</code>, <code>running</code>, <code>paused</code>, <code>finished</code>. |

### Events

| Event | Description |
|---|---|
| `countdown:finished` | Fires once when the countdown reaches zero. No <code>detail</code>. |

## Notes

- The ones digit and the higher digits roll separately, so 59 → 60 turns
  both columns - an odometer, not a flip through every number.
- The timer ticks on the deadline's second boundary (no drifting interval)
  and recomputes from the clock each tick, so a background tab catches up.
- Without JavaScript a timer shows its authored values; a plain countdown
  needs no JavaScript at all.
