---
name: Get In Touch
type: BLK
why: A bordered contact CTA card - avatar overlap is negative margins + outline, not positioning math.
when: End-of-page "want to know more?" band; for an actual contact form use Form + Input components.
where: dist/components/get-in-touch/get-in-touch.css
supportedStates: default
---

# Pattern: Get In Touch

## Native basis
A card of [Avatar](avatar.md) stack + heading + one
[Button](button.md). The overlap is `margin-inline-start:
-0.5rem` with an `outline` ring (outline, not box-shadow, so it survives
forced-colors).

---

## Native Web APIs
- [Negative margins](https://developer.mozilla.org/en-US/docs/Web/CSS/margin#negative_values) - avatar fan overlap
- [`outline`](https://developer.mozilla.org/en-US/docs/Web/CSS/outline) - background ring that respects forced-colors
- [Avatar](avatar.md) - the people row is the component

---

## Structure

```html
<section class="mk-contact">
  <div class="mk-contact-avatars">
    <span class="avatar">
      <img class="avatar-image" src="images/mk-portrait.png" alt="" />
    </span>
    <span class="avatar">
      <span class="avatar-fallback">AM</span>
    </span>
    <span class="avatar">
      <span class="avatar-fallback">ST</span>
    </span>
  </div>
  <div class="mk-contact-copy">
    <h2 class="mk-contact-title">Want to know more?</h2>
    <p class="mk-contact-desc">Our team is here to help you get the answers you need.</p>
  </div>
  <button class="btn mk-contact-cta">Get in touch</button>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| `data-variant="split"` + `.mk-contact-split` | A contact form (Inputs, Select, Textarea) beside the ways to reach you (`.mk-contact-info`) |
| `.mk-contact-channels` + `.mk-contact-channel` | One card per way in - sales, support, press |
| `data-variant="band"` | A dark "talk to a human" band - avatars, an online Indicator, two actions |

---

## ARIA

| Attribute | Element          | Purpose                                    |
|-----------|------------------|--------------------------------------------|
| `alt=""`  | avatar images    | Decorative crowd; the CTA carries the info |
| one button| CTA              | Single unambiguous action                  |

---

## Notes
- Avatars render grayscale (`filter: grayscale(1)`) for the muted "team" look; dropped under `prefers-reduced-transparency`.
- `prefers-reduced-motion` has no effect here - nothing animates, which is the point.
- The CTA should trigger a real destination (mailto:, form page); a button that opens a [Dialog](dialog.md) form is the native-enhanced upgrade.
