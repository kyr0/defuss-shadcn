---
name: Sheet
type: MOL
why: A <dialog> variant that slides in from an edge — native modal semantics with transform-only animation.
when: Off-canvas panels: mobile menus, filter drawers, detail side panels.
where: dist/components/sheet/sheet.css + dist/components/sheet/sheet.js
supportedStates: default, open
---

# Pattern: Sheet

## Native basis
`<dialog>` element + `showModal()`. Same native benefits as Dialog:
- Focus trap (automatically)
- Escape key to close (automatically)
- `::backdrop` for overlay
- `aria-modal` behavior when opened with `showModal()`

A sheet is a dialog variant that slides in from an edge of the screen.
Uses `data-side` attribute to control which edge: `top`, `right`, `bottom`, `left`.

---

## Native Web APIs
- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) — native modal element with built-in focus trap and Escape-to-close
- [`HTMLDialogElement.showModal()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) — opens sheet as modal in the top layer with backdrop
- [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop) — pseudo-element for the overlay behind the sheet
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) — defines entry animation starting values for slide-in transition

---

## Structure

```html
<!-- Trigger -->
<button class="btn" data-variant="outline"
        data-sheet-trigger="my-sheet"
        aria-haspopup="dialog">
  Open Sheet
</button>

<!-- Sheet -->
<dialog id="my-sheet"
        class="sheet"
        data-side="right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-sheet-title">

  <div class="sheet-content">
    <div class="sheet-header">
      <h2 class="sheet-title" id="my-sheet-title">Sheet Title</h2>
      <p class="sheet-description">Supporting description.</p>
    </div>

    <div class="sheet-body">
      <!-- Content goes here -->
    </div>

    <div class="sheet-footer">
      <button class="btn" data-variant="outline" data-sheet-close>
        Cancel
      </button>
      <button class="btn" data-variant="default">
        Save changes
      </button>
    </div>
  </div>

  <button class="sheet-close-x" data-sheet-close aria-label="Close">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  </button>
</dialog>
```

---

## Sides

| `data-side` | Behavior                           |
|-------------|------------------------------------|
| `right`     | Slides in from right edge (default) |
| `left`      | Slides in from left edge            |
| `top`       | Slides down from top edge           |
| `bottom`    | Slides up from bottom edge          |

---


## Density

Set `data-density` on the `.sheet` root. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | content padding 1rem |
| `comfortable` | content padding 1.5rem — identical to the unsized default |
| `spacious` | content padding 2rem |

## ARIA

| Attribute            | Element          | Value                |
|----------------------|------------------|----------------------|
| `role="dialog"`      | `<dialog>`       | Identifies as dialog |
| `aria-modal="true"`  | `<dialog>`       | Content behind is inert |
| `aria-labelledby`    | `<dialog>`       | Points to title `id` |
| `aria-haspopup="dialog"` | trigger     | Indicates dialog will open |
| `aria-label="Close"` | `sheet-close-x`  | Labels the X button  |

---

## Wiring conventions

- `data-sheet-trigger="[id]"` on any element → opens that sheet
- `data-sheet-close` on any element inside → closes the sheet
- Click on backdrop → closes (click lands on `<dialog>` itself)
- Place `<dialog>` elements as direct children of `<body>`

---

## States

Declared states: `default` (closed) · `open` (shown modally via showModal()).

```js
document.querySelector('#sheet-right').api.setState('open');
document.querySelector('#sheet-right').api.getState(); // { name: 'open', config: {} }
```

The api is bound per sheet element; the registry global is
`df$.shadcn.sheetApi` / `df$.shadcn.sheetStates`.

## Notes

- While a sheet is modal, `html:has(dialog.sheet:modal)` sets `overflow: hidden` + `scrollbar-gutter: stable` — the page behind cannot scroll and its position is preserved for when the sheet closes (no JS scroll-lock).
- Right/left sheets have a fixed width of `24rem` with `max-width: 100vw` for small screens.
- Top/bottom sheets are full width with `height: auto` — they size to their content. Their `.sheet-content` column caps at `48rem` and centers, so content doesn't stretch to the viewport edges.
- The selector is `dialog.sheet` (element + class) to avoid conflicts with `dialog.dialog`.
- The `sheet-header` has `padding-right: 2rem` to avoid overlapping the close button.
