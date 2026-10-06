---
name: Help Article
type: BLK
section: website
why: An ordered list of steps with counters, a <details> for "still stuck", a CSS-only "was this helpful?" - no script.
when: Help-center articles and how-tos. Reference documentation is docs-content.
where: dist/components/help-article/help-article.css
supportedStates: default
---

# Pattern: Help Article

## Native basis
An `<article>`: breadcrumbs, the title, updated `<time>` and reading time, a lead, numbered steps (`<ol>`) with screenshots, a tip, a "still stuck?" `<details>`, a helpful-or-not question and related articles.

Built from: [Breadcrumb](breadcrumb.md), [Feedback Form](feedback-form.md).

---

## Native Web APIs
- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - an ordered sequence
- [`CSS counters`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_counter_styles/Using_CSS_counters) - numbering without markup
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native disclosure, no script
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside

---

## Structure

```html
<article class="mk-help-article" aria-labelledby="ha-title">
  <nav class="breadcrumb" aria-label="Breadcrumb"><ol class="breadcrumb-list"><li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Help</a></li><li class="breadcrumb-separator" aria-hidden="true">/</li><li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Billing</a></li><li class="breadcrumb-separator" aria-hidden="true">/</li><li class="breadcrumb-item"><span class="breadcrumb-page" aria-current="page">Change your billing email</span></li></ol></nav>
  <h1 class="mk-help-article-title" id="ha-title">Change your billing email</h1>
  <p class="mk-help-article-meta">Updated <time datetime="2026-09-12">12 Sep 2026</time> · 2 min read</p>
  <p class="mk-help-article-lead">Invoices and payment reminders go to the billing email. Only workspace owners can change it.</p>
  <ol class="mk-help-article-steps">
    <li><div><strong>Open Settings</strong><p>Press <kbd>⌘</kbd> <kbd>,</kbd> or choose Settings from your avatar menu.</p></div></li>
    <li><div><strong>Go to Billing → Details</strong><p>You'll see the current billing email under "Invoices".</p><img src="images/mk-wide.png" alt="The Billing details screen with the billing email field highlighted"></div></li>
    <li><div><strong>Enter the new address and save</strong><p>We send a confirmation link to the new address. The change applies once it is confirmed.</p></div></li>
  </ol>
  <div class="mk-help-article-tip"><i data-lucide="lightbulb"></i><p>Use a shared address like billing@yourcompany.com so invoices don't depend on one person.</p></div>
  <details class="mk-help-article-stuck"><summary>Still stuck?</summary><p>If you can't see Billing, you're not an owner of this workspace. Ask an owner, or <a href="#">contact support</a>.</p></details>
  <form class="mk-feedback-form" data-variant="inline" action="#" method="post">
    <fieldset><legend>Was this article helpful?</legend><div class="mk-feedback-form-yesno"><label><input type="radio" name="ha-helpful" value="yes"><i data-lucide="thumbs-up"></i> Yes</label><label><input type="radio" name="ha-helpful" value="no"><i data-lucide="thumbs-down"></i> No</label></div></fieldset>
    <p class="mk-feedback-form-thanks" role="status">Thanks for letting us know.</p>
  </form>
  <ul class="mk-help-article-related"><li><h2>Related articles</h2></li><li><a href="#"><i data-lucide="file-text"></i>Download an invoice</a></li><li><a href="#"><i data-lucide="file-text"></i>Add a VAT number</a></li></ul>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Steps with numbers and screenshots, tip, feedback, related |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| steps | `<ol>` | Order is meaning |
| screenshots | `alt` describing the screen | Not "screenshot" |

---

## Notes
- One task per article; title it with the task ("Change your billing email").
