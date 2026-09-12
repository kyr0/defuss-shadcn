---
name: Popover
type: ATM
why: Native Popover API with CSS anchor positioning — show, dismiss, and placement owned by the browser.
when: Lightweight panel anchored to a trigger — info, mini-forms, menus.
where: dist/components/popover/popover.css + dist/components/popover/popover.js
supportedStates: default, open
---

# Popover

## Native basis

`popover` attribute — native Popover API with CSS anchor positioning for placement.

## Native Web APIs

- [`popover` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover) — native popover API with light-dismiss (click outside / Escape)
- [`popovertarget`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#popovertarget) — declarative button→popover wiring with no JS
- [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) — positions popover relative to trigger via `position-area`
- [`position-area`](https://developer.mozilla.org/en-US/docs/Web/CSS/position-area) — grid-based anchor positioning for side/align placement
- [`position-try-fallbacks`](https://developer.mozilla.org/en-US/docs/Web/CSS/position-try-fallbacks) — automatic flip when popover overflows viewport
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) — entry animation starting values
- [`transition-behavior: allow-discrete`](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-behavior) — enables transitions on `display` property

## Structure

```html
<button class="btn" data-variant="outline" popovertarget="my-popover">Open Popover</button>

<div class="popover" id="my-popover" popover>
  <div class="popover-header">
    <p class="popover-title">Dimensions</p>
    <p class="popover-description">Set the dimensions for the layer.</p>
  </div>
  <div class="popover-content">
    <!-- any content -->
  </div>
</div>
```

### With side and alignment

```html
<button class="btn" popovertarget="pop-top">Top</button>
<div class="popover" id="pop-top" popover data-side="top">...</div>

<button class="btn" popovertarget="pop-right">Right</button>
<div class="popover" id="pop-right" popover data-side="right">...</div>

<button class="btn" popovertarget="pop-end">End aligned</button>
<div class="popover" id="pop-end" popover data-align="end">...</div>
```

## Attributes

| Attribute | Element | Values | Default | Description |
|---|---|---|---|---|
| `popover` | `.popover` | `"auto"` | `"auto"` | Enables native Popover API |
| `popovertarget` | trigger `<button>` | popover `id` | — | Declarative trigger wiring |
| `data-side` | `.popover` | `top`, `right`, `bottom`, `left` | `bottom` | Which side of the trigger to position |
| `data-align` | `.popover` | `start`, `center`, `end` | `center` | Alignment along the side axis |


## Density

Set `data-density` on the `.popover` root. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | content padding 0.75rem |
| `comfortable` | content padding 1rem — identical to the unsized default |
| `spacious` | content padding 1.25rem |

## ARIA

No additional ARIA attributes are needed. The native `popover` attribute and `popovertarget` handle accessibility automatically:

| Feature | Handled by |
|---|---|
| Toggle open/close | `popovertarget` (declarative, no JS) |
| Light dismiss | Popover API (click outside or Escape closes) |
| Focus management | Browser moves focus into popover on open |

## Keyboard

| Key | Action |
|---|---|
| Enter / Space | Toggle popover (on trigger button) |
| Escape | Close popover (native light-dismiss) |

## States

Declared states: `default` (hidden) · `open` (shown via native showPopover()).

```js
document.querySelector('#my-popover').api.setState('open');
document.querySelector('#my-popover').api.getState(); // { name: 'open', config: {} }
```

The api is bound per popover element; the registry global is
`_defussShadcn.popoverApi` / `_defussShadcn.popoverStates`.

## Notes

- The popover renders in the **top layer**, so it appears above all other content regardless of `z-index`.
- CSS anchor positioning (`position-area`) handles placement — the JS only assigns unique anchor names per trigger–popover pair.
- `position-try-fallbacks: flip-block` (or `flip-inline` for left/right sides) automatically repositions when the popover would overflow the viewport.
- The `popover` attribute defaults to `"auto"` which provides light-dismiss behavior. Use `popover="manual"` if you need the popover to stay open until explicitly closed.
- Do not place the `.popover` element inside scroll containers — it renders in the top layer and will not scroll with parent content.
