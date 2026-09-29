---
name: Resizer
type: ATM
why: Pointer capture + box geometry give edge/corner drag handles for any single container - with a classes mode that keeps sizing declarative (the sizing.css ladder stays the source of truth).
when: When a demo surface, canvas, or panel must be user-resizable on more than the native CSS `resize` corner - or when the size should stay expressed as w-/h- classes instead of inline px.
where: dist/components/resizer/resizer.css + dist/components/resizer/resizer.js
supportedStates: default
---

Wraps exactly **one** container element (the wrapper's first element child) and
adds draggable resize handles on any subset of its 8 positions.

## Native basis

Pointer Events (pointer capture) drive the drag; `getBoundingClientRect()` reads
the box; sizing mode "classes" mutates the element's `class` so the shipped
`sizing.css` utilities stay the single source of size truth. Keyboard parity
uses plain keydown handling on `role="separator"` handles.

## Native Web APIs

- [Pointer Events (`setPointerCapture`)](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - drag continues outside the handle, no document-level listeners
- [`lostpointercapture`](https://developer.mozilla.org/en-US/docs/Web/API/Element/lostpointercapture_event) + `buttons === 0` move guard - a release the document cannot see (outside an iframe) still ends the drag
- [`touch-action: none`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) - the browser yields the gesture to the drag
- [`role="separator"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/separator_role) - a resizable divider is exactly what the ARIA role describes
- [KeyboardEvents](https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event) - arrow-key resize parity for every handle
- [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - `data-width`/`data-height` writes (CodeExample State panel) apply back into the box
- [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `resizer-resize` lets consumers (e.g. the CodeExample toolbar) mirror live sizes

## Structure

```html
<div class="resizer" data-handles="all" data-resize-mode="px" data-min="120">
  <div class="card" style="width:20rem;height:12rem;">…the ONE wrapped element…</div>
</div>
```

The runtime appends the handles (`data-ce-chrome` marked - sandbox-safe):

```html
<span class="resizer-handle" data-handle="se" role="separator" tabindex="0" aria-label="Resize bottom-right corner"></span>
```

## Variants (data attributes on the wrapper)

| Attribute | Values | Default | Behavior |
| --- | --- | --- | --- |
| `data-handles` | space list of `n e s w ne nw se sw`, or `all` | `se` | which handles get placed |
| `data-resize-mode` | `px` \| `classes` \| `controlled` | `px` | inline px / w-N-h-N classes (sizing.css ladder, integer steps 16–96) / size owned by the consumer via `resizer-resize` events |
| `data-axis` | `both` \| `w` \| `h` | `both` | which axes any handle resizes |
| `data-min` / `data-max` | px | `80` / `2000` | shared clamp; per-axis `data-min-w`/`data-max-w`/`data-min-h`/`data-max-h` override |
| `data-step` | px | `1` | drag quantization (px mode) |
| `data-w-classes` / `data-h-classes` | space list of tokens | integer `w-16…w-96` | custom classes-mode ladder |
| `data-width` / `data-height` | px (written by runtime) | - | observation mirror; external writes are applied back |

## States

Named states via the shared State API (AGENTS.md "State API"), bound per instance:
`default` (the authored size, snapshotted at init; accepts a `{ width, height }`
px config).

```js
document.querySelector('#panel').api.setState('default');           // authored size
document.querySelector('#panel').api.setState('default', { width: 320 });
document.querySelector('#panel').api.getState(); // { name: 'default', config: { width, height, mode } }
```

Actions (schema contract): `reset` dispatches `resizer-reset` on the wrapper —
equivalent to `setState('default')`.

## ARIA

| Aspect | Handling |
| --- | --- |
| Handle role | `role="separator"` + `aria-label` naming the position (edge handles also get `aria-orientation`) |
| Keyboard | Tab focuses handles; ArrowRight/Up grow, ArrowLeft/Down shrink (Shift ×10); Home/End jump to min/max |
| Drag feedback | wrapper gets `data-resizing` - dashed outline + active handle highlight |

## Notes

- The wrapper must have exactly one element child - init skips empty wrappers.
  Inline `style="resize:none"` on the child neutralizes native CSS resize (the
  runtime also sets it); side/top-edge handles need the wrapper's `overflow`
  to stay visible (default).
- Classes mode measures each ladder token once (cached) and picks the nearest;
  authored `w-*`/`h-*` classes outside the ladder are left alone.
- Controlled mode fires `resizer-resize` (`detail: { axis, width, height }`) and
  writes nothing - the CodeExample preview toolbar uses this to drive the
  sandbox iframe size from any of 8 handles.
- The `data-width`/`data-height` mirror updates on every applied change
  (drag, keyboard, panel edit, setState) - that is what the machine contract
  (`resizer.schema.json`) observes.
- Pointer capture is **document-scoped**: a drag started inside an iframe and
  released over the parent page produces no `pointerup` here. The drag ends
  anyway via three guards - `lostpointercapture`, a captured `pointermove`
  with `buttons === 0`, and a document-level `pointercancel` (which the
  CodeExample sandbox bridge dispatches when the HOST reports the release).
  Without them the example would stay "stuck resizing" until the next click.
