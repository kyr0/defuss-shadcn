---
name: Availability
type: BLK
section: website
why: An <aside> named by its heading, the terms as a <dl> and real links - the status colour is an Indicator dot, the banner a flex row that wraps. No script.
when: A freelancer's or job seeker's "hire me" on a portfolio or CV. A sales call to action takes cta; a contact form takes get-in-touch.
where: dist/components/availability/availability.css
supportedStates: default
---

# Pattern: Availability

## Native basis
An `<aside>` named by its heading: the status (an Indicator dot and a word), the heading, a sentence, the terms as a `<dl>` (start as `<time>`, capacity, engagement, rate) and the ways to get in touch as links.

Built from: [Indicator](indicator.md), [Button](button.md).

---

## Native Web APIs
- [`<aside>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/aside) - a complementary landmark, named by `aria-labelledby`
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - the terms as label and value pairs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - the start date, machine-readable
- [`mailto:`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#linking_to_an_email_address) - the email link opens the visitor's mail program

---

## Structure

```html
<aside class="mk-availability" aria-labelledby="av-title">
  <p class="mk-availability-status"><span class="indicator-dot" data-variant="success" data-animate="ping" aria-hidden="true"></span> Available</p>
  <h2 class="mk-availability-title" id="av-title">Booking projects from December</h2>
  <p class="mk-availability-text">Design-system builds, front-end architecture and accessibility audits - remote, or on site in Berlin.</p>
  <dl class="mk-availability-facts">
    <div><dt>Start</dt><dd><time datetime="2026-12-01">1 Dec 2026</time></dd></div>
    <div><dt>Capacity</dt><dd>3 days a week</dd></div>
    <div><dt>Engagement</dt><dd>Freelance, contract</dd></div>
    <div><dt>Day rate</dt><dd>from €950</dd></div>
  </dl>
  <div class="mk-availability-actions">
    <a class="btn" href="#"><i data-lucide="calendar"></i> Book a call</a>
    <a class="btn" data-variant="outline" href="mailto:mara@example.com"><i data-lucide="mail"></i> Email me</a>
  </div>
</aside>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A card: the status, the heading, a sentence, the terms between two rules, the actions |
| `data-variant="banner"` | One row across the page: status, heading and actions; a sentence or the terms take a row of their own |
| `data-variant="spotlight"` | The closing call: centered on the primary colour, the heading as large as a headline - use secondary or outline buttons on it; a `pattern-*` utility adds texture |
| status | The Indicator dot's variant: `success` available, `warning` limited, `neutral` booked - say it in the word too |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `<aside aria-labelledby>` | A named complementary landmark |
| status dot | `aria-hidden="true"` | The word beside it ("Available") carries the status |
| terms | `<dl>` | Label and value read together |
| start | `<time datetime>` | Machine-readable date |

---

## Notes
- The actions leave the printed page (`@media print`); the terms stay.
- A pinging dot (`data-animate="ping"`) stops under `prefers-reduced-motion` - the Indicator handles it.
