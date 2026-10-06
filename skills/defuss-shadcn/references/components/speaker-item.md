---
name: Speaker Item
type: BLK
section: website
why: An article with a portrait, a heading and a link to the talk; the duotone-to-color hover is a CSS filter transition - no script.
when: Conference and event speaker grids. Your own team uses team-member; article authors use author-bio.
where: dist/components/speaker-item/speaker-item.css
supportedStates: default
---

# Pattern: Speaker Item

## Native basis
An `<article>` named by the speaker: a portrait with descriptive `alt`, name, role and company, an optional bio and a link to the session.

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - stable media boxes, no layout shift
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport

---

## Structure

```html
  <article class="mk-speaker-item" aria-labelledby="sp-1">
    <img class="mk-speaker-item-photo" src="images/mk-portrait.png" alt="Portrait of Sophie Tan">
    <div class="mk-speaker-item-body">
      <h3 class="mk-speaker-item-name" id="sp-1">Sophie Tan</h3>
      <p class="mk-speaker-item-role">Head of Engineering, Acme</p>
      <a class="mk-speaker-item-talk" href="#"><i data-lucide="mic"></i>Sync that never fails</a>
    </div>
  </article>
  <article class="mk-speaker-item" aria-labelledby="sp-2">
    <img class="mk-speaker-item-photo" src="images/mk-portrait2.png" alt="Portrait of Hannah Lee">
    <div class="mk-speaker-item-body">
      <h3 class="mk-speaker-item-name" id="sp-2">Hannah Lee</h3>
      <p class="mk-speaker-item-role">Design Lead, Northwind</p>
      <a class="mk-speaker-item-talk" href="#"><i data-lucide="mic"></i>Every badge must earn its place</a>
    </div>
  </article>
  <article class="mk-speaker-item" aria-labelledby="sp-3">
    <img class="mk-speaker-item-photo" src="images/mk-portrait.png" alt="Portrait of Marco Rossi">
    <div class="mk-speaker-item-body">
      <h3 class="mk-speaker-item-name" id="sp-3">Marco Rossi</h3>
      <p class="mk-speaker-item-role">CTO, Globex</p>
      <a class="mk-speaker-item-talk" href="#"><i data-lucide="mic"></i>Async teams at 400 people</a>
    </div>
  </article>
  <article class="mk-speaker-item" aria-labelledby="sp-4">
    <img class="mk-speaker-item-photo" src="images/mk-portrait2.png" alt="Portrait of Priya Natarajan">
    <div class="mk-speaker-item-body">
      <h3 class="mk-speaker-item-name" id="sp-4">Priya Natarajan</h3>
      <p class="mk-speaker-item-role">CPO, Orbit</p>
      <a class="mk-speaker-item-talk" href="#"><i data-lucide="mic"></i>Research without a research team</a>
    </div>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Square portrait (grayscale, color on hover), name, role, talk link |
| `data-variant="featured"` | A keynote: portrait beside a bio, larger type |
| `data-variant="compact"` | A round portrait, name, role and talk on one row |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| root | `<article aria-labelledby>` | Named by the speaker |
| talk | `<a>` | Links the session by its title |

---

## Notes
- Write role and company as the speaker wants them - ask.
