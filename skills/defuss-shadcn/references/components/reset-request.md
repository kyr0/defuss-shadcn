---
name: Reset Request
type: BLK
why: One field and a submit; the sent state is plain markup with role="status" - no script.
when: Linked from login-form. Setting the new password is password-reset.
where: dist/components/reset-request/reset-request.css
supportedStates: default
---

# Pattern: Reset Request

## Native basis
A card with an icon, a title, one email Input (`autocomplete="email"`) and submit, and a link back to sign in. `data-variant="sent"` shows the confirmation (`role="status"`) with the address and a resend action.

Built from: [Input](input.md), [Label](label.md), [Button](button.md).

---

## Native Web APIs
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - the browser fills known fields
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form

---

## Structure

```html
<section class="mk-reset-request" aria-labelledby="rr-title">
  <div class="mk-reset-request-head"><span class="mk-reset-request-icon"><i data-lucide="key-round"></i></span><h1 id="rr-title">Forgot your password?</h1><p>Enter your email and we'll send you a link to reset it.</p></div>
  <form action="#" method="post">
    <div class="mk-auth-field"><label class="label" for="rr-email">Email</label><input class="input" id="rr-email" type="email" name="email" autocomplete="email" required></div>
    <button class="btn" type="submit">Send reset link</button>
  </form>
  <a class="mk-reset-request-back" href="#"><i data-lucide="arrow-left"></i> Back to sign in</a>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | The request form |
| `data-variant="sent"` | "Check your inbox" with the address, an email-app button and resend |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| sent | `role="status"` | Announced when it replaces the form |
| privacy | same message for unknown addresses | Never reveal whether an account exists |

---

## Notes
- Always show the same "check your inbox" - even for unknown addresses.
