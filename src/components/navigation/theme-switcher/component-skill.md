---
name: Theme Switcher
type: MOL
section: navigation
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

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ThemeSwitcherState = 'default' | 'open'</code> - `setState(name, config)` takes the config of the state it names (`ThemeSwitcherStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The menu closed. No config. |
| `open` | The menu shown (a popover, top layer). No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ThemeSwitcherState&gt;(name: S, config?: ThemeSwitcherStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ThemeSwitcherStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ThemeSwitcherState; config: ThemeSwitcherStateConfigs[ThemeSwitcherState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ThemeSwitcherState; config: ThemeSwitcherStateConfigs[ThemeSwitcherState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ThemeSwitcherState; config: ThemeSwitcherStateConfigs[ThemeSwitcherState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ThemeSwitcherState; config: ThemeSwitcherStateConfigs[ThemeSwitcherState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ThemeSwitcherState; config: ThemeSwitcherStateConfigs[ThemeSwitcherState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.themeSwitcherApi.setState&lt;S extends ThemeSwitcherState&gt;(el: HTMLElement, name: S, config?: ThemeSwitcherStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ThemeSwitcherStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.themeSwitcherApi.getState(el: HTMLElement): { name: ThemeSwitcherState; config: ThemeSwitcherStateConfigs[ThemeSwitcherState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ThemeSwitcherState; config: ThemeSwitcherStateConfigs[ThemeSwitcherState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.themeSwitcherApi.render(state: { name: ThemeSwitcherState; config: ThemeSwitcherStateConfigs[ThemeSwitcherState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ThemeSwitcherState; config: ThemeSwitcherStateConfigs[ThemeSwitcherState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.themeSwitcherApi.store(el: HTMLElement): Store&lt;{ name: ThemeSwitcherState; config: ThemeSwitcherStateConfigs[ThemeSwitcherState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ThemeSwitcherState; config: ThemeSwitcherStateConfigs[ThemeSwitcherState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.themeSwitcherApi.commit&lt;S extends ThemeSwitcherState&gt;(el: HTMLElement, name: S, config?: ThemeSwitcherStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ThemeSwitcherStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.themeSwitcherApi.select(menu: HTMLElement, id: string): void</code> | Apply a theme on the switcher owning `menu` (link swap, see above). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>menu</code></td><td><code>HTMLElement</code></td><td>the switcher's menu (any element inside its .theme-switcher root)</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the theme id, one of the switcher's options</td></tr></table> |
| <code>df$.shadcn.themeSwitcherStates: ThemeSwitcherState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>. |

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
- The component **persists through a `persisted()` store** (`defuss-shadcn-color-theme`
  in `localStorage`; memory when storage is blocked, a raw id written by older
  versions adopted, every other store for the key on the page follows)
  and dispatches `defuss-theme-change` (`event.detail.id`) on every change;
  listen to it to sync your own UI (favicons, previews); multiple switchers on one
  page stay in sync automatically through the same event.
- `<link>` loads are **async**: components see the new tokens one frame
  later; do not measure theme colors synchronously after `select()`.
- Items are `<button>`s inside `popover="auto"` - native focus return +
  Escape. Keyboard: Arrow/Home/End rove, Enter/Space selects, Tab closes
  (light dismiss).
- Menu scrolls (`max-height`) with `overscroll-behavior: contain` so long
  theme lists never scroll the page behind.
