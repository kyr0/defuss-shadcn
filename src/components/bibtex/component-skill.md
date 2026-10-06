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

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type BibtexState = 'default' | 'copied'</code> - `setState(name, config)` takes the config of the state it names (`BibtexStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The source shown in one format. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>format?</code></td><td><code>BibtexStyle</code></td><td>the format to show (one the element offers); default: the authored data-format, else the first offered</td></tr></table> |
| `copied` | The copy feedback - the button says Copied and the status announces it; back to default after two seconds. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>format?</code></td><td><code>BibtexStyle</code></td><td>the format that was copied (default: the one shown)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends BibtexState&gt;(name: S, config?: BibtexStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>BibtexStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: BibtexState; config: BibtexStateConfigs[BibtexState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: BibtexState; config: BibtexStateConfigs[BibtexState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: BibtexState; config: BibtexStateConfigs[BibtexState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: BibtexState; config: BibtexStateConfigs[BibtexState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: BibtexState; config: BibtexStateConfigs[BibtexState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.bibtexApi.setState&lt;S extends BibtexState&gt;(el: HTMLElement, name: S, config?: BibtexStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>BibtexStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.bibtexApi.getState(el: HTMLElement): { name: BibtexState; config: BibtexStateConfigs[BibtexState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: BibtexState; config: BibtexStateConfigs[BibtexState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.bibtexApi.render(state: { name: BibtexState; config: BibtexStateConfigs[BibtexState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: BibtexState; config: BibtexStateConfigs[BibtexState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.bibtexApi.store(el: HTMLElement): Store&lt;{ name: BibtexState; config: BibtexStateConfigs[BibtexState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: BibtexState; config: BibtexStateConfigs[BibtexState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.bibtexApi.commit&lt;S extends BibtexState&gt;(el: HTMLElement, name: S, config?: BibtexStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>BibtexStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.bibtexStates: BibtexState[]</code> | The declared states, 'default' first: <code>default</code>, <code>copied</code>. |

### `df$.shadcn.bibtex`

| Member | Description |
|---|---|
| <code>formats: BibtexStyle[]</code> | Every format, in tab order: bibtex, apa, mla, chicago, harvard, ieee. |
| <code>parse(text: string): BibtexEntry[]</code> | Parse BibTeX text into entries - [{ type, key, fields, order }]; @comment, @preamble and @string are skipped. */ <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>text</code></td><td><code>string</code></td><td>BibTeX source, any number of entries</td></tr></table> <b>Returns</b> <code>BibtexEntry[]</code> - the entries, in source order |
| <code>format(entries: BibtexEntry[] \| string, style: BibtexStyle, options?: { align?: boolean; highlight?: boolean }): BibtexOutput</code> | Format entries (or BibTeX text) in one style - { html, text, list }: html is a string for bibtex, else one reference per entry. Options: align, highlight (bibtex). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>entries</code></td><td><code>BibtexEntry[] \| string</code></td><td>parsed entries, or BibTeX text to parse first</td></tr><tr><td><code>style</code></td><td><code>BibtexStyle</code></td><td>the citation format</td></tr><tr><td><code>options?</code></td><td><code>{ align?: boolean; highlight?: boolean }</code></td><td>bibtex only: align the = signs (default true), highlight the parts (default true)</td></tr></table> <b>Returns</b> <code>BibtexOutput</code> - the markup, the plain text and whether it is a list |
| <code>show(target: string \| HTMLElement, fmt: BibtexStyle): void</code> | Show a format on an element (state 'default' with that format). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .bibtex element or its selector</td></tr><tr><td><code>fmt</code></td><td><code>BibtexStyle</code></td><td>the format to show (one the element offers)</td></tr></table> |
| <code>copy(target: string \| HTMLElement): Promise&lt;boolean&gt;</code> | Copy what an element shows. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .bibtex element or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;boolean&gt;</code> - true when the clipboard took it; false when the view was selected for a manual copy |
| <code>text(target: string \| HTMLElement): string</code> | The text a copy of the element takes now. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .bibtex element or its selector</td></tr></table> <b>Returns</b> <code>string</code> - the shown format as plain text ('' before the first render) |
| <code>entries(target: string \| HTMLElement): BibtexEntry[]</code> | The element's parsed entries. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .bibtex element or its selector</td></tr></table> <b>Returns</b> <code>BibtexEntry[]</code> - a copy of the entries its source holds |

### Events

| Event | Description |
|---|---|
| `bibtex-copy` | Fires after a copy - the format, the text copied and whether the clipboard took it (false: the view was selected instead). <code>detail</code>: <code>BibtexCopyDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>format</code></td><td><code>BibtexStyle</code></td><td>the format that was copied (the element's data-format - always one it offers)</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the text copied</td></tr><tr><td><code>ok</code></td><td><code>boolean</code></td><td>true when the clipboard took it; false: the view was selected for a manual copy</td></tr></table> |
| `bibtex-format` | Fires when the shown format changes - by a tab, the keyboard or setState; the format and the text a copy takes. <code>detail</code>: <code>BibtexFormatDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>format</code></td><td><code>BibtexStyle</code></td><td>the format shown now (the element's data-format - always one it offers)</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the text a copy takes in it</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `BibtexCopyDetail` | What bibtex-copy carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>format</code></td><td><code>BibtexStyle</code></td><td>the format that was copied (the element's data-format - always one it offers)</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the text copied</td></tr><tr><td><code>ok</code></td><td><code>boolean</code></td><td>true when the clipboard took it; false: the view was selected for a manual copy</td></tr></table> |
| `BibtexEntry` | One parsed BibTeX entry. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the entry type, lowercase (article, inproceedings, book, misc, ...)</td></tr><tr><td><code>key</code></td><td><code>string</code></td><td>the citation key</td></tr><tr><td><code>fields</code></td><td><code>Record&lt;string, string&gt;</code></td><td>every field's raw value as written (braces and quotes removed, macros kept)</td></tr><tr><td><code>order</code></td><td><code>string[]</code></td><td>the field names in source order</td></tr><tr><td><code>bare</code></td><td><code>Record&lt;string, string&gt;</code></td><td>the fields written without braces or quotes (a macro like jan, a number)</td></tr></table> |
| `BibtexFormatDetail` | What bibtex-format carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>format</code></td><td><code>BibtexStyle</code></td><td>the format shown now (the element's data-format - always one it offers)</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the text a copy takes in it</td></tr></table> |
| `BibtexOutput` | What format() returns. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>html</code></td><td><code>string \| string[]</code></td><td>the formatted markup: one string for bibtex, else one reference per entry</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the same as plain text - what a copy takes</td></tr><tr><td><code>list</code></td><td><code>boolean</code></td><td>true when several entries became a list</td></tr></table> |
| `BibtexStyle` | A citation format - the tab order. = <code>'bibtex' \| 'apa' \| 'mla' \| 'chicago' \| 'harvard' \| 'ieee'</code> |

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
