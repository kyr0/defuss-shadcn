---
name: Typewriter
type: ATM
section: primitives
why: The strings are authored as elements - readable without script and read once, in full, by assistive tech - while the runtime types an aria-hidden copy behind a CSS cursor that is solid while typing and blinks idle.
when: A headline or hero line that types itself - cycling taglines ("Build design systems / prototypes / dashboards"), a terminal-style intro, a line that types once when it scrolls into view. For a word that rolls without typing use text-rotate; for a count use countdown.
where: dist/components/typewriter/typewriter.css + dist/components/typewriter/typewriter.js
supportedStates: default, paused, done
---

# Pattern: Typewriter

## Native basis

A `<span class="typewriter">` around one child element per string. The
runtime visually hides the children (they stay in the DOM, so a screen
reader hears the list once, in full - no live region re-announcing every
keystroke) and paints an `aria-hidden` line: the typed text and a cursor.
It types a string, holds it, deletes it and moves to the next. Without
script the first string shows as plain text.

## Native Web APIs

- [`Intl.Segmenter`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter) - types by grapheme, so an emoji or an accented letter is one keystroke
- [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) - `data-trigger="visible"` starts typing when the line scrolls into view
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `typewriter-typed` after each string, `typewriter-done` at the end
- [`aria-hidden`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-hidden) - the moving copy and the cursor stay silent
- [CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/animation) + [`steps()`](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/steps) - the blinking cursor
- [CSS grid](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-area) stacking - `data-reserve` sizes the box to the longest string
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - whole strings swap instead of typing; the cursor holds still

---

## Structure

```html
<h1>
  Build
  <span class="typewriter" data-loop>
    <span>design systems.</span>
    <span>prototypes.</span>
    <span>dashboards.</span>
  </span>
</h1>
```

- One child element per string; it may carry a `class` or `style` (a colour)
  that the typed line takes on while that string shows.
- Without `data-loop` it types through the strings once and stops on the
  last (the `done` state).
- A single child types once - a headline that writes itself.

### Generated markup (do not author)

```html
<span class="typewriter" data-init data-phase="typing" data-index="0" data-state-name="default">
  <span class="typewriter-source">design systems.</span>
  …
  <span class="typewriter-line" aria-hidden="true">
    <span class="typewriter-text">design sys</span><span class="typewriter-cursor"></span>
  </span>
</span>
```

`data-phase` is `typing`, `deleting`, `holding` or `idle`; `data-index` the
string on screen.

---

## Timing (on `.typewriter`)

| Attribute | Default | Meaning |
|-----------|---------|---------|
| `data-speed` | `70` | ms per typed character |
| `data-delete-speed` | `35` | ms per deleted character |
| `data-pause` | `1500` | ms a typed string holds before deleting |
| `data-start-delay` | `0` | ms before the first keystroke |
| `data-variable` | - | Jitters every keystroke (0.5×-1.5×) for a human rhythm |
| `data-loop` | - | Cycle forever instead of stopping on the last string |
| `data-trigger="visible"` | - | Start the first time the line scrolls into view |

## Cursor

| Attribute | Effect |
|-----------|--------|
| *(default)* | A thin bar - solid while typing, blinking while idle |
| `data-cursor="block"` | A block |
| `data-cursor="underscore"` | An underscore |
| `data-cursor="none"` | No cursor |
| `data-cursor-hide="typing"` | Shown only while idle |
| `data-cursor-hide="done"` | Gone once the run ends |
| `--typewriter-cursor-color` | The cursor's colour (default: the text colour) |

## Layout

| Attribute | Effect |
|-----------|--------|
| `data-reserve` | The box is as wide as the longest string from the start - the sentence around it never shifts |
| `data-align="center"` / `"end"` | With `data-reserve`: where the shorter strings sit |

---

## Events

| Event | When | Detail |
|-------|------|--------|
| `typewriter-typed` | A string is complete | `{ index, text }` |
| `typewriter-done` | The run ended on its last string (no `data-loop`) | `{ index }` |

---

## States

| State | Meaning |
|-------|---------|
| `default` | Running - typing, holding, deleting. Setting it restarts from the first string, or from `{ index }`; coming from `paused` without an index it resumes |
| `paused` | Frozen where it is; the cursor blinks |
| `done` | Stopped with a string in full - `{ index }`, default the current one. Entered automatically at the end of a run without `data-loop` |

