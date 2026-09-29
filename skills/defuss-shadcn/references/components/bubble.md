---
name: Bubble
type: ATM
why: A chat bubble is a styled block - variants, alignment, groups with tightened corners, tails, overlapped reactions and typing dots are all CSS; interactive bubbles are real <a>/<button>, collapsible ones a native <details>.
when: The message surface of a chat, assistant reply or comment thread. Avatars, names, timestamps and message actions belong to the message row around it; a system notice across the thread is an alert.
where: dist/components/bubble/bubble.css
supportedStates: default
---

# Bubble

## Native basis

A `.bubble` wrapper around a `.bubble-content` surface - a `<div>` for text,
an `<a>` or `<button>` when the whole bubble is an action (quick replies,
links), a `<details class="bubble-more">` inside it for "Show more".
Optional `.bubble-reactions` hang on its edge; a `.bubble-group` stacks
consecutive bubbles of one sender. CSS only - after shadcn/ui's Bubble,
plus tails, sizes, media bubbles and a typing indicator.

## Native Web APIs

- [`<details>` / `<summary>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - collapsible bubble content, keyboard-operable with no script
- [`::details-content`](https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content) + [`interpolate-size`](https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size) - the "Show more" height animates to `auto`
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - tinted and destructive surfaces from the theme tokens
- [Logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) - `border-start-end-radius`, `margin-inline-start`: groups, tails and alignment mirror in RTL
- [`mask`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask) - the curved tail
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - the ring on link / button bubbles
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

## Structure

```html
<!-- received -->
<div class="bubble" data-variant="secondary">
  <div class="bubble-content">Hey! Did the deploy go out?</div>
</div>

<!-- sent, with reactions -->
<div class="bubble" data-align="end">
  <div class="bubble-content">Yes - 5 minutes ago.</div>
  <div class="bubble-reactions" role="img" aria-label="Reactions: thumbs up, party popper, 2 more">
    <span>👍</span><span>🎉</span><span class="bubble-reactions-count">+2</span>
  </div>
</div>

<!-- a group from one sender, tail on the last bubble -->
<div class="bubble-group" data-align="end" data-tail>
  <div class="bubble"><div class="bubble-content">Can you tell me what's the issue?</div></div>
  <div class="bubble"><div class="bubble-content">Screenshots help too.</div></div>
</div>

<!-- whole bubble as an action -->
<div class="bubble" data-variant="outline">
  <button class="bubble-content" type="button">I forgot my password</button>
</div>

<!-- collapsible: a preview, the rest behind Show more -->
<div class="bubble" data-variant="secondary">
  <div class="bubble-content">
    <p>First paragraph …</p>
    <details class="bubble-more">
      <summary><span class="bubble-more-closed">Show more</span><span class="bubble-more-open">Show less</span></summary>
      <p>The rest …</p>
    </details>
  </div>
</div>

<!-- media -->
<div class="bubble" data-align="end">
  <div class="bubble-content" data-media>
    <img src="…" alt="…">
    <p class="bubble-caption">Sunset from the office</p>
  </div>
</div>

<!-- typing -->
<div class="bubble" data-variant="secondary">
  <div class="bubble-content" role="status" aria-label="Sofia is typing">
    <span class="bubble-typing" aria-hidden="true"><span></span><span></span><span></span></span>
  </div>
</div>
```

A chat thread is just a column of bubbles and groups (e.g. `flex flex-col gap-3`).
Bubbles size to their content up to 80 % of that column.

## Variants (`data-variant` on `.bubble`)

| Value | Surface | Use |
|-------|---------|-----|
| *(none)* / `default` | `--primary` | Your own messages - the strong bubble |
| `secondary` | `--secondary` | The other side - neutral conversation |
| `muted` | `--muted`, muted text | Lower-emphasis, supporting content |
| `tinted` | primary 12 % over the background | A subtle primary bubble |
| `outline` | background + border | Rich content, options, cards in a thread |
| `ghost` | none, full width, no side padding | Assistant replies / markdown |
| `destructive` | destructive tint + border | Failed / error messages |

## Alignment and grouping

| Attribute | Effect |
|-----------|--------|
| `data-align="end"` on `.bubble` or `.bubble-group` | Pushed to the end (sent) side; its reactions / items align there |
| *(default)* start | The received side |
| `.bubble-group` | Consecutive bubbles, 3px apart; the corners between them tighten on their own side |
| `data-tail` on `.bubble` or `.bubble-group` | A curved tail at the bottom outer corner (a group: its last bubble). Not on ghost / outline / destructive |

## Reactions (`.bubble-reactions`)

Emoji overlapped in a pill on the bubble's edge; a `.bubble-reactions-count`
("+2") ends it. `data-side="top"` puts it on the upper edge, `data-align="start"`
on the start side (default bottom end).

## Sizes (`data-size` on `.bubble`)

`sm` (0.8125rem text, tighter padding) · *(default)* 0.875rem · `lg` (1rem).

## Accessibility

| Element | Attribute |
|---------|-----------|
| `.bubble-reactions` | `role="img"` + `aria-label` naming the reactions, so they are read once, together |
| typing bubble | `role="status"` + `aria-label` ("Sofia is typing"); the dots `aria-hidden` |
| action bubble | a real `<a href>` / `<button>` - focusable, with a visible focus ring |
| media | `alt` on the image; the caption as text |

- Don't carry meaning by color alone: a failed message also says so ("Not delivered - tap to retry").
- A thread is a `role="log"` region when new messages arrive live (`aria-live="polite"` is implied).

## Notes

- The tail draws with the bubble's background over whatever sits behind it
  (a mask, not a cut-out), so it works on any page color.
- Put a tooltip or popover on a `<button class="bubble-content">` for read
  receipts or error details - see the doc page examples.
- Names, avatars and timestamps are the message row's job (a later Message
  component); a bubble stays the surface.
- CSS only.
