---
name: Success State
type: BLK
section: website
why: role="status" announces it politely; the ripple is a CSS animation that stands still under reduced motion.
when: After saving, sending, inviting, publishing. A completed purchase is order-confirmation; transient confirmations are toasts.
where: dist/components/success-state/success-state.css
supportedStates: default
---

# Pattern: Success State

## Native basis
A `<section role="status">`: a check icon with a ripple, the title, a sentence (with what to expect next), a short summary `<dl>` and the next actions.

Built from: [Button](../../actions/button/component-skill.md).

---

## Native Web APIs
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - motion stands still on request

---

## Structure

```html
<section class="mk-success-state" role="status" aria-labelledby="ss-1">
  <span class="mk-success-state-icon" aria-hidden="true"><i data-lucide="check"></i></span>
  <h2 class="mk-success-state-title" id="ss-1">Invitations sent</h2>
  <p class="mk-success-state-text">Your three teammates get an email with a link to join. It works for 7 days.</p>
  <dl class="mk-success-state-summary"><div><dt>Workspace</dt><dd>Acme Product</dd></div><div><dt>Invited</dt><dd>3 people</dd></div><div><dt>Role</dt><dd>Editor</dd></div></dl>
  <div class="mk-success-state-actions"><a class="btn" href="#">Go to workspace</a><a class="btn" data-variant="outline" href="#">Invite more</a></div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Centered: ripple check, title, text, summary, actions |
| `data-variant="compact"` | A small card - inside a panel or a dialog |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `role="status"` | Announced politely |
| ripple | decorative, `prefers-reduced-motion` | Still when asked |

---

## Notes
- Offer the next sensible step - not a dead end.
