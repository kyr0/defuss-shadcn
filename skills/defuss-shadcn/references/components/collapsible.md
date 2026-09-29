---
name: Collapsible
type: ATM
why: A single <details> disclosure with smooth height animation via interpolate-size.
when: Revealing or hiding one content region - an accordion of exactly one item, e.g. advanced options.
where: dist/components/collapsible/collapsible.css
supportedStates: default
---

# Collapsible

## Native basis

`<details>` element providing native expand/collapse behavior with animated transitions.

## Native Web APIs

- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure widget
- [`<summary>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary) - visible heading/trigger
- [`::details-content`](https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content) - pseudo-element for content animation
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - entry animation starting values

## Structure

```html
<details class="collapsible">
  <summary class="collapsible-trigger">
    <span>Click to expand</span>
    <svg class="collapsible-chevron"><!-- chevron icon --></svg>
  </summary>
  <div class="collapsible-content">
    <p>Collapsible content goes here.</p>
  </div>
</details>
```


### Icons, emojis and markers

```html
<details class="collapsible" data-marker="arrow" data-size="lg" data-variant="muted">
  <summary class="collapsible-trigger">
    <span class="collapsible-icon" aria-hidden="true">🎨</span>
    Appearance
  </summary>
  <div class="collapsible-content">…</div>
</details>
```

- `.collapsible-icon` - an svg or emoji in front of the heading (a fixed
  1.1em box, so headings line up).
- `data-marker="arrow"` / `"plus"` - a CSS-drawn sign at the end of the
  heading (the arrow turns up, the plus becomes a minus) - no icon markup.
  `data-marker-position="start"` moves it before the heading.
- Your own glyph: `.collapsible-chevron` turns 180° when open
  (`data-turn="quarter"`: 90°, for a chevron-right; mirrored in RTL) - or two
  elements `.collapsible-when-closed` / `.collapsible-when-open` (📁 / 📂,
  "Show" / "Hide") of which the right one shows.

## Variants (`data-variant`)

| Value | Surface |
| --- | --- |
| *(none)* | Bordered, page background |
| `ghost` | No border, no surface |
| `muted` | `--muted` surface |
| `primary` | `--primary` surface, `--primary-foreground` text |
| `neutral` | Charcoal (the inverse colors, softened) |
| `highlight` | Plain while closed, `primary` once open (animated) |

Custom colors: set `background` and `color` on the `.collapsible` - the hover
tint (7%), the marker (65%) and the content text (72%) mix from its text
color, so any palette works.

## Sizes (`data-size`)

The heading only: `sm` 0.8125rem · `md` 0.875rem (default) · `lg` 1rem semibold · `xl` 1.125rem bold.

## Density

Set `data-density` on the `.collapsible` root. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | trigger 0.5rem 0.75rem, content 0 0.75rem 0.5rem |
| `comfortable` | trigger 0.75rem 1rem, content 0 1rem 0.75rem - identical to the unsized default |
| `spacious` | trigger 1rem 1.25rem, content 0 1.25rem 1rem |

## Accessibility

- `<details>`/`<summary>` is natively accessible - keyboard and screen reader support built in
- No additional ARIA attributes needed
- Summary text should clearly describe the hidden content
