---
name: Event Description
type: BLK
section: website
why: Sections and lists for the story, a <dl> for the facts and a <meter> for the seats left - all native, no script.
when: Below an event-header. Times and talks go in session-item; the people in speaker-item.
where: dist/components/event-description/event-description.css
supportedStates: default
---

# Pattern: Event Description

## Native basis
Two columns from 52rem: the description (<em>About</em>, <em>Who it is for</em> as tags, <em>What you will take away</em> as a check list) and an `<aside>` card: a `<dl>` of facts, a `<meter>` for capacity and the action.

Built from: [Button](../../actions/button/component-skill.md).

---

## Native Web APIs
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`<meter>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter) - a scalar value in a known range
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balanced titles, pretty paragraphs

---

## Structure

```html
<section class="mk-event-description" aria-label="About the event">
  <div class="mk-event-description-layout">
    <div class="mk-event-description-body">
      <section aria-labelledby="ed-about"><h2 id="ed-about">About</h2><p>Acme Summit brings together the people who build the tools teams use every day. Two days, one track, no sponsor pitches - just honest talks on making software calmer, and workshops where you leave with something built.</p></section>
      <section aria-labelledby="ed-who"><h2 id="ed-who">Who it is for</h2>
        <ul class="mk-event-description-audience"><li><i data-lucide="lightbulb"></i>Product managers</li><li><i data-lucide="pen-tool"></i>Designers</li><li><i data-lucide="code"></i>Engineers</li><li><i data-lucide="users"></i>Team leads</li></ul>
      </section>
      <section aria-labelledby="ed-take"><h2 id="ed-take">What you will take away</h2>
        <ul class="mk-event-description-takeaways"><li><i data-lucide="check"></i>A playbook for async planning</li><li><i data-lucide="check"></i>Patterns for quiet, accessible UI</li><li><i data-lucide="check"></i>How offline-first sync really works</li><li><i data-lucide="check"></i>Fifty new colleagues to ask</li></ul>
      </section>
    </div>
    <aside class="mk-event-description-facts" aria-label="Event facts">
      <dl>
        <div><dt>Date</dt><dd>12–13 Nov 2026</dd></div>
        <div><dt>Format</dt><dd>In person + stream</dd></div>
        <div><dt>Language</dt><dd>English</dd></div>
        <div><dt>Price</dt><dd>From €290</dd></div>
        <div><dt>Recordings</dt><dd>For all attendees</dd></div>
      </dl>
      <div class="mk-event-description-capacity"><label for="ed-seats"><strong>320 of 400</strong> seats taken</label><meter id="ed-seats" min="0" max="400" low="300" high="380" optimum="0" value="320">320 of 400</meter></div>
      <a class="btn" href="#">Register</a>
    </aside>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Description beside a sticky facts card (stacked when narrow) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| capacity | `<meter min max value>` + label | Announced as a value in a range |
| facts | `<dl>` | Label/value pairs |

---

## Notes
- Answer the practical questions: language, accessibility, recordings, refunds.
