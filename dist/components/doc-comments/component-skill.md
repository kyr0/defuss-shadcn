---
name: Document Comments
type: ORG
section: application
why: Comments on spans of a document as Cards in a column that scrolls on its own - the anchors are marks the runtime wraps around the exact text (block id + text), so a click on the text finds the comment and a click on the comment finds the text; one JSON model carries it all.
when: Reviewing a document - a Google-Docs-style editor (the Document Editor scaffold on Editor.js), a rendered article, any markup whose blocks carry ids; for a chat about the whole thing use Session, for a plain list of remarks Comment Item.
where: dist/components/doc-comments/doc-comments.css + dist/components/doc-comments/doc-comments.js
supportedStates: default, current
---

# Pattern: Document Comments

## Native basis

An `<aside class="doc-comments" data-for="document-id">` with the model in a
`<script type="application/json" class="doc-comments-source">`. The runtime
renders the column (a head with a ButtonGroup to walk the comments, the
comments as Cards with Avatar, body, quotes and a Reply composer - a
Textarea group) and wraps each comment's anchored text in the document in a
`<mark class="doc-comments-mark">`. The document is any element whose blocks
carry ids (`data-id` - Editor.js's blocks - or `id`).

## Native Web APIs
- [`Range`](https://developer.mozilla.org/en-US/docs/Web/API/Range) / [`Text.splitText()`](https://developer.mozilla.org/en-US/docs/Web/API/Text/splitText) - the anchored text wrapped in marks across inline elements, unwrapped again without a trace
- [`<mark>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark) - the highlighted span; `data-current` for the selected comment
- [`scrollIntoView()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) - the column and the document scroll to each other's part
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) - the column scrolls independently of the document
- [`position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position) - the head with the ↑ ↓ group stays while the cards scroll
- [`Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) - the comment times
- [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - card, avatar and mark tints from one comment colour
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `doc-comments-change`, `doc-comments-select`, `doc-comments-flash`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - instant scrolls, no flash animation

## Structure

```html
<!-- the document: blocks with ids (an Editor.js document writes data-id on every .ce-block) -->
<article id="brief">
  <h2 id="h1">Design brief</h2>
  <p id="p1">The editor needs a <b>comment column</b> beside the text.</p>
  <p id="p2">Comments keep their place while the text is edited.</p>
</article>

<!-- the column: data-for names the document, the model is JSON -->
<aside class="doc-comments" data-for="brief" data-author="You" aria-label="Comments">
  <script type="application/json" class="doc-comments-source">
  {
    "version": 1,
    "comments": [
      { "id": "c1", "author": "Mira Chen", "time": "2026-10-07T09:12:00Z", "color": "chart-2",
        "anchor": { "block": "p1", "text": "comment column" },
        "body": "Should this be **collapsible** on narrow screens?",
        "quotes": [{ "block": "p2", "text": "keep their place", "note": "and this is the hard part" }] },
      { "id": "c2", "author": "Jon Park", "time": "2026-10-07T09:30:00Z", "parent": "c1",
        "body": "Yes - a Sheet below `64rem`." }
    ]
  }
  </script>
</aside>
```

### The model (version 1)

| Field | Meaning |
|---|---|
| `id` | unique; the mark's `data-comment` |
| `author`, `time` | display name (initials make the avatar), ISO 8601 |
| `color` | `chart-1` ... `chart-5` - the card's edge, the avatar and the mark; the page maps it to severity, priority or author |
| `anchor` | `{ block, text, occurrence? }` - the span the comment is about; a reply has none and inherits its parent's |
| `body` | Markdown: paragraphs, `**bold**`, `*italic*`, `` `code` ``, `[text](https://...)` |
| `quotes` | `[{ block, text, occurrence?, note? }]` - other spans; clicking one scrolls there and flashes it |
| `parent` | the comment this one answers - replies nest under their parent |

The column renders top-level comments in the order of their marks in the
document, replies under their parent by time. A span whose text is no longer
in the block gets no mark; the card stays.

## Variants

| Attribute | Value | Behavior |
|---|---|---|
| `data-for` | an element id | The document the comments are on (default: the previous sibling) |
| `data-author` | a name | The author of replies written in the column (default "You") |
| `--doc-comments-width` | length | The column's width (default 20rem) |
| `--doc-comments-flash` | colour | The quote flash (default the search-highlight yellow) |
| `data-color` on a comment | `chart-1` ... `chart-5` | The comment's colour family |

## ARIA

| Element | Attribute | Notes |
|---|---|---|
| `.doc-comments` | `aria-label` | Name the column ("Comments") |
| `.btn-group` | `role="group"`, `aria-label` | The ↑ ↓ pair; icon buttons carry `aria-label` |
| `.doc-comments-card` | `aria-current="true"` | The current comment |
| Reply button | `aria-expanded` | Whether its composer is open |
| anchor / quote | `<button>` | Keyboard-reachable; `title` says what the click does |
| `mark` | `title` | "Comment by ..." - a click selects the comment |

## States

| State | Meaning |
|---|---|
| `default` | No comment is current. |
| `current` | `{ id }` - that comment's card (`aria-current`) and mark (`data-current`) highlighted, both scrolled into view; `data-current` on the column. |

```js
document.querySelector('#comments').api.setState('current', { id: 'c1' });
```

## Notes

- **Marks are placed, not stored**: the model holds block id + text; the runtime searches the text in the block and wraps every text node of the match. Editing the text inside a mark keeps it; a block re-rendered by the editor loses it and gets it back on the next `editorjs-change` (`refresh()` for any other document). The anchored text changed or removed: no mark.
- **On Editor.js**: the column waits for `editorjs-ready` (bubbling from the document) before placing marks; the saved Markdown drops the marks to their text, so the model is the only place the comments live.
- **One model, replaced**: `load()`, `add()` and the Reply composer replace the model and re-render the column; `data()` returns a copy - persist it as you like.
- **Flash**: the quote flash is a temporary `mark.doc-comments-flash` removed after 1.6 s; `--doc-comments-flash` recolours it. There is no highlight token in the theme - the colour is the literal the Search Result block uses.
- Replies reuse the Textarea composer (`.textarea-group`); Enter inserts a line, the Reply button submits.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type DocCommentsState = 'default' | 'current'</code> - `setState(name, config)` takes the config of the state it names (`DocCommentsStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | No comment selected: no card is current, no mark highlighted. No config. |
| `current` | One comment is current: its card and its mark highlighted, both scrolled into view. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the comment's id</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends DocCommentsState&gt;(name: S, config?: DocCommentsStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DocCommentsStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: DocCommentsState; config: DocCommentsStateConfigs[DocCommentsState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: DocCommentsState; config: DocCommentsStateConfigs[DocCommentsState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: DocCommentsState; config: DocCommentsStateConfigs[DocCommentsState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: DocCommentsState; config: DocCommentsStateConfigs[DocCommentsState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: DocCommentsState; config: DocCommentsStateConfigs[DocCommentsState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.docCommentsApi.setState&lt;S extends DocCommentsState&gt;(el: HTMLElement, name: S, config?: DocCommentsStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>DocCommentsStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.docCommentsApi.getState(el: HTMLElement): { name: DocCommentsState; config: DocCommentsStateConfigs[DocCommentsState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: DocCommentsState; config: DocCommentsStateConfigs[DocCommentsState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.docCommentsApi.render(state: { name: DocCommentsState; config: DocCommentsStateConfigs[DocCommentsState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: DocCommentsState; config: DocCommentsStateConfigs[DocCommentsState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.docCommentsApi.store(el: HTMLElement): Store&lt;{ name: DocCommentsState; config: DocCommentsStateConfigs[DocCommentsState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: DocCommentsState; config: DocCommentsStateConfigs[DocCommentsState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.docCommentsApi.commit&lt;S extends DocCommentsState&gt;(el: HTMLElement, name: S, config?: DocCommentsStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>DocCommentsStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.docCommentsStates: DocCommentsState[]</code> | The declared states, 'default' first: <code>default</code>, <code>current</code>. |

### `df$.shadcn.docComments`

| Member | Description |
|---|---|
| <code>load(target: string \| HTMLElement, data: DocCommentsData): void</code> | Replace the model: the column re-renders, the marks are placed again. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .doc-comments element or its selector</td></tr><tr><td><code>data</code></td><td><code>DocCommentsData</code></td><td>the comments document (version 1)</td></tr></table> |
| <code>data(target: string \| HTMLElement): DocCommentsData</code> | The current model - comments as authored and added, with their anchors and quotes. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .doc-comments element or its selector</td></tr></table> <b>Returns</b> <code>DocCommentsData</code> - the comments document (version 1); empty when the element is unknown |
| <code>add(target: string \| HTMLElement, comment: Partial&lt;DocComment&gt;): string \| null</code> | Add a comment: an anchor (a span of the document) for a new thread, or a parent for a reply. The id is generated when missing. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .doc-comments element or its selector</td></tr><tr><td><code>comment</code></td><td><code>Partial&lt;DocComment&gt;</code></td><td>the comment; body required, plus anchor or parent</td></tr></table> <b>Returns</b> <code>string \| null</code> - the new comment's id, or null when it was refused (no body, no anchor and no parent, unknown parent) |
| <code>reply(target: string \| HTMLElement, parentId: string, body: string, author?: string): string \| null</code> | Answer a comment - what the Reply composer sends. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .doc-comments element or its selector</td></tr><tr><td><code>parentId</code></td><td><code>string</code></td><td>the comment to answer</td></tr><tr><td><code>body</code></td><td><code>string</code></td><td>the reply (Markdown)</td></tr><tr><td><code>author?</code></td><td><code>string</code></td><td>the author; default: the column's data-author, else "You"</td></tr></table> <b>Returns</b> <code>string \| null</code> - the reply's id, or null when refused |
| <code>go(target: string \| HTMLElement, id: string): boolean</code> | Make a comment current: its card and its mark highlighted and scrolled into view (the current state). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .doc-comments element or its selector</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the comment's id</td></tr></table> <b>Returns</b> <code>boolean</code> - true when the comment exists |
| <code>next(target: string \| HTMLElement): string \| null</code> | The next comment down the column (wrapping) - the ↓ button. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .doc-comments element or its selector</td></tr></table> <b>Returns</b> <code>string \| null</code> - the id that became current, or null without comments |
| <code>prev(target: string \| HTMLElement): string \| null</code> | The previous comment up the column (wrapping) - the ↑ button. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .doc-comments element or its selector</td></tr></table> <b>Returns</b> <code>string \| null</code> - the id that became current, or null without comments |
| <code>flash(target: string \| HTMLElement, quote: DocCommentsSpan): boolean</code> | Scroll to a span of the document and flash it for a moment - what clicking a quote does. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .doc-comments element or its selector</td></tr><tr><td><code>quote</code></td><td><code>DocCommentsSpan</code></td><td>the span: block id + exact text (+ occurrence)</td></tr></table> <b>Returns</b> <code>boolean</code> - true when the span was found |
| <code>refresh(target: string \| HTMLElement): void</code> | Place the marks again (after the document was re-rendered) and re-render the column. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .doc-comments element or its selector</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `doc-comments-change` | Fires after the model changed (load, add, reply) - how many comments it holds, and the added one's id. <code>detail</code>: <code>DocCommentsChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>comments</code></td><td><code>number</code></td><td>how many comments the model holds now</td></tr><tr><td><code>id?</code></td><td><code>string</code></td><td>the comment that was added, when one was</td></tr></table> |
| `doc-comments-flash` | Fires when a quote is followed - the span it names and whether the document still holds it. <code>detail</code>: <code>DocCommentsFlashDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>block</code></td><td><code>string</code></td><td>the quoted block</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the quoted text</td></tr><tr><td><code>found</code></td><td><code>boolean</code></td><td>whether the span was found in the document</td></tr></table> |
| `doc-comments-select` | Fires when a comment becomes current - from its mark, its card, the prev / next buttons or the API. <code>detail</code>: <code>DocCommentsSelectDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the comment that became current</td></tr><tr><td><code>source</code></td><td><code>'mark' \| 'card' \| 'nav' \| 'api'</code></td><td>what selected it: its mark, its card, the prev / next buttons or the API</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `DocComment` | One comment of the model. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>unique id (the mark's data-comment)</td></tr><tr><td><code>author</code></td><td><code>string</code></td><td>the author's display name</td></tr><tr><td><code>time?</code></td><td><code>string</code></td><td>when it was written (ISO 8601)</td></tr><tr><td><code>color?</code></td><td><code>string</code></td><td>the colour family: chart-1 ... chart-5 (severity, priority or author - the page decides)</td></tr><tr><td><code>anchor?</code></td><td><code>DocCommentsSpan</code></td><td>the span the comment is about; a reply inherits its parent's</td></tr><tr><td><code>body</code></td><td><code>string</code></td><td>the comment text (Markdown: paragraphs, bold, italic, code, links)</td></tr><tr><td><code>quotes?</code></td><td><code>DocCommentsQuote[]</code></td><td>other spans the comment refers to</td></tr><tr><td><code>parent?</code></td><td><code>string</code></td><td>the comment this one answers (a reply)</td></tr></table> |
| `DocCommentsChangeDetail` | What doc-comments-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>comments</code></td><td><code>number</code></td><td>how many comments the model holds now</td></tr><tr><td><code>id?</code></td><td><code>string</code></td><td>the comment that was added, when one was</td></tr></table> |
| `DocCommentsData` | The model: version 1, the comments in authoring order. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>version</code></td><td><code>1</code></td><td>the format version (1)</td></tr><tr><td><code>comments</code></td><td><code>DocComment[]</code></td><td>the comments</td></tr></table> |
| `DocCommentsFlashDetail` | What doc-comments-flash carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>block</code></td><td><code>string</code></td><td>the quoted block</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the quoted text</td></tr><tr><td><code>found</code></td><td><code>boolean</code></td><td>whether the span was found in the document</td></tr></table> |
| `DocCommentsQuote` | A quote inside a comment: another span of the document, with a note. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>note?</code></td><td><code>string</code></td><td>what the quote says about that span (Markdown)</td></tr></table> |
| `DocCommentsSelectDetail` | What doc-comments-select carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the comment that became current</td></tr><tr><td><code>source</code></td><td><code>'mark' \| 'card' \| 'nav' \| 'api'</code></td><td>what selected it: its mark, its card, the prev / next buttons or the API</td></tr></table> |
| `DocCommentsSpan` | A span of the document's text a comment anchors to or quotes. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>block</code></td><td><code>string</code></td><td>the block's id: an element with data-id (an Editor.js block) or that id inside the document</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the exact text inside that block</td></tr><tr><td><code>occurrence?</code></td><td><code>number</code></td><td>which occurrence of the text when it repeats (0 = the first)</td></tr></table> |
