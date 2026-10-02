---
name: Project Details
type: BLK
why: A header, a <dl> of facts, a list of deliverables and a grid of figures - the gallery mixes wide and tall pictures with CSS grid only.
when: The page behind a project-item. A client result story is case-study.
where: dist/components/project-details/project-details.css
supportedStates: default
---

# Pattern: Project Details

## Native basis
An `<article>`: title and summary over a cover picture, a facts `<dl>` (client, year, role, services), the brief, deliverables as a list, a gallery of `<figure>`s and a link to the next project.

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`<figure>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure) - media with its caption
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the layout follows the block width, not the viewport
- [`object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - pictures crop instead of stretching

---

## Structure

```html
<article class="mk-project-details" aria-labelledby="pd-title">
  <header class="mk-project-details-head">
    <h1 class="mk-project-details-title" id="pd-title">Nordlicht Coffee</h1>
    <p class="mk-project-details-summary">A brand for a Hamburg roastery that wanted to feel like the first light of a northern morning - calm, warm and a little bit wild.</p>
  </header>
  <figure class="mk-project-details-cover"><img src="https://picsum.photos/seed/pd-cover/1600/800" alt="Nordlicht Coffee bags on a wooden shelf"></figure>
  <dl class="mk-project-details-facts">
    <div><dt>Client</dt><dd>Nordlicht GmbH</dd></div>
    <div><dt>Year</dt><dd>2026</dd></div>
    <div><dt>Role</dt><dd>Lead studio</dd></div>
    <div><dt>Services</dt><dd>Identity, packaging, web</dd></div>
  </dl>
  <div class="mk-project-details-brief">
    <section aria-labelledby="pd-brief"><h2 id="pd-brief">The brief</h2><p>Nordlicht had outgrown its farmers-market look. They needed packaging that stood out on a supermarket shelf without shouting, and a website that sells subscriptions.</p></section>
    <section aria-labelledby="pd-deliv"><h2 id="pd-deliv">Deliverables</h2>
      <ul class="mk-project-details-deliverables"><li>Logo &amp; wordmark <span>Identity</span></li><li>12 bag designs <span>Packaging</span></li><li>Subscription shop <span>Web</span></li><li>Launch film <span>Motion</span></li></ul>
    </section>
  </div>
  <div class="mk-project-details-gallery">
    <figure data-span="wide"><img src="https://picsum.photos/seed/pd-g1/1200/600" alt=""><figcaption>The shelf test</figcaption></figure>
    <figure data-span="tall"><img src="https://picsum.photos/seed/pd-g2/600/1200" alt=""><figcaption>Bag, front</figcaption></figure>
    <figure><img src="https://picsum.photos/seed/pd-g3/600/600" alt=""></figure>
    <figure><img src="https://picsum.photos/seed/pd-g4/600/600" alt=""></figure>
  </div>
  <a class="mk-project-details-next" href="#" rel="next"><span><small>Next project</small><strong>Atlas Transit app</strong></span><i data-lucide="arrow-right"></i></a>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | Cover, facts row, brief beside deliverables, gallery, next project |
| `data-span="wide"` / `"tall"` | A gallery picture takes two columns / two rows |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| facts | `<dl>` | Label/value pairs |
| gallery | `<figure>` + `<figcaption>` | Captions describe what each picture shows |
| next | `<a rel="next">` | Links the following project |

---

## Notes
- Captions are where the craft is explained - write them.
