---
name: Typewriter
type: ATM
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
