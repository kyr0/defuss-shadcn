---
name: Dropdown Menu
type: ATM
why: Button-triggered menu as a Popover positioned by CSS anchor positioning - dismiss and placement are browser-owned.
when: The go-to menu of actions or options anchored to a trigger button.
where: dist/components/dropdown/dropdown.css + dist/components/dropdown/dropdown.js
supportedStates: default, open
---

# Pattern: Dropdown Menu

## Native basis
`popover` API + `<button>` trigger. The browser provides light-dismiss
(click outside to close) and top-layer rendering.
Requires JavaScript for keyboard navigation and ARIA management.

---

## Native Web APIs
- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - top-layer rendering and light-dismiss (click outside to close)
- [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - positions dropdown relative to trigger without JavaScript
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - entry animation for popover
- [WAI-ARIA Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) - keyboard navigation and role contract for menu items
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses open/close animation
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - maps border and highlight to system colors

---

## Structure

```html
<!-- Trigger -->
<button class="btn" data-variant="outline"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="my-menu"
        data-dropdown-trigger="my-menu">
  Options
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2">
    <path d="m6 9 6 6 6-6"/>
  </svg>
</button>

<!-- Menu -->
<div id="my-menu" role="menu" popover
     class="dropdown-content"
     aria-label="Options menu">

  <div role="group" aria-label="Navigation">
    <button role="menuitem" class="dropdown-item" tabindex="-1">
      Profile
    </button>
    <button role="menuitem" class="dropdown-item" tabindex="-1">
      Settings
    </button>
  </div>

  <div class="dropdown-separator" role="separator"></div>

  <div role="group" aria-label="Actions">
    <button role="menuitem" class="dropdown-item" tabindex="-1">
      <svg aria-hidden="true" width="16" height="16">...</svg>
      Export
      <span class="dropdown-shortcut">⌘E</span>
    </button>
    <button role="menuitem" class="dropdown-item" data-variant="destructive" tabindex="-1">
      Delete
    </button>
  </div>
</div>
```

---

## Alignment

The menu opens below the trigger, its start edge on the trigger's start edge.
`data-align="end"` on the `.dropdown-content` lines its END edge up with the
trigger's end instead - for a split button's chevron or an icon trigger at the
end of a row, where a start-aligned menu would hang out past the control.
Either way the preferred edge is only a preference: when the menu would leave
the viewport it flips to the trigger's other edge (`flip-inline` - an
end-aligned menu near the left edge opens start-aligned under the trigger,
and vice versa), and above the trigger when there is no room below
(`flip-block`) - pure CSS anchor positioning, no measuring script.

---

## Sizes

Set `data-size` on the `.dropdown-content` popover; items, labels, shortcuts and the check/radio indicators scale together.

| `data-size` | Item padding | Item font | Label font |
|-------------|--------------|-----------|------------|
| `xs` | 0.1875rem 0.5rem | 0.75rem | 0.6875rem |
| `sm` | 0.25rem 0.5rem | 0.8125rem | 0.75rem |
| `md` | 0.375rem 0.5rem | 0.875rem | 0.75rem |
| *(none)* | 0.375rem 0.5rem | 0.875rem | 0.75rem |
| `lg` | 0.5rem 0.5rem | 1rem | 0.8125rem |
| `xl` | 0.625rem 0.5rem | 1.125rem | 0.875rem |

The trigger button's own `data-size` (from `.btn`) is independent - set both to match. `md` equals the unsized default.

---
## ARIA

| Attribute                  | Where            | Value                         |
|----------------------------|------------------|-------------------------------|
| `role="menu"`              | menu container   | Always                        |
| `role="menuitem"`          | each item        | Always                        |
| `role="separator"`         | dividers         | Always                        |
| `role="group"`             | item groups      | Optional, with `aria-label`   |
| `aria-haspopup="menu"`    | trigger button   | Always                        |
| `aria-expanded`            | trigger button   | `true` when open, `false` when closed |
| `aria-controls`            | trigger button   | ID of menu element            |
| `aria-label`               | menu container   | Description of menu purpose   |
| `tabindex="-1"`            | each menuitem    | Items not in tab order - use arrow keys |
| `data-highlighted`         | focused item     | Set by JS for styling          |

---

## Animations

