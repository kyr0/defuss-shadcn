---
name: Tree View
type: ATM
why: role=tree with expandable nodes and the full arrow-key interaction model.
when: Any hierarchy the user browses or picks from - file explorers, product categories, org charts, docs navigation menus (links as leaves); single selection, checkboxes (tri-state cascade), drag & drop reordering and disabled items built in. For one flat level use a list; for show/hide sections use accordion.
where: dist/components/tree-view/tree-view.css + dist/components/tree-view/tree-view.js
supportedStates: default, expanded
---

# Tree View

## Native basis

Nested `<ul>` elements with `role="tree"` / `role="treeitem"` ARIA pattern for hierarchical data.

## Native Web APIs

- [HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) - drag & drop reordering (data-sortable)
- [`:indeterminate`](https://developer.mozilla.org/en-US/docs/Web/CSS/:indeterminate) - a folder whose children are partly checked
- [`<ul>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul) - nested list structure
- [Tree View WAI-ARIA pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) - ARIA tree roles and keyboard navigation
- [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) - native expand/collapse for branches

## Structure

```html
<ul class="tree" role="tree" aria-label="File explorer">
  <li class="tree-item" role="treeitem" aria-expanded="true">
    <details class="tree-branch" open>
      <summary class="tree-branch-trigger">
        <svg><!-- chevron --></svg>
        <svg><!-- folder icon --></svg>
        <span>src</span>
      </summary>
      <ul class="tree-group" role="group">
        <li class="tree-item" role="treeitem">
          <span class="tree-leaf">
            <svg><!-- file icon --></svg>
            <span>index.ts</span>
          </span>
        </li>
      </ul>
    </details>
  </li>
  <li class="tree-item" role="treeitem">
    <span class="tree-leaf">
      <svg><!-- file icon --></svg>
      <span>package.json</span>
    </span>
  </li>
</ul>
```

## Selection, disabled items, links, empty branches

- **Selection (opt-in):** add `data-selectable` to the `.tree` root. A click, Enter or Space selects the row: the treeitem gets `aria-selected="true"` (every other operable item `"false"`), styled with a primary-tinted surface + medium weight. A branch toggles **and** selects. Each choice fires a bubbling `tree-select` CustomEvent on the tree with `detail.item` = the selected treeitem. Preselect by authoring `aria-selected="true"`.
- **Disabled:** `aria-disabled="true"` on a treeitem dims its row and makes it inert - a disabled branch cannot be opened (click, Enter, Space, ArrowRight), a disabled row cannot be selected, a disabled link leaf does not navigate. It stays focusable in the arrow-key path (WAI-ARIA APG). The per-branch `api.setState('expanded')` still works programmatically.
- **Links:** navigation trees use `<a class="tree-leaf" href="…">` as leaves (no underline, pointer cursor); mark the current page with `aria-selected="true"` inside a `data-selectable` tree.
- **Empty branch:** keep the branch's `<ul class="tree-group" role="group">` empty - an open empty branch shows a muted "Empty" row (generated content). Custom text: `data-empty="No reports yet"` on that `.tree-group`.
- **Collapsed / expanded:** `open` on each `<details class="tree-branch">` (with a matching `aria-expanded` on its treeitem) is the whole API - omit it everywhere for a fully collapsed tree, set it everywhere for a fully expanded one.
- **Deep nesting / long labels:** every level indents 1.25rem; a label (the row's last `<span>`) truncates with an ellipsis when it runs out of room - put the full text in `title`. Pair deep trees with `data-variant="guides"`.

```html
<ul class="tree" role="tree" aria-label="Mail folders" data-selectable>
  <li class="tree-item" role="treeitem" aria-selected="true"><span class="tree-leaf" tabindex="0"><span>Inbox</span></span></li>
  <li class="tree-item" role="treeitem" aria-disabled="true"><span class="tree-leaf" tabindex="0"><span>Locked</span></span></li>
  <li class="tree-item" role="treeitem" aria-expanded="true">
    <details class="tree-branch" open>
      <summary class="tree-branch-trigger" tabindex="0"><svg><!-- chevron --></svg><span>Drafts</span></summary>
      <ul class="tree-group" role="group" data-empty="No drafts"></ul>
    </details>
  </li>
</ul>
```

## Checkboxes (data-checkable)

```html
<ul class="tree" role="tree" aria-label="Files" data-checkable>
  <li class="tree-item" role="treeitem" aria-expanded="true">
    <details class="tree-branch" open>
      <summary class="tree-branch-trigger" tabindex="0">
        <svg><!-- chevron --></svg><svg><!-- folder --></svg>
        <input type="checkbox" class="checkbox tree-check" name="files" value="src">
        <span>src</span>
      </summary>
      <ul class="tree-group" role="group">
        <li class="tree-item" role="treeitem"><span class="tree-leaf" tabindex="0"><svg>…</svg><input type="checkbox" class="checkbox tree-check" name="files" value="index"><span>index.ts</span></span></li>
      </ul>
    </details>
  </li>
</ul>
```

- A `.tree-check` checkbox goes after the icons, before the label span; the
  label names it (`aria-labelledby` is wired automatically).
- Cascade: checking a folder checks its subtree; a folder's box derives from
  its children (checked / unchecked / indeterminate) and the treeitem mirrors
  it as `aria-checked` (`true` / `false` / `mixed`). Authored `checked`
  folders cascade down on load. `data-checkable="independent"` turns the
  cascade off.
- A click on the box never toggles the folder; Space on a focused row ticks
  its box; a click on a file's name ticks it too.
- The inputs are real form controls (`name` / `value` submit). Every change
  fires `tree-check` (`{ item, checked, values }`).

## Drag and drop (data-sortable)

- Rows become draggable (native Drag and Drop API). Dropping on the upper /
  lower part of a row places the item before / after it; on the middle of a
  folder, inside it (the folder opens). A folder can't move into itself.
- Keyboard: Alt+ArrowUp / Alt+ArrowDown moves the focused item among its
  siblings (focus stays on it).
- Every move fires `tree-reorder` (`{ item, parent, index }`); checkable
  trees re-derive their folders' boxes after a move.
- Combine freely with `data-checkable` / `data-selectable`.

## Variants

| `data-variant` (on `.tree`) | Visual |
| --- | --- |
| *(none)* | Indentation only (default) |
| `guides` | A vertical guideline per nested `.tree-group`, under the parent branch's chevron - shows the depth of nesting. The line of the innermost group holding focus darkens (`:focus-within`). Drawn as a border, so it survives forced-colors mode. |

## States

The api is bound **per branch** (`<details class="tree-branch">`). Declared
states: `default` (the branch's authored open/closed state, restored via the
init snapshot) · `expanded` (branch open; `aria-expanded` on the treeitem
stays in sync through the native toggle event).

```js
document.querySelector('#my-branch').api.setState('expanded');
document.querySelector('#my-branch').api.getState(); // { name: 'expanded', config: {} }
```

The registry global is `df$.shadcn.treeViewApi` / `df$.shadcn.treeViewStates` (camelCase).

## Density

Set `data-density` on the `.tree` root; the row `padding-block` scales. The structural indent is never touched.

| Value | Effect |
| --- | --- |
| `compact` | Row padding-block 0.125rem |
| `comfortable` | 0.25rem - identical to the unsized default |
| `spacious` | 0.375rem |

## Accessibility

- Root `<ul>` has `role="tree"` and `aria-label`
- Branch items have `role="treeitem"` and `aria-expanded`
- Leaf items have `role="treeitem"` without `aria-expanded`
- Nested groups use `role="group"`
- Keyboard: Arrow Up/Down move between visible rows, Right/Left open/close a branch, Home/End jump; Enter/Space toggles a branch and (in a `data-selectable` tree) selects the row
- Selectable trees: `aria-selected` on every operable treeitem (`true` on exactly one); forced-colors mode shows the selected row in the system Highlight pair
- Disabled items: `aria-disabled="true"` on the treeitem - announced as unavailable, focusable, not operable
