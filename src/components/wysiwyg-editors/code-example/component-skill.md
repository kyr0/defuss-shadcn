---
name: HTML Preview Editor
type: MOL
section: wysiwyg-editors
why: One source, two views - the <textarea> you edit is the srcdoc the sandboxed <iframe> runs, so the code shown and the code run cannot differ; the preview runs in an opaque origin, device emulation is CSS zoom over a real viewport, highlighting is Shiki.
when: Live, editable HTML examples - a design-system docs site, a playground, a template editor with a preview. Showing code without running it is a code block or mockup-code; a plain text field is textarea.
where: dist/components/wysiwyg.css + dist/components/wysiwyg.js (the extra bundle - load it after all.css / all.js; per component: dist/components/code-example/code-example.css + code-example.js)
supportedStates: default, code, state, fullscreen
---

# Pattern: HTML Preview Editor

## Native basis

A `<div class="code-example">` around one `<textarea>` holding the HTML
source. The runtime builds the card around it - a stage with a sandboxed
`<iframe srcdoc>` inside a device frame (the shipped `resizer` gives it handles
on every side), a toolbar (Phone / Tablet / Desktop / Full, Rotate, width ×
height, zoom, Code / State tabs, Reset, Fullscreen) and the Code panel, where
the textarea sits over an `aria-hidden` paint layer that Shiki colours. The
preview is rebuilt from the textarea 400 ms after typing stops; nothing else
feeds it.

The **extra bundle**: the component is NOT part of `all.css` / `all.js` - the
page adds `wysiwyg.css` and `wysiwyg.js` after them (or after `core.css` /
`core.js` + its components). The preview runs the same design system: by
default it loads the page's own stylesheets and inlines the page's `all.js`
(or `core.js`), so components work inside it.

---

