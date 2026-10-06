---
name: Timeline
type: ATM
section: data-display
why: Ordered list laid out on a vertical or horizontal rail - the <ol> keeps the chronological semantics.
when: Event history: activity logs, order tracking, changelog-style lists, roadmaps and release lines (horizontal) - for a process the user moves through, use steps.
where: dist/components/timeline/timeline.css
supportedStates: default
---

# Timeline

## Native basis

`<ol>` element with timeline items connected by a line - vertical by default, horizontal with `data-orientation="horizontal"`.

## Native Web APIs

- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - ordered list conveying sequence
- [`::before`](https://developer.mozilla.org/en-US/docs/Web/CSS/::before) - pseudo-element for the connector line (a grid item beside the dot when horizontal)
- [Subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid) - horizontal items share their rows, so every dot sits on one line
- [`scroll-snap-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type) - a full horizontal timeline scrolls sideways and snaps to items
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - an icon inside the dot re-centers the connector
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - dots and connector stay visible in system colors

## Structure

```html
<ol class="timeline">
  <li class="timeline-item">
    <div class="timeline-dot"></div>
    <div class="timeline-content">
      <p class="timeline-title">Event title</p>
      <p class="timeline-description">Event description text.</p>
      <time class="timeline-time">January 2024</time>
    </div>
  </li>
  <li class="timeline-item">
    <div class="timeline-dot" data-variant="active"></div>
    <div class="timeline-content">
      <p class="timeline-title">Current event</p>
      <p class="timeline-description">This is the current step.</p>
      <time class="timeline-time">March 2024</time>
    </div>
  </li>
</ol>
```

## Horizontal (`data-orientation="horizontal"`)

```html
<ol class="timeline" data-orientation="horizontal" data-align="center">
  <li class="timeline-item">
    <div class="timeline-dot" data-variant="active"></div>
    <div class="timeline-content">
      <p class="timeline-title">v1.0</p>
      <time class="timeline-time">Mar 2025</time>
    </div>
  </li>
  <!-- … -->
</ol>
```

| Attribute on `.timeline` | Effect |
| --- | --- |
| `data-orientation="horizontal"` | A row of equal columns (at least 10rem each), dot on top, content below; a full row scrolls sideways and snaps to items |
| `data-align="center"` | Dot and text centered in each column (default: start) |
| `data-alternate` | Every second item's content sits ABOVE the line |

Same markup as vertical - only the root attributes change. The rows are a
subgrid shared by all items, so the dots stay on one line whatever the
content heights; the connector runs from 0.375rem after one dot to 0.375rem
before the next.

## Dot variants (`data-variant`)

| Value     | Description                     |
|-----------|---------------------------------|
| `default` | Muted dot (default)             |
| `active`  | Primary-colored dot - the current step |
| `outline` | Hollow ring - planned / upcoming |
| `destructive` | Destructive-colored dot - a failure |

### Icon dots

An `<svg>`, `<img>` or lucide `<i data-lucide>` inside `.timeline-dot` turns it
into a 1.5rem badge with a 0.875rem icon; the connector re-centers on it (both
orientations). The variants color the badge (`active` = primary, `destructive`,
`outline` = ringed background).

```html
<li class="timeline-item">
  <div class="timeline-dot" data-variant="destructive"><i data-lucide="circle-x"></i></div>
  <div class="timeline-content">…</div>
</li>
```

## Density

Set `data-density` on the `.timeline` root; the per-item rhythm (connector gap + trailing space) scales. Last item keeps no trailing space in any density. Horizontally, the gap between dot and content scales.

| Value | Effect |
| --- | --- |
| `compact` | Item gap 0.75rem, spacing 1.125rem |
| `comfortable` | Gap 1rem, spacing 1.5rem - identical to the unsized default |
| `spacious` | Gap 1.25rem, spacing 1.875rem |

## Accessibility

- `<ol>` provides sequential ordering for screen readers
- `<time>` element used for machine-readable dates
