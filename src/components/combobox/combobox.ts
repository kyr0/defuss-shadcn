// -- Combobox -------------------------------------------------
// Searchable select with keyboard navigation and popover positioning, plus
// the named-state API bound per dropdown popover, so agents/tests can open
// and close it by name (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
// defussQuery: the callable runtime for scoped lookup + scalar writes
// (plans/defuss-query-morph-integration.md §3 combobox row: filtering an
// existing consumer-authored list is flag-based - NO full renderer; options
// keep node identity, only hidden/aria flags change).
import { defussGlobals, defussQuery, safeShowPopover } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const comboboxStates = ['default', 'open'];

/**
 * UI side of setState (per popover): 'default' closes, 'open' shows. The
 * wrapper's own open()/close() (registered at init) keep aria-expanded,
 * highlight and focus bookkeeping in one place.
 */
function triggerStateChange(popover, stateName, _config) {
  switch (stateName) {
    case 'default':
      popover._close?.();
      break;
    case 'open':
      popover._open?.();
      break;
  }
}

/** Registry-level API; pass the popover element explicitly. Unknown names throw. */
export const comboboxApi = {
  setState(popover, stateName, config = {}) {
    if (!comboboxStates.includes(stateName)) {
      throw new Error(`combobox: unknown state "${stateName}" (supported: ${comboboxStates.join(', ')})`);
    }
    triggerStateChange(popover, stateName, config);
    // state lives on the ELEMENT, not the module (many comboboxes per page)
    popover.dataset.stateName = stateName;
    popover._stateConfig = config;
  },
  getState(popover) {
    const selected = popover.querySelector('[role="option"][aria-selected="true"]');
    return {
      // reflect reality: trigger clicks and Escape change the UI too
      name: popover.matches(':popover-open') ? 'open' : 'default',
      config: { ...popover._stateConfig, value: selected?.textContent?.trim() ?? '' },
    };
  },
};

df$.comboboxApi = comboboxApi;
df$.comboboxStates = comboboxStates;

