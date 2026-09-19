---
name: Sidebar
type: ATM
why: App-shell navigation rail with a collapsible state (State API) and a mobile overlay mode.
when: Persistent primary navigation beside the app content.
where: dist/components/sidebar/sidebar.css + dist/components/sidebar/sidebar.js
supportedStates: default, collapsed
---

# Sidebar

## Native basis

`<aside>` + `<nav>` + `<dialog>` for a full application sidebar with collapsible state, mobile sheet overlay, collapsible groups, submenus, and keyboard shortcut.

## Native Web APIs

- [`<aside>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/aside) — complementary content landmark
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) — navigation landmark for assistive technology
- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) — native modal for mobile sidebar overlay
- [`<details>/<summary>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) — collapsible groups and submenus without JS toggle logic
- [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop) — dialog overlay styling
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) — slide-in animation for mobile dialog
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) — keyboard-only focus ring on nav links
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) — prevents scroll chaining in nav area
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — suppresses all transitions

## Structure

### Full application layout
```html
<div class="sidebar-layout">
  <aside class="app-sidebar" id="main-sidebar" data-state="expanded">
    <div class="sidebar-header">
      <a class="sidebar-logo" href="/">
        <i data-lucide="command"></i>
        <span class="sidebar-logo-text">MyApp</span>
      </a>
    </div>
    <div class="sidebar-content">
      <details class="sidebar-group" open>
        <summary>
          <span>Platform</span>
          <i data-lucide="chevron-right"></i>
        </summary>
        <nav class="sidebar-nav">
          <a class="sidebar-link" href="#" aria-current="page">
            <i data-lucide="home"></i> <span>Dashboard</span>
          </a>
          <a class="sidebar-link" href="#">
            <i data-lucide="inbox"></i> <span>Inbox</span>
            <span class="sidebar-badge">12</span>
          </a>
          <details class="sidebar-submenu">
            <summary>
              <i data-lucide="settings"></i> <span>Settings</span>
              <i data-lucide="chevron-right"></i>
            </summary>
            <nav class="sidebar-nav">
              <a class="sidebar-link" href="#"><span>General</span></a>
              <a class="sidebar-link" href="#"><span>Team</span></a>
            </nav>
          </details>
        </nav>
      </details>
    </div>
    <div class="sidebar-footer">user@example.com</div>
  </aside>

  <dialog class="sidebar-mobile" id="mobile-sidebar">
    <button class="sidebar-mobile-close" aria-label="Close">
      <i data-lucide="x"></i>
    </button>
    <!-- same nav content as desktop -->
  </dialog>

  <main style="flex:1;min-width:0;">
    <button class="sidebar-trigger" data-sidebar-trigger="main-sidebar">
      <i data-lucide="panel-left"></i>
    </button>
  </main>
</div>
```

## Variants

| `data-state`   | Width    | Behavior                              |
| -------------- | -------- | ------------------------------------- |
| `expanded`     | 16rem    | Full sidebar with labels              |
| `collapsed`    | 3.5rem   | Icons only, text hidden               |

| `data-side`    | Position                              |
| -------------- | ------------------------------------- |
| *(none)*       | Left (default)                        |
| `right`        | Right side, border on left            |

## Density

Set `data-density` on the `.app-sidebar` root; link rows and the content frame scale. Independent of `data-state="collapsed"` (the rail keeps its own compact paddings).

| Value | Effect |
| --- | --- |
| `compact` | Link padding-block 0.375rem, frame 0.375rem |
| `comfortable` | 0.5rem — identical to the unsized default |
| `spacious` | 0.625rem |

## ARIA

| Attribute        | Element            | Purpose                            |
| ---------------- | ------------------ | ---------------------------------- |
| `<aside>`        | `.app-sidebar`     | Complementary landmark             |
| `<nav>`          | `.sidebar-nav`     | Navigation landmark                |
| `aria-current`   | `.sidebar-link`    | `"page"` for current page link     |
| `<dialog>`       | `.sidebar-mobile`  | Modal with focus trap + Escape     |

