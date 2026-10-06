---
name: Event Item
type: BLK
section: website
why: A <time> tile, a stretched title link and a separately labelled register link - two targets, no script.
when: Event listings, meetups, webinars. The event page itself starts with event-header.
where: dist/components/event-item/event-item.css
supportedStates: default
---

# Pattern: Event Item

## Native basis
An `<article>`: a `<time datetime>` calendar tile, a title link covering the item, time and place, tags, and a register link that stays clickable above the stretched link.

Built from: [Badge](../../data-display/badge/component-skill.md), [Button](../../actions/button/component-skill.md).

---

## Native Web APIs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
  <article class="mk-event-item">
    <time class="mk-event-item-date" datetime="2026-10-14T18:00"><span>Oct</span><b>14</b></time>
    <div class="mk-event-item-body">
      <h3 class="mk-event-item-title"><a href="#">Calm Product Meetup Lisbon</a></h3>
      <ul class="mk-event-item-meta"><li><i data-lucide="clock"></i>Tue 18:00 – 21:00</li><li><i data-lucide="map-pin"></i>LX Factory, Lisbon</li></ul>
      <div class="mk-event-item-tags"><span class="badge" data-variant="secondary" data-size="sm">In person</span><span class="badge" data-variant="secondary" data-size="sm">Free</span></div>
    </div>
    <a class="btn" data-variant="outline" data-size="sm" href="#" aria-label="Register for Calm Product Meetup Lisbon">Register</a>
  </article>
  <article class="mk-event-item">
    <time class="mk-event-item-date" datetime="2026-10-22T16:00"><span>Oct</span><b>22</b></time>
    <div class="mk-event-item-body">
      <h3 class="mk-event-item-title"><a href="#">Webinar: Planning launches with five teams</a></h3>
      <ul class="mk-event-item-meta"><li><i data-lucide="clock"></i>Wed 16:00 – 17:00 UTC</li><li><i data-lucide="video"></i>Online</li></ul>
      <div class="mk-event-item-tags"><span class="badge" data-variant="secondary" data-size="sm">Webinar</span></div>
    </div>
    <a class="btn" data-variant="outline" data-size="sm" href="#" aria-label="Register for Webinar: Planning launches with five teams">Register</a>
  </article>
  <article class="mk-event-item">
    <time class="mk-event-item-date" datetime="2026-11-12"><span>Nov</span><b>12</b></time>
    <div class="mk-event-item-body">
      <h3 class="mk-event-item-title"><a href="#">Acme Summit 2026</a></h3>
      <ul class="mk-event-item-meta"><li><i data-lucide="clock"></i>12–13 Nov</li><li><i data-lucide="map-pin"></i>Lisbon Congress Centre</li></ul>
      <div class="mk-event-item-tags"><span class="badge" data-variant="secondary" data-size="sm">Conference</span><span class="badge" data-variant="secondary" data-size="sm">Tickets</span></div>
    </div>
    <a class="btn" data-variant="outline" data-size="sm" href="#" aria-label="Register for Acme Summit 2026">Register</a>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A row: date tile, details, action |
| `data-variant="card"` | A picture on top with the date tile over its corner |
| `data-variant="compact"` | A tight row for sidebars - no tags |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| date | `<time datetime>` | The tile reads as a date |
| register | `aria-label="Register for …"` | Unique in a list |

---

## Notes
- Say "Online" or the city - never only the venue name.
