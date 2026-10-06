---
name: Separator
type: ATM
why: An <hr> (or role=separator with aria-orientation) - semantic and free.
when: Dividing content groups visually and semantically.
where: dist/components/separator/separator.css
supportedStates: default
---

# Pattern: Separator

## Native basis
`<hr>` element (horizontal rule) and `<div role="separator">` for vertical orientation.

---

## Native Web APIs
- [`<hr>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr) - thematic break / horizontal rule with implicit `role="separator"`
- [`role="separator"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/separator_role) - ARIA separator role for non-`<hr>` elements (vertical orientation)
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - Windows High Contrast Mode support with system colors
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - increased contrast when requested by the user

---

## Structure

### Horizontal (default)
```html
<hr class="separator">
```

### Vertical
```html
<div class="separator" data-orientation="vertical" role="separator"></div>
```

### With text
```html
<!-- the text sits on the line; pseudo-element lines flank it -->
<div class="separator">OR</div>
<!-- on a vertical line, between side-by-side blocks (parent: flex row) -->
<div class="separator" data-orientation="vertical">OR</div>
```

An empty separator must be **truly empty** - even a space inside turns it into
a text separator (`:not(:empty)`). `<hr>` is void, so text separators are a
`<div>`.

### With label (older wrapper form - still supported)
```html
<div class="separator-label">
  <hr class="separator">
  <span>or continue with</span>
  <hr class="separator">
</div>
```

### Decorative (hidden from screen readers)
```html
<!-- an ornamental section break: the glyph is decoration, never read out -->
<div class="separator" aria-hidden="true" data-gap="lg">✦ ✦ ✦</div>
<div class="separator" aria-hidden="true" data-variant="accent" data-size="md" style="font-size:1.125rem;">❦</div>
<!-- a short accent rule: role="none" drops the <hr>'s separator semantics -->
<hr class="separator" role="none" data-variant="primary" data-size="lg" style="width:3rem;margin-inline:auto;">
```

Hide a separator that only decorates - an ornament between sections of the
same text, a flourish under a title - with `aria-hidden="true"` (a text
separator: its glyphs would otherwise be read) or `role="none"` (an `<hr>`);
a separator that divides content keeps its semantics.

### In a list
```html
<ul>
  <li>Item 1</li>
  <li role="separator"><hr class="separator"></li>
  <li>Item 2</li>
</ul>
```

### Between menu items
```html
<div class="flex items-center gap-4" style="height:1.25rem;">
  <span>Blog</span>
  <div class="separator" data-orientation="vertical" role="separator"></div>
  <span>Docs</span>
  <div class="separator" data-orientation="vertical" role="separator"></div>
  <span>Source</span>
</div>
```

---

## Variants

| `data-orientation` | Direction  | Element                   |
|--------------------|------------|---------------------------|
| *(default)*        | Horizontal | `<hr>`                    |
| `vertical`         | Vertical   | `<div role="separator">` |

DaisyUI naming: its `divider-horizontal` divides side-by-side items - that is
our `data-orientation="vertical"` (the LINE is vertical).

| Attribute | Values | Effect |
| --- | --- | --- |
| `data-variant` | `neutral`, `primary`, `secondary`, `accent`, `info`, `success`, `warning`, `destructive` (alias `error`) | Line color (text stays muted). `secondary` / `accent` use `--chart-2` / `--chart-4` (the tokens' `--secondary` / `--accent` are pale surfaces); success / warning / info are literal colors |
| `data-align` | `start`, `end` (default center) | Where the text sits along the line (vertical: start = top) |
| `data-size` | `sm` 1px (default), `md` 2px, `lg` 4px, `xl` 8px | Thickness - with or without text |
| `data-gap` | `none`, `sm`, `md` (default 0.75rem), `lg`, `xl` | Space between the text and the lines |
| `data-orientation-md` / `-lg` | `vertical` | A vertical line from 48 / 64rem up - the parent must switch to a row at the same width |

For space AROUND a separator use the margin utilities (`my-4`, `my-8` ...).

---

## ARIA

| Attribute          | Element     | Purpose                                           |
|--------------------|-------------|---------------------------------------------------|
| `role="separator"` | `<div>`     | Required on vertical separators (non-`<hr>`)      |
| `role="none"`      | `<hr>`      | Marks decorative separators - hidden from AT      |
| `aria-hidden="true"`| `<hr>`     | Alternative way to hide decorative separators     |
| `aria-orientation` | `<div>`     | Implicit from `role="separator"`; defaults to horizontal |
| *(no role)*        | `<div>` with text | Meaningful text ("or") - `role="separator"` makes its children presentational, so screen readers would skip the text; leave the role off or add `aria-label` |

---

## Notes

- `<hr>` has implicit `role="separator"` - no extra ARIA needed for horizontal.
- Vertical separators use `<div role="separator">` since `<hr>` is semantic horizontal only.
- Decorative separators (purely visual with no semantic meaning) should use `role="none"` or `aria-hidden="true"` to hide from screen readers.
- The vertical separator requires the parent to be a flex container.
- Text inside the separator draws its lines as `::before` / `::after`; the older `.separator-label` wrapper (two `<hr>` around a span) still works.
- In `forced-colors` mode, the line and text use the `CanvasText` system color.
- In `prefers-contrast: more` mode, an uncolored separator uses `--foreground` and an unsized one is 2px thick.
- Separators are purely visual - no JavaScript required.
