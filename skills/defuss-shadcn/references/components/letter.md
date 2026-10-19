---
name: Letter
type: TPL
section: documents
why: One <article> printed by the browser itself - @page profiles, a first page measured from the top edge (no top margin), the page counter in a margin box - so a business letter lays out by DIN 5008 (form A or B, window envelope, fold marks) or as a US letter without a word processor or a PDF library.
when: Business letters, notices, cover letters and anything that goes into a window envelope - and the frame of an invoice (an Invoice is a letter whose body is .invoice). A research document is a Paper; a message in an app is a Card or a Toast.
where: dist/components/letter/letter.css
supportedStates: default
---

# Pattern: Letter

## Native basis

One `<article class="letter">`: a `<header class="letter-head">` with the letterhead
(`.letter-brand`), the address field (`.letter-address`: the return line `.letter-return`
above the recipient's `<address class="letter-recipient">`) and the information block
(`<dl class="letter-info">`), then the subject (`<h1 class="letter-subject">`), the text
(`.letter-body`: salutation, paragraphs, closing, `.letter-signature`), the enclosures
(`.letter-enclosures`) and the company footer (`<footer class="letter-footer">`). On screen
the article is a sheet at paper scale; in print the page is the sheet: CSS Paged Media
(`@page letter` / `letter-us`) gives the size, the margins and the page counter, and page 1
has no top margin, so the head sits at its measured distances from the top edge.

---

## Native Web APIs
- [`@page`](https://developer.mozilla.org/en-US/docs/Web/CSS/@page) - the A4 and US Letter profiles, page 1 without a top margin (`:first`), page margin boxes for "page n of m" and the fold marks
- [`page`](https://developer.mozilla.org/en-US/docs/Web/CSS/page) - the letter prints on its named page
- [`counter(page)` / `counter(pages)`](https://developer.mozilla.org/en-US/docs/Web/CSS/@page#page-margin_boxes) - "Seite 2 von 3" / "Page 2 of 3"
- [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - from 174mm of text width the head takes the DIN geometry, below it the parts stack
- [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio) - the screen sheet is at least A4 (US Letter) tall and grows with the text
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) + [`:lang()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:lang) - the page labels follow the letter's language, the marks its form (set on the root, which the page inherits from)
- [`break-before` / `break-after` / `break-inside`](https://developer.mozilla.org/en-US/docs/Web/CSS/break-before) - the subject stays with the text, the signature with the last lines
- [`print-color-adjust`](https://developer.mozilla.org/en-US/docs/Web/CSS/print-color-adjust) - black on white in print, whatever the screen theme
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

```html
<article class="letter" data-form="b" lang="de" aria-label="Brief an Erika Mustermann">
  <header class="letter-head">
    <div class="letter-brand">
      <div><strong>Beispiel GmbH</strong>Software und Beratung</div>
      <address>Musterstraße 12 · 10115 Berlin<br />030 1234567 · info@beispiel.de</address>
    </div>
    <div class="letter-address">
      <p class="letter-return">Beispiel GmbH · Musterstraße 12 · 10115 Berlin</p>
      <address class="letter-recipient">Frau<br />Erika Mustermann<br />Musterweg 1<br />20095 Hamburg</address>
    </div>
    <dl class="letter-info">
      <div><dt>Ihr Zeichen</dt><dd>EM-17</dd></div>
      <div><dt>Unser Zeichen</dt><dd>AH</dd></div>
      <div><dt>Datum</dt><dd><time datetime="2026-10-12">12. Oktober 2026</time></dd></div>
    </dl>
  </header>
  <h1 class="letter-subject">Ihre Anfrage vom 5. Oktober 2026</h1>
  <div class="letter-body">
    <p>Sehr geehrte Frau Mustermann,</p>
    <p>vielen Dank für Ihre Anfrage ...</p>
    <p class="letter-signature">Mit freundlichen Grüßen<span>Aron Homberg</span></p>
  </div>
  <p class="letter-enclosures"><span>Anlage</span><br />Angebot 2026-031</p>
  <footer class="letter-footer">
    <span>Beispiel GmbH · Sitz Berlin</span>
    <span>Registergericht Musterstadt HRB 12345</span>
    <span>Geschäftsführer: Max Muster</span>
  </footer>
</article>
```

- The head's three parts are optional; the subject, the body and the footer too.
- The last child of `.letter-signature` (the typed name) gets room above it for the handwritten signature.
- An Invoice puts its `.invoice` in `.letter-body` (see the Invoice skill).

---

## Variants

| Attribute | Values | Effect |
| --- | --- | --- |
| `data-form` | `b` (default), `a`, `us` | DIN 5008 form B (letterhead 45mm, address field from 45mm, fold marks at 105 / 210mm), form A (18mm higher: 27mm, 87 / 192mm), or a US business letter (US Letter, 1in margins, block format, the date before the inside address, no fold marks) |
| `data-marks` | `none` | no fold and hole marks (screen and print) |
| `lang` | any | the page label in print: `de` prints "Seite 2 von 3", every other language "Page 2 of 3" |

## Sizes

The sheet is set at paper scale: 210mm wide (8.5in for `us`), text in points (11pt body,
9pt information block and letterhead, 7pt return line). Below 174mm of text width the head
stacks in reading order instead of the DIN geometry.

---

## ARIA

| Element | Attribute | Notes |
| --- | --- | --- |
| `.letter` | `aria-label` | names the letter among other content (`<article>` is a landmark-like region) |
| `.letter-subject` | `<h1>` | the letter's heading; in a page with its own `<h1>`, use an `<h2>` with the same class |
| `.letter-info` | `<dl>` | label / value pairs, each in a `<div>` |
| `.letter-recipient` | `<address>` | contact information of the recipient |

---

## Notes

- **Print** - the letter prints on its own named page (`page: letter`, `letter-us`): page 1 without a top margin, the head measured from the top edge, "page n of m" from page 2 in the top right, the fold and hole marks in page 1's left margin. VERIFIED: (letter.e2e, Chromium 153 PDF) the address text prints at 25mm from the left edge and 50mm (form B) / 32mm (form A) from the top, "Seite 2 von 2" on page 2 only, at an unshrunk scale.
- **Margins** - the right page margin is 10mm, because the information block reaches 200mm; the text keeps 20mm with its own margin. Anything wider than the page area would make Chromium shrink the whole letter to fit.
- **One letter per document in print** - the page labels and the marks are set on the root (`:root:has(.letter:lang(de))`), because a page inherits from the root element, not from the letter. Two letters in different languages or forms print with the first match.
- **Footer** - `.letter-footer` prints after the text, on the last page. A footer on every page from the letter's own markup needs running elements (`position: running()` + `content: element()`). VERIFIED: (probe 2026-10-12, Chromium 153) `CSS.supports('position', 'running(foot)')` is false and the element prints once, in the flow.
- **Colors** - on screen the sheet follows the theme (`--card`); in print it is black on white.
- **Measurements** - letterhead heights and form A's 18mm shift are from an official template description (BayAGO Anlage 2); the other figures from secondary DIN 5008 summaries that agree with that shift. Check them against DIN 5008:2020 before relying on them for a window envelope.
