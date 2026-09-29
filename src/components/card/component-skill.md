---
name: Card
type: MOL
why: Token-backed surface with header/content/footer slots - one container for anything boxed.
when: Grouping related content and actions on a page - dashboards, lists, modal bodies.
where: dist/components/card/card.css
supportedStates: default
---

# Pattern: Card

## Native basis
`<div>` for layout grouping. `<article>` for standalone self-contained content.
No JavaScript required.

---

## Native Web APIs
- [CSS Container Queries (`@container`)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - responsive layout based on card container width
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - intrinsic ratio for card media images

---

## Structure

```html
<!-- Standard card -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Title</h3>
    <p class="card-description">Supporting description.</p>
  </div>
  <div class="card-content">
    <!-- body content -->
  </div>
  <div class="card-footer">
    <button class="btn" data-variant="outline">Cancel</button>
    <button class="btn" data-variant="default">Save</button>
  </div>
</div>

<!-- Standalone content (use article) -->
<article class="card">
  <div class="card-header">
    <h2 class="card-title">Article Heading</h2>
    <p class="card-description">Published January 1, 2025</p>
  </div>
  <div class="card-content">
    <p>Body text...</p>
  </div>
</article>

<!-- Header only (no footer) -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Notifications</h3>
    <p class="card-description">You have 3 unread messages.</p>
  </div>
  <div class="card-content">
    <!-- content with internal actions -->
  </div>
</div>
```

---

## Semantic element selection

| Use case                          | Element    |
|-----------------------------------|------------|
| UI grouping (form, settings panel)| `<div>`    |
| Blog post, news article           | `<article>`|
| Product in a listing              | `<article>`|
| Dashboard metric                  | `<div>`    |
| Navigation section group          | `<section>`|

---

## Composition patterns

### Card with image
```html
<div class="card" style="overflow:hidden;">
  <img src="..." alt="..." style="width:100%;aspect-ratio:16/9;object-fit:cover;">
  <div class="card-header">
    <h3 class="card-title">Title</h3>
  </div>
  <div class="card-content">...</div>
</div>
```

### Card with header action
```html
<div class="card">
  <div class="card-header" style="flex-direction:row;align-items:center;justify-content:space-between;">
    <div>
      <h3 class="card-title">Title</h3>
      <p class="card-description">Description</p>
    </div>
    <button class="btn" data-variant="ghost" data-size="icon" aria-label="More options">
      <svg>...</svg>
    </button>
  </div>
  <div class="card-content">...</div>
</div>
```

### Metric card
```html
<div class="card">
  <div class="card-header" style="flex-direction:row;align-items:center;justify-content:space-between;padding-bottom:0.5rem;">
    <p class="card-description" style="font-size:0.875rem;font-weight:500;">Total Revenue</p>
    <svg aria-hidden="true">...</svg>
  </div>
  <div class="card-content" style="padding-top:0.5rem;">
    <p style="font-size:1.75rem;font-weight:700;">$45,231.89</p>
    <p class="card-description">+20.1% from last month</p>
  </div>
</div>
```

---

## Variants (`data-variant` on `.card`)

| Value | Look |
| --- | --- |
| *(none)* | Card surface with a border |
| `outline` | Border only, no fill |
| `dashed` | 2px dashed border - a drop zone or placeholder |
| `ghost` | No border, no fill |
| `muted` | `--muted` surface, no border |
| `elevated` | `--shadow-lg` instead of a border |
| `primary` | `--primary` surface, `--primary-foreground` text |
| `neutral` | A charcoal surface: the inverse colors softened to 78% (`--foreground` mixed into `--background`), so it stays apart from `--primary` |
| `glass` | Translucent card + `backdrop-filter` blur over what is behind it |

On `primary` / `neutral` cards use `secondary` or `outline` buttons for the main
action - a default button matches the card surface. `ghost` and `link` buttons
there take the card's text color and a hover tint made from it. Custom colors: set `--card`,
`--card-foreground`, `--border` (and `--muted-foreground`) on the card.

## Sizes (`data-size`)

`xs` · `sm` · `md` (default) · `lg` · `xl` - section padding (0.75 / 1 / 1.5 / 2 /
2.5rem) and the title / description type scale together. Combines with
`data-density`, which multiplies only the padding.

## Media and body

```html
<article class="card">
  <figure class="card-media"><img src="…" alt="…"></figure>   <!-- first: image on top -->
  <div class="card-header">…</div>
  <div class="card-footer">…</div>
</article>
```

- `.card-media` - a figure (img / video / picture / svg) edge to edge, 16:9
  unless you set an `aspect-ratio`; last child = image at the bottom.
  `data-inset` pads and rounds it.
- `.card-body` - optional wrapper around header / content / footer; required
  for the side and overlay layouts; pushes the footer to the bottom.

## Layouts (`data-layout`)

| Value | Effect |
| --- | --- |
| `side` | media \| body in one row (figure after the body = image on the right) |
| `auto` | side by side while the CARD is wide enough, stacked when it is not - follows the card's own width (flex-wrap), not the viewport |
| `overlay` | the media is the background; the body sits on a dark scrim at the bottom, white text |

`data-align="center"` centers the header text and the footer actions.

## Interactive and selectable

- `<a class="card" href="…">` (or `data-interactive`) - lifts on hover, focus
  ring on keyboard focus, no motion under reduced motion.
- `<label class="card">` around a checkbox / radio - the whole card is the hit
  area; the checked card takes a `--primary` ring, focus shows a ring, a
  disabled input dims the card. The input keeps the value and the form.

## Composing with Shapes

Shapes utilities work on any card: `cut-corners`, `scoop-corners`,
`corner-leaf`, `frame-tape`, `frame-window`, `frame-polaroid`,
`shadow-hard`, `stack-*` piles, and an `aura` wrapper around it. A card has
no intrinsic width (it is a size container) - a wrapper that sizes to its
content (`aura`, `indicator`) needs a width.

## Density

Set `data-density` on the `.card` root; header/content/footer paddings scale together (ratio `0.75` / `1` / `1.25`, matching `sizing.css`).

| Value | Effect |
| --- | --- |
| `compact` | Section padding 1rem (header+footer-only gap 0.75rem) |
| `comfortable` | Section padding 1.5rem - identical to the unsized default |
| `spacious` | Section padding 2rem (gap 1.5rem) |

## Notes

- Card is a container pattern - its children define its purpose
- Avoid deeply nesting cards (card inside card) - use `--muted` surface instead
- For interactive cards (click to navigate), put the card classes on an `<a>` (see "Interactive and selectable")
- `card-footer` uses `padding-top: 0` to avoid double-spacing with `card-content`
- `card-header` drops its bottom padding for the section that follows - unless it is the last child (a header-only card), then it keeps it, at every density
- For a card grid, use CSS Grid on the parent - the card itself has no layout opinion
