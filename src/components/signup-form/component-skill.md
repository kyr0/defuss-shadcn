---
name: Signup Form
type: BLK
why: autocomplete="new-password" lets the browser suggest a strong password; minlength and pattern check it; :user-valid confirms each field - no script.
when: Account creation. Existing users sign in with login-form; providers are social-login.
where: dist/components/signup-form/signup-form.css
supportedStates: default
---

# Pattern: Signup Form

## Native basis
A `<form>`: name (`autocomplete="name"`), email, a password with `autocomplete="new-password"`, `minlength` and a `pattern`, its rules in a list (`aria-describedby`), a required terms Checkbox and submit.

Built from: [Input](../input/component-skill.md), [Label](../label/component-skill.md), [Checkbox](../checkbox/component-skill.md), [Button](../button/component-skill.md), [Social Login](../social-login/component-skill.md).

---

## Native Web APIs
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - the browser fills known fields
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form
- [`:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid) - errors show only after the user tried
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-signup-form" aria-labelledby="su-title">
  <div class="mk-signup-form-head"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><h1 id="su-title">Create your account</h1><p>Free for 14 days. No credit card.</p></div>
  <form action="#" method="post">
    <div class="mk-auth-field"><label class="label" for="su-name">Full name</label><input class="input" id="su-name" name="name" autocomplete="name" required></div>
    <div class="mk-auth-field"><label class="label" for="su-email">Work email</label><input class="input" id="su-email" type="email" name="email" autocomplete="email" required></div>
    <div class="mk-auth-field"><label class="label" for="su-pass">Password</label><input class="input" id="su-pass" type="password" name="password" autocomplete="new-password" minlength="12" pattern="(?=.*[0-9\W]).{12,}" required aria-describedby="su-pass-rules"><ul class="mk-signup-form-rules" id="su-pass-rules"><li>At least 12 characters</li><li>A number or a symbol</li><li>Not your email address</li></ul></div>
    <label class="mk-signup-form-terms"><input class="checkbox" type="checkbox" name="terms" required>I agree to the <a href="#">Terms</a> and the <a href="#">Privacy Policy</a>.</label>
    <button class="btn" type="submit">Create account</button>
  </form>
  <p class="mk-signup-form-foot">Already have an account? <a href="#">Sign in</a></p>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A centered card |
| `data-variant="split"` | The benefits beside the form (from 44rem) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| password rules | `aria-describedby` → the list | Read with the field |
| valid fields | `:user-valid` | A green border after a correct entry |
| terms | required Checkbox with linked documents | Consent is explicit |

---

## Notes
- Ask for the minimum; collect the rest after signup.
