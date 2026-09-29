---
name: FAB
type: MOL
why: A floating action button whose speed dial is a native popover - toggle, Escape, outside-click close and aria-expanded come from the browser; anchor positioning stacks the actions, no JavaScript.
when: The one primary action of a screen (compose, add, new) that stays in reach while scrolling - with a speed dial when 2-6 related actions share it. For a bar of actions use toolbar; for an ordinary menu use dropdown-menu.
where: dist/components/fab/fab.css
supportedStates: default
---

# Pattern: FAB (floating action button)

## Native basis

A `<button popovertarget>` (`.btn.fab-trigger`) and a `<div popover>`
(`.fab-menu`) of action buttons, inside a fixed-position `.fab`. The Popover
API is the behavior; CSS anchor positioning places the menu at the trigger.

## Native Web APIs

- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) + [`popovertarget`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#popovertarget) - toggle, Escape, light dismiss, top layer, `aria-expanded` on the trigger
- [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) + [`anchor-scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/anchor-scope) - the menu sits at its own trigger, many FABs per page
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) + `transition-behavior: allow-discrete` - staggered pop-in / out
- [CSS `sin()` / `cos()`](https://developer.mozilla.org/en-US/docs/Web/CSS/sin) - the flower's quarter circle and centered semicircle
- [`:nth-child(n of S)`](https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-child) + [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - spreads 2-6 actions evenly, open-state icon
- [Scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline/scroll) - the extended FAB folds its label while the page scrolls
- [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop) - an optional dim layer behind the open dial
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

### Speed dial

```html
<div class="fab">
  <button class="btn fab-trigger" popovertarget="fab-actions" aria-label="Actions">
    <span class="fab-icon" aria-hidden="true">+</span>
  </button>
  <div class="fab-menu" id="fab-actions" popover>
    <button class="fab-action" popovertarget="fab-actions" popovertargetaction="hide"><svg aria-hidden="true">…</svg><span class="fab-label">Camera</span></button>
    <button class="fab-action" popovertarget="fab-actions" popovertargetaction="hide"><svg aria-hidden="true">…</svg><span class="fab-label">Photos</span></button>
    <a class="fab-action" href="/new"><svg aria-hidden="true">…</svg><span class="fab-label">Note</span></a>
  </div>
</div>
```

- Every action button carries `popovertarget="…" popovertargetaction="hide"`:
  picking an action closes the dial (native - its own click handler still
  runs). A link action navigates away anyway.
- The trigger toggles: a second click on the × closes the dial (the open
  menu never covers it - only the actions take the pointer).
- The first action sits nearest the trigger. `.fab-label` is the visible
  chip beside the action AND its accessible name.
- Without `.fab-label`, give the action an `aria-label`.
- A single FAB (no dial) is just the trigger - an ordinary button.
- The trigger's `.fab-icon` turns 45° when open (+ → ×); or give it two
  icons, `.fab-icon-closed` and `.fab-icon-open`, and the right one shows.

### Main action

```html
<div class="fab-menu" id="fab-actions" popover>
  <button class="fab-action fab-main" aria-label="New message">✏️</button>
  <button class="fab-action">…</button>
</div>
```

`.fab-main` takes the trigger's place (same size, primary) while the dial is
open - a second click does the main thing, Escape / outside click closes.

### Text actions

`<button class="fab-action"><svg …></svg><span class="fab-text">Share</span></button>` - a pill with the words inside.

### Extended FAB

```html
<div class="fab" data-shrink="scroll">
  <button class="btn fab-trigger"><span class="fab-icon" aria-hidden="true">✏️</span><span class="fab-text">Compose</span></button>
</div>
```

`.fab-text` in the trigger makes a pill. `data-shrink="scroll"` folds the
label away over the first 120px of page scroll (scroll-driven animation).

---

## Position (`data-position`)

`bottom-end` (default) · `bottom-start` · `top-end` · `top-start` · `bottom-center` - logical, so they mirror in RTL.
`data-attach="container"` - absolute inside the nearest positioned ancestor (a card, a panel) instead of the viewport.

## Direction (`data-direction`)

`up` (default) · `down` · `left` · `right` - where the actions stack. Sideways dials show labels above the actions.

## Layout (`data-layout`)

`flower` - the actions on a quarter circle around the trigger, opening toward the middle of the screen (2-6 actions spread evenly; labels are visually hidden, still the names). From `bottom-center` (or `top-center`) the arc is the upper (lower) semicircle, 30° - 150°, close around the trigger - the dock's raised action uses it, and the ends stay clear of whatever sits level with the trigger.

## Sizes (`data-size`)

| Value | Trigger | Actions |
| --- | --- | --- |
| `sm` | 2.75rem | 2.25rem |
| `md` *(default)* | 3.5rem | 2.75rem |
| `lg` | 4.25rem | 3.25rem |

## Colors

The trigger is a `.btn`: `data-tone` (`success` / `warning` / `info` /
`destructive` / `custom` + `--btn-color`) and `data-variant` apply. An
action can be a `.btn` too (`class="btn fab-action" data-tone="…"`).

## Backdrop (`data-backdrop`)

Dims and softly blurs the page while the dial is open.

---

## ARIA

| Element | Attribute |
| --- | --- |
| `.fab-trigger` | `aria-label` ("Actions", "New") - `popovertarget` exposes `aria-expanded` natively |
| `.fab-action` | its `.fab-label` text, or `aria-label` |
| icons / emoji | `aria-hidden="true"` |

## Keyboard

| Key | Action |
| --- | --- |
| `Enter` / `Space` on the trigger | Open / close the dial |
| `Tab` | From the open trigger into the actions (the popover follows its invoker in focus order) |
| `Escape` | Close, focus returns to the trigger |

## Notes

- CSS only: the popover is the state. Open it from code with
  `document.getElementById('fab-actions').showPopover()`.
- The menu lives in the top layer, above every other stacking context.
- Keep the dial short (2-6 actions); more belongs in a menu or a sheet.
