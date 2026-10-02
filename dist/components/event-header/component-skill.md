---
name: Event Header
type: BLK
why: A header with a <time> range, the venue in <address> and two links - registration and an .ics calendar file - no script.
when: The top of an event or conference page. A list of events uses event-item; the details below are event-description.
where: dist/components/event-header/event-header.css
supportedStates: default
---

# Pattern: Event Header

## Native basis
A `<header>`: badges (type, edition), the title, a tagline, the date range as `<time>`s, the venue in an `<address>`, a register Button and an "Add to calendar" link to an `.ics` file.

Built from: [Badge](../badge/component-skill.md), [Button](../button/component-skill.md), [Avatar](../avatar/component-skill.md).

---

## Native Web APIs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`<address>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/address) - contact information
- [`download`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#download) - the link saves the file
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - tints derived from the theme tokens

---

## Structure

```html
<header class="mk-event-header">
  <div class="mk-event-header-inner">
    <div class="mk-event-header-copy">
      <div class="mk-event-header-badges"><span class="badge" data-variant="default">Conference</span><span class="badge" data-variant="outline">3rd edition</span></div>
      <h1 class="mk-event-header-title">Acme Summit 2026</h1>
      <p class="mk-event-header-tagline">Two days of talks and workshops on building calm software - for product people, designers and engineers.</p>
      <ul class="mk-event-header-meta">
        <li><i data-lucide="calendar"></i><span><time datetime="2026-11-12">12</time>–<time datetime="2026-11-13">13 November 2026</time></span></li>
        <li><i data-lucide="map-pin"></i><address>Lisbon Congress Centre, Portugal</address></li>
        <li><i data-lucide="ticket"></i>From €290</li>
      </ul>
      <div class="mk-event-header-actions">
        <a class="btn" data-size="lg" href="#">Register now</a>
        <a class="btn" data-variant="outline" data-size="lg" href="#" download="acme-summit-2026.ics"><i data-lucide="calendar-plus"></i> Add to calendar</a>
      </div>
      <div class="mk-event-header-speakers"><div class="avatar-group"><span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span><span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait2.png" alt=""></span><span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span></div>40+ speakers from 12 countries</div>
    </div>
  </div>
</header>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A gradient band in the chart colors |
| `data-variant="image"` | Over a cover picture with a scrim |
| `data-variant="split"` | Copy beside a poster (from 48rem) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| dates | `<time datetime>` for start and end | Machine-readable range |
| venue | `<address>` | Contact / location semantics |
| calendar | `<a download>` to an .ics file | Works in every calendar app |

---

## Notes
- Put the time zone with the time.
- Keep one primary action - register.
