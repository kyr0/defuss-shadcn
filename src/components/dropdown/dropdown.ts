// -- Dropdown Menu --------------------------------------------
// Wires [data-dropdown-trigger] buttons to popover menus with
// full keyboard navigation and ARIA support, plus the named-state API
// so agents/tests can drive open/closed by name (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, safeShowPopover } from '../../shared/state-api.js';

const df$ = defussGlobals();

const dropdownStates = ['default', 'open'];

/**
 * UI side of setState: 'default' hides, 'open' shows. Open/close mechanics
 * stay native (Popover API); the toggle listener keeps aria-expanded and
 * highlight in sync either way.
 */
function triggerStateChange(menu, stateName, _config) {
  switch (stateName) {
    case 'default':
      try { menu.hidePopover(); } catch { /* already closed */ }
      break;
    case 'open':
      // deferred show (safeShowPopover): showPopover() mid-exit (right after
      // light dismiss) crashes the headless renderer; exclusion stays native.
      safeShowPopover(menu);
      break;
  }
}

/** Registry-level API; pass the menu element explicitly. Unknown names throw. */
export const dropdownApi = {
  setState(menu, stateName, config = {}) {
    if (!dropdownStates.includes(stateName)) {
      throw new Error(`dropdown: unknown state "${stateName}" (supported: ${dropdownStates.join(', ')})`);
    }
    triggerStateChange(menu, stateName, config);
    // state lives on the ELEMENT, not the module (multiple menus per page)
    menu.dataset.stateName = stateName;
    menu._stateConfig = config;
  },
  getState(menu) {
    return { name: menu.dataset.stateName || 'default', config: menu._stateConfig ?? {} };
  },
};

df$.dropdownApi = dropdownApi;
df$.dropdownStates = dropdownStates;

function init() {
  document.querySelectorAll('[data-dropdown-trigger]:not([data-init])').forEach((trigger) => {
    trigger.dataset.init = '';
    const menu = document.getElementById(trigger.dataset.dropdownTrigger);
    if (!menu) return;

    // CSS anchor positioning - unique name per trigger-menu pair
    const anchorId = `--dropdown-${menu.id}`;
    trigger.style.anchorName = anchorId;
    menu.style.positionAnchor = anchorId;

    const getItems = () => {
      return Array.from(menu.querySelectorAll('[role="menuitem"]:not(:disabled), [role="menuitemcheckbox"]:not(:disabled), [role="menuitemradio"]:not(:disabled)'));
    };
    const highlight = (item) => {
      getItems().forEach((i) => { i.removeAttribute('data-highlighted'); });
      if (item) { item.setAttribute('data-highlighted', ''); item.focus(); }
    };
    // Native declarative toggle. A JS `togglePopover()` click handler is
    // buggy for popover="auto": light dismiss closes the menu *before* the
    // click handler runs, so togglePopover re-opens it and the menu can
    // never be closed by clicking the trigger again. The popovertarget
    // command is dismiss-aware - the trigger button must be a <button>
    // (documented API) for the native command to apply.
    if (!trigger.hasAttribute('popovertarget')) trigger.setAttribute('popovertarget', menu.id);
    menu.addEventListener('toggle', (e) => {
      const open = e.newState === 'open';
      trigger.setAttribute('aria-expanded', open);
      if (open) { const first = getItems()[0]; if (first) highlight(first); }
      else { getItems().forEach((i) => { i.removeAttribute('data-highlighted'); }); trigger.focus(); }
    });
    menu.addEventListener('mousemove', (e) => {
      const item = e.target.closest('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]');
      if (item && !item.disabled) highlight(item);
    });
    menu.addEventListener('mouseleave', () => {
      getItems().forEach((i) => { i.removeAttribute('data-highlighted'); });
    });
    menu.addEventListener('keydown', (e) => {
      const items = getItems();
      const current = items.indexOf(document.activeElement);
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); highlight(items[(current + 1) % items.length]); break;
        case 'ArrowUp': e.preventDefault(); highlight(items[(current - 1 + items.length) % items.length]); break;
        case 'Home': e.preventDefault(); highlight(items[0]); break;
        case 'End': e.preventDefault(); highlight(items[items.length - 1]); break;
        case 'Escape': menu.hidePopover(); break;
        case 'Enter': case ' ':
          e.preventDefault();
          if (document.activeElement) {
            const role = document.activeElement.getAttribute('role');
            if (role === 'menuitemcheckbox') {
              const checked = document.activeElement.getAttribute('aria-checked') === 'true';
              document.activeElement.setAttribute('aria-checked', !checked);
            } else if (role === 'menuitemradio') {
              const group = document.activeElement.closest('[role="group"]');
              if (group) group.querySelectorAll('[role="menuitemradio"]').forEach((r) => { r.setAttribute('aria-checked', 'false'); });
              document.activeElement.setAttribute('aria-checked', 'true');
            } else { document.activeElement.click(); menu.hidePopover(); }
          }
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            const match = items.find((item) => item.textContent.trim().toLowerCase().startsWith(e.key.toLowerCase()));
            if (match) highlight(match);
          }
      }
    });
});

  // bind-scope the api per menu instance: `$('#menu').api.setState('open')`
  document.querySelectorAll('.dropdown-content[popover]:not([data-init])').forEach((menu) => {
    menu.dataset.init = '';
    menu.api = {
      setState: (stateName, config) => dropdownApi.setState(menu, stateName, config),
      getState: () => dropdownApi.getState(menu),
    };
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
