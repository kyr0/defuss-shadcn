---
name: About Intro
type: BLK
why: Headings, paragraphs and a definition list for the facts; container queries switch the split - no script.
when: The opening of an about or company page. For one person use team-member; for dated history use timeline-item.
where: dist/components/about-intro/about-intro.css
supportedStates: default
---

# Pattern: About Intro

## Native basis
A heading with an eyebrow and a lead paragraph, two photos in a `<figure>` and the key facts as a `<dl>` (number in `<dd>`, label in `<dt>`). Values are a plain list.

---

## Native Web APIs
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) - media with its caption
- [`text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balanced titles, pretty paragraphs
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching

---

## Structure

```html
<section class="mk-about-intro" aria-labelledby="about-title">
  <div class="mk-about-intro-layout">
    <div class="mk-about-intro-copy">
      <span class="mk-about-intro-eyebrow">About Acme</span>
      <h2 class="mk-about-intro-title" id="about-title">We build calm software for teams that ship</h2>
      <p class="mk-about-intro-lead">Acme started in a Lisbon flat in 2016 with one question: why does work software make people anxious? Ten years later, forty of us answer it every day.</p>
      <dl class="mk-about-intro-facts">
        <div><dt>Founded</dt><dd>2016</dd></div>
        <div><dt>People</dt><dd>40</dd></div>
        <div><dt>Offices</dt><dd>3</dd></div>
        <div><dt>Teams using Acme</dt><dd>12k</dd></div>
      </dl>
    </div>
    <figure class="mk-about-intro-media">
      <img src="https://picsum.photos/seed/about-office/600/800" alt="">
      <img src="https://picsum.photos/seed/about-team/600/800" alt="">
    </figure>
  </div>
</section>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Copy and facts beside two photos (stacked when narrow) |
| `data-variant="statement"` | A centered mission statement in the serif face, signed by a person |
| `.mk-about-intro-values` | The values behind the company, as icon cards |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| title | `<h1>` / `<h2>` | The page or section heading |
| facts | `<dl>` | Each fact is a `<dt>` label and a `<dd>` value - read as pairs |
| photos | `alt=""` | Decorative team photos stay silent; describe them if they carry meaning |

---

## Notes
- Keep the facts to three or four - founded, people, offices, customers.
- The statement variant works best with one or two sentences.
