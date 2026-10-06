---
name: Social Login
type: BLK
section: website
why: Links to each provider's sign-in flow (OAuth / OpenID Connect redirects) - no SDK, no script in the page; brand marks are inline SVG.
when: Above or below a login-form or signup-form. Single sign-on for companies is usually one "Continue with SSO" button.
where: dist/components/social-login/social-login.css
supportedStates: default
---

# Pattern: Social Login

## Native basis
A group of outline Buttons (`<a href>` to your OAuth start URLs), each with the provider's mark and "Continue with ..."; the icon variant keeps the text as `aria-label`. `.mk-social-login-divider` separates them from the email form.

Built from: [Button](../button/component-skill.md).

---

## Native Web APIs
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<div class="mk-social-login">
  <a class="btn" data-variant="outline" href="#"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.9 11.9 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"/></svg>Continue with Google</a>
  <a class="btn" data-variant="outline" href="#"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.3 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.1-4.2ZM14 5.1A4.2 4.2 0 0 0 15 2a4.4 4.4 0 0 0-2.8 1.5 4.1 4.1 0 0 0-1 3c1 .1 2.1-.5 2.8-1.4Z"/></svg>Continue with Apple</a>
  <a class="btn" data-variant="outline" href="#"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"/></svg>Continue with GitHub</a>
  <a class="btn" data-variant="outline" href="#"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#F25022" d="M1 1h10.5v10.5H1z"/><path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z"/><path fill="#00A4EF" d="M1 12.5h10.5V23H1z"/><path fill="#FFB900" d="M12.5 12.5H23V23H12.5z"/></svg>Continue with Microsoft</a>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Full-width buttons, stacked |
| `data-variant="icons"` | Square icon buttons on one row (names as aria-label) |
| `.mk-social-login-divider` | A rule with "or" between providers and the form |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| buttons | visible "Continue with ..." | The provider is in the name |
| icon buttons | `aria-label="Continue with Google"` | Never icon-only without a name |
| marks | `aria-hidden="true"` | Decorative |

---

## Notes
- Follow each provider's brand guidelines for the mark and the wording.
- Two or three providers are plenty.
