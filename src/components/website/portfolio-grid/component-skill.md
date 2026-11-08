---
name: Portfolio Grid
type: BLK
section: website
why: A plain list of links around a picture and a caption - the mosaic, the masonry columns, the polaroids, the film strip and the editorial index are CSS grid, columns, transforms and scroll snap; the index shows a picture on hover AND keyboard focus. No script.
when: The work on a portfolio, studio or photographer's site, arranged with character. One project with more context takes project-item; the page of one project takes project-details.
where: dist/components/portfolio-grid/portfolio-grid.css
supportedStates: default
---

# Pattern: Portfolio Grid

## Native basis
A `<ul>` of projects. Each item is one link around the picture (`<img>`) and a caption - the title and a line of meta (discipline, year) - so the whole tile is one focusable target whose name is its caption.

Built from: plain HTML - no other component. Shapes come from `theme/utils/shapes.css`; entrances and reveals from [Motion](../../guides/motion/component-skill.md) and [Parallax](../../guides/parallax/component-skill.md).

---

## Native Web APIs
- [CSS grid `grid-auto-flow: dense`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-auto-flow) - the mosaic fills the gaps the big tiles leave
- [Multi-column layout](https://developer.mozilla.org/en-US/docs/Web/CSS/columns) - masonry columns of natural heights
- [Scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type) - the film strip stops on each project
- [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - narrow, the spans fold and the index shows its pictures inline
- [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - the index's picture shows for the keyboard as for the pointer
- [`rotate` / `scale`](https://developer.mozilla.org/en-US/docs/Web/CSS/rotate) - the polaroids' tilt, straightened on hover
- [CSS counters](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_counter_styles/Using_CSS_counters) - the index numbers its rows

---

## Structure

```html
<ul class="mk-portfolio-grid">
  <li class="mk-portfolio-grid-item" data-span="big">
    <a class="mk-portfolio-grid-link" href="#">
      <img class="mk-portfolio-grid-media" src="https://picsum.photos/seed/pg-1/900/900" alt="" />
      <span class="mk-portfolio-grid-caption">
        <strong class="mk-portfolio-grid-title">Northwind design system</strong>
        <span class="mk-portfolio-grid-meta">Design system · 2025</span>
      </span>
    </a>
  </li>
  <li class="mk-portfolio-grid-item">
    <a class="mk-portfolio-grid-link" href="#">
      <img class="mk-portfolio-grid-media" src="https://picsum.photos/seed/pg-2/600/600" alt="" />
      <span class="mk-portfolio-grid-caption">
        <strong class="mk-portfolio-grid-title">Museo Digital</strong>
        <span class="mk-portfolio-grid-meta">Website · 2024</span>
      </span>
    </a>
  </li>
  <li class="mk-portfolio-grid-item" data-span="tall">
    <a class="mk-portfolio-grid-link" href="#">
      <img class="mk-portfolio-grid-media" src="https://picsum.photos/seed/pg-3/600/1200" alt="" />
      <span class="mk-portfolio-grid-caption">
        <strong class="mk-portfolio-grid-title">Atlas Transit</strong>
        <span class="mk-portfolio-grid-meta">Mobile app · 2023</span>
      </span>
    </a>
  </li>
</ul>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A bento mosaic: 12rem rows, the caption over the picture on a scrim; `data-span="wide"`, `"tall"` or `"big"` on an item spans two columns, two rows or both |
| `data-variant="masonry"` | Columns of natural heights (15rem and wider), the caption under each picture |
| `data-variant="scatter"` | Polaroids on a table: each tilted a little differently, straight and lifted on hover or focus; serif italic captions |
| `data-variant="strip"` | A film strip: one row that scrolls sideways and snaps to each project, 4:5 pictures |
| `data-variant="index"` | An editorial index: numbered rows of big titles with their meta; the picture appears beside the title on hover or focus - narrow, it is a thumbnail in the row |
| shape utilities on `.mk-portfolio-grid-link` or `.mk-portfolio-grid-media` | `corner-arch`, `corner-blob`, `shape-hexagon`, `frame-polaroid`, `shadow-hard`, `cut-corners` ... from `theme/utils/shapes.css` |
| `.parallax-reveal` / `data-df-entrance` on the items | The items rise into view as they scroll in ([Parallax](../../guides/parallax/component-skill.md)), or enter in turn with `data-df-stagger` on the list ([Motion](../../guides/motion/component-skill.md)) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| list | `<ul>` | The projects are a list; the item count is announced |
| tile | one `<a>` per item | The link's name is the caption - title and meta |
| picture | `alt=""` | The caption names the project; describe the picture when it shows what the title does not |
| index picture | shown on `:hover` and `:focus-visible` | Decorative there - the title says where the link goes |

---

## Notes
- A filtered list hides items with the `hidden` attribute on the `<li>` - the block never sets `display` on an item.
- The strip scrolls with the keyboard too: tabbing to a tile scrolls it into view.
- In print the strip becomes two columns and the index drops its hover pictures.
