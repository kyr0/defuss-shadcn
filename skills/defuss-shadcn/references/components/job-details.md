---
name: Job Details
type: BLK
section: website
why: Sections with headings, check lists and a <dl> summary; the summary is sticky from 52rem - CSS only.
when: The page for one vacancy. Lists of vacancies use job-item; the form below uses application-form.
where: dist/components/job-details/job-details.css
supportedStates: default
---

# Pattern: Job Details

## Native basis
A header (title, facts, apply button), then `<section>`s with headings and lists, and an `<aside>` summary - a `<dl>` of the key facts that sticks while the description scrolls.

Built from: [Badge](badge.md), [Button](button.md).

---

## Native Web APIs
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balanced titles, pretty paragraphs

---

## Structure

```html
<article class="mk-job-details" aria-labelledby="jd-title">
  <header class="mk-job-details-head">
    <a class="mk-job-details-back" href="#"><i data-lucide="arrow-left"></i> All open roles</a>
    <h1 class="mk-job-details-title" id="jd-title">Senior Sync Engineer</h1>
    <div class="mk-job-details-tags">
      <span class="badge" data-variant="secondary">Engineering</span>
      <span class="badge" data-variant="outline">Lisbon or remote (EU)</span>
      <span class="badge" data-variant="outline">Full-time</span>
    </div>
  </header>
  <div class="mk-job-details-layout">
    <div class="mk-job-details-body">
      <section aria-labelledby="jd-about"><h2 id="jd-about">About the role</h2><p>You will own the engine that keeps a million workspaces in sync - offline-first, conflict-free and fast on a train in a tunnel. You will work with two other engineers and report to Sophie, our Head of Engineering.</p></section>
      <section aria-labelledby="jd-do"><h2 id="jd-do">What you will do</h2><ul class="mk-job-details-list"><li>Design and ship the next version of our CRDT-based sync protocol</li><li>Profile and speed up sync on low-end phones and slow networks</li><li>Pair with designers on how conflicts look to people</li></ul></section>
      <section aria-labelledby="jd-need"><h2 id="jd-need">What you bring</h2><ul class="mk-job-details-list"><li>5+ years building distributed or local-first systems</li><li>Deep TypeScript or Rust; curiosity for both</li><li>Clear writing - we decide in documents, not meetings</li></ul></section>
      <section aria-labelledby="jd-perks"><h2 id="jd-perks">Benefits</h2><ul class="mk-job-details-benefits"><li><i data-lucide="palm-tree"></i>30 days off</li><li><i data-lucide="laptop"></i>Equipment of your choice</li><li><i data-lucide="graduation-cap"></i>€2k learning budget</li><li><i data-lucide="heart-pulse"></i>Private health insurance</li><li><i data-lucide="plane"></i>Two offsites a year</li><li><i data-lucide="baby"></i>20 weeks parental leave</li></ul></section>
    </div>
    <aside class="mk-job-details-summary" aria-label="Summary">
      <h2>Summary</h2>
      <dl>
        <div><dt>Salary</dt><dd>€95k – €120k + equity</dd></div>
        <div><dt>Location</dt><dd>Lisbon or remote (EU time zones)</dd></div>
        <div><dt>Team</dt><dd>Sync · 3 engineers</dd></div>
        <div><dt>Start</dt><dd>As soon as possible</dd></div>
      </dl>
      <a class="btn" href="#">Apply for this role</a>
    </aside>
  </div>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Description left, sticky summary right (stacked when narrow) |
| `.mk-job-details-benefits` | Benefits as icon tiles |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| sections | `<section aria-labelledby>` | Each part is a region named by its heading |
| summary | `<aside aria-label="Summary">` | Complementary landmark with the facts |
| apply | `<a class="btn">` | Links to the application form (an id on the same page or a separate page) |

---

## Notes
- Keep the requirement list honest: must-haves first, then nice-to-haves.
- Repeat the apply action at the end of a long description.
