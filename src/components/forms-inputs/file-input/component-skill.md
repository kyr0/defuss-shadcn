---
name: File Input
type: ATM
section: forms-inputs
why: The native file input - styled, and as a drag & drop card whose invisible input takes the click AND the drop natively; the script filters, appends and lists the files.
when: Uploads - a compact field in forms, a drop zone card when files are the main task. Filter by type with accept, by size / count with data-max-size / data-max-files.
where: dist/components/file-input/file-input.css + dist/components/file-input/file-input.js
supportedStates: default, dragover, selected, error
---

# Pattern: File Input

## Native basis
`<input type="file">` element with custom `::file-selector-button` styling.

---

## Native Web APIs
- [`<input type="file">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file) - native file picker with drag-and-drop support
- [`::file-selector-button`](https://developer.mozilla.org/en-US/docs/Web/CSS/::file-selector-button) - styles the native Choose File button
- [`DataTransfer`](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer) - rebuilds `input.files` (append, remove, filter)
- [HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) - `dragenter` / `dragleave` for the highlight
- [`URL.createObjectURL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) - image previews without reading the file
- [`Intl.NumberFormat` units](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - "1.5 MB" in the locale of the text (nearest `[lang]`, else `en`)

---

## Structure

```html
<label class="label" for="avatar">Picture</label>
<input class="file-input" type="file" id="avatar">
```

### Multiple
```html
<input class="file-input" type="file" id="docs" multiple>
```

### Accept filter
```html
<input class="file-input" type="file" id="photo" accept="image/*">
```

### Drop zone (drag & drop card)

```html
<div class="file-drop" data-max-size="10000000" data-max-files="5">
  <label class="file-drop-zone">
    <input class="file-drop-input" type="file" name="files" multiple accept="image/*,.pdf">
    <span class="file-drop-icon" aria-hidden="true"><svg>…upload…</svg></span>
    <span class="file-drop-title">Drop files here or <span class="file-drop-browse">browse</span></span>
    <span class="file-drop-hint">PNG, JPG or PDF · up to 10 MB each · 5 files</span>
  </label>
  <p class="file-drop-error"></p>
  <ul class="file-drop-list" aria-live="polite"></ul>
</div>
```

- The native input covers the card (invisible): a click opens the picker, a
  DROP lands on the input - `input.files` is filled by the browser, forms
  submit it as usual. Without JavaScript that already works.
- `file-input.js` adds:
  - the drag highlight (`data-state-name="dragover"`)
  - filtering: `accept` (a drop bypasses it natively), `data-max-size`
    (bytes), `data-max-files` - rejected files are named in
    `.file-drop-error` (`role="alert"`) and a `file-drop:rejected` event
  - a `multiple` pick APPENDS to the selection (duplicates skipped)
  - `.file-drop-list`: one `.file-drop-item` per file - an image preview or
    the extension (`.file-drop-thumb`), the name, the size
    (`Intl.NumberFormat` units) and a remove button
- `data-size="sm"` - a compact one-row zone.
- Put the emoji / icon you like in `.file-drop-icon`.

## States

| State | Meaning |
| --- | --- |
| `default` | No files (setState clears the selection) |
| `dragover` | Files are dragged over the zone |
| `selected` | Files chosen (`config.files: [{ name, size, type }]` sets placeholders) |
| `error` | Some files were rejected (`config.message`) |

```js
document.querySelector('#upload').api.setState('selected', { files: [{ name: 'cv.pdf', size: 120000, type: 'application/pdf' }] });
document.querySelector('#upload').api.getState(); // → { name: 'selected', config: { count: 1, files: ['cv.pdf'] } }
```

The registry global is `df$.shadcn.fileInputApi` / `df$.shadcn.fileInputStates`.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type FileInputState = 'default' | 'dragover' | 'selected' | 'error'</code> - `setState(name, config)` takes the config of the state it names (`FileInputStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | No files - setting it clears the selection. No config. |
| `dragover` | Files are dragged over the zone. No config. |
| `selected` | Files chosen. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>files?</code></td><td><code>Array&lt;string \| { name: string; size?: number; type?: string }&gt;</code></td><td>placeholder entries for the list (a name, or name + size in bytes + MIME type)</td></tr></table> |
| `error` | Some files were refused. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>the message shown (getState() reports the live one)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends FileInputState&gt;(name: S, config?: FileInputStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>FileInputStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: FileInputState; config: FileInputStateConfigs[FileInputState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: FileInputState; config: FileInputStateConfigs[FileInputState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: FileInputState; config: FileInputStateConfigs[FileInputState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: FileInputState; config: FileInputStateConfigs[FileInputState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: FileInputState; config: FileInputStateConfigs[FileInputState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.fileInputApi.setState&lt;S extends FileInputState&gt;(el: HTMLElement, name: S, config?: FileInputStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>FileInputStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.fileInputApi.getState(el: HTMLElement): { name: FileInputState; config: FileInputStateConfigs[FileInputState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: FileInputState; config: FileInputStateConfigs[FileInputState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.fileInputApi.render(state: { name: FileInputState; config: FileInputStateConfigs[FileInputState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: FileInputState; config: FileInputStateConfigs[FileInputState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.fileInputApi.store(el: HTMLElement): Store&lt;{ name: FileInputState; config: FileInputStateConfigs[FileInputState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: FileInputState; config: FileInputStateConfigs[FileInputState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.fileInputApi.commit&lt;S extends FileInputState&gt;(el: HTMLElement, name: S, config?: FileInputStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>FileInputStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.fileInputStates: FileInputState[]</code> | The declared states, 'default' first: <code>default</code>, <code>dragover</code>, <code>selected</code>, <code>error</code>. |

### Events

| Event | Description |
|---|---|
| `file-drop:rejected` | Fires when chosen or dropped files are refused (type, size, count) - the files and the message shown. <code>detail</code>: <code>FileDropRejectedDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>files</code></td><td><code>File[]</code></td><td>the files that were refused</td></tr><tr><td><code>message</code></td><td><code>string</code></td><td>the message the component shows for them</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `FileDropRejectedDetail` | What file-drop:rejected carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>files</code></td><td><code>File[]</code></td><td>the files that were refused</td></tr><tr><td><code>message</code></td><td><code>string</code></td><td>the message the component shows for them</td></tr></table> |

---

## Sizes

| `data-size` | Box height | Font |
|-------------|------------|------|
| `xs` | 1.75rem | 0.75rem |
| `sm` | 2rem | 0.8125rem |
| `md` *(default)* | 2.25rem | 0.875rem |
| `lg` | 2.75rem | 1rem |
| `xl` | 3.25rem | 1.125rem |

Same ladder as `.input` (md = 2.25rem); the file-selector button fills the box.

---
## Notes

- Reuses the `.input` styling pattern for consistency.
- The `::file-selector-button` is styled as a muted button with hover effect.
- The existing `.input[type="file"]` already covers this - the file-input component provides a standalone class.
