---
name: Typography
type: ATM
section: primitives
why: Type styling for raw content elements - headings, lists, blockquotes, code.
when: Rendering markdown or CMS output where you cannot add classes.
where: dist/components/typography/typography.css
supportedStates: default
---

# Pattern: Typography

## Native basis
Native HTML text elements: `<h1>` to `<h4>`, `<p>`, `<blockquote>`, `<code>`, `<small>`.
Pure CSS - no JavaScript or ARIA required.

---

## Native Web APIs
- [`<h1>` to `<h6>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements) - semantic heading hierarchy
- [`<blockquote>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote) - quoted block content
- [`<code>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/code) - inline code fragment
- [`<small>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/small) - side comments and small print
- [`text-wrap: balance`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balanced line wrapping for headings
- [`text-wrap: pretty`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - orphan prevention for body text
- [`hanging-punctuation`](https://developer.mozilla.org/en-US/docs/Web/CSS/hanging-punctuation) - optical quote alignment for blockquotes
- [Logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) - `border-inline-start`, `padding-inline-start` for RTL support
- [`break-before`](https://developer.mozilla.org/en-US/docs/Web/CSS/break-before) - forced page, column, left and right page breaks in print (`.typeset-break`)
- [`break-inside`](https://developer.mozilla.org/en-US/docs/Web/CSS/break-inside) / [`break-after`](https://developer.mozilla.org/en-US/docs/Web/CSS/break-after) - keep a block whole (`.typeset-keep`, figures, tables) and a heading with the text after it
- [`orphans`](https://developer.mozilla.org/en-US/docs/Web/CSS/orphans) / [`widows`](https://developer.mozilla.org/en-US/docs/Web/CSS/widows) - the lines a paragraph keeps together at a column or page break
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) - enhanced contrast for high-contrast preference
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - Windows High Contrast Mode with system colors

---

## Structure

### Headings
```html
<h1 class="h1">Taxing Laughter: The Joke Tax Chronicles</h1>
<h2 class="h2">The People of the Kingdom</h2>
<h3 class="h3">The Joke Tax</h3>
<h4 class="h4">People stopped telling jokes</h4>
```

### Paragraph
```html
<p class="p">The king, seeing how much happier his subjects were, realized the error of his ways and repealed the joke tax.</p>
```

### Lead (large intro paragraph)
```html
<p class="lead">A modal dialog that interrupts the user with important content and expects a response.</p>
```

### Large text
```html
<div class="large">Are you absolutely sure?</div>
```

### Small text
```html
<small class="small">Email address</small>
```

### Muted text
```html
<p class="muted">Enter your email address.</p>
```

### Blockquote
```html
<blockquote class="blockquote">
  <p>"After all," he said, "everyone enjoys a good joke, so it's only fair that they should pay for the privilege."</p>
</blockquote>
```

### Inline code
```html
<code class="inline-code">default-semantic-tokens.css</code>
```

`.inline-code` adds the chip. A bare `<code>`, `<kbd>`, `<samp>` or `<pre>` takes
the theme's monospace stack (`--font-mono`) from the base layer, at zero
specificity - a component's own face wins.

### Link
```html
<p class="p">Read the <a class="link" href="installation.html">installation guide</a> first.</p>
```
`.link` is a link in running text: `--primary`, with the line from `--link-text-decoration` (default `underline`) and its gap from `--link-underline-offset` (default `4px`). Both tokens are theme tokens outside the tweakcn export: a theme that leaves them unset gets the same defaults. With `prefers-contrast: more` the underline returns even when a theme removed it; forced colors use `LinkText`.

---

### Chinese, Japanese, Korean

Set `lang` (`zh-Hans`, `zh-Hant`, `ja`, `ko`) on the text or any ancestor - the
same classes switch to CJK rules:

- headings drop the Latin negative tracking; Japanese headings break between
  phrases (`word-break: auto-phrase`)
- `.p` / `.lead` / `.blockquote`: line-height 1.9, strict line breaking (no
  。 or ， at a line start), `text-autospace` (the thin gap between CJK and
  Latin / digits); Chinese and Japanese paragraphs justify between characters
  and keep the right edge straight at a line-end 。 or ，: Safari hangs it
  past the edge (`hanging-punctuation: allow-end`), Chromium trims its blank
  half (`text-spacing-trim`)
- `.blockquote` is upright (no synthetic italics)

```html
<article lang="zh-Hans">
  <h3 class="h3">排版的细节</h3>
  <p class="p">好的中文排版……使用 CSS 与 HTML，<em class="text-emphasis">无需任何脚本</em>。</p>
</article>
```

### Vertical text

```html
<article class="text-vertical" lang="ja">
  <h3 class="h3">縦書きの<ruby>美<rt>うつく</rt></ruby>しさ</h3>
  <p class="p"><span class="text-upright">12</span>月<span class="text-upright">24</span>日……</p>
</article>
```

- `.text-vertical` - `writing-mode: vertical-rl` (top to bottom, columns right
  to left); Latin runs lie sideways. The spacing is logical, so heading rules,
  paragraph gaps and the blockquote rule turn with the text.
- `.text-upright` - `text-combine-upright: all`: a short run (two digits)
  upright in one cell (tate-chu-yoko).
- `.text-emphasis` - emphasis dots instead of italics: sesame over / right of
  the text in Japanese, dots under it in Chinese.
- `<ruby>` / `<rt>` (furigana, pinyin, bopomofo) - `rt` is half size and muted.

### Typesetting (Satz)

Continuous text set like a book or a journal page: one `.typeset` block, plain
`<p>` children, each classic rule an opt-in attribute. Set `lang` - justified
text hyphenates by the language's rules. Each rule works on its own; combine
them as a page needs.

```html
<div class="typeset typeset-numbered" lang="en" data-columns="2" data-rule data-align="justify" data-indent data-lead="smallcaps" data-ligatures="classic">
  <h2 class="h3 typeset-span">Of the Art of Printing</h2>
  <p>The first paragraph opens with its first line in small capitals ...</p>
  <p>Following paragraphs carry no gap; their first line is indented by one em ...</p>
  <figure class="typeset-span">
    <img src="press.jpg" alt="A hand press">
    <figcaption class="typeset-caption">A hand press of the kind used until 1800.</figcaption>
  </figure>
  <div class="separator" aria-hidden="true" data-line="none">⁂</div>
  <p>The text resumes after the pause ...</p>
</div>
```

| Attribute | Rule | Default knob |
|---|---|---|
| `data-columns="2"` / `"3"` | multi-column; no column narrower than `--typeset-column-width`, so a phone gets one column | `--typeset-column-width: 18rem`, `--typeset-column-gap: 2.5em` |
| `data-rule` | a hairline (`--border`) between the columns; in print only without a `.typeset-span` (Chromium draws the rule through a spanner that starts a page) | - |
| `data-align="justify"` | Blocksatz: justified, hyphenated, last line flush start; headings stay flush start and unhyphenated | - |
| `data-indent` | Einzug: no paragraph gap, first line indented; the paragraph after a heading starts flush | `--typeset-indent: 1em` |
| `data-initial="drop"` / `"raised"` | Initiale: the first letter sunk into / rising above the first lines, its top level with the first line | `--typeset-initial-lines: 3`, `--typeset-initial-gap: 0.3em`, `--typeset-initial-font: var(--font-serif)`, `--typeset-initial-color: var(--primary)` |
| `data-lead="smallcaps"` | the opening line in small capitals (Kapitälchen); beside an initial it sets letterspaced capitals, so the line's top stays level with the initial's | - |
| `data-lead="caps"` | the opening line in letterspaced capitals (Versalien) | - |
| `data-ligatures="classic"` | discretionary and historical ligatures, old-style figures - rendered when the font carries the features | - |
| `data-leading="tight"` / `"loose"` | compact (1.45, tracking -0.01em) or airy (1.9, tracking +0.01em) lines - tracking moves with the leading so the column's grey stays even; the default is 1.65 | `--typeset-leading`, `--typeset-tracking` |
| `data-orphans="3"` / `"4"`, `data-widows="3"` / `"4"` | the lines a paragraph keeps together at a column or page break: at the foot of the column (orphans), at the head of the next (widows); the default is 2 | - |

Without columns the block keeps a reading measure (`--typeset-measure: 68ch`).
`.typeset-span` makes a heading, a figure or a group span every column; the columns below it start level (the first block after it keeps no top margin).
Figures, tables, quotes, code, charts, diagrams, groups and Separator breaks keep
`--typeset-gap` (1.5em) from the text above and below them.

#### Captions (Bildunterschriften), numbered

`.typeset-caption` on a `<figcaption>` (a picture, a video, a chart, a table
in a figure) or a table's `<caption>`. Inside `.typeset-numbered` (on the
`.typeset`, a `.paper` or any container) figures and tables count on their
own, in document order: "Figure 1.", "Figure 2.", "Table 1.". The words are
`--typeset-figure-label` / `--typeset-table-label` (`"Abb. "`, `"Tab. "`; `""`
leaves the bare number: "1."). A caption is flush start; `data-align="justify"`
or `"center"` sets it otherwise.

```html
<div class="typeset typeset-numbered" lang="en">
  <figure>
    <video controls src="clip.mp4"></video>
    <figcaption class="typeset-caption" data-align="center">The press in motion.</figcaption>
  </figure>
  <figure>
    <table class="table">...</table>
    <figcaption class="typeset-caption">Paper sizes of the period.</figcaption>
  </figure>
</div>
```

#### Separators

A pause in the text is the [Separator](separator.md)
component - a short rule, a glyph between lines, or a bare glyph
(`data-line="none"`: an asterism ⁂, a dinkus \* \* \*, a fleuron ❦), with
`aria-hidden="true"` when it only decorates. Inside `.typeset` it keeps
`--typeset-gap` from the text like a figure; the typeset block spaces it, the
Separator draws it.

#### Figure groups

`<figure class="typeset-group">` holds two or three figures - charts, pictures,
tables - side by side. Each inner figure's caption is a `.typeset-subcaption`,
lettered "(a)", "(b)"; the group's own `.typeset-caption` numbers the whole.
Every figure spans two subgrid rows (media, caption), so the captions of a row
sit at one height whatever the media's height. `data-align="middle"` centres the
media in their row; `data-divided` draws hairlines between the figures - between the columns and,
once they stack, between the rows; `data-variant="cards"` gives each figure its own
card instead of one box. A narrow page stacks them (`--typeset-group-min: 12rem`
per figure, `--typeset-group-gap: 1.25rem` between).

```html
<figure class="typeset-group typeset-span" data-divided data-align="middle">
  <figure><div class="chart" ...></div><figcaption class="typeset-subcaption">Before.</figcaption></figure>
  <figure><div class="chart" ...></div><figcaption class="typeset-subcaption">After.</figcaption></figure>
  <figcaption class="typeset-caption">Word error rate before and after the fix.</figcaption>
</figure>
```

#### Breaks and keeps (print)

Where a printed page or column ends. A `.typeset-break` marker forces a break
before the next block; `.typeset-keep` keeps a block whole.

```html
<section class="typeset" lang="en" data-columns="2" data-orphans="3" data-widows="3">
  <p>The text of the left column ...</p>
  <div class="typeset-break" data-break="column" aria-hidden="true"></div>
  <p>... the right column starts here.</p>
  <div class="typeset-keep">
    <p>A paragraph that introduces the figure below it ...</p>
    <figure>...</figure>
  </div>
  <figure data-break-inside="allow"><table class="table">...</table></figure>
</section>
<div class="typeset-break" aria-hidden="true"></div>
<section>... starts a new page.</section>
```

| Markup | Effect in print |
|---|---|
| `<div class="typeset-break">` (or `data-break="page"`) | the next block starts a new page |
| `data-break="column"` | the next block starts the next column - inside `data-columns` |
| `data-break="left"` / `"right"` | the next block starts a left / right page (a blank page is added if needed) - duplex |
| `.typeset-keep` | its content stays in one column and on one page (`break-inside: avoid`); inside `.typeset` the wrapper is invisible to the spacing - its paragraphs, figures and headings keep the setting's gaps and Einzug |
| `data-break-inside="allow"` on a figure, table, quote, `<pre>` or group in `.typeset` | it may split - `.typeset` keeps those whole by default; a long table or listing kept whole leaves the rest of the page empty. Every piece keeps its frame (`box-decoration-break: clone`), a listing inside it (`<pre>`, a Code Mockup) does not scroll sideways (a scroll container never splits - wrap its lines), and a figure is a block whose caption stays with the last piece (a caption above: with the first) - on screen columns too |
| `data-orphans` / `data-widows` on `.typeset` | lines kept together at a break (see Typesetting) |

- **Print only.** The breaks apply in `@media print`: a screen has no pages, and
  a column break in a balanced screen column would push the rest of the text
  into the last column. On screen the markers are hidden; put
  `data-show-breaks` on any ancestor to see each one as a labelled dashed line
  while authoring.
- **A box, not `display: none`.** In print a marker is a zero-height block
  that carries `break-before`. An element with `display: none` generates no
  box and its break is lost - do not hide markers that way.
- **Use a `<div>`.** A page break is not a thematic break (`<hr>`), and a
  `<div>` takes none of the gaps that `.typeset` and the paper give an `<hr>`.
- Headings already keep with the text after them (`break-after: avoid`), and
  figures, tables, quotes, code and figure groups stay whole by default.
- **A caption never stands alone.** A figure stays whole, so its caption
  goes with it; one that may split is a block in which the caption keeps to
  the last piece. In a grid figure Chromium ignored that keep and a caption
  stood alone at the head of the next column.
- **Verbatim is never justified.** A `<pre>` in a `data-align="justify"`
  setting is set flush start and unhyphenated: justified, wrapped program
  output opened wide gaps and hyphenated its identifiers.
- **Page numbers** belong to the page template: an `@page` margin box on a
  named page (`@page report { @bottom-center { content: counter(page) } }`,
  `.report { page: report }`), none on `:first`. An unnamed `@page` rule
  would number every page the stylesheet prints. Chromium prints margin
  boxes (checked in Chromium 153); MDN compat data (2026-10) lists them for
  no other engine.
- The HTML Preview Editor's Print device (`mode="print"`) shows the print
  styles on one A4 sheet - without pages: breaks and page numbers show only
  in a real print.
- Support (MDN compat data, 2026-10): page breaks and `break-inside` work in
  Chromium, Firefox and Safari; column breaks only in Chromium (Firefox and
  Safari ignore them and the text flows on); `orphans` / `widows` in Chromium
  and Safari. Forced breaks between the rows of a grid (the paper's article)
  are honoured in Chromium.
- "CSS 4" is not one release: these are the CSS Fragmentation and CSS Paged
  Media modules. Page size and margins belong to the page template - see
  Modern Paper's print profiles.

## Classes

| Class | Element | Description |
|---|---|---|
| `.h1` | `<h1>` or any | 2.25rem extrabold heading, tight tracking, balanced wrapping |
| `.h2` | `<h2>` or any | 1.875rem semibold heading with bottom border |
| `.h3` | `<h3>` or any | 1.5rem semibold heading |
| `.h4` | `<h4>` or any | 1.25rem semibold heading |
| `.p` | `<p>` | Body text, 1.75 line-height, auto-spacing between siblings |
| `.lead` | `<p>` | 1.25rem muted intro paragraph |
| `.large` | `<div>` or any | 1.125rem semibold text |
| `.small` | `<small>` or any | 0.875rem medium text, line-height 1 |
| `.muted` | `<p>` or any | 0.875rem muted-foreground text |
| `.blockquote` | `<blockquote>` | Italic block with inline-start border, hanging punctuation |
| `.inline-code` | `<code>` | Monospace inline code with muted background |
| `.link` | `<a href>` | A link in running text: `--primary`, `--link-text-decoration`, `--link-underline-offset` |
| `.typeset` | `<div>`, `<article>` | Continuous text set like a book: columns, Blocksatz, Einzug, Initiale, small-caps lead, classic ligatures - each a data attribute (see Typesetting) |
| `.typeset-span` | inside `.typeset` | Spans every column (a heading, a figure) |
| `.typeset-numbered` | any container | Numbers `.typeset-caption`s inside it: figures and tables, each in order |
| `.typeset-caption` | `<figcaption>`, `<caption>` | A caption; `data-align="justify\|center"` |
| `.typeset-group` | `<figure>` | Two or three figures in one dense box |
| `.typeset-subcaption` | `<figcaption>` in a group | A lettered sub-caption: (a), (b), (c) |
| `.typeset-break` | `<div>` | A forced break in print: `data-break="page\|column\|left\|right"`; hidden on screen unless an ancestor has `data-show-breaks` |
| `.typeset-keep` | `<div>` | Keeps its content in one column and on one page |

---

## Accessibility

- Use heading levels in order (`h1` → `h2` → `h3`). Do not skip levels.
- Headings create the document outline used by screen readers for navigation.
- `<blockquote>` is announced as a quote by assistive technology - no extra ARIA needed.
- `<code>` is announced as code - no extra ARIA needed.
- `prefers-contrast: more` - removes tight letter-spacing on headings, adds outline to inline code, thickens blockquote border, and promotes muted text to foreground color.
- `forced-colors: active` - blockquote border and inline code adapt to system colors (`CanvasText`, `Canvas`).

---

## Notes

- These are utility classes for prose content - not a component with variants/sizes; `.typeset` takes its typesetting rules as data attributes.
- The `--typeset-*` properties are this component's knobs, not theme tokens: a theme keeps the tweakcn token set, a page or a block tunes its setting (`style="--typeset-indent: 1.5em"`).
- The `.h1` to `.h4` classes allow applying heading styles to non-heading elements when semantic headings aren't appropriate.
- Typography classes compose freely with other components (Card content, Dialog body, Alert description).
- `text-wrap: balance` is used on all headings (h1–h4) for better visual line distribution.
- `text-wrap: pretty` is used on paragraphs and lead text for orphan prevention.
- `hanging-punctuation: first last` is used on blockquotes for optical quote alignment.
- Blockquote uses `border-inline-start` / `padding-inline-start` (logical properties) for automatic RTL support.
- For lists, use the List component (`list.css`) - typography does not ship its own list styles.
- For prose tables, use the Table component (`table.css`) - typography does not ship its own table styles.
