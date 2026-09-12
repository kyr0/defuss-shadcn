---
name: Collapsible
type: ATM
why: A single <details> disclosure with smooth height animation via interpolate-size.
when: Revealing or hiding one content region — an accordion of exactly one item, e.g. advanced options.
where: dist/components/collapsible/collapsible.css
supportedStates: default
---

# Collapsible

## Native basis

`<details>` element providing native expand/collapse behavior with animated transitions.

## Native Web APIs

- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) — native disclosure widget
- [`<summary>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary) — visible heading/trigger
- [`::details-content`](https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content) — pseudo-element for content animation
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) — entry animation starting values

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


## Density

Set `data-density` on the `.collapsible` root. A whitespace policy, not a zoom: only gaps and padding scale (ratio 0.75 / 1 / 1.25); typography and fixed dimensions stay identical. `comfortable` matches the unsized default.

| Value | Effect |
| --- | --- |
| `compact` | trigger 0.5rem 0.75rem, content 0 0.75rem 0.5rem |
| `comfortable` | trigger 0.75rem 1rem, content 0 1rem 0.75rem — identical to the unsized default |
| `spacious` | trigger 1rem 1.25rem, content 0 1.25rem 1rem |

## Accessibility

- `<details>`/`<summary>` is natively accessible — keyboard and screen reader support built in
- No additional ARIA attributes needed
- Summary text should clearly describe the hidden content