## Native Web APIs
- [`<iframe srcdoc sandbox>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox) - the preview: an opaque origin (`allow-scripts allow-forms`), so an edited source cannot touch the page
- [`postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) - the bridge between card and preview, one channel id per card
- [`<textarea>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea) - the editable source: undo, selection and assistive tech are native
- [CSS `zoom`](https://developer.mozilla.org/en-US/docs/Web/CSS/zoom) - device boxes shrink to the card while the iframe keeps its declared viewport width (media queries inside stay honest)
- [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) - the whole card fills the screen (a fixed overlay where the page may not go fullscreen)
- [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) - previews boot near the viewport (the rest once the page is idle)
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - the preview reports its true content height; fullscreen refits
- [`checkVisibility()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility) - the source paints when the Code panel opens
- [Dynamic `import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) - Shiki (pinned ESM) loads on the first paint
- [`Clipboard API`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) - Copy
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `code-example-change`, `code-example-ready`, `code-example-error`
- [WCAG 2.1.2 No Keyboard Trap](https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html) - Tab indents, Escape then Tab leaves
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

```html
<link rel="stylesheet" href="components/all.css">
<link rel="stylesheet" href="components/wysiwyg.css">
<script type="module" src="components/all.js"></script>
<script type="module" src="components/wysiwyg.js"></script>

<div class="code-example" aria-label="Switch example">
  <textarea>
<label class="switch-label"><input type="checkbox" class="switch" role="switch"> Wi-Fi</label>
  </textarea>
</div>
```

The runtime builds the rest. A page that renders the card on the server
(as this site does) authors the whole shell instead - the runtime finds
`.code-example-toolbar` and builds nothing:

```html
<div class="code-example">
  <div class="code-example-stage">
    <div class="code-example-screen" data-mode="full">
      <div class="resizer code-example-resizer" data-handles="all" data-resize-mode="controlled" data-axis="both" data-min="240" data-max="1600" data-min-h="240" data-max-h="1400">
        <div class="code-example-device">
          <iframe class="code-example-frame" sandbox="allow-scripts allow-forms" allow="clipboard-write" title="Preview"></iframe>
          <span class="code-example-device-island" aria-hidden="true"></span>
          <span class="code-example-device-home" aria-hidden="true"></span>
        </div>
      </div>
    </div>
    <output class="code-example-error" role="alert" hidden></output>
    <button type="button" class="code-example-full-exit" aria-label="Exit fullscreen">…</button>
  </div>
  <div class="code-example-toolbar">
    <span class="code-example-viewport" role="group" aria-label="Preview device">
      <button type="button" class="code-example-vp" data-vp="rotate" aria-disabled="true">…</button>
      <button type="button" class="code-example-vp" data-vp="phone" aria-pressed="false">…</button>
      <button type="button" class="code-example-vp" data-vp="tablet" aria-pressed="false">…</button>
      <button type="button" class="code-example-vp" data-vp="desktop" aria-pressed="false">…</button>
      <button type="button" class="code-example-vp" data-vp="full" aria-pressed="true">…</button>
    </span>
    <span class="code-example-sep" aria-hidden="true"></span>
    <span class="code-example-size">
      <input class="code-example-vp-w" type="number" aria-label="Custom preview width (px)">
      <span class="code-example-vp-x" aria-hidden="true">×</span>
      <input class="code-example-vp-h" type="number" aria-label="Custom preview height (px)" disabled>
    </span>
    <span class="code-example-sep" aria-hidden="true"></span>
    <span class="code-example-size">
      <input class="code-example-vp-z" type="number" aria-label="Preview zoom (%)">
      <span class="code-example-vp-x" aria-hidden="true">%</span>
    </span>
    <span class="code-example-spacer"></span>
    <button type="button" class="code-example-tab" data-tab="code" aria-pressed="false">…</button>
    <button type="button" class="code-example-tab" data-tab="state" aria-pressed="false">…</button> <!-- with data-schema -->
    <button type="button" class="code-example-reset">…</button>
    <button type="button" class="code-example-full">…</button>
  </div>
  <div class="code-example-panel" data-panel="code" hidden>
    <button type="button" class="code-example-copy">…</button>
    <div class="code-example-editor">
      <div class="code-example-paint" aria-hidden="true"></div>
      <textarea class="code-example-src" spellcheck="false" aria-label="Source" rows="10">…</textarea>
    </div>
  </div>
  <div class="code-example-panel" data-panel="state" hidden></div> <!-- with data-schema -->
</div>
```

The source is the textarea's text: escape only `</textarea>` (as
`&lt;/textarea>`); everything else is literal.

---

## Variants

| Attribute (on `.code-example`) | Behavior |
|-----------|----------|
| `data-schema='{…}'` | A component schema (`dist/schemas/*.schema.json`): adds the State tab, whose controls drive the previewed component and read its state back |
| `data-vp-mode="phone\|tablet\|desktop\|full"` | The device the preview boots in (`full` = the card's width) |
| `data-height="N"` | Minimum preview height in rem - for overlays (dialogs, menus) that do not grow the page |
| `data-preview-style="…"` | Declarations for the preview's `<body>` (the stage): `display:flex;gap:1rem;justify-content:center` |
| `data-language="html\|css\|js\|…"` | The source's language for the colours (default `html`) - any Shiki language |
| `data-sandbox="embed"` | Widens the frame for a third-party player (same origin, autoplay, fullscreen) - the one opt-out of the opaque origin |
| `data-sandbox="links"` | Lets links in the preview open a new tab |
| `aria-label` | The preview frame's title |

---

## Keyboard

| Key | Does |
|-----|------|
| Tab / Shift + Tab (in the source) | Indent / outdent the selected lines |
| Escape, then Tab | Leave the source (no keyboard trap) |
| Enter (in the source) | A new line with the current line's indentation |
| Escape | Leave fullscreen |

---

## States

| State | Meaning |
|-------|---------|
| `default` | The preview alone - both panels closed |
| `code` | The source is open (and painted) |
| `state` | The state controls are open (cards with `data-schema`; without one it lands in `default`) |
| `fullscreen` | The card fills the screen - `data-fullscreen`; `config.panel` keeps a panel open below the stage |

Every state's config carries `source` - the textarea's value. Setting it
reruns the preview; `data-edited` marks a source that differs from the authored one.

```js
const card = document.querySelector('#playground');
card.api.setState('code');                                  // open the source
card.api.setState('fullscreen', { panel: 'code' });         // fullscreen, source below the stage
card.api.getState();                                        // { name, config: { source, … } }
df$.shadcn.codeExample.setSource(card, '<p>Hello</p>');     // replace + rerun
card.addEventListener('code-example-change', (e) => save(e.detail.source));
card.preview.setState('open');                              // a state of the PREVIEWED component (data-schema)
```

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type CodeExampleState = 'default' | 'code' | 'state' | 'fullscreen'</code> - `setState(name, config)` takes the config of the state it names (`CodeExampleStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The preview alone - both panels closed. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source?</code></td><td><code>string</code></td><td>replace the source and rerun the preview (getState() reports the source now)</td></tr></table> |
| `code` | The source editor is open (and painted). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source?</code></td><td><code>string</code></td><td>replace the source and rerun the preview</td></tr></table> |
| `state` | The state controls are open (a card with data-schema; without one it lands in default). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source?</code></td><td><code>string</code></td><td>replace the source and rerun the preview</td></tr></table> |
| `fullscreen` | The card fills the screen (data-fullscreen). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source?</code></td><td><code>string</code></td><td>replace the source and rerun the preview</td></tr><tr><td><code>panel?</code></td><td><code>'code' \| 'state' \| null</code></td><td>the panel kept open below the stage, null for none</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends CodeExampleState&gt;(name: S, config?: CodeExampleStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>CodeExampleStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: CodeExampleState; config: CodeExampleStateConfigs[CodeExampleState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: CodeExampleState; config: CodeExampleStateConfigs[CodeExampleState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: CodeExampleState; config: CodeExampleStateConfigs[CodeExampleState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: CodeExampleState; config: CodeExampleStateConfigs[CodeExampleState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: CodeExampleState; config: CodeExampleStateConfigs[CodeExampleState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.codeExampleApi.setState&lt;S extends CodeExampleState&gt;(el: HTMLElement, name: S, config?: CodeExampleStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>CodeExampleStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.codeExampleApi.getState(el: HTMLElement): { name: CodeExampleState; config: CodeExampleStateConfigs[CodeExampleState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: CodeExampleState; config: CodeExampleStateConfigs[CodeExampleState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.codeExampleApi.render(state: { name: CodeExampleState; config: CodeExampleStateConfigs[CodeExampleState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: CodeExampleState; config: CodeExampleStateConfigs[CodeExampleState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.codeExampleApi.store(el: HTMLElement): Store&lt;{ name: CodeExampleState; config: CodeExampleStateConfigs[CodeExampleState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: CodeExampleState; config: CodeExampleStateConfigs[CodeExampleState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.codeExampleApi.commit&lt;S extends CodeExampleState&gt;(el: HTMLElement, name: S, config?: CodeExampleStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>CodeExampleStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.codeExampleStates: CodeExampleState[]</code> | The declared states, 'default' first: <code>default</code>, <code>code</code>, <code>state</code>, <code>fullscreen</code>. |

### `df$.shadcn.codeExample`

| Member | Description |
|---|---|
| <code>configure(options: CodeExampleConfig = {}): void</code> | Configure every preview on the page: { styles, scripts } (arrays of URLs or { css } / { js } texts, or a function of the source returning one - default: the page's own stylesheets and all/core bundle), tail (markup after the runtime, e.g. an icon library), theme (CSS text or a function returning it - layered last, re-read by refreshTheme), highlight(code, language) → HTML of coloured spans (default: Shiki), shiki (its ESM URL), themes ({ light, dark } Shiki themes). Previews built afterwards use it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>options</code></td><td><code>CodeExampleConfig</code> = <code>{}</code></td><td>the keys to change; the cards on the page repaint their source</td></tr></table> |
| <code>source(target: string \| HTMLElement): string</code> | The card's current source. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .code-example card or its selector</td></tr></table> <b>Returns</b> <code>string</code> - the editor's text ('' when the target is not a card) |
| <code>setSource(target: string \| HTMLElement, source: string): void</code> | Replace the source and rerun the preview (the state stays; data-edited follows). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .code-example card or its selector</td></tr><tr><td><code>source</code></td><td><code>string</code></td><td>the new source</td></tr></table> |
| <code>reset(target: string \| HTMLElement): void</code> | Back to the authored source, rerun. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .code-example card or its selector</td></tr></table> |
| <code>run(target: string \| HTMLElement): void</code> | Rebuild the preview from the current source now. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .code-example card or its selector</td></tr></table> |
| <code>viewport(target: string \| HTMLElement, mode: 'phone' \| 'tablet' \| 'desktop' \| 'full'): void</code> | Switch the preview device: 'phone' \| 'tablet' \| 'desktop' \| 'full'. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .code-example card or its selector</td></tr><tr><td><code>mode</code></td><td><code>'phone' \| 'tablet' \| 'desktop' \| 'full'</code></td><td>the device width the preview takes</td></tr></table> |
| <code>setPreviewState(target: string \| HTMLElement, name: string, value: string \| number \| boolean): void</code> | Drive a state of the previewed component (a state of its schema) - the State tab's controls do the same. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .code-example card or its selector</td></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the state's name in the component's schema</td></tr><tr><td><code>value</code></td><td><code>string \| number \| boolean</code></td><td>its new value (the schema's type for it)</td></tr></table> |
| <code>previewState(target: string \| HTMLElement): Record&lt;string, string \| number \| boolean&gt;</code> | The previewed component's observed state values (as the State tab shows them). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .code-example card or its selector</td></tr></table> <b>Returns</b> <code>Record&lt;string, string \| number \| boolean&gt;</code> - a copy of the values the preview reported, by state name |
| <code>refreshTheme(): void</code> | Re-read the configured theme and hand it to every preview (no rebuild - the previews keep their state). |
| <code>highlight(code: string, language: string): Promise&lt;string \| null&gt;</code> | The configured highlighter: code and a language → a Promise of HTML (coloured spans), or null. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>code</code></td><td><code>string</code></td><td>the source text</td></tr><tr><td><code>language</code></td><td><code>string</code></td><td>a Shiki language id ('html', 'css', 'ts', ...)</td></tr></table> <b>Returns</b> <code>Promise&lt;string \| null&gt;</code> - the HTML of coloured spans, null when the highlighter gives none |
| <code>copy(target: string \| HTMLElement): Promise&lt;boolean&gt;</code> | Copy the card's source to the clipboard. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .code-example card or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;boolean&gt;</code> - true when the clipboard took it |

### Events

| Event | Description |
|---|---|
| `code-example-change` | Fires after the source changed and the preview reran - typing (debounced), setSource(), reset(), setState() with a { source }; the source and where the change came from: 'input' or 'api'. <code>detail</code>: <code>CodeExampleChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source</code></td><td><code>string</code></td><td>the source now</td></tr><tr><td><code>origin</code></td><td><code>'input' \| 'api'</code></td><td>'input': typed in the editor; 'api': setSource(), reset() or setState()</td></tr></table> |
| `code-example-error` | The preview reported an error - the source's own script threw, or failed to load - or the preview could not be built. <code>detail</code>: <code>CodeExampleErrorDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>message</code></td><td><code>string</code></td><td>the error message shown under the preview</td></tr><tr><td><code>stack?</code></td><td><code>string</code></td><td>the stack, when the preview's script threw</td></tr></table> |
| `code-example-ready` | The preview finished loading the source - its state can be driven (el.preview) from now on. <code>detail</code>: <code>CodeExampleReadyDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source</code></td><td><code>string</code></td><td>the source the preview ran</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `CodeExampleChangeDetail` | What code-example-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source</code></td><td><code>string</code></td><td>the source now</td></tr><tr><td><code>origin</code></td><td><code>'input' \| 'api'</code></td><td>'input': typed in the editor; 'api': setSource(), reset() or setState()</td></tr></table> |
| `CodeExampleConfig` | What configure() takes - every key optional, kept for every preview built afterwards. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>styles?</code></td><td><code>CodeExampleStyle[] \| ((source: string) =&gt; CodeExampleStyle[] \| Promise&lt;CodeExampleStyle[]&gt;) \| null</code></td><td>the previews' stylesheets, or a function of the source returning them (default: the page's own stylesheets)</td></tr><tr><td><code>scripts?</code></td><td><code>CodeExampleScript[] \| ((source: string) =&gt; CodeExampleScript[] \| Promise&lt;CodeExampleScript[]&gt;) \| null</code></td><td>the previews' scripts, or a function of the source returning them (default: the page's all / core bundle, inlined)</td></tr><tr><td><code>tail?</code></td><td><code>string \| ((source: string) =&gt; string)</code></td><td>markup after the runtime (an icon library), or a function of the source returning it</td></tr><tr><td><code>theme?</code></td><td><code>string \| (() =&gt; string \| Promise&lt;string&gt;) \| null</code></td><td>theme CSS layered last in every preview, or a function returning it - refreshTheme() re-reads it</td></tr><tr><td><code>highlight?</code></td><td><code>((code: string, language: string) =&gt; string \| null \| Promise&lt;string \| null&gt;) \| null</code></td><td>your own highlighter: code and a language → the HTML of coloured spans (null: show it plain)</td></tr><tr><td><code>shiki?</code></td><td><code>string</code></td><td>the ESM URL Shiki is imported from (the default highlighter)</td></tr><tr><td><code>themes?</code></td><td><code>{ light: string; dark: string }</code></td><td>the Shiki themes for light and dark</td></tr></table> |
| `CodeExampleErrorDetail` | What code-example-error carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>message</code></td><td><code>string</code></td><td>the error message shown under the preview</td></tr><tr><td><code>stack?</code></td><td><code>string</code></td><td>the stack, when the preview's script threw</td></tr></table> |
| `CodeExampleReadyDetail` | What code-example-ready carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>source</code></td><td><code>string</code></td><td>the source the preview ran</td></tr></table> |
| `CodeExampleScript` | A script for the previews: a URL (fetched once), or JS text. = <code>string \| { js: string }</code> |
| `CodeExampleStyle` | A stylesheet for the previews: a URL, or CSS text. = <code>string \| { css: string }</code> |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| `.code-example-frame` | `title` | From the card's `aria-label` (default "Preview") |
| `.code-example-src` | `aria-label` or `<label for>` | The textarea is what assistive tech reads |
| `.code-example-paint` | `aria-hidden="true"` | Presentation only |
| `.code-example-tab` / `.code-example-vp` | `aria-pressed` | The open panel / the device |
| `.code-example-viewport` | `role="group"` + `aria-label` | The device buttons |
| `.code-example-error` | `role="alert"` | A preview error is announced |
| `.code-example-full-exit` | `aria-label` | Icon-only |

---

## Notes
- **The preview's assets**: `df$.shadcn.codeExample.configure({ styles, scripts, tail, theme })`
  replaces the discovery - inline texts (`{ css }`, `{ js }`) avoid a request per
  preview, `tail` adds markup after the runtime (an icon library), `theme` is
  layered last and `refreshTheme()` pushes a new one into every running preview.
  Scripts run as classic scripts in their own function scope, so a bundle must
  be import-free (`all.js`, `core.js`, `wysiwyg.js` are).
- **Highlighting** is Shiki (`https://esm.sh/shiki@3.0.0`, loaded on the first
  paint; `github-light` / `github-dark`, following `.dark`). `configure({ highlight })`
  plugs in any other highlighter: `(code, language) → HTML of coloured spans`.
- **Nesting**: a source that contains a `.code-example` gets `wysiwyg.js` and
  the page's assets handed down - the previews of this page are such nested cards.
- **Dark mode and themes** follow the page without rebuilding a preview (the
  running example keeps its state).
- **Forms and links** inside the preview run their handlers; a submit never
  navigates the preview away (`method="dialog"` still closes a dialog), a link
  never leaves it (a fragment jumps in place).
- The `resizer` component (in `all.js`) supplies the handles; without it the
  width / height fields still size the preview.
- This site's live examples are this component: every ` ```html example ` fence
  renders a card, the State tab generated from the component's schema.
