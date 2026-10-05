---
name: Presentation
type: TPL
why: Fixed artboard slides + df$.anim slide transitions + the shared Motion entrance vocabulary + native <progress> - the deck engine needs no presentation library.
when: Slide decks and keynotes on a fixed coordinate canvas (1600×900 default) - not scrollable content (that is a page, use blocks).
where: dist/components/presentation/presentation.css + dist/components/presentation/presentation.js (+ dist/components/motion/motion.css for the entrances)
supportedStates: default, notes, fullscreen
---

# Presentation

## Native basis

`.presentation` mount + `[data-slide]` sections, activated by attribute
(`[data-active]`), hidden ones made `inert` + `aria-hidden`. The fixed
artboard is scaled uniformly by one CSS custom property
(`--presentation-scale`, maintained by a ResizeObserver - never a resize
listener). Entrances are the shared [Motion](../motion/component-skill.md)
vocabulary (`[data-df-entrance]` / `[data-df-draw]` keyframes) replayed by the
runtime on slide activation. Every slide change is a TRANSITION through the
shared `df$.anim` engine: the leaving slide plays its out-animation, the
arriving slide its in-animation (default fade, 1.5 s). JS is otherwise only
keyboard/click/hash navigation, slide lifecycle, counters, media, notes and
fullscreen.

## Native Web APIs

