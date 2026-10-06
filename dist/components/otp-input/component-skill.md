---
name: OTP Input
type: MOL
why: One real input under a row of slots, so paste, one-time-code autofill, selection and form submission stay native, and a screen reader hears one field rather than six.
when: Short codes typed once (SMS verification, email confirmation, a PIN). Use input for anything longer or free-form.
where: dist/components/otp-input/otp-input.css + dist/components/otp-input/otp-input.js
supportedStates: default, filled, invalid
---

# Pattern: OTP Input

## Native basis
A single `<input>` covering a row of slot elements. The input is the control:
it keeps paste, SMS autofill, selection, IME and form submission, and the
slots are a mirror of its value, marked `aria-hidden` so the field is announced
once rather than once per digit.

This is the reason not to use one input per digit: with six inputs, autofill
puts the whole code in the first box, paste needs hand-written distribution
logic, and assistive technology announces six unlabelled fields.

---

## Native Web APIs
- [`autocomplete="one-time-code"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - iOS and Android offer the code straight from the SMS
- [`inputmode`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode) - numeric keypad on mobile without changing the input type
- [`maxlength`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/maxlength) - the browser stops at the code length
- [`HTMLInputElement.setSelectionRange()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange) - keeps the caret where typing left it when a character is rejected
- [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) - the field submits one value under one name
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `otp-complete` fires when the last character lands
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the slots dim when the input inside is disabled
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - focus ring derived from `--ring`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - stops the caret blink

---

## Structure

The slots are generated; you author the wrapper and the input:

```html
<label class="label" for="code">Verification code</label>
<div class="otp-input">
  <input id="code" name="code" type="text">
</div>
```

`inputmode`, `autocomplete` and `maxlength` are set for you unless you set them
yourself.

### Grouped

```html
<div class="otp-input" data-group-size="3">
  <input id="code" name="code" type="text">
</div>
```

### Four characters, letters allowed

```html
<div class="otp-input" data-length="4" data-pattern="alphanumeric">
  <input id="code" name="code" type="text">
</div>
```

### Masked, like a PIN

```html
<div class="otp-input" data-length="4" data-mask>
  <input id="pin" name="pin" type="text">
</div>
```

### Disabled

```html
<div class="otp-input">
  <input id="code" name="code" type="text" disabled>
</div>
```

---

## Variants

| Attribute | Element | Behaviour |
|-----------|---------|-----------|
| `data-length` | `.otp-input` | Number of slots (default 6) |
| `data-pattern` | `.otp-input` | `digits` (default) or `alphanumeric`; anything else is rejected as it is typed or pasted |
| `data-group-size` | `.otp-input` | Draw a separator every N slots, e.g. `3` for 3-3 |
| `data-mask` | `.otp-input` | Show a dot instead of the character; the value is unchanged |
| `disabled` | the `<input>` | Native: the slots dim and nothing can be typed |

## Custom properties

| Property | Default | Purpose |
|----------|---------|---------|
| `--otp-input-slot-size` | `2.75rem` | Width and height of one slot |

---

## Events

| Event | When | Detail |
|-------|------|--------|
| `otp-complete` | The last character lands, however it arrived (typed, pasted or autofilled) | `{ value }` |

---

## States

| State | Meaning |
|-------|---------|
| `default` | Empty or partly filled |
| `filled` | A complete code is present. Entered automatically the moment the field fills |
| `invalid` | The code was rejected; sets `aria-invalid` on the input |

```js
const otp = document.querySelector('#code').closest('.otp-input');

otp.api.setState('invalid');                       // the server said no
otp.api.setState('default', { value: '' });        // clear and start again
otp.api.setState('filled', { value: '246810' });
otp.api.getState();                                 // → { name, config }
```

The registry globals are `df$.shadcn.otpInputApi` and
`df$.shadcn.otpInputStates`; each state's config is listed under API below.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type OtpInputState = 'default' | 'filled' | 'invalid'</code> - `setState(name, config)` takes the config of the state it names (`OtpInputStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Empty or partly filled. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>string</code></td><td>the code to put in the field - cleaned to the pattern (digits / alphanumeric) and the length; '' clears it</td></tr></table> |
| `filled` | A complete code is present - entered automatically the moment the field fills. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>string</code></td><td>the code to put in the field (cleaned like in default)</td></tr></table> |
| `invalid` | The code was rejected: aria-invalid on the input, the slots marked. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>string</code></td><td>the code to put in the field (cleaned like in default)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends OtpInputState&gt;(name: S, config?: OtpInputStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>OtpInputStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: OtpInputState; config: OtpInputStateConfigs[OtpInputState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: OtpInputState; config: OtpInputStateConfigs[OtpInputState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: OtpInputState; config: OtpInputStateConfigs[OtpInputState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: OtpInputState; config: OtpInputStateConfigs[OtpInputState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: OtpInputState; config: OtpInputStateConfigs[OtpInputState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.otpInputApi.setState&lt;S extends OtpInputState&gt;(el: HTMLElement, name: S, config?: OtpInputStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>OtpInputStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.otpInputApi.getState(el: HTMLElement): { name: OtpInputState; config: OtpInputStateConfigs[OtpInputState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: OtpInputState; config: OtpInputStateConfigs[OtpInputState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.otpInputApi.render(state: { name: OtpInputState; config: OtpInputStateConfigs[OtpInputState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: OtpInputState; config: OtpInputStateConfigs[OtpInputState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.otpInputApi.store(el: HTMLElement): Store&lt;{ name: OtpInputState; config: OtpInputStateConfigs[OtpInputState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: OtpInputState; config: OtpInputStateConfigs[OtpInputState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.otpInputApi.commit&lt;S extends OtpInputState&gt;(el: HTMLElement, name: S, config?: OtpInputStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>OtpInputStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.otpInputStates: OtpInputState[]</code> | The declared states, 'default' first: <code>default</code>, <code>filled</code>, <code>invalid</code>. |

### Events

| Event | Description |
|---|---|
| `otp-complete` | Fires when every cell is filled - the whole code. <code>detail</code>: <code>OtpCompleteDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>string</code></td><td>the whole code, one character per slot</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `OtpCompleteDetail` | What otp-complete carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>string</code></td><td>the whole code, one character per slot</td></tr></table> |

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `for` / `id` | `<label class="label">` and the input | Always: the input is the control, so it takes the label |
| `aria-hidden="true"` | `.otp-input-slots` | Set by the component: the slots are a picture of the value, and would otherwise be announced as six stray characters |
| `aria-invalid="true"` | the `<input>` | While in the `invalid` state |
| `aria-describedby` | the `<input>` | Point it at your hint or error text |

---

## Notes
- **The input is the value.** Read and write `field.value`; the slots follow. A
  form submits one entry under the input's `name`.
- The field's own text and caret are transparent; the slots draw the
  characters and the active slot stands in for the caret. That is why the input
  covers the slots rather than sitting beside them: every click, drag and tap
  must land on the real control.
- Characters outside the pattern are dropped as they arrive, and the caret is
  restored to where typing left it rather than jumping to the end.
- Font size on the field stays at 1rem so iOS does not zoom the page on focus.
