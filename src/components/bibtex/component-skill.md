---
name: BibTeX
type: ATM
why: The authored BibTeX stays the one source - parsed once, shown as BibTeX (normalized, aligned, highlighted) or as an APA, MLA, Chicago, Harvard or IEEE reference, copied with the Clipboard API exactly as shown; without JS the source is still readable.
when: Wherever a reader should cite something - a paper page, a dataset, a release, a references section (several entries become a list). A terminal transcript is mockup-code; source code is a code block.
where: dist/components/bibtex/bibtex.css + dist/components/bibtex/bibtex.js
supportedStates: default, copied
---

# Pattern: BibTeX

## Native basis

A `<figure class="bibtex">` (a `<span>` for the inline variant) around the
authored source in `<code class="bibtex-source">` - inside a `<pre>` for a
block. The runtime parses the entries and adds two parts: the bar (format
tabs as an APG tablist + a copy `<button>` + a `role="status"` region) and
the view (the BibTeX in a `<pre>`, one reference in a `<p>`, several in an
`<ol>`). An optional `<figcaption>` stays on top.

---

## Native Web APIs
- [`Clipboard API`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) - the copy; when the clipboard refuses, the view is selected for a manual copy ([`Selection.selectAllChildren()`](https://developer.mozilla.org/en-US/docs/Web/API/Selection/selectAllChildren))
- [`String.prototype.normalize()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize) - LaTeX accents (`{\"o}`, `\c{c}`) become real characters
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `bibtex-format` and `bibtex-copy`
- [WAI-ARIA Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) - the format tabs (← / → / Home / End, automatic activation)
- [`text-indent`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-indent) - the hanging indent of reference lists
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

```html
<figure class="bibtex" data-formats="bibtex apa mla chicago harvard ieee" aria-label="Cite this report">
  <figcaption>Cite this report</figcaption>
  <pre><code class="bibtex-source">@techreport{homberg2026vae,
  title = {Verified Agentic Engineering},
  author = {Homberg, Aron},
  institution = {defuss},
  year = {2026}
}</code></pre>
</figure>

<!-- inside running text -->
<p>As <span class="bibtex" data-variant="inline" data-formats="mla"><code class="bibtex-source">@article{…}</code></span> showed, …</p>
```

The source may hold several entries (a reference list). `@comment`,
`@preamble` and `@string` are skipped; values in braces, quotes, bare
numbers and `#` concatenation are read; names as `Last, First`,
`First von Last` or a braced `{Organization}`.

---

## Formats

| `data-format` | Shows |
|---------------|-------|
| `bibtex` | The entries normalized - one field per line, `=` aligned, highlighted |
| `apa` | APA 7 - `Last, F. M., & Last, F. (Year). Title. Journal, Vol(No), pages. DOI` |
| `mla` | MLA 9 - `Last, First, and First Last. "Title." Journal, vol. V, no. N, Year, pp. P.` |
| `chicago` | Chicago author-date - `Last, First. Year. "Title." Journal V (N): P.` |
| `harvard` | Harvard - `Last, F. and Last, F. (Year) 'Title', Journal, V(N), pp. P.` |
| `ieee` | IEEE - `[1] F. Last, "Title," Journal, vol. V, no. N, pp. P, Year.` |

Several entries: IEEE keeps the source order and numbers them; the others
sort by first author and year. Journal, book and proceedings titles are
italic.

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| (none) | A window: the bar with the format tabs and the copy button, the view below |
| `data-variant="minimal"` | No bar - the copy button floats in the corner on hover / focus (always on touch) |
| `data-variant="inline"` | On a `<span>` in running text: the reference flows with the sentence, a copy icon follows it |
| `data-formats="apa ieee"` | The tabs offered, in that order (one format: no tabs) |
| `data-format="ieee"` | The format shown first |
| `data-align="none"` | BibTeX fields unaligned |
| `data-highlight="none"` | BibTeX without colors |
| `data-copy="none"` | No copy button |

---

## Sizes

| `data-size` | Effect |
|-------------|--------|
| (default) | 0.8125rem code, 0.9375rem references |
| `sm` | 0.75rem code, 0.8125rem references, tighter padding |

---

## States

| State | Meaning |
|-------|---------|
| `default` | The source in the format of `config.format` (`data-format` on the block) |
| `copied` | The copy feedback - the button says Copied (`data-copied`), the status announces it; back to `default` after two seconds |

```js
const cite = document.querySelector('#cite');
cite.api.setState('default', { format: 'apa' });   // show APA
cite.api.setState('copied');                        // the copy feedback
cite.addEventListener('bibtex-copy', (e) => console.log(e.detail.text));
```

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.bibtexApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.bibtexStates` = `default`, `copied`.

### `df$.shadcn.bibtex`

| Member | Description |
|---|---|
| `formats` | Every format, in tab order: bibtex, apa, mla, chicago, harvard, ieee. |
| `parse(text)` | Parse BibTeX text into entries - [{ type, key, fields, order }]; @comment, @preamble and @string are skipped. |
| `format(entries, style, options)` | Format entries (or BibTeX text) in one style - { html, text, list }: html is a string for bibtex, else one reference per entry. Options: align, highlight (bibtex). |
| `show(target, fmt)` | Show a format on an element (state 'default' with that format). |
| `copy(target)` | Copy what an element shows - resolves true when the clipboard took it. |
| `text(target)` | The text a copy of the element takes now. |
| `entries(target)` | The element's parsed entries. |

### Events

| Event | `detail` | Description |
|---|---|---|
| `bibtex-copy` | `format`, `text`, `ok` | Fires after a copy - the format, the text copied and whether the clipboard took it (false: the view was selected instead). |
| `bibtex-format` | `format`, `text` | Fires when the shown format changes - by a tab, the keyboard or setState; the format and the text a copy takes. |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| `.bibtex` | `aria-label` | What is cited (or a `<figcaption>`) |
| `.bibtex-tabs` | `role="tablist"`, `aria-label="Citation format"` | Set by the runtime |
| `.bibtex-tab` | `role="tab"`, `aria-selected`, `aria-controls`, roving `tabindex` | Set |
| `.bibtex-view` | `role="tabpanel"` | When there are tabs |
| `.bibtex-copy` | `aria-label="Copy APA"` | Names what it copies |
| `.bibtex-status` | `role="status"` | Announces "APA copied to the clipboard" |
| `.bibtex-link` | `target="_blank" rel="noopener"` | DOI / URL links open in a new tab |

---

## Notes
- **Copy = what is shown, as plain text**: the BibTeX tab copies the
  normalized BibTeX, a style tab the reference text (italics drop, `[1]`
  numbers stay).
- **Links**: a DOI (as `https://doi.org/…`) and an http(s) URL are
  `<a class="bibtex-link" target="_blank" rel="noopener">` in the view -
  in the references and in the BibTeX (`url`, `doi` fields). The copy is
  built from the text, so it never carries markup; other schemes stay text.
- Author the source as it comes from the publisher; the runtime reads
  LaTeX accents, `--` page ranges and `~` ties.
- In a [Modern Paper](../paper/component-skill.md) it is the citation
  section.
