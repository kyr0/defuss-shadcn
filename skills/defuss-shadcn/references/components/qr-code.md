---
name: QR Code
type: ATM
section: data-display
why: Native SVG renders a local QR matrix sharply at any size; the figure, accessible image label and output provide ordinary document semantics.
when: Share a URL or exact text with a scanning device. Keep an explicit link or text alternative beside the figure when the destination is actionable.
where: dist/components/qr-code/qr-code.css + dist/components/qr-code/qr-code.js
supportedStates: default, empty, error
---

# Pattern: QR Code

## Native basis

A `<figure>` owns a labelled image container, a generated `<svg>` and an
`<output>` for empty/error feedback. An optional `<figcaption>` remains
caller-authored. SVG rendering is native; the QR Model 2 matrix is encoded
locally by the vendored Nayuki TypeScript algorithm.

## Native Web APIs

- [`<svg>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/svg) - a square viewBox, opaque background rectangle and one path of dark modules
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/figure) / [`<figcaption>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/figcaption) - symbol and visible explanation as one unit
- [`img` role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/img_role) - one concise accessible name for the complete symbol
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/output) - computed empty/error feedback with native status semantics
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - initialize inserted figures and apply declared attribute changes
- [`forced-color-adjust`](https://developer.mozilla.org/en-US/docs/Web/CSS/forced-color-adjust) - preserve the symbol's dark-on-light polarity in forced colors

## Structure

```html
<figure
  id="project-qr"
  class="qr-code"
  data-value="https://kyr0.github.io/defuss-shadcn/"
  data-ecc="M"
  data-version="auto"
  data-size="md"
  data-variant="outline">
  <div class="qr-code-symbol" role="img" aria-label="QR code for defuss-shadcn documentation"></div>
  <output class="qr-code-status" hidden></output>
  <figcaption class="qr-code-caption">Project documentation</figcaption>
</figure>
```

- Keep `.qr-code-symbol` and `.qr-code-status` as direct children. The
  component owns their contents and visibility; it preserves the caption.
- The generated SVG contains the complete four-module quiet zone. Keep it
  square, opaque and unobstructed; do not round the symbol or place a logo
  over its modules.
- `data-value` is the exact text to encode. An empty string enters `empty`;
  whitespace is data and is not trimmed.
- `data-ecc` accepts `L`, `M` (default), `Q`, `H`. The selected level is used
  exactly; increasing it may require a larger matrix for the same payload.
- `data-version` accepts `auto` (default) or a canonical decimal integer
  from `1` to `40`. An explicit version fixes the matrix size; insufficient capacity
  enters `error`. In the JavaScript API, use a number such as `version: 10`.
- Changes to `data-value`, `data-ecc`, `data-version`, `data-size` and
  `data-variant` update the instance. Update its accessible name through the
  State API's `label` field.

## Variants (`data-variant`)

| Value | Look |
| --- | --- |
| `plain` (default) | Symbol and caption without an outer frame |
| `outline` | Theme card surface, border and `--radius-lg` around the complete symbol |

## Sizes (`data-size`)

| Value | Symbol width and height, including quiet zone |
| --- | --- |
| `sm` | `8rem` |
| `md` (default) | `12rem` |
| `lg` | `16rem` |

Set the local `--qr-code-size` property for a custom size, for example
`style="--qr-code-size: 360px"`. A dense payload needs a larger displayed or
printed square: SVG sharpness alone does not guarantee a scan at a small
size. Preserve room for all four quiet-zone modules on every side.

## ARIA

| Element | Contract |
| --- | --- |
| `.qr-code-symbol` | `role="img"` and a concise `aria-label`; default label is "QR code" |
| Generated SVG | `aria-hidden="true"` and `focusable="false"`; the container supplies its name |
| `.qr-code-status` | Native `<output>`; visible plain-text feedback in `empty`/`error` |
| `.qr-code-caption` | Optional `<figcaption>` for visible context |
| Figure | Static content; no tab stop or QR-specific keyboard interaction |

In `empty` and `error`, the image container is hidden and its SVG removed.
Put an ordinary link outside the figure when users should also be able to
open the destination directly. Payload text is never made into a link or
used as the automatic accessible label.

## States

| State | Meaning |
| --- | --- |
| `default` | Encode the effective input; empty input lands in `empty`, encoding failure in `error` |
| `empty` | Remove the symbol and show "No QR code data."; retain input for recovery |
| `error` | Remove the symbol and show "QR code unavailable." or controlled failure feedback; retain input for recovery |

Use `el.api.setState('default', { value: 'https://example.com', ecc: 'Q' })`
for a partial update. `el.api.setState('empty')` and
`el.api.setState('error')` work without config; `el.api.setState('default')`
restores the retained input. Pass `message` to localize explicit empty/error
feedback. A successful recovery clears obsolete error feedback.

`el.api.getState()` reports the effective state/config and authored model.
Successful config includes `actualVersion` and `moduleCount`; error config
includes `errorCode` and the effective message. Derived fields can be replayed
unchanged and are ignored as encoding inputs. `el.api.render(snapshot)`
returns detached markup without changing the live figure.

`el.store.subscribe(listener)` observes changes. A direct `el.store.set()`
takes a complete typed, JSON-serializable `{ name, config }` state; it is a
replacement, while `setState()` merges partial config. Omitted replacement
fields use authored/default inputs. An explicit `undefined` in a partial
update resets that field to its authored/default value.

The registry is `df$.shadcn.qrCodeApi` / `df$.shadcn.qrCodeStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type QrCodeState = 'default' | 'empty' | 'error'</code> - `setState(name, config)` takes the config of the state it names (`QrCodeStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Render retained input; empty content lands in empty, encoding failures in error. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>string</code></td><td>Exact payload; omitted preserves the previous input, undefined restores the authored value.</td></tr><tr><td><code>ecc?</code></td><td><code>'L' \| 'M' \| 'Q' \| 'H'</code></td><td>Exact error correction level, without implicit boosting; default M.</td></tr><tr><td><code>version?</code></td><td><code>'auto' \| number</code></td><td>Automatic smallest version, or an integer from 1 through 40; default auto.</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>Short accessible image name; defaults to the authored symbol label or QR code.</td></tr><tr><td><code>size?</code></td><td><code>'sm' \| 'md' \| 'lg'</code></td><td>Symbol size: sm 8rem, md 12rem, or lg 16rem; CSS can override the size.</td></tr><tr><td><code>variant?</code></td><td><code>'plain' \| 'outline'</code></td><td>Plain symbol or a token-colored outlined frame; default plain.</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>Plain-text feedback for explicit empty/error states; blank uses that state's default.</td></tr><tr><td><code>actualVersion?</code></td><td><code>number</code></td><td>Successful output: actual QR version; ignored as an encoding input.</td></tr><tr><td><code>moduleCount?</code></td><td><code>number</code></td><td>Successful output: matrix width without the four-module quiet zone; ignored as an input.</td></tr><tr><td><code>errorCode?</code></td><td><code>'capacity-exceeded' \| 'invalid-text' \| 'invalid-markup' \| 'unavailable'</code></td><td>Error output retained on replay; a default-state recovery clears it.</td></tr></table> |
| `empty` | Hide and clear the symbol, preserve input, and show No QR code data. unless a message is supplied. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>string</code></td><td>Exact payload; omitted preserves the previous input, undefined restores the authored value.</td></tr><tr><td><code>ecc?</code></td><td><code>'L' \| 'M' \| 'Q' \| 'H'</code></td><td>Exact error correction level, without implicit boosting; default M.</td></tr><tr><td><code>version?</code></td><td><code>'auto' \| number</code></td><td>Automatic smallest version, or an integer from 1 through 40; default auto.</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>Short accessible image name; defaults to the authored symbol label or QR code.</td></tr><tr><td><code>size?</code></td><td><code>'sm' \| 'md' \| 'lg'</code></td><td>Symbol size: sm 8rem, md 12rem, or lg 16rem; CSS can override the size.</td></tr><tr><td><code>variant?</code></td><td><code>'plain' \| 'outline'</code></td><td>Plain symbol or a token-colored outlined frame; default plain.</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>Plain-text feedback for explicit empty/error states; blank uses that state's default.</td></tr><tr><td><code>actualVersion?</code></td><td><code>number</code></td><td>Successful output: actual QR version; ignored as an encoding input.</td></tr><tr><td><code>moduleCount?</code></td><td><code>number</code></td><td>Successful output: matrix width without the four-module quiet zone; ignored as an input.</td></tr><tr><td><code>errorCode?</code></td><td><code>'capacity-exceeded' \| 'invalid-text' \| 'invalid-markup' \| 'unavailable'</code></td><td>Error output retained on replay; a default-state recovery clears it.</td></tr></table> |
| `error` | Hide and clear the symbol, preserve input, and show QR code unavailable. unless a message is supplied. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>string</code></td><td>Exact payload; omitted preserves the previous input, undefined restores the authored value.</td></tr><tr><td><code>ecc?</code></td><td><code>'L' \| 'M' \| 'Q' \| 'H'</code></td><td>Exact error correction level, without implicit boosting; default M.</td></tr><tr><td><code>version?</code></td><td><code>'auto' \| number</code></td><td>Automatic smallest version, or an integer from 1 through 40; default auto.</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>Short accessible image name; defaults to the authored symbol label or QR code.</td></tr><tr><td><code>size?</code></td><td><code>'sm' \| 'md' \| 'lg'</code></td><td>Symbol size: sm 8rem, md 12rem, or lg 16rem; CSS can override the size.</td></tr><tr><td><code>variant?</code></td><td><code>'plain' \| 'outline'</code></td><td>Plain symbol or a token-colored outlined frame; default plain.</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>Plain-text feedback for explicit empty/error states; blank uses that state's default.</td></tr><tr><td><code>actualVersion?</code></td><td><code>number</code></td><td>Successful output: actual QR version; ignored as an encoding input.</td></tr><tr><td><code>moduleCount?</code></td><td><code>number</code></td><td>Successful output: matrix width without the four-module quiet zone; ignored as an input.</td></tr><tr><td><code>errorCode?</code></td><td><code>'capacity-exceeded' \| 'invalid-text' \| 'invalid-markup' \| 'unavailable'</code></td><td>Error output retained on replay; a default-state recovery clears it.</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends QrCodeState&gt;(name: S, config?: QrCodeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>QrCodeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: QrCodeState; config: QrCodeStateConfigs[QrCodeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: QrCodeState; config: QrCodeStateConfigs[QrCodeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: QrCodeState; config: QrCodeStateConfigs[QrCodeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: QrCodeState; config: QrCodeStateConfigs[QrCodeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: QrCodeState; config: QrCodeStateConfigs[QrCodeState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.qrCodeApi.setState&lt;S extends QrCodeState&gt;(el: HTMLElement, name: S, config?: QrCodeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>QrCodeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.qrCodeApi.getState(el: HTMLElement): { name: QrCodeState; config: QrCodeStateConfigs[QrCodeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: QrCodeState; config: QrCodeStateConfigs[QrCodeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.qrCodeApi.render(state: { name: QrCodeState; config: QrCodeStateConfigs[QrCodeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: QrCodeState; config: QrCodeStateConfigs[QrCodeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.qrCodeApi.store(el: HTMLElement): Store&lt;{ name: QrCodeState; config: QrCodeStateConfigs[QrCodeState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: QrCodeState; config: QrCodeStateConfigs[QrCodeState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.qrCodeApi.commit&lt;S extends QrCodeState&gt;(el: HTMLElement, name: S, config?: QrCodeStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>QrCodeStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.qrCodeStates: QrCodeState[]</code> | The declared states, 'default' first: <code>default</code>, <code>empty</code>, <code>error</code>. |

### Types

| Type | Description |
|---|---|
| `QrCodeConfig` | Options accepted by setState; getState reports normalized inputs and derived output. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>string</code></td><td>Exact payload; omitted preserves the previous input, undefined restores the authored value.</td></tr><tr><td><code>ecc?</code></td><td><code>'L' \| 'M' \| 'Q' \| 'H'</code></td><td>Exact error correction level, without implicit boosting; default M.</td></tr><tr><td><code>version?</code></td><td><code>'auto' \| number</code></td><td>Automatic smallest version, or an integer from 1 through 40; default auto.</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>Short accessible image name; defaults to the authored symbol label or QR code.</td></tr><tr><td><code>size?</code></td><td><code>'sm' \| 'md' \| 'lg'</code></td><td>Symbol size: sm 8rem, md 12rem, or lg 16rem; CSS can override the size.</td></tr><tr><td><code>variant?</code></td><td><code>'plain' \| 'outline'</code></td><td>Plain symbol or a token-colored outlined frame; default plain.</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>Plain-text feedback for explicit empty/error states; blank uses that state's default.</td></tr><tr><td><code>actualVersion?</code></td><td><code>number</code></td><td>Successful output: actual QR version; ignored as an encoding input.</td></tr><tr><td><code>moduleCount?</code></td><td><code>number</code></td><td>Successful output: matrix width without the four-module quiet zone; ignored as an input.</td></tr><tr><td><code>errorCode?</code></td><td><code>'capacity-exceeded' \| 'invalid-text' \| 'invalid-markup' \| 'unavailable'</code></td><td>Error output retained on replay; a default-state recovery clears it.</td></tr></table> |

## Notes

- Load `components/core.css`, then `components/qr-code/qr-code.css`; load
  `components/core.js` before `components/qr-code/qr-code.js` as ES modules.
  The `.min.*` twins have the same contract. Serve ordinary HTML over HTTP.
  The all-components alternative is `core.css` + `all.css` + `all.js`.
- The wrapper uses the system's card, border, radius and typography tokens.
  The symbol defaults to black on white in both light and dark themes.
  Local `--qr-code-dark` / `--qr-code-light` overrides require sufficient
  contrast and scanning checks; the global token schema is unchanged.
- Non-ASCII input uses UTF-8 with ECI assignment 26. Unicode normalization
  is not applied; malformed UTF-16 is rejected. Exact bytes, including
  combining characters and whitespace, are preserved.
- Numeric/alphanumeric strings use their compact whole-string modes;
  other text uses byte mode. There is no mixed-mode optimizer, Kanji
  compression, Micro QR or structured append API.
- Encoding and SVG creation are synchronous and local. There is no QR
  service, remote loader, camera access or decoder in the runtime.
- Capacity failures and malformed text clear the previous QR immediately.
  Unknown option names and invalid API types/options throw before applying a state; malformed
  declarative attributes produce controlled `invalid-markup` feedback.
- Nayuki QR Code generator v1.8.0 is vendored unchanged under MIT. The
  component's `NOTICE.txt` and `qr-code.upstream.json` record attribution
  and the pinned source. See the [upstream project](https://www.nayuki.io/page/qr-code-generator-library)
  and DENSO WAVE's [four-module margin guidance](https://www.qrcode.com/en/howto/code.html).
