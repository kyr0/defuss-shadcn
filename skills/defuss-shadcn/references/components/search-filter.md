---
name: Search & Filter
type: ATM
why: A native type="search" field and native radios / checkboxes - the value, the form submission, the radio group's arrow keys and the reset button stay the browser's; CSS draws the chips and hides the unchosen ones, JS only clears the box.
when: Narrowing a list - a search box with a clear (×) button for free text, filter chips for categories (one with radios, several with checkboxes). Use combobox when the text picks one item from suggestions, command for a command palette.
where: dist/components/search-filter/search-filter.css + dist/components/search-filter/search-filter.js
supportedStates: default, filled, searching
---

# Pattern: Search & Filter

## Native basis
Two dedicated controls for narrowing a list.

- **Search box** - `.search-box` frames a native `<input type="search">`
  with a leading icon and a `.search-box-clear` button. The × shows only
  while there is text; clicking it (or pressing Escape) empties the field,
  keeps focus in it, and fires the same `input` event typing does - one
  listener handles typing and clearing.
- **Filter** - `.filter` on a `<form>` (or any element) of native radios or
  checkboxes drawn as chips, their label from `aria-label`. Choosing one
  hides the others and reveals a reset (×): `<input type="reset">` inside a
  form, or a radio of the group with `.filter-reset` outside one. CSS only
  (`:has()` + `:checked`).

---

