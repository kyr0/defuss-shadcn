---
name: Modern Paper
type: TPL
section: papers
why: A research-paper project page as one <article> on a named grid - a centered reading column, a wider track for the title block and figures, all type and color from the theme tokens; CSS-only.
when: The web page of a paper, a technical report or a project write-up - title, authors, resources, abstract, sections, figures, results and the citation. A product landing page is the Landing Page template; long documentation is Docs Content.
where: dist/components/paper/paper.css
supportedStates: default
---

# Pattern: Modern Paper

## Native basis
One `<article class="paper">` laid out on a named grid: prose sits in a
centered reading column (`--paper-measure`, 46rem), the title block, the
teaser figure and anything marked `.paper-wide` use the wider track
(`--paper-wide`, 64rem), the footer spans the page. Sections are
`<section>` + `<h2>`, figures are `<figure>` + `<figcaption>`, the citation
is a `<pre>`. The layout follows the Nerfies / InternVL project pages; the
type is the theme's - the title and section headings in `--font-serif`,
prose in `--font-sans`, labels and the BibTeX in `--font-mono`.

Built from: [Badge](badge.md), [BibTeX](bibtex.md), [Button](button.md), [Chart](chart.md), [Illustrative Diagrams](diagram.md), [Statistic](statistic.md), [Table](table.md).

---

