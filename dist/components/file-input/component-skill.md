---
name: File Input
type: ATM
why: A <label> wrapping the native file input with styled drag-over and filled states.
when: Uploads that need a clear drop-target affordance beyond a bare file field.
where: dist/components/file-input/file-input.css
supportedStates: default
---

# Pattern: File Input

## Native basis
`<input type="file">` element with custom `::file-selector-button` styling.

---

## Native Web APIs
- [`<input type="file">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file) - native file picker with drag-and-drop support
- [`::file-selector-button`](https://developer.mozilla.org/en-US/docs/Web/CSS/::file-selector-button) - styles the native Choose File button

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
