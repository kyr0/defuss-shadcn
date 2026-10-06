// -- Tree View ------------------------------------------------
// Keyboard navigation and ARIA state for tree views, plus the named-state
// API bound per branch (<details class="tree-branch">), so agents/tests can
// expand branches by name (AGENTS.md "State API"). Opt-in on the .tree:
// data-selectable (single selection), data-checkable (checkboxes that
// cascade to children and roll up to parents - tri-state) and data-sortable
// (drag & drop reordering with the native Drag and Drop API, Alt+Arrow keys).

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** What tree-select carries. */
interface TreeSelectDetail {
  /** the selected treeitem */
  item: HTMLElement;
}

/** What tree-check carries. */
interface TreeCheckDetail {
  /** the treeitem whose checkbox was toggled */
  item: HTMLElement;
  /** whether it is checked now */
  checked: boolean;
  /** every fully checked item's value (the checkbox value, else the item's label) */
  values: string[];
}

/** What tree-reorder carries. */
interface TreeReorderDetail {
  /** the treeitem that moved */
  item: HTMLElement;
  /** its new parent treeitem - the tree itself at the top level */
  parent: HTMLElement;
  /** its index among the parent's children */
  index: number;
}

const treeViewStates = ['default', 'expanded'];

/** setState() configs per state - bound on every branch (a <details>); the states take none. */
export interface TreeViewStateConfigs {
  /** The branch closed. */
  default: {};
  /** The branch open. */
  expanded: {};
}

/**
 * The markup of a state, for render(): the attributes a state writes, applied
 * to a detached copy of the authored markup ('default' IS the authored
 * markup). The live element gets the same markup from triggerStateChange -
 * the e2e render round trip proves they agree.
 */
function applyMarkup(el, stateName) {
  // 'expanded' is open; 'default' is the authored open flag - in place on the
  // authored copy
  if (stateName === 'expanded') dfDollar(el).attr('open', '');
}

/**
 * UI side of setState (per branch): 'expanded' opens the branch, 'default'
 * restores the authored open/closed snapshot taken at init. The <details>
 * toggle event keeps aria-expanded on the treeitem in sync automatically.
 */
function triggerStateChange(details, stateName, _config) {
  switch (stateName) {
    case 'default':
      details.open = details._defaultOpen ?? false;
      break;
    case 'expanded':
      details.open = true;
      break;
  }
}

