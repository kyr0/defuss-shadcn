---
name: Formula Editing
type: MOL
section: math
why: The official MathLive editor, loaded on the first editor, over a native textarea that stays the form control - submission, reset, required and disabled are the browser's; without JavaScript the textarea edits the TeX.
when: Formula input in forms, papers and teaching tools - to show a formula use math-renderer, to compute with it use math-compute.
where: dist/components/math.css + dist/components/math.js (the extra bundle of the Math section - load it after all.css / all.js; per component: dist/components/math-editor/math-editor.css + math-editor.js)
supportedStates: default, readonly, disabled, invalid, keyboard-open
---

# Pattern: Formula Editing

## Native basis

A `<textarea class="math-editor-source">` holding the formula's TeX, inside a
`.math-editor` with its `<label>`. Without JavaScript - or when MathLive cannot
load - the textarea is the editor. With MathLive, a `<math-field>` edits the
formula and the textarea steps aside (CSS) but keeps the value: it stays the
form control, so submission, reset, `required`, `readonly` and `disabled` are
the browser's.

## Native Web APIs

- [`<textarea>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea) - the form control: its value is submitted, a form reset restores its text
- [Constraint validation](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - `required`, `setCustomValidity()` for an unfinished placeholder or a syntax error, the `invalid` event
- [Custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) / [`::part()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part) - MathLive's `<math-field>`, themed through its parts and custom properties
- [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) - MathLive loads only when a page has an editor
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - the validation message (`role="alert"`)
- [`field-sizing: content`](https://developer.mozilla.org/en-US/docs/Web/CSS/field-sizing) - the fallback textarea grows with the formula
- [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - the field keeps its border and focus in high contrast

---

## Structure

```html
<form>
  <div class="math-editor" id="area-editor" data-math-preview="area-preview">
    <label class="label" for="area-source">Area of a circle</label>
    <textarea class="math-editor-source" id="area-source" name="area" required>A = \pi r^2</textarea>
    <div class="math-editor-tools" role="group" aria-label="Formula tools">
      <button type="button" class="btn" data-variant="outline" data-size="sm" data-math-command="fraction">Fraction</button>
      <button type="button" class="btn" data-variant="outline" data-size="sm" data-math-command="power">Power</button>
      <button type="button" class="btn" data-variant="outline" data-size="sm" data-math-command="root">Root</button>
      <button type="button" class="btn" data-variant="ghost" data-size="sm" data-math-command="undo">Undo</button>
      <button type="button" class="btn" data-variant="ghost" data-size="sm" data-math-command="keyboard">Keyboard</button>
    </div>
  </div>
  <figure class="math-renderer" id="area-preview" aria-label="Preview">
    <code class="math-renderer-source">A = \pi r^2</code>
  </figure>
  <button class="btn" type="submit">Save</button>
</form>
```

- The `<label for>` names the field (MathLive's `<math-field>` gets it as its
  `aria-label`).
- `data-math-command` buttons (any element inside the editor): `fraction`,
  `power`, `subscript`, `root` (wrap the selection in a template), `undo`,
  `redo`, `keyboard` (toggle the virtual keyboard). Focus returns to the field.
- `data-math-preview="<id ...>"` keeps those Formula Rendering elements
  showing the formula as it is typed (empty placeholders left out).
- The authored textarea names the starting state: `disabled` → `disabled`,
  `readonly` → `readonly`.

## Variants

None - the editor takes the width of its container; the toolbar is optional.

## Loading

The component ships **no MathLive code**. The first editor on a page imports
the official ESM build once:

`https://cdn.jsdelivr.net/npm/mathlive@0.111.0/mathlive.min.mjs`

(pinned - never `@latest`; its fonts load from `fonts/` beside it; sounds and
MathLive's Compute Engine link are off). To self-host the same build:

```html
<meta name="math-editor-module" content="/vendor/mathlive/mathlive.min.mjs">
```

or call `df$.shadcn.mathEditor.load(url)` before editors mount. While it loads,
and if it fails (`data-error` on the editor), the textarea edits the TeX.

## Validation

Typing never marks an unfinished formula. An empty placeholder (after a
Fraction, say) or a syntax error sets the textarea's custom validity; the
browser's `invalid` event - on submit, or `df$.shadcn.mathEditor.validate(el)` -
puts the editor into `invalid` with the message, and focus goes to the field.
The first valid edit leaves `invalid` again.

## Virtual keyboard

MathLive has one virtual keyboard per window. The editor in `keyboard-open`
shows it in its own container below the field (themed from the tokens through
MathLive's `--keyboard-*` / `--keycap-*` properties); when another editor
opens it, the first one returns to `default`. MathLive's own keyboard and
menu toggles are hidden - the `keyboard` command and the state are the way in.

## ARIA

| Attribute | Where | Why |
| --- | --- | --- |
| `<label for>` | the textarea's label | names the field (MathLive gets it as `aria-label`) |
| `aria-invalid="true"` | the textarea and the field, in `invalid` | the formula failed validation |
| `role="alert"` | `.math-editor-message` (generated) | announces the validation message |
| `aria-describedby` | the field → `<textarea id>-message` | the message describes the field |
| `role="group"` + `aria-label` | `.math-editor-tools` | names the toolbar's buttons |

## Notes

- `df$.shadcn.mathEditor.setValue(el, latex)` sets the formula (an unchanged
  value keeps the caret and the undo history); `command(el, name)` runs a
  command; `validate(el)` checks it like a submission.
- Every edit dispatches `math-input` (bubbles) with the TeX and whether it is
  complete.
- The field and the keyboard are runtime chrome (`data-ce-chrome`); the
  HTML Preview Editor shows the textarea with the formula as typed.
- MathLive's undo history and an IME composition in progress live in the
  field; they are not part of the state.

## States

| State | Meaning |
| --- | --- |
| `default` | Editable (the field once MathLive loaded, else the textarea) |
| `readonly` | Selectable and copyable, not editable - not validated |
| `disabled` | Not editable, not focusable, not submitted |
| `invalid` | Failed validation: `aria-invalid` and the message under the field |
| `keyboard-open` | Editable, with the virtual keyboard open below the field |

```js
const ed = document.querySelector('#area-editor');
ed.api.setState('keyboard-open');                   // the keyboard opens below this field
ed.api.setState('invalid', { message: 'Use r for the radius.' });
ed.api.setState('default', { latex: 'A = \\pi r^2' });
ed.api.getState(); // { name: 'default', config: { latex: 'A = \\pi r^2', message: '' } }
```

The registry global is `df$.shadcn.mathEditorApi` / `df$.shadcn.mathEditorStates`;
the imperative API is `df$.shadcn.mathEditor.{ load, setValue, command, validate, url }`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type MathEditorState = 'default' | 'readonly' | 'disabled' | 'invalid' | 'keyboard-open'</code> - `setState(name, config)` takes the config of the state it names (`MathEditorStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Editable - the MathLive field once it loaded (data-ready on the editor), else the textarea. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the formula as TeX (default: the textarea's text)</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>'invalid': the message shown (default: "Enter a complete formula.")</td></tr></table> |
| `readonly` | Selectable and copyable, not editable (the textarea's readonly; not validated). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the formula as TeX (default: the textarea's text)</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>'invalid': the message shown (default: "Enter a complete formula.")</td></tr></table> |
| `disabled` | Not editable, not focusable, not submitted (the textarea's disabled). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the formula as TeX (default: the textarea's text)</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>'invalid': the message shown (default: "Enter a complete formula.")</td></tr></table> |
| `invalid` | Failed validation: aria-invalid on the textarea and the message under the field. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the formula as TeX (default: the textarea's text)</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>'invalid': the message shown (default: "Enter a complete formula.")</td></tr></table> |
| `keyboard-open` | Editable, with the virtual keyboard open below the field. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the formula as TeX (default: the textarea's text)</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>'invalid': the message shown (default: "Enter a complete formula.")</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends MathEditorState&gt;(name: S, config?: MathEditorStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MathEditorStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: MathEditorState; config: MathEditorStateConfigs[MathEditorState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: MathEditorState; config: MathEditorStateConfigs[MathEditorState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: MathEditorState; config: MathEditorStateConfigs[MathEditorState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: MathEditorState; config: MathEditorStateConfigs[MathEditorState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: MathEditorState; config: MathEditorStateConfigs[MathEditorState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.mathEditorApi.setState&lt;S extends MathEditorState&gt;(el: HTMLElement, name: S, config?: MathEditorStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MathEditorStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.mathEditorApi.getState(el: HTMLElement): { name: MathEditorState; config: MathEditorStateConfigs[MathEditorState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: MathEditorState; config: MathEditorStateConfigs[MathEditorState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.mathEditorApi.render(state: { name: MathEditorState; config: MathEditorStateConfigs[MathEditorState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: MathEditorState; config: MathEditorStateConfigs[MathEditorState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.mathEditorApi.store(el: HTMLElement): Store&lt;{ name: MathEditorState; config: MathEditorStateConfigs[MathEditorState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: MathEditorState; config: MathEditorStateConfigs[MathEditorState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.mathEditorApi.commit&lt;S extends MathEditorState&gt;(el: HTMLElement, name: S, config?: MathEditorStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>MathEditorStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.mathEditorStates: MathEditorState[]</code> | The declared states, 'default' first: <code>default</code>, <code>readonly</code>, <code>disabled</code>, <code>invalid</code>, <code>keyboard-open</code>. |

### `df$.shadcn.mathEditor`

| Member | Description |
|---|---|
| <code>load(url?: string): Promise&lt;MathliveLike&gt;</code> | Import the official MathLive ESM once. Without `url`: &lt;meta name="math-editor-module"&gt;, else the pinned jsDelivr build. A failed import can be retried (the next call imports again). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>url?</code></td><td><code>string</code></td><td>a module URL to import instead (the same build, self-hosted - its fonts/ folder beside it)</td></tr></table> <b>Returns</b> <code>Promise&lt;MathliveLike&gt;</code> - MathLive, imported once per URL |
| <code>setValue(el: HTMLElement \| string, latex: string): void</code> | Set the formula (an unchanged value keeps the caret and the undo history). Reports `math-input`. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-editor element, or a selector for it</td></tr><tr><td><code>latex</code></td><td><code>string</code></td><td>the formula as TeX</td></tr></table> |
| <code>command(el: HTMLElement \| string, name: string): void</code> | Run an editing command on the field - the toolbar's `data-math-command` buttons call it. Focus returns to the field; an editor that is readonly or disabled ignores it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-editor element, or a selector for it</td></tr><tr><td><code>name</code></td><td><code>string</code></td><td>'fraction', 'power', 'subscript', 'root' (wrap the selection), 'undo', 'redo' or 'keyboard' (toggle the virtual keyboard)</td></tr></table> |
| <code>validate(el: HTMLElement \| string): boolean</code> | Check the formula like a form submission would: an invalid one enters 'invalid' with the message. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-editor element, or a selector for it</td></tr></table> <b>Returns</b> <code>boolean</code> - true when the formula is valid (required and complete, no syntax error) |
| <code>url: string</code> | The pinned official MathLive build the component loads (never @latest); its fonts load relative to it. |

### Events

| Event | Description |
|---|---|
| `math-input` | the formula changed - a preview, a form or a compute panel follows it <code>detail</code>: <code>MathInputDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex</code></td><td><code>string</code></td><td>the formula as TeX (empty placeholders included)</td></tr><tr><td><code>complete</code></td><td><code>boolean</code></td><td>false while an empty placeholder is left</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `MathEditorConfig` | An editor's state: every field optional in setState() (merged into the current one); getState() reports both. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the formula as TeX (default: the textarea's text)</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>'invalid': the message shown (default: "Enter a complete formula.")</td></tr></table> |
| `MathInputDetail` | The `math-input` event's detail: the formula after an edit. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex</code></td><td><code>string</code></td><td>the formula as TeX (empty placeholders included)</td></tr><tr><td><code>complete</code></td><td><code>boolean</code></td><td>false while an empty placeholder is left</td></tr></table> |
| `MathliveLike` | The part of the official MathLive module this component uses. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>MathfieldElement</code></td><td><code>typeof MathfieldElement</code></td><td>the &lt;math-field&gt; element class (its statics configure fonts, sounds and the Compute Engine)</td></tr><tr><td><code>initVirtualKeyboardInCurrentBrowsingContext</code></td><td><code>() =&gt; void</code></td><td>give this browsing context its own virtual keyboard - in a frame MathLive otherwise proxies to the top window's</td></tr></table> |
