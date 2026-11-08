---
name: Skill Matrix
type: BLK
section: website
why: Each level is a native <meter> named by its <label> - assistive technology gets the skill, the level and its range from the element itself; the bars and dots are the meter's own parts and a mask, the rows share columns through subgrid. No script.
when: The skills, tools and languages of a CV or a portfolio. Numbers about a company take stats; a progress towards a goal takes progress.
where: dist/components/skill-matrix/skill-matrix.css
supportedStates: default
---

# Pattern: Skill Matrix

## Native basis
Groups of skills, each a `<section>` with a heading and a `<ul>`. A skill: its name (a `<label>` for its meter), its level as a native `<meter min="0" max="5">` and a note (years, a CEFR level). Without levels (the tags variant) the name is a `<span>` and there is no meter.

Built from: plain HTML - no other component.

---

## Native Web APIs
- [`<meter>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter) - a scalar value in a known range: the level
- [`<label for>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label) - names the meter with the skill
- [`::-webkit-meter-bar` / `::-moz-meter-bar`](https://developer.mozilla.org/en-US/docs/Web/CSS/::-moz-meter-bar) - the track and the fill, themed
- [`mask`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask) - the dots variant turns the fill into five whole dots
- [Subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid) - names, levels and notes line up across a group
- [`print-color-adjust`](https://developer.mozilla.org/en-US/docs/Web/CSS/print-color-adjust) - the levels survive printing

---

## Structure

```html
<div class="mk-skill-matrix">
  <section class="mk-skill-matrix-group" aria-labelledby="sm-eng">
    <h3 class="mk-skill-matrix-title" id="sm-eng"><i data-lucide="code-xml"></i> Engineering</h3>
    <ul class="mk-skill-matrix-list">
      <li class="mk-skill-matrix-skill">
        <label class="mk-skill-matrix-name" for="sm-ts">TypeScript</label>
        <meter class="mk-skill-matrix-level" id="sm-ts" min="0" max="5" value="5">5 of 5</meter>
        <span class="mk-skill-matrix-note">9 yrs</span>
      </li>
      <li class="mk-skill-matrix-skill">
        <label class="mk-skill-matrix-name" for="sm-css">CSS</label>
        <meter class="mk-skill-matrix-level" id="sm-css" min="0" max="5" value="5">5 of 5</meter>
        <span class="mk-skill-matrix-note">11 yrs</span>
      </li>
      <li class="mk-skill-matrix-skill">
        <label class="mk-skill-matrix-name" for="sm-a11y">Accessibility</label>
        <meter class="mk-skill-matrix-level" id="sm-a11y" min="0" max="5" value="4">4 of 5</meter>
        <span class="mk-skill-matrix-note">6 yrs</span>
      </li>
      <li class="mk-skill-matrix-skill">
        <label class="mk-skill-matrix-name" for="sm-rust">Rust</label>
        <meter class="mk-skill-matrix-level" id="sm-rust" min="0" max="5" value="2">2 of 5</meter>
        <span class="mk-skill-matrix-note">1 yr</span>
      </li>
    </ul>
  </section>
  <section class="mk-skill-matrix-group" aria-labelledby="sm-design">
    <h3 class="mk-skill-matrix-title" id="sm-design"><i data-lucide="pen-tool"></i> Design</h3>
    <ul class="mk-skill-matrix-list">
      <li class="mk-skill-matrix-skill">
        <label class="mk-skill-matrix-name" for="sm-figma">Figma</label>
        <meter class="mk-skill-matrix-level" id="sm-figma" min="0" max="5" value="5">5 of 5</meter>
        <span class="mk-skill-matrix-note">7 yrs</span>
      </li>
      <li class="mk-skill-matrix-skill">
        <label class="mk-skill-matrix-name" for="sm-type">Type &amp; layout</label>
        <meter class="mk-skill-matrix-level" id="sm-type" min="0" max="5" value="4">4 of 5</meter>
        <span class="mk-skill-matrix-note">11 yrs</span>
      </li>
      <li class="mk-skill-matrix-skill">
        <label class="mk-skill-matrix-name" for="sm-motion">Motion</label>
        <meter class="mk-skill-matrix-level" id="sm-motion" min="0" max="5" value="3">3 of 5</meter>
        <span class="mk-skill-matrix-note">4 yrs</span>
      </li>
    </ul>
  </section>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | Each level a bar: the meter's track in the muted colour, its fill in the primary colour |
| `data-variant="dots"` | Each level five dots - give the meters `max="5"` and whole values |
| `data-variant="stars"` | Each level five amber stars (the Rating colour) - `max="5"`; half steps (`4.5`) show half a star |
| `data-variant="tags"` | No levels: the skills as pills with their note inside; leave the meters out, the names are `<span>`s |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| group | `<section aria-labelledby>` | Named by its heading |
| level | `<meter>` + `<label for>` | The label names the meter; the meter role carries its value, minimum and maximum |
| meter text | `5 of 5` | Fallback content for engines that do not draw a meter |
| icon | `<i data-lucide>` | Decorative - Lucide marks its SVG `aria-hidden` |

---

## Notes
- Every meter needs an `id` its label points to - prefix them per matrix (`sm-ts`) so two matrices on one page never collide.
- Spoken languages fit the dots variant with the CEFR level as the note (C2, C1, B1).
- The groups fill an auto-fill grid (17rem and more per column): two or three columns on a page, one on a phone.
