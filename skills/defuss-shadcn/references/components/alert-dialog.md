---
name: Alert Dialog
type: MOL
why: A <dialog> that demands an answer - Escape and backdrop clicks deliberately do not dismiss it, forcing an explicit confirm or cancel.
when: Destructive or irreversible actions (delete, discard) that must be confirmed.
where: dist/components/alert-dialog/alert-dialog.css + dist/components/alert-dialog/alert-dialog.js
supportedStates: default, open
---

# Alert Dialog

## Native basis

`<dialog>` element used as a modal that requires user response. Unlike a standard dialog, it has no backdrop-close and no close button - the user must choose an action.

## Native Web APIs

- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) - native modal with focus trap and Escape-to-close
- [`showModal()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) - opens as modal with backdrop
- [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop) - native backdrop pseudo-element
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - entry animation starting values

## Structure

```html
<button class="btn" data-variant="outline" data-alert-dialog-trigger="my-alert-dialog">
  Delete Account
</button>

<dialog id="my-alert-dialog" class="alert-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="ad-title" aria-describedby="ad-desc">
  <div class="alert-dialog-content">
    <div class="alert-dialog-header">
      <h2 class="alert-dialog-title" id="ad-title">Are you absolutely sure?</h2>
      <p class="alert-dialog-description" id="ad-desc">
        This action cannot be undone. This will permanently delete your account.
      </p>
    </div>
    <div class="alert-dialog-footer">
      <button class="btn" data-variant="outline" data-alert-dialog-close>Cancel</button>
      <button class="btn" data-variant="destructive" data-alert-dialog-close>Delete</button>
    </div>
  </div>
</dialog>
```

## States

Declared states: `default` (closed) · `open` (shown modally). Escape and backdrop clicks never close it - only close buttons, `close()`, or the API.

```js
document.querySelector('#my-alert').api.setState('open');
document.querySelector('#my-alert').api.getState(); // { name: 'open', config: {} }
```

The api is bound per dialog; the registry global is
`df$.shadcn.alertDialogApi` / `df$.shadcn.alertDialogStates` (camelCase).


## Density

Set `data-density` on the `.alert-dialog` root. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | content padding 1rem |
| `comfortable` | content padding 1.5rem - identical to the unsized default |
| `spacious` | content padding 2rem |

## Accessibility

- Uses `role="alertdialog"` instead of `role="dialog"` - signals interruption
- `aria-labelledby` and `aria-describedby` link to title and description
- No backdrop click dismiss - user must make an explicit choice
- Escape key is disabled - user must use the action buttons
- Focus is trapped inside the dialog via native `showModal()`
- While the alert is modal, `html:has(dialog.alert-dialog:modal)` sets `overflow: hidden` + `scrollbar-gutter: stable` - the page behind cannot scroll and its position is preserved for when the alert closes (no JS scroll-lock).
