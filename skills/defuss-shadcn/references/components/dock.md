---
name: Dock
type: ATM
why: A navigation bar of links / buttons with icons and labels - on the bottom (above the device's safe area), top, left or right edge; the active item is plain ARIA (aria-current / aria-pressed) or a checked radio, so a radio dock switches items AND the card content they own with no JavaScript.
when: The 3 - 5 top-level destinations of a mobile app or app-like page (Home, Search, Inbox, Profile). For a desktop app bar use navbar, for a side menu use sidebar, for one floating action use fab.
where: dist/components/dock/dock.css
supportedStates: default
---

# Pattern: Dock

## Native basis

A `<nav class="dock">` of `.dock-item` elements - `<a>` (navigation),
`<button>` (in-page views) or `<label>` with a radio inside (switching with
no JavaScript). Each item holds a `.dock-icon` (an svg or an emoji) and a
`.dock-label`. Same idea as daisyUI's dock, more states and styles.

## Native Web APIs

- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - the navigation landmark (`aria-label`)
- [`aria-current="page"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) / [`aria-pressed`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-pressed) - the active item
- [`<input type="radio">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio) + [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - a CSS-only switching dock, arrow keys included
- [`env(safe-area-inset-bottom)`](https://developer.mozilla.org/en-US/docs/Web/CSS/env) - clear of the home indicator on notched phones
- [`backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) - the glass surface
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

### Links

```html
<nav class="dock" aria-label="Main">
  <a class="dock-item" href="/" aria-current="page">
    <span class="dock-icon" aria-hidden="true"><svg>…</svg></span>
    <span class="dock-label">Home</span>
  </a>
  <a class="dock-item" href="/inbox">
    <span class="dock-icon" aria-hidden="true"><svg>…</svg><span class="dock-badge">3</span></span>
    <span class="dock-label">Inbox</span>
  </a>
</nav>
```

### Switching without JavaScript (radios)

```html
<nav class="dock" aria-label="Views">
  <label class="dock-item"><input type="radio" name="view" checked><span class="dock-icon" aria-hidden="true">🏠</span><span class="dock-label">Home</span></label>
  <label class="dock-item"><input type="radio" name="view"><span class="dock-icon" aria-hidden="true">🔍</span><span class="dock-label">Search</span></label>
</nav>
```

A click (or the arrow keys - radios move natively) checks the radio and the
item becomes active - the checked value also submits with a form. Buttons:
toggle `aria-pressed="true"` yourself.

### Switching card content (views, no JavaScript)

```html
<div class="dock-view">
  <div class="card dock-panels">
    <div class="dock-panel">…Home…</div>
    <div class="dock-panel">…Search…</div>
  </div>
  <nav class="dock" data-position="static" aria-label="Views">
    <label class="dock-item"><input type="radio" name="view" checked>…Home…</label>
    <label class="dock-item"><input type="radio" name="view">…Search…</label>
  </nav>
</div>
```

The `.dock-panel` at position *k* shows while item *k*'s radio is checked (up
to 7 items; the panel fades in). An item without a radio - a raised action -
keeps its slot with an empty `<div class="dock-panel"></div>`.

A card that **closes with its dock**: `<div class="card dock-view">` with a
`.dock-panels` (no `card` class of its own) and a `data-position="static"`
dock as its last child - the dock drops its side / bottom edges and the
card's rounded corners clip it, so no square border meets a round corner.
Over a fixed or attached dock, leave the card border off (`.dock-panels`
without `card`) and let the surface behind be the frame.

### Raised action with a speed dial (FAB)

```html
<div class="dock-item fab" data-raised data-layout="flower" data-position="bottom-center">
  <button class="fab-trigger dock-icon" popovertarget="dock-new" aria-label="New">
    <span class="fab-icon" aria-hidden="true"><svg>…</svg></span>
  </button>
  <span class="dock-label">New</span>
  <div class="fab-menu" id="dock-new" popover>
    <button class="fab-action" popovertarget="dock-new" popovertargetaction="hide" aria-label="Photo">📷</button>
    …
  </div>
</div>
```

Needs `fab.css`. The actions fan out on the upper semicircle (30° - 150°,
clear of the neighbouring items); the plus turns into an ×, and every action
closes the dial (`popovertargetaction="hide"`).

---

## Placement

| Attribute | Effect |
| --- | --- |
| *(none)* | Fixed to the bottom of the viewport, padded by `env(safe-area-inset-bottom)` |
| `data-position="top"` | Fixed to the top (bar under the item) |
| `data-position="left"` / `"right"` | A full-height column on that edge (bar on the outer edge, vertical); with `data-variant="floating"` a vertically centered pill |
| `data-position="static"` | In the flow (a mock-up, a card) |
| `data-attach="container"` | Absolute to the nearest positioned ancestor |

## Variants (`data-variant`)

| Value | Surface |
| --- | --- |
| *(none)* | Page background, top border |
| `muted` | `--muted` |
| `primary` | `--primary`; the active item in `--primary-foreground` |
| `neutral` | Charcoal (inverse colors, softened); active in `--background` |
| `glass` | Translucent + `backdrop-filter` blur |
| `floating` | A rounded pill hovering above the bottom edge, shadowed |

## Active indicator (`data-indicator`)

`bar` (default - a short line on the edge) · `pill` (a tinted capsule behind
the icon, Material 3) · `dot` (a dot under the label). Floating docks default
to the pill.

## Labels (`data-labels`)

*(none)* always · `active` - only the active item shows its label (the others
keep it for screen readers) · `none` - icons only (the labels stay the
accessible names).

## Sizes (`data-size`)

`xs` 2.75rem · `sm` 3.375rem · `md` 4rem (default) · `lg` 4.75rem · `xl` 5.5rem - bar height, icon and label scale together.

## Badges, dots, raised action, magnify

- `.dock-badge` (a count) or `.dock-dot` (`data-tone="success|warning|destructive"`, `data-animate="ping"`) inside a `.dock-icon`.
- `data-raised` on an item: a raised round primary action in the middle (its label becomes the accessible name).
- `data-effect="magnify"` on the dock: the hovered item grows, its neighbours a little (macOS); the dock drops its border (a shelf of icons). On side / top docks the items grow away from the edge.
- `data-autohide` on the dock: tucked behind its edge with a 6px peek, it slides in when the pointer comes close (an invisible reach zone past the peek) or focus enters. Works on every edge; pairs well with floating + magnify.

---

## Accessibility

| Element | Attribute |
| --- | --- |
| `<nav class="dock">` | `aria-label` |
| active link | `aria-current="page"` |
| active button | `aria-pressed="true"` |
| icons / emojis | `aria-hidden="true"` - the `.dock-label` names the item |
| badge | its text is read with the label ("Inbox 3") - add context if needed |

## Notes

- 3 - 5 items; the items share the width equally and labels truncate.
- A raised item's icon keeps `--primary-foreground` on `--primary` when active too.
- Autohide hides content from pointer users until they reach the edge -
  keep it for immersive surfaces (a canvas, a photo), not for primary
  navigation on touch devices (no hover there; focus still reveals it).
- Give the page a bottom padding of the dock height so content isn't hidden
  under a fixed dock.
- CSS only (the FAB raised action included - it is the Popover API).
