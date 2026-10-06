---
name: Process Step
type: BLK
section: website
why: An ordered list (<ol>) carries the sequence; the connector line and numbers are pure CSS - no script.
when: How-we-work, onboarding or "how it works" sections. For dated history use timeline-item; for a form wizard use form-progress.
where: dist/components/process-step/process-step.css
supportedStates: default
---

# Pattern: Process Step

## Native basis
An `<li class="mk-process-step">` inside an `<ol class="mk-process-steps">`: a number badge, a title and a description; a line joins each step to the next.

---

## Native Web APIs
- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - an ordered sequence
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current page / step / item
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<ol class="mk-process-steps" style="max-width:34rem">
  <li class="mk-process-step">
    <span class="mk-process-step-number" aria-hidden="true">01</span>
    <div class="mk-process-step-body">
      <h3 class="mk-process-step-title">Discover</h3>
      <p class="mk-process-step-desc">Two workshops to map goals, users and constraints.</p>
    </div>
  </li>
  <li class="mk-process-step" aria-current="step">
    <span class="mk-process-step-number" aria-hidden="true">02</span>
    <div class="mk-process-step-body">
      <h3 class="mk-process-step-title">Design</h3>
      <p class="mk-process-step-desc">Prototypes tested with real customers every week.</p>
    </div>
  </li>
  <li class="mk-process-step">
    <span class="mk-process-step-number" aria-hidden="true">03</span>
    <div class="mk-process-step-body">
      <h3 class="mk-process-step-title">Build</h3>
      <p class="mk-process-step-desc">Small releases behind flags - nothing big-bang.</p>
    </div>
  </li>
  <li class="mk-process-step">
    <span class="mk-process-step-number" aria-hidden="true">04</span>
    <div class="mk-process-step-body">
      <h3 class="mk-process-step-title">Grow</h3>
      <p class="mk-process-step-desc">We measure, learn and hand over a team that can run it.</p>
    </div>
  </li>
</ol>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Vertical: numbers on a line down the side |
| `data-variant="horizontal"` (on the list) | Across: numbers on a line along the top (stacked when narrow) |
| `aria-current="step"` | Highlights the current step: a filled number |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| list | `<ol>` | The order is the meaning - screen readers announce "1 of 4" |
| number | `aria-hidden="true"` | The list already counts |
| current | `aria-current="step"` | Announces the current stage |

---

## Notes
- Three to six steps; title each with a verb.
