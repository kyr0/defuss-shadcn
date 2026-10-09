---
name: Play Button
type: ATM
section: actions
why: A native button - focus, Enter / Space and the disabled state come from the browser; the round shape and the triangle are pure CSS (clip-path), so one element with an accessible name is the whole component.
when: The one action that starts something - a video, a deck, a demo, content that loads on demand (the Teaser). For any other action use button; for the floating screen action use fab.
where: dist/components/play-button/play-button.css
supportedStates: default
---

# Pattern: Play Button

## Native basis

A `<button type="button">` with an accessible name (`aria-label`). The circle
is the button's own box (`border-radius: 9999px`); the triangle is its
`::before`, cut out with `clip-path`. No icon, no SVG, no JavaScript.

## Native Web APIs
- [`<button>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button) - focus, Enter / Space activation and `disabled`
- [`clip-path`](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path) - the triangle, drawn in `currentColor`
- [`scale`](https://developer.mozilla.org/en-US/docs/Web/CSS/scale) - the hover and press feedback, an individual transform property
- [`backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) - the frosted `glass` variant over a photo or a poster
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - the hover colour and the pulse ring, derived from the fill
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - the keyboard focus ring
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - no pulse, no scaling
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - a solid outline ring
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - system button colours with a border

## Structure

```html
<button class="play-button" type="button" aria-label="Play the video"></button>

<!-- larger, pulsing for attention -->
<button class="play-button" type="button" data-size="xl" data-pulse aria-label="Start the presentation"></button>

<!-- over a photo or a video poster -->
<button class="play-button" type="button" data-variant="glass" aria-label="Play the trailer"></button>
```

## Variants

| `data-variant` | Look |
| --- | --- |
| *(none)* | `--primary` fill, `--primary-foreground` triangle, a large shadow |
| `secondary` | `--secondary` fill |
| `outline` | `--background` fill, a 2px `--border` ring |
| `glass` | Frosted white over media (`backdrop-filter`) - fixed colours, the same in every theme |

`data-pulse` adds a ring that keeps growing out of the button - for the one
thing on a page that should be noticed. It stops under reduced motion.

## Sizes

| `data-size` | Diameter |
| --- | --- |
| `sm` | 3rem (48px) |
| *(none)* | 4.5rem (72px) |
| `lg` | 6rem (96px) |
| `xl` | 8rem (128px) |

`--play-button-size` sets any other diameter; the triangle and the pulse
follow it.

## ARIA

| Attribute | Element | Purpose |
| --- | --- | --- |
| `aria-label` | `.play-button` | The accessible name - say what plays ("Play the video", "Start the presentation"); the triangle is decoration |
| `disabled` | `.play-button` | Native: not focusable, not clickable, half opacity |

## Notes

- The triangle points right in every writing direction - the media convention.
- Inside a [Teaser](teaser.md) the play button starts the deferred content; the teaser makes the whole card clickable.
- `glass` needs something behind it: on a plain surface use the default or `outline`.
- The hit area is the circle; with `data-size="sm"` it is still 48px, the touch-target minimum.
