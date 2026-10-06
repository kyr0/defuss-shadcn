---
name: Opening Hours
type: BLK
section: website
why: A <dl> of days; aria-current="date" marks today for assistive technology and styling alike; exceptions are <time>s - no script.
when: Stores, offices, venues, support desks. Use inside location-item or on its own.
where: dist/components/opening-hours/opening-hours.css
supportedStates: default
---

# Pattern: Opening Hours

## Native basis
A `<section>`: a status line, a `<dl>` of day / hours rows (today with `aria-current="date"`, closed days with `data-closed`) and a list of exceptions with `<time>`s.

---

## Native Web APIs
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the current page / step / item
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates

---

## Structure

```html
<section class="mk-opening-hours" aria-labelledby="oh-title">
  <h3 class="mk-opening-hours-title" id="oh-title">Opening hours</h3>
  <p class="mk-opening-hours-status">Open now <span>· until 20:00</span></p>
  <dl class="mk-opening-hours-days">
      <div><dt>Monday</dt><dd>09:00 – 18:00</dd></div>
      <div><dt>Tuesday</dt><dd>09:00 – 18:00</dd></div>
      <div><dt>Wednesday</dt><dd>09:00 – 18:00</dd></div>
      <div aria-current="date"><dt>Thursday</dt><dd>09:00 – 20:00</dd></div>
      <div><dt>Friday</dt><dd>09:00 – 18:00</dd></div>
      <div><dt>Saturday</dt><dd>10:00 – 14:00</dd></div>
      <div data-closed><dt>Sunday</dt><dd>Closed</dd></div>
    </dl>
  <ul class="mk-opening-hours-exceptions" aria-label="Exceptions">
    <li><time datetime="2026-12-24">24 Dec</time><span>09:00 – 13:00</span></li>
    <li><time datetime="2026-12-25">25–26 Dec</time><span>Closed</span></li>
    <li><time datetime="2027-01-01">1 Jan</time><span>Closed</span></li>
  </ul>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card: status, the week, the exceptions |
| `data-variant="compact"` | Grouped ranges on two lines - for a footer |
| `aria-current="date"` | Today: bold, tinted |
| `data-closed` | A closed day, muted |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| today | `aria-current="date"` | Announced as the current date |
| exceptions | `<time datetime>` | Machine-readable holiday dates |

---

## Notes
- Show the time zone if visitors may be elsewhere.
- Server-render "today" - it needs no script.
