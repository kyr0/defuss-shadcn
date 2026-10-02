---
name: Application Form
type: BLK
why: Native form fields with autocomplete, required and type checks; a file input styled as a drop zone; :user-invalid shows errors only after trying - no script.
when: Below a job-details page or on its own page. A general contact form is get-in-touch; support requests use support-form.
where: dist/components/application-form/application-form.css
supportedStates: default
---

# Pattern: Application Form

## Native basis
A `<form>` of `<fieldset>`s (personal details, documents, links), Inputs with `autocomplete`, a `<input type="file">` inside a labelled drop zone, a consent Checkbox and a submit Button.

Built from: [Input](../input/component-skill.md), [Label](../label/component-skill.md), [Textarea](../textarea/component-skill.md), [Checkbox](../checkbox/component-skill.md), [Select](../select/component-skill.md), [Button](../button/component-skill.md).

---

## Native Web APIs
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form
- [`:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid) - errors show only after the user tried
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - the browser fills known fields
- [`<input type="file">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file) - native file picking
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside

---

## Structure

```html
<section class="mk-application-form" aria-labelledby="apply-title">
  <h2 id="apply-title" class="sr-only">Apply for Senior Sync Engineer</h2>
  <form action="#" method="post">
    <fieldset class="mk-application-form-section">
      <legend class="mk-application-form-legend"><strong>Personal details</strong><span>How we reach you.</span></legend>
      <div class="mk-application-form-fields">
        <div class="mk-application-form-field"><label class="label" for="ap-name">Full name</label><input class="input" id="ap-name" name="name" autocomplete="name" required></div>
        <div class="mk-application-form-field"><label class="label" for="ap-email">Email</label><input class="input" id="ap-email" type="email" name="email" autocomplete="email" required></div>
        <div class="mk-application-form-field"><label class="label" for="ap-phone">Phone <span class="mk-application-form-hint">(optional)</span></label><input class="input" id="ap-phone" type="tel" name="phone" autocomplete="tel" inputmode="tel"></div>
        <div class="mk-application-form-field"><label class="label" for="ap-where">Where are you based?</label><select class="select" id="ap-where" name="location"><option>Portugal</option><option>Germany</option><option>Elsewhere in the EU</option></select></div>
      </div>
    </fieldset>
    <fieldset class="mk-application-form-section">
      <legend class="mk-application-form-legend"><strong>Documents</strong><span>PDF or DOCX, up to 10 MB.</span></legend>
      <div class="mk-application-form-fields">
        <div class="mk-application-form-field" data-span="full">
          <label class="mk-application-form-upload" for="ap-cv"><i data-lucide="upload"></i><strong>Upload your résumé</strong><span>or drop it here</span>
            <input id="ap-cv" type="file" name="cv" accept=".pdf,.docx" required aria-describedby="ap-cv-hint">
          </label>
          <span class="mk-application-form-hint" id="ap-cv-hint">Required - PDF or DOCX.</span>
        </div>
        <div class="mk-application-form-field" data-span="full"><label class="label" for="ap-note">Why Acme? <span class="mk-application-form-hint">(a few sentences)</span></label><textarea class="textarea" id="ap-note" name="note" rows="4"></textarea></div>
      </div>
    </fieldset>
    <fieldset class="mk-application-form-section">
      <legend class="mk-application-form-legend"><strong>Links</strong><span>Anything that shows your work.</span></legend>
      <div class="mk-application-form-fields">
        <div class="mk-application-form-field"><label class="label" for="ap-in">LinkedIn</label><input class="input" id="ap-in" type="url" name="linkedin" placeholder="https://linkedin.com/in/…"></div>
        <div class="mk-application-form-field"><label class="label" for="ap-gh">GitHub or portfolio</label><input class="input" id="ap-gh" type="url" name="portfolio" placeholder="https://…"></div>
      </div>
    </fieldset>
    <div class="mk-application-form-actions">
      <label class="mk-application-form-consent"><input class="checkbox" type="checkbox" name="consent" required>I agree that Acme stores my application for 12 months.</label>
      <button class="btn" type="submit">Submit application</button>
    </div>
  </form>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Sections with a description column beside the fields (from 48rem) |
| `data-variant="card"` | A compact single column on a card - for a sidebar or a short form |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| groups | `<fieldset>` + `<legend>` | Each section is a named group |
| drop zone | `<label for>` around the file input | The whole zone opens the picker; the input stays keyboard-focusable |
| errors | `aria-describedby` → hint | Hints read with the field; :user-invalid styles them after an attempt |

---

## Notes
- Ask only for what you will read - every field costs applicants.
- Accept PDF and DOCX; state the size limit in the hint.
