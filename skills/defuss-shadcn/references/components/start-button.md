---
name: Start Button
type: ATM
section: desktop
why: A native popovertarget button - it opens its Start Menu with no script of its own; the menu anchors itself to it and keeps aria-expanded.
when: The first button of a taskbar, opening a start menu. For a menu of commands anywhere else use dropdown; for a launcher grid use command.
where: dist/components/start-button/start-button.css
supportedStates: default
---

# Pattern: Start Button

## Native basis

A `<button popovertarget="…">` naming a [Start Menu](start-menu.md)
(a `popover`). The browser opens and closes the menu, light-dismisses it and
returns focus; the Start Menu's script anchors the menu to the button (CSS
anchor positioning) and sets `aria-expanded` on it.

## Native Web APIs

- [`popovertarget`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#popovertarget) - opens and closes the menu without script
- [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - the menu sits on the button (`anchor-name` set by the Start Menu)
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - the open state outlined in Highlight

---

## Structure

```html
<button class="start-button" type="button" popovertarget="start" aria-haspopup="menu">
  <i data-lucide="layout-grid" class="start-button-icon"></i>
  <span class="start-button-label">Start</span>
</button>
```

- An icon, a label or both; `data-variant="icon"` keeps the label for
  assistive technology only.
- Ctrl+Esc opens the menu too (the Start Menu's shortcut).

## Variants

| Value | Description |
|-------|-------------|
| (none) | Icon and label |
| `data-variant="icon"` | The icon only - the label stays for screen readers |

A desktop look (`data-look` on the desktop) restyles it: a bevelled "Start", a green pill, a round orb.

## States

| State | Meaning |
|-------|---------|
| `default` | The only state - its menu's open state is the Start Menu's (`aria-expanded` mirrors it) |

## ARIA

| Attribute | Purpose |
|-----------|---------|
| `aria-haspopup="menu"` | It opens a menu |
| `aria-expanded` | Set by the Start Menu: whether the menu is open |
| `.start-button-label` | Its accessible name (keep it with `data-variant="icon"`) |

## Notes

- Several buttons may name one menu (a taskbar and a keyboard shortcut
  button); the menu anchors to the one on the page last bound.
