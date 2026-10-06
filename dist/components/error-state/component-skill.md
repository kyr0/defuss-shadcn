---
name: Error State
type: BLK
section: website
why: role="alert" announces it; the details are a <details> with the error code in <code> - copyable, no script.
when: Failed loads, server errors, lost connections. A missing page is page-not-found; a field error belongs next to the field.
where: dist/components/error-state/error-state.css
supportedStates: default
---

# Pattern: Error State

## Native basis
A `<section role="alert">`: a destructive-tinted icon, a plain-words title and explanation, recovery actions (try again, go back, contact) and a `<details>` with the technical error.

Built from: [Button](../button/component-skill.md).

---

## Native Web APIs
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure, no script
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-error-state" role="alert" aria-labelledby="er-1">
  <span class="mk-error-state-icon" aria-hidden="true"><i data-lucide="triangle-alert"></i></span>
  <h2 class="mk-error-state-title" id="er-1">We couldn't load your board</h2>
  <p class="mk-error-state-text">Our servers took too long to answer. Your work is safe - nothing was lost.</p>
  <div class="mk-error-state-actions"><a class="btn" href="#"><i data-lucide="rotate-cw"></i> Try again</a><a class="btn" data-variant="outline" href="#">Go to dashboard</a></div>
  <details class="mk-error-state-details"><summary>Technical details</summary><pre><code>Error 504 · gateway timeout
Request id: req_8f2c41a0 · 2026-10-01 14:32:08 UTC</code></pre></details>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Centered with actions and details |
| `data-variant="inline"` | A row inside the content (a failed widget) |
| `data-variant="page"` | A whole page: a large status code |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `role="alert"` | Announced at once |
| details | `<details>` + `<code>` | The error id for support, on request |

---

## Notes
- Say what happened and what the user can do - never blame them.
- Include an error id they can send to support.
