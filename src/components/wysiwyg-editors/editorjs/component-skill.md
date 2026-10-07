---
name: Editor.js
type: MOL
section: wysiwyg-editors
why: The official Editor.js block editor - clean JSON blocks, a + menu, an inline toolbar - loaded on demand from a pinned build; the component adds the theme, Markdown in and out, a Toolbar binding and the State API.
when: Long-form documents people edit as blocks - notes, briefs, articles - that are stored as Markdown or as Editor.js JSON; for an editable live example of HTML use the HTML Preview Editor, for a single field a Textarea.
where: dist/components/editorjs/editorjs.css + dist/components/editorjs/editorjs.js
supportedStates: default, readonly
---

# Pattern: Editor.js

## Native basis

A `<div class="editorjs">` with the document in a `<script class="editorjs-source">`
(Markdown, or Editor.js block JSON) and an optional `.editorjs-holder`. The
runtime imports the pinned official builds of Editor.js and its tools, parses
the Markdown with `marked` (pinned), mounts the editor into the holder and
serializes the blocks back to Markdown on request. The document DOM is
Editor.js's own (`.ce-block[data-id]` per block), so other components - a
comment column - can address its blocks.

## Native Web APIs
- [dynamic `import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) - the pinned ESM builds, loaded once on the first editor
- [`contenteditable`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable) - what Editor.js edits; the Toolbar's inline commands apply to its selection
- [`document.execCommand()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand) - bold, italic, underline on the selection (what Editor.js's own inline tools use)
- [`Selection`](https://developer.mozilla.org/en-US/docs/Web/API/Selection) / [`Range`](https://developer.mozilla.org/en-US/docs/Web/API/Range) - marker and inline code wrap the selection
- [`selectionchange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event) - the toolbar's toggles follow the caret
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `editorjs-ready`, `editorjs-change`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - no loading shimmer

## Structure

```html
<!-- a Markdown document, editable -->
<div class="editorjs" id="brief" data-placeholder="Write the brief...">
  <script type="text/markdown" class="editorjs-source">
# Design brief

A paragraph with **bold**, *italic*, `code` and a [link](https://example.org).

- a list
- with items
  - nested

> A quote.

| Column | Value |
| --- | --- |
| a | 1 |
  </script>
</div>

<!-- Editor.js JSON (a saved document) -->
<div class="editorjs" data-readonly>
  <script type="application/json" class="editorjs-source">{"blocks":[{"id":"b1","type":"header","data":{"text":"Title","level":1}},{"id":"b2","type":"paragraph","data":{"text":"Body."}}]}</script>
</div>

<!-- a Toolbar drives the formatting: data-toolbar names it, each button a data-editor-command -->
<div class="toolbar" role="toolbar" aria-label="Formatting" id="brief-bar" data-size="sm">
  <div class="toggle-group" role="group" aria-label="Text style" data-type="multiple">
    <button class="toggle" aria-pressed="false" data-editor-command="bold" aria-label="Bold"><i data-lucide="bold"></i></button>
    <button class="toggle" aria-pressed="false" data-editor-command="italic" aria-label="Italic"><i data-lucide="italic"></i></button>
    <button class="toggle" aria-pressed="false" data-editor-command="underline" aria-label="Underline"><i data-lucide="underline"></i></button>
  </div>
  <div class="separator" data-orientation="vertical" role="separator"></div>
  <div class="toggle-group" role="group" aria-label="Block" data-type="single">
    <button class="toggle" aria-pressed="false" data-editor-command="paragraph" aria-label="Paragraph"><i data-lucide="pilcrow"></i></button>
    <button class="toggle" aria-pressed="false" data-editor-command="header:1" aria-label="Heading 1"><i data-lucide="heading-1"></i></button>
    <button class="toggle" aria-pressed="false" data-editor-command="header:2" aria-label="Heading 2"><i data-lucide="heading-2"></i></button>
    <button class="toggle" aria-pressed="false" data-editor-command="list:unordered" aria-label="Bulleted list"><i data-lucide="list"></i></button>
    <button class="toggle" aria-pressed="false" data-editor-command="quote" aria-label="Quote"><i data-lucide="quote"></i></button>
  </div>
  <div class="separator" data-orientation="vertical" role="separator"></div>
  <button class="btn" data-variant="ghost" data-size="icon-sm" data-editor-command="marker" aria-label="Highlight"><i data-lucide="highlighter"></i></button>
  <button class="btn" data-variant="ghost" data-size="icon-sm" data-editor-command="inline-code" aria-label="Inline code"><i data-lucide="code"></i></button>
  <button class="btn" data-variant="ghost" data-size="icon-sm" data-editor-command="delimiter" aria-label="Divider"><i data-lucide="minus"></i></button>
  <button class="btn" data-variant="ghost" data-size="icon-sm" data-editor-command="table" aria-label="Table"><i data-lucide="table"></i></button>
</div>
<div class="editorjs" data-toolbar="brief-bar">...</div>
```

### Commands

`data-editor-command` on any button of the named toolbar: `bold`, `italic`,
`underline` (the selection), `marker` and `inline-code` (wrap the selection),
`paragraph`, `header:1` to `header:6`, `list:unordered`, `list:ordered`,
`list:checklist`, `quote`, `code` (convert the current block), `delimiter`
and `table` (insert after the current block). A `.toggle` with `aria-pressed`
follows the selection: bold / italic / underline from the selection's
formatting, the block buttons from the current block's type.

## Variants

| Attribute | Value | Behavior |
|---|---|---|
| `data-tools` | space-separated tool names | The tools to load: `header list quote code delimiter marker inlineCode table` (all, the default) or a subset |
| `data-readonly` | - | Read only (the `readonly` state) |
| `data-placeholder` | text | The empty document's placeholder |
| `data-toolbar` | an id | The Toolbar whose `data-editor-command` buttons drive this editor |
| `--editorjs-measure` | length | The reading measure of the holder (default 44rem) |

## ARIA

| Element | Attribute | Notes |
|---|---|---|
| the editor | Editor.js's own | `contenteditable` blocks, the + menu and the inline toolbar are keyboard-operable (Tab to the +, / for the menu) |
| toolbar buttons | `aria-label`, `aria-pressed` | Icon-only commands need a label; toggles report the selection's state |

## States

| State | Meaning |
|---|---|
| `default` | Editable. |
| `readonly` | `data-readonly` on the element; the editor's read-only mode, its toolbars hidden. |

```js
document.querySelector('#brief').api.setState('readonly');
```

## Notes

- **Vendor, pinned**: `@editorjs/editorjs@2.31.7` and the tools `header@2.8.9`, `list@2.0.9`, `quote@2.7.6`, `code@2.9.4`, `delimiter@1.4.2`, `marker@1.4.0`, `inline-code@1.5.2`, `table@2.4.6`, plus `marked@18.1.0` - jsDelivr ESM files, never `@latest`. `df$.shadcn.editorjs.load(url)` loads a self-hosted Editor.js instead; the tools and marked keep their pinned URLs.
- **Markdown round trip**: headings, paragraphs, lists (nested; `- [ ]` task lists become checklists), quotes, fenced code, rules and tables survive both ways; inline bold, italic, code and links too. Underline and the marker have no Markdown and come back as plain text; a comment column's marks drop to their text.
- **Offline**: a page without an editor never requests the builds; the first one does, once. Until then the element shows a shimmer (`:not([data-ready])`); a failed load marks it `data-error` and says so.
- **Editor.js styles**: the tools' classes are themed in the stylesheet; Editor.js injects its own base styles once per page.
- **Markup from the toolbar**: the marker wraps the selection in `<mark class="cdx-marker">`, inline code in `<code class="inline-code">` - the same markup the tools produce, so the saved blocks are identical.
- The skill does not restate Editor.js's API: `df$.shadcn.editorjs.editor(el)` returns the instance for anything beyond this surface.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type EditorjsState = 'default' | 'readonly'</code> - `setState(name, config)` takes the config of the state it names (`EditorjsStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Editable: the editor accepts input, the toolbar commands apply. No config. |
| `readonly` | Read only: the document shows, nothing edits it (data-readonly on the element). No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends EditorjsState&gt;(name: S, config?: EditorjsStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>EditorjsStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: EditorjsState; config: EditorjsStateConfigs[EditorjsState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: EditorjsState; config: EditorjsStateConfigs[EditorjsState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: EditorjsState; config: EditorjsStateConfigs[EditorjsState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: EditorjsState; config: EditorjsStateConfigs[EditorjsState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: EditorjsState; config: EditorjsStateConfigs[EditorjsState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.editorjsApi.setState&lt;S extends EditorjsState&gt;(el: HTMLElement, name: S, config?: EditorjsStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>EditorjsStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.editorjsApi.getState(el: HTMLElement): { name: EditorjsState; config: EditorjsStateConfigs[EditorjsState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: EditorjsState; config: EditorjsStateConfigs[EditorjsState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.editorjsApi.render(state: { name: EditorjsState; config: EditorjsStateConfigs[EditorjsState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: EditorjsState; config: EditorjsStateConfigs[EditorjsState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.editorjsApi.store(el: HTMLElement): Store&lt;{ name: EditorjsState; config: EditorjsStateConfigs[EditorjsState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: EditorjsState; config: EditorjsStateConfigs[EditorjsState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.editorjsApi.commit&lt;S extends EditorjsState&gt;(el: HTMLElement, name: S, config?: EditorjsStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>EditorjsStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.editorjsStates: EditorjsState[]</code> | The declared states, 'default' first: <code>default</code>, <code>readonly</code>. |

### `df$.shadcn.editorjs`

| Member | Description |
|---|---|
| <code>load(url?: string): Promise&lt;unknown&gt;</code> | Load the pinned editor build ahead of the first element (or a self-hosted copy). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>url?</code></td><td><code>string</code></td><td>the Editor.js ESM module to load instead of the pinned one</td></tr></table> <b>Returns</b> <code>Promise&lt;unknown&gt;</code> - resolves when the module is loaded |
| <code>url: string</code> | The pinned Editor.js build the component loads. |
| <code>markdown(target: string \| HTMLElement): Promise&lt;string&gt;</code> | The document as Markdown - headings, paragraphs, lists (nested, checklists), quotes, code, rules, tables; inline bold, italic, code and links. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .editorjs element or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;string&gt;</code> - the Markdown, '' before the editor is ready |
| <code>setMarkdown(target: string \| HTMLElement, markdown: string): Promise&lt;void&gt;</code> | Replace the document with Markdown. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .editorjs element or its selector</td></tr><tr><td><code>markdown</code></td><td><code>string</code></td><td>the new document</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves once the blocks are rendered |
| <code>blocks(target: string \| HTMLElement): Promise&lt;EditorjsDocument \| null&gt;</code> | The document as Editor.js data (blocks with their ids). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .editorjs element or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;EditorjsDocument \| null&gt;</code> - the saved document, or null before the editor is ready |
| <code>setBlocks(target: string \| HTMLElement, data: EditorjsDocument): Promise&lt;void&gt;</code> | Replace the document with Editor.js data. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .editorjs element or its selector</td></tr><tr><td><code>data</code></td><td><code>EditorjsDocument</code></td><td>the blocks to render</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves once the blocks are rendered |
| <code>command(target: string \| HTMLElement, name: string): Promise&lt;boolean&gt;</code> | Run a formatting command on the current selection or block - what a toolbar button with data-editor-command sends. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .editorjs element or its selector</td></tr><tr><td><code>name</code></td><td><code>string</code></td><td>bold, italic, underline, marker, inline-code, paragraph, header:1-6, list:unordered\|ordered\|checklist, quote, code, delimiter, table</td></tr></table> <b>Returns</b> <code>Promise&lt;boolean&gt;</code> - true when the command applied |
| <code>editor(target: string \| HTMLElement): unknown</code> | The Editor.js instance behind an element, for anything this API does not cover. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .editorjs element or its selector</td></tr></table> <b>Returns</b> <code>unknown</code> - the editor, or undefined before it mounted |
| <code>toBlocks(target: string \| HTMLElement, markdown: string): EditorjsBlock[]</code> | Markdown → Editor.js blocks, with the parser the component loaded (after the first editor is ready). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>any mounted .editorjs element or its selector (its parser is used)</td></tr><tr><td><code>markdown</code></td><td><code>string</code></td><td>the Markdown to convert</td></tr></table> <b>Returns</b> <code>EditorjsBlock[]</code> - the blocks, [] before a parser is loaded |
| <code>toMarkdown(blocks: EditorjsBlock[]): string</code> | Editor.js blocks → Markdown. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>blocks</code></td><td><code>EditorjsBlock[]</code></td><td>the blocks to serialize</td></tr></table> <b>Returns</b> <code>string</code> - the Markdown |

### Events

| Event | Description |
|---|---|
| `editorjs-change` | Fires after the document changed (typing, a block added or converted, a toolbar command) - how many blocks it has now. <code>detail</code>: <code>EditorjsChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>blocks</code></td><td><code>number</code></td><td>how many blocks the document has after the change</td></tr></table> |
| `editorjs-ready` | Fires once the editor mounted its blocks - the count it started with. <code>detail</code>: <code>EditorjsReadyDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>blocks</code></td><td><code>number</code></td><td>how many blocks the document started with</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `EditorjsBlock` | One Editor.js block, as the editor saves it. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id?</code></td><td><code>string</code></td><td>the block's id (Editor.js writes it on .ce-block[data-id])</td></tr><tr><td><code>type</code></td><td><code>string</code></td><td>the tool: paragraph, header, list, quote, code, delimiter, table</td></tr><tr><td><code>data</code></td><td><code>Record&lt;string, unknown&gt;</code></td><td>the tool's data</td></tr></table> |
| `EditorjsChangeDetail` | What editorjs-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>blocks</code></td><td><code>number</code></td><td>how many blocks the document has after the change</td></tr></table> |
| `EditorjsDocument` | The saved document: Editor.js output data. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>blocks</code></td><td><code>EditorjsBlock[]</code></td><td>the blocks, in order</td></tr><tr><td><code>version?</code></td><td><code>string</code></td><td>the editor's version, when saved by it</td></tr><tr><td><code>time?</code></td><td><code>number</code></td><td>when it was saved, ms since the epoch</td></tr></table> |
| `EditorjsReadyDetail` | What editorjs-ready carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>blocks</code></td><td><code>number</code></td><td>how many blocks the document started with</td></tr></table> |
