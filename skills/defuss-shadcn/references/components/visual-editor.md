---
name: Visual Editor
type: ATM
section: wysiwyg-editors
why: GrapesJS, the drag-and-drop HTML editor, loaded on demand from a pinned build, edits the markup the component skills document - blocks drop in, elements select, move and change - and the same markup comes out, inline styles where they were written.
when: Pages people compose visually from the system's components - a landing page, a form, an app screen - and keep as markup; the whole workflow (pages, block library, inspector, preview, export) is the Studio. For an editable live example of HTML use the HTML Preview Editor, for documents edited as blocks Editor.js.
where: dist/components/visual-editor.css + dist/components/visual-editor.js (the extra bundle - load it after all.css / all.js; per component: dist/components/visual-editor/visual-editor.css + visual-editor.js)
supportedStates: default, readonly
---

# Pattern: Visual Editor

## Native basis

A `<div class="visual-editor">` holding the page in a `<script type="text/html" class="visual-editor-source">`: a data
block the browser neither runs nor renders, so no component starts inside it. The runtime imports the pinned GrapesJS build on the first
editor, mounts it in a `.visual-editor-canvas` over that markup and styles the canvas with the host page's own
stylesheets. Blocks are any elements with `data-visual-editor-block` and a `<template>` of markup: dragged into the
canvas (the HTML Drag and Drop API) or clicked, they insert their markup. Outside controls name the editor with
`data-visual-editor-for`.

