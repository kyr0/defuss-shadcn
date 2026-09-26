---
name: Timeline
type: ATM
why: Ordered list laid out on a vertical rail - the <ol> keeps the chronological semantics.
when: Event history: activity logs, order tracking, changelog-style lists.
where: dist/components/timeline/timeline.css
supportedStates: default
---

# Timeline

## Native basis

`<ol>` element with timeline items connected by a vertical line.

## Native Web APIs

- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - ordered list conveying sequence
- [`::before`](https://developer.mozilla.org/en-US/docs/Web/CSS/::before) - pseudo-element for connector line and dot

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

## Dot variants (`data-variant`)

| Value     | Description                     |
|-----------|---------------------------------|
| `default` | Muted dot (default)             |
| `active`  | Primary-colored dot             |

## Density

Set `data-density` on the `.timeline` root; the per-item rhythm (connector gap + trailing space) scales. Last item keeps no trailing space in any density.

| Value | Effect |
| --- | --- |
| `compact` | Item gap 0.75rem, spacing 1.125rem |
| `comfortable` | Gap 1rem, spacing 1.5rem - identical to the unsized default |
| `spacious` | Gap 1.25rem, spacing 1.875rem |

## Accessibility

- `<ol>` provides sequential ordering for screen readers
- `<time>` element used for machine-readable dates
