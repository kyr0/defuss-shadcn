---
name: Tabs
type: ATM
why: role=tablist with arrow-key roving focus; panels toggle via data-state.
when: Switching views within one context without navigating away.
where: dist/components/tabs/tabs.css + dist/components/tabs/tabs.js
supportedStates: default, active, disabled
---

# Pattern: Tabs

## Native basis
`role="tablist"` + `role="tab"` + `role="tabpanel"`. No native HTML element
provides this pattern. Requires JavaScript for keyboard navigation and
panel switching. Follows the WAI-ARIA Tabs design pattern.

---

## Native Web APIs
- [WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) - role contract (`tablist`, `tab`, `tabpanel`) and roving tabindex keyboard navigation
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - auto-detects vertical orientation for layout switching
- [`text-overflow: ellipsis`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-overflow) - long labels shorten to "…" when the list runs out of room (the trigger is a block box so its own line can ellipsize)
- [`writing-mode`](https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode) - vertical labels for `data-side="left|right"` (`sideways-lr` on the left where supported)
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus ring on tabs and panels
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses tab transition animations
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - maps active tab indicator to system `Highlight`

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

### Icons, emoji and long labels

Put the icon **before** the label, inside the trigger: an `<svg>`, an `<img>`,
a lucide `<i data-lucide="name"></i>`, or an emoji in
`<span class="tab-icon" aria-hidden="true">`. It rides inline, 1em, 0.5em
before the text, and turns with the label when it runs vertically (emoji
lie on their side like any glyph, svg / img rotate a quarter turn - an arrow
always points along the reading direction).

```html
<button class="tab-trigger" role="tab" aria-selected="true" aria-controls="p-inbox" id="t-inbox">
  <i data-lucide="inbox"></i>Inbox
</button>
<button class="tab-trigger" role="tab" aria-selected="false" aria-controls="p-beach" id="t-beach" tabindex="-1">
  <span class="tab-icon" aria-hidden="true">🏖️</span>Beach
</button>
<!-- a tab in its own color: holds in every state -->
<button class="tab-trigger" role="tab" aria-selected="false" aria-controls="p-danger" id="t-danger" tabindex="-1" style="color: var(--destructive);">
  Danger zone
</button>
```

A trigger is a block box: a label longer than the room it gets ends in "…"
(the full text stays the accessible name). Horizontal tab lists never grow
wider than their container; left / right columns never taller than the panel
beside them.

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
uses `:has()` to detect the orientation and adjust layout automatically - no
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

The vertical layout is handled automatically via `:has()` - when the tablist has
`aria-orientation="vertical"` (and no `data-side`), the `.tabs` container
switches to a flex row with horizontal labels (a settings nav; the column takes
at most 40% of the width, longer labels ellipsize). `data-side="left|right"`
uses a two-column grid instead, in which the panel sets the height.
No additional CSS is needed beyond what's in the main CSS block above.

The JavaScript already handles vertical orientation - arrow keys switch to
Up/Down based on `aria-orientation`.

---

## Side and alignment

Two attributes on the `.tabs` root place the tab list around the panel; the
DOM order never changes (tablist first), only the visual side:

| Attribute | Values | Effect |
| --- | --- | --- |
| `data-side` | `top` (default) · `bottom` · `left` · `right` | Which edge of the panel the tabs sit on. `left` / `right` make a vertical column whose labels run vertically too (`writing-mode`: bottom to top on the left - `sideways-lr` where supported - top to bottom on the right). tabs.ts sets `aria-orientation="vertical"`, so Up / Down move between tabs; the CSS stacks it without JS too. `left` / `right` are physical sides, also in RTL. |
| `data-align` | `start` (default) · `center` · `end` | Where the tabs cluster along that edge: top / bottom - start = left, end = right; left / right - start = top, end = bottom. |

```html
<!-- tabs under the panel, right-aligned -->
<div class="tabs" data-side="bottom" data-align="end">…</div>
<!-- a vertical column right of the panel, starting from the bottom -->
<div class="tabs" data-side="right" data-align="end">…</div>
```

A vertical tablist without `data-side` (the older `aria-orientation="vertical"`
markup, a settings-nav column with horizontal labels) still lays out as `left`.

---

## Variants

Set `data-variant` on the `.tab-list` element.

| Variant | Behavior |
| --- | --- |
| (default) | Filled pill: rounded `--muted` background behind the trigger row, selected tab gets a `--background` pill |
| `line` | Underline style: no pill background, selected tab sits on the rule - the rule follows `data-side` (the edge facing the panel) |
| `attached` | Folder tabs joined to the panel: each `.tab-content` holds a `.card`; the selected tab takes the card surface and covers the card border where they meet, on every side. The card corner the tabs grow from (per `data-side` + `data-align`) is squared. Put any max-width on the `.tabs` root, not the card, so tabs and card share one edge. |

```html
<div class="tab-list" role="tablist" data-variant="line">…</div>
```

## States

The api is bound at two levels - **per tab trigger** and **per tablist**
(selection is exclusive across the tablist). Declared states:

| State | On a tab trigger | On the tablist |
| --- | --- | --- |
| `default` | enabled, not picked - the authored selection stands; label and icon stay | everything as authored: selection, `disabled` flags, labels, icons (the init snapshot) |
| `active` | this tab selected, its panel shown (no-op while disabled) | the tab at `config.index` (or `config.id`) selected |
| `disabled` | not selectable, skipped by the arrow keys; a selected tab hands the selection to the next enabled one | every tab disabled |

Config on a tab: `{ label, icon }` - `label` replaces the text (a
`.tab-label` span if present, else the trigger's text nodes); `icon` is a
lucide name (mounts `<i data-lucide>` and runs `lucide.createIcons()`), any
other string (an emoji) becomes a `.tab-icon` span, `''` removes the icon.
Re-entering the **current** state with a config applies just the config, so a
rename never moves the selection. `getState()` reflects the DOM: a tab reports
`{ name, config: { label, icon } }`, the tablist `{ name, config: { index, id } }`.

```js
const tablist = document.querySelector('#settings-tablist');
tablist.api.setState('active', { index: 2 });               // select the third tab
const billing = document.querySelector('#settings-tab-2');
billing.api.setState('disabled');                           // lock it
billing.api.setState('default');                            // enabled again
tablist.api.setState('default');                            // everything as authored
billing.api.setState(billing.api.getState().name, { label: 'Invoices', icon: 'receipt' });
tablist.api.getState(); // { name: 'active', config: { index: 2, id: 'settings-tab-3' } }
```

The registry global is `df$.shadcn.tabsApi` / `df$.shadcn.tabsStates`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.tabsApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.tabsStates` = `default`, `active`, `disabled`.

## Notes

- Only the active tab is in the tab order (`tabindex="0"`) - inactive tabs use `tabindex="-1"`
- Arrow keys cycle through tabs (wrap around) - this is the roving tabindex pattern
- The active panel uses `tabindex="0"` so it can receive focus from the tab trigger
- Use `hidden` attribute on inactive panels for accessibility (screen readers skip them)
- Disabled tabs carry the native `disabled` attribute (authored, or via `api.setState('disabled')`) and are skipped by keyboard navigation
- For lazy-loaded content, panels can be rendered empty and populated on activation
