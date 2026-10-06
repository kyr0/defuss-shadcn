---
name: Job Item
type: BLK
section: website
why: A heading link stretched over the row, the facts as a list, a <time> for the posting date - no script.
when: Careers pages and job boards. The full posting is job-details; the form is application-form.
where: dist/components/job-item/job-item.css
supportedStates: default
---

# Pattern: Job Item

## Native basis
An `<article>` whose title link covers the whole item (a stretched `::after`), the facts as a `<ul>` with icons, the salary and a `<time>`.

Built from: [Badge](badge.md).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
  <section class="mk-job-group" aria-labelledby="jobs-eng">
    <h2 class="mk-job-group-title" id="jobs-eng">Engineering · 3 roles</h2>
    <article class="mk-job-item">
      <div class="mk-job-item-main">
        <h3 class="mk-job-item-title"><a href="#">Senior Sync Engineer</a> <span class="badge" data-variant="default" data-size="sm">New</span></h3>
        <ul class="mk-job-item-meta">
          <li><i data-lucide="briefcase"></i>Engineering</li>
          <li><i data-lucide="map-pin"></i>Lisbon or remote (EU)</li>
          <li><i data-lucide="clock"></i>Full-time</li>
        </ul>
      </div>
      <div class="mk-job-item-side">
        <span class="mk-job-item-salary">€95k – €120k</span>
        <time class="mk-job-item-posted" datetime="2026-09-29">Posted 2 days ago</time>
      </div>
      <i data-lucide="arrow-right"></i>
    </article>
    <article class="mk-job-item">
      <div class="mk-job-item-main">
        <h3 class="mk-job-item-title"><a href="#">Frontend Engineer, Editor</a></h3>
        <ul class="mk-job-item-meta">
          <li><i data-lucide="briefcase"></i>Engineering</li>
          <li><i data-lucide="map-pin"></i>Berlin</li>
          <li><i data-lucide="clock"></i>Full-time</li>
          <li><i data-lucide="wifi"></i>Hybrid</li>
        </ul>
      </div>
      <div class="mk-job-item-side">
        <span class="mk-job-item-salary">€80k – €100k</span>
        <time class="mk-job-item-posted" datetime="2026-09-24">Posted 1 week ago</time>
      </div>
      <i data-lucide="arrow-right"></i>
    </article>
    <article class="mk-job-item">
      <div class="mk-job-item-main">
        <h3 class="mk-job-item-title"><a href="#">Site Reliability Engineer</a></h3>
        <ul class="mk-job-item-meta">
          <li><i data-lucide="briefcase"></i>Engineering</li>
          <li><i data-lucide="map-pin"></i>Remote (EU)</li>
          <li><i data-lucide="clock"></i>Full-time</li>
        </ul>
      </div>
      <div class="mk-job-item-side">
        <span class="mk-job-item-salary">€90k – €110k</span>
        <time class="mk-job-item-posted" datetime="2026-09-10">Posted 3 weeks ago</time>
      </div>
      <i data-lucide="arrow-right"></i>
    </article>
  </section>
  <section class="mk-job-group" aria-labelledby="jobs-design">
    <h2 class="mk-job-group-title" id="jobs-design">Design · 1 role</h2>
    <article class="mk-job-item">
      <div class="mk-job-item-main">
        <h3 class="mk-job-item-title"><a href="#">Product Designer, Mobile</a> <span class="badge" data-variant="default" data-size="sm">New</span></h3>
        <ul class="mk-job-item-meta">
          <li><i data-lucide="briefcase"></i>Design</li>
          <li><i data-lucide="map-pin"></i>Lisbon</li>
          <li><i data-lucide="clock"></i>Part-time</li>
          <li><i data-lucide="wifi"></i>Hybrid</li>
        </ul>
      </div>
      <div class="mk-job-item-side">
        <span class="mk-job-item-salary">€55k – €70k (80%)</span>
        <time class="mk-job-item-posted" datetime="2026-10-01">Posted today</time>
      </div>
      <i data-lucide="arrow-right"></i>
    </article>
  </section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A list row: title and facts left, salary and date right, an arrow that slides on hover |
| `data-variant="card"` | A bordered card - for a grid of featured roles |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title link | `<a>` in `<h3>` | Its text is the job title - the whole item is clickable through it |
| posted | `<time datetime>` | Machine-readable date |
| icons | `aria-hidden` | Decorative - the text carries the meaning |

---

## Notes
- Group rows by department under an `<h2>` each.
- Show a salary range whenever you can - it is the most-read fact.
