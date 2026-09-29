---
name: Steps
type: ATM
why: Ordered list of process steps with aria-current="step" on the active one.
when: Multi-step flows: wizards, checkout, onboarding progress.
where: dist/components/steps/steps.css
supportedStates: default
---

# Steps

## Native basis

`<ol>` with step indicators for multi-step processes.

## Native Web APIs

- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - ordered list providing sequential numbering semantics
- [`aria-current="step"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - identifies the current step for screen readers
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - suppresses transitions for users who prefer reduced motion
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - thickens indicator borders and connector lines
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - maps indicator and connector to system colors

---

## Structure

### Horizontal (default)
```html
<ol class="steps">
  <li class="step" data-status="complete">
    <div class="step-indicator">
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>
    </div>
    <div class="step-content">
      <p class="step-title">Account</p>
      <p class="step-description">Create credentials</p>
    </div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">2</div>
    <div class="step-content">
      <p class="step-title">Profile</p>
      <p class="step-description">Personal details</p>
    </div>
  </li>
  <li class="step">
    <div class="step-indicator">3</div>
    <div class="step-content">
      <p class="step-title">Complete</p>
      <p class="step-description">Review &amp; confirm</p>
    </div>
  </li>
</ol>
```

### Vertical
```html
<ol class="steps" data-orientation="vertical">
  <li class="step" data-status="complete">
    <div class="step-indicator">
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>
    </div>
    <div class="step-content">
      <p class="step-title">Account</p>
      <p class="step-description">Create credentials</p>
    </div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">2</div>
    <div class="step-content">
      <p class="step-title">Profile</p>
    </div>
  </li>
  <li class="step">
    <div class="step-indicator">3</div>
    <div class="step-content">
      <p class="step-title">Complete</p>
    </div>
  </li>
</ol>
```

### Error state
```html
<ol class="steps">
  <li class="step" data-status="complete">
    <div class="step-indicator">
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>
    </div>
    <div class="step-content"><p class="step-title">Account</p></div>
  </li>
  <li class="step" data-status="error" aria-invalid="true">
    <div class="step-indicator">
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </div>
    <div class="step-content">
      <p class="step-title">Profile</p>
      <p class="step-description">Please fix the errors</p>
    </div>
  </li>
  <li class="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Complete</p></div>
  </li>
</ol>
```

### Clickable steps
```html
<ol class="steps">
  <li class="step" data-status="complete" data-clickable>
    <div class="step-indicator" role="button" tabindex="0" aria-label="Go to step 1: Account">1</div>
    <div class="step-content"><p class="step-title">Account</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step" data-clickable>
    <div class="step-indicator" role="button" tabindex="0" aria-label="Go to step 2: Profile">2</div>
    <div class="step-content"><p class="step-title">Profile</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Complete</p></div>
  </li>
</ol>
```

---

## Variants

| `data-orientation` | Layout |
|--------------------|--------|
| *(none)* | Horizontal - steps arranged in a row |
| `vertical` | Vertical - steps stacked in a column with vertical connector |
| `responsive` | Vertical below 48rem, horizontal from there up (DaisyUI's `steps-vertical lg:steps-horizontal`) |

### Colors (`data-variant` on `.steps` or on one `.step`)

`primary` (default) · `secondary` · `accent` · `info` · `success` · `warning` ·
`neutral` · `destructive` (alias `error`) - the fill of done steps, the ring of
the current one and the connector after a done step. On a single `.step` it
overrides the list's color. `secondary` / `accent` use `--chart-2` /
`--chart-4` (the tokens' `--secondary` / `--accent` are pale surfaces);
success / warning / info are literal colors.

### Symbols, emoji and icons

The indicator holds any content: a number, a symbol (`?` `!` `✓` `✕` `★` `●`),
nothing, an emoji or an icon - DaisyUI's `data-content` is just the text.
Wrap an emoji or icon in `<span class="step-icon">` for a glyph a size up;
`data-variant="plain"` on the `.step-indicator` drops the circle (a symbol or
icon there takes the step's color).

```html
<li class="step" data-status="complete">
  <div class="step-indicator"><span class="step-icon">😍</span></div>
  <div class="step-content"><p class="step-title">Loving it</p></div>
</li>
```

For many steps in a narrow space, wrap the list in `overflow-x-auto` and give
it a `min-width` - it scrolls instead of squeezing.

---

## Sizes

| `data-size` | Indicator | Title font | Description font |
|-------------|-----------|------------|------------------|
| `xs` | 1.25rem | 0.6875rem | 0.625rem |
| `sm` | 1.5rem | 0.75rem | 0.6875rem |
| `md` | 2rem | 0.8125rem | 0.75rem |
| *(none)* | 2rem | 0.8125rem | 0.75rem |
| `lg` | 2.5rem | 0.9375rem | 0.8125rem |
| `xl` | 3rem | 1.0625rem | 0.875rem |

Connector offsets follow the indicator size in both orientations; `md` equals the unsized default.

---

## Density

Set `data-density` on the `.steps` root; the flex gaps scale - the size ladder keeps owning indicator size and typography, so size and density combine freely.

| Value | Effect |
| --- | --- |
| `compact` | Step gap 0.375rem, content gap 0.0625rem |
| `comfortable` | Gaps 0.5rem / 0.125rem - identical to the unsized default |
| `spacious` | Gaps 0.75rem / 0.25rem |

## States

| `data-status` | Indicator | Connector |
|---------------|-----------|-----------|
| `complete` | Primary fill, white text/checkmark | Primary color line |
| `current` | Primary border, primary text | Default border color |
| `error` | Destructive fill, destructive-foreground text | Destructive color line |
| *(none)* | Border only, muted text | Default border color |

---

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `aria-current="step"` | Current `<li>` | Identifies the active step for screen readers |
| `aria-hidden="true"` | Checkmark/X `<svg>` | Decorative icon, hidden from screen readers |
| `aria-invalid="true"` | Error `<li>` | Marks the step as invalid for screen readers |

---

## Keyboard

This component is CSS-only and does not manage keyboard interaction by default. When steps are made clickable:

- Add `data-clickable` to the `<li>` element and `role="button" tabindex="0"` to the `.step-indicator`
- Handle `click` and `keydown` (Enter/Space) in your own JavaScript to navigate between steps
- Manage focus appropriately when the active step changes

---

## Notes

- Use `<ol>` for semantic ordering - screen readers announce "item 1 of 3", etc.
- Complete steps can show a checkmark SVG or the step number.
- Add `aria-current="step"` to the `data-status="current"` step for accessibility.
- The connector line between steps uses `::after` pseudo-element positioned absolutely.
- For vertical orientation, add `data-orientation="vertical"` to the `.steps` container.
- For error steps, add `aria-invalid="true"` to the `<li>` alongside `data-status="error"`.
- No JavaScript required - this is a CSS-only component. Step state is set via `data-status` attributes.

