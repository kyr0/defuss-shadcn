---
name: Coming Soon
type: BLK
section: website
why: A plain page section: the Countdown component ticks from data-until, the notify form is a real form - and everything reads without script.
when: A pre-launch page or a feature that is not out yet. A live launch event uses event-countdown; downtime uses maintenance.
where: dist/components/coming-soon/coming-soon.css
supportedStates: default
---

# Pattern: Coming Soon

## Native basis
A `<section>`: brand, an eyebrow with the date (`<time>`), a large title, a sentence, the Countdown component (`.countdown-group[data-until]` with primary `.countdown-unit` boxes - its digits roll every second), an email form and social links - on a soft gradient, or beside a picture.

Built from: [Countdown](../../data-display/countdown/component-skill.md), [Input](../../forms-inputs/input/component-skill.md), [Button](../../actions/button/component-skill.md).

---

## Native Web APIs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-coming-soon" aria-labelledby="cs1-title">
  <div class="mk-coming-soon-layout">
    <div class="mk-coming-soon-copy">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      <span class="mk-coming-soon-eyebrow">Launching <time datetime="2026-11-12">12 November</time></span>
      <h1 class="mk-coming-soon-title" id="cs1-title">Acme Spaces is almost here</h1>
      <p class="mk-coming-soon-text">Shared spaces for every project, every team and every guest. Be first in line.</p>
      <div class="countdown-group mk-coming-soon-timer" data-until="2026-11-12T09:00:00Z">
        <div class="countdown-unit" data-variant="primary"><span class="countdown" data-size="2xl"><span data-unit="days" style="--value:41">41</span></span><span class="countdown-label">days</span></div>
        <div class="countdown-unit" data-variant="primary"><span class="countdown" data-size="2xl" data-digits="2"><span data-unit="hours" style="--value:9">09</span></span><span class="countdown-label">hours</span></div>
        <div class="countdown-unit" data-variant="primary"><span class="countdown" data-size="2xl" data-digits="2"><span data-unit="minutes" style="--value:30">30</span></span><span class="countdown-label">min</span></div>
        <div class="countdown-unit" data-variant="primary"><span class="countdown" data-size="2xl" data-digits="2"><span data-unit="seconds" style="--value:0">00</span></span><span class="countdown-label">sec</span></div>
      </div>
      <form class="mk-coming-soon-form" action="#" method="post"><label class="sr-only" for="cs1-email">Email address</label><input class="input" id="cs1-email" type="email" name="email" placeholder="you@company.com" required autocomplete="email"><button class="btn" type="submit">Notify me</button></form>
      <ul class="mk-coming-soon-social"><li><a href="#" aria-label="Acme on LinkedIn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5 3.5A2.5 2.5 0 1 1 5 8.5 2.5 2.5 0 0 1 5 3.5ZM3 10h4v11H3V10Zm7 0h3.8v1.6h.1c.5-1 1.8-1.9 3.6-1.9 3.9 0 4.5 2.5 4.5 5.8V21h-4v-4.9c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v5h-4V10Z"/></svg></a></li><li><a href="#" aria-label="Acme on GitHub"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"/></svg></a></li><li><a href="#" aria-label="Acme on X"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/></svg></a></li><li><a href="#" aria-label="Acme newsletter"><i data-lucide="mail"></i></a></li></ul>
    </div>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Centered on a soft gradient in the chart colors |
| `data-variant="image"` | Copy beside a picture (from 48rem) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| date | `<time datetime>` | Always printed, not only counted down |
| form | labelled email field | One input, one button |

---

## Notes
- Say when, even roughly ("this autumn") - "soon" says nothing.