```css
@layer components {
  .dropdown-content {
    opacity: 0;
    transform: scale(0.96) translateY(-0.25rem);
    transition: opacity 150ms ease, transform 150ms ease,
                display 150ms allow-discrete;

    &:popover-open {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @starting-style {
    .dropdown-content:popover-open {
      opacity: 0;
      transform: scale(0.96) translateY(-0.25rem);
    }
  }
}
```

---

## Checkbox and radio items

`.dropdown-check` / `.dropdown-radio` on the item draw the indicator from
`aria-checked`. A click (or Enter / Space) toggles a checkbox and selects a
radio within its `role="group"` - the menu stays open, so several options
can be set in one go - and fires `dropdown:select`.

```html
<button class="dropdown-item dropdown-check" role="menuitemcheckbox" aria-checked="true" tabindex="-1">Show Status Bar</button>

<div role="group" aria-label="Panel position">
  <div class="dropdown-label" data-inset>Panel position</div>
  <button class="dropdown-item dropdown-radio" role="menuitemradio" aria-checked="true" tabindex="-1" data-value="top">Top</button>
  <button class="dropdown-item dropdown-radio" role="menuitemradio" aria-checked="false" tabindex="-1" data-value="bottom">Bottom</button>
</div>
```

## Submenus

Nest a `.dropdown-sub`: a `.dropdown-sub-trigger` item and its
`.dropdown-sub-content` menu - which can hold more `.dropdown-sub`s, any
depth.

```html
<div class="dropdown-sub">
  <button class="dropdown-item dropdown-sub-trigger" role="menuitem" tabindex="-1">Share</button>
  <div class="dropdown-content dropdown-sub-content" role="menu" popover aria-label="Share">
    <button class="dropdown-item" role="menuitem" tabindex="-1">Email link</button>
    <div class="dropdown-sub">
      <button class="dropdown-item dropdown-sub-trigger" role="menuitem" tabindex="-1">Social</button>
      <div class="dropdown-content dropdown-sub-content" role="menu" popover aria-label="Social">…</div>
    </div>
  </div>
</div>
```

- The submenu is a DOM descendant of its menu, so the Popover API keeps the
  parent open, closes sibling submenus and light-dismisses the whole tree.
- It opens beside its trigger (CSS anchor positioning; `dropdown.js` names
  the anchors), flipping to the other side or upward near the viewport edge,
  and to the left in RTL. The trigger shows a chevron and stays highlighted
  while its submenu is open.
- Pointer: hover opens after 120 ms; moving to another item closes it after
  220 ms - enough to travel diagonally into the submenu. Click opens it too.
- Keyboard: → (← in RTL) / Enter / Space opens it and focuses its first item;
  ← / Esc closes just that submenu and returns to its trigger.
- The script adds `aria-haspopup`, `aria-expanded`, `aria-controls` and
  the `popover` attribute if missing.

## Disabled items

`disabled` (a `<button>`) or `aria-disabled="true"` (any element): dimmed,
skipped by the arrow keys and typeahead, clicks ignored. A disabled
`.dropdown-sub-trigger` never opens its submenu.

## Inset, icons, events

- `data-inset` on an item or a `.dropdown-label` lines its text up with
  the checkbox / radio items.
- An `<svg>` first in an item is the icon (muted, 1rem).
- Every activation fires `dropdown:select` on the item (bubbles):
  `detail: { item, value, checked }` - `value` is `data-value` or the text,
  `checked` only for checkbox / radio items. A plain item then closes the
  whole menu tree.
- `<a role="menuitem" href>` items navigate normally.

---

## States

Declared states: `default` (closed) · `open` (shown via native showPopover(), first item highlighted).

```js
document.querySelector('#my-menu').api.setState('open');
document.querySelector('#my-menu').api.getState(); // { name: 'open', config: {} }
```

The api is bound per menu element; the registry global is
`df$.shadcn.dropdownApi` / `df$.shadcn.dropdownStates`.

## Notes

- Always use `popover` attribute for the menu - it renders in the top layer and avoids overflow clipping
- CSS anchor positioning (`position-anchor`, `anchor()`) handles placement - no JS positioning needed
- `position-try: flip-block` automatically flips the menu above the trigger if there's no room below
- The `popover` API handles light-dismiss (click outside) automatically
- Submenus: see "Submenus" - `.dropdown-sub` wrappers, any depth
- Escape closes the menu (in a submenu: that submenu) and returns focus to its trigger
- Menubar (`menubar`) reuses these menus - every feature here works inside it
- Menu items use `tabindex="-1"` - only arrow keys move focus (roving focus pattern)
