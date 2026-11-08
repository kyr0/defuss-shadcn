---
name: Surface
type: ATM
section: infinite-surfaces
why: CSS alone - a seamless SVG or gradient tile used as a mask paints the ink, so a texture repeats without a seam at any size, follows the theme's tokens, moves on the compositor, and tips into 3D with a perspective transform. No script, no canvas, no GPU context.
when: A repeating texture behind or inside a box - graph or ruled paper, hexagons, bricks, herringbone, circuits, topography, terrazzo, grain - flat, embossed, neon or printed, drifting or pulsing, laid flat or as a floor, a ceiling or a wall. For lit materials, tunnels, corridors, spheres and pointer-driven relief use the Shader's surface effect; for a one-off background on any element the shapes.css pattern-* utilities.
where: dist/components/surface/surface.css
supportedStates: default
---

# Pattern: Surface

## Native basis

A `<div class="surface" data-pattern="...">`. Two pseudo-elements behind
the content paint the texture: `::before` the ink, `::after` the accent. Each
is a solid color masked by a seamless tile (`mask-image` + `mask-repeat`) -
an SVG tile drawn so that every shape leaving one edge enters the opposite
one, or a gradient. The surface keeps its own content above both layers, so
it can be a section, a card or an empty block.

## Native Web APIs

