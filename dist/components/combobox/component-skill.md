---
name: Combobox
type: MOL
why: Text input filtering an anchored list with the aria-activedescendant keyboard model.
when: Choosing from a long list the user narrows by typing - states, tags, users; data-multiple picks SEVERAL (tags, countries you ship to, people to invite, filter categories) with checkboxes + removable tags. For one value from a short list use select; for a handful of options checkboxes.
where: dist/components/combobox/combobox.css + dist/components/combobox/combobox.js
supportedStates: default, open
---

# Pattern: Combobox

## Native basis
Button trigger + `popover` popup containing a search input and `role="listbox"`.
The `popover` API provides top-layer rendering and light-dismiss.
Requires JavaScript for filtering, keyboard navigation, selection, and
ARIA management. Follows the WAI-ARIA Combobox design pattern.

The trigger is an outline button. Clicking it opens a popover with a search
input at the top and a scrollable list of options below. DOM focus moves to
the search input when the popover opens.

---

## Native Web APIs
- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - top-layer rendering and light-dismiss for the dropdown list
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - reveals the injected clear button exactly while a selection exists (`data-placeholder` absent)
- [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - positions the popover relative to the trigger without JS
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) - entry animation starting values for popover appearance
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) - prevents scroll chaining from the listbox to the page
- [WAI-ARIA Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) - keyboard navigation and screen reader contract

---

## Structure

```html
<div class="combobox" style="width:14rem;">
  <label class="label" id="framework-label">Framework</label>
  <button class="btn combobox-trigger" data-variant="outline"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-labelledby="framework-label"
          aria-controls="framework-popover">
    <span class="combobox-value" data-placeholder="Select framework...">Select framework...</span>
    <svg class="combobox-chevron" aria-hidden="true" width="16" height="16"
         viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>
    </svg>
  </button>
  <div id="framework-popover" class="combobox-content" popover>
    <div class="combobox-search">
      <svg class="combobox-search-icon" aria-hidden="true" width="16" height="16"
           viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input class="combobox-search-input"
             type="text"
             role="combobox"
             autocomplete="off"
             aria-expanded="true"
             aria-controls="framework-listbox"
             aria-activedescendant=""
             aria-autocomplete="list"
             placeholder="Search...">
    </div>
    <div id="framework-listbox" role="listbox" class="combobox-listbox"
         aria-label="Frameworks">
      <div class="combobox-empty" hidden>No results found.</div>
      <div role="option" id="opt-next" class="combobox-item"
           data-value="nextjs" aria-selected="false">Next.js</div>
      <div role="option" id="opt-svelte" class="combobox-item"
           data-value="sveltekit" aria-selected="false">SvelteKit</div>
      <div role="option" id="opt-nuxt" class="combobox-item"
           data-value="nuxt" aria-selected="false">Nuxt</div>
      <div role="option" id="opt-remix" class="combobox-item"
           data-value="remix" aria-selected="false">Remix</div>
      <div role="option" id="opt-astro" class="combobox-item"
           data-value="astro" aria-selected="false">Astro</div>
    </div>
  </div>
</div>
```

### With groups

```html
<div id="tz-listbox" role="listbox" class="combobox-listbox" aria-label="Timezones">
  <div class="combobox-empty" hidden>No results found.</div>
  <div class="combobox-group-label">North America</div>
  <div role="option" class="combobox-item" id="opt-est"
       data-value="est" aria-selected="false">Eastern (EST)</div>
  <div role="option" class="combobox-item" id="opt-pst"
       data-value="pst" aria-selected="false">Pacific (PST)</div>
  <div class="combobox-separator"></div>
  <div class="combobox-group-label">Europe</div>
  <div role="option" class="combobox-item" id="opt-gmt"
       data-value="gmt" aria-selected="false">GMT (London)</div>
</div>
```

---

## Multi-select

