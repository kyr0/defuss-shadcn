---
name: Button
type: ATM
why: Native <button> styled through data-variant/data-size - disabled, form submission, and focus are browser-provided.
when: Every single action trigger - forms, dialogs, toolbars.
where: dist/components/button/button.css
supportedStates: default
---

# Pattern: Button

## Native basis
`<button>` element. Also works on `<a>` for link-style buttons.

---

## Native Web APIs
- [`<button>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button) - native clickable element with built-in keyboard and form support
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus ring, avoids showing focus on mouse clicks
- [`commandfor` / `command`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#command) - declarative button→dialog/popover triggers without JS click handlers
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses hover/focus transitions
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - adds visible borders to all variants in high-contrast mode
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - maps button border/text to system colors in Windows High Contrast Mode

---

## Structure

```html
<button class="btn" data-variant="default">Click me</button>
```

### With icon
```html
<button class="btn" data-variant="default">
  <svg aria-hidden="true" width="16" height="16" ...>...</svg>
  Save
</button>
```

### Icon-only
```html
<button class="btn" data-variant="outline" data-size="icon" aria-label="Settings">
  <svg aria-hidden="true" width="16" height="16" ...>...</svg>
</button>
```

---

## Variants

| `data-variant`  | Surface              | Text                     | Hover                          |
|-----------------|----------------------|--------------------------|--------------------------------|
| `default`       | `--primary`          | `--primary-foreground`   | `opacity: 0.9`                |
| `secondary`     | `--secondary`        | `--secondary-foreground` | `color-mix(in oklch, --secondary 85%, --secondary-foreground)` |
| `outline`       | `--background` + border + shadow-xs | `--foreground`  | `--accent` bg                  |
| `ghost`         | transparent          | `--foreground`           | `--accent` bg                  |
| `destructive`   | `--destructive`      | `--destructive-foreground` | `opacity: 0.9`              |
| `link`          | transparent          | `--primary`              | underline                      |
| `soft`          | `--primary` at 12%   | `--primary` mixed toward `--foreground` | 20% tint     |
| `dashed`        | transparent + dashed border | `--foreground`    | `--accent` bg, solid border    |

## Tones (`data-tone`)

A color for any variant: `success`, `warning`, `info`, `destructive` - or
`custom`, which reads `--btn-color` (and `--btn-color-fg`, the text on a
solid fill, default white) from the button's `style`. Solid (no variant or
`default`) fills with the tone; `outline` / `ghost` / `soft` / `dashed` /
`link` write in it, mixed 78% toward `--foreground` so light tones stay
readable.

```html
<button class="btn" data-tone="success">Save</button>
<button class="btn" data-tone="warning" data-variant="soft">Review</button>
<button class="btn" data-tone="custom" data-variant="outline" style="--btn-color: oklch(0.55 0.22 300);">Violet</button>
```

### Emojis, frames, aura

- Emoji: plain text in the label (`<span aria-hidden="true">🚀</span> Launch`);
  an emoji-only button needs `aria-label`.
- Frames: any `frame-*` class from `shapes.css` replaces the border
  (`<button class="btn frame-double" data-variant="outline">`).
- Aura: wrap it - `<span class="aura" style="display:inline-grid;--shape-round:var(--radius-md)"><button class="btn">…</button></span>`.

### Right-to-left

The layout is logical (the icon before the label leads in both directions).
Mark directional icons `data-rtl-flip` - they mirror under `dir="rtl"`:
`<button class="btn">Next <svg data-rtl-flip …></svg></button>`.

---

## Sizes

| `data-size` | Height    | Padding       | Font size    | Border radius       |
|-------------|-----------|---------------|--------------|---------------------|
| `xs`        | `1.75rem` | `0 0.5rem`    | `0.75rem`    | `var(--radius-sm)`  |
| `sm`        | `2rem`    | `0 0.75rem`   | `0.8125rem`  | `var(--radius-md)`  |
| `md`        | `2.25rem` | `0 1rem`      | `0.875rem`   | `var(--radius-md)`  |
| `lg`        | `2.75rem` | `0 2rem`      | `1rem`       | `var(--radius-md)`  |
| `xl`        | `3.25rem` | `0 2.5rem`    | `1.125rem`   | `var(--radius-md)`  |
| `icon`      | `2.25rem` | `0` (square)  | -            | `var(--radius-md)`  |
| `icon-xs`   | `1.75rem` | `0` (square)  | -            | `var(--radius-sm)`  |
| `icon-sm`   | `2rem`    | `0` (square)  | -            | `var(--radius-md)`  |
| `icon-lg`   | `2.75rem` | `0` (square)  | -            | `var(--radius-md)`  |
| `icon-xl`   | `3.25rem` | `0` (square)  | -            | `var(--radius-md)`  |

---

## Accessibility

- Use `<button>` for actions, `<a>` for navigation.
- Icon-only buttons require `aria-label`.
- Disabled buttons use `disabled` attribute or `aria-disabled="true"`.
- Loading state: add `aria-busy="true"` and swap icon for a spinner.

---

## Notes

- `secondary` darkens on hover via `color-mix()` instead of an opacity fade,
  because `--secondary` is near-white in light themes, so fading would push the button
  *towards* the page background and make the hover effect invisible.
- The `link` variant resets height and padding - it flows inline.
- SVGs inside buttons auto-size to 1rem unless they have a `size-*` class.
- The button works on `<a>` tags for styled navigation links.
