---
name: Resume Header
type: BLK
section: website
why: A <header> with the name as the page's <h1>, facts as a list and real links - flex-wrap moves the text under the portrait and a container query unit scales the name, no breakpoints, no script.
when: The top of a personal site, a portfolio or a CV. A community member's public profile with counts takes profile-header; a byline under an article takes author-bio.
where: dist/components/resume-header/resume-header.css
supportedStates: default
---

# Pattern: Resume Header

## Native basis
A `<header>`: the portrait (`<img>`), the availability line (an Indicator dot and a sentence), the name as the page's `<h1>`, the role and a summary as paragraphs, the facts as a `<ul>`, the actions as links and buttons, the profiles elsewhere as a labelled `<ul>` of icon links.

Built from: [Button](../../actions/button/component-skill.md), [Indicator](../../data-display/indicator/component-skill.md).

---

## Native Web APIs
- [`<header>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/header) - the introduction of the page
- [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - `cqi` units scale the name and the portrait with the header's width
- [`text-wrap: balance`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - name and role break evenly
- [`download`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#download) - the CV link saves the file
- [`@media print`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media#print) - the actions leave the printed page, the facts stay

---

## Structure

```html
<header class="mk-resume-header">
  <img class="mk-resume-header-photo" src="images/mk-portrait2.png" alt="" />
  <div class="mk-resume-header-body">
    <p class="mk-resume-header-status"><span class="indicator-dot" data-variant="success" data-animate="ping" aria-hidden="true"></span> Available for projects from December</p>
    <h1 class="mk-resume-header-name">Mara Okafor</h1>
    <p class="mk-resume-header-role">Design engineer - design systems, front-end architecture and accessibility</p>
    <p class="mk-resume-header-summary">Eleven years between design and code. I build the systems product teams ship with, and I make them fast, accessible and calm to work in.</p>
    <ul class="mk-resume-header-facts">
      <li><i data-lucide="map-pin"></i> Berlin, Germany - remote across Europe</li>
      <li><i data-lucide="briefcase"></i> 11 years in product teams</li>
      <li><i data-lucide="mail"></i> <a href="mailto:mara@example.com">mara@example.com</a></li>
    </ul>
    <div class="mk-resume-header-actions">
      <a class="btn" href="mailto:mara@example.com"><i data-lucide="send"></i> Get in touch</a>
      <a class="btn" data-variant="outline" href="#" download><i data-lucide="download"></i> Download CV</a>
      <ul class="mk-resume-header-links" aria-label="Profiles">
        <li><a class="btn" data-variant="ghost" data-size="icon" href="https://github.com/" target="_blank" rel="noopener" aria-label="GitHub"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg></a></li>
        <li><a class="btn" data-variant="ghost" data-size="icon" href="https://www.linkedin.com/" target="_blank" rel="noopener" aria-label="LinkedIn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5 3.5A2.5 2.5 0 1 1 5 8.5 2.5 2.5 0 0 1 5 3.5ZM3 10h4v11H3V10Zm7 0h3.8v1.6h.1c.5-1 1.8-1.9 3.6-1.9 3.9 0 4.5 2.5 4.5 5.8V21h-4v-4.9c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v5h-4V10Z" /></svg></a></li>
        <li><a class="btn" data-variant="ghost" data-size="icon" href="#" aria-label="Website"><i data-lucide="globe"></i></a></li>
      </ul>
    </div>
  </div>
</header>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | The portrait beside the text; the text wraps under it when the header is narrow |
| `data-variant="centered"` | The portrait above, round; everything centered on one axis |
| `data-variant="compact"` | The head of a CV: a small portrait, a smaller name, a rule below |
| `data-variant="poster"` | The name as the picture: huge, uppercase, tight; the role a tilted label in the primary colour; the portrait tilted beside it |
| `data-variant="split"` | The text and a tall portrait (4:5) side by side, the portrait filling its column; both stack when narrow |
| shape utilities on `.mk-resume-header-photo` | `theme/utils/shapes.css` reshapes the portrait - `corner-blob`, `corner-arch`, `shape-flower`, `shape-hexagon`, `frame-polaroid`, `shadow-sticker` - the utilities layer wins over the block's radius |
| `.mk-resume-header-status` | The availability line - an [Indicator](../../data-display/indicator/component-skill.md) dot (`success`, `warning`, `neutral`) and a sentence |
| `.mk-resume-header-links` | The profiles elsewhere - icon [Buttons](../../actions/button/component-skill.md) in a labelled list |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| name | `<h1>` | The page's one top heading - in a page that has its own `<h1>`, use `<h2>` |
| portrait | `alt=""` | The name stands beside it; describe the picture only when it shows more than the person |
| status dot | `aria-hidden="true"` | The sentence says the status - the colour only repeats it |
| profiles | `<ul aria-label="Profiles">` | Each icon link names its site with `aria-label` |
| CV link | `download` | Say the format in the label when it is not obvious ("Download CV (PDF)") |

---

## Notes
- The actions leave the printed page (`@media print`): put the contact details a reader of the paper needs into the facts.
- An entrance makes it a hero: `data-df-entrance` ([Motion](../../guides/motion/component-skill.md)) on the name, the portrait or the whole header.
- Pair it with [Availability](../availability/component-skill.md) when the terms of an engagement need more than a sentence.