- [`mask-image`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image) / [`mask-repeat`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-repeat) - the tile cuts the ink out of a solid color, so any token or color paints it
- [`mask-composite`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-composite) - the emboss rims (the tile shifted, minus the tile), the neon tube (the tile minus the tile shifted four ways) and the fade toward the horizon
- [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) - a typed tile offset, so a drift on a receding plane interpolates
- [CSS trigonometric functions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Functions#trigonometric_functions) - `cos()` / `sin()` / `round()` turn the light angle into rim offsets and the drift direction into whole tiles
- [`mix-blend-mode`](https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode) - duotone, risograph and chromatic overprint their two inks
- [`perspective()`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/perspective) / [`rotateX()`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/rotateX) - the plane tips into a floor, a ceiling or a wall
- [Container query units](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries#container_query_length_units) - the perspective is a share of the surface's width, so a projection looks the same at every size
- [`<feTurbulence stitchTiles>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence) - grain, grunge and paper noise that repeat without a seam
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - inks, rims and tubes derived from the theme's tokens
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - every motion stops
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - no texture behind text on request; the system colors replace it

---

## Structure

```html
<!-- an empty block: --surface-aspect (16 / 9) unless sized -->
<div class="surface" data-pattern="hex" aria-hidden="true"></div>

<!-- a box with content: the texture stays behind it -->
<section class="surface" data-pattern="grid" data-style="paper">
  <h2>Release notes</h2>
  <p>...</p>
</section>

<!-- behind the content of its parent (the parent becomes position: relative + isolation: isolate) -->
<div class="card">
  <div class="surface" data-variant="background" data-pattern="circuit" data-style="neon" data-motion="drift" aria-hidden="true"></div>
  ...
</div>

<!-- a floor that runs toward the horizon -->
<div class="surface" data-pattern="grid" data-style="neon" data-projection="floor" data-motion="drift" aria-hidden="true"></div>
```

- The texture is decoration: an empty surface carries `aria-hidden="true"`;
  a surface with content needs nothing (its pseudo-elements are not read).
- Text on a busy pattern needs contrast of its own - a background on the
  text, a quieter `--surface-ink`, or `data-style="paper"`.

---

## Patterns (`data-pattern`)

| `data-pattern` | Tile | Accent (`::after`) |
| --- | --- | --- |
| `grid` (default) | graph paper - thin lines every unit | a strong line every fifth |
| `ruled` | ruled paper - one line per row | - |
| `stripes` | horizontal bands | - |
| `diagonal` | 45° stripes | - |
| `dots` | one dot per cell | - |
| `polka` | offset dots | the second dot |
| `checker` | a checkerboard | - |
| `hex` | honeycomb cells | a dot in each cell |
| `triangles` | an equilateral lattice | - |
| `diamonds` | a diagonal lattice | a diamond in each cell |
| `herringbone` | parquet - horizontal bricks | the vertical bricks |
| `plaid` | translucent bands and thin lines | crossing threads |
| `waves` | sine lines | - |
| `scales` | seigaiha - fans of rings | - |
| `zigzag` | a zigzag line | - |
| `cross` | plus signs | - |
| `bricks` | running bond, the mortar open | - |
| `cubes` | tumbling blocks - the left faces | the right faces |
| `circuit` | traces | pads and vias |
| `topography` | contour lines | - |
| `terrazzo` | chips | chips of the second color |
| `carbon` | a twill of shaded strands | - |
| `pixel` | an 8-bit heart | sparkles |
| `weave` | basketweave - horizontal strands | vertical strands |
| `ornament` | interlocking circles | a dot at every petal tip |
| `fibers` | paper fibers | - |
| `grain` | fine noise | - |
| `grunge` | blotches | - |

## Styles (`data-style`)

| `data-style` | Look |
| --- | --- |
| `flat` (default) | the ink and the accent as they are |
| `emboss` | raised in the surface's own color: a lit rim toward the light, a shade away from it |
| `deboss` | pressed in: the rims swapped |
| `neon` | the edges of every shape as a bright tube in the accent color, a halo around them, on a dark surface |
| `paper` | a warm sheet with a grain, the inks printed into it |
| `outline` | the edges of the shapes alone, as thin lines |
| `glow` | the shapes in a solid color with a soft halo around them |
| `shadow` | solid shapes with a drop shadow away from the light |
| `long-shadow` | solid shapes with a long flat shadow away from the light |
| `extrude` | solid shapes with a short darker side - a block pressed out of the surface |
| `stamp` | a rubber stamp: the shapes in red ink that did not take everywhere |
| `duotone` | two inks over a tinted sheet, the accent multiplied over the ink |
| `risograph` | pink and blue plates a little off register on paper |
| `blueprint` | white lines on drafting blue over a fine grid |
| `chalk` | chalk on a green board, rough at the edges |
| `pencil` | graphite on paper, grainy |
| `glass` | translucent shapes with a bright rim toward the light on a colored ground |
| `metal` | brushed steel shapes with a bright rim, on dark |
| `gold` | polished gold shapes with a bright rim, on dark |
| `holographic` | shapes in a pastel rainbow foil with a bright rim |
| `gradient` | the shapes filled with a gradient of the chart colors |
| `rainbow` | the shapes filled with the whole hue circle |
| `cutout` | the surface inked, the shapes cut out of it |
| `halftone` | the shapes printed as a screen of dots |
| `chromatic` | the shapes in two color channels a little apart |

## Motion (`data-motion`)

Every motion moves the plane with a transform (or its opacity, or a filter), so a running motion repaints nothing, and every loop moves by whole tiles or returns, so it never jumps. A drift moves each axis on a loop of its own - one tile in the time it needs for it, added to the plane with `animation-composition: add` - so any `--surface-direction` is exact and seamless. A receding plane drifts by moving its tile instead (a typed offset), so its fade stays where it is.

| `data-motion` | Movement |
| --- | --- |
| `drift` | slides two tiles per --surface-duration in --surface-direction, at any angle; on a receding plane toward you |
| `parallax` | the ink and the accent drift at different speeds |
| `orbit` | circles one tile around its place |
| `rotate` | the plane turns slowly |
| `counter` | the ink and the accent turn in opposite directions |
| `spin-zoom` | turns while it zooms in and out |
| `sway` | rocks a few degrees back and forth |
| `swing` | swings about its vertical axis in 3D |
| `tilt` | nods about its horizontal axis in 3D |
| `wobble` | skews gently from side to side |
| `wave` | rises and falls with a slight skew |
| `bounce` | hops half a tile |
| `shake` | a short tremor, then rest |
| `glitch` | jumps sideways now and then |
| `breathe` | grows a little and back |
| `zoom` | zooms in and out |
| `heartbeat` | a double beat, then rest |
| `pulse` | the texture fades and returns |
| `flicker` | the irregular blink of a neon tube |
| `blink` | the accent switches on and off |
| `twinkle` | the accent glimmers |
| `hue` | every color turns once round the hue circle |
| `shimmer` | a light band sweeps across the ink |

## Projections (`data-projection`)

| `data-projection` | Plane |
| --- | --- |
| `flat` (default) | facing you |
| `tilted` | tipped back, the far edge fading at the top |
| `tilted-down` | tipped forward, the far edge at the bottom |
| `tilted-left` | turned to the left |
| `tilted-right` | turned to the right |
| `floor` | a floor running to a horizon |
| `floor-low` | a floor seen from low down |
| `floor-high` | a floor seen from above |
| `ceiling` | the floor mirrored overhead |
| `ceiling-low` | a low ceiling |
| `wall` | a wall receding to the right |
| `wall-left` | a wall receding to the left |
| `corridor` | two walls meeting in the distance - the ink on the left, the accent on the right |
| `horizon` | a floor and a ceiling meeting in the distance - the ink below, the accent above |
| `isometric` | turned 45° and foreshortened - the isometric view |
| `isometric-left` | the isometric view turned the other way |
| `dimetric` | the 2:1 view of pixel art |
| `trimetric` | an uneven axonometric view |
| `planometric` | turned 45°, not foreshortened |
| `cavalier` | an oblique view at full depth |
| `cabinet` | an oblique view at half depth |
| `banked` | a floor tipped sideways |

## Variants

| `data-variant` | Layout |
| --- | --- |
| (none) | a block: its content, or `--surface-aspect` when empty |
| `background` | fills its parent behind the parent's content; the parent becomes `position: relative` + `isolation: isolate` |

## Custom properties

| Property | Default | Meaning |
| --- | --- | --- |
| `--surface-size` | `24px` | the tile's unit - every pattern is a multiple of it |
| `--surface-ink` | the foreground at 16% | the ink (`::before`) |
| `--surface-accent` | the primary at 38% (neon: a bright pink) | the accent (`::after`) and the neon tube |
| `--surface-bg` | `var(--background)` (emboss / deboss: 7% toward the foreground, so the light rim shows; neon: a dark violet) | the surface |
| `--surface-light` / `--surface-shade` | the surface mixed with white / black | the emboss rims |
| `--surface-bevel` | `1.5px` | the width of the emboss rims |
| `--surface-tube` / `--surface-glow` | `1px` / `3px` (floors and ceilings: `2.5px` / `7px`) | the neon tube's width and its halo |
| `--surface-duration` | `12s` | one loop of the motion |
| `--surface-direction` | `30deg` | where a drift runs, counterclockwise from the right; on a receding plane the default runs toward you |
| `--surface-rotation` | `0deg` | the pattern turned in its plane |
| `--surface-light-angle` | `135deg` | where the light comes from (the upper left): emboss, deboss, shadows, extrusions and rims fall away from it |
| `--surface-tilt` | `62deg` | how far the plane tips (floor, ceiling, wall, tilted at half) |
| `--surface-depth` | `80cqi` | the perspective distance |
| `--surface-horizon` | from the aspect, the tilt and the default depth | where a floor's horizon lies above the bottom of the box (a ceiling's below the top) - set it when the surface fills a parent or the depth changes |
| `--surface-horizon-color` | the haze (neon, glow: the accent, lighter) | the line along the horizon |
| `--surface-aspect` | `16 / 9` | the aspect ratio of an empty block |

## ARIA

| Attribute | On | Why |
| --- | --- | --- |
| `aria-hidden="true"` | an empty `.surface` | the texture is decoration |

## States

`default` only - a surface has no state to change; its attributes pick what it shows.

## Accessibility

- Under `prefers-reduced-motion: reduce` every motion stops on its first frame.
- Under `prefers-contrast: more` the background variant disappears and the ink softens.
- Under `forced-colors: active` the texture is hidden and the surface takes the system background.

## Notes

- **Seamless by construction** - each SVG tile repeats a shape crossing an
  edge on the opposite side; the noise tiles use `stitchTiles="stitch"`.
- **Two inks** - `::before` paints `--surface-ink` through `--_t`, `::after`
  `--surface-accent` through `--_a`. A pattern without an accent leaves
  `::after` empty.
- **The plane** - each pseudo-element is a square centered on a pivot: the
  box's center, or for a receding plane its edge (where the eye sits -
  `perspective()` is taken about it). A projection tips the square about
  the pivot and moves its center along the plane to the point it turns
  about; the square is large enough that a turn about that point never
  uncovers the box. A receding plane fades out before its tiles get smaller
  than a few pixels: a linear fade measured from the center (a straight
  horizon), or a radial one while the plane spins (the same at every
  angle). A floor or a ceiling fades from 0.9 of its size at the pivot to
  0.4 - in CSS a line far off is a sampled texture and crawls once it gets
  thinner than a pixel - and a haze in the box rises from there to the
  horizon at `--surface-horizon`, where `--surface-horizon-color` draws
  the line. Every surface is an inline-size container, so the perspective
  scales with it - a surface must be a block with a width of its own.
- **Neon** draws the shape's edges: the tile minus the tile eroded by
  `--surface-tube`. A line thinner than twice that stays whole, so line
  patterns (grid, waves, circuit) glow along their length and filled
  patterns (checker, bricks, hex) along their outline. The halo is the tile
  grown by `--surface-glow` minus the tile, so a filled shape stays dark
  inside its tube.
- **Cost** - a still surface is painted once. A motion moves a
  transform, an opacity or a filter, so the compositor runs it without a
  repaint; only a drift on a receding plane (its tile offset) and shimmer
  repaint per frame. The plane is larger than the box (several times on a
  floor): a page of moving surfaces is still not free - use motion where it
  means something.
- **Heavier looks** - lit bevels, glass, chrome, ceramic, holographic foil,
  tunnels, corridors and spheres need light and depth per pixel: the
  Shader's `surface` effect draws them with the same pattern names.
