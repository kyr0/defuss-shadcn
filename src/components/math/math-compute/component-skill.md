---
name: Compute & Explain
type: MOL
section: math
why: The official Cortex Compute Engine in a dedicated Worker the component starts from its own source - simplify, solve, differentiate, compare, evaluate - with the engine's own steps, every condition the input needs, and a deadline that terminates the worker.
when: Showing how a result comes about in papers and teaching pages, or checking an identity - to only show a formula use math-renderer, to edit one use math-editor.
where: dist/components/math.css + dist/components/math.js (the extra bundle of the Math section - load it after all.css / all.js; per component: dist/components/math-compute/math-compute.css + math-compute.js)
supportedStates: default, computing, result, explaining, unsupported, error
---

# Pattern: Compute & Explain

## Native basis

A `<section>` holding a native form: a `<textarea class="math-compute-source">`
with the TeX, an operation `<select data-math-operation>`, and Compute /
Cancel buttons. Every computation runs in a dedicated
[Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker) the
component starts from its own source; the result is the engine's own record,
shown with Formula Rendering elements and Badges and kept as plain JSON in
the state.

## Native Web APIs

- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) - the engine runs off the main thread; `terminate()` is the only way to stop a symbolic computation
- [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) + [`URL.createObjectURL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) - the worker starts from the component's own source, so it needs no file and runs inside a sandboxed frame too
- [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) - the worker loads the engine on the first computation
- [`<output role="status">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - "Computing ...", errors and unsupported input are announced
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - the whole record as JSON, folded
- [`aria-current="step"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) - the step shown in the step list
- [`field-sizing: content`](https://developer.mozilla.org/en-US/docs/Web/CSS/field-sizing) - the input grows with the expression

---

## Structure

```html
<section class="math-compute" aria-label="Simplify a rational expression">
  <label class="label" for="cancel-source">Expression</label>
  <textarea class="math-compute-source" id="cancel-source">\frac{x^2-1}{x-1}</textarea>
  <div class="math-compute-tools">
    <select class="select" data-math-operation aria-label="Operation">
      <option value="simplify" selected>Simplify</option>
      <option value="evaluate">Evaluate</option>
      <option value="approximate">Approximate</option>
      <option value="solve">Solve for x</option>
      <option value="differentiate">Differentiate</option>
      <option value="canonicalize">Canonical form</option>
      <option value="inspect">Inspect</option>
    </select>
    <button class="btn" type="button" data-math-run>Compute</button>
    <button class="btn" type="button" data-variant="outline" data-math-cancel>Cancel</button>
  </div>
</section>
```

- Operations: `simplify`, `evaluate` (exact), `approximate` (numeric, to the
  context's precision), `solve` (one equation, one variable), `differentiate`
  (order 1 to 4), `compare`, `canonicalize`, `inspect` (the input as parsed).
- `compare` takes the other side from an `<input data-math-right>` (or the
  config's `right`) and `comparison`: `identity` (equal for every value -
  default), `value`, `structural`. The engine's answer may be `unknown`.
- `script.math-compute-config` (JSON) sets anything the controls do not:
  `{"operation":"solve","variable":"t","context":{"domain":"real","variables":{"t":"real"},"assumptions":[["Greater","t",0]],"precision":34}}`.
  A `result` in it - an exported record - shows without computing, labeled as
  recorded.
- `data-timeout="ms"` sets the deadline (default 5000, 100 to 60000): a
  computation that takes longer is stopped by terminating the worker.

## The record

A result shows the input and the result side by side, then:

- **Holds where** - the conditions the input needs, read from the input as
  written (a denominator ≠ 0, a real square root's argument ≥ 0, a negative
  power's base ≠ 0) plus the assumed ones. Canonicalization would erase them -
  `x/x` is `1` only where `x ≠ 0`. They are complete for real arithmetic,
  integer powers and square roots; any other input is marked partial.
- **Candidates** (solve) - every root the engine names, also one its solver
  already dropped, substituted into the original equation: accepted,
  rejected or undecided.
- **Steps** - the engine's own explanation (simplify, solve, differentiate):
  its rule id and description, before and after. A step that may add
  solutions (squaring both sides) says so. The canonical rewrite before the
  first step is not traced, and the notices say it.
- **Notices** and the whole record as JSON (`export()` returns it).

The steps are the engine's report, not a proof.

## Loading and security

The component ships **no engine code**. The worker imports the official ESM
build once, on the first computation:

`https://cdn.jsdelivr.net/npm/@cortex-js/compute-engine@0.149.0/dist/esm-min/compute-engine.js`

(pinned - never `@latest`; its chunks load beside it). To self-host, copy the
whole `dist/esm-min/` folder and set

```html
<meta name="math-compute-engine" content="/vendor/compute-engine/esm-min/compute-engine.js">
```

or call `df$.shadcn.mathCompute.engine(url)`. A Content Security Policy must
allow `worker-src blob:` and the engine's origin in `script-src`. Every job
gets a fresh engine (assumptions never leak between computations); inputs
are bounded (64 KiB of TeX, 2 MiB results); assumptions must be comparisons
or memberships; no compiled code, no custom rules, nothing leaves the page.

## Variants

None - the panel is a card; it takes the width of its container.

## ARIA

| Attribute | Where | Why |
| --- | --- | --- |
| `aria-label` | the section | names the panel |
| `aria-busy="true"` | the section, while computing | the result is not there yet |
| `role="status"` | `.math-compute-status` (generated) | announces Computing ..., errors and unsupported input |
| `aria-label="Steps"` | the step list's `<nav>` (generated) | names the step navigation |
| `aria-current="step"` | the step shown | where the explanation is |

## Notes

- `df$.shadcn.mathCompute.run(el, patch?)` computes (a patch first: `latex`,
  `mathJson`, `operation`, `right`, `comparison`, `variable`, `order`,
  `context`); `cancel(el)` stops it; `go(el, step)`, `next(el)`, `prev(el)`
  move through the steps (never computing again); `export(el)` returns the
  record as JSON; `engine(url?)` sets the engine module.
- Every computation's end dispatches `math-result` (bubbles) with the status,
  the record and the message.
- An edit of the input (or of the operation) clears a result it no longer
  belongs to; a result is never computed on load or by reading the state.
- The view, the status line and the formulas in it are runtime chrome
  (`data-ce-chrome`): the HTML Preview Editor shows the form as authored.

## States

| State | Meaning |
| --- | --- |
| `default` | Ready to compute; no result shown |
| `computing` | A job runs in the worker (Cancel stops it); lands in `result`, `unsupported` or `error` |
| `result` | The engine's record: input and result, conditions, candidates, steps |
| `explaining` | One step, before and after (`config.step`) |
| `unsupported` | Outside what the adapter supports for this input (the message says why) |
| `error` | Not computable: invalid TeX, contradictory assumptions, the deadline, the engine not loading |

```js
const p = document.querySelector('#cancel');
await p.api.setState('computing');                          // = df$.shadcn.mathCompute.run(p)
p.api.getState().config.result.conditions;                  // [{ latex: 'x-1\\ne0', origin: 'input', ... }]
p.api.setState('explaining', { step: 0 });                  // the engine's first step
p.api.setState('default', { latex: '\\frac{x}{x}' });       // a new input - the result goes
```

The registry global is `df$.shadcn.mathComputeApi` / `df$.shadcn.mathComputeStates`;
the imperative API is `df$.shadcn.mathCompute.{ run, cancel, go, next, prev, export, engine, url }`.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type MathComputeState = 'default' | 'computing' | 'result' | 'explaining' | 'unsupported' | 'error'</code> - `setState(name, config)` takes the config of the state it names (`MathComputeStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Ready to compute; no result shown. An edit of the input returns here. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the input as TeX (default: the textarea's text)</td></tr><tr><td><code>mathJson?</code></td><td><code>MathJson \| null</code></td><td>the input as MathJSON instead of TeX (null: use the TeX)</td></tr><tr><td><code>operation?</code></td><td><code>MathOperation</code></td><td>the operation (default: the operation select's value, else 'simplify')</td></tr><tr><td><code>right?</code></td><td><code>string</code></td><td>compare: the other side, as TeX</td></tr><tr><td><code>comparison?</code></td><td><code>'identity' \| 'value' \| 'structural'</code></td><td>compare: how - 'identity' (equal for every value), 'value' (equal values) or 'structural' (the same expression)</td></tr><tr><td><code>variable?</code></td><td><code>string</code></td><td>solve / differentiate: the variable (default 'x')</td></tr><tr><td><code>order?</code></td><td><code>number</code></td><td>differentiate: the order, 1 to 4</td></tr><tr><td><code>context?</code></td><td><code>MathContext</code></td><td>the assumptions: domain, declared variables, assumed predicates (MathJSON), precision</td></tr><tr><td><code>result?</code></td><td><code>MathResult \| null</code></td><td>the last result - the engine's whole record (a recorded one shows without running)</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>explaining: the step shown, from 0</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>error / unsupported: the message</td></tr></table> |
| `computing` | A job runs in the worker (Cancel stops it); lands in 'result', 'unsupported' or 'error'. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the input as TeX (default: the textarea's text)</td></tr><tr><td><code>mathJson?</code></td><td><code>MathJson \| null</code></td><td>the input as MathJSON instead of TeX (null: use the TeX)</td></tr><tr><td><code>operation?</code></td><td><code>MathOperation</code></td><td>the operation (default: the operation select's value, else 'simplify')</td></tr><tr><td><code>right?</code></td><td><code>string</code></td><td>compare: the other side, as TeX</td></tr><tr><td><code>comparison?</code></td><td><code>'identity' \| 'value' \| 'structural'</code></td><td>compare: how - 'identity' (equal for every value), 'value' (equal values) or 'structural' (the same expression)</td></tr><tr><td><code>variable?</code></td><td><code>string</code></td><td>solve / differentiate: the variable (default 'x')</td></tr><tr><td><code>order?</code></td><td><code>number</code></td><td>differentiate: the order, 1 to 4</td></tr><tr><td><code>context?</code></td><td><code>MathContext</code></td><td>the assumptions: domain, declared variables, assumed predicates (MathJSON), precision</td></tr><tr><td><code>result?</code></td><td><code>MathResult \| null</code></td><td>the last result - the engine's whole record (a recorded one shows without running)</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>explaining: the step shown, from 0</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>error / unsupported: the message</td></tr></table> |
| `result` | The engine's result with its conditions, candidates and steps (`config.result`; without one: 'default'). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the input as TeX (default: the textarea's text)</td></tr><tr><td><code>mathJson?</code></td><td><code>MathJson \| null</code></td><td>the input as MathJSON instead of TeX (null: use the TeX)</td></tr><tr><td><code>operation?</code></td><td><code>MathOperation</code></td><td>the operation (default: the operation select's value, else 'simplify')</td></tr><tr><td><code>right?</code></td><td><code>string</code></td><td>compare: the other side, as TeX</td></tr><tr><td><code>comparison?</code></td><td><code>'identity' \| 'value' \| 'structural'</code></td><td>compare: how - 'identity' (equal for every value), 'value' (equal values) or 'structural' (the same expression)</td></tr><tr><td><code>variable?</code></td><td><code>string</code></td><td>solve / differentiate: the variable (default 'x')</td></tr><tr><td><code>order?</code></td><td><code>number</code></td><td>differentiate: the order, 1 to 4</td></tr><tr><td><code>context?</code></td><td><code>MathContext</code></td><td>the assumptions: domain, declared variables, assumed predicates (MathJSON), precision</td></tr><tr><td><code>result?</code></td><td><code>MathResult \| null</code></td><td>the last result - the engine's whole record (a recorded one shows without running)</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>explaining: the step shown, from 0</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>error / unsupported: the message</td></tr></table> |
| `explaining` | One step of the engine's explanation, before and after (`config.step`; without steps: 'result'). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the input as TeX (default: the textarea's text)</td></tr><tr><td><code>mathJson?</code></td><td><code>MathJson \| null</code></td><td>the input as MathJSON instead of TeX (null: use the TeX)</td></tr><tr><td><code>operation?</code></td><td><code>MathOperation</code></td><td>the operation (default: the operation select's value, else 'simplify')</td></tr><tr><td><code>right?</code></td><td><code>string</code></td><td>compare: the other side, as TeX</td></tr><tr><td><code>comparison?</code></td><td><code>'identity' \| 'value' \| 'structural'</code></td><td>compare: how - 'identity' (equal for every value), 'value' (equal values) or 'structural' (the same expression)</td></tr><tr><td><code>variable?</code></td><td><code>string</code></td><td>solve / differentiate: the variable (default 'x')</td></tr><tr><td><code>order?</code></td><td><code>number</code></td><td>differentiate: the order, 1 to 4</td></tr><tr><td><code>context?</code></td><td><code>MathContext</code></td><td>the assumptions: domain, declared variables, assumed predicates (MathJSON), precision</td></tr><tr><td><code>result?</code></td><td><code>MathResult \| null</code></td><td>the last result - the engine's whole record (a recorded one shows without running)</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>explaining: the step shown, from 0</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>error / unsupported: the message</td></tr></table> |
| `unsupported` | The operation is outside what the adapter supports for this input (the message says why). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the input as TeX (default: the textarea's text)</td></tr><tr><td><code>mathJson?</code></td><td><code>MathJson \| null</code></td><td>the input as MathJSON instead of TeX (null: use the TeX)</td></tr><tr><td><code>operation?</code></td><td><code>MathOperation</code></td><td>the operation (default: the operation select's value, else 'simplify')</td></tr><tr><td><code>right?</code></td><td><code>string</code></td><td>compare: the other side, as TeX</td></tr><tr><td><code>comparison?</code></td><td><code>'identity' \| 'value' \| 'structural'</code></td><td>compare: how - 'identity' (equal for every value), 'value' (equal values) or 'structural' (the same expression)</td></tr><tr><td><code>variable?</code></td><td><code>string</code></td><td>solve / differentiate: the variable (default 'x')</td></tr><tr><td><code>order?</code></td><td><code>number</code></td><td>differentiate: the order, 1 to 4</td></tr><tr><td><code>context?</code></td><td><code>MathContext</code></td><td>the assumptions: domain, declared variables, assumed predicates (MathJSON), precision</td></tr><tr><td><code>result?</code></td><td><code>MathResult \| null</code></td><td>the last result - the engine's whole record (a recorded one shows without running)</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>explaining: the step shown, from 0</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>error / unsupported: the message</td></tr></table> |
| `error` | The input could not be computed: invalid TeX, a contradiction, the deadline, the engine not loading. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the input as TeX (default: the textarea's text)</td></tr><tr><td><code>mathJson?</code></td><td><code>MathJson \| null</code></td><td>the input as MathJSON instead of TeX (null: use the TeX)</td></tr><tr><td><code>operation?</code></td><td><code>MathOperation</code></td><td>the operation (default: the operation select's value, else 'simplify')</td></tr><tr><td><code>right?</code></td><td><code>string</code></td><td>compare: the other side, as TeX</td></tr><tr><td><code>comparison?</code></td><td><code>'identity' \| 'value' \| 'structural'</code></td><td>compare: how - 'identity' (equal for every value), 'value' (equal values) or 'structural' (the same expression)</td></tr><tr><td><code>variable?</code></td><td><code>string</code></td><td>solve / differentiate: the variable (default 'x')</td></tr><tr><td><code>order?</code></td><td><code>number</code></td><td>differentiate: the order, 1 to 4</td></tr><tr><td><code>context?</code></td><td><code>MathContext</code></td><td>the assumptions: domain, declared variables, assumed predicates (MathJSON), precision</td></tr><tr><td><code>result?</code></td><td><code>MathResult \| null</code></td><td>the last result - the engine's whole record (a recorded one shows without running)</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>explaining: the step shown, from 0</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>error / unsupported: the message</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends MathComputeState&gt;(name: S, config?: MathComputeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MathComputeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: MathComputeState; config: MathComputeStateConfigs[MathComputeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: MathComputeState; config: MathComputeStateConfigs[MathComputeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: MathComputeState; config: MathComputeStateConfigs[MathComputeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: MathComputeState; config: MathComputeStateConfigs[MathComputeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: MathComputeState; config: MathComputeStateConfigs[MathComputeState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.mathComputeApi.setState&lt;S extends MathComputeState&gt;(el: HTMLElement, name: S, config?: MathComputeStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>MathComputeStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.mathComputeApi.getState(el: HTMLElement): { name: MathComputeState; config: MathComputeStateConfigs[MathComputeState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: MathComputeState; config: MathComputeStateConfigs[MathComputeState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.mathComputeApi.render(state: { name: MathComputeState; config: MathComputeStateConfigs[MathComputeState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: MathComputeState; config: MathComputeStateConfigs[MathComputeState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.mathComputeApi.store(el: HTMLElement): Store&lt;{ name: MathComputeState; config: MathComputeStateConfigs[MathComputeState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: MathComputeState; config: MathComputeStateConfigs[MathComputeState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.mathComputeApi.commit&lt;S extends MathComputeState&gt;(el: HTMLElement, name: S, config?: MathComputeStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>MathComputeStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.mathComputeStates: MathComputeState[]</code> | The declared states, 'default' first: <code>default</code>, <code>computing</code>, <code>result</code>, <code>explaining</code>, <code>unsupported</code>, <code>error</code>. |

### `df$.shadcn.mathCompute`

| Member | Description |
|---|---|
| <code>run(el: HTMLElement \| string, patch: MathComputeConfig = {}): Promise&lt;void&gt;</code> | Compute: the input (with `patch` applied first) runs in the worker. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-compute element, or a selector for it</td></tr><tr><td><code>patch</code></td><td><code>MathComputeConfig</code> = <code>{}</code></td><td>changes to the config first (latex, mathJson, operation, right, comparison, variable, order, context)</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when the panel landed in 'result', 'unsupported' or 'error' (or a later run or Cancel took over) |
| <code>cancel(el: HTMLElement \| string): void</code> | Stop a running computation - the worker is terminated, the panel returns to 'default'. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-compute element, or a selector for it</td></tr></table> |
| <code>go(el: HTMLElement \| string, step: number): void</code> | Show one step of the engine's explanation (-1: the result). It never computes again. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-compute element, or a selector for it</td></tr><tr><td><code>step</code></td><td><code>number</code></td><td>the step's index, from 0; -1 for the result</td></tr></table> |
| <code>next(el: HTMLElement \| string): void</code> | The next step of the explanation (from the result: the first). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-compute element, or a selector for it</td></tr></table> |
| <code>prev(el: HTMLElement \| string): void</code> | The previous step of the explanation (from the first: the result). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-compute element, or a selector for it</td></tr></table> |
| <code>export(el: HTMLElement \| string): string \| null</code> | The last result as JSON - the engine's whole record, to save or to record into a page. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement \| string</code></td><td>the .math-compute element, or a selector for it</td></tr></table> <b>Returns</b> <code>string \| null</code> - the record as JSON, or null before a result |
| <code>engine(url?: string): string</code> | The Compute Engine module the worker imports - set it to self-host the same build (its chunks beside it). Without a call: &lt;meta name="math-compute-engine"&gt;, else the pinned jsDelivr build. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>url?</code></td><td><code>string</code></td><td>the module URL to use from now on (resolved against the page)</td></tr></table> <b>Returns</b> <code>string</code> - the absolute module URL in use |
| <code>url: string</code> | The pinned official Compute Engine build the worker imports (never @latest); its chunks load beside it. |

### Events

| Event | Description |
|---|---|
| `math-result` | a computation ended - a figure, a table or a paper section follows its result <code>detail</code>: <code>MathResultDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>status</code></td><td><code>'ok' \| 'unsupported' \| 'error' \| 'cancelled'</code></td><td>'ok', 'unsupported', 'error' or 'cancelled'</td></tr><tr><td><code>result</code></td><td><code>MathResult \| null</code></td><td>the engine's record (status 'ok'), else null</td></tr><tr><td><code>message</code></td><td><code>string</code></td><td>why it did not complete (empty for 'ok')</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `MathComputeConfig` | A compute panel's state: every field optional in setState() (merged into the current one); getState() reports all. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>latex?</code></td><td><code>string</code></td><td>the input as TeX (default: the textarea's text)</td></tr><tr><td><code>mathJson?</code></td><td><code>MathJson \| null</code></td><td>the input as MathJSON instead of TeX (null: use the TeX)</td></tr><tr><td><code>operation?</code></td><td><code>MathOperation</code></td><td>the operation (default: the operation select's value, else 'simplify')</td></tr><tr><td><code>right?</code></td><td><code>string</code></td><td>compare: the other side, as TeX</td></tr><tr><td><code>comparison?</code></td><td><code>'identity' \| 'value' \| 'structural'</code></td><td>compare: how - 'identity' (equal for every value), 'value' (equal values) or 'structural' (the same expression)</td></tr><tr><td><code>variable?</code></td><td><code>string</code></td><td>solve / differentiate: the variable (default 'x')</td></tr><tr><td><code>order?</code></td><td><code>number</code></td><td>differentiate: the order, 1 to 4</td></tr><tr><td><code>context?</code></td><td><code>MathContext</code></td><td>the assumptions: domain, declared variables, assumed predicates (MathJSON), precision</td></tr><tr><td><code>result?</code></td><td><code>MathResult \| null</code></td><td>the last result - the engine's whole record (a recorded one shows without running)</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>explaining: the step shown, from 0</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>error / unsupported: the message</td></tr></table> |
| `MathResultDetail` | The `math-result` event's detail: how a computation ended. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>status</code></td><td><code>'ok' \| 'unsupported' \| 'error' \| 'cancelled'</code></td><td>'ok', 'unsupported', 'error' or 'cancelled'</td></tr><tr><td><code>result</code></td><td><code>MathResult \| null</code></td><td>the engine's record (status 'ok'), else null</td></tr><tr><td><code>message</code></td><td><code>string</code></td><td>why it did not complete (empty for 'ok')</td></tr></table> |