## Native Web APIs
- [`<script>` data block](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#embedding_data_in_html) - the page source (`type="text/html"`): neither run nor rendered
- [`<template>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template) - every block's markup, parsed but inert
- [dynamic `import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) - the pinned GrapesJS build, loaded once on the first editor
- [HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) - a `draggable` block drops into the canvas
- [`inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert) - the canvas in the `readonly` state
- [`DOMParser`](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser) - inserted markup gets free ids, its references follow
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - new editors start; the host's dark mode reaches the canvas
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `visual-editor-ready`, `visual-editor-change`, `visual-editor-select`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - the drop placeholder does not animate
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - the selection toolbar in system colors

## Structure

```html
<!-- the editor: the page it edits sits in its source block -->
<div class="visual-editor" id="landing" aria-label="Landing page">
  <script type="text/html" class="visual-editor-source">
    <section class="card" style="max-width: 28rem">
      <div class="card-header"><h3 class="card-title">Welcome</h3></div>
      <div class="card-content"><p>Drop components here.</p></div>
    </section>
  </script>
</div>

<!-- blocks: drag one into the canvas, or click it to insert at the selection -->
<div class="flex flex-wrap gap-2" data-visual-editor-for="landing" aria-label="Blocks">
  <button type="button" class="btn" data-variant="outline" data-size="sm" draggable="true" data-visual-editor-block>
    Button
    <template><button class="btn">Get started</button></template>
  </button>
  <button type="button" class="btn" data-variant="outline" data-size="sm" draggable="true" data-visual-editor-block>
    Email field
    <template><label class="label" for="email">Email</label><input class="input" id="email" type="email"></template>
  </button>
</div>

<!-- controls: data-visual-editor-for names the editor, data-visual-editor-action the command -->
<div class="toolbar" role="toolbar" aria-label="Editor" data-size="sm">
  <button class="btn" data-variant="ghost" data-size="sm" data-visual-editor-for="landing" data-visual-editor-action="undo">Undo</button>
  <button class="btn" data-variant="ghost" data-size="sm" data-visual-editor-for="landing" data-visual-editor-action="redo">Redo</button>
  <button class="btn" data-variant="ghost" data-size="sm" data-visual-editor-for="landing" data-visual-editor-action="duplicate">Duplicate</button>
  <button class="btn" data-variant="ghost" data-size="sm" data-visual-editor-for="landing" data-visual-editor-action="remove">Remove</button>
  <select class="select" data-size="sm" aria-label="Device" data-visual-editor-for="landing" data-visual-editor-action="device">
    <option value="desktop">Desktop</option>
    <option value="tablet">Tablet</option>
    <option value="phone">Phone</option>
  </select>
</div>
```

### Controls

`data-visual-editor-action` on a button of `data-visual-editor-for="<editor id>"`: `undo`, `redo` (disabled while
there is nothing to undo or redo), `duplicate` and `remove` (the selected element; disabled without a selection). A
`<select>` with `data-visual-editor-action="device"` sets the canvas width. A block (`data-visual-editor-block`) is
any element - usually a Button - inside or carrying `data-visual-editor-for`; its `<script type="text/html">` data
block, else its first `<template>`, is the markup it inserts. A block list written from script with
`df$(el).html(markup)` uses the data block: defuss-morph drops a template's content.

## Variants

| Attribute | Value | Behavior |
|---|---|---|
| `data-readonly` | - | Read only (the `readonly` state): the canvas is inert |
| `data-device` | `tablet` / `phone` | The canvas width (834px / 390px; desktop - the editor's width - is the default) |
| `--visual-editor-height` | length | The editor's height (default 32rem) |

## ARIA

| Element | Attribute | Notes |
|---|---|---|
| the editor | `aria-label` | Names the page being edited |
| blocks | the button's text | A block is a real button: Enter / Space inserts its markup at the selection |
| controls | `aria-label` on icon-only buttons | Undo / redo / duplicate / remove are `disabled` while they would do nothing |

## States

| State | Meaning |
|---|---|
| `default` | Editing: elements select, blocks drop, changes land. Config `{ device }`. |
| `readonly` | `data-readonly` on the element; the canvas is inert, the selection chrome hidden. Config `{ device }`. |

```js
document.querySelector('#landing').api.setState('default', { device: 'phone' });
```

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type VisualEditorState = 'default' | 'readonly'</code> - `setState(name, config)` takes the config of the state it names (`VisualEditorStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Editing: elements select, blocks drop, the changes of apply() land. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>device?</code></td><td><code>VisualEditorDevice</code></td><td>the canvas width: desktop (the editor's width), tablet (834px) or phone (390px)</td></tr></table> |
| `readonly` | Read only: the page shows as authored - the canvas is inert, nothing selects, drops or edits. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>device?</code></td><td><code>VisualEditorDevice</code></td><td>the canvas width: desktop, tablet or phone</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends VisualEditorState&gt;(name: S, config?: VisualEditorStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>VisualEditorStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: VisualEditorState; config: VisualEditorStateConfigs[VisualEditorState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: VisualEditorState; config: VisualEditorStateConfigs[VisualEditorState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: VisualEditorState; config: VisualEditorStateConfigs[VisualEditorState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: VisualEditorState; config: VisualEditorStateConfigs[VisualEditorState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: VisualEditorState; config: VisualEditorStateConfigs[VisualEditorState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.visualEditorApi.setState&lt;S extends VisualEditorState&gt;(el: HTMLElement, name: S, config?: VisualEditorStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>VisualEditorStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.visualEditorApi.getState(el: HTMLElement): { name: VisualEditorState; config: VisualEditorStateConfigs[VisualEditorState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: VisualEditorState; config: VisualEditorStateConfigs[VisualEditorState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.visualEditorApi.render(state: { name: VisualEditorState; config: VisualEditorStateConfigs[VisualEditorState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: VisualEditorState; config: VisualEditorStateConfigs[VisualEditorState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.visualEditorApi.store(el: HTMLElement): Store&lt;{ name: VisualEditorState; config: VisualEditorStateConfigs[VisualEditorState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: VisualEditorState; config: VisualEditorStateConfigs[VisualEditorState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.visualEditorApi.commit&lt;S extends VisualEditorState&gt;(el: HTMLElement, name: S, config?: VisualEditorStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>VisualEditorStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.visualEditorStates: VisualEditorState[]</code> | The declared states, 'default' first: <code>default</code>, <code>readonly</code>. |

### `df$.shadcn.visualEditor`

| Member | Description |
|---|---|
| <code>load(url?: string, css?: string): Promise&lt;unknown&gt;</code> | Load the pinned GrapesJS build ahead of the first editor (or a self-hosted copy). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>url?</code></td><td><code>string</code></td><td>the GrapesJS UMD build to load instead of the pinned one</td></tr><tr><td><code>css?</code></td><td><code>string</code></td><td>its stylesheet</td></tr></table> <b>Returns</b> <code>Promise&lt;unknown&gt;</code> - resolves when the engine is installed |
| <code>url: string</code> | The pinned GrapesJS build the component loads. |
| <code>html(target: string \| HTMLElement): string</code> | The page as markup - the markup the skills document, inline styles where they were written. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr></table> <b>Returns</b> <code>string</code> - the markup, '' before the editor is ready |
| <code>css(target: string \| HTMLElement): string</code> | The CSS the editor holds beside the markup (rules made in the editor; '' while the page has none). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr></table> <b>Returns</b> <code>string</code> - the CSS, '' before the editor is ready |
| <code>setHtml(target: string \| HTMLElement, html: string): void</code> | Replace the page (GrapesJS's parser drops scripts, on* handlers and javascript: URLs). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr><tr><td><code>html</code></td><td><code>string</code></td><td>the new page markup</td></tr></table> |
| <code>insert(target: string \| HTMLElement, html: string): number</code> | Insert markup: into the selected element when it takes children, else after it, else at the page's end. Ids the page already uses are renamed (`email` → `email-2`) and every reference moves with them. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr><tr><td><code>html</code></td><td><code>string</code></td><td>the markup to insert</td></tr></table> <b>Returns</b> <code>number</code> - how many top-level elements were inserted (0 before the editor is ready) |
| <code>select(target: string \| HTMLElement, path: string \| null): VisualEditorSelection \| null</code> | Select an element by its outline path, or clear the selection. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr><tr><td><code>path</code></td><td><code>string \| null</code></td><td>the element's path (outline(), selection().path), or null to clear</td></tr></table> <b>Returns</b> <code>VisualEditorSelection \| null</code> - the selection, null when nothing is selected |
| <code>selection(target: string \| HTMLElement): VisualEditorSelection \| null</code> | The selected element. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr></table> <b>Returns</b> <code>VisualEditorSelection \| null</code> - its path, tag, attributes, classes and text; null when nothing is selected |
| <code>apply(target: string \| HTMLElement, change: VisualEditorChange): VisualEditorSelection \| null</code> | Change the selected element - attributes, classes, text. Refuses on* handlers and URLs that run code. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr><tr><td><code>change</code></td><td><code>VisualEditorChange</code></td><td>what to change</td></tr></table> <b>Returns</b> <code>VisualEditorSelection \| null</code> - the selection after the change, null when nothing is selected |
| <code>duplicate(target: string \| HTMLElement): boolean</code> | Insert a copy of the selected element after it (ids renamed, references moved) and select the copy. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - true when an element was copied |
| <code>remove(target: string \| HTMLElement): boolean</code> | Remove the selected element. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - true when an element was removed |
| <code>lock(target: string \| HTMLElement, path: string, locked: boolean = true): boolean</code> | Lock an element into one unit, or release it: it moves, copies and goes as a whole, nothing drops into it, and nothing in it is edited, moved, copied or removed (its parts stay selectable). For markup a component renders from its state: change it through the state - replace() with render()'s markup - never through its DOM. The lock lives in the editor, not in the markup, and an undo keeps it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr><tr><td><code>path</code></td><td><code>string</code></td><td>the element's path (outline(), selection().path)</td></tr><tr><td><code>locked</code></td><td><code>boolean</code> = <code>true</code></td><td>false releases it</td></tr></table> <b>Returns</b> <code>boolean</code> - true when there is an element at the path |
| <code>replace(target: string \| HTMLElement, html: string): VisualEditorSelection \| null</code> | Replace the selected element with markup - the markup of a state, as a component's render() gives it - and select the new element. Its ids keep their names (the element they named is the one replaced); a locked root stays locked; a locked part is refused (replace its unit). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr><tr><td><code>html</code></td><td><code>string</code></td><td>the markup of one element</td></tr></table> <b>Returns</b> <code>VisualEditorSelection \| null</code> - the new selection, null when nothing was replaced |
| <code>undo(target: string \| HTMLElement): boolean</code> | Undo the last change. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - true when there was a change to undo |
| <code>redo(target: string \| HTMLElement): boolean</code> | Redo the last undone change. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - true when there was a change to redo |
| <code>outline(target: string \| HTMLElement): VisualEditorNode[]</code> | The page's element tree - what a layers view (Tree View) shows. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr></table> <b>Returns</b> <code>VisualEditorNode[]</code> - one node per top-level element, [] before the editor is ready |
| <code>editor(target: string \| HTMLElement): unknown</code> | The GrapesJS editor behind an element, for anything this API does not cover. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .visual-editor element or its selector</td></tr></table> <b>Returns</b> <code>unknown</code> - the editor, or undefined before it mounted |

### Events

| Event | Description |
|---|---|
| `visual-editor-change` | Fires after the page changed (a drop, a move, an apply(), undo) - debounced 200 ms, with the page markup. <code>detail</code>: <code>VisualEditorChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>html</code></td><td><code>string</code></td><td>the page markup after the change (html())</td></tr></table> |
| `visual-editor-ready` | Fires once the editor mounted the page - the markup it started with. <code>detail</code>: <code>VisualEditorReadyDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>html</code></td><td><code>string</code></td><td>the page markup the editor started with</td></tr></table> |
| `visual-editor-select` | Fires when the selection changes - the selected element, or null when it was cleared. <code>detail</code>: <code>VisualEditorSelectDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>selection</code></td><td><code>VisualEditorSelection \| null</code></td><td>the selected element, or null when the selection was cleared</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `VisualEditorChange` | A change to the selected element. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>attributes?</code></td><td><code>Record&lt;string, string \| null&gt;</code></td><td>attributes to set; null removes one (on* handlers and javascript: / data: / vbscript: URLs are refused)</td></tr><tr><td><code>classes?</code></td><td><code>string[]</code></td><td>the classes, replacing the element's</td></tr><tr><td><code>text?</code></td><td><code>string</code></td><td>the text of a text-only element (written as text, never parsed as markup)</td></tr></table> |
| `VisualEditorChangeDetail` | What visual-editor-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>html</code></td><td><code>string</code></td><td>the page markup after the change (html())</td></tr></table> |
| `VisualEditorDevice` | The canvas widths the editor previews - the HTML Preview Editor's devices. = <code>'desktop' \| 'tablet' \| 'phone'</code> |
| `VisualEditorNode` | One element of the page outline - the tree a layers view shows. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>path</code></td><td><code>string</code></td><td>where it sits (the path select() takes)</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>the tag, its id (one the markup gave it) or first class: `section.card`, `input#email`</td></tr><tr><td><code>children</code></td><td><code>VisualEditorNode[]</code></td><td>its child elements</td></tr></table> |
| `VisualEditorReadyDetail` | What visual-editor-ready carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>html</code></td><td><code>string</code></td><td>the page markup the editor started with</td></tr></table> |
| `VisualEditorSelectDetail` | What visual-editor-select carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>selection</code></td><td><code>VisualEditorSelection \| null</code></td><td>the selected element, or null when the selection was cleared</td></tr></table> |
| `VisualEditorSelection` | The selected element, as the editor holds it. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>path</code></td><td><code>string</code></td><td>where it sits: child indexes from the page root, dot-joined ("0.2" = the third child of the first element)</td></tr><tr><td><code>tag</code></td><td><code>string</code></td><td>its tag name, lowercase</td></tr><tr><td><code>attributes</code></td><td><code>Record&lt;string, string&gt;</code></td><td>its attributes as the markup has them, except class (id, data-*, aria-*, ...) - never an id the editor made</td></tr><tr><td><code>classes</code></td><td><code>string[]</code></td><td>its classes, in order</td></tr><tr><td><code>text</code></td><td><code>string \| null</code></td><td>its text when it holds text only (a heading, a button label), else null</td></tr><tr><td><code>unit</code></td><td><code>string \| null</code></td><td>the path of the locked unit it belongs to (lock() - the element itself or an ancestor), null when it is free</td></tr></table> |

## Notes

- **Vendor, pinned**: `grapesjs@0.23.6` (BSD-3-Clause) - its UMD build `dist/grapes.min.js`, imported as a module (it installs `globalThis.grapesjs`), and `dist/css/grapes.min.css`, from jsDelivr, never `@latest`. `df$.shadcn.visualEditor.load(url, css)` loads a self-hosted copy. A page without an editor never requests them.
- **No telemetry**: GrapesJS reports the page's domain to app.grapesjs.com by default on every host but localhost; the component turns that off (`telemetry: false`).
- **The markup comes back**: `html()` returns the markup the skills document - inline styles stay on their element (GrapesJS would move them into `#id` rules by default), `<video>` and `<iframe>` keep exactly the attributes written. The e2e runs every component's documented markup through the editor.
- **Nothing that runs gets in**: every markup that enters - the source, `setHtml()`, `insert()`, `replace()`, a dragged block - is cleaned first: `<script>`, `<base>`, `<meta>`, `<object>`, `<embed>` and frames go, and so do `on*` handlers, `srcdoc`, URLs that run code (`javascript:`, `vbscript:`, a `data:` URL that is not an image - also when written ` JAVA&#9;SCRIPT:`, which a browser repairs and runs) and SVG animations of an `href`, in a template's content too. GrapesJS's own parser kept `srcdoc`: an iframe's script ran with the host page's origin. `apply()` refuses the same attributes and URLs. The page goes in and out as HTML only - GrapesJS's project JSON would bypass the cleaner.
- **No scripts in the canvas**: components show their markup there, as written - a chart or a diagram stays empty until it runs. Run the page in the HTML Preview Editor (`df$.shadcn.codeExample.setSource(card, html)`) to see it working; the Studio does.
- **Canvas styles**: the canvas loads the host page's stylesheets (`<link>`s by URL, `<style>`s as text), so it shows the page in the host's theme; the host's dark mode reaches it.
- **Ids**: markup inserted twice gets free ids (`email` → `email-2`); every reference moves with them - `for`, `aria-*`, `popovertarget`, `commandfor`, `href="#…"`, `data-*` values naming an id - so two inserted forms keep two working labels.
- **Locked units**: `lock(target, path)` makes an element one unit - it moves, copies and goes as a whole; nothing drops into it, and nothing inside it is edited, moved, copied or removed (its parts stay selectable, `selection().unit` names their unit). It is meant for a stateful component: its markup is what its `render()` gives for a state, so an edit of its DOM would be gone with the next render. Change it through the state instead - `replace(target, html)` swaps the selected element for `df$.shadcn.{name}Api.render(state)`'s markup and keeps the lock. The lock lives in the editor (never in the markup); an Undo keeps it; `lock(target, path, false)` releases it.
- **Styles of the page**: a `<style>` in the markup is applied in the canvas but kept as CSS rules - `html()` leaves it out, `css()` returns it (`@media` and `@layer` included). Keep a page as `html()` plus `<style>` with `css()`: `setHtml()` reads both back.
- **A block that shows itself in a frame**: WebKit, Safari's engine, cancels the drag of an element that holds an `<iframe>` (seen in Playwright's WebKit build) - Chromium and Firefox carry it. Put `draggable="true"` on a part laid over the frame, not on the element around it: a drag takes the markup of the closest `data-visual-editor-block`, so the part needs no markup of its own. The Studio's example previews have such a grip.
- **Sandboxed previews**: GrapesJS's canvas is an iframe it writes into, which an opaque-origin sandbox forbids: a sandboxed frame needs `allow-same-origin` (the docs examples use `sandbox="editor"`).
- **Keyboard**: blocks and controls are buttons; the canvas itself is GrapesJS's and is driven by the pointer.
- The skill does not restate GrapesJS's API: `df$.shadcn.visualEditor.editor(el)` returns the instance for anything beyond this surface.