## Native Web APIs
- [`Named grid lines`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Grid_layout_using_named_grid_lines) - the reading column (`content`), the wide track (`wide`) and the page (`full`)
- [`Container queries`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - the title size and the abstract follow the page width, not the viewport
- [`CSS counters`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_counter_styles/Using_CSS_counters) - findings number themselves ("Finding 1")
- [`text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balanced titles and captions, pretty prose
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) · [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

---

## Structure

```html
<article class="paper" aria-labelledby="paper-title">
  <header class="paper-hero">
    <p class="paper-venue"><span class="badge" data-variant="secondary">Technical Report</span><span>defuss · <time datetime="2026-10">October 2026</time></span></p>
    <h1 class="paper-title" id="paper-title">Title<span class="paper-title-sub">A one-line subtitle</span></h1>
    <ul class="paper-authors">
      <li><a href="https://example.org/~ada">Ada Author</a><sup>1</sup></li>
      <li><a href="https://example.org/~bo">Bo Author</a><sup>1,2</sup></li>
    </ul>
    <ul class="paper-affiliations">
      <li><sup>1</sup>First Lab</li>
      <li><sup>2</sup>Second University</li>
    </ul>
    <p class="paper-note">* equal contribution</p>
    <nav class="paper-links" aria-label="Resources">
      <a class="btn" data-size="sm" href="#"><i data-lucide="file-text"></i> Paper</a>
      <a class="btn" data-size="sm" data-variant="outline" href="#"><i data-lucide="code"></i> Code</a>
    </nav>
  </header>

  <p class="paper-news" role="note"><span class="badge" data-size="sm">New</span><span>What changed since the first version.</span></p>

  <figure class="paper-teaser">
    <img src="teaser.png" alt="…" />
    <figcaption><b>Figure 1.</b> The caption.</figcaption>
  </figure>

  <section class="paper-abstract" aria-labelledby="abstract">
    <h2 id="abstract">Abstract</h2>
    <p>…</p>
  </section>

  <section class="paper-section" aria-labelledby="s1">
    <h2 id="s1"><span class="paper-num">1</span>Introduction</h2>
    <p>…</p>
    <h3>1.1 A subsection</h3>
    <ul class="paper-findings">
      <li><strong>A finding.</strong> One sentence.</li>
    </ul>
    <div class="paper-numbers">
      <div class="statistic"><p class="statistic-title">Metric</p><p class="statistic-value">42</p><p class="statistic-description">context</p></div>
    </div>
    <figure class="paper-figure">…<figcaption><b>Figure 2.</b> …</figcaption></figure>
    <figure class="paper-table paper-wide">
      <table class="table">…<td data-num>12.3</td>…</table>
      <figcaption class="paper-table-caption"><b>Table 1.</b> …</figcaption>
    </figure>
  </section>

  <section class="paper-bibtex" aria-labelledby="bibtex">
    <h2 id="bibtex">BibTeX</h2>
    <figure class="bibtex" data-formats="bibtex apa ieee" aria-label="Cite this paper">
      <pre><code class="bibtex-source">@article{…}</code></pre>
    </figure>
  </section>

  <footer class="paper-footer"><p>Acknowledgements, license, template credit.</p></footer>
</article>
```

---

## Parts

| Class | Element | Role |
|-------|---------|------|
| `.paper` | `<article>` | The page: named grid, theme background and type |
| `.paper-hero` | `<header>` | Title block on the wide track, centered |
| `.paper-venue` | `<p>` | Venue Badge + date, mono |
| `.paper-title` / `.paper-title-sub` | `<h1>` / `<span>` | Serif title, a muted subtitle line |
| `.paper-authors` / `.paper-affiliations` | `<ul>` | Linked names with `<sup>` marks; the marked affiliations |
| `.paper-note` | `<p>` | "* equal contribution", corresponding author |
| `.paper-links` | `<nav>` | Pill Buttons to the paper, code, data, demo |
| `.paper-news` | `<p role="note">` | A Badge and one line of news |
| `.paper-teaser` / `.paper-figure` | `<figure>` | An image, video, SVG or Illustrative Diagram + caption (teaser: wide track) |
| `.paper-abstract` | `<section>` | The abstract on a tinted panel with an accent rule, justified |
| `.paper-toc` | `<nav>` | The table of contents - an `<h2>` and a nested `<ol>` of section links (`.paper-num` + title) in two columns |
| `.paper-section` | `<section>` | `<h2>` with a `.paper-num`, prose, `<h3>` subsections, lists |
| `.paper-findings` | `<ul>` | Numbered finding cards |
| `.paper-numbers` | `<div>` | Statistic tiles |
| `.paper-tag[data-tag]` | `<span>` | An epistemic tag (VAE-DIALECT) as a solid chip: `verified` (`--chart-2`), `hypothesis` (`--chart-1`), `unknown` (`--chart-5`); the text contrasts with the fill |
| `.paper-code` | `<pre>` | A code or record block in the reading column |
| `.paper-quote` | `<blockquote>` | A quotation - serif, italic, a rule at the start; several `<p>` and a `<footer>` attribution for a longer one (a position statement) |
| `.paper-chart` | a [Chart](chart.md) | Inside a `.paper-figure`: 20rem tall, full width |
| `.paper-table` | `<figure>` | A Table + `.paper-table-caption`; `data-num` right-aligns a cell, `data-best` on a row bolds it |
| `.paper-wide` | any child | Use the wide track |
| `.paper-bibtex` | `<section>` | The citation - a [BibTeX](bibtex.md) block (format tabs, copy), or a plain mono `<pre>` |
| `.paper-footer` | `<footer>` | Full width, muted, centered |

Custom properties: `--paper-measure` (46rem), `--paper-wide` (64rem), `--paper-gap` (2.5rem).

---

## Variants

| `data-variant` | House style |
|---|---|
| (none) | Modern project page: centered title block, serif headings over sans body, ruled section heads, a tinted abstract with an accent edge |
| `classic` | Printed journal: serif throughout, a narrower justified column (`--paper-measure: 40rem`), centered small-caps section heads without rules, a plain abstract set in from both sides |
| `minimal` | Lab note: title block flush start, a sans title, the abstract under a hairline instead of a tint, no rules under the section heads |

Two columns are a composition, not a variant: put the body in a Typography
`<div class="typeset paper-wide" data-columns="2" data-align="justify" lang="en">`
(headings `.h3 typeset-span`, figures `.typeset-span`). Below two columns of
`--typeset-column-width` it sets one column on its own - the phone case.

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| `.paper` | `aria-labelledby` the title | The article is named by its title |
| each section | `aria-labelledby` its `<h2>` | A landmark-free outline - headings carry it |
| `.paper-links` | `aria-label="Resources"` | A named navigation group |
| `.paper-news` | `role="note"` | Supplementary, not an alert |
| figures | `<figcaption>` | Captions name the figure; images need `alt` |

---

## Notes
- **One article, any length**: add sections; everything new goes into the
  reading column unless it is marked `.paper-wide`.
- **Numbers that are claims** belong in measured, checkable elements - the
  docs example writes every figure from `dist/stats.json` (`data-stat`).
- A teaser can be an [Illustrative Diagram](diagram.md)
  that plays itself (`data-autoplay`) - the docs example does that.
- The layout follows the Nerfies project-page template (CC BY-SA 4.0) as
  used by InternVL; credit it in the footer when you use it for a paper page.
