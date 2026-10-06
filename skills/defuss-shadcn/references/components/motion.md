---
name: Motion
type: ATM
section: guides
why: CSS @keyframes are the single source of truth for the entrance vocabulary; animation-composition:add keeps pre-existing transforms intact, and animations (unlike transitions) fire deterministically on first application.
when: Entrance/draw-in animations for ANY element - decks (presentation), cards, lists, dialogs - not just slides. Reach for it before writing bespoke keyframes.
where: dist/components/motion/motion.css (keyframes + [data-df-entrance]) + the JS controller in core (df$.shadcn.entrance / ddf$.entrance, src/shared/motion.ts)
supportedStates: default
---

# Motion

## Native basis

`@keyframes` + the CSS Animations model, driven declaratively by the
`data-df-entrance` attribute or imperatively through the browser's own
`CSSAnimation` objects (`el.getAnimations()`) - no class toggling, no
forced-reflow retrigger hacks, no JS-generated keyframes.

## Native Web APIs

- [`@keyframes`](https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes) - the effect geometry; one rule per direction
- [`animation-composition`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-composition) - `add` composes transform/filter entrances with the element's own values instead of replacing them
- [`Element.getAnimations()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations) - the controller collects the platform's CSSAnimation objects to replay/cancel
- [`Animation.finished`](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finished) / [`Animation.cancel()`](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel) - the lifecycle handle (`finished` rejects on cancel; the controller maps that to a plain resolve)
- [`clip-path`](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path) - the wipe/wipe-up/iris entrances (inset/circle interpolation)
- [`pathLength="1"`](https://developer.mozilla.org/en-US/docs/Web/API/SVGGeometryElement/pathLength) - calibrates distance-along-path so ONE dash rule (1 → 0) fits every stroke geometry
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - near-instant (1ms) instead of none, so the JS `finished` contract behaves identically (REQUIRED)

## Structure

Declarative (attribute applies → animation runs, including on freshly
inserted DOM):

```html
<h2 data-df-entrance="up" style="--df-motion-delay:200ms">Headline</h2>

<!-- staggered list: children get graded delays, keeping their own direction -->
<ul data-df-stagger style="--df-motion-stagger-step:150ms">
  <li data-df-entrance="up">first</li>
  <li data-df-entrance="up">second</li>
  <li data-df-entrance="up">third</li>
</ul>

<!-- SVG draw-in (distinct primitive - strokes are not transformable DOM) -->
<path data-df-draw pathLength="1" d="…" />
```

Imperative (same keyframes, replayable - installed once by core.js / all.js):

```js
ddf$.entrance(card, 'pop', { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });

const motion = ddf$.entrance(slide, 'wipe-up', { duration: 700 });
await motion.finished;   // resolves on settle (or cancel)

motion.cancel();         // deterministic unwind, removes the attribute
ddf$.draw(pathEl);       // replay a draw-in
```

## Variants

| `data-df-entrance` | Channel | Entrance |
|---------------|---------|----------|
| `up` / `down` / `left` / `right` | transform·drift | travel into place from a side |
| `zoom` / `zoom-out` / `pop` | transform·scale | from .9 / from 1.1 / snap .65→1.07→1 (overshoot) |
| `spin` / `flip` / `skew` | transform·rotational | rotate in / rotateY with perspective / skewX settle |
| `blur` | filter | focus pull from blur(12px) |
| `wipe` / `wipe-up` / `iris` | clip-path | curtain from the left / rising reveal / spotlight open |
| `fade` | opacity | quiet cross-fade |

Timing is fully variable-driven (any ancestor, container or inline style may
override - inline wins): `--df-motion-duration` (1500ms), `--df-motion-delay`
(0ms), `--df-motion-ease` (`cubic-bezier(.16,1,.3,1)`), `--df-motion-distance`
(24px), plus `--df-motion-scale-in/-out`, `--df-motion-blur`, `--df-motion-angle`,
`--df-motion-spin`. The fade ends at the element's CURRENT opacity
(`--df-motion-base-opacity`, snapshotted by the JS controller) - dimmed
content stays dimmed.

## Sizes

Not applicable - motion scales with its host element. For fixed-coordinate
surfaces (decks), set `--df-motion-distance` in the surface's own units
(the presentation component uses 3.5rem artboard units).

## ARIA

Entrance animations are purely decorative - they never convey state and are
suppressed under `prefers-reduced-motion: reduce`. Animated content must
remain readable without the animation (it is: the settled state IS the
element's normal styling).

## States

| State | Meaning |
|-------|---------|
| `default` | static stylesheet - the attribute-driven animations apply on their own; no per-element State API (no `.js` shipped; the JS controller lives in core) |

## Notes

- **Why animations, not transitions**: transitions need a rendered "from"
  state and silently never fire on initial application; animations run
  deterministically when the attribute first applies and replay cleanly
  (cancel → play) - the reason the first vocabulary demo once rendered static.
- `animation-composition: add` means an entrance never destroys a
  pre-existing `transform`/`filter` - no inspection or reconstruction needed.
- **Limit**: non-replaced inline boxes (`display: inline` spans) are not
  transformable per CSS - deliberately NOT worked around (a silent
  `display:inline-block` change would alter text wrapping). Wrap or promote
  inline content at the call site.
- Unknown effect names passed to `ddf$.entrance()` throw; the declarative
  attribute with an unknown value simply matches no rule (no animation).
- `ddf$.revealAttr('up', 400)` returns exactly
  `{ 'data-df-entrance': 'up', style: '--df-motion-delay:400ms' }` - the JSX
  `<Reveal>` idea as plain attributes.
