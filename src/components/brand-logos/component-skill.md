---
name: Brand Logos
type: BLK
why: Logos as currentColor SVGs recolor with the theme automatically - a row of marks needs zero behavior.
when: "Trusted by" social proof band under a Hero - not for user-uploaded arbitrary images.
where: dist/components/brand-logos/brand-logos.css
supportedStates: default
---

# Pattern: Brand Logos

## Native basis
A flex-wrap row of inline SVGs. `currentColor` makes every mark follow
`--foreground` - black in light mode, white in dark (the tokens flip) - so
logos read at full theme ink; the row is softened with `opacity` instead of
a muted color, and the name text stays `--muted-foreground`.

---

## Native Web APIs
- [Inline `<svg>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/svg) - vector marks that inherit text color
- [`currentColor`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/currentcolor) - one color source for all logos
- [`flex-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/flex-wrap) - graceful wrapping without breakpoints
- [`mask-image`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image) - the rolling variant's edge fade, no overlay elements
- [`@keyframes`](https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes) - the -50% translation loop over the duplicated track
- [`animation-play-state`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-play-state) - pause on hover/focus without JavaScript

---

## Structure

Static wrapped row:

```html
<section class="mk-logos">
  <div class="mk-logos-row">
    <span class="mk-logo">
      <svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true"><!-- path --></svg>
      <span class="mk-logo-name">Logoipsum</span>
    </span>
    <span class="mk-logo">
      <svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true"><!-- path --></svg>
      <span class="mk-logo-name">Logoipsum</span>
    </span>
  </div>
  <p class="mk-logos-caption">Trusted by leading companies</p>
</section>
```

Continuous rolling variant - `.mk-logos-roll` is the clipped, edge-faded
viewport; `.mk-logos-roll-track` holds the logo set **twice** and loops by
translating -50%. The second copy is `aria-hidden="true"` (and
`tabindex="-1"` when the logos are links):

```html
<section class="mk-logos">
  <div class="mk-logos-roll">
    <div class="mk-logos-roll-track">
      <a class="mk-logo" href="…"><svg aria-hidden="true"><!-- path --></svg><span class="mk-logo-name">Logoipsum</span></a>
      <a class="mk-logo" href="…"><svg aria-hidden="true"><!-- path --></svg><span class="mk-logo-name">Logoipsum</span></a>
      <!-- duplicated set: identical order, hidden from AT and keyboard -->
      <a class="mk-logo" href="…" aria-hidden="true" tabindex="-1"><svg aria-hidden="true"><!-- path --></svg><span class="mk-logo-name">Logoipsum</span></a>
      <a class="mk-logo" href="…" aria-hidden="true" tabindex="-1"><svg aria-hidden="true"><!-- path --></svg><span class="mk-logo-name">Logoipsum</span></a>
    </div>
  </div>
  <p class="mk-logos-caption">Trusted by leading companies</p>
</section>
```

---

## Variants

| Attribute        | Value | Effect |
| ---              | ---   | ---    |
| `data-direction` | `y`   | Vertical roll on `.mk-logos-roll`: column track inside a fixed-height viewport (`--mk-logos-roll-height`), rolling upward; edge mask on the block edges. Omit for the default horizontal roll. |

### Roll configuration

Both custom properties are set on `.mk-logos-roll` (inline `style` or a wrapper rule):

| Custom property           | Default | Effect |
| ---                       | ---     | ---    |
| `--mk-logos-roll-duration` | `30s`   | Duration of one full loop - smaller = faster |
| `--mk-logos-roll-height`   | `12rem` | Viewport height of the vertical roll (`data-direction="y"` only) |

---

## ARIA

| Attribute       | Element                | Purpose                                       |
|-----------------|------------------------|-----------------------------------------------|
| `aria-hidden`   | `svg`                  | Mark is decorative; the name text conveys it  |
| `aria-hidden`   | duplicated `.mk-logo` copies in `.mk-logos-roll-track` | The loop's second half is pure repetition - screen readers must not announce it |
| `tabindex="-1"` | duplicated `.mk-logo` copies that are links | Keeps the hidden copies out of keyboard order |
| visible text    | logo name              | Screen readers read real text, never alt      |

---

## Notes
- Use brand SVGs with `fill="currentColor"` (or set `fill` per brand and keep `color` for name) - never screenshot-rasterized logos on the muted layer.
- If the row is purely decorative proof (names also listed elsewhere), `aria-hidden="true"` on the whole row is acceptable.
- 3–6 logos reads as social proof; more dilutes it and forces wrapping (the rolling variant tolerates more, since it never wraps).
- The roll is markup, not JS: duplicate the logo set yourself inside `.mk-logos-roll-track` - the `-50%` translation loops seamlessly only because the second half is identical to the first (order included). The track's `gap` plus its equal end padding are what make the halves exactly half a track apart; keep both if you override the gap.
- The roll pauses on `:hover` and `:focus-within` so visitors can read and tab through the logos.
- `prefers-reduced-motion: reduce` turns the roll back into the static wrapped row (animation off, track wraps, duplicated copy hidden) - no content is lost.
- `forced-colors: active` disables the edge mask so no logo is faded out of visibility.
