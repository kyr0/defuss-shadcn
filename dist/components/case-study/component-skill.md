---
name: Case Study
type: BLK
section: website
why: Sections, an ordered list for the approach, a <dl> for the results and a <blockquote> - long-form structure the browser and readers already know.
when: The full story behind a case-preview. For a short anonymous scenario use use-case.
where: dist/components/case-study/case-study.css
supportedStates: default
---

# Pattern: Case Study

## Native basis
An `<article>`: a header (client, industry, title, a cover picture), a results band (`<dl>`), then <em>Challenge</em> / <em>Approach</em> / <em>Results</em> sections - the approach as an `<ol>` - and a `<blockquote>` with its source.

Built from: [Badge](../badge/component-skill.md), [Avatar](../avatar/component-skill.md).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`<blockquote>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote) - a quoted post with its source
- [`CSS counters`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_counter_styles/Using_CSS_counters) - numbering without markup
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
<article class="mk-case-study" aria-labelledby="cs-title">
  <header class="mk-case-study-head">
    <div class="mk-case-study-client"><strong>Northwind</strong><span class="badge" data-variant="outline">Logistics</span><span>· 1,200 employees</span></div>
    <h1 class="mk-case-study-title" id="cs-title">How Northwind cut planning meetings in half</h1>
    <figure class="mk-case-study-cover"><img src="https://picsum.photos/seed/case-study-cover/1600/700" alt="Northwind's operations floor"></figure>
  </header>
  <dl class="mk-case-study-results">
    <div><dt>less time in planning meetings</dt><dd>−52%</dd></div>
    <div><dt>teams onboarded in 6 weeks</dt><dd>38</dd></div>
    <div><dt>tools replaced</dt><dd>4</dd></div>
  </dl>
  <div class="mk-case-study-layout">
    <div class="mk-case-study-body">
      <section aria-labelledby="cs-challenge"><h2 id="cs-challenge">The challenge</h2><p>Northwind's 38 regional teams planned routes in spreadsheets, discussed them in email and decided in a weekly two-hour call. Nobody trusted the latest version.</p></section>
      <section aria-labelledby="cs-approach"><h2 id="cs-approach">The approach</h2>
        <ol class="mk-case-study-steps">
          <li><strong>One planning board per region</strong><span>Imported from the spreadsheets in a day.</span></li>
          <li><strong>Decisions written down</strong><span>Every change has an owner and a reason.</span></li>
          <li><strong>The weekly call became async</strong><span>A 15-minute review of open questions only.</span></li>
        </ol>
      </section>
      <section aria-labelledby="cs-results"><h2 id="cs-results">The results</h2><p>Six weeks later every region planned on Acme. Meetings shrank by half, and route changes reached drivers a day earlier.</p>
        <figure class="mk-case-study-quote">
          <blockquote><p>We stopped arguing about which spreadsheet was right. Now we argue about routes - which is the job.</p></blockquote>
          <figcaption><span class="avatar"><img class="avatar-image" src="images/mk-portrait2.png" alt=""></span><div><strong>Hannah Lee</strong><br><span>Head of Operations, Northwind</span></div></figcaption>
        </figure>
      </section>
    </div>
    <dl class="mk-case-study-facts">
      <div><dt>Client</dt><dd>Northwind Logistics</dd></div>
      <div><dt>Industry</dt><dd>Transport &amp; logistics</dd></div>
      <div><dt>Plan</dt><dd>Enterprise</dd></div>
      <div><dt>Timeline</dt><dd>6 weeks</dd></div>
    </dl>
  </div>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Header, results band, three sections with a side facts column (from 52rem), pull quote |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| results | `<dl>` | Each metric is a label/value pair |
| quote | `<figure>` + `<blockquote>` + `<figcaption>` | The quote and who said it, related |
| approach | `<ol>` | The steps in order |

---

## Notes
- Back every result with a number and a period ("in six months").