/** Registry-level API; pass the branch element explicitly. Unknown names throw. */
export const treeViewApi = componentState({
  component: 'tree-view',
  states: treeViewStates,
  apply: (details, state) => triggerStateChange(details, state.name, state.config),
  read: (details, state) => {
    // reflect reality: summary clicks and ArrowLeft/Right change it too
    return {
      name: details.open ? 'expanded' : 'default',
      config: state.config,
    };
  },
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.treeViewApi = treeViewApi;
df$.treeViewStates = treeViewStates;

/** The treeitem a row (branch trigger or leaf) belongs to. */
const itemOf = (row) => row.closest('[role="treeitem"]');
/** aria-disabled="true" on the treeitem: focusable, never operable. */
const isDisabled = (item) => item?.getAttribute('aria-disabled') === 'true';

/**
 * Single selection (APG tree, opt-in via data-selectable on .tree): the
 * chosen treeitem gets aria-selected="true", every other selectable item
 * "false"; disabled items are skipped. Announces the choice as a bubbling
 * `tree-select` CustomEvent ({ detail: { item } }) - selection is an
 * interaction on the tree, not a per-branch State API state.
 */
function selectItem(tree, item) {
  if (!item || isDisabled(item) || item.getAttribute('aria-selected') === 'true') return;
  dfDollar(tree).find('[role="treeitem"][aria-selected="true"]').toArray().forEach((other) => other.setAttribute('aria-selected', 'false'));
  item.setAttribute('aria-selected', 'true');
  // Fires when an item is selected - the item.
  tree.dispatchEvent(new CustomEvent<TreeSelectDetail>('tree-select', { bubbles: true, detail: { item } }));
}


/* -- Checkboxes (data-checkable) ------------------------------------------
   A checkbox in a row (.tree-check, after the icons, before the label).
   Checking a folder checks everything under it; a folder's own box shows
   checked / unchecked / indeterminate from its children. data-checkable=
   "independent" turns the cascade off. The inputs stay real form controls
   (name / value submit natively). */
const checkOf = (item) => (item ? dfDollar(item).find(':scope > .tree-leaf > .tree-check, :scope > details > .tree-branch-trigger > .tree-check').get(0) : undefined);
const childItems = (item) => [...(dfDollar(item).find(':scope > details > .tree-group').get(0)?.children ?? [])].filter((li) => li.matches('[role="treeitem"]'));
const cascades = (tree) => tree.dataset.checkable !== 'independent';

/** Down: a folder's state to every descendant box. */
function checkDown(item, checked) {
  for (const child of childItems(item)) {
    const box = checkOf(child);
    if (box && !box.disabled) {
      box.checked = checked;
      box.indeterminate = false;
    }
    checkDown(child, checked);
  }
}
/** Up: every ancestor folder derives its box from its children. */
function rollUp(tree, item) {
  let parent = item.parentElement?.closest('[role="treeitem"]');
  while (parent && tree.contains(parent)) {
    const box = checkOf(parent);
    if (box) {
      const kids = childItems(parent).map(checkOf).filter(Boolean);
      const on = kids.filter((k) => k.checked && !k.indeterminate).length;
      const mixed = kids.some((k) => k.indeterminate);
      box.checked = kids.length > 0 && on === kids.length;
      box.indeterminate = mixed || (on > 0 && on < kids.length);
    }
    parent = parent.parentElement?.closest('[role="treeitem"]');
  }
}
function syncAria(tree) {
  dfDollar(tree).find('[role="treeitem"]').toArray().forEach((item) => {
    const box = checkOf(item);
    if (box) item.setAttribute('aria-checked', box.indeterminate ? 'mixed' : String(box.checked));
  });
}
function checkedValues(tree) {
  return [...dfDollar(tree).find('.tree-check').toArray()]
    .filter((b) => b.checked && !b.indeterminate)
    .map((b) => b.value !== 'on' ? b.value : dfDollar(b).closest('[role="treeitem"]').find(':scope > * > span:last-child, :scope > details > summary > span:last-child').get(0)?.textContent ?? '');
}
function onCheck(tree, item) {
  const box = checkOf(item);
  if (!box) return;
  box.indeterminate = false;
  if (cascades(tree)) {
    checkDown(item, box.checked);
    rollUp(tree, item);
  }
  syncAria(tree);
  // Fires when a checkbox is toggled - the item, whether it is checked, and every checked value.
  tree.dispatchEvent(new CustomEvent<TreeCheckDetail>('tree-check', { bubbles: true, detail: { item, checked: box.checked, values: checkedValues(tree) } }));
}
function initChecks(tree) {
  let n = 0;
  dfDollar(tree).find('.tree-check').toArray().forEach((box) => {
    // the row's label names the checkbox
    if (!box.hasAttribute('aria-label') && !box.hasAttribute('aria-labelledby')) {
      const label = dfDollar(box.parentElement).find(':scope > span:last-child').get(0);
      if (label) {
        label.id ||= `${tree.id || 'tree'}-lbl-${n++}-${Math.random().toString(36).slice(2, 7)}`;
        box.setAttribute('aria-labelledby', label.id);
      }
    }
  });
  if (cascades(tree)) {
    // authored checked folders cascade down, then every folder rolls up
    dfDollar(tree).find('[role="treeitem"]').toArray().forEach((item) => { const b = checkOf(item); if (b?.checked) checkDown(item, true); });
    const leaves = [...dfDollar(tree).find('[role="treeitem"]').toArray()].filter((i) => !childItems(i).length);
    leaves.forEach((leaf) => rollUp(tree, leaf));
  }
  syncAria(tree);
  tree.addEventListener('change', (e) => {
    if (!e.target.matches?.('.tree-check')) return;
    onCheck(tree, itemOf(e.target));
  });
}

/* -- Drag & drop reordering (data-sortable) -------------------------------
   Rows are draggable (native Drag and Drop API). Dropping on the upper /
   lower quarter of a row puts the item before / after it; dropping on the
   middle of a folder moves it into that folder (opened). A folder can't
   move into itself. Alt+ArrowUp / Alt+ArrowDown moves the focused item
   among its siblings. Every move fires a bubbling tree-reorder event. */
function clearDrop(tree) {
  dfDollar(tree).find('[data-drop]').toArray().forEach((r) => r.removeAttribute('data-drop'));
}
function announceMove(tree, item) {
  const parentItem = item.parentElement.closest('[role="treeitem"]');
  const index = [...item.parentElement.children].indexOf(item);
  // Fires after an item is moved - the item, its new parent and its index there.
  tree.dispatchEvent(new CustomEvent<TreeReorderDetail>('tree-reorder', { bubbles: true, detail: { item, parent: parentItem ?? tree, index } }));
}
function initSortable(tree) {
  let dragged = null;
  const rows = () => dfDollar(tree).find('.tree-branch-trigger, .tree-leaf').toArray();
  rows().forEach((row) => { if (!isDisabled(itemOf(row))) row.draggable = true; });
  tree.addEventListener('dragstart', (e) => {
    const row = e.target.closest?.('.tree-branch-trigger, .tree-leaf');
    if (!row) return;
    dragged = itemOf(row);
    dragged.dataset.dragging = '';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', row.textContent.trim());
  });
  tree.addEventListener('dragover', (e) => {
    const row = e.target.closest?.('.tree-branch-trigger, .tree-leaf');
    if (!dragged || !row) return;
    const target = itemOf(row);
    if (target === dragged || dragged.contains(target)) return clearDrop(tree);
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const r = row.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    const isBranch = row.matches('.tree-branch-trigger');
    const where = isBranch ? (y < 0.25 ? 'before' : y > 0.75 ? 'after' : 'inside') : y < 0.5 ? 'before' : 'after';
    if (row.dataset.drop !== where) {
      clearDrop(tree);
      row.dataset.drop = where;
    }
  });
  tree.addEventListener('dragleave', (e) => {
    if (!tree.contains(e.relatedTarget)) clearDrop(tree);
  });
  tree.addEventListener('drop', (e) => {
    const row = dfDollar(tree).find('[data-drop]').get(0);
    if (!dragged || !row) return;
    e.preventDefault();
    const target = itemOf(row);
    const where = row.dataset.drop;
    if (where === 'inside') {
      const details = dfDollar(target).find(':scope > details').get(0);
      details.open = true;
      dfDollar(details).find(':scope > .tree-group').get(0).append(dragged);
    } else {
      const ref = where === 'before' ? target : target.nextSibling;
      if (ref) dfDollar(ref).before(dragged);
      else dfDollar(target.parentElement).append(dragged);
    }
    clearDrop(tree);
    announceMove(tree, dragged);
    if (tree.hasAttribute('data-checkable') && cascades(tree)) {
      dfDollar(tree).find('[role="treeitem"]').toArray().forEach((i) => { if (!childItems(i).length) rollUp(tree, i); });
      syncAria(tree);
    }
  });
  tree.addEventListener('dragend', () => {
    if (dragged) delete dragged.dataset.dragging;
    dragged = null;
    clearDrop(tree);
  });
}
/** Alt+ArrowUp / Alt+ArrowDown: move among siblings, keep focus. */
function moveByKey(tree, row, dir) {
  const item = itemOf(row);
  const sib = dir < 0 ? item.previousElementSibling : item.nextElementSibling;
  if (!sib) return;
  const ref = dir < 0 ? sib : sib.nextSibling;
  if (ref) dfDollar(ref).before(item);
  else dfDollar(item.parentElement).append(item);
  row.focus();
  announceMove(tree, item);
}

function init() {
  dfDollar('.tree[role="tree"]:not([data-init])').toArray().forEach((tree) => {
    tree.dataset.init = '';
    const selectable = tree.hasAttribute('data-selectable');
    if (selectable) {
      // every operable item states its selection explicitly (authored
      // aria-selected="true" wins); disabled items carry none
      dfDollar(tree).find('[role="treeitem"]').toArray().forEach((item) => {
        if (!isDisabled(item) && !item.hasAttribute('aria-selected')) item.setAttribute('aria-selected', 'false');
      });
    }

    if (tree.hasAttribute('data-checkable')) initChecks(tree);
    if (tree.hasAttribute('data-sortable')) initSortable(tree);
    const checkable = tree.hasAttribute('data-checkable');

    /* Clicks: disabled rows neither toggle nor navigate; selectable trees
       select the clicked row (a branch toggles AND selects, like a file
       explorer). */
    tree.addEventListener('click', (e) => {
      const row = e.target.closest('.tree-branch-trigger, .tree-leaf');
      if (!row || !tree.contains(row)) return;
      const item = itemOf(row);
      if (isDisabled(item)) {
        e.preventDefault(); // <summary> would toggle, <a> would navigate
        return;
      }
      if (selectable) selectItem(tree, item);
      // a checkable leaf: clicking the row (not the box itself) ticks it
      const box = checkOf(item);
      if (checkable && !selectable && box && row.matches('.tree-leaf') && e.target !== box && !box.disabled) {
        box.checked = !box.checked;
        onCheck(tree, item);
      }
    });
    /* Keep aria-expanded in sync with <details> open state */
    dfDollar(tree).find('.tree-branch').toArray().forEach((details) => {
      const treeitem = details.closest('[role="treeitem"]');
      if (!treeitem) return;

      // snapshot the authored state + bind the api per branch:
      // `$('#my-branch').api.setState('expanded')`
      details._defaultOpen = details.open;
      // el.store + el.api (AGENTS.md "State through stores")
      bindComponent(details, treeViewApi);

      details.addEventListener('toggle', () => {
        treeitem.setAttribute('aria-expanded', String(details.open));
        // user interaction also moves the named state (keeps getState honest)
        details.dataset.stateName = details.open ? 'expanded' : 'default';
      });
    });

    /* Keyboard navigation */
    tree.addEventListener('keydown', (e) => {
      const target = e.target.closest('.tree-branch-trigger, .tree-leaf');
      if (!target) return;

      const allItems = Array.from(dfDollar(tree).find('.tree-branch-trigger, .tree-leaf').toArray());
      const visibleItems = allItems.filter((item) => item.checkVisibility());
      const index = visibleItems.indexOf(target);

      // sortable: Alt+ArrowUp / Alt+ArrowDown reorder among siblings
      if (e.altKey && tree.hasAttribute('data-sortable') && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        moveByKey(tree, target, e.key === 'ArrowUp' ? -1 : 1);
        return;
      }
      // checkable: Space ticks the row's box (a <summary> would toggle instead)
      if (e.key === ' ' && checkable) {
        const box = checkOf(itemOf(target));
        if (box && !box.disabled && !isDisabled(itemOf(target))) {
          e.preventDefault();
          box.checked = !box.checked;
          onCheck(tree, itemOf(target));
          return;
        }
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (index < visibleItems.length - 1) visibleItems[index + 1].focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (index > 0) visibleItems[index - 1].focus();
          break;
        case 'ArrowRight':
          e.preventDefault();
          { const detailsR = target.closest('details.tree-branch');
          if (detailsR && !detailsR.open && !isDisabled(itemOf(target))) detailsR.open = true; }
          break;
        case 'Enter':
        case ' ': {
          const item = itemOf(target);
          // disabled: no native <summary> toggle, no link activation
          if (isDisabled(item)) {
            e.preventDefault();
            break;
          }
          if (!selectable) break;
          // a leaf span has no native activation - keep Space from scrolling
          if (target.matches('span.tree-leaf')) e.preventDefault();
          selectItem(tree, item);
          break;
        }
        case 'ArrowLeft':
          e.preventDefault();
          { const detailsL = target.closest('details.tree-branch');
          if (detailsL && detailsL.open) detailsL.open = false; }
          break;
        case 'Home':
          e.preventDefault();
          if (visibleItems.length) visibleItems[0].focus();
          break;
        case 'End':
          e.preventDefault();
          if (visibleItems.length) visibleItems[visibleItems.length - 1].focus();
          break;
      }
    });
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