```html
<div class="combobox" data-multiple data-name="tags">
  <label class="label" id="tags-label">Tags</label>
  <button type="button" class="btn combobox-trigger" data-variant="outline" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="tags-label" aria-controls="tags-pop">
    <span class="combobox-value" data-placeholder="Add tags..." data-selected-label="{n} tags">Add tags...</span>
    <svg class="combobox-chevron">…</svg>
  </button>
  <div id="tags-pop" class="combobox-content" popover>
    <div class="combobox-search">…<input class="combobox-search-input" role="combobox" …></div>
    <div id="tags-list" role="listbox" class="combobox-listbox" aria-label="Tags">
      <div role="option" id="tag-design" class="combobox-item" data-value="design" aria-selected="true">Design</div>
      <div role="option" id="tag-eng" class="combobox-item" data-value="eng" aria-selected="false">Engineering</div>
    </div>
  </div>
</div>
```

- `data-multiple` on `.combobox`: the listbox becomes `aria-multiselectable`, every option shows a checkbox, and a click / Enter **toggles** an option while the list stays open (search keeps focus for the next pick).
- The choices appear as removable **tags** under the trigger (`.combobox-tags` → `.combobox-tag` + `.combobox-tag-remove`, rendered by the script - not inside the trigger, where buttons can't nest). A tag's × removes it and moves focus to the next tag; **Backspace** in the empty search removes the last choice; the clear button empties all.
- The trigger summarises: placeholder when empty, the label for one choice, else `{n} selected` - `data-selected-label="{n} tags"` on `.combobox-value` rewords it.
- `data-name` renders one `<input type="hidden" name="{data-name}" value="{data-value}">` per choice, so the form submits them all (`tags=design&tags=eng`). Preselect with `aria-selected="true"`.
- Every change fires `combobox:change` on the wrapper with `detail = { values, labels }` (also in single mode). `popover.api.getState().config` reports `values` / `labels`.

### Tag input (tags inside the field, autocomplete, create)

```html
<div class="combobox" data-multiple data-tags data-creatable data-name="topics">
  <label class="label" for="topics-input">Topics</label>
  <div class="combobox-field">
    <input class="combobox-field-input" id="topics-input" type="text" role="combobox" autocomplete="off"
           aria-expanded="false" aria-controls="topics-list" aria-autocomplete="list" placeholder="Type a topic...">
  </div>
  <div id="topics-pop" class="combobox-content" popover="manual">
    <div id="topics-list" role="listbox" class="combobox-listbox" aria-label="Topics">
      <div class="combobox-empty" hidden>No topics found.</div>
      <div role="option" id="topic-css" class="combobox-item" data-value="css" aria-selected="true">CSS</div>
      <div role="option" id="topic-ts" class="combobox-item" data-value="typescript" aria-selected="false">TypeScript</div>
    </div>
  </div>
</div>
```

- `data-tags` (with `data-multiple`): no trigger button - a `.combobox-field` box (looks like `.input`) holds the tags and the `.combobox-field-input` the user types into; the list is `popover="manual"` and anchored to the field.
- **Typing** opens and filters the list. **Enter** (or a **comma**) picks the **exact** match (case-insensitive) - never a duplicate; with `data-creatable` and no exact match it **creates** a tag from the text (the highlighted `Create "…"` row). **Arrow keys** pick any other listed option instead. Without `data-creatable` the first match is highlighted and unknown text is never added.
- Created tags become real options (`data-created`, `data-value` = the text), so they toggle like the rest. `combobox:change` reports them as `detail.created`.
- **Backspace** in the empty input removes the last tag; a tag's × removes that one; **Escape** or leaving the widget closes the list. The placeholder shows only while there are no tags. `data-name` renders one hidden input per tag.

## Data Attributes

| Attribute          | Element              | Values                            | Description                                          |
|--------------------|----------------------|-----------------------------------|------------------------------------------------------|
| `data-placeholder` | `.combobox-value`    | (presence)                        | Present when showing placeholder text; removed on selection. CSS uses it to set muted color. |
| `data-highlighted` | `.combobox-item`     | (presence, JS-managed)            | Set by JS on the currently keyboard-highlighted option. CSS applies accent background. |
| `data-value`       | `.combobox-item`     | any string                        | The programmatic value of the option, used by JS for selection tracking. Not targeted by CSS. |

---

## Sizes

Set `data-size` on the `.combobox` wrapper; the trigger (a `.btn`) and the popover rows scale together.

| `data-size` | Trigger height | Trigger font | Row font |
|-------------|----------------|--------------|----------|
| `xs` | 1.75rem | 0.75rem | 0.75rem |
| `sm` | 2rem | 0.8125rem | 0.8125rem |
| `md` *(default)* | 2.25rem (`.combobox-trigger` default, = `.input`) | 0.875rem | 0.875rem |
| `lg` | 2.75rem | 1rem | 1rem |
| `xl` | 3.25rem | 1.125rem | 1.125rem |

`md` equals the unsized default (the `.btn` md step).

---
## ARIA

| Attribute                | Where            | Value                                   |
|--------------------------|------------------|-----------------------------------------|
| `aria-haspopup`          | trigger button   | `listbox`                               |
| `aria-expanded`          | trigger button   | `true` when popup open, `false` when closed |
| `aria-labelledby`        | trigger button   | ID of the label                         |
| `aria-controls`          | trigger button   | ID of the popover                       |
| `role="combobox"`        | search input     | Always                                  |
| `aria-expanded`          | search input     | `true` when popup open                  |
| `aria-controls`          | search input     | ID of the listbox                       |
| `aria-activedescendant`  | search input     | ID of the highlighted option            |
| `aria-autocomplete`      | search input     | `list` (filters as you type)            |
| `role="listbox"`         | list container   | Always                                  |
| `role="option"`          | each item        | Always                                  |
| `aria-selected`          | each option      | `true` for selected, `false` otherwise  |
| `aria-disabled`          | disabled options | `true` if option is disabled            |

---

## Keyboard interactions

### Focus on search input (inside popover):

| Key           | Behavior                                         |
|---------------|--------------------------------------------------|
| `ArrowDown`   | Highlight next item                              |
| `ArrowUp`     | Highlight previous item                          |
| `Home`        | Highlight first visible item                     |
| `End`         | Highlight last visible item                      |
| `Enter`       | Select highlighted item, close popup             |
| `Escape`      | Close popup, return focus to trigger             |
| `Tab`         | Close popup, move focus to next element          |
| Typing        | Filter items, auto-highlight first match         |

---

## States

The api is bound **per dropdown popover**. Declared states: `default`
(closed) · `open` (listbox shown, search focused).
`getState().config.value` reports the selected option's text.

```js
document.querySelector('#cb-framework-popover').api.setState('open');
document.querySelector('#cb-framework-popover').api.getState(); // { name: 'open', config: { value: '' } }
```

The registry global is `df$.shadcn.comboboxApi` / `df$.shadcn.comboboxStates`.

## Notes

- Filtering toggles option `hidden` flags **in place** through the core `df$`
  runtime (see the "DOM Querying & Morphing" guide) - consumer-authored
  options keep node identity across filtering (caret/selection survive);
  only membership/order changes would justify a keyed `df$(listbox).morph()`
- The trigger is a `.btn[data-variant="outline"]` - styled by the button system
- When the popover opens, focus moves to the search input inside
- When the popover closes, focus returns to the trigger button
- Use `aria-activedescendant` to communicate the highlighted item to screen readers
- The `popover` attribute enables top-layer rendering and light-dismiss
- CSS anchor positioning (`position-anchor`, `anchor()`, `position-try-fallbacks: flip-block`) places the popover below the trigger; no JS positioning needed
- The popover animates in via `@starting-style` + `transition-behavior: allow-discrete`
- The check icon for selected items uses a CSS `::before` pseudo-element
- Filter matching is case-insensitive and supports substring matching
- The clear button (`.combobox-clear`, ✕) is **injected by the JS after the trigger** - consumer markup never contains it. It replaces the chevron whenever a value is selected (pure CSS via `:has()`), and clicking it restores the placeholder and deselects every option
- The empty state element is shown when no items match the filter query
- Group labels and separators auto-hide when their group has no visible items
- `overscroll-behavior: contain` prevents scroll chaining from the listbox
- `prefers-reduced-motion: reduce` disables all transitions
- `forced-colors: active` supports Windows High Contrast Mode
