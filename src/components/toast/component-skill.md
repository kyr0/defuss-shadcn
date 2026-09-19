---
name: Toast
type: MOL
why: Transient notification via the Popover API plus the df$.shadcn.toast factory — auto-dismisses.
when: Post-action feedback that must not interrupt the user.
where: dist/components/toast/toast.css + dist/components/toast/toast.js
supportedStates: default
---

# Pattern: Toast

## Native basis
`popover` API for top-layer rendering and non-modal behavior.
Requires JavaScript for triggering, auto-dismiss, stacking, and ARIA live
region announcements. Follows `role="status"` with `aria-live="polite"`.

---

## Native Web APIs
- [Popover API (`popover="manual"`)](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) — top-layer rendering without light-dismiss for persistent notifications
- [`aria-live` regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-live) — announces toast content changes to screen readers

---

## Structure

```html
<!-- Toast container — place once in the page -->
<div id="toast-container"
     class="toast-container"
     aria-label="Notifications"
     data-position="bottom-right">
</div>

<!-- Individual toast (injected by JS) -->
<div class="toast" role="status" aria-live="polite" aria-atomic="true"
     popover="manual">
  <div class="toast-content">
    <div class="toast-text">
      <p class="toast-title">Event created</p>
      <p class="toast-description">Monday, January 3rd at 6:00pm</p>
    </div>
    <button class="toast-close" aria-label="Dismiss" data-toast-close>
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
  <div class="toast-actions">
    <button class="btn" data-variant="outline" data-size="sm"
            data-toast-action>Undo</button>
  </div>
</div>
```

### Variant: with icon

```html
<div class="toast" data-variant="success" role="status"
     aria-live="polite" popover="manual">
  <div class="toast-content">
    <svg class="toast-icon" aria-hidden="true" width="16" height="16">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
    <div class="toast-text">
      <p class="toast-title">Saved successfully</p>
    </div>
    <button class="toast-close" aria-label="Dismiss" data-toast-close>
      <svg aria-hidden="true" width="14" height="14">...</svg>
    </button>
  </div>
</div>
```

---


## Sizes

Set `data-size` on the .toast element. Width envelope only — typography and padding are density’s job.

| `data-size` | Effect |
|-------------|--------|
| `sm` | min-width 16rem, max-width 20rem |
| `md` | min-width 20rem, max-width 26rem — identical to the unsized default |
| `lg` | min-width 24rem, max-width 32rem |

## Density

Set `data-density` on the `.toast` element. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | padding 0.75rem, content gap 0.5rem |
| `comfortable` | padding 1rem, gap 0.75rem — identical to the unsized default |
| `spacious` | padding 1.25rem, gap 1rem |

## ARIA

| Attribute           | Where            | Value                       |
|---------------------|------------------|-----------------------------|
| `role="status"`     | each toast       | Implicit live region        |
| `aria-live="polite"`| each toast       | Screen reader announces it  |
| `aria-atomic="true"`| each toast       | Announce entire toast, not just changes |
| `aria-label`        | toast container  | e.g. "Notifications"       |

---

## Positions

Set `data-position` on the `.toast-container`:
- `bottom-right` (default)
- `bottom-left`
- `bottom-center`
- `top-right`
- `top-left`
- `top-center`

---

## Auto-dismiss timing

| Behavior    | Duration value     |
|-------------|-------------------|
| Default     | `4000` (4 seconds)|
| Long        | `8000`            |
| Persistent  | `Infinity`        |

---

## Variants

Set `data-variant` on the `.toast` element.

| Variant | Behavior |
| --- | --- |
| (default) | Neutral popover surface |
| `destructive` | Filled `--destructive` surface with `--destructive-foreground` text |
| `success` | Border + `.toast-icon` tinted green (literal oklch, no token) |
| `warning` | Border + `.toast-icon` tinted amber (literal oklch, no token) |
| `info` | Border + `.toast-icon` tinted blue (literal oklch, no token) |

```html
<div class="toast" role="status" data-variant="success">…</div>
```

## States

The api is bound to the **region container** (`#toast-container`). Its
observable state is which toasts are visible. Declared states: `default`
(dismisses every visible toast — the same path as `df$.shadcn.toast.dismiss()`).
`getState().config.count` reports the live number of visible toasts.

```js
document.querySelector('#toast-container').api.setState('default');
document.querySelector('#toast-container').api.getState(); // { name: 'default', config: { count: 0 } }
```

The registry global is `df$.shadcn.toastApi` / `df$.shadcn.toastStates`.

## Notes

- The toast container should be a direct child of `<body>`
- Toasts use `popover="manual"` so they don't auto-dismiss on outside click
- Lifecycle runs through the core `df$` runtime (see the "DOM Querying &
  Morphing" guide): toasts mount via `df$(container).append(el)` and dismiss
  via `df$(el).remove()` after the exit animation — exact operations that
  keep node identity and the container's delegated listeners intact
- Because `popover="manual"` renders each toast in the top layer (outside the
  container's flex flow), CSS pins each toast to its container's corner and the
  component JS sets a `--toast-stack` offset per toast — order stays newest-on-top
- The stacking order is newest on top (CSS `flex-direction: column-reverse` for bottom positions)
- Maximum visible toasts defaults to 3 — older toasts are dismissed
- Swipe-to-dismiss can be added with touch event handling but is not required for MVP
- For forms, show success/error toasts after submission rather than inline messages
- The `toast()` API is imperative — call it from any event handler
