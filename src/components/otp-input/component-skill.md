---
name: OTP Input
type: MOL
why: One real input under a row of slots — paste, one-time-code autofill, selection and form submission stay native, and a screen reader hears one field rather than six.
when: Short codes typed once — SMS verification, email confirmation, a PIN. Use input for anything longer or free-form.
where: dist/components/otp-input/otp-input.css + dist/components/otp-input/otp-input.js
supportedStates: default, filled, invalid
---

# Pattern: OTP Input

## Native basis
A single `<input>` covering a row of slot elements. The input is the control —
it keeps paste, SMS autofill, selection, IME and form submission — and the
slots are a mirror of its value, marked `aria-hidden` so the field is announced
once rather than once per digit.

This is the reason not to use one input per digit: with six inputs, autofill
puts the whole code in the first box, paste needs hand-written distribution
logic, and assistive technology announces six unlabelled fields.

---

## Native Web APIs
- [`autocomplete="one-time-code"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) — iOS and Android offer the code straight from the SMS
- [`inputmode`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode) — numeric keypad on mobile without changing the input type
- [`maxlength`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/maxlength) — the browser stops at the code length
- [`HTMLInputElement.setSelectionRange()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange) — keeps the caret where typing left it when a character is rejected
- [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) — the field submits one value under one name
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) — `otp-complete` fires when the last character lands
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) — the slots dim when the input inside is disabled
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) — focus ring derived from `--ring`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — stops the caret blink

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
| `data-pattern` | `.otp-input` | `digits` (default) or `alphanumeric` — anything else is rejected as it is typed or pasted |
| `data-group-size` | `.otp-input` | Draw a separator every N slots, e.g. `3` for 3-3 |
| `data-mask` | `.otp-input` | Show a dot instead of the character; the value is unchanged |
| `disabled` | the `<input>` | Native — the slots dim and nothing can be typed |

## Custom properties

| Property | Default | Purpose |
|----------|---------|---------|
| `--otp-input-slot-size` | `2.75rem` | Width and height of one slot |

---

## Events

| Event | When | Detail |
|-------|------|--------|
| `otp-complete` | The last character lands, however it arrived — typed, pasted or autofilled | `{ value }` |

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

The registry globals are `_defussShadcn.otpInputApi` and
`_defussShadcn.otpInputStates`.

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `for` / `id` | `<label class="label">` and the input | Always — the input is the control, so it takes the label |
| `aria-hidden="true"` | `.otp-input-slots` | Set by the component — the slots are a picture of the value, and would otherwise be announced as six stray characters |
| `aria-invalid="true"` | the `<input>` | While in the `invalid` state |
| `aria-describedby` | the `<input>` | Point it at your hint or error text |

---

## Notes
- **The input is the value.** Read and write `field.value`; the slots follow. A
  form submits one entry under the input's `name`.
- The field's own text and caret are transparent — the slots draw the
  characters and the active slot stands in for the caret. That is why the input
  covers the slots rather than sitting beside them: every click, drag and tap
  must land on the real control.
- Characters outside the pattern are dropped as they arrive, and the caret is
  restored to where typing left it rather than jumping to the end.
- Font size on the field stays at 1rem so iOS does not zoom the page on focus.
