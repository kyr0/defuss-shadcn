---
name: Navigation Menu
type: ATM
why: Primary site/app menu with hover/focus-triggered popover panels.
when: Top-level navigation, optionally with mega-menu panels per item.
where: dist/components/navigation-menu/navigation-menu.css + dist/components/navigation-menu/navigation-menu.js
supportedStates: default, open
---

# Navigation Menu

## Native basis

`<nav>` + `<ul>` for site-level navigation with dropdown panels.

## Native Web APIs

- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - navigation landmark
- [`popover` API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - dropdown panels without JS show/hide
- [`popovertarget`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#popovertarget) - declarative button→popover trigger
- [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - positions dropdown relative to trigger
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - entry animation for popover
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus ring
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - rotates chevron when dropdown is open
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses animations
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - maps dropdown border to system color

---

## Structure

```html
<nav class="nav-menu" aria-label="Main">
  <ul class="nav-menu-list">
    <li class="nav-menu-item"><a class="nav-menu-link" href="#">Home</a></li>
    <li class="nav-menu-item">
      <button class="nav-menu-trigger" popovertarget="nav-dd">
        Products
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="nav-menu-content" id="nav-dd" popover>
        <a class="nav-menu-content-link" href="#">
          <strong>Analytics</strong>
          <p>View your dashboard</p>
        </a>
        <a class="nav-menu-content-link" href="#">
          <strong>Reports</strong>
          <p>Generate custom reports</p>
        </a>
      </div>
    </li>
  </ul>
</nav>
```

---


## Megamenu

A panel can be a whole page of navigation - still one native popover per
trigger:

```html
<div class="nav-menu-content" id="products" data-width="wide" popover>
  <div class="nav-menu-grid" data-columns="3">
    <div class="nav-menu-section">
      <p class="nav-menu-heading">Build</p>
      <a class="nav-menu-content-link" href="…">
        <span class="nav-menu-icon"><svg>…</svg></span>
        <strong>Components</strong>
        <p>Tokens-first UI parts</p>
      </a>
    </div>
    …
    <a class="nav-menu-feature" href="…"><img src="…" alt=""><strong>Case study</strong><p>…</p></a>
    <div class="nav-menu-footer"><span>New: …</span><a href="…">What's new →</a></div>
  </div>
</div>
```

| Part / attribute | Effect |
| --- | --- |
| `data-width="wide"` (panel) | the panel takes the whole `.nav-menu`'s width (anchor-scoped, CSS only) |
| `data-width="full"` (panel) | the panel spans the page; its content stays within 72rem |
| `.nav-menu-grid` | columns: auto-fit (min 12rem) or `data-columns="2"` / `"3"` / `"4"` |
| `.nav-menu-section` + `.nav-menu-heading` | a column with an uppercase heading |
| `.nav-menu-icon` in a `.nav-menu-content-link` | icon │ title over description |
| `.nav-menu-feature` | a promo block (optional image, title, text) |
| `.nav-menu-footer` | a full-width row under the columns |
| `data-orientation="vertical"` (nav) | a side menu - panels fly out to the right, below the trigger when there is no room |
| `data-orientation="responsive"` (nav) | vertical below 48rem, horizontal above; fixed columns collapse to one |

The open trigger stays highlighted; `aria-current="page"` marks the page's
link. Arrowless triggers: leave the chevron svg out. In a `navbar`, put the
`.nav-menu` in `.navbar-center` and use `data-width="full"` panels.

## Density

Set `data-density` on the `.nav-menu` nav. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | top-level item gap 0.125rem |
| `comfortable` | gap 0.25rem - identical to the unsized default |
| `spacious` | gap 0.375rem |

## Sizes

Set `data-size` on the `.nav-menu` nav; links/triggers and the popover rows scale together.

| `data-size` | Link padding | Link font |
|-------------|--------------|-----------|
| `xs` | 0.25rem 0.5rem | 0.75rem |
| `sm` | 0.375rem 0.625rem | 0.8125rem |
| `md` | 0.5rem 0.75rem | 0.875rem |
| *(none)* | 0.5rem 0.75rem | 0.875rem |
| `lg` | 0.625rem 1rem | 1rem |
| `xl` | 0.75rem 1.25rem | 1.125rem |

`md` equals the unsized default.

---
## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `aria-label` | `<nav>` | Accessible name for the navigation |
| `aria-hidden="true"` | chevron `<svg>` | Decorative indicator, hidden from screen readers |

---

## Keyboard

| Key | Action |
|-----|--------|
| `Tab` | Moves focus between nav items |
| `Enter` / `Space` | Opens dropdown (on trigger) |
| `Escape` | Closes dropdown (native popover behavior) |

---

## States

Declared states: `default` (hidden) · `open` (shown via native showPopover()).

```js
document.querySelector('#my-menu').api.setState('open');
document.querySelector('#my-menu').api.getState(); // { name: 'open', config: {} }
```

The api is bound per `.nav-menu-content` element; the registry global is
`df$.shadcn.navigationMenuApi` / `df$.shadcn.navigationMenuStates` (camelCase).

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type NavigationMenuState = 'default' | 'open'</code> - `setState(name, config)` takes the config of the state it names (`NavigationMenuStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The panel closed. No config. |
| `open` | The panel open. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends NavigationMenuState&gt;(name: S, config?: NavigationMenuStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>NavigationMenuStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: NavigationMenuState; config: NavigationMenuStateConfigs[NavigationMenuState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: NavigationMenuState; config: NavigationMenuStateConfigs[NavigationMenuState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: NavigationMenuState; config: NavigationMenuStateConfigs[NavigationMenuState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: NavigationMenuState; config: NavigationMenuStateConfigs[NavigationMenuState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: NavigationMenuState; config: NavigationMenuStateConfigs[NavigationMenuState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.navigationMenuApi.setState&lt;S extends NavigationMenuState&gt;(el: HTMLElement, name: S, config?: NavigationMenuStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>NavigationMenuStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.navigationMenuApi.getState(el: HTMLElement): { name: NavigationMenuState; config: NavigationMenuStateConfigs[NavigationMenuState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: NavigationMenuState; config: NavigationMenuStateConfigs[NavigationMenuState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.navigationMenuApi.render(state: { name: NavigationMenuState; config: NavigationMenuStateConfigs[NavigationMenuState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: NavigationMenuState; config: NavigationMenuStateConfigs[NavigationMenuState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.navigationMenuApi.store(el: HTMLElement): Store&lt;{ name: NavigationMenuState; config: NavigationMenuStateConfigs[NavigationMenuState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: NavigationMenuState; config: NavigationMenuStateConfigs[NavigationMenuState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.navigationMenuApi.commit&lt;S extends NavigationMenuState&gt;(el: HTMLElement, name: S, config?: NavigationMenuStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>NavigationMenuStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.navigationMenuStates: NavigationMenuState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>. |

## Notes

- The `popover` API handles open/close - no JS click handlers needed.
- `popovertarget` on the button declaratively toggles the popover. No `togglePopover()` calls.
- CSS anchor positioning aligns the dropdown to its trigger. The JS only sets unique `anchor-name` / `position-anchor` pairs.
- The chevron rotates via `:has(+ .nav-menu-content:popover-open)` - no JS class toggling.
- Icon-only triggers must have `aria-label`.
- Dropdown content typically contains `nav-menu-content-link` items with a title and optional description.
