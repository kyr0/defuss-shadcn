---
name: Maintenance
type: BLK
section: website
why: Text, a <time> for the expected end and an indeterminate <progress> - honest, readable, no script.
when: Planned downtime and degraded service. A failed request is error-state; a release in the future is coming-soon.
where: dist/components/maintenance/maintenance.css
supportedStates: default
---

# Pattern: Maintenance

## Native basis
A `<section role="status">`: an icon, the title, an explanation, the expected end as `<time>`, an indeterminate `<progress>`, a status-page link and contact. The banner variant is one line for the app header.

Built from: [Progress](../progress/component-skill.md), [Button](../button/component-skill.md).

---

## Native Web APIs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`<progress>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) - native completion bar
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - motion stands still on request

---

## Structure

```html
<section class="mk-maintenance" role="status" aria-labelledby="mt-title">
  <span class="mk-maintenance-icon" aria-hidden="true"><i data-lucide="wrench"></i></span>
  <h1 class="mk-maintenance-title" id="mt-title">We're upgrading Acme</h1>
  <p class="mk-maintenance-text">Our database moves to faster servers. Your data is safe and nothing is lost - you just can't sign in for a little while.</p>
  <div class="mk-maintenance-eta"><span>Back by <strong><time datetime="2026-10-05T03:00Z">03:00 UTC</time></strong> (in about 40 minutes)</span><progress class="progress" max="100" aria-label="Work in progress"></progress></div>
  <div class="mk-maintenance-links"><a class="btn" data-variant="outline" href="#"><i data-lucide="activity"></i> Status page</a><a class="btn" data-variant="ghost" href="#">Contact support</a></div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A centered maintenance page |
| `data-variant="banner"` | A one-line banner announcing a planned window |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `role="status"` | Announced politely |
| end | `<time datetime>` with the time zone | Unambiguous |
| progress | indeterminate `<progress>` with a label | "Work in progress" |

---

## Notes
- Give the time zone and update the estimate when it changes.