## Native Web APIs
- [`<input type="search">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/search) - a search field: the search keyboard on mobile, `name` submits with the form
- [`<search>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/search) - the search landmark around a search form
- [`enterkeyhint`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/enterkeyhint) - the Enter key reads "Search" (set for you)
- [`<input type="reset">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/reset) - the filter's × clears every chip of its form with no script
- [`<input type="radio">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio) - one choice, arrow keys move it; checkboxes for several
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - hides the unchosen chips and shows the reset; filters content CSS-only
- [`appearance: none`](https://developer.mozilla.org/en-US/docs/Web/CSS/appearance) + [`attr()`](https://developer.mozilla.org/en-US/docs/Web/CSS/attr) - a radio drawn as a chip, labelled from `aria-label`
- [`interpolate-size: allow-keywords`](https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size) + `transition-behavior: allow-discrete` - chips fold to width 0 and grow back to `auto`, visibility flips at the right end
- [`mask-composite`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-composite) - the tick cut out of a checkbox chip's filled box
- [`aria-busy`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-busy) - the field while a lookup is pending (`searching`)
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `search-clear` when the box is cleared
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) / [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - no chip transitions; system colours for the chosen chip

---

## Structure

### Search box

```html
<search>
  <div class="search-box">
    <i data-lucide="search"></i>
    <input type="search" name="q" placeholder="Search…" aria-label="Search">
    <button type="button" class="search-box-clear" aria-label="Clear search"></button>
  </div>
</search>
```

The × is drawn by CSS - leave the button empty. The leading icon is any
`<svg>` / `<i>` before the input. A trailing `<kbd>` (a shortcut) or
`<span class="search-box-hint">` shows while the box is empty and steps aside
for the × once there is text.

```html
<div class="search-box" data-shape="pill">
  <i data-lucide="search"></i>
  <input type="search" placeholder="Search docs" aria-label="Search docs">
  <kbd class="kbd" data-size="sm">⌘K</kbd>
  <button type="button" class="search-box-clear" aria-label="Clear search"></button>
</div>
```

React to typing and clearing with one `input` listener:

```html
<div class="search-box">
  <i data-lucide="search"></i>
  <input type="search" id="people-q" aria-label="Filter people" aria-controls="people">
  <button type="button" class="search-box-clear" aria-label="Clear search"></button>
</div>
<ul id="people">…</ul>
```

### Filter - one choice, in a form

```html
<form class="filter" aria-label="Framework">
  <input type="radio" name="framework" aria-label="Svelte">
  <input type="radio" name="framework" aria-label="Vue">
  <input type="radio" name="framework" aria-label="React">
  <input type="reset" value="×" aria-label="Clear filter">
</form>
```

### Filter - one choice, without a form

A radio of the same group with `.filter-reset` is the reset (checked = "all"):

```html
<div class="filter" role="radiogroup" aria-label="Meta framework">
  <input type="radio" name="meta" aria-label="SvelteKit">
  <input type="radio" name="meta" aria-label="Nuxt">
  <input type="radio" name="meta" aria-label="Next.js">
  <input type="radio" name="meta" class="filter-reset" aria-label="All">
</div>
```

### Filter - several choices

Checkboxes. Without `data-multiple` the first choice hides the rest (like
radios); with it every chip stays and toggles:

```html
<form class="filter" data-multiple aria-label="Categories">
  <input type="checkbox" name="cat" value="design" aria-label="Design">
  <input type="checkbox" name="cat" value="code" aria-label="Code">
  <input type="checkbox" name="cat" value="writing" aria-label="Writing">
  <input type="reset" value="×" aria-label="Clear filters">
</form>
```

---

## Variants

| Attribute | Element | Behaviour |
|-----------|---------|-----------|
| `data-variant="muted"` | `.search-box` | Muted surface, no border or shadow |
| `data-shape="pill"` | `.search-box`, `.filter` | Fully rounded |
| `data-multiple` | `.filter` | Chosen chips don't hide the others - toggle any number |
| `data-variant="secondary"` | `.filter` | Chosen chip in the secondary colour instead of primary |
| `data-variant="outline"` | `.filter` | Chosen chip keeps the background, gains a strong outline |
| `disabled` | an `<input>` | Native - the box or chip dims and ignores input |
| `aria-invalid="true"` | the search `<input>` | Destructive frame |

## Sizes

| `data-size` | Search box height | Chip height |
|-------------|-------------------|-------------|
| `sm` | 2rem (32px) | 1.75rem (28px) |
| *(default)* | 2.25rem (36px) | 2rem (32px) |
| `lg` | 2.75rem (44px) | 2.5rem (40px) |

---

## Events

| Event | Target | When |
|-------|--------|------|
| `input` | the search `<input>` | Typing - and clearing (button, Escape or `setState('default')`), so one listener covers both |
| `search-clear` | `.search-box` | The box was cleared by the × or Escape |
| `change` / `reset` | chips / the filter form | Native - a chip was chosen / the reset ran |

---

## States

States of the search box (the filter is CSS only):

| State | Meaning |
|-------|---------|
| `default` | Empty - no × (setting it clears the field; `{ value }` presets one) |
| `filled` | Has text - the × shows. Entered automatically as you type |
| `searching` | Has text and a lookup is pending: a spinner replaces the icon, `aria-busy="true"` on the field. The page sets it and ends it (`filled`) |

```js
const box = document.querySelector('.search-box');
box.api.setState('searching', { value: 'report' });
// … results arrive
box.api.setState('filled');
box.api.getState(); // → { name: 'filled', config: {} }
```

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.searchFilterApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.searchFilterStates` = `default`, `filled`, `searching`.

### Events

| Event | `detail` | Description |
|---|---|---|
| `search-clear` | - | Fires when the search is cleared with its clear button. |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| search `<input>` | `aria-label` or a `<label for>` | The field's name - a placeholder is not a label |
| `.search-box-clear` | `aria-label="Clear search"` | The button has no text of its own |
| search `<input>` | `aria-controls` | Optional - the id of the list it filters |
| search `<input>` | `aria-busy="true"` | Set by the `searching` state |
| `.filter` | `aria-label` + `role="radiogroup"` (radios outside a form) | Names the group of chips |
| chip `<input>` | `aria-label` | The chip's label - and its visible text |
| reset | `aria-label="Clear filter"` / `"All"` | The × alone says nothing |

A results count belongs in an `<output>` (or `aria-live="polite"` region)
next to the list, so a screen reader hears how many matched.

---

## Notes

- The × clears with `input` and `search-clear` events and keeps focus in the
  field; Escape does the same when there is text, and its default is
  prevented, so an enclosing dialog closes only on a second Escape.
- The browser's own clear button (WebKit/Blink) is hidden - the box draws one
  that looks the same everywhere.
- Filtering content needs no script with `:has()`: a rule like
  `.list:has(~ .filter [value="code"]:checked) .item:not([data-cat="code"])`
  (or a shared ancestor with `:has(#chip:checked)`) hides what doesn't match.
- Chips are the inputs themselves: the label is drawn from `aria-label`, so
  set it on every chip. `value` is what submits.
- Author the reset LAST: it grows in after the chosen chip, so nothing moves
  under the pointer. Chips fold away and back with a width glide (no jump);
  a folded chip is `visibility: hidden` - out of focus and the arrow keys.
- Checkbox chips draw a box before their label (ticked when checked);
  radio chips don't - the box says "several may be chosen".
- With radios, a chosen chip hides the rest, so arrow keys cannot reach them;
  the reset brings them back. Use `data-multiple` when switching directly
  matters.
- The filter is CSS only; the search box needs `search-filter.js` (after
  `core.js`) for the × and Escape - without it the box is a plain, working
  search field with no ×.
