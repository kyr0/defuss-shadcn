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

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.diffApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.diffStates` = `default`, `before`, `after`.

## Notes

- Dragging anywhere on the figure moves the divider and focuses the range,
  so arrow keys continue from there.
- Every change fires the range's native `input` event - listen on it.
- RTL: the range runs right → left; the reveal follows it.
