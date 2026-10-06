---
name: CTA
type: BLK
section: website
why: A heading, one sentence and links styled as Buttons; container queries switch the split - no script.
when: Between sections or at the end of a page, whenever one action matters most. A list of choices is pricing; an email field alone is newsletter.
where: dist/components/cta/cta.css
supportedStates: default
---

# Pattern: CTA

## Native basis
A `<section>` named by its heading, one supporting sentence, one primary and at most one secondary action (Buttons) and an optional note.

Built from: [Button](button.md).

---

## Native Web APIs
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - tints derived from the theme tokens
- [`text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balanced titles, pretty paragraphs
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching

---

## Structure

```html
<section class="mk-cta" aria-labelledby="cta-1">
  <div class="mk-cta-inner">
    <div class="mk-cta-copy">
      <h2 class="mk-cta-title" id="cta-1">Ready to work calmer?</h2>
      <p class="mk-cta-desc">Join 12,000 teams who plan, write and ship in one place.</p>
    </div>
    <div class="mk-cta-actions">
      <a class="btn" data-size="lg" href="#">Start free trial</a>
      <a class="btn" data-variant="outline" data-size="lg" href="#">Talk to sales</a>
    </div>
    <p class="mk-cta-note">Free for 14 days · No credit card required</p>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Centered on a muted surface |
| `data-variant="split"` | Copy left, actions right (from 44rem) |
| `data-variant="dark"` | Inverted, with a glow in the chart colors |
| `data-variant="image"` | Over a picture (`.mk-cta-bg`) with a scrim |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `<section aria-labelledby>` | A region named by the heading |
| actions | `<a class="btn">` | Specific labels - "Start free trial", not "Click here" |

---

## Notes
- One CTA per screen; repeat it rather than adding a second competing one.
