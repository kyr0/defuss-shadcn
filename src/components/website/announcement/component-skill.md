---
name: Announcement
type: BLK
section: website
why: A non-modal <dialog open>: a <form method="dialog"> button dismisses it natively - no script, and Escape-free so it never steals focus.
when: Releases, outages, policy changes, events. Promotions with a code are offer-banner; transient feedback is the toast component.
where: dist/components/announcement/announcement.css
supportedStates: default
---

# Pattern: Announcement

## Native basis
A non-modal `<dialog open>` labelled by its message, an inner wrapper with an icon, the message and a link, and a `<form method="dialog">` close button that dismisses it without script.

---

## Native Web APIs
- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) - native dialog; method="dialog" forms close it
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<dialog class="mk-announcement" open aria-labelledby="ann-1">
  <div class="mk-announcement-inner">
    <span class="mk-announcement-tag">New</span>
    <p id="ann-1">Acme 4.0 is here - offline sync for every workspace.</p>
    <a href="#">Read the release notes <i data-lucide="arrow-right"></i></a>
    <form method="dialog"><button class="mk-announcement-close" aria-label="Dismiss announcement"><i data-lucide="x"></i></button></form>
  </div>
</dialog>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A muted bar across the top of the page |
| `data-variant="primary"` | A strip in the primary color |
| `data-variant="inline"` | A rounded card inside the content |
| `data-variant="floating"` | A card fixed to the bottom of the viewport |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `<dialog open aria-labelledby>` | Non-modal: reading and focus continue around it |
| close | `<button aria-label="Dismiss …">` in `form[method=dialog]` | Closes natively; name what it dismisses |
| link | `<a>` | Specific text ("Read the release notes") |

---

## Notes
- Remember a dismissal (a cookie or storage) if the announcement would otherwise come back on every page.
- Keep it to one line on desktop.
