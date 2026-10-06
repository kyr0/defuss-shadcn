---
name: Event Countdown
type: BLK
section: website
why: The Countdown component ticks from one data-until date and announces itself as a timer; the block only lays out the date, the units and the action.
when: Launches, sales deadlines, event openings. A static date is enough for most events - use event-header; for a page before launch use coming-soon.
where: dist/components/event-countdown/event-countdown.css
supportedStates: default
---

# Pattern: Event Countdown

## Native basis
A `<section>` with a title, the date as `<time>`, a Countdown group (`.countdown-group[data-until]`) and an action. Without script the numbers stay at the authored values.

Built from: [Countdown](countdown.md), [Button](button.md).

---

## Native Web APIs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - tints derived from the theme tokens

---

## Structure

```html
<section class="mk-event-countdown" aria-labelledby="ec-1">
  <div class="mk-event-countdown-inner">
    <span class="mk-event-countdown-eyebrow">Acme Summit 2026</span>
    <h2 class="mk-event-countdown-title" id="ec-1">Doors open in</h2>
    <div class="countdown-group mk-event-countdown-timer" data-until="2026-11-12T09:00:00Z">
      <div class="countdown-unit" data-variant="muted"><span class="countdown" data-size="xl"><span data-unit="days" style="--value:41">41</span></span><span class="countdown-label">days</span></div>
      <div class="countdown-unit" data-variant="muted"><span class="countdown" data-size="xl" data-digits="2"><span data-unit="hours" style="--value:9">09</span></span><span class="countdown-label">hours</span></div>
      <div class="countdown-unit" data-variant="muted"><span class="countdown" data-size="xl" data-digits="2"><span data-unit="minutes" style="--value:30">30</span></span><span class="countdown-label">min</span></div>
      <div class="countdown-unit" data-variant="muted"><span class="countdown" data-size="xl" data-digits="2"><span data-unit="seconds" style="--value:0">00</span></span><span class="countdown-label">sec</span></div>
    </div>
    <span class="mk-event-countdown-date"><i data-lucide="calendar"></i><time datetime="2026-11-12T09:00Z">12 November 2026, 09:00 UTC</time> · Lisbon</span>
    <a class="btn" data-size="lg" href="#">Get your ticket</a>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Centered: title, date, four units, action |
| `data-variant="dark"` | On a dark band with a glow |
| `data-variant="inline"` | One row - for a bar above a page |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| timer | `role="timer"` (set by countdown.js) | With a spoken label - not announced every second |
| date | `<time datetime>` | The absolute date always shows next to the countdown |

---

## Notes
- Always print the absolute date and time zone - a countdown alone is not enough.
