---
name: Panel
type: MOL
why: A titled .card whose minimize / maximize tools are Swaps - a native checkbox each, so the face and the keyboard are the browser's; the runtime keeps the state in step and makes the panel a border-layout region that folds to its title bar (a vertical tab in west / east) like the ExtJS 4 border layout.
when: Titled, foldable tool areas - a file tree, an inspector, a console, dashboard widgets - and above all the regions of a border layout. A plain content box takes card; a disclosure inside flowing text takes collapsible / accordion; movable floating panes take window.
where: dist/components/panel/panel.css + dist/components/panel/panel.js (+ card, swap)
supportedStates: default, minimized, maximized
---

# Pattern: Panel

## Native basis

A `<section class="card panel">` - the card gives the surface, border and
radius - with a `.panel-header` title bar (optional icon, the title, tools)
and a scrolling `.panel-body`. The minimize and maximize tools are
**Swaps**: a `<label class="swap">` around a hidden checkbox, two faces, no
script - checked = minimized / maximized. The runtime keeps the panel's
state and both checkboxes in step, and makes the panel a citizen of a
**Border Layout**: as a region's pane it folds the region with it -
north / south down to the title bar, west / east to a vertical tab with the
icon, title and restore tool still showing.

---

## Native Web APIs
- [`<input type="checkbox">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox) - the tools' state (via Swap): keyboard (Space), focus, `change`
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the swap faces follow their checkbox
- [`writing-mode`](https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode) - the vertical tab of a minimized west / east panel; logical paddings turn with it
- [`inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert) - the hidden body and a resting divider leave the tab order
- [`rotate`](https://developer.mozilla.org/en-US/docs/Web/CSS/rotate) - the minimize chevron points where the region folds
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `panel-change`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) / [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - motion, contrast and system colours

---

## Structure

```html
<section class="card panel" aria-labelledby="files-title" style="height:16rem">
  <header class="panel-header">
    <i data-lucide="folder" class="panel-icon" aria-hidden="true"></i>
    <h3 class="panel-title" id="files-title">Files</h3>
    <div class="panel-tools">
      <label class="swap panel-maximize">
        <input type="checkbox" aria-label="Maximize Files">
        <span class="swap-off"><i data-lucide="maximize-2"></i></span>
        <span class="swap-on"><i data-lucide="minimize-2"></i></span>
      </label>
      <label class="swap panel-minimize">
        <input type="checkbox" aria-label="Minimize Files">
        <span class="swap-off"><i data-lucide="chevron-up"></i></span>
        <span class="swap-on"><i data-lucide="chevron-down"></i></span>
      </label>
    </div>
  </header>
  <div class="panel-body">…</div>
  <footer class="panel-footer">12 files</footer>
</section>
```

- Both tools are optional; leave one out and that action is gone (a
  panel without `.panel-minimize` ignores the title-bar double-click too).
- `.panel-icon`, `.panel-footer` are optional; extra tools (`.btn` with
  `data-variant="ghost" data-size="icon-sm"`) go in `.panel-tools`.
- The minimize faces are `chevron-up` (off) / `chevron-down` (on): the CSS
  turns the tool to point where the panel folds (south 180°, west -90°,
  east 90°) - author them once.
- Start folded with `data-minimized` (or a checked swap), filled with
  `data-maximized`.

### In a border layout

The panel is the region's pane - the `.resizer`'s wrapped element (or the
fixed region itself):

```html
<div class="border-layout" style="height:24rem">
  <div class="resizer border-layout-west">
    <section class="card panel" style="width:14rem" aria-labelledby="t-files">…</section>
  </div>
  <main class="border-layout-center">…</main>
  <div class="resizer border-layout-south">
    <section class="card panel" style="height:8rem" aria-labelledby="t-console">…</section>
  </div>
</div>
```

| Region | Minimized |
|--------|-----------|
| `north` / `south` | The region shrinks to the title bar's height |
| `west` / `east` | The title bar turns vertical (icon, title, restore tool) and the region shrinks to its width; maximize hides |
| `center` / outside a layout | The panel is its title bar - the space below is released |

The divider rests (`inert`) while its panel is minimized; the region gets
`data-panel-minimized` (a styling hook). Restoring brings the authored or
dragged size back. Inside a layout the panel drops its own border and
radius - the dividers frame it (`data-divider="gap"` cards it again).

---

## Variants

| Attribute | On | Meaning |
|-----------|----|---------|
| `data-minimized` | `.panel` | Title bar only (set by the runtime; author it to start folded) |
| `data-maximized` | `.panel` | Fills its border layout / `[data-panel-host]` / the viewport |
| `data-title-collapse="false"` | `.panel` | The title-bar double-click does not fold |
| `data-flush` | `.panel-body` | No padding - for lists, tables, code |
| `data-panel-host` | any ancestor | What a maximized panel fills (border layouts are hosts already) |
| `data-region` | `.panel` | Set by the runtime: `north` · `south` · `west` · `east` · `center` |

## Sizes

The panel takes its size from the author (`width` / `height`) or from the
region's resizer; the title bar is 2.5rem, the tools 1.75rem with 1rem icons.

---

## Keyboard

| Key | Does |
|-----|------|
| Tab | Reaches each tool (the swaps' checkboxes) |
| Space | Toggles the focused tool |
| Escape | Restores a maximized panel (focus returns to its maximize tool) |

## Events

| Event | Detail | When |
|-------|--------|------|
| `panel-change` | `{ state, previous, region }` | The panel was minimized, maximized or restored (bubbles) |

## Imperative API - `df$.shadcn.panel`

| Method | Does |
|--------|------|
| `minimize(panel)` / `maximize(panel)` / `restore(panel)` | Set the state (an element, an id or a selector) |
| `toggle(panel)` | Minimize or restore; returns whether it is now minimized |

---

## States

| State | Meaning |
|-------|---------|
| `default` | Title bar and body at the authored size |
| `minimized` | The title bar only - in a border layout region, the region folds with it |
| `maximized` | Fills its border layout, `[data-panel-host]` or the viewport |

```js
const panel = df$('#files').get(0);
panel.api.setState('minimized');
panel.api.getState(); // → { name: 'minimized', config: {} }
panel.api.setState('default');
```

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| `.panel` | `aria-labelledby` → the title | A named region (`<section>`) |
| tool checkboxes | `aria-label` ("Minimize Files", "Maximize Files") | Checked = minimized / maximized; the minimize tool gets `aria-controls` → the body |
| `.panel-body` | `inert` while minimized | Set by the runtime |
| `.panel-icon` | `aria-hidden="true"` | Decorative |

## Notes

- Load card.css and swap.css with it (all.css has them).
- A panel as a region pane needs nothing extra: the runtime finds its
  region (`data-region`) at init.
- Nested layouts: a maximized panel fills its nearest border layout.
