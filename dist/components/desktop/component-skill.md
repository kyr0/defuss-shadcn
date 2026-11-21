---
name: Desktop
type: ORG
section: desktop
why: One element lays out a whole desktop - the window area with its icons, the taskbar on any edge, the start menu and the logon screen - and data-variant gives it a look (7, XP, 98, 95 or the modern default) by tokens and chrome rules, so the same markup and the same component APIs serve every look.
when: A desktop-like UI or a period look for one. For windows alone use window in a window-desktop; for an app's frame use border-layout.
where: dist/components/desktop/desktop.css
supportedStates: default
---

# Pattern: Desktop

## Native basis

A plain element (`.desktop`) whose children are the desktop's components:
a [Window Manager](../window-manager/component-skill.md) (with a
[Desktop Manager](../desktop-manager/component-skill.md) under its windows),
a [Taskbar](../taskbar/component-skill.md), a
[Start Menu](../start-menu/component-skill.md) and a
[Logon](../logon/component-skill.md). CSS only: flex lays the window area
out beside the bar (`:has()` follows the bar's edge), and a look is a set of
the theme's tokens on `.desktop` plus chrome rules for the components
inside it. Icons are `.desktop-glyph` elements whose art follows the look.

## Native Web APIs

- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the window area moves beside a bar on any edge
- [CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) - a look is tokens inherited by every component inside, top-layer popovers included
- [`@font-face`](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face) - the 95 / 98 pixel font, embedded
- [`backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) - the glass of the modern and 7 looks (none under reduced motion)
- [SVG data URIs](https://developer.mozilla.org/en-US/docs/Web/URI/Schemes/data) - the remade icons and wallpapers ship inside the sheet
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - frames in CanvasText, the icons keep their art

---

## Structure

```html
<div class="desktop" data-variant="win98" style="height: 32rem">
  <div class="window-desktop window-manager" id="desk">
    <div class="desktop-manager" data-on-wallpaper role="listbox" aria-multiselectable="true" aria-label="Desktop">
      <div class="desktop-icon" role="option" data-value="notepad">
        <span class="desktop-icon-image"><span class="desktop-glyph" data-glyph="text"></span></span>
        <span class="desktop-icon-label">Notepad</span>
      </div>
    </div>
    <dialog class="window" id="notepad">…</dialog>
  </div>
  <nav class="taskbar" data-taskbar-for="desk" aria-label="Taskbar">
    <button class="start-button" type="button" popovertarget="start" aria-haspopup="menu">
      <span class="start-button-icon desktop-glyph" data-glyph="flag"></span>
      <span class="start-button-label">Start</span>
    </button>
    <div class="taskbar-windows" role="group" aria-label="Open windows"></div>
    <div class="tray" role="group" aria-label="Notification area"><time class="tray-clock"></time></div>
  </nav>
  <div class="start-menu" id="start" popover aria-label="Start">…</div>
  <div class="logon" aria-label="Sign in">…</div>
</div>
```

- Every child is optional; the Window Manager fills the space the bar
  leaves.
- A glyph: `<span class="desktop-glyph" data-glyph="folder"></span>` - in a
  Desktop Manager's `.desktop-icon-image`, a Start Menu's
  `.start-menu-icon`, a window's `.window-icon` (the Taskbar shows it too)
  or a Start Button. Outside a desktop it takes the modern art.

## Variants

| Value | Look |
|-------|------|
| (none) | Modern - the system's tokens, glass bar and menu, the modern icons |
| `data-variant="win7"` | Glass frames with the close button on a red glass key, the round start orb, a dark glass bar with icon-only window buttons, the two-panel start menu, glossy icons, Segoe UI |
| `data-variant="winxp"` | The blue title bars and taskbar, the green start button, beige windows, the two-column start menu on a blue banner, the welcome screen, glossy icons, Tahoma |
| `data-variant="win98"` | Bevelled grey with gradient title bars, the start menu's brand strip, 16-colour icons, the pixel font on teal |
| `data-variant="win95"` | As 98 with solid title bars and a grey brand strip |

| Glyph (`data-glyph`) |
|-------|
| `computer`, `folder`, `documents`, `trash`, `text`, `terminal`, `settings`, `browser`, `mail`, `picture`, `calculator`, `music`, `network`, `help`, `user`, `power`, `flag` |

| Custom property | Effect |
|-----------------|--------|
| `--desktop-wallpaper` | The picture behind the icons (each look sets its own) |

## States

| State | Meaning |
|-------|---------|
| `default` | CSS only - the look is `data-variant`; the components inside carry their own states |

## ARIA

The Desktop adds no role; its components carry theirs (the listbox of
icons, the taskbar landmark, the menu, the dialogs, the sign-in screen).
Glyphs are decoration: the icon's label, the item's label or the window's
title names it.

## Notes

- The looks are remade, not copied: the drawings, wallpapers and colours are
  our own; the proportions follow the MIT frameworks 98.css, xp.css and
  7.css. The 95 / 98 pixel font is "Pixelated MS Sans Serif" by lou
  (FontStruct), CC BY-SA 3.0 - embedded unchanged, attributed in the sheet.
- XP and 7 name fonts the reader's system may not have (Tahoma, Trebuchet
  MS, Segoe UI); each has a fallback stack.
- A look restyles the system's own controls inside it (Button, Input,
  Textarea, Select) so a window's content belongs to its period.
