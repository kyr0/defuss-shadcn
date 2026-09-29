---
name: File Input
type: ATM
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
- [`Intl.NumberFormat` units](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - "1.5 MB" in the reader's locale

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
