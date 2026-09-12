---
name: Progress
type: ATM
why: Native <progress value max> — semantics and rendering come free.
when: Completion of a task with a known total; unknown total takes the spinner.
where: dist/components/progress/progress.css
supportedStates: default
---

# Progress

## Native basis

`<progress>` element with CSS styling for the track and indicator bar.

## Native Web APIs

- [`<progress>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) — native HTML progress indicator
- [`::-webkit-progress-bar`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-progress-bar) — track pseudo-element (WebKit)
- [`::-webkit-progress-value`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-progress-value) — indicator pseudo-element (WebKit)
- [`::-moz-progress-bar`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-moz-progress-bar) — indicator pseudo-element (Firefox)

## Structure

```html
<!-- Determinate progress -->
<progress class="progress" value="66" max="100">66%</progress>

<!-- Indeterminate progress (no value attribute) -->
<progress class="progress" max="100">Loading...</progress>
```

## Sizes

| `data-size` | Bar height |
|-------------|------------|
| `xs` | 0.25rem |
| `sm` | 0.375rem |
| `md` | 0.5rem |
| *(none)* | 0.5rem |
| `lg` | 0.75rem |
| `xl` | 1rem |

---
## Accessibility

- `<progress>` is natively accessible — screen readers announce the percentage
- The text content inside `<progress>` is the fallback for non-supporting browsers
- Use `aria-label` if the progress bar lacks a visible label
