---
name: Profile Form
type: BLK
why: Native fields with autocomplete and maxlength; the username prefix is an addon beside the input; the form submits like any other - no script.
when: Account settings. Passwords, two-factor and sessions are security-settings; notifications are notification-settings.
where: dist/components/profile-form/profile-form.css
supportedStates: default
---

# Pattern: Profile Form

## Native basis
A `<form>` of sections - a heading and a description beside the fields (from 48rem): the photo (Avatar + file input), names with `autocomplete`, a username with a prefix addon, a bio Textarea with `maxlength`, a URL and a time-zone Select; a sticky action bar.

Built from: [Avatar](../avatar/component-skill.md), [Input](../input/component-skill.md), [Textarea](../textarea/component-skill.md), [Select](../select/component-skill.md), [Label](../label/component-skill.md), [Button](../button/component-skill.md).

---

## Native Web APIs
- [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - the browser fills known fields
- [`Constraint validation`](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - required, type and pattern - the browser checks the form
- [`<input type="file">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file) - native file picking
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<section class="mk-profile-form" aria-labelledby="pf-title">
  <h2 id="pf-title" class="sr-only">Profile settings</h2>
  <form action="#" method="post">
    <div class="mk-profile-form-section">
      <div><h2>Photo</h2><p>Shown next to everything you write.</p></div>
      <div class="mk-profile-form-photo">
        <span class="avatar" data-size="xl"><img class="avatar-image" src="images/mk-portrait2.png" alt="Current photo"></span>
        <label class="btn mk-profile-form-upload" data-variant="outline" data-size="sm"><i data-lucide="upload"></i> Upload new<input type="file" name="photo" accept="image/*"></label>
        <button class="btn" data-variant="ghost" data-size="sm" type="button">Remove</button>
      </div>
    </div>
    <div class="mk-profile-form-section">
      <div><h2>Personal</h2><p>Your name as colleagues see it.</p></div>
      <div class="mk-profile-form-fields">
        <div class="mk-profile-form-field"><label class="label" for="pf-first">First name</label><input class="input" id="pf-first" name="given-name" autocomplete="given-name" value="Hannah"></div>
        <div class="mk-profile-form-field"><label class="label" for="pf-last">Last name</label><input class="input" id="pf-last" name="family-name" autocomplete="family-name" value="Lee"></div>
        <div class="mk-profile-form-field" data-span="full"><label class="label" for="pf-user">Username</label><div class="mk-profile-form-prefix"><span id="pf-user-prefix">acme.com/</span><input class="input" id="pf-user" name="username" autocomplete="username" value="hannahdesigns" pattern="[a-z0-9_]{3,20}" aria-describedby="pf-user-prefix pf-user-hint"></div><span class="mk-profile-form-hint" id="pf-user-hint">3–20 lowercase letters, numbers or _</span></div>
        <div class="mk-profile-form-field" data-span="full"><label class="label" for="pf-bio">Bio</label><textarea class="textarea" id="pf-bio" name="bio" rows="3" maxlength="160" aria-describedby="pf-bio-hint">Making software quieter at Northwind.</textarea><span class="mk-profile-form-hint" id="pf-bio-hint">Up to 160 characters.</span></div>
      </div>
    </div>
    <div class="mk-profile-form-section">
      <div><h2>Details</h2><p>Optional.</p></div>
      <div class="mk-profile-form-fields">
        <div class="mk-profile-form-field"><label class="label" for="pf-url">Website</label><input class="input" id="pf-url" type="url" name="url" autocomplete="url" placeholder="https://"></div>
        <div class="mk-profile-form-field"><label class="label" for="pf-tz">Time zone</label><select class="select" id="pf-tz" name="tz"><option>Europe/Lisbon (WEST)</option><option>Europe/Berlin (CEST)</option><option>America/Montreal (EDT)</option></select></div>
      </div>
    </div>
    <div class="mk-profile-form-actions"><button class="btn" data-variant="ghost" type="reset">Cancel</button><button class="btn" type="submit">Save changes</button></div>
  </form>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Settings rows: description left, fields right; actions at the end |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| username prefix | part of the label's description | `aria-describedby` reads "acme.com/" |
| bio limit | `maxlength` + hint | The limit is stated, not only enforced |
| photo | `<label>` styled as a button around the file input | Keyboard-operable |

---

## Notes
- Save per section or once - but never lose unsaved input on navigation.
