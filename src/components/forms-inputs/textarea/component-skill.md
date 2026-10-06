---
name: Textarea
type: ATM
section: forms-inputs
why: Native textarea with field-sizing: content - auto-grows with zero JavaScript, between row limits in lh; a .textarea-group turns it into a composer frame.
when: Multi-line text input - notes, bios, comments; a chat or comment composer with attachments and a send button (.textarea-group). Single-line values take input.
where: dist/components/textarea/textarea.css
supportedStates: default
---

# Pattern: Textarea

## Native basis
`<textarea>` element with `field-sizing: content` for auto-growing.

---

## Native Web APIs
- [`<textarea>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea) - multi-line text input
- [`field-sizing: content`](https://developer.mozilla.org/en-US/docs/Web/CSS/field-sizing) - auto-growing textarea without JavaScript
- [`lh` unit](https://developer.mozilla.org/en-US/docs/Web/CSS/length#lh) - `data-rows` / `data-max-rows` in true lines of the field
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the composer frame takes the focus ring from the textarea inside
- [`:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid) - native validation styling after user interaction
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses focus/hover transitions
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - thicker borders for high-contrast preference
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - Windows High Contrast Mode with system colors

---

## Structure

```html
<label class="label" for="message">Message</label>
<textarea class="textarea" id="message" placeholder="Your message..."></textarea>
```

### Rows and a limit

```html
<textarea class="textarea" data-rows="2" data-max-rows="6" data-resize="none"></textarea>
```

It starts two lines tall, grows with its text (`field-sizing: content`),
and scrolls past six lines. `data-rows`: 1, 2, 3, 4, 5, 6, 8, 10;
`data-max-rows`: 2, 3, 4, 5, 6, 8, 10, 12. Without either it is 5rem tall
and grows without limit.

### Composer (.textarea-group)

```html
<form class="textarea-group" aria-label="Message composer">
  <ul class="file-drop-list" aria-label="Attachments"></ul>
  <textarea class="textarea" data-rows="1" data-max-rows="6" aria-label="Message"></textarea>
  <div class="textarea-group-actions">
    <button class="btn" data-variant="ghost" data-size="icon-sm" type="button" aria-label="Attach images">…</button>
    <span class="textarea-group-spacer"></span>
    <output class="textarea-group-count">0 / 500</output>
    <button class="btn" data-size="icon-sm" type="submit" aria-label="Send">…</button>
  </div>
</form>
```

- The group draws the frame and the focus ring; the textarea inside is
  frameless and grows.
- `.file-drop-list` holds attachment chips - the file input's own
  `.file-drop-item` markup (thumb, name + meta, remove button), laid out
  as a wrapping row; it hides while empty.
- `.textarea-group-actions` is the button row; `.textarea-group-spacer`
  pushes what follows to the end; `.textarea-group-count` is a quiet counter.
- `data-layout="inline"` puts actions and text on one row, bottom-aligned
  (put the attach actions before the textarea, send after) - the one-line
  chat input that grows upward.
- `data-dragover` on the group (set by the page while files are dragged
  over it) shows the drop target: dashed ring, tinted surface.
- The composer is CSS; sending (Enter vs Shift+Enter), attaching and drag
  and drop are a few lines of page script - see the doc page's Composer
  example, which the chat Session reuses.

---

## Accessibility

| Attribute | When | Value |
|-----------|------|-------|
| `id` + `for` | Always | Links label to textarea |
| `aria-invalid="true"` | Validation error | Marks as invalid |
| `aria-describedby` | Has description | Points to description element |

---

## Notes

- **Validation timing**: `aria-invalid="true"` shows immediately; the browser's own checks (`:user-invalid`) only paint inside a `<form>`, and inside `<form data-validate="submit">` only after a submit attempt (`data-submitted` on the form) - see the Input skill's "Validation timing".
- Uses `field-sizing: content` for auto-growing - no JavaScript needed.
- Shares the same border, focus, disabled, and invalid styles as `.input`.
- The textarea is 5rem tall by default; `data-rows` / `data-max-rows` set the range it grows in.
- Name the composer (`aria-label` on the form) and every icon button.
