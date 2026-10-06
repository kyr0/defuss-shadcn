---
name: Survey Question
type: BLK
section: website
why: Each question is a <fieldset> with its <legend>; responses are native radios, checkboxes or a textarea; :has(:checked) styles the choice. No script.
when: Surveys, onboarding questionnaires, research screeners. A single quick rating is feedback-form.
where: dist/components/survey-question/survey-question.css
supportedStates: default
---

# Pattern: Survey Question

## Native basis
A `<form>` holding one `<fieldset>`: the position (a native `<progress>`), the question as `<legend>`, a hint (`aria-describedby`), the controls and back / next Buttons.

Built from: [Progress](progress.md), [Textarea](textarea.md), [Button](button.md).

---

## Native Web APIs
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<progress>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) - native completion bar
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form

---

## Structure

```html
<form class="mk-survey-question" action="#" method="post">
  <div class="mk-survey-question-meta"><span>Question 3 of 8</span><progress class="progress" value="3" max="8" aria-label="Survey progress">3 of 8</progress></div>
  <fieldset>
    <legend>How big is your team?</legend>
    <label class="mk-survey-question-option"><input type="radio" name="team" value="0" required>Just me</label>
    <label class="mk-survey-question-option"><input type="radio" name="team" value="1" checked required>2–10 people</label>
    <label class="mk-survey-question-option"><input type="radio" name="team" value="2" required>11–50 people</label>
    <label class="mk-survey-question-option"><input type="radio" name="team" value="3" required>More than 50</label>
  </fieldset>
  <div class="mk-survey-question-actions"><button class="btn" data-variant="ghost" type="button">Back</button><button class="btn" type="submit">Next</button></div>
</form>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Single choice: radio cards |
| `data-variant="multiple"` | Several choices: checkbox cards |
| `data-variant="scale"` | An agreement scale from "strongly disagree" to "strongly agree" |
| `data-variant="text"` | A written answer with a character hint |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| question | `<legend>` | Read before every option |
| hint | `aria-describedby` on the fieldset | "Choose all that apply" |
| required | `required` on the inputs | The browser asks before moving on |

---

## Notes
- One question per screen on phones; a few per screen on desktop.
