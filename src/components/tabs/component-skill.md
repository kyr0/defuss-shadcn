---
name: Tabs
type: ATM
why: role=tablist with arrow-key roving focus; panels toggle via data-state.
when: Switching views within one context without navigating away.
where: dist/components/tabs/tabs.css + dist/components/tabs/tabs.js
supportedStates: default, active
---

# Pattern: Tabs

## Native basis
`role="tablist"` + `role="tab"` + `role="tabpanel"`. No native HTML element
provides this pattern. Requires JavaScript for keyboard navigation and
panel switching. Follows the WAI-ARIA Tabs design pattern.

---

## Native Web APIs
- [WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — role contract (`tablist`, `tab`, `tabpanel`) and roving tabindex keyboard navigation
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) — auto-detects vertical orientation for layout switching
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) — keyboard-only focus ring on tabs and panels
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — suppresses tab transition animations
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) — maps active tab indicator to system `Highlight`

---

## Structure

```html
<div class="tabs">
  <!-- Tab list -->
  <div class="tab-list" role="tablist" aria-label="Account settings">
    <button class="tab-trigger" role="tab"
            aria-selected="true"
            aria-controls="panel-account"
            id="tab-account">
      Account
    </button>
    <button class="tab-trigger" role="tab"
            aria-selected="false"
            aria-controls="panel-password"
            id="tab-password"
            tabindex="-1">
      Password
    </button>
  </div>

  <!-- Tab panels -->
  <div class="tab-content" role="tabpanel"
       id="panel-account"
       aria-labelledby="tab-account"
       tabindex="0">
    Account settings content...
  </div>

  <div class="tab-content" role="tabpanel"
       id="panel-password"
       aria-labelledby="tab-password"
       tabindex="0"
       hidden>
    Password settings content...
  </div>
</div>
```

---

## Sizes

Set `data-size` on the `.tab-list`; the triggers scale with it.

| `data-size` | Trigger padding | Trigger font |
|-------------|-----------------|--------------|
| `xs` | 0.25rem 0.5rem | 0.75rem |
| `sm` | 0.3125rem 0.625rem | 0.8125rem |
| `md` | 0.375rem 0.75rem | 0.875rem |
| *(none)* | 0.375rem 0.75rem | 0.875rem |
| `lg` | 0.5rem 1rem | 1rem |
| `xl` | 0.625rem 1.25rem | 1.125rem |

The `line` variant preserves its trigger's roomier base padding at every step (`md` = 0.5rem 1rem).

---
## ARIA

| Attribute             | Where          | Value                                    |
|-----------------------|----------------|------------------------------------------|
| `role="tablist"`      | tab list       | Always                                   |
| `role="tab"`          | each trigger   | Always                                   |
| `role="tabpanel"`     | each panel     | Always                                   |
| `aria-selected`       | each tab       | `true` for active, `false` for inactive  |
| `aria-controls`       | each tab       | ID of the associated panel               |
| `aria-labelledby`     | each panel     | ID of the associated tab                 |
| `aria-label`          | tablist        | Description of the tab group             |
| `aria-orientation`    | tablist        | `horizontal` (default) or `vertical`     |
| `tabindex="0"`        | active tab     | In the tab order                         |
| `tabindex="-1"`       | inactive tabs  | Removed from tab order (arrow keys only) |
| `tabindex="0"`        | panels         | Panels are focusable for keyboard users  |

---

## Keyboard interactions

| Key         | Behavior                                              |
|-------------|-------------------------------------------------------|
| `Tab`       | Move focus to active tab, then into the active panel  |
| `ArrowRight`| Move to next tab (horizontal) and activate            |
| `ArrowLeft` | Move to previous tab (horizontal) and activate        |
| `ArrowDown` | Move to next tab (vertical) and activate              |
| `ArrowUp`   | Move to previous tab (vertical) and activate          |
| `Home`      | Move to first tab and activate                        |
| `End`       | Move to last tab and activate                         |
| `Space/Enter`| Activate focused tab (manual activation mode)        |

---

## Vertical layout

For vertical tabs, set `aria-orientation="vertical"` on the tablist. The CSS
uses `:has()` to detect the orientation and adjust layout automatically — no
inline styles needed:

```html
<div class="tabs">
  <div class="tab-list" role="tablist"
       aria-orientation="vertical"
       aria-label="Settings">
    <button class="tab-trigger" role="tab" aria-selected="true"
            aria-controls="panel-general" id="tab-general">General</button>
    <button class="tab-trigger" role="tab" aria-selected="false"
            aria-controls="panel-security" id="tab-security"
            tabindex="-1">Security</button>
  </div>

  <div class="tab-content" role="tabpanel"
       id="panel-general" aria-labelledby="tab-general" tabindex="0">
    General settings...
  </div>
  <div class="tab-content" role="tabpanel"
       id="panel-security" aria-labelledby="tab-security" tabindex="0" hidden>
    Security settings...
  </div>
</div>
```

### Vertical CSS

The vertical layout is handled automatically via `:has()` — when the tablist has
`aria-orientation="vertical"`, the `.tabs` container switches to flex row layout.
No additional CSS is needed beyond what's in the main CSS block above.

The JavaScript already handles vertical orientation — arrow keys switch to
Up/Down based on `aria-orientation`.

---

## Variants

Set `data-variant` on the `.tab-list` element.

| Variant | Behavior |
| --- | --- |
| (default) | Filled pill: rounded `--muted` background behind the trigger row, selected tab gets a `--background` pill |
| `line` | Underline style: no pill background, selected tab sits on a bottom border |

```html
<div class="tab-list" role="tablist" data-variant="line">…</div>
```

## States

The api is bound **per tab trigger** (selection is exclusive across the
tablist). Declared states: `default` (this tab's authored selection,
restored via the init snapshot) · `active` (this tab selected, panel shown).

```js
document.querySelector('#settings-tab-2').api.setState('active');
document.querySelector('#settings-tab-2').api.getState(); // { name: 'active', config: {} }
```

The registry global is `_defussShadcn.tabsApi` / `_defussShadcn.tabsStates`.

## Notes

- Only the active tab is in the tab order (`tabindex="0"`) — inactive tabs use `tabindex="-1"`
- Arrow keys cycle through tabs (wrap around) — this is the roving tabindex pattern
- The active panel uses `tabindex="0"` so it can receive focus from the tab trigger
- Use `hidden` attribute on inactive panels for accessibility (screen readers skip them)
- Disabled tabs should have `disabled` attribute and be skipped by keyboard navigation
- For lazy-loaded content, panels can be rendered empty and populated on activation
