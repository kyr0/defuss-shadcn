---
name: HTML Preview Editor
type: MOL
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

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.codeExampleApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.codeExampleStates` = `default`, `code`, `state`, `fullscreen`.

### `df$.shadcn.codeExample`

| Member | Description |
|---|---|
| `configure(options = {})` | Configure every preview on the page: { styles, scripts } (arrays of URLs or { css } / { js } texts, or a function of the source returning one - default: the page's own stylesheets and all/core bundle), tail (markup after the runtime, e.g. an icon library), theme (CSS text or a function returning it - layered last, re-read by refreshTheme), highlight(code, language) → HTML of coloured spans (default: Shiki), shiki (its ESM URL), themes ({ light, dark } Shiki themes). Previews built afterwards use it. |
| `source(target)` | The card's current source. |
| `setSource(target, source)` | Replace the source and rerun the preview (the state stays; data-edited follows). |
| `reset(target)` | Back to the authored source, rerun. |
| `run(target)` | Rebuild the preview from the current source now. |
| `viewport(target, mode)` | Switch the preview device: 'phone' \| 'tablet' \| 'desktop' \| 'full'. |
| `setPreviewState(target, name, value)` | Drive a state of the previewed component (a state of its schema) - the State tab's controls do the same. |
| `previewState(target)` | The previewed component's observed state values (as the State tab shows them). |
| `refreshTheme()` | Re-read the configured theme and hand it to every preview (no rebuild - the previews keep their state). |
| `highlight(code, language)` | The configured highlighter: code and a language → a Promise of HTML (coloured spans), or null. |
| `copy(target)` | Copy the card's source to the clipboard - resolves true when the clipboard took it. |

### Events

| Event | `detail` | Description |
|---|---|---|
| `code-example-change` | `source`, `origin` | Fires after the source changed and the preview reran - typing (debounced), setSource(), reset(), setState() with a { source }; the source and where the change came from: 'input' or 'api'. |
| `code-example-error` | `message`, `stack` | The preview reported an error - the source's own script threw, or failed to load - or the preview could not be built. |
| `code-example-ready` | `source` | The preview finished loading the source - its state can be driven (el.preview) from now on. |

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
