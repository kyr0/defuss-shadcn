---
name: Comment Form
type: BLK
section: website
why: A real <form> with a Textarea that grows with field-sizing: content, Inputs for guests and native validation (required, minlength, type=email) - :user-invalid marks fields only after an attempt.
when: Under a comment thread, inline under a comment (reply). A chat composer takes textarea-group.
where: dist/components/comment-form/comment-form.css
supportedStates: default
---

# Pattern: Comment Form

## Native basis
A `<form>`: the writer's Avatar beside a Textarea that grows with its text (`field-sizing: content`), optional name / email Inputs for guests, a hint and the submit Button. Native validation - `required`, `minlength`, `type="email"`.

Built from: [Textarea](../../forms-inputs/textarea/component-skill.md), [Input](../../forms-inputs/input/component-skill.md), [Label](../../forms-inputs/label/component-skill.md), [Avatar](../../data-display/avatar/component-skill.md), [Button](../../actions/button/component-skill.md), [Tabs](../../navigation/tabs/component-skill.md), [Toggle Group](../../actions/toggle-group/component-skill.md), [Separator](../../primitives/separator/component-skill.md), [Kbd](../../primitives/kbd/component-skill.md), [Alert](../../feedback-status/alert/component-skill.md), [Rating](../../forms-inputs/rating/component-skill.md).

---

## Native Web APIs
- [`field-sizing: content`](https://developer.mozilla.org/en-US/docs/Web/CSS/field-sizing) - the textarea grows
- [`:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid) - errors after an attempt
- [`required / minlength`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/required) - native validation
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the layout without an avatar

---

## Structure

```html
<form class="mk-comment-form" aria-label="Add a comment" style="max-width:42rem">
  <span class="avatar"><img class="avatar-image" src="images/mk-portrait.png" alt=""></span>
  <div class="mk-comment-form-main">
    <textarea class="textarea" name="comment" rows="3" required minlength="2" placeholder="Join the discussion…" aria-label="Comment" aria-describedby="comment-hint"></textarea>
    <div class="mk-comment-form-footer">
      <p class="mk-comment-form-hint" id="comment-hint">Markdown works. Be kind.</p>
      <button type="submit" class="btn">Post comment</button>
    </div>
  </div>
</form>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | Avatar + a growing textarea, hint and submit |
| `data-variant="reply"` | Compact - under a comment, with a cancel button |
| `.mk-comment-form-fields` | Guest name + email Inputs above the textarea |
| `data-variant="framed"` | Toolbar, text and footer in one bordered box - the box takes the focus ring |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| form | `aria-label="Add a comment"` | Names the form |
| textarea | `aria-label` or a `<label>` | Plus `aria-describedby` → the hint |
| submit | `<button type="submit">` | Enter in an input submits; the textarea keeps Enter for new lines |

---

## Notes
- Without an avatar the form takes the full width (`:has()`).
- The textarea grows to 20rem, then scrolls.
