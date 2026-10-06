---
name: Notification Settings
type: BLK
section: website
why: A real <table> of checkboxes - every box labelled "Mentions by email" - or a list of Switches; nothing but form controls.
when: Account or workspace settings. Marketing email preferences belong in an unsubscribe page; cookie choices in the Cookie Consent component.
where: dist/components/notification-settings/notification-settings.css
supportedStates: default
---

# Pattern: Notification Settings

## Native basis
A `<table>`: topics as row headers (with a description), channels as column headers, a Checkbox per cell with an `aria-label` naming both. Or a list of Switches and a frequency Select.

Built from: [Checkbox](checkbox.md), [Switch](switch.md), [Select](select.md).

---

## Native Web APIs
- [`<table>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table) - real tabular data
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`<fieldset>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - grouped controls with a legend

---

## Structure

```html
<div class="mk-notification-settings">
  <table>
    <caption class="sr-only">Notifications by topic and channel</caption>
    <thead><tr><th scope="col">Topic</th><th scope="col">Email</th><th scope="col">Push</th><th scope="col">SMS</th></tr></thead>
    <tbody>
      <tr><th scope="row">Mentions<small>When someone @mentions you</small></th><td><input class="checkbox" type="checkbox" name="mentions" value="email" checked aria-label="Mentions by Email"></td><td><input class="checkbox" type="checkbox" name="mentions" value="push" checked aria-label="Mentions by Push"></td><td><input class="checkbox" type="checkbox" name="mentions" value="sms" aria-label="Mentions by SMS"></td></tr>
      <tr><th scope="row">Comments<small>Replies on your docs and tasks</small></th><td><input class="checkbox" type="checkbox" name="comments" value="email" checked aria-label="Comments by Email"></td><td><input class="checkbox" type="checkbox" name="comments" value="push" aria-label="Comments by Push"></td><td><input class="checkbox" type="checkbox" name="comments" value="sms" aria-label="Comments by SMS"></td></tr>
      <tr><th scope="row">Assignments<small>Tasks assigned to you</small></th><td><input class="checkbox" type="checkbox" name="assignments" value="email" checked aria-label="Assignments by Email"></td><td><input class="checkbox" type="checkbox" name="assignments" value="push" checked aria-label="Assignments by Push"></td><td><input class="checkbox" type="checkbox" name="assignments" value="sms" checked aria-label="Assignments by SMS"></td></tr>
      <tr><th scope="row">Weekly digest<small>A summary every Monday</small></th><td><input class="checkbox" type="checkbox" name="weekly-digest" value="email" checked aria-label="Weekly digest by Email"></td><td><input class="checkbox" type="checkbox" name="weekly-digest" value="push" aria-label="Weekly digest by Push"></td><td><input class="checkbox" type="checkbox" name="weekly-digest" value="sms" aria-label="Weekly digest by SMS"></td></tr>
    </tbody>
  </table>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A matrix: topics × channels |
| `data-variant="list"` | One switch per topic, with a digest Select |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| cells | `aria-label="Mentions by Email"` | Each checkbox names its row and column |
| headers | `<th scope>` | The table is navigable by header |

---

## Notes
- Default to fewer notifications; let people add more.
