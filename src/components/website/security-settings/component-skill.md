---
name: Security Settings
type: BLK
section: website
why: Sections of rows with real buttons; two-factor is a Switch (a checkbox); sessions are a list with labelled actions - no script in the markup.
when: Account settings. Profile details are profile-form; notifications are notification-settings.
where: dist/components/security-settings/security-settings.css
supportedStates: default
---

# Pattern: Security Settings

## Native basis
A stack of `<section>` cards: rows (`.mk-security-settings-row`) with an icon, a title, a status line and an action; two-factor as a Switch; passkeys and sessions as lists with labelled sign-out / remove buttons.

Built from: [Switch](../../forms-inputs/switch/component-skill.md), [Badge](../../data-display/badge/component-skill.md), [Button](../../actions/button/component-skill.md).

---

## Native Web APIs
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<div class="mk-security-settings">
  <section class="mk-security-settings-section" aria-labelledby="sec-sign">
    <h2 id="sec-sign">Signing in</h2>
    <div class="mk-security-settings-row"><i data-lucide="key-round"></i><div><strong>Password</strong><p>Last changed <time datetime="2026-07-02">3 months ago</time></p></div><a class="btn" data-variant="outline" data-size="sm" href="#">Change</a></div>
    <div class="mk-security-settings-row"><i data-lucide="smartphone"></i><div><strong>Two-factor authentication <span class="mk-security-settings-status" data-status="on">On</span></strong><p>Authenticator app · backup codes saved</p></div><div class="switch-item"><input class="switch" type="checkbox" role="switch" id="sec-2fa" checked><label for="sec-2fa" class="sr-only">Two-factor authentication</label></div></div>
    <div class="mk-security-settings-row"><i data-lucide="fingerprint"></i><div><strong>Passkeys <span class="mk-security-settings-status" data-status="off">None yet</span></strong><p>Sign in with your fingerprint or face - no password.</p></div><a class="btn" data-variant="outline" data-size="sm" href="#">Add a passkey</a></div>
  </section>
  <section class="mk-security-settings-section" aria-labelledby="sec-sess">
    <h2 id="sec-sess">Where you're signed in</h2>
    <ul class="mk-security-settings-list">
      <li><span class="mk-security-settings-device"><i data-lucide="laptop"></i></span><div><strong>Chrome on macOS <span class="badge" data-variant="secondary" data-size="sm">This device</span></strong><span>Lisbon · active now</span></div></li>
      <li><span class="mk-security-settings-device"><i data-lucide="smartphone"></i></span><div><strong>Safari on iPhone</strong><span>Lisbon · 2 hours ago</span></div><button class="btn" data-variant="ghost" data-size="sm" type="button" aria-label="Sign out Safari on iPhone">Sign out</button></li>
      <li><span class="mk-security-settings-device"><i data-lucide="monitor"></i></span><div><strong>Firefox on Windows</strong><span>Berlin · 3 days ago</span></div><button class="btn" data-variant="ghost" data-size="sm" type="button" aria-label="Sign out Firefox on Windows">Sign out</button></li>
    </ul>
    <div class="mk-security-settings-foot"><button class="btn" data-variant="outline" data-size="sm" type="button">Sign out of all other sessions</button></div>
  </section>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Password, two-factor (Switch), passkeys, sessions |
| `.mk-security-settings-status` | A status chip: `data-status="on|off"` |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| two-factor | `role="switch"` checkbox + label | Announced on / off |
| session actions | `aria-label="Sign out Firefox on Windows"` | Unique per row |
| dates | `<time>` | When the password changed |

---

## Notes
- Ask for the current password (or a passkey) before any change here.
