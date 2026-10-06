---
name: Feedback Form
type: BLK
section: website
why: Ratings are radio inputs; :has(:checked) highlights the choice and - in the inline variant - swaps the question for a thank-you. No script.
when: After a task, at the end of a help article, in a periodic survey. Bug reports go through support-form; multi-question surveys use survey-question.
where: dist/components/feedback-form/feedback-form.css
supportedStates: default
---

# Pattern: Feedback Form

## Native basis
A `<form>` with a `<fieldset>` of radios (faces, 0–10 or yes / no), optional topic checkboxes as chips and a Textarea. The inline variant shows its thank-you through `:has(:checked)`.

Built from: [Textarea](textarea.md), [Button](button.md).

---

## Native Web APIs
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form

---

## Structure

```html
<section class="mk-feedback-form" aria-labelledby="fb-title">
  <h2 id="fb-title">How was your first week with Acme?</h2>
  <form action="#" method="post">
    <fieldset><legend class="sr-only">Your rating</legend><div class="mk-feedback-form-faces"><label><input type="radio" name="rating" value="1" aria-label="Very bad" required>😞</label><label><input type="radio" name="rating" value="2" aria-label="Bad" required>🙁</label><label><input type="radio" name="rating" value="3" aria-label="Okay" required>😐</label><label><input type="radio" name="rating" value="4" aria-label="Good" checked required>🙂</label><label><input type="radio" name="rating" value="5" aria-label="Great" required>😍</label></div></fieldset>
    <fieldset><legend>What could be better?</legend><div class="mk-feedback-form-chips"><label><input type="checkbox" name="topics" value="speed">Speed</label><label><input type="checkbox" name="topics" value="search" checked>Search</label><label><input type="checkbox" name="topics" value="onboarding">Onboarding</label><label><input type="checkbox" name="topics" value="mobile app">Mobile app</label><label><input type="checkbox" name="topics" value="pricing">Pricing</label></div></fieldset>
    <div style="display:grid;gap:0.375rem"><label class="label" for="fb-text">Anything else?</label><textarea class="textarea" id="fb-text" name="comment" rows="3"></textarea></div>
    <button class="btn" type="submit">Send feedback</button>
  </form>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Five faces, "what could be better" chips, a comment |
| `data-variant="nps"` | A 0–10 scale with end labels |
| `data-variant="inline"` | "Was this helpful? Yes / No" - the answer swaps in a thank-you (CSS-only) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| faces | each radio `aria-label="Great"` | Emoji are never the only name |
| scale | `<fieldset>` + legend + end labels | The meaning of 0 and 10 is read |
| thank-you | `role="status"` | Announced when it appears |

---

## Notes
- One question at the right moment beats ten at the wrong one.
