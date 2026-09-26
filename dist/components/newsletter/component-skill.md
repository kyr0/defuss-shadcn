---
name: Newsletter
type: BLK
why: A real <form> with <input type="email"> - native validation, keyboard, and autofill come free.
when: Sign-up band on a marketing page; for multi-field sign-up use the Form component.
where: dist/components/newsletter/newsletter.css
supportedStates: default
---

# Pattern: Newsletter

## Native basis
`<form>` + `<input type="email" required>` + submit [Button](../button/component-skill.md).
The browser enforces the email format; `enterkeyhint="send"` and
`autocomplete="email"` tune mobile keyboards - zero validation JS.

---

## Native Web APIs
- [`<input type="email">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email) - constraint validation built in
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - password-manager autofill
- [`enterkeyhint`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/enterkeyhint) - mobile keyboard label
- [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - stacked → inline form

---

## Structure

```html
<section class="mk-newsletter">
  <div class="mk-newsletter-copy">
    <h2 class="mk-newsletter-title">Stay in the loop</h2>
    <p class="mk-newsletter-desc">Insights and product updates, straight to your inbox.</p>
  </div>
  <div class="mk-newsletter-form-col">
    <form class="mk-newsletter-form">
      <label class="sr-only" for="nl-email">Email address</label>
      <input class="input" id="nl-email" type="email" name="email" placeholder="email@example.com" required autocomplete="email" enterkeyhint="send" />
      <button class="btn" type="submit">
        <i data-lucide="mail"></i> Subscribe
      </button>
    </form>
    <span class="mk-newsletter-note" role="note">We respect your privacy.</span>
  </div>
</section>
```

---

## ARIA

| Attribute       | Element   | Purpose                                       |
|-----------------|-----------|-----------------------------------------------|
| `<label>`       | sr-only   | Names the input visibly to SRs - placeholder is not a label |
| `role="note"`   | privacy   | Mark the reassurance as an aside              |
| `enterkeyhint`  | input     | "Send" key on mobile                          |

---

## Notes
- The visible `placeholder` never replaces the `<label>` - keep the `sr-only` label even when the design hides it.
- Submit to your provider with `action`/`method`, or intercept with a `submit` listener; invalid states are already styled via `:user-invalid` in the Input component.
- The inline row (input+button) is `flex-direction: row` only ≥ 33rem container width - it stacks gracefully in narrow footers.
