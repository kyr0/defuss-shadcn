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
- [`@page`](https://developer.mozilla.org/en-US/docs/Web/CSS/@page) + [`page`](https://developer.mozilla.org/en-US/docs/Web/CSS/page) - named pages: the print profiles' sheet size and margins, only where a paper names them
- [`:left`](https://developer.mozilla.org/en-US/docs/Web/CSS/:left) / [`:right`](https://developer.mozilla.org/en-US/docs/Web/CSS/:right) - mirrored margins for a bound duplex print
- [`zoom`](https://developer.mozilla.org/en-US/docs/Web/CSS/zoom) - the print scale
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
    <h2 id="s1"><span class="paper-num">1&nbsp;</span>Introduction</h2>
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
| `.paper-equation` / `.paper-equation-num` | `<div>` / `<span>` | A numbered display equation: a [Formula Rendering](math-renderer.md) element centered in the column, its number - `(1)` - at the end edge; the text refers to it by that number. Printed, it stays whole |
| `.paper-table` | `<figure>` | A Table + `.paper-table-caption`; `data-num` right-aligns a cell, `data-best` on a row bolds it |
| `.paper-wide` | any child | Use the wide track |
| `.paper-bibtex` | `<section>` | The citation - a [BibTeX](bibtex.md) block (format tabs, copy), or a plain mono `<pre>` |
| `.paper-footer` | `<footer>` | Full width, muted, centered |

Custom properties: `--paper-measure` (46rem), `--paper-wide` (64rem), `--paper-gap` (2.5rem), `--paper-print-scale` (0.8, see Print).

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

## Print

`data-print` on the `.paper` picks a print profile: the sheet, its margins
and a print scale. Without it the browser's print defaults apply.

```html
<article class="paper" data-print="a4" data-binding="inner" aria-labelledby="paper-title">
  <header class="paper-hero">...</header>
  <section class="paper-abstract" aria-labelledby="paper-abstract">...</section>
  <nav class="paper-toc" aria-labelledby="paper-toc">...</nav>
  <div class="typeset-break" aria-hidden="true"></div>
  <section class="paper-section typeset paper-wide" aria-labelledby="paper-s1">...</section>
  <section class="paper-section typeset paper-wide" aria-labelledby="paper-s2">
    ...
    <figure class="paper-figure" data-break-inside="allow">
      <pre class="paper-code"><code>a long verbatim record [...]</code></pre>
      <figcaption><b>Figure 7.</b> ...</figcaption>
    </figure>
  </section>
  ...
</article>
```

| Attribute | Print |
|---|---|
| `data-print="a4"` | DIN A4, 20mm margins (named page `paper-a4`) |
| `data-print="letter"` | US Letter, 1in margins (`paper-letter`) |
| `data-binding="inner"` (with `data-print`) | mirrored margins for a bound duplex print: the inner margin is 10mm (0.5in) wider than the outer one - left on a right page, right on a left page - with the same text width |
| `--paper-print-scale` | the print scale, 0.8 by default: the 16px body prints at 9.6pt, and two columns of `--typeset-column-width` fit the 170mm text width of A4; at 1 the two-column sections print in one column |

- Breaks and keeps are Typography's: a `.typeset-break` before a section
  starts it on a new page, `data-break="column"` inside a two-column section
  starts the next column; figures and tables stay whole unless they carry
  `data-break-inside="allow"`. See
  [Typography](typography.md), "Breaks and
  keeps (print)".
- Where to break: before the first section (the title block and the
  abstract share the first page) and before the references; the other
  sections run on. Then print the paper, look at every page and add a break
  where a heading fell to the foot of a page - Chromium does not keep a
  heading that spans the columns with the text below it. A break before
  every section left most pages half empty. The print profile keeps the
  rest: the paper's own headings with the next block, the teaser with its
  caption, the key numbers in one piece, the end ornament and the footer
  with what precedes them. The breaks depend on the text: change it, print
  again.
- A caption never breaks alone to the next column or page - on screen,
  where the two columns balance, as in print. Every figure prints whole. A
  long record may split over two columns or pages
  (`data-break-inside="allow"` on its `figure`): each piece keeps its
  frame, the record wraps instead of scrolling (a box that scrolls sideways
  never splits), and the figure is a block, so its caption stays with the
  last piece (in a grid figure Chromium ignored that keep). Shorten a long
  verbatim record with `[...]` and say so in its caption; give every record
  a numbered caption.
- Every page but the first carries its number at the foot, centered in the
  bottom margin (an `@page` margin box of the profile's named page).
- The table of contents stays on screen: its links do nothing on paper, and
  a printed line could not point to a page - Chromium has no
  `target-counter()`.
- Its parts print as paper can show them: a [BibTeX](bibtex.md)
  block without its tabs and copy button (the format it is set to), a
  [Diff](diff.md) with both sides in full,
  a [Code Mockup](mockup-code.md) with its lines
  wrapped. The HTML Preview Editor's Print device shows these print styles
  on one A4 sheet - without pages, so the breaks and page numbers show only
  in a real print.
- In print a profiled paper is a block, not a grid: a page has one text
  width, every part fills it, and the grid gap becomes margins. A grid would
  lose text - Chromium set the end of a two-column section that runs over
  several pages as a one-line row of columns, clipped at the page edge.
- Its colors print as designed (`print-color-adjust: exact`): a print
  dialog drops background graphics by default, and text set for a fill (a
  chat bubble, a code window, an epistemic tag, a filled button) printed pale
  on white paper.
- The profiles are named pages: they apply only where a paper names them, so
  loading `all.css` never changes the print dialog of another page. The page
  names carry the `paper-` prefix because `@page` names are global, like
  keyframe names.
- End a heading's or a contents line's number with a no-break space:
  `<span class="paper-num">1&nbsp;</span>Introduction`. A PDF's bookmarks
  (`page.pdf({ outline: true })`) take each heading's laid-out text, and a
  space after the number's flex item is dropped there ("1Introduction"); the
  span's `word-spacing: -1ch` takes the no-break space's width back, so the
  screen shows the same gap. A number without it still reads as before.
- A headless print takes the CSS page size only when asked to (Playwright
  `page.pdf({ preferCSSPageSize: true })`, Chrome DevTools Protocol
  `preferCSSPageSize`); without it, Chromium prints on Letter.
- Support (MDN compat data, 2026-10): `@page` with a `size` and the `page`
  property in Chromium, Firefox and Safari 18.2+; `:left` / `:right` margins
  in Chromium and Safari - Firefox prints both sides with the same margins.
- Not covered: running heads, footnotes, and page numbers outside Chromium
  (`@page` margin boxes are Chromium-only in MDN compat data, 2026-10;
  checked in Chromium 153). A dark theme prints as it shows - print from the
  light theme.

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
