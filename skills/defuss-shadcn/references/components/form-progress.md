---
name: Form Progress
type: BLK
section: website
why: A native <progress> for the fraction and an ordered list with aria-current="step" for the stages - no script.
when: Multi-step forms: checkout, onboarding, applications. A workflow explanation is process-step; shipment progress is tracking-status.
where: dist/components/form-progress/form-progress.css
supportedStates: default
---

# Pattern: Form Progress

## Native basis
A `<nav aria-label="Progress">`: "Step 2 of 4 · Company", a `<progress>`, and an `<ol>` of steps - done ones with `data-done`, the current with `aria-current="step"`.

Built from: [Progress](progress.md).

---

## Native Web APIs
- [`<progress>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) - native completion bar
- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - an ordered sequence
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current page / step / item
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<nav class="mk-form-progress" aria-label="Progress">
  <div class="mk-form-progress-status"><strong>Step 2 of 4 · Company</strong><span>About 2 minutes left</span></div>
  <progress class="progress" value="2" max="4" aria-label="Step 2 of 4">2 of 4</progress>
  <ol class="mk-form-progress-steps">
    <li data-done><span class="mk-form-progress-dot" aria-hidden="true"><i data-lucide="check"></i></span>Account</li>
    <li aria-current="step"><span class="mk-form-progress-dot" aria-hidden="true">2</span>Company</li>
    <li><span class="mk-form-progress-dot" aria-hidden="true">3</span>Plan</li>
    <li><span class="mk-form-progress-dot" aria-hidden="true">4</span>Invite</li>
  </ol>
</nav>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | The status line, a bar and the step names |
| `data-variant="numbered"` | Numbered circles joined by lines (checks when done) |
| `data-variant="segments"` | One segment per step, filled up to the current one |
| `data-variant="compact"` | Only the status line and the bar |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| steps | `<ol>` + `aria-current="step"` | The current stage is announced |
| bar | `<progress>` labelled | The fraction as a real progress value |

---

## Notes
- Let people go back to a done step - link it.
