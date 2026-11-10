---
name: Shader
type: ATM
section: shaders
why: WebGL2 draws the effect on the GPU while the element stays a plain box - one shared context renders every instance into its own 2D canvas (no context limit, one compile per program), the CSS poster shows before the first frame, without WebGL2 and in forced colors, and the colors resolve from the theme's tokens.
when: An animated surface - a hero or section background (mesh gradient, aurora, waves), a glow running around a card, liquid metal on a logo, a dithered or holographic picture, a small 3D scene, your own GLSL. For entrance motion use Motion; for scroll-linked depth use Parallax; for a static pattern use shapes.css.
where: dist/components/shader/shader.css + dist/components/shader/shader.js - in the shaders.* extra bundle (dist/components/shaders.css + .js), loaded after all.* or core.*
supportedStates: default, paused
---

# Pattern: Shader

## Native basis

A `<div class="shader" data-effect="...">`. The runtime appends one
`<canvas class="shader-canvas" aria-hidden="true">` and draws the effect into
it. Every instance on the page shares ONE WebGL2 context: it renders the
frame, then copies it into the instance's canvas - twenty effects on a page
never meet the browser's limit of live contexts, and a program compiles once
per page - without blocking it: with `KHR_parallel_shader_compile` the driver
links programs off the main thread and an effect draws once its program is
ready; without it, each frame compiles only within a small budget. Until the
first frame (and wherever WebGL2 is missing) the element shows its poster, a
CSS gradient close to the effect.

## Native Web APIs

