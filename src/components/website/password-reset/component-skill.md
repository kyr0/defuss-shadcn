---
name: Password Reset
type: BLK
section: website
why: autocomplete="new-password" on both fields lets the browser generate and fill one strong password; minlength checks it - no script for the form itself.
when: The page behind the reset link from reset-request. Changing a password while signed in lives in security-settings.
where: dist/components/password-reset/password-reset.css
supportedStates: default
---

# Pattern: Password Reset

## Native basis
A card: the new password (`autocomplete="new-password"`, `minlength`, rules in `aria-describedby`) and its confirmation, then submit. `data-variant="done"` confirms and links back to sign in.

Built from: [Input](../../forms-inputs/input/component-skill.md), [Label](../../forms-inputs/label/component-skill.md), [Button](../../actions/button/component-skill.md).

---

## Native Web APIs
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - the browser fills known fields
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form
- [`:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid) - errors show only after the user tried

---

## Structure

```html
<section class="mk-password-reset" aria-labelledby="pr-title">
  <div class="mk-password-reset-head"><span class="mk-password-reset-icon"><i data-lucide="lock-keyhole"></i></span><h1 id="pr-title">Set a new password</h1><p>For anna@example.com</p></div>
  <form action="#" method="post">
    <div class="mk-auth-field"><label class="label" for="pr-new">New password</label><input class="input" id="pr-new" type="password" name="password" autocomplete="new-password" minlength="12" required aria-describedby="pr-rules"><ul class="mk-password-reset-rules" id="pr-rules"><li>12 characters or more</li><li>Not one you used before</li></ul></div>
    <div class="mk-auth-field"><label class="label" for="pr-confirm">Confirm new password</label><input class="input" id="pr-confirm" type="password" name="confirm" autocomplete="new-password" minlength="12" required></div>
    <button class="btn" type="submit">Update password</button>
  </form>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | New password + confirmation |
| `data-variant="done"` | Password changed - sign in |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| rules | `aria-describedby` | Read with the field |
| mismatch | server or a tiny script sets `setCustomValidity()` | Then the browser reports it like any other error |

---

## Notes
- Sign out other sessions after a reset - and say so.
