---
name: Diff
type: ATM
why: Two stacked layers split by a native <input type="range"> - drag anywhere, arrow keys, touch and a screen-reader value come from the platform; a clip-path does the reveal.
when: Before / after comparisons - photo edits, redesigns, old vs new screenshots, rendered vs source text. For side-by-side panels the user resizes use resizer.
where: dist/components/diff/diff.css + dist/components/diff/diff.js
supportedStates: default, before, after
---

# Pattern: Diff

## Native basis

A `<figure>` with two layers in one grid cell - `.diff-item-1` (before)
over `.diff-item-2` (after) - and an `<input type="range" class="diff-range">`
as the divider. `clip-path: inset()` cuts item 1 at the range's position.

## Native Web APIs

- [`<input type="range">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range) - the divider: arrow keys, Page Up/Down, Home/End, touch and the announced value
- [`clip-path: inset()`](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path) - reveals item 1 up to `--diff-pos`, no layout work
- [Pointer capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - the whole figure is a drag surface
- [`writing-mode: vertical-lr`](https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode) - the vertical range (top ↔ bottom)
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) / [`<figcaption>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption) - the comparison and its caption as one unit
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) / [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - system colors, no knob animation

---

## Structure

```html
<figure class="diff" data-ratio="16/9">
  <div class="diff-item-1">
    <img src="after.jpg" alt="Retouched photo">
    <span class="diff-label">After</span>
  </div>
  <div class="diff-item-2">
    <img src="before.jpg" alt="Original photo">
    <span class="diff-label">Before</span>
  </div>
  <input class="diff-range" type="range" min="0" max="100" value="50" step="0.1" aria-label="Comparison divider">
</figure>
```

- Item 1 shows **left of** the divider (above it when vertical), item 2 the
  rest. Any content works - images, video, text, a component.
- Media inside an item fill it (`object-fit: cover`); give the figure a size:
  `data-ratio`, your own `aspect-ratio` or a height. Text content sizes the
  figure itself.
- The range's `value` is the start position; `diff.js` mirrors it into
  `--diff-pos`. Without JavaScript the figure renders a 50 / 50 split.
- `.diff-label` - an optional corner caption (item 1 top-left, item 2 top-right;
  bottom-left when vertical).

## Variants (`data-variant`)

| Value | Look |
| --- | --- |
| *(none)* | White divider + round knob with arrows |
| `line` | Divider only - no knob (it shows on keyboard focus) |
| `primary` | `--primary` divider and knob ring |

## Aspect ratio (`data-ratio`)

`16/9` · `4/3` · `1/1` · `3/4` - or set `aspect-ratio` / a height yourself.

## Orientation (`data-orientation`)

`vertical` - item 1 on top, item 2 below, the divider runs horizontally and
drags up / down.

## Follow (`data-follow`)

`hover` - with a mouse the divider follows the pointer without pressing
(touch and keyboard still drag / step).

---

## ARIA

| Element | Attribute |
| --- | --- |
| `.diff-range` | `aria-label` (e.g. "Comparison divider") - the range announces its value |
| `.diff-range` | `aria-valuetext` optional, e.g. "60% original" |
| images | `alt` on both - they are two different images |

## Keyboard

| Key | Action |
| --- | --- |
| `←` / `→` (`↑` / `↓`) | Move the divider one step |
| `Page Up` / `Page Down` | Larger steps |
| `Home` / `End` | Show only item 2 / only item 1 |

## States

| State | Meaning |
| --- | --- |
| `default` | The authored position (or `config.position`, 0-100) |
| `before` | Divider at 100% - only item 1 |
| `after` | Divider at 0% - only item 2 |

```js
document.querySelector('#photo').api.setState('default', { position: 30 });
document.querySelector('#photo').api.getState(); // → { name: 'default', config: { position: 30 } }
```

The registry global is `df$.shadcn.diffApi` / `df$.shadcn.diffStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type DiffState = 'default' | 'before' | 'after'</code> - `setState(name, config)` takes the config of the state it names (`DiffStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The divider at the authored position, or at the given one. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>position?</code></td><td><code>number</code></td><td>the divider's position, % from the start (0-100); getState() reports it</td></tr></table> |
| `before` | The divider at 100% - only the first item shows. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>position?</code></td><td><code>number</code></td><td>reported by getState(): 100</td></tr></table> |
| `after` | The divider at 0% - only the second item shows. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>position?</code></td><td><code>number</code></td><td>reported by getState(): 0</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends DiffState&gt;(name: S, config?: DiffStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DiffStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: DiffState; config: DiffStateConfigs[DiffState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: DiffState; config: DiffStateConfigs[DiffState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: DiffState; config: DiffStateConfigs[DiffState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: DiffState; config: DiffStateConfigs[DiffState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: DiffState; config: DiffStateConfigs[DiffState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.diffApi.setState&lt;S extends DiffState&gt;(el: HTMLElement, name: S, config?: DiffStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DiffStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.diffApi.getState(el: HTMLElement): { name: DiffState; config: DiffStateConfigs[DiffState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: DiffState; config: DiffStateConfigs[DiffState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.diffApi.render(state: { name: DiffState; config: DiffStateConfigs[DiffState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: DiffState; config: DiffStateConfigs[DiffState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.diffApi.store(el: HTMLElement): Store&lt;{ name: DiffState; config: DiffStateConfigs[DiffState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: DiffState; config: DiffStateConfigs[DiffState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.diffApi.commit&lt;S extends DiffState&gt;(el: HTMLElement, name: S, config?: DiffStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>DiffStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.diffStates: DiffState[]</code> | The declared states, 'default' first: <code>default</code>, <code>before</code>, <code>after</code>. |

## Notes

- Dragging anywhere on the figure moves the divider and focuses the range,
  so arrow keys continue from there.
- Every change fires the range's native `input` event - listen on it.
- RTL: the range runs right → left; the reveal follows it.
