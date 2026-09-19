// -- Sortable -------------------------------------------------
// Drag-and-drop + keyboard reordering for sortable lists.
// Keyboard: Arrow keys navigate, Alt+Arrow reorders, Home/End jump.
// Live region announces position changes to screen readers.
// Named-state API (AGENTS.md "State API"): the list's observable state is
// its item order + active item, so 'default' restores the authored order
// (optional { index } activates one item) and getState() reports both live.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

const sortableStates = ['default'];

const sortableLabels = (list) =>
  Array.from(list.querySelectorAll('.sortable-item')).map(
    (item) => item.querySelector('span:not(.sortable-handle)')?.textContent?.trim() ?? '',
  );

/**
 * UI side of setState: 'default' restores the authored order snapshot (taken
 * at init) and optionally activates the item at config.index.
 */
function triggerStateChange(list, stateName, config) {
  if (stateName !== 'default') return;
  for (const item of list._defaultOrder ?? []) list.appendChild(item);
  if (config?.index !== undefined) {
    const item = list.querySelectorAll('.sortable-item')[Number(config.index)];
    list._setActive?.(item);
  }
}

/** Registry-level API; pass the list element explicitly. Unknown names throw. */
export const sortableApi = {
  setState(list, stateName, config = {}) {
    if (!sortableStates.includes(stateName)) {
      throw new Error(`sortable: unknown state "${stateName}" (supported: ${sortableStates.join(', ')})`);
    }
    triggerStateChange(list, stateName, config);
    // state lives on the ELEMENT, not the module (many lists per page)
    list.dataset.stateName = stateName;
    list._stateConfig = config;
  },
  getState(list) {
    const items = Array.from(list.querySelectorAll('.sortable-item'));
    const active = list.querySelector('.sortable-item[data-active]');
    return {
      name: list.dataset.stateName || 'default',
      config: {
        ...list._stateConfig,
        order: sortableLabels(list),
        activeIndex: active ? items.indexOf(active) : -1,
      },
    };
  },
};

df$.sortableApi = sortableApi;
df$.sortableStates = sortableStates;

