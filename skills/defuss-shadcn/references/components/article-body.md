---
name: Article Body
type: BLK
why: Styles the plain elements a CMS or Markdown renderer emits - no classes inside - at one readable measure; hanging-punctuation, text-wrap: pretty and ::first-letter do the typography.
when: The running text of an article, post or docs page. Short UI copy takes typography; a single quote block takes blockquote.
where: dist/components/article-body/article-body.css
supportedStates: default
---

# Pattern: Article Body

## Native basis
One wrapper around plain HTML - the elements a CMS or Markdown renderer emits, no classes needed inside: headings, paragraphs, links, lists, `<blockquote>`, code, tables, `<figure>`, `<video>` and `<iframe>` embeds, at a 42rem measure.

Built from: [Code Mockup](mockup-code.md), [Alert](alert.md), [Table](table.md), [Image](image.md), [Kbd](kbd.md), [Heading Anchor](heading-anchor.md), [TOC](toc.md), [Badge](badge.md).

---

## Native Web APIs
- [`hanging-punctuation`](https://developer.mozilla.org/en-US/docs/Web/CSS/hanging-punctuation) - quotes hang in the margin
- [`text-wrap: pretty`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - no orphans
- [`::first-letter`](https://developer.mozilla.org/en-US/docs/Web/CSS/::first-letter) - the drop cap
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - 16:9 embeds
- [`scroll-margin`](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-margin) - anchored headings clear a sticky header
- [`animation-timeline: scroll()`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline/scroll) - the reading-progress bar

---

## Structure

```html
<div class="mk-article-body">
  <p class="mk-article-body-lead">Sync is the feature nobody notices until it fails. For Acme 4.0 we set one rule: <strong>never lose a keystroke</strong> - online, offline, or somewhere in between.</p>
  <h2 id="why-crdts"><a class="heading-anchor" href="#why-crdts" aria-label="Link to section: Why CRDTs">§</a>Why CRDTs</h2>
  <p>A <abbr title="conflict-free replicated data type">CRDT</abbr> lets two devices edit the same document without a server deciding who wins.<span class="mk-article-body-ref"><a href="#fn-1" id="ref-1" aria-label="Footnote 1">1</a></span> Every change is an operation; every operation <a href="#">commutes</a>. We <del>resolve conflicts</del> <ins>never create them</ins>.</p>
  <blockquote class="mk-article-body-pullquote">The best sync is the one you forget is there.</blockquote>
  <h2 id="the-log"><a class="heading-anchor" href="#the-log" aria-label="Link to section: The log">§</a>The write-ahead log</h2>
  <p>Every operation lands in a local log before it touches the document. Press <kbd class="kbd">⌘</kbd> <kbd class="kbd">S</kbd>? You never have to. The flush is three lines:</p>
  <div class="mockup-code" data-title="sync/flush.ts" data-numbers>
    <pre><code>const ops = log.since(cursor);</code></pre>
    <pre data-diff="remove"><code>await server.push(ops);</code></pre>
    <pre data-diff="add"><code>await server.push(ops, { idempotent: true });</code></pre>
    <pre><code>cursor = ops.at(-1).id;</code></pre>
  </div>
  <div class="alert" role="note">
    <svg class="alert-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
    <div class="alert-content">
      <h5 class="alert-title">Offline for a month?</h5>
      <p class="alert-description">Edits older than 30 days merge as a branch - never silently.</p>
    </div>
  </div>
  <div class="table-container">
    <table class="table">
      <thead><tr class="table-row"><th class="table-head">Scenario</th><th class="table-head">Before</th><th class="table-head">4.0</th></tr></thead>
      <tbody>
        <tr class="table-row"><td class="table-cell">Edit offline, reconnect</td><td class="table-cell">Last write wins</td><td class="table-cell"><span class="badge" data-variant="secondary">Merged</span></td></tr>
        <tr class="table-row"><td class="table-cell">Two people, one paragraph</td><td class="table-cell">Conflict dialog</td><td class="table-cell"><span class="badge" data-variant="secondary">Merged</span></td></tr>
      </tbody>
    </table>
  </div>
  <figure class="image" data-ratio="16/9">
    <img src="images/mk-wide2.png" alt="Two laptops editing the same document">
    <figcaption class="image-caption">Two replicas, one document - merged without a server round trip.</figcaption>
  </figure>
  <h3>Glossary</h3>
  <dl>
    <dt>Replica</dt><dd>One device's copy of the document.</dd>
    <dt>Operation</dt><dd>One change - an insert, a delete, a format.</dd>
    <dt>Cursor</dt><dd>The last operation the server has acknowledged.</dd>
  </dl>
  <aside class="mk-article-body-footnotes" aria-label="Footnotes">
    <ol>
      <li id="fn-1">Shapiro et al., "Conflict-free replicated data types", 2011. <a href="#ref-1" aria-label="Back to the text">↩</a></li>
    </ol>
  </aside>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| *(omitted)* | Sans text at 17px / 1.75, a 42rem measure |
| `data-variant="serif"` | Serif running text (headings stay sans) - an editorial voice |
| `data-size="sm"` / `"lg"` | 15px for dense docs / 19px with a 46rem measure |
| `data-dropcap` | A drop cap opens the first paragraph |
| `.mk-article-body-lead` | The opening paragraph, larger and muted |
| `.mk-article-body-pullquote` | A pull quote between rules, serif |
| `.mk-article-body-ref` / `-footnotes` | Numbered refs that jump to the notes (`:target` highlights the note) and back |
| `.mk-article-body-layout` | The text beside a sticky TOC component (from 56rem) |
| `.mk-article-body-progress` | A reading-progress bar - `animation-timeline: scroll()`, hidden where unsupported and under reduced motion |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| headings | `<h2>`...`<h4>` | Keep the outline - the article header owns the h1 |
| figures | `<figure>` + `<figcaption>` | Images with captions; `alt` on the image |
| embeds | `<iframe title>` | Every iframe needs a title |
| tables | `<th scope>` | Header cells |

---

## Notes
- Tables scroll sideways on their own when wider than the measure.
- Gate third-party embeds (YouTube, maps) behind Cookie Consent.
- Library components keep their own look inside the text - the prose rules only reach class-less elements (`a:not([class])`, `> pre`, `> table`, `figure:not([class])`): use Code Mockup for code, Table for data, Alert for callouts, Image for figures, Kbd for keys, Heading Anchor for § links.
