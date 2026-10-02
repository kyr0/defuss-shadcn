---
name: Search Suggestions
type: BLK
why: The panel follows the ARIA combobox / listbox pattern; matches are <mark>s. The native variant is a <datalist> - zero script.
when: Under a search-box. The full results page is search-summary + search-result.
where: dist/components/search-suggestions/search-suggestions.css
supportedStates: default
---

# Pattern: Search Suggestions

## Native basis
An input with `role="combobox"`, `aria-expanded` and `aria-controls`, and a `role="listbox"` panel with groups (`role="group"` + label) of `role="option"` rows; the matched text is a `<mark>`. Your script filters and moves `aria-activedescendant`; the `datalist` variant needs none.

Built from: [Input](../input/component-skill.md), [Kbd](../kbd/component-skill.md).

---

## Native Web APIs
- [`<mark>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark) - highlighted matches
- [`<datalist>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist) - native suggestions for an input
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - parent styles react to a checked input or a state inside

---

## Structure

```html
<div class="mk-search-suggestions">
  <div class="mk-search-suggestions-field"><i data-lucide="search"></i><label class="sr-only" for="ss-q">Search</label><input class="input" id="ss-q" type="search" value="sync" role="combobox" aria-expanded="true" aria-controls="ss-list" aria-activedescendant="ss-o2" aria-autocomplete="list" autocomplete="off"></div>
  <div class="mk-search-suggestions-panel" id="ss-list" role="listbox" aria-label="Suggestions">
    <div class="mk-search-suggestions-group" role="group" aria-labelledby="ss-g1"><span id="ss-g1">Recent</span>
      <div class="mk-search-suggestions-option" role="option" id="ss-o1"><i data-lucide="history"></i><span><mark>sync</mark> stuck on phone</span><small></small></div>
    </div>
    <div class="mk-search-suggestions-group" role="group" aria-labelledby="ss-g2"><span id="ss-g2">Pages</span>
      <div class="mk-search-suggestions-option" role="option" id="ss-o2" aria-selected="true"><i data-lucide="file-text"></i><span>Offline <mark>sync</mark></span><small>Docs · Guides</small></div>
      <div class="mk-search-suggestions-option" role="option" id="ss-o3"><i data-lucide="file-text"></i><span><mark>Sync</mark> conflicts explained</span><small>Help</small></div>
    </div>
    <div class="mk-search-suggestions-group" role="group" aria-labelledby="ss-g3"><span id="ss-g3">Tasks</span>
      <div class="mk-search-suggestions-option" role="option" id="ss-o4"><i data-lucide="square-check"></i><span><mark>Sync</mark> engine v2 rollout</span><small>Engineering</small></div>
    </div>
    <div class="mk-search-suggestions-foot" aria-hidden="true"><span><kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> move</span><span><kbd class="kbd">↵</kbd> open</span><span><kbd class="kbd">esc</kbd> close</span></div>
  </div>
</div>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A grouped panel under the field: recent, pages, people |
| `data-variant="native"` | A `<datalist>` - the browser shows the suggestions |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| input | `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-activedescendant` | APG combobox pattern |
| options | `role="option"` + `aria-selected` | The active one is announced |
| match | `<mark>` | Highlighted text |

---

## Notes
- Keep the panel to 6–8 rows; offer "see all results".