function init() {
document.querySelectorAll('.sortable:not([data-init])').forEach((list) => {
  list.dataset.init = '';
  // bind-scope the api per instance: `$('#tasks').api.setState('default')`
  list.api = {
    setState: (stateName, config) => sortableApi.setState(list, stateName, config),
    getState: () => sortableApi.getState(list),
  };

  const isHorizontal = list.dataset.orientation === 'horizontal';
  const NEXT_KEY = isHorizontal ? 'ArrowRight' : 'ArrowDown';
  const PREV_KEY = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

  // -- Live region for announcements --
  // Look only at the node directly after the list (where init inserts it): a
  // parent-wide query would hand sibling lists the same region, so one list
  // would announce through a region anchored to the other list.
  let liveRegion = list.nextElementSibling;
  if (!liveRegion || !liveRegion.classList.contains('sortable-live')) {
    liveRegion = document.createElement('span');
    liveRegion.className = 'sortable-live';
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.setAttribute('role', 'status');
    if (list.parentElement) {
      list.parentElement.insertBefore(liveRegion, list.nextSibling);
    } else {
      list.after(liveRegion);
    }
  }

  function announce(msg) {
    liveRegion.textContent = '';
    requestAnimationFrame(() => { liveRegion.textContent = msg; });
  }

  function getItems() {
    return Array.from(list.querySelectorAll('.sortable-item:not([aria-disabled="true"])'));
  }

  function getAllItems() {
    return Array.from(list.querySelectorAll('.sortable-item'));
  }

  function getActiveItem() {
    return list.querySelector('.sortable-item[data-active]');
  }

  function setActive(item) {
    getAllItems().forEach((el) => {
      el.removeAttribute('data-active');
      el.setAttribute('tabindex', '-1');
    });
    if (item) {
      item.setAttribute('data-active', '');
      item.setAttribute('tabindex', '0');
      item.focus();
    }
  }
  // expose for the State API (element member, not module scope)
  list._setActive = setActive;
  // authored-order snapshot for setState('default')
  list._defaultOrder = getAllItems();

  function getItemLabel(item) {
    const handle = item.querySelector('.sortable-handle');
    const clone = item.cloneNode(true);
    if (handle) {
      const handleClone = clone.querySelector('.sortable-handle');
      if (handleClone) handleClone.remove();
    }
    return clone.textContent.trim();
  }

  // -- Initialize tabindex --
  const allItems = getAllItems();
  allItems.forEach((item, i) => {
    item.setAttribute('tabindex', i === 0 ? '0' : '-1');
  });

  // -- Drag and drop --
  let dragged = null;

  list.querySelectorAll('.sortable-item').forEach((item) => {
    if (item.getAttribute('aria-disabled') === 'true') return;

    item.addEventListener('dragstart', (e) => {
      dragged = item;
      item.setAttribute('data-dragging', '');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    });

    item.addEventListener('dragend', () => {
      item.removeAttribute('data-dragging');
      list.querySelectorAll('[data-over]').forEach((el) => el.removeAttribute('data-over'));
      dragged = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!dragged || dragged === item) return;
      const rect = item.getBoundingClientRect();
      const midpoint = isHorizontal
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
      const pos = isHorizontal ? e.clientX : e.clientY;
      // Clear other indicators
      list.querySelectorAll('[data-over]').forEach((el) => {
        if (el !== item) el.removeAttribute('data-over');
      });
      item.setAttribute('data-over', pos < midpoint ? 'before' : 'after');
    });

    item.addEventListener('dragleave', () => {
      item.removeAttribute('data-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const position = item.getAttribute('data-over');
      item.removeAttribute('data-over');
      if (!dragged || dragged === item) return;

      if (position === 'before') {
        list.insertBefore(dragged, item);
      } else {
        list.insertBefore(dragged, item.nextSibling);
      }

      const items = getItems();
      const newIndex = items.indexOf(dragged);
      announce(`${getItemLabel(dragged)}, moved to position ${newIndex + 1} of ${items.length}`);
      setActive(dragged);

      list.dispatchEvent(new CustomEvent('sortable-change', {
        bubbles: true,
        detail: { item: dragged, index: newIndex }
      }));
    });
  });

  // -- Keyboard navigation --
  list.addEventListener('keydown', (e) => {
    const active = getActiveItem() || list.querySelector('.sortable-item[tabindex="0"]');
    if (!active) return;
    const items = getItems();
    const idx = items.indexOf(active);

    // Arrow navigation
    if (e.key === NEXT_KEY && !e.altKey) {
      e.preventDefault();
      const next = items[idx + 1];
      if (next) setActive(next);
    } else if (e.key === PREV_KEY && !e.altKey) {
      e.preventDefault();
      const prev = items[idx - 1];
      if (prev) setActive(prev);
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (items.length) setActive(items[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (items.length) setActive(items[items.length - 1]);

    // Alt+Arrow reorders
    } else if (e.key === NEXT_KEY && e.altKey) {
      e.preventDefault();
      if (idx < items.length - 1) {
        const sibling = items[idx + 1];
        list.insertBefore(active, sibling.nextSibling);
        const newItems = getItems();
        const newIdx = newItems.indexOf(active);
        announce(`${getItemLabel(active)}, moved to position ${newIdx + 1} of ${newItems.length}`);
        setActive(active);
        list.dispatchEvent(new CustomEvent('sortable-change', {
          bubbles: true,
          detail: { item: active, index: newIdx }
        }));
      }
    } else if (e.key === PREV_KEY && e.altKey) {
      e.preventDefault();
      if (idx > 0) {
        const sibling = items[idx - 1];
        list.insertBefore(active, sibling);
        const newItems = getItems();
        const newIdx = newItems.indexOf(active);
        announce(`${getItemLabel(active)}, moved to position ${newIdx + 1} of ${newItems.length}`);
        setActive(active);
        list.dispatchEvent(new CustomEvent('sortable-change', {
          bubbles: true,
          detail: { item: active, index: newIdx }
        }));
      }
    }
  });

  // -- Focus management --
  list.addEventListener('focusin', (e) => {
    const item = e.target.closest('.sortable-item');
    if (item && list.contains(item)) setActive(item);
  });
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