## Keyboard

| Key          | Action                                |
| ------------ | ------------------------------------- |
| `Cmd+B`      | Toggle sidebar collapse (macOS)       |
| `Ctrl+B`     | Toggle sidebar collapse (Windows)     |
| `Escape`     | Close mobile sidebar (native dialog)  |

## States

The api is bound **per `.app-sidebar`**. Declared states: `default`
(expanded — the authored width) · `collapsed` (icon rail, via the
documented `data-state="collapsed"` attribute).

```js
document.querySelector('#my-sidebar').api.setState('collapsed');
document.querySelector('#my-sidebar').api.getState(); // { name: 'collapsed', config: {} }
```

Trigger clicks and Cmd/Ctrl+B keep `getState()` honest automatically.
The registry global is `df$.shadcn.sidebarApi` / `df$.shadcn.sidebarStates`.

## Notes

- **Mobile**: Desktop sidebar hidden below 768px. Use `<dialog class="sidebar-mobile">` for slide-in sheet. While it is modal, `html:has(.sidebar-mobile:modal)` sets `overflow: hidden` + `scrollbar-gutter: stable` — the page behind cannot scroll and keeps its position (no JS scroll-lock).
- **Auto-collapse**: When the sidebar's row (its container) drops below 24rem, the component docks itself to the icon rail; it restores above 28rem (hysteresis — a scrollbar appearing never flickers it). A deliberate choice always wins: trigger clicks, Cmd/Ctrl+B and `api.setState()` set `dataset.stateName`, which pins the sidebar against the heuristic until it is cleared.
- **Collapsible groups**: `<details class="sidebar-group">` — native toggle, no JS.
- **Submenus**: `<details class="sidebar-submenu">` for nested nav with left border.
- **Badges**: `<span class="sidebar-badge">` for notification counts.
- **Collapsed state**: Labels, titles, badges, footer, logo text hidden — icons remain. Submenu summaries (e.g. a Settings cog) center their icon in the rail too, and the nested nav stays hidden until expanded.
- **Sidebar tokens**: Uses `--sidebar-*` token group.
# Sidebar

## Native basis

`<aside>` + `<nav>` for application sidebar navigation with collapsible state.

## Native Web APIs

- [`<aside>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/aside) — complementary content landmark
- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) — navigation landmark for assistive technology
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) — keyboard-only focus ring on nav links
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) — prevents scroll chaining in nav area
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — suppresses width transition

## Structure

```html
<aside class="app-sidebar">
  <div class="sidebar-header">
    <span class="sidebar-logo">App</span>
  </div>
  <nav class="sidebar-nav">
    <span class="sidebar-section-title">Main</span>
    <a class="sidebar-link" data-active="true" href="#">
      <i data-lucide="home"></i> Dashboard
    </a>
    <a class="sidebar-link" href="#">
      <i data-lucide="settings"></i> Settings
    </a>
  </nav>
  <div class="sidebar-footer">
    <p>© 2026 App</p>
  </div>
</aside>
```

### Collapsed
```html
<aside class="app-sidebar" data-state="collapsed">
  <!-- content truncates at 3.5rem width -->
</aside>
```

## Variants

| `data-state`   | Width    | Behavior                    |
| -------------- | -------- | --------------------------- |
| *(default)*    | 16rem    | Full sidebar with labels    |
| `collapsed`    | 3.5rem   | Icons only, overflow hidden |

## ARIA

- `<aside>` provides complementary landmark automatically.
- `<nav>` provides navigation landmark automatically.
- Active link uses `data-active="true"` for styling; consider `aria-current="page"` for better screen reader support.

## Notes

- Sidebar uses design tokens from the `--sidebar-*` token group.
- The nav area has `overflow-y: auto` and `overscroll-behavior: contain` for scroll containment.
- Width transition is suppressed for users who prefer reduced motion.
- Pure CSS — no JavaScript required for rendering. Collapse toggle would need JS to toggle `data-state`.
