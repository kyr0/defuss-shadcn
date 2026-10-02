---
name: Support Form
type: BLK
why: Native form fields; priority is a radio group styled as a segmented control; attachments are a multiple file input in a drop zone - no script.
when: Help centers and in-app support. General contact is get-in-touch; product feedback is feedback-form.
where: dist/components/support-form/support-form.css
supportedStates: default
---

# Pattern: Support Form

## Native basis
A `<form>`: a topic Select, subject, a description Textarea, priority radios (`.mk-support-form-priority`), a `multiple` file input in a drop zone and the reply email; beside it an `<aside>` with the response time and help links.

Built from: [Select](select.md), [Input](input.md), [Textarea](textarea.md), [Label](label.md), [Button](button.md).

---

## Native Web APIs
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend
- [`<input type="file">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file) - native file picking
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-support-form" aria-labelledby="sp-title">
  <div class="mk-support-form-layout">
    <form action="#" method="post">
      <h2 id="sp-title" style="margin:0;font-size:1.25rem">Contact support</h2>
      <div class="mk-support-form-field"><label class="label" for="sp-topic">Topic</label><select class="select" id="sp-topic" name="topic" required><option value="">Choose a topic</option><option>Billing</option><option>Sync &amp; offline</option><option>Account access</option><option>Something else</option></select></div>
      <div class="mk-support-form-field"><label class="label" for="sp-subj">Subject</label><input class="input" id="sp-subj" name="subject" required></div>
      <div class="mk-support-form-field"><label class="label" for="sp-desc">What happened?</label><textarea class="textarea" id="sp-desc" name="description" rows="5" required placeholder="Steps, what you expected, what you saw…"></textarea></div>
      <fieldset class="mk-support-form-priority"><legend>Priority</legend><div><label><input type="radio" name="priority" value="low">Low</label><label><input type="radio" name="priority" value="normal" checked>Normal</label><label><input type="radio" name="priority" value="urgent">Urgent</label></div></fieldset>
      <label class="mk-support-form-drop" for="sp-files"><i data-lucide="paperclip"></i><strong>Attach screenshots or logs</strong><span>Up to 5 files, 20 MB each</span><input id="sp-files" type="file" name="files" multiple></label>
      <div class="mk-support-form-field"><label class="label" for="sp-mail">Reply to</label><input class="input" id="sp-mail" type="email" name="email" autocomplete="email" required></div>
      <button class="btn" type="submit">Send request</button>
    </form>
    <aside class="mk-support-form-aside" aria-label="Before you write">
      <div class="mk-support-form-sla"><i data-lucide="clock"></i><span><strong>Usually within 4 hours</strong><br>Mon–Fri, 8:00–20:00 CET</span></div>
      <h2>These might help</h2>
      <ul><li><a href="#"><i data-lucide="file-text"></i>Sync is stuck on one device</a></li><li><a href="#"><i data-lucide="file-text"></i>Change your billing email</a></li><li><a href="#"><i data-lucide="file-text"></i>Recover a deleted doc</a></li></ul>
      <p>Status: all systems normal.</p>
    </aside>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Form beside the help aside (from 52rem) |
| `.mk-support-form-priority` | Priority as a segmented radio group |
| `.mk-support-form-drop` | A dashed drop zone around a multiple file input |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| priority | `<fieldset>` of radios | Arrow keys move |
| attachments | `<label>` drop zone | The whole zone opens the picker |
| aside | `<aside aria-label>` | Help before writing |

---

## Notes
- Suggest articles that match the subject before people send.
