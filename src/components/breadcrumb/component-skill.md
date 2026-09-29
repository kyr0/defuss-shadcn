---
name: Breadcrumb
type: ATM
why: nav > ol markup with aria-current="page" - the accessibility comes free with the markup, not from JS.
when: Showing hierarchy in multi-level sites/apps so users know where they are and can jump up.
where: dist/components/breadcrumb/breadcrumb.css
supportedStates: default
---

# Breadcrumb

## Native basis

`<nav>` + `<ol>` for hierarchical path display. Pure CSS - no JavaScript required.

---

## Native Web APIs

- [`<nav>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav) - navigation landmark for screen readers
- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - ordered list conveying hierarchy
- [`aria-current="page"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - identifies the current page in the trail
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - keyboard-only focus ring on links
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses hover transitions
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - underlines links and bolds current page
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - maps colors to system palette

---

## Structure

### Default (slash separator)

```html
<nav class="breadcrumb" aria-label="Breadcrumb">
  <ol class="breadcrumb-list">
    <li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Home</a></li>
    <li class="breadcrumb-separator" aria-hidden="true">/</li>
    <li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Components</a></li>
    <li class="breadcrumb-separator" aria-hidden="true">/</li>
    <li class="breadcrumb-item"><span class="breadcrumb-page" aria-current="page">Breadcrumb</span></li>
  </ol>
</nav>
```

### Custom separator (chevron icon)

```html
<nav class="breadcrumb" aria-label="Breadcrumb">
  <ol class="breadcrumb-list">
    <li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Home</a></li>
    <li class="breadcrumb-separator" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round"
           stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </li>
    <li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Components</a></li>
    <li class="breadcrumb-separator" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round"
           stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </li>
    <li class="breadcrumb-item"><span class="breadcrumb-page" aria-current="page">Breadcrumb</span></li>
  </ol>
</nav>
```

### Collapsed (with ellipsis)

```html
<nav class="breadcrumb" aria-label="Breadcrumb">
  <ol class="breadcrumb-list">
    <li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Home</a></li>
    <li class="breadcrumb-separator" aria-hidden="true">/</li>
    <li class="breadcrumb-item">
      <span class="breadcrumb-ellipsis" aria-hidden="true">⋯</span>
      <span class="sr-only">More pages</span>
    </li>
    <li class="breadcrumb-separator" aria-hidden="true">/</li>
    <li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Components</a></li>
    <li class="breadcrumb-separator" aria-hidden="true">/</li>
    <li class="breadcrumb-item"><span class="breadcrumb-page" aria-current="page">Breadcrumb</span></li>
  </ol>
</nav>
```

---

### With icons or emojis

```html
<li class="breadcrumb-item"><a class="breadcrumb-link" href="/"><svg aria-hidden="true">…</svg>Home</a></li>
<li class="breadcrumb-separator" aria-hidden="true">/</li>
<li class="breadcrumb-item"><span class="breadcrumb-page" aria-current="page"><span class="breadcrumb-icon" aria-hidden="true">🍏</span>Granny Smith</span></li>
```

- An `<svg>` as a direct child of `.breadcrumb-link` / `.breadcrumb-page`
  turns the crumb into an inline-flex row: the icon is `1em` (it scales with
  `data-size`) and centered on the label.
- Emojis go in a `.breadcrumb-icon` span (a square `1.15em` box) so they line
  up like icons. Mark both decorative (`aria-hidden="true"`) - the label names
  the crumb.

---

## Sizes

Set `data-size` on the `.breadcrumb` nav. 

| `data-size` | Effect |
|-------------|--------|
| `xs` | 0.75rem type, 0.75rem separators |
| `sm` | 0.8125rem type |
| `md` | 0.875rem type - identical to the unsized default |
| `lg` | 1rem type, 1rem separators |
| `xl` | 1.125rem type, 1.125rem separators |

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `aria-label="Breadcrumb"` | `<nav>` | Names the navigation region |
| `aria-current="page"` | Current page `<span>` | Identifies the current page in the trail |
| `aria-hidden="true"` | Separator `<li>` | Hides decorative separators from screen readers |
| `aria-hidden="true"` | Ellipsis `<span>` | Hides decorative ellipsis from screen readers |
| `aria-hidden="true"` | Icon `<svg>` / `.breadcrumb-icon` | Decorative - the label already names the crumb |

---

## Keyboard

| Key | Action |
|-----|--------|
| `Tab` | Moves focus to the next breadcrumb link |
| `Shift + Tab` | Moves focus to the previous breadcrumb link |
| `Enter` | Activates the focused link |

All links are native `<a>` elements - keyboard navigation works automatically.

---

## Notes

- Use `<ol>` (ordered list) to convey the hierarchical order to assistive technology.
- The current page uses `<span>` (not `<a>`) since it's not a link - add `aria-current="page"`.
- Separators are decorative - always add `aria-hidden="true"`.
- Default separator is `/` text. Replace with an SVG chevron for the icon variant.
- For long trails, collapse middle items using `.breadcrumb-ellipsis`.
- CSS uses `[dir="rtl"]` to auto-flip chevron SVG separators.
- No JavaScript required - this is a purely CSS component.