- [`WebGL2RenderingContext`](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext) - the GPU renders each effect as one full-viewport fragment pass (GLSL ES 3.00); fluid and trails run passes into half-float targets
- [`CanvasRenderingContext2D.drawImage()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) - copies the shared context's frame into each instance's own canvas
- [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) - only instances in the viewport draw; with none in view for a while the context is released (the canvases keep their last frame)
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - the render size follows the box
- [`requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - one loop for every instance; it stops with the tab and when nothing moves
- [`getComputedStyle()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle) - the colors resolve inside the element, so `var(--chart-1)` and tokens set on a section apply; a theme change resolves them again
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - an edited `data-*` attribute or source picture redraws
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - one still frame, no clock
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) / [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - the canvas gives way to the system colors; no moving background behind text on request

---

## Structure

```html
<!-- a block: 16 / 9 unless sized -->
<div class="shader" data-effect="mesh-gradient" aria-hidden="true"></div>

<!-- behind the content of its parent (the parent becomes position: relative + isolation: isolate) -->
<section class="hero">
  <div class="shader" data-variant="background" data-effect="aurora" aria-hidden="true"></div>
  <h1>...</h1>
</section>

<!-- a glow around its parent (a card, a button, an input) -->
<div class="card">
  <div class="shader" data-variant="border" data-effect="pulsing-border" aria-hidden="true"></div>
  ...
</div>

<!-- a picture the effect reads: it sizes the box, stays for assistive technology, and gives way to the canvas -->
<div class="shader" data-effect="liquid-metal">
  <svg viewBox="0 0 120 120" role="img" aria-label="Acme">...</svg>
</div>
<div class="shader" data-effect="dithering">
  <img src="photo.jpg" alt="..." crossorigin="anonymous" />
</div>

<!-- your own GLSL: the body after the prelude (uniforms and helpers below) -->
<div class="shader" data-effect="custom" data-rings="12" aria-hidden="true">
  <script type="x-shader/x-fragment">
    uniform float u_rings;
    void main() {
      float r = .5 + .5 * sin(length(centered()) * u_rings * TAU - u_time * 2.);
      fragColor = vec4(ramp(r), 1.);
    }
  </script>
</div>
```

- A decorative effect carries `aria-hidden="true"`; one that means
  something is `role="img"` with an `aria-label`. The canvas is always
  `aria-hidden`.
- A picture child (`<img>`, inline `<svg>`, `<video>`, `<canvas>`) is the
  effect's source: `liquid-metal` uses its shape, `dithering`, `hologram`,
  `water` and `fluted-glass` its colors. An `<img>` from another origin needs
  `crossorigin="anonymous"` and a server that allows it, else the effect runs
  without it and the picture stays visible (`data-image="blocked"`). An inline
  SVG never has that problem.

### Generated markup (do not author)

```html
<div class="shader" data-effect="aurora" data-init data-ready data-state-name="default">
  <canvas class="shader-canvas" aria-hidden="true" width="1280" height="720"></canvas>
</div>
```

`data-ready` once the first frame is on the canvas (the poster fades out),
`data-fallback` when the effect cannot run (the poster stays).

---

## Variants

| `data-variant` | Box | Use |
|-----------|-----|-----|
| *(none)* | A block, `aspect-ratio: var(--shader-aspect, 16 / 9)` - or its picture's size; height and width as you set them | A tile, a banner, a logo |
| `background` | Absolute, fills its parent behind the content (`z-index: -1`, the parent made `position: relative; isolation: isolate`) | Hero and section backgrounds |
| `border` | Absolute, `--shader-glow` (1.25rem) past the parent's edges; the effect draws a ring on the parent's edge with its corner radius and keeps the inside clear | `pulsing-border` around a card, a button, an input |

## Effects

Every effect takes `data-colors` (CSS colors separated by spaces - tokens
follow the theme) and `data-background`; its parameters are `data-*`
attributes (defaults in brackets).

| `data-effect` | Default palette | Parameters |
|-----------|-----------------|------------|
| `mesh-gradient` | the theme's chart colors | `data-distortion` (0.8), `data-swirl` (0.35), `data-grain` (0) |
| `grain-gradient` | background + chart colors | `data-softness` (0.8), `data-grain` (0.5), `data-zoom` (1) |
| `warp` | violet, rose, amber | `data-zoom` (1), `data-warp` (1), `data-contrast` (1.15) |
| `neuro-noise` | electric blue on near-black | `data-zoom` (1), `data-brightness` (1) |
| `dithering` | foreground + background (levels, dark to light) | `data-pixel` (3, CSS px), `data-reveal` (0.18 - the pointer's window with `data-interactive`), `data-contrast` (1.2) |
| `god-rays` | warm light on near-black | `data-origin-x` (0.5), `data-origin-y` (1.08), `data-density` (1), `data-intensity` (1), `data-spread` (1) |
| `aurora` | green, cyan, violet, pink | `data-intensity` (1), `data-stars` (1), `data-height` (1) |
| `pulsing-border` | chart colors | `data-thickness` (2, CSS px), `data-softness` (1), `data-spots` (3), `data-pulse` (0.6) |
| `hologram` | pastel foil | `data-intensity` (0.85), `data-scanlines` (0.6), `data-sparkle` (1) |
| `metaballs` | chart colors on the background | `data-count` (7), `data-size` (1), `data-gloss` (1) |
| `liquid-metal` | chrome | `data-repetition` (3), `data-distortion` (0.6), `data-bevel` (1), `data-shift` (0) |
| `water` | deep, shallow, light | `data-caustics` (0.8), `data-refraction` (0.5), `data-zoom` (1) |
| `fluted-glass` | coral, amber, teal, indigo | `data-flutes` (14), `data-distortion` (0.7), `data-angle` (0, degrees), `data-shade` (0.6) |
| `fluid` | five inks on black | `data-curl` (24), `data-dissipation` (0.45), `data-radius` (0.4), `data-shading` (0.6) - follows the pointer by default |
| `dot-orbit` | chart colors on the background | `data-spacing` (26, CSS px), `data-size` (0.5), `data-orbit` (0.4) |
| `topography` | chart colors on the background | `data-lines` (12), `data-thickness` (1, CSS px), `data-zoom` (1), `data-relief` (0.8) |
| `trails` | four inks on black | `data-decay` (0.978), `data-brush` (1), `data-flow` (1) - follows the pointer by default |
| `orb` | studio light, rose rim, cyan | `data-size` (1), `data-iridescence` (1), `data-wobble` (1) |
| `galaxy` | warm core, blue arms, pink nebula | `data-arms` (3), `data-twist` (2.6), `data-stars` (1), `data-tilt` (0.55) |
| `waves` | deep, shallow, horizon, zenith, sun | `data-height` (1), `data-choppy` (1), `data-camera` (1) |
| `plasma` | magenta, orange, amber, blue, violet | `data-zoom` (1), `data-warp` (1) |
| `bokeh` | five warm and cool lights on near-black | `data-size` (1), `data-density` (0.7), `data-blur` (0.5) |
| `ripple` | deep, shallow, highlight | `data-strength` (0.6), `data-decay` (0.6), `data-drops` (0.6 a second; 0 = only taps) - a press starts a ring (`u_taps`), on by default; a picture child is the water's floor |
| `voronoi` | six glass colors | `data-scale` (5), `data-lead` (0.06), `data-glow` (0.6) |
| `halftone` | foreground ink on the background | `data-cell` (8, CSS px), `data-angle` (15, degrees), `data-contrast` (1.2) - a picture child is the image it screens |
| `kaleidoscope` | the theme's chart colors | `data-segments` (8), `data-zoom` (1), `data-twist` (1) - a picture child is what it mirrors |
| `clouds` | zenith, horizon, cloud light, cloud shade | `data-cover` (0.5), `data-softness` (0.6), `data-zoom` (1) |
| `fire` | black, red, orange, amber, white | `data-intensity` (1), `data-height` (0.75), `data-zoom` (1) |
| `starfield` | white, blue and warm stars on black | `data-density` (0.6), `data-warp` (0.4), `data-twinkle` (0.5) |
| `silk` | plum, violet, rose, blush | `data-folds` (4), `data-sheen` (0.8), `data-zoom` (1) |
| `nebula` | indigo, magenta, cyan gas, white stars on near-black | `data-density` (0.9), `data-stars` (0.6), `data-zoom` (1) |
| `prism` | white, blue, pink, green on near-black | `data-spread` (0.6), `data-sparkle` (0.5), `data-angle` (-12, degrees) |
| `matrix` | dark, trail and head green on black | `data-size` (16, the glyph height in CSS px), `data-rain` (1), `data-trail` (0.6) |
| `marble` | white stone, gray veins, gold | `data-veins` (0.4), `data-flow` (1), `data-zoom` (1) |
| `oil` | asphalt, dark violet, white | `data-film` (1), `data-swirl` (1), `data-zoom` (1) |
| `op-art` | foreground + background | `data-rings` (18), `data-offset` (0.5), `data-warp` (0.3) |
| `lightning` | white bolt, blue halo on near-black | `data-bolts` (2, up to 3), `data-branch` (0.6), `data-glow` (1) |
| `snow` | night sky, horizon, flakes | `data-density` (0.55), `data-wind` (0.3, -1 to 1), `data-size` (1) |
| `fireflies` | dark forest, its glow, the lights | `data-count` (24, up to 40), `data-glow` (1), `data-drift` (1) |
| `glitch` | a test card of four colors | `data-amount` (0.7), `data-blocks` (0.5), `data-shift` (1) - a picture child is what glitches |
| `crt` | color bars | `data-curve` (0.6), `data-scanlines` (240), `data-glow` (0.6) - a picture child is what the tube shows |
| `caustics` | deep, shallow, light | `data-scale` (4), `data-light` (1), `data-warp` (0.4) |
| `smoke` | dark, lighter, smoke | `data-density` (0.8), `data-rise` (1), `data-zoom` (1) |
| `surface` | the background (grout), then three chart colors (shape classes) | `data-pattern`, `data-material`, `data-projection`, `data-motion` (see below); `data-scale` (8 tiles), `data-line` (0.06), `data-bevel` (0.5), `data-depth` (1), `data-tilt` (0.5), `data-fog` (0.5), `data-glow` (1), `data-variation` (0.15), `data-light` (135, degrees around the view), `data-elevation` (45, degrees), `data-direction` (30, degrees - where a drift runs), `data-rotation` (0, degrees - the pattern turned in its plane) |
| `custom` | chart colors | every `uniform float u_<name>` the shader declares is `data-<name>` (underscores as dashes) |

### The surface effect

An endless tiled surface: one pattern, one material, one projection and one
motion, each a word in a `data-*` attribute (the first is the default).
Every combination works - 26 x 28 x 13 x 24.

| Attribute | Words |
|-----------|-------|
| `data-pattern` | `hex`, `checker`, `grid`, `dots`, `triangles`, `diamonds`, `bricks`, `herringbone`, `weave`, `scales`, `waves`, `truchet`, `maze`, `cubes`, `circuit`, `topography`, `stripes` (bands in two colors with a groove between them), `chevron` (the stripes folded into zigzags), `circles` (rings in every cell), `octagons` (octagons with a small square between every four), `stars` (five-pointed stars, every other row moved half a cell), `stones` (rounded cobbles of a moving Voronoi net), `cells` (the raised borders of an organic net), `glyphs` (a 5 x 7 character in every cell), `crosses` (plus signs in two colors), `lattice` (a diagonal trellis with a stud at every crossing) |
| `data-material` | `bevel` (raised tiles, lit, over a darker grout (default)), `flat` (the colors as they are), `emboss` (one color, the relief alone draws the pattern), `neon` (tubes along the lines and around the shapes, a glow on black), `glass` (tiles that bend what lies behind them), `chrome` (a mirror of a studio), `ceramic` (glazed tiles in matte grout), `paper` (a matte sheet, the pattern pressed and printed in), `holo` (thin-film colors that turn with the view), `quilted` (padded cells with a stitched seam), `metal` (brushed steel, the grain along the tile), `gold` (a warm mirror), `copper` (a reddish mirror with a green patina in the grooves), `wood` (rings across each tile, every tile cut its own way), `marble` (polished stone with veins), `stone` (rough, matte and speckled), `rubber` (dark and soft), `plastic` (a clear color with a sharp white highlight), `velvet` (dark facing you, bright at the grazing edges), `ice` (cold, translucent and cracked), `lava` (dark rock over glowing grooves), `gem` (faceted, a deep color with flashes of the spectrum), `pearl` (soft white with a play of colors), `clay` (matte, the light wrapping round), `toon` (three tones and an ink outline), `glitter` (flecks that twinkle), `wireframe` (only the outlines and a fine mesh, on black), `xray` (the slopes bright and the flat dim, on black) |
| `data-projection` | `flat` (facing you (default)), `tilted` (tipped back), `floor` (an endless floor to the horizon), `wall` (a wall at an angle), `corridor` (four planes around the camera), `tunnel` (a cylinder around the camera; the pattern wraps), `sphere` (a ball before the camera; the pattern wraps), `isometric` (turned 45° and foreshortened), `ceiling` (an endless ceiling overhead), `hallway` (a floor and two walls, open to the sky), `column` (a turning column; the pattern wraps), `dome` (the inside of a ball overhead), `cube` (a turning cube, the pattern on each face) |
| `data-motion` | `drift` (slides the plane in data-direction (default); on a floor, in a corridor or a tunnel the camera moves on), `none` (stands still), `pulse` (a wave of growing and shrinking shapes), `shimmer` (a highlight sweeps across), `ripple` (rings from the pointer), `rotate` (the view turns), `warp` (the plane bends like heat haze), `mutate` (the cells re-roll one by one), `orbit` (the view circles), `zoom` (zooms in and out), `spiral` (turns faster further out), `wave` (a wave runs across, lit like cloth), `breathe` (grows a little and back), `swirl` (a vortex winds and unwinds), `rain` (a head falls down each column, a fading trail behind it - with glyphs, digital rain), `cascade` (the cells rise and sink in a diagonal wave), `flip` (every cell turns over now and then), `spin` (every cell turns on its own), `sparkle` (glints flash here and there), `cycle` (the colors run through the palette), `glitch` (bands jump sideways in bursts), `scan` (a bright line runs down the picture), `domino` (the cells change color in a wave), `shake` (a short tremor now and then) |

Mutation stays subtle by default: `data-variation` (0.15) jitters each
cell's lightness and the share of second-class cells; `mutate` changes the
structure; `data-interactive` moves the light with the pointer.
`df$.shadcn.shader.options('surface')` lists the words. Far away, where a
tile is smaller than a pixel, the pattern is not evaluated at all - only its
average color (the material over a flat tile, mixed by how much of a tile
the pattern covers) - so the horizon is smooth and cheap; the fog and the
sky start from the same color and a haze lies along the horizon line, so it
has no seam. The effect runs with `aa: 'fxaa'` and `temporal` smoothing
(see below).

## Controls

```html
<div class="shader" id="hero" data-effect="surface" aria-hidden="true"></div>
<div class="shader-controls" data-shader-for="hero" data-controls="effect options params colors speed actions"></div>
```

A `.shader-controls` box with `data-shader-for` (the id of a `.shader`) is
filled by the runtime from the target's effect, in the order
`data-controls` names (default `options params colors speed actions`):
`effect` and every named choice (`options`) as a `<select class="select">`
between a previous and a next button that start over at either end, every
parameter (`params`) as a `.slider` with its `<output>` (the range from the
effect, else from the parameter's name, else around its default), the
palette (`colors`) as color inputs, `speed` as a slider, and `actions` - a
pause / play toggle (`aria-pressed`, through `setState`) and Reset (every
attribute the controls wrote back to its authored value). A change writes
the target's `data-*` attribute; another effect first restores the
attributes the previous one was given; a parameter or a color glides to its new
value over a quarter second, a named choice switches at once. The box is
rebuilt when the effect changes and follows attribute changes made
elsewhere.

## Attributes (on `.shader`)

| Attribute | Default | Meaning |
|-----------|---------|---------|
| `data-effect` | `mesh-gradient` (`custom` with a shader child) | The effect |
| `data-colors` | the effect's palette | CSS colors separated by spaces (up to 8); `var(--primary)` and other tokens resolve inside the element |
| `data-background` | the effect's (often transparent) | The color behind; `transparent` lets the page show through where the effect is light |
| `data-speed` | `1` | The clock rate; `0` holds the still frame |
| `data-time` | the effect's still frame | Seconds on the clock to start at - the poster frame and the frame shown under reduced motion |
| `data-interactive` | off (on for `fluid`, `trails`, `ripple`) | Follow the pointer: over the element, or over the parent for `background` / `border`. Never captures events |
| `data-quality` | `auto` | `low` (half a pixel per CSS pixel), `auto` (device pixels up to 1.5, a pixel budget, lowered while frames run late), `high` (up to 2) |
| `data-fps` | display rate | A frame-rate cap (`30` for a quiet background) |
| `data-seed` | `0` | Another arrangement of the same effect |
| `data-fit` | `contain` for a shape, else `cover` | How a picture source fills the box |
| `data-<option>` | the option's first word | A named choice of the effect (`data-pattern` of `surface`): the shader reads the word's index |
| `data-aa` | the effect's (`fxaa` for `surface`, `silk`, `marble`, `caustics`) | `fxaa`: an anti-aliasing pass over every frame; `none` |
| `data-smooth` | the effect's (0.6 for `surface`, else 0) | 0 - 0.95: how much of the last frame each frame keeps where the effect marks detail finer than a pixel - the moving far plane stops crawling |
| `--shader-aspect` | `16 / 9` | The block's aspect ratio |
| `--shader-glow` | `1.25rem` | How far the `border` variant reaches past its parent |
| `--shader-poster` | a gradient per effect | The CSS background shown before the first frame and without WebGL2 |

## The GLSL prelude (custom shaders)

A custom shader is GLSL ES 3.00: write the body, the prelude comes first. It
declares `in vec2 v_uv` (0-1, origin bottom left), `out vec4 fragColor`
(premultiplied alpha) and:

| Uniform | Meaning |
|---------|---------|
| `u_resolution` | the render size in device pixels |
| `u_time`, `u_delta` | seconds on the effect's clock, and since the last frame |
| `u_pointer`, `u_hover` | the eased pointer in `v_uv` space, and 0-1 while it is over the element |
| `u_colors[8]`, `u_color_count` | the resolved palette (sRGB) |
| `u_background` | the resolved background (sRGB + alpha) |
| `u_image`, `u_has_image` | the source picture fitted to the box, and 1 when there is one |
| `u_pixel_ratio` | device pixels per CSS pixel the effect renders at |
| `u_seed` | `data-seed` |
| `u_taps[8]`, `u_tap_count` | the last presses on an interactive effect: `xy` in `v_uv` space, `z` the time on the effect's clock |

Helpers: `hash12`, `hash22`, `hash33`, `gnoise` (gradient noise, 2D),
`gnoise3`, `fbm(p, octaves)`, `rot(angle)`, `aspect()`, `centered()` (`v_uv`
centered, x scaled by the aspect), `toOklab` / `fromOklab` / `mixOk`,
`color(i)`, `ramp(t)` (the palette, mixed in Oklab), `rampCycle(t)`,
`dither(c)`, `image(uv)`, `backdrop()`, `over(c, alpha)`, `sdRoundBox`,
`PI`, `TAU`. A source that starts with `#version` is used as it is.

---

## Events

| Event | When | Detail |
|-------|------|--------|
| `shader-ready` | The first frame is on the canvas | `{ effect, width, height, pixelRatio }` |
| `shader-error` | The effect cannot run - no WebGL2, an unknown effect, a GLSL error | `{ effect, message }` |

---

## States

| State | Meaning |
|-------|---------|
| `default` | Running - the clock moves (one still frame under reduced motion). `{ effect, speed, colors }` write their `data-*` attributes |
| `paused` | Frozen on one frame - `{ time }` jumps to a moment; the pointer and a resize still redraw it |

```js
const el = document.querySelector('.shader');
el.api.setState('paused', { time: 4 });          // hold the frame at 4 s
el.api.setState('default', { effect: 'waves' });  // run another effect
el.api.getState(); // → { name: 'default', config: { time: 4, effect: 'waves' } }
```

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ShaderState = 'default' | 'paused'</code> - `setState(name, config)` takes the config of the state it names (`ShaderStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Running - the effect's clock moves (under reduced motion it holds its still frame). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>effect?</code></td><td><code>string</code></td><td>the effect to show, a name from df$.shadcn.shader.effects() - written to data-effect</td></tr><tr><td><code>speed?</code></td><td><code>number</code></td><td>the clock rate, 1 = the effect's own pace - written to data-speed</td></tr><tr><td><code>colors?</code></td><td><code>string</code></td><td>the colors, CSS colors separated by spaces - written to data-colors</td></tr></table> |
| `paused` | Frozen on one frame - the clock stops; the pointer and a resize still redraw it. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>effect?</code></td><td><code>string</code></td><td>the effect to show - written to data-effect</td></tr><tr><td><code>speed?</code></td><td><code>number</code></td><td>the clock rate - written to data-speed</td></tr><tr><td><code>colors?</code></td><td><code>string</code></td><td>the colors - written to data-colors</td></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>seconds on the effect's clock to freeze at (default: where it is)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ShaderState&gt;(name: S, config?: ShaderStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ShaderStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ShaderState; config: ShaderStateConfigs[ShaderState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ShaderState; config: ShaderStateConfigs[ShaderState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ShaderState; config: ShaderStateConfigs[ShaderState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ShaderState; config: ShaderStateConfigs[ShaderState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ShaderState; config: ShaderStateConfigs[ShaderState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.shaderApi.setState&lt;S extends ShaderState&gt;(el: HTMLElement, name: S, config?: ShaderStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ShaderStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.shaderApi.getState(el: HTMLElement): { name: ShaderState; config: ShaderStateConfigs[ShaderState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ShaderState; config: ShaderStateConfigs[ShaderState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.shaderApi.render(state: { name: ShaderState; config: ShaderStateConfigs[ShaderState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ShaderState; config: ShaderStateConfigs[ShaderState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.shaderApi.store(el: HTMLElement): Store&lt;{ name: ShaderState; config: ShaderStateConfigs[ShaderState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ShaderState; config: ShaderStateConfigs[ShaderState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.shaderApi.commit&lt;S extends ShaderState&gt;(el: HTMLElement, name: S, config?: ShaderStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ShaderStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.shaderStates: ShaderState[]</code> | The declared states, 'default' first: <code>default</code>, <code>paused</code>. |

### `df$.shadcn.shader`

| Member | Description |
|---|---|
| <code>effects(): string[]</code> | The names of the effects a .shader can show - the built-in ones and those added with register(). <b>Returns</b> <code>string[]</code> - the effect names, for data-effect |
| <code>options(effect: string): Record&lt;string, string[]&gt;</code> | The named choices of an effect - data-&lt;name&gt; takes one of the words (the surface effect: pattern, material, projection, motion). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>effect</code></td><td><code>string</code></td><td>the effect name</td></tr></table> <b>Returns</b> <code>Record&lt;string, string[]&gt;</code> - option name to its words, the first word the default ({} for an effect without options) |
| <code>register(name: string, effect: ShaderEffect): void</code> | Add an effect under a name; data-effect="&lt;name&gt;" shows it. Its params become data-* attributes, its colors the default palette. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the effect name (a lowercase word, dashes allowed)</td></tr><tr><td><code>effect</code></td><td><code>ShaderEffect</code></td><td>the fragment shader and its defaults</td></tr></table> |
| <code>stats(): ShaderStats</code> | The engine as it is now - contexts, programs, instances, frames, the adaptive scale. <b>Returns</b> <code>ShaderStats</code> - the counts |
| <code>frame(target: string \| HTMLElement): Promise&lt;void&gt;</code> | Draw the element's next frame - after a change from outside (a token, a picture drawn into a source canvas). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .shader element or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves once the frame is on the canvas (at once for an element without an effect or out of view) |

### Events

| Event | Description |
|---|---|
| `shader-error` | Fires when the effect cannot run - no WebGL2, an unknown effect, a GLSL error; the poster stays. <code>detail</code>: <code>ShaderErrorDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>effect</code></td><td><code>string</code></td><td>the effect that cannot run</td></tr><tr><td><code>message</code></td><td><code>string</code></td><td>why: no WebGL2, an unknown effect, a GLSL compile or link error (the driver's log)</td></tr></table> |
| `shader-ready` | Fires once the first frame is on the canvas (the poster fades out). <code>detail</code>: <code>ShaderReadyDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>effect</code></td><td><code>string</code></td><td>the effect on the canvas</td></tr><tr><td><code>width</code></td><td><code>number</code></td><td>the canvas width in device pixels</td></tr><tr><td><code>height</code></td><td><code>number</code></td><td>the canvas height in device pixels</td></tr><tr><td><code>pixelRatio</code></td><td><code>number</code></td><td>device pixels per CSS pixel the effect renders at (quality and the adaptive scale)</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `ShaderEffect` | An effect: a fragment shader and its defaults - df$.shadcn.shader.register() adds one. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>fragment</code></td><td><code>string</code></td><td>GLSL ES 3.00 - the body after the prelude (its uniforms and helpers come first), or a whole shader starting with #version</td></tr><tr><td><code>params?</code></td><td><code>Record&lt;string, number&gt;</code></td><td>numeric parameters, name to default: the shader declares `uniform float u_&lt;name&gt;`, the element sets it with data-&lt;name&gt; (underscores written as dashes)</td></tr><tr><td><code>colors?</code></td><td><code>string[]</code></td><td>the default colors, any CSS color - var(--chart-1) follows the theme</td></tr><tr><td><code>background?</code></td><td><code>string</code></td><td>the default background color (transparent when omitted)</td></tr><tr><td><code>still?</code></td><td><code>number</code></td><td>seconds on the effect's clock for the still frame - the first frame, and the only one under reduced motion</td></tr><tr><td><code>image?</code></td><td><code>'mask' \| 'image'</code></td><td>'mask': a source image is the shape, contained in the box; 'image': the effect samples the picture, covering the box</td></tr><tr><td><code>interactive?</code></td><td><code>boolean</code></td><td>true: follows the pointer without data-interactive</td></tr><tr><td><code>cost?</code></td><td><code>number</code></td><td>resolution factor for the costly ones (0.5 - 1)</td></tr><tr><td><code>sortColors?</code></td><td><code>boolean</code></td><td>true: the colors are levels, ordered from dark to light</td></tr><tr><td><code>options?</code></td><td><code>Record&lt;string, string[]&gt;</code></td><td>named choices, name to the words it accepts: the shader declares `uniform float u_&lt;name&gt;`, data-&lt;name&gt; picks a word and the uniform holds its index (the first word is the default)</td></tr><tr><td><code>ranges?</code></td><td><code>Record&lt;string, [number, number, number]&gt;</code></td><td>the slider range of a parameter in generated controls, name to [min, max, step] (default: a range around the default value)</td></tr><tr><td><code>aa?</code></td><td><code>'fxaa' \| 'none'</code></td><td>'fxaa': an anti-aliasing pass over every frame (data-aa overrides it)</td></tr><tr><td><code>temporal?</code></td><td><code>number</code></td><td>0 - 0.95: how much of the last frame each frame keeps where the shader marks detail finer than a pixel (its alpha) - temporal smoothing for opaque effects (data-smooth overrides it)</td></tr></table> |
| `ShaderErrorDetail` | What shader-error carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>effect</code></td><td><code>string</code></td><td>the effect that cannot run</td></tr><tr><td><code>message</code></td><td><code>string</code></td><td>why: no WebGL2, an unknown effect, a GLSL compile or link error (the driver's log)</td></tr></table> |
| `ShaderReadyDetail` | What shader-ready carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>effect</code></td><td><code>string</code></td><td>the effect on the canvas</td></tr><tr><td><code>width</code></td><td><code>number</code></td><td>the canvas width in device pixels</td></tr><tr><td><code>height</code></td><td><code>number</code></td><td>the canvas height in device pixels</td></tr><tr><td><code>pixelRatio</code></td><td><code>number</code></td><td>device pixels per CSS pixel the effect renders at (quality and the adaptive scale)</td></tr></table> |
| `ShaderStats` | What df$.shadcn.shader.stats() reports - the engine as it is now. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>supported</code></td><td><code>boolean</code></td><td>false once WebGL2 turned out to be missing</td></tr><tr><td><code>contexts</code></td><td><code>number</code></td><td>WebGL contexts the page holds: 0 before the first visible effect (and after a long time with none in view), else 1</td></tr><tr><td><code>programs</code></td><td><code>number</code></td><td>programs compiled in that context</td></tr><tr><td><code>instances</code></td><td><code>number</code></td><td>bound .shader elements</td></tr><tr><td><code>visible</code></td><td><code>number</code></td><td>of those, in the viewport</td></tr><tr><td><code>animating</code></td><td><code>number</code></td><td>of those, running their clock now</td></tr><tr><td><code>frames</code></td><td><code>number</code></td><td>frames drawn since the page loaded, every instance counted</td></tr><tr><td><code>scale</code></td><td><code>number</code></td><td>the adaptive resolution factor: 1 (full quality), 0.75 or 0.5 while frames run late</td></tr></table> |

---

## Accessibility

| Concern | Handling |
|---------|----------|
| Screen readers | The canvas is `aria-hidden`; mark a decorative effect `aria-hidden="true"`, a meaningful one `role="img"` + `aria-label`. A picture source keeps its `alt` (it stays in the DOM, transparent) |
| Motion | `prefers-reduced-motion: reduce`: one still frame (`data-time`), no clock; the State API's `paused` is a pause button's whole job |
| Contrast | `prefers-contrast: more` hides the `background` variant - no moving picture behind text; forced colors show the system canvas color and the source picture |
| Pointer | `data-interactive` only listens (pointer listeners on the document that never call `preventDefault`) - it never captures clicks or scrolling |
| No WebGL2 / no script | The poster - a gradient of the same palette - and the source picture stay |

## Notes

- Text over a `background` effect needs a contrast check against its
  lightest and darkest frames - pick colors (or `data-background`) that keep
  the text readable everywhere.
- One context draws everything: an effect costs GPU time only while it is
  in the viewport, its clock runs and the tab shows. `data-fps="30"` and
  `data-quality="low"` make a large background cheaper still.
- Layer effects like any boxes: two `background` shaders with
  `mix-blend-mode` on the upper one compose (`screen`, `overlay`).
- `df$.shadcn.shader.register(name, { fragment, params, colors })` adds an
  effect for the whole page; `df$.shadcn.shader.frame(el)` redraws one after
  a change from outside (a picture drawn into a source canvas).
- Every effect is written for this system - no third-party shader code.
