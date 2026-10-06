---
name: Before After
type: BLK
section: website
why: One custom property (--mk-ba-pos) drives a clip-path; the slider is a native range input (keyboard-operable); the toggle variant is a checkbox read by :has() - CSS-only.
when: Edits, renovations, redesigns, restorations. Two unrelated pictures belong in a gallery.
where: dist/components/before-after/before-after.css
supportedStates: default
---

# Pattern: Before After

## Native basis
A `<figure>` with two stacked pictures of the same size; the "after" picture is clipped by `clip-path: inset(0 0 0 var(--mk-ba-pos))`. A transparent `<input type="range">` covers the stage - one line of page script copies its value into `--mk-ba-pos`.

---

## Native Web APIs
- [`clip-path`](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path) - reveal one picture over the other
- [`<input type="range">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range) - a keyboard-operable slider
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) - media with its caption
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - stable media boxes, no layout shift

---

## Structure

```html
<figure class="mk-before-after">
  <div class="mk-before-after-stage">
    <img class="mk-before-after-before" src="https://picsum.photos/seed/ba-street/1200/800?grayscale&amp;blur=2" alt="Before: the photo, faded and blurred">
    <img class="mk-before-after-after" src="https://picsum.photos/seed/ba-street/1200/800" alt="After: the same photo, restored in color">
    <span class="mk-before-after-handle" aria-hidden="true"></span>
    <span class="mk-before-after-label" data-side="before">Before</span>
    <span class="mk-before-after-label" data-side="after">After</span>
    <input class="mk-before-after-range" type="range" min="0" max="100" value="50" aria-label="Divider position: drag to compare before and after">
  </div>
  <figcaption class="mk-before-after-caption">Restoring a faded photo: color and detail back.</figcaption>
</figure>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A divider with a handle; drag anywhere or use the arrow keys (range input) |
| `data-variant="toggle"` | A "Show after" switch reveals the after picture - no script at all |
| `data-variant="split"` | Side by side, aligned, each labelled |
| `--mk-ba-pos` | Where the divider sits |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| slider | `<input type="range" aria-label>` | Keyboard: arrows move the divider |
| pictures | `alt="Before: …"` / `"After: …"` | Both described |
| toggle | a labelled checkbox | CSS-only reveal |

---

## Notes
- Use pictures with the same framing and size.
- Without the script the slider variant shows a fixed 50 / 50 split; the toggle and split variants need none.