```js
const tw = document.querySelector('.typewriter');
tw.api.setState('paused');
tw.api.setState('default');            // resumes
tw.api.setState('done', { index: 2 }); // shows the third string, stopped
tw.api.getState(); // → { name: 'done', config: { index: 2 } }
```

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type TypewriterState = 'default' | 'paused' | 'done'</code> - `setState(name, config)` takes the config of the state it names (`TypewriterStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Running - typing, holding, deleting. Setting it restarts (from paused without an index it resumes). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>index?</code></td><td><code>number</code></td><td>the string to start from, 0-based</td></tr><tr><td><code>immediate?</code></td><td><code>boolean</code></td><td>true: start without the data-start-delay</td></tr></table> |
| `paused` | Frozen where it is; the cursor blinks. No config. |
| `done` | Stopped with a string in full - entered at the end of a run without data-loop. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>index?</code></td><td><code>number</code></td><td>the string to show, 0-based (default: the current one)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends TypewriterState&gt;(name: S, config?: TypewriterStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TypewriterStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: TypewriterState; config: TypewriterStateConfigs[TypewriterState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: TypewriterState; config: TypewriterStateConfigs[TypewriterState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: TypewriterState; config: TypewriterStateConfigs[TypewriterState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: TypewriterState; config: TypewriterStateConfigs[TypewriterState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: TypewriterState; config: TypewriterStateConfigs[TypewriterState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.typewriterApi.setState&lt;S extends TypewriterState&gt;(el: HTMLElement, name: S, config?: TypewriterStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TypewriterStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.typewriterApi.getState(el: HTMLElement): { name: TypewriterState; config: TypewriterStateConfigs[TypewriterState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: TypewriterState; config: TypewriterStateConfigs[TypewriterState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.typewriterApi.render(state: { name: TypewriterState; config: TypewriterStateConfigs[TypewriterState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: TypewriterState; config: TypewriterStateConfigs[TypewriterState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.typewriterApi.store(el: HTMLElement): Store&lt;{ name: TypewriterState; config: TypewriterStateConfigs[TypewriterState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: TypewriterState; config: TypewriterStateConfigs[TypewriterState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.typewriterApi.commit&lt;S extends TypewriterState&gt;(el: HTMLElement, name: S, config?: TypewriterStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>TypewriterStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.typewriterStates: TypewriterState[]</code> | The declared states, 'default' first: <code>default</code>, <code>paused</code>, <code>done</code>. |

### Events

| Event | Description |
|---|---|
| `typewriter-done` | Fires when a run ends on its last string - that string's index. <code>detail</code>: <code>TypewriterDoneDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>index</code></td><td><code>number</code></td><td>the index of the last string - the run ends on it</td></tr></table> |
| `typewriter-typed` | the string is complete <code>detail</code>: <code>TypewriterTypedDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>index</code></td><td><code>number</code></td><td>the index of the string just completed</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>that string</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `TypewriterDoneDetail` | What typewriter-done carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>index</code></td><td><code>number</code></td><td>the index of the last string - the run ends on it</td></tr></table> |
| `TypewriterTypedDetail` | What typewriter-typed carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>index</code></td><td><code>number</code></td><td>the index of the string just completed</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>that string</td></tr></table> |

---

## Accessibility

| Concern | Handling |
|---------|----------|
| Screen readers | The authored strings are read once, in order; the typed copy and cursor are `aria-hidden` - no announcement per keystroke |
| Motion | `prefers-reduced-motion: reduce`: no typing - whole strings swap on the pause rhythm, the cursor stops blinking |
| Reading time | Keep `data-pause` at 1.5 s or more; the loop can be paused through the State API (a pause button) |
| No script | The first string shows as plain text |

## Notes

- The typed line inherits font, size, colour and weight from the text
  around it - put it in any heading or paragraph.
- Use `data-reserve` inside centred or wrapping text, so the line doesn't
  push its neighbours around as it types.
- Each instance runs its own timer and stops when it leaves the DOM.
- Pair with `mockup-code`'s cursor line for a terminal that "types" a command.
