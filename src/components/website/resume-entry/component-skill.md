---
name: Resume Entry
type: BLK
section: website
why: An ordered list of entries, each a heading, paragraphs, <time> elements and lists - the date column and the timeline are grid, borders and pseudo-elements; a container query moves the dates under the title when narrow. No script.
when: The experience, education, volunteering or talks of a CV. A company's own history takes timeline-item; a generic event list takes the timeline component.
where: dist/components/resume-entry/resume-entry.css
supportedStates: default
---

# Pattern: Resume Entry

## Native basis
An `<ol>` of entries, newest first. Each entry: the organisation's logo (`<img>`) or initials (`<span>`), the title as a heading, the organisation and the kind of engagement, when (`<time>` elements) and where, a sentence, the highlights as a `<ul>` and the skills it used as a `<ul>`. Several roles at one employer are a nested `<ol>`.

Built from: plain HTML - no other component.

---

## Native Web APIs
- [`<ol>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol) - the entries in order, newest first
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable start and end (`datetime="2023-04"`)
- [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - narrow, when and where move under the title and the date column folds in
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - an entry without a logo gives its body the whole row
- [`break-inside: avoid`](https://developer.mozilla.org/en-US/docs/Web/CSS/break-inside) - a printed entry never splits across pages

---

## Structure

```html
<ol class="mk-resume-entries">
  <li class="mk-resume-entry">
    <span class="mk-resume-entry-mark" aria-hidden="true">NW</span>
    <div class="mk-resume-entry-body">
      <div class="mk-resume-entry-head">
        <h3 class="mk-resume-entry-title">Staff design engineer</h3>
        <p class="mk-resume-entry-org"><a href="#">Northwind</a><span>Full-time</span></p>
        <p class="mk-resume-entry-when"><time datetime="2023-04">04/2023</time> - today</p>
        <p class="mk-resume-entry-where">Berlin, hybrid</p>
      </div>
      <p class="mk-resume-entry-text">Leads the design system fourteen product teams build with - components, tokens, documentation and the review of every change.</p>
      <ul class="mk-resume-entry-highlights">
        <li>Cut the system's CSS from 240 kB to 38 kB by moving variants to data attributes</li>
        <li>Took the product to WCAG 2.2 AA in nine months</li>
      </ul>
      <ul class="mk-resume-entry-tags" aria-label="Skills">
        <li>TypeScript</li>
        <li>CSS</li>
        <li>Figma</li>
      </ul>
    </div>
  </li>
  <li class="mk-resume-entry">
    <span class="mk-resume-entry-mark" aria-hidden="true">GX</span>
    <div class="mk-resume-entry-body">
      <div class="mk-resume-entry-head">
        <h3 class="mk-resume-entry-title">Globex</h3>
        <p class="mk-resume-entry-org"><span>Hamburg</span></p>
        <p class="mk-resume-entry-when"><time datetime="2018-02">02/2018</time> - <time datetime="2023-03">03/2023</time></p>
      </div>
      <ol class="mk-resume-entry-roles">
        <li>
          <h4 class="mk-resume-entry-role">Senior front-end engineer</h4>
          <p class="mk-resume-entry-when"><time datetime="2020-06">06/2020</time> - <time datetime="2023-03">03/2023</time></p>
          <p class="mk-resume-entry-text">Rebuilt the research wiki's editor; led a team of four.</p>
        </li>
        <li>
          <h4 class="mk-resume-entry-role">Front-end engineer</h4>
          <p class="mk-resume-entry-when"><time datetime="2018-02">02/2018</time> - <time datetime="2020-05">05/2020</time></p>
        </li>
      </ol>
    </div>
  </li>
</ol>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | A logo column beside each entry, a rule between entries |
| `data-variant="timeline"` | No rules - one line runs through the logos; an empty `.mk-resume-entry-mark` is a dot on it |
| `data-variant="horizontal"` | The entries side by side on one line through their marks, left to right (oldest first); the date leads; more than fit scroll sideways with scroll snap; printed, they stack |
| `data-variant="columns"` | The classic CV: when in a column of its own on the start side, no logos |
| `.mk-resume-entry-roles` | Several roles at one employer - a promotion path, the newest role's dot in the primary colour |
| `.mk-resume-entry-projects` | A `<ul aria-label>` of Project Items (`<h4>` titles) under the entry - the timeline and the work in one view |
| `.mk-resume-entry-highlights` / `.mk-resume-entry-tags` | What came of it, and the skills it used |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| list | `<ol>` | The order means something - newest first; a horizontal line oldest first, named by `aria-label` ("Career, oldest first") |
| logo | `alt=""` on an `<img>`, `aria-hidden="true"` on initials | The organisation is named in the text |
| title | `<h3>` (`<h4>` per role) | One level below the section heading ("Experience") |
| dates | `<time datetime>` | "04/2023 - today" reads in any language; the `datetime` is for machines |
| skills | `<ul aria-label="Skills">` | Names the list for a screen reader |

---

## Notes
- The horizontal list is a scroll container: keep it to a handful of entries and a sentence each - the columns are 14rem at least.
- The projects view composes the Project Item block - load its CSS (`project-item.css`) beside this one.
- Education, volunteering and talks use the same entry: the degree, role or talk is the title, the school, organisation or event the `.mk-resume-entry-org`.
- A printed entry stays on one page (`break-inside: avoid`); the tags print as outlined pills.
