---
name: Theme Switcher
type: MOL
why: Switches the color theme by loading/unloading ONE generated stylesheet (<link id="theme-css">) - tokens stay static, no JS token objects, dark mode needs no re-apply because each theme file carries :root + .dark.
when: Live theme pickers for docs sites, previews, or settings pages - unless the theme is fixed at deploy time (then just link the file directly).
where: dist/components/theme-switcher/theme-switcher.css + dist/components/theme-switcher/theme-switcher.js
supportedStates: default, open
---

# Theme Switcher

## Native basis

`<button popovertarget>` + `popover` (Popover API) for the dropdown, CSS
anchor positioning for placement, and the plain `<link rel="stylesheet">`
element as the theme application mechanism - swapping one link's `href`
re-themes the whole page.

## Native Web APIs

- [`popover`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover) + [`popovertarget`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#popovertarget) - declarative dropdown open/close with light dismiss
- [`<link rel="stylesheet">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) - the theme *is* a stylesheet; creating/removing one `<link>` applies/resets the theme
- [`anchor-name` / `anchor()`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - menu placement below the trigger, `position-try-fallbacks: flip-block` for viewport edges
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) + `transition-behavior: allow-discrete` - enter/exit animation across the `display: none` switch
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `defuss-theme-change` keeps multiple switchers (and the doc-site theme grid) in sync
- [WAI-ARIA menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) - Arrow/Home/End roving focus, `aria-checked`, Escape (native light dismiss)

## Structure

```html
<div class="theme-switcher">
  <button
    class="btn theme-switcher-trigger"
    id="ts-trigger"
    popovertarget="ts-menu"
    aria-expanded="false"
    aria-haspopup="menu"
  >
    <span class="theme-switcher-dot" aria-hidden="true"></span>
    <span class="theme-switcher-label">Default</span>
    <svg class="theme-switcher-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
  </button>

  <div id="ts-menu" class="theme-switcher-menu" popover="auto" role="menu" aria-labelledby="ts-trigger">
    <button class="theme-switcher-item" role="menuitemradio" aria-checked="true" data-theme-id="default" data-theme-label="Default">
      <span class="theme-switcher-dots" aria-hidden="true"></span>
      <span class="theme-switcher-name">Default</span>
      <svg class="theme-switcher-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
    </button>
    <button class="theme-switcher-item" role="menuitemradio" aria-checked="false" data-theme-id="claude" data-theme-label="Claude" data-theme-colors="#c96442,#e9e6dc,#e9e6dc,#141413,#ede9de">
      <span class="theme-switcher-dots" aria-hidden="true"></span>
      <span class="theme-switcher-name">Claude</span>
      <svg class="theme-switcher-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
    </button>
    <!-- one item per theme; 'default' = the token file itself (unloads the link) -->
  </div>
</div>
```

The page must load the token stylesheet with `id="tokens-css"` - theme
files resolve relative to it, **one folder up** (the shipped layout is
`theme/<id>.css` beside `theme/utils/default-semantic-tokens.css`).
`data-theme-base` on the `.theme-switcher` root overrides with an explicit
folder for custom layouts.

## Variants

| Attribute | Behavior |
| --- | --- |
| *(none)* | compact button + anchored menu |

Sizes follow the trigger's own `data-size` (the trigger is a `.btn`).

## Data attributes

| Attribute | Where | Purpose |
| --- | --- | --- |
| `data-theme-id` | item | theme id → becomes `<link id="theme-css" data-theme-id>` + `theme/<id>.css`; `default`/empty unloads |
| `data-theme-label` | item | label shown on the trigger when selected |
| `data-theme-colors` | item | up to 5 comma-separated colors → swatch dots (aria-hidden decoration) |
| `data-theme-base` | root | explicit theme-files folder URL (default: token file's parent directory) |

## ARIA

| Attribute | Element | Notes |
| --- | --- | --- |
| `aria-haspopup="menu"`, `aria-expanded` | trigger | expanded syncs with the popover `toggle` event |
| `role="menu"` | menu | menu-button pattern |
| `role="menuitemradio"`, `aria-checked` | items | exactly one checked theme |
| `aria-labelledby` | menu | points at the trigger |

## States

| State | Meaning |
| --- | --- |
| `default` | menu closed (initial) |
| `open` | menu shown (Popover API top layer) |

```js
document.querySelector('#ts-menu').api.setState('open');
// select a theme programmatically (link swap + storage + event):
globalThis.df$.shadcn.themeSwitcherApi.select(document.querySelector('#ts-menu'), 'claude');
```

## Notes

- The **theme is a file**: every theme id needs a stylesheet in the token
  file's folder, same token shape as `default-semantic-tokens.css`
  (`:root` + `.dark` blocks). This repo generates them from
  `src/documentation/runtime/themes.ts` into `dist/theme/<id>.css`.
- A theme that ships **fonts** declares them via `font-sans`/`font-serif`/
  `font-mono` tokens plus a `links:` array in `themes.ts`; build.ts emits
  `dist/theme/<id>.json` (schema v1, `<link>` VNodes) and selecting that theme
  also fires `df$.shadcn.loadTheme(id)` - no sidecar (404) simply means the
  theme needs no resources. Apply `'default'` again and every loaded link is
  removed (no font bleed).
- The component **persists to `localStorage`** (`defuss-shadcn-color-theme`)
  and dispatches `defuss-theme-change` (`event.detail.id`) on every change —
  listen to sync your own UI (favicons, previews); multiple switchers on one
  page stay in sync automatically through the same event.
- `<link>` loads are **async**: components see the new tokens one frame
  later; do not measure theme colors synchronously after `select()`.
- Items are `<button>`s inside `popover="auto"` - native focus return +
  Escape. Keyboard: Arrow/Home/End rove, Enter/Space selects, Tab closes
  (light dismiss).
- Menu scrolls (`max-height`) with `overscroll-behavior: contain` so long
  theme lists never scroll the page behind.
