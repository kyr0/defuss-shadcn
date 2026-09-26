---
name: Tree View
type: ATM
why: role=tree with expandable nodes and the full arrow-key interaction model.
when: Hierarchical data: file explorers, org charts, folder trees.
where: dist/components/tree-view/tree-view.css + dist/components/tree-view/tree-view.js
supportedStates: default, expanded
---

# Tree View

## Native basis

Nested `<ul>` elements with `role="tree"` / `role="treeitem"` ARIA pattern for hierarchical data.

## Native Web APIs

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
- Keyboard: Arrow keys navigate, Enter/Space toggles branches
