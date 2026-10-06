---
name: Login Form
type: BLK
section: website
why: A real <form> with autocomplete="username" / "current-password" lets password managers fill and save it; validation is the browser's - no script.
when: The sign-in page or a sign-in dialog. External providers are social-login; creating an account is signup-form.
where: dist/components/login-form/login-form.css
supportedStates: default
---

# Pattern: Login Form

## Native basis
A `<form method="post">`: an email Input (`autocomplete="username"`), a password Input (`autocomplete="current-password"`) with a "Forgot password?" link in its label row, a "Remember me" Checkbox and a full-width submit Button.

Built from: [Input](input.md), [Label](label.md), [Checkbox](checkbox.md), [Button](button.md).

---

## Native Web APIs
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - the browser fills known fields
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form
- [`:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid) - errors show only after the user tried
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-login-form" aria-labelledby="lf-title">
  <div class="mk-login-form-head"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><h1 id="lf-title">Welcome back</h1><p>Sign in to your Acme workspace.</p></div>
  <form action="#" method="post">
    <div class="mk-auth-field"><label class="label" for="lf-email">Email</label><input class="input" id="lf-email" type="email" name="email" autocomplete="username" required></div>
    <div class="mk-auth-field"><div class="mk-login-form-label-row"><label class="label" for="lf-pass">Password</label><a href="#">Forgot password?</a></div><input class="input" id="lf-pass" type="password" name="password" autocomplete="current-password" required></div>
    <div class="checkbox-item"><input class="checkbox" type="checkbox" id="lf-remember" name="remember"><label for="lf-remember">Keep me signed in</label></div>
    <button class="btn" type="submit">Sign in</button>
  </form>
  <p class="mk-login-form-foot">No account yet? <a href="#">Create one</a></p>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A centered card |
| `data-variant="split"` | The form beside a picture with a quote (from 48rem) |
| `data-variant="minimal"` | No card - for a page that is already a sign-in screen |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| fields | `autocomplete="username"` / `"current-password"` | Password managers fill and save |
| reset link | in the password label row | Read right after the label |
| errors | `:user-invalid` + `aria-describedby` | Shown after a try, read with the field |

---

## Notes
- Never disable paste in password fields.
- Say "Email or password is incorrect" - never which one.
