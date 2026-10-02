---
name: Use Case
type: BLK
why: A heading, lists and one figure; the split layout and the alternating side are container-query CSS - no script.
when: Solution pages by industry, role or job-to-be-done. A customer story with real numbers is case-preview / case-study.
where: dist/components/use-case/use-case.css
supportedStates: default
---

# Pattern: Use Case

## Native basis
An `<article>` with an eyebrow (who it is for), a title, the situation and the approach as paragraphs, outcomes as a check list, a highlighted metric and a picture.

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) - media with its caption
- [`text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balanced titles, pretty paragraphs

---

## Structure

```html
<article class="mk-use-case" aria-labelledby="uc-launch">
  <div class="mk-use-case-layout">
    <div class="mk-use-case-copy">
      <span class="mk-use-case-eyebrow"><i data-lucide="rocket"></i> For product teams</span>
      <h2 class="mk-use-case-title" id="uc-launch">Launch with five teams - without the war room</h2>
      <p class="mk-use-case-text">Launches stall when marketing, support and engineering plan in different tools. Acme puts the launch plan, the docs and every open question on one board, so each team sees what the others need.</p>
      <ul class="mk-use-case-outcomes">
        <li><i data-lucide="check"></i>One launch board that every team updates</li>
        <li><i data-lucide="check"></i>Release notes drafted from the shipped work</li>
        <li><i data-lucide="check"></i>Support briefed before customers ask</li>
      </ul>
      <p class="mk-use-case-metric"><strong>−40%</strong> time from code freeze to launch</p>
    </div>
    <figure class="mk-use-case-media"><img src="https://picsum.photos/seed/usecase-launch/1000/750" alt=""></figure>
  </div>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Copy left, picture right (stacked when narrow) |
| `data-variant="reverse"` | Picture left - alternate it down a page |
| `data-variant="card"` | A compact card without the picture - for grids of use cases |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `<article aria-labelledby>` | Named by its title |
| metric | `<p>` with `<strong>` | Plain text - the number and its meaning read together |

---

## Notes
- Name the situation in the reader's words ("Planning a launch with five teams").