- [`inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert) - inactive slides leave tab order and AT without JS focus traps
- [`<progress>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) - the deck advance indicator, themed with `accent-color`
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - re-scales the artboard on every mount resize (no `window.resize` math)
- [`Element.requestFullscreen()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen) - native presentation fullscreen on the mount element
- [`hashchange`](https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event) - `#slide-id` deep links drive the deck
- [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - animated counters (the one effect CSS cannot express)
- [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - locale-correct counter formatting
- [`zoom`](https://developer.mozilla.org/en-US/docs/Web/CSS/zoom) - the uniform 1600×900 → viewport mapping of the slides (their `transform` stays free for the transitions)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) via `df$.anim` - slide in/out transitions and the blocks curtain
- [`clip-path`](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path) - the wipe/wipe-up/iris entrances (inset/circle interpolation, no JS)
- [`perspective()`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/perspective) - the flip entrance's 3D card lift
- [`accent-color`](https://developer.mozilla.org/en-US/docs/Web/CSS/accent-color) - themes the native progress bar
- [`text-wrap: balance/pretty`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - slide headings and ledes
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - reveals/counters settle instantly (built in, required)
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - chrome stays legible

## Structure

```html
<section class="presentation" tabindex="-1" data-current-slide="0" aria-label="Quarterly review">
  <!-- slide 1: fixed 1600×900 artboard coordinates, uniformly scaled.
       Entrances are the shared motion vocabulary (data-df-entrance, Motion
       component) - the runtime replays them on slide activation. -->
  <section class="slide" data-slide id="cover" data-theme="ink" aria-label="Cover">
    <p class="presentation-eyebrow" data-df-entrance="up">Beiratssitzung</p>
    <h1 class="presentation-title" data-df-entrance="up" style="--df-motion-delay:200ms">
      Where does the industry stand?
    </h1>
    <p class="presentation-lede" data-df-entrance="up" style="--df-motion-delay:400ms">
      Survey results · <span data-count="118">118</span> respondents
    </p>
    <p class="presentation-note">Speaker: start with the methodology slide.</p>
  </section>

  <section class="slide" data-slide id="chart" data-theme="paper" aria-label="Chart">
    <!-- optional top header line: section label (accent tick + hairline) -->
    <header class="presentation-header"><span>Trend</span><span>Q3 · 2026</span></header>
    <svg width="400" height="120" viewBox="0 0 400 120" aria-hidden="true">
      <path data-df-draw pathLength="1" fill="none" stroke="currentColor" stroke-width="4"
            d="M0 110 C 100 10, 300 110, 400 10" />
    </svg>
    <span class="presentation-slide-number">2⁄2</span>
  </section>

  <!-- optional in-deck chrome (viewport-fixed, outside slide coordinates) -->
  <div class="presentation-controls">
    <button class="presentation-control" data-presentation-action="prev" aria-label="Previous slide">←</button>
    <span class="presentation-counter" aria-live="polite">1 / 2</span>
    <button class="presentation-control" data-presentation-action="next" aria-label="Next slide">→</button>
    <button class="presentation-control" data-presentation-action="notes" aria-label="Toggle speaker notes">N</button>
    <button class="presentation-control" data-presentation-action="fullscreen" aria-label="Toggle fullscreen">⛶</button>
  </div>
  <progress class="presentation-progress" max="2" value="1"></progress>
</section>
```

## Variants

Slide theme via `data-theme` on each `[data-slide]`:

| `data-theme` | Surface |
|--------------|---------|
| `ink` | dark artboard (`--presentation-ink` / `--presentation-ink-foreground`) |
| `paper` | light artboard (`--presentation-paper` / `--presentation-paper-foreground`) |

Entrance animations come from the **shared [Motion component](../motion/component-skill.md)**:
slides simply carry `data-df-entrance` elements (see the Motion skill for the
fifteen-direction vocabulary). The deck runtime REPLAYS every entrance when its
slide activates - `ddf$.entrance(el)` on each `[data-df-entrance]` and
`ddf$.draw(el)` on each `[data-df-draw]` (revisiting a slide re-runs its
entrances; on first load animations apply deterministically without a rendered
"from" state). The deck only tunes the shared `--df-motion-*` defaults for its
artboard (`--df-motion-distance: 3.5rem` so drifts scale with the surface);
per-element overrides work exactly as in the Motion skill —
`--df-motion-delay`, `--df-motion-duration`, `--df-motion-ease`
(`var(--presentation-spring)` for a bouncy settle). `ddf$.revealAttr(direction,
delayMs)` writes the same attributes.

The mount takes `data-loop` (wrap around at both ends) and
`data-current-slide="N"` (authored initial slide). Art direction is the local
custom-property surface: `--presentation-width` / `--presentation-height`
(artboard), `--presentation-ink` / `--presentation-paper` /
`--presentation-accent`, `--presentation-out` / `--presentation-spring`
(easing), and the shared `--df-motion-*` timing defaults.

### Slide transitions

Declare them once on the mount (deck-wide) or per slide (overrides the deck):

| Attribute | Meaning |
|-----------|---------|
| `data-anim-in` / `data-anim-out` | any `df$.anim` channel (`fadeIn`, `slideIn`, `zoomIn`, `popIn`, `flipIn`, `skewIn`, `blurIn`, `wipeIn`, `irisIn`, `spinIn` / the `…Out` twins). Default `fadeIn` / `fadeOut`. Unknown names throw. |
| `data-anim-in="blocksIn"` | a curtain: blocks cover the leaving slide, the slides swap underneath, the blocks roll off the arriving slide (cover + reveal share the duration) |
| `-direction` / `-duration` / `-easing` / `-origin` / `-distance` / `-scale` / `-blocks` / `-stagger` / `-color` | per-phase engine config, e.g. `data-anim-in-distance="160px"`; direction defaults to the travel (forward arrives from the east) |

The curtain colour is never the slide colour: a declared
`data-anim-in-color` is used when it contrasts (WCAG ratio ≥ 1.6) with BOTH
slide surfaces; otherwise the runtime picks the first candidate that does —
`--presentation-accent`, the leaving slide's text colour, ink, paper.
Navigating during a transition settles it first (fast arrow keys are never
swallowed). `prefers-reduced-motion` collapses every transition to 1 ms.

### The chart stage (one morphing chart per deck)

```html
<section class="presentation" id="deck">
  <div class="chart presentation-stage" role="img" aria-label="…"></div>
  <section class="slide" data-slide data-theme="ink" data-chart-state="bars">…</section>
  <section class="slide" data-slide data-theme="ink" data-chart-state="donut">…</section>
  <section class="slide" data-slide data-theme="paper">(no chart - the stage fades out)</section>
</section>
<script>
  window.addEventListener('load', () => {
    df$.shadcn.chart.deck(document.getElementById('deck'), { base: { … }, states: { bars: { … }, donut: { … } } });
  });
</script>
```

`.presentation-stage` is laid out in artboard coordinates above the slides.
Every chart slide is a state of the SAME ECharts instance, so moving between
them morphs (see the Chart skill). A chart placed directly inside a slide
(not on the stage) replays its entrance whenever its slide becomes active.

### Media and components on slides

- `<video autoplay muted loop playsinline>` inside a slide plays only while
  that slide is active (restarting on every arrival) and pauses otherwise.
- Shipped components inside a slide (table, badge, button, avatar,
  accordion, image …) take the slide's colours: the semantic tokens
  (`--background`, `--foreground`, `--muted*`, `--border`, `--primary` …)
  are re-pointed at the slide surface per `data-theme`.

## Sizes

The slide canvas is NOT responsive by design - the artboard
(`--presentation-width`/`--presentation-height`, default 1600×900) scales
uniformly to the mount via `--presentation-scale`. The mount itself is fluid
(width:100%, `aspect-ratio: w / h`); `[data-fullscreen]` pins it to the
viewport. Inside slides, size everything in px/rem artboard units - they all
scale together.

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `aria-hidden="true"` + `inert` | every inactive `[data-slide]` | hidden slides hold no interactive surface |
| `aria-label` | mount / slides | deck + slide names for AT |
| `aria-live="polite"` | `.presentation-counter` | slide position announcements |

## Keyboard

| Key | Action |
|-----|--------|
| `→` / `Space` / `PageDown` | next slide |
| `←` / `PageUp` | previous slide |
| `Home` / `End` | first / last slide |
| `N` | toggle presenter notes |
| `F` | toggle fullscreen |

Keys route to the focused deck (or the first deck on the page); typing in
form fields and Space on focused controls are never hijacked. Give the mount
`tabindex="-1"` when it should receive programmatic focus (clicking its
surface does not move focus on its own).

## States

| State | Meaning |
|-------|---------|
| `default` | the authored surface (slide count + mode flags unchanged); `setState('default', { index })` activates slide N |
| `notes` | presenter notes of the active slide visible (`[data-notes]`) |
| `fullscreen` | the mount occupies the viewport (`[data-fullscreen]`): native browser fullscreen, or the fixed-overlay fallback where the request is denied |

```js
const deck = document.querySelector('.presentation');
deck.api.setState('notes');                    // show speaker notes
deck.api.setState('default', { index: 3 });    // jump to slide 4
deck.api.getState();                           // { name, config: { slide, notes, fullscreen } }

// imperative scope via the shared library alias (installed by core.js/all.js):
ddf$.presentation(deck).next();                // clamped navigation
ddf$.presentation(deck).goTo(0);               // absolute, clamped
```

The deck's entrances ARE the shared Motion component - see
[../motion/component-skill.md](../motion/component-skill.md) for the fifteen
`data-df-entrance` directions, `data-df-stagger`, `data-df-draw` and the
`--df-motion-*` timing surface. Helper parity in the shared library:
`ddf$.revealAttr('wipe', 400)` returns exactly those attributes,
`ddf$.entrance(el, 'flip', { duration: 300 })` triggers them imperatively,
`ddf$.animateCount(el, { to, duration, delay })` is the counter runtime
(reduced-motion aware). The JSX-equivalent `<Reveal>` / `<CountUp>` wrappers
from the design notes are these attributes - one contract, no second technique.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.presentationApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.presentationStates` = `default`, `notes`, `fullscreen`.

## Notes

- The artboard coordinate system is the feature: keep SVG geometry and
  composition in artboard px and the scale handles every viewport; do not add
  media queries inside slides.
- Entrances replay every time a slide activates - revisiting a slide re-runs
  its entrance (matching how reveal decks behave).
- The slide scale is CSS `zoom`, not `transform`: a transform on a slide
  would be overwritten by the transition keyframes.
- Counters re-animate on slide activation; `[data-count-from]`,
  `[data-count-duration]`, `[data-count-delay]`, `[data-count-decimals]`
  configure them declaratively.
- `.presentation-note` lives INSIDE its slide and is only visible while that
  slide is active and notes are on.
- Fullscreen requests may be denied (embed without `allow="fullscreen"`) —
  the `[data-fullscreen]` attribute follows the confirmed state, never a
  denied request.
