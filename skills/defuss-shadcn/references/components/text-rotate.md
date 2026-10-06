---
name: Text Rotate
type: ATM
section: primitives
why: One line at a time from a short list, rolling on an infinite CSS loop - a one-line window (1lh) and keyframes picked by the line count (:has()); no JavaScript, pauses on hover, readable by assistive tech as the full list.
when: A headline or sentence whose key word cycles ("Build faster / safer / together"), rotating taglines, a live-looking status word. For content the user must read at their own pace use a carousel or a list; for a number that counts use countdown.
where: dist/components/text-rotate/text-rotate.css
supportedStates: default
---

# Pattern: Text Rotate

## Native basis

A `<span class="text-rotate">` around one `<span>` of 2-6 lines (each a child
element). The outer span is a one-line window (`height: 1lh; overflow:
hidden`); a CSS animation moves the inner stack from line to line and back to
the first. Same markup as daisyUI's text-rotate.

## Native Web APIs

- [`lh` unit](https://developer.mozilla.org/en-US/docs/Web/CSS/length#lh) - the window is exactly one line, at any font-size / line-height
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - counts the lines and picks the matching keyframes
- [CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/animation) + [`animation-play-state`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-play-state) - the loop, paused on hover / focus
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - no rolling, the first line stays

---

## Structure

```html
<span class="text-rotate">
  <span>
    <span>ONE</span>
    <span>TWO</span>
    <span>THREE</span>
  </span>
</span>
```

### In a sentence

```html
<p class="h2">
  Build
  <span class="text-rotate">
    <span>
      <span style="color: var(--primary)">faster</span>
      <span style="color: oklch(0.6 0.16 250)">safer</span>
      <span style="color: oklch(0.65 0.17 150)">together</span>
    </span>
  </span>
  with defuss-shadcn
</p>
```

- 2 - 6 lines; each line is one child element (a span, a strong, an emoji...)
  and stays on one line (`nowrap`).
- The window is as wide as the widest line; it inherits font, size, weight,
  color and line-height from the text around it (`lh` sizing).
- Each line can carry its own color or class.

---

## Duration (`--text-rotate-duration`)

One full round through all lines - default `10s`
(`style="--text-rotate-duration: 6s"`). Each line holds for its share and
rolls on in the last 8% of it.

## Direction (`data-direction`)

`down` - the next line drops in from above (the stack is laid out bottom-up
and moves down), in the same reading order.

## Effect (`data-effect`)

`fade` - the lines crossfade in place (with a small drift) instead of rolling.

## Alignment (`data-align`)

`center` / `end` - aligns shorter lines inside the window (centered headlines).

## Pause (`data-pause`)

Hover or keyboard focus inside pauses the loop by default;
`data-pause="none"` keeps it running.

---

## Accessibility

| Concern | Handling |
| --- | --- |
| Screen readers | Every line stays in the DOM - the full list is read, no live-region churn |
| Motion | `prefers-reduced-motion: reduce` stops the loop; the first line stays |
| Reading time | Hover / focus pauses it; keep lines short and the round ≥ 6s |

## Notes

- Keep the line-height at 1.2 or more: the window is exactly one line, and a
  line-height tighter than the glyphs lets the edges of the neighbouring
  lines (accents, descenders) peek into it.
- CSS only - there is nothing to initialize, and it works in any static page.
- Keep the first line meaningful: it is what reduced-motion users and
  no-animation contexts see.
- More than 6 lines: split the idea, or use a carousel.
