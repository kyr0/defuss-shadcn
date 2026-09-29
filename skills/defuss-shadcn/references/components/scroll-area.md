---
name: Scroll Area
type: ATM
why: Overflow container with styled scrollbars and edge fade - pure CSS.
when: Fixed-height regions that scroll: menu bodies, sidebars, code panes.
where: dist/components/scroll-area/scroll-area.css
supportedStates: default
---

# Scroll Area

## Native basis

CSS overflow with custom-styled scrollbars using both standard and Webkit scrollbar properties.

## Native Web APIs

- [`overflow`](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow) - scrollable container
- [`scrollbar-width`](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-width) - standard thin scrollbar (Firefox, Chrome 121+)
- [`scrollbar-color`](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-color) - standard scrollbar colors
- [`scrollbar-gutter`](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-gutter) - reserves space for scrollbar to prevent layout shift
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) - prevents scroll chaining to parent containers
- [`::-webkit-scrollbar`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar) - Webkit custom scrollbar styling

## Structure

### Vertical (default)
```html
<div class="scroll-area" style="height:12rem;">
  <!-- long content -->
</div>
```

### Horizontal
```html
<div class="scroll-area" style="max-width:24rem;overflow-x:auto;">
  <div style="display:flex;gap:1rem;width:max-content;">
    <!-- wide content -->
  </div>
</div>
```


## Density

Set `data-density` on the `.scroll-area` root. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.
For a scroll area the whitespace policy is the scrollbar gutter itself.
| Value | Effect |
| --- | --- |
| `compact` | scrollbar thumb 4px |
| `comfortable` | thumb 6px - identical to the unsized default |
| `spacious` | thumb 8px (standard `scrollbar-width: medium`) |

## Accessibility

- Scrollable areas are keyboard-navigable by default when they have focusable content or `tabindex="0"`.
- `overscroll-behavior: contain` prevents accidental page scroll when reaching the end of the scroll area.

## Notes

- Uses both `scrollbar-width: thin` / `scrollbar-color` (standard, cross-browser) and `::-webkit-scrollbar` (legacy Webkit) for maximum compatibility.
- `scrollbar-gutter: stable` prevents layout shift when content grows enough to trigger a scrollbar.
- `overscroll-behavior: contain` is especially important when used inside overlays (dialogs, sheets, popovers) to prevent background scroll.
- Pure CSS - no JavaScript required.