function init() {
  document.querySelectorAll('.combobox:not([data-init])').forEach((wrapper) => {
    wrapper.dataset.init = '';
    // scoped lookup through query (§3 direct integration); raw refs below are
    // kept only for native protocols (showPopover/focus/anchor wiring)
    const $wrapper = dfDollar(wrapper);
    const $trigger = $wrapper.find('.combobox-trigger');
    const $value = $wrapper.find('.combobox-value');
    const $popover = $wrapper.find('.combobox-content');
    const $search = $wrapper.find('.combobox-search-input');
    const $listbox = $wrapper.find('[role="listbox"]');
    const $empty = $wrapper.find('.combobox-empty');
    const trigger = $trigger[0] as HTMLElement | undefined;
    const popover = $popover[0] as HTMLElement | undefined;
    const searchInput = $search[0] as HTMLInputElement | undefined;
    const listbox = $listbox[0] as HTMLElement | undefined;
    if (!trigger || !popover || !searchInput || !listbox) return;

    // options are consumer-authored: a snapshot selection, flagged in place
    const allItems = $listbox.find('[role="option"]');
    let highlighted = -1;

    // CSS anchor positioning - unique name per trigger-popover pair
    const anchorId = `--combobox-${popover.id}`;
    $trigger.css('anchorName', anchorId);
    $popover.css('positionAnchor', anchorId);

    // Clear button - injected so consumer markup stays minimal (and the
    // button can't be nested in the trigger's <button>). Visibility is pure
    // CSS: .combobox-clear shows exactly while data-placeholder is absent
    // (combobox.css :has() rule); JS only wires the click and focus.
    // Trusted static icon markup (sanctioned §5.1 exception); inserted via
    // query's exact .after() so lifecycle goes through one adapter.
    const placeholder = $value.data('placeholder') ?? '';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'combobox-clear';
    clearBtn.setAttribute('aria-label', 'Clear selection');
    dfDollar(clearBtn).html(
      '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    ); // trusted static icon markup (§5.1)
    dfDollar(clearBtn).css('positionAnchor', anchorId);
    $trigger.after(clearBtn);
    clearBtn.addEventListener('click', () => {
      allItems.attr('aria-selected', 'false');
      // literal placeholder text + re-declare data-placeholder: selectItem
      // removed it, and it is the very marker the CSS :has() rule keys off
      // to hide this button again
      $value.text(placeholder).attr('data-placeholder', placeholder);
      // the button goes display:none with the selection - keep focus usable
      trigger.focus();
    });

    const getVisibleItems = () => allItems.filter((item) => !item.hidden && item.getAttribute('aria-disabled') !== 'true');
    const open = () => {
      // deferred show (safeShowPopover): showPopover() mid-exit crashes the
      // headless renderer; hide-then-show is deterministic everywhere.
      safeShowPopover(popover);
      $trigger.attr('aria-expanded', 'true');
      $search.val('');
      filter('');
      searchInput.focus();
    };
    const close = () => {
      popover.hidePopover();
      $trigger.attr('aria-expanded', 'false');
      $search.attr('aria-activedescendant', '');
      clearHighlight();
      trigger.focus();
    };
    // expose for the State API (element members, not module scope)
    popover._open = open;
    popover._close = close;
    // bind-scope the api per popover: `$('#cb-popover').api.setState('open')`
    popover.api = {
      setState: (stateName, config) => comboboxApi.setState(popover, stateName, config),
      getState: () => comboboxApi.getState(popover),
    };
    const isOpen = () => popover.matches(':popover-open');
    // flag-based filtering: hidden props toggle IN PLACE (nodes are never
    // replaced - identity, focus and caret survive), per §3's no-renderer rule
    const filter = (query) => {
      const q = query.toLowerCase(); let hasVisible = false;
      allItems.forEach((item) => { const match = !q || item.textContent.trim().toLowerCase().includes(q); dfDollar(item).prop('hidden', !match); if (match) hasVisible = true; });
      $listbox.find('.combobox-group-label').each(function (this: HTMLElement) {
        const label = this;
        let next = label.nextElementSibling; let groupHasVisible = false;
        while (next && !next.classList.contains('combobox-group-label') && !next.classList.contains('combobox-separator')) {
          if (next.getAttribute('role') === 'option' && !next.hidden) groupHasVisible = true; next = next.nextElementSibling;
        }
        dfDollar(label).prop('hidden', !groupHasVisible);
      });
      $listbox.find('.combobox-separator').each(function (this: HTMLElement) { const sep = this; const prev = sep.previousElementSibling; const next = sep.nextElementSibling; dfDollar(sep).prop('hidden', Boolean((prev && prev.hidden) || (next && next.hidden))); });
      if ($empty.length) $empty.prop('hidden', hasVisible);
    };
    const clearHighlight = () => { allItems.data('highlighted', null); highlighted = -1; };
    const doHighlight = (index) => {
      const items = getVisibleItems(); clearHighlight();
      if (index < 0 || index >= items.length) return;
      highlighted = index; dfDollar(items[index]).data('highlighted', '');
      items[index].scrollIntoView({ block: 'nearest' });
      $search.attr('aria-activedescendant', items[index].id);
    };
    const selectItem = (item) => {
      if (item.getAttribute('aria-disabled') === 'true') return;
      allItems.attr('aria-selected', 'false');
      dfDollar(item).attr('aria-selected', 'true');
      // trigger label mirrors the option's literal text (§3: query .text())
      $value.text(item.textContent.trim()).attr('data-placeholder', null);
      close();
    };
    trigger.addEventListener('click', () => { if (isOpen()) { close(); } else { open(); } });
    searchInput.addEventListener('input', () => { filter(searchInput.value); doHighlight(0); });
    searchInput.addEventListener('keydown', (e) => {
      const items = getVisibleItems();
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); doHighlight(Math.min(highlighted + 1, items.length - 1)); break;
        case 'ArrowUp': e.preventDefault(); doHighlight(Math.max(highlighted - 1, 0)); break;
        case 'Home': e.preventDefault(); doHighlight(0); break;
        case 'End': e.preventDefault(); doHighlight(items.length - 1); break;
        case 'Enter': e.preventDefault(); if (highlighted >= 0 && items[highlighted]) selectItem(items[highlighted]); break;
        case 'Escape': e.preventDefault(); close(); break;
        case 'Tab': close(); break;
      }
    });
    listbox.addEventListener('click', (e) => { const item = e.target.closest('[role="option"]'); if (item && !item.hidden && item.getAttribute('aria-disabled') !== 'true') selectItem(item); });
    listbox.addEventListener('mousemove', (e) => { const item = e.target.closest('[role="option"]'); if (item && !item.hidden) { const items = getVisibleItems(); doHighlight(items.indexOf(item)); } });
    popover.addEventListener('toggle', (e) => { if (e.newState === 'closed') { $trigger.attr('aria-expanded', 'false'); clearHighlight(); } });
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

