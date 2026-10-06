---
name: Tooltip
type: ATM
why: popover="hint" anchored label - shows on hover/focus without stealing dismissals from other popovers.
when: Brief clarifying text for icon-only controls; never for essential information.
where: dist/components/tooltip/tooltip.css + dist/components/tooltip/tooltip.js
supportedStates: default, visible
---

# Tooltip

## Native basis

Popover API (`popover="hint"`) for hover/focus hint popups with CSS anchor positioning for placement.

## Native Web APIs

- [`popover` attribute (`hint`)](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover) - native popover with light dismiss, doesn't close `auto` popovers
- [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - tether tooltip to trigger element
- [`position-area`](https://developer.mozilla.org/en-US/docs/Web/CSS/position-area) - declarative anchor-relative placement on a 3×3 grid
- [`position-try-fallbacks`](https://developer.mozilla.org/en-US/docs/Web/CSS/position-try-fallbacks) - automatic collision avoidance (flip-block, flip-inline)
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - entry animation starting values
- [`transition-behavior: allow-discrete`](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-behavior) - animate `display: none` transitions

## Structure

### Basic

```html
<button class="btn" data-tooltip-trigger="my-tip">Hover me</button>
<div class="tooltip" id="my-tip" popover="hint" role="tooltip">Tooltip text</div>
```

### With arrow

```html
<button class="btn" data-tooltip-trigger="my-tip">Hover me</button>
<div class="tooltip" id="my-tip" popover="hint" role="tooltip">
  Tooltip text
  <div data-arrow></div>
</div>
```

### Side placement

```html
<div class="tooltip" id="tip-bottom" popover="hint" role="tooltip" data-side="bottom">Below</div>
<div class="tooltip" id="tip-left" popover="hint" role="tooltip" data-side="left">Left</div>
<div class="tooltip" id="tip-right" popover="hint" role="tooltip" data-side="right">Right</div>
```

### Side + alignment

```html
<div class="tooltip" id="tip-top-start" popover="hint" role="tooltip" data-align="start">Top start</div>
<div class="tooltip" id="tip-bottom-end" popover="hint" role="tooltip" data-side="bottom" data-align="end">Bottom end</div>
```

### Custom delay

```html
<button class="btn" data-tooltip-trigger="my-tip" data-delay="300">Fast tooltip</button>
<button class="btn" data-tooltip-trigger="my-tip2" data-delay="0">Instant tooltip</button>
```

## Variants

### Side (`data-side`)

| Value    | Placement                | position-area |
| -------- | ------------------------ | ------------- |
| *(none)* | Above trigger (default)  | `top`         |
| `top`    | Above trigger            | `top`         |
| `bottom` | Below trigger            | `bottom`      |
| `left`   | Left of trigger          | `left`        |
| `right`  | Right of trigger         | `right`       |

### Alignment (`data-align`)

| Value      | Alignment                         |
| ---------- | --------------------------------- |
| *(none)*   | Centered on trigger axis (default)|
| `center`   | Centered on trigger axis          |
| `start`    | Aligned to start edge             |
| `end`      | Aligned to end edge               |

## ARIA

| Attribute          | Element  | Purpose                                   |
| ------------------ | -------- | ----------------------------------------- |
| `role="tooltip"`   | `.tooltip` | Identifies the element as a tooltip       |
| `aria-describedby` | trigger  | Links trigger to tooltip (set by JS)      |
| `popover="hint"`   | `.tooltip` | Hint popover semantics                   |

## States

Declared states: `default` (hidden; hover/focus reveal) · `visible` (shown immediately, bypassing the hover delay).

```js
document.querySelector('#my-tip').api.setState('visible');
document.querySelector('#my-tip').api.getState(); // { name: 'visible', config: {} }
```

The api is bound per tooltip element; the registry global is
`df$.shadcn.tooltipApi` / `df$.shadcn.tooltipStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type TooltipState = 'default' | 'visible'</code> - `setState(name, config)` takes the config of the state it names (`TooltipStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Hidden. No config. |
| `visible` | Shown (popover="hint"), anchored to its trigger. No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends TooltipState&gt;(name: S, config?: TooltipStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TooltipStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: TooltipState; config: TooltipStateConfigs[TooltipState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: TooltipState; config: TooltipStateConfigs[TooltipState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: TooltipState; config: TooltipStateConfigs[TooltipState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: TooltipState; config: TooltipStateConfigs[TooltipState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: TooltipState; config: TooltipStateConfigs[TooltipState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.tooltipApi.setState&lt;S extends TooltipState&gt;(el: HTMLElement, name: S, config?: TooltipStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TooltipStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.tooltipApi.getState(el: HTMLElement): { name: TooltipState; config: TooltipStateConfigs[TooltipState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: TooltipState; config: TooltipStateConfigs[TooltipState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.tooltipApi.render(state: { name: TooltipState; config: TooltipStateConfigs[TooltipState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: TooltipState; config: TooltipStateConfigs[TooltipState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.tooltipApi.store(el: HTMLElement): Store&lt;{ name: TooltipState; config: TooltipStateConfigs[TooltipState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: TooltipState; config: TooltipStateConfigs[TooltipState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.tooltipApi.commit&lt;S extends TooltipState&gt;(el: HTMLElement, name: S, config?: TooltipStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>TooltipStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.tooltipStates: TooltipState[]</code> | The declared states, 'default' first: <code>default</code>, <code>visible</code>. |

## Notes

- **Delay**: Default open delay is 700 ms. Set `data-delay` on the trigger to override. Set to `0` for instant.
- **Close delay**: Default is 0 ms (instant close). Set `data-close-delay` on the trigger to override.
- **Group behavior**: Once any tooltip becomes visible, subsequent tooltips in the document open instantly (skip delay). After 400 ms with no tooltip visible, the delay resets.
- **Collision avoidance**: Uses `position-try-fallbacks: flip-block, flip-inline` to automatically reposition when near viewport edges.
- **Scroll dismiss**: Open tooltips are automatically hidden when the page scrolls.
- **Escape dismiss**: Handled natively by `popover="hint"` - no extra JS needed.
- **Keyboard**: Tooltip shows on focus, hides on blur. Focus stays on trigger.
- **Disabled triggers**: Wrap a disabled button in a `<span>` with `data-tooltip-trigger` since disabled elements don't fire mouse/focus events.
- **Arrow**: Add `<div data-arrow></div>` inside the tooltip for a connecting caret. Arrow positioning is automatic based on `data-side`. The caret sits outside the border box, so `.tooltip` sets `overflow: visible` (overriding the UA popover `overflow: auto`, which would clip the caret and render a scrollbar).
