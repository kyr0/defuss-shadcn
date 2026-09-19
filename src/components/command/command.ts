// -- Command --------------------------------------------------
// Command palette dialog with search filtering, keyboard navigation, and
// Cmd/Ctrl+K shortcut, plus the named-state API so agents/tests can drive
// open/closed by name (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

const commandStates = ['default', 'open'];

/**
 * UI side of setState: 'default' closes, 'open' opens modally and focuses
 * the search input (same affordance as the trigger/keyboard shortcut).
 */
function triggerStateChange(dialog, stateName, _config) {
  switch (stateName) {
    case 'default':
      if (dialog.open) dialog.close();
      break;
    case 'open':
      if (!dialog.open) dialog.showModal();
      {
        const input = dialog.querySelector('.command-input');
        if (input) input.focus();
      }
      break;
  }
}

/** Registry-level API; pass the dialog element explicitly. Unknown names throw. */
export const commandApi = {
  setState(dialog, stateName, config = {}) {
    if (!commandStates.includes(stateName)) {
      throw new Error(`command: unknown state "${stateName}" (supported: ${commandStates.join(', ')})`);
    }
    triggerStateChange(dialog, stateName, config);
    // state lives on the ELEMENT, not the module (multiple palettes per page)
    dialog.dataset.stateName = stateName;
    dialog._stateConfig = config;
  },
  getState(dialog) {
    return { name: dialog.dataset.stateName || 'default', config: dialog._stateConfig ?? {} };
  },
};

df$.commandApi = commandApi;
df$.commandStates = commandStates;

/* Cmd/Ctrl+K handler — added once at module level */
let commandKeydownAdded = false;
if (!commandKeydownAdded) {
  commandKeydownAdded = true;
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      const dialog = document.querySelector('dialog.command');
      if (!dialog) return;
      e.preventDefault();
      if (dialog.open) { dialog.close(); }
      else { dialog.showModal(); const input = dialog.querySelector('.command-input'); if (input) input.focus(); }
    }
  });
}

function getVisibleItems(list) {
  return Array.from(list.querySelectorAll('.command-item:not([hidden]):not([aria-disabled="true"])'));
}

function highlightItem(list, index) {
  const visible = getVisibleItems(list);
  list.querySelectorAll('.command-item[data-highlighted]').forEach((el) => delete el.dataset.highlighted);
  if (visible.length === 0) return -1;
  const clamped = ((index % visible.length) + visible.length) % visible.length;
  visible[clamped].dataset.highlighted = '';
  visible[clamped].scrollIntoView({ block: 'nearest' });
  return clamped;
}

function init() {
document.querySelectorAll('dialog.command:not([data-init])').forEach((dialog) => {
    dialog.dataset.init = '';
    // bind-scope the api per instance: `$('#demo-cmd').api.setState('open')`
    dialog.api = {
      setState: (stateName, config) => commandApi.setState(dialog, stateName, config),
      getState: () => commandApi.getState(dialog),
    };
    const input = dialog.querySelector('.command-input');
    const list = dialog.querySelector('.command-list');
    const empty = dialog.querySelector('.command-empty');
    if (!input || !list) return;
    let highlightIndex = -1;

    // query the LIVE list on every filter (KISS): item nodes may be replaced
    // after init (e.g. the docs palette feeds itself from a generated index),
    // a cached snapshot would silently keep filtering detached nodes
    const filter = (q) => {
      const query = q.toLowerCase(); let hasVisible = false;
      list.querySelectorAll('.command-item').forEach((item) => {
        const match = !query || item.textContent.toLowerCase().includes(query);
        item.hidden = !match; if (match) hasVisible = true;
      });
      list.querySelectorAll('.command-group').forEach((g) => {
        g.hidden = g.querySelectorAll('.command-item:not([hidden])').length === 0;
      });
      list.querySelectorAll('.command-separator').forEach((s) => {
        s.hidden = !!query;
      });
      if (empty) empty.hidden = hasVisible;
      highlightIndex = highlightItem(list, 0);
    };

    input.addEventListener('input', () => { filter(input.value); });

    input.addEventListener('keydown', (e) => {
      const visible = getVisibleItems(list);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightIndex = highlightItem(list, highlightIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightIndex = highlightItem(list, highlightIndex - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (visible[highlightIndex]) { visible[highlightIndex].click(); }
      } else if (e.key === 'Home') {
        e.preventDefault();
        highlightIndex = highlightItem(list, 0);
      } else if (e.key === 'End') {
        e.preventDefault();
        highlightIndex = highlightItem(list, visible.length - 1);
      }
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
      if (e.target.closest('.command-item')) dialog.close();
    });
    dialog.addEventListener('close', () => {
      // `close` fires AFTER the exit transition (display allow-discrete), so a
      // fast re-open (setState/⌘K within 150ms) can beat the queued event — a
      // stale one must not downgrade an open palette to 'default'. (Skipping
      // the reset on re-open keeps the last query, like macOS Spotlight.)
      if (dialog.open) return;
      // reflect the actual UI state: Escape/item-click/backdrop close = 'default'
      dialog.dataset.stateName = 'default';
      input.value = '';
      filter('');
      list.querySelectorAll('.command-item[data-highlighted]').forEach((el) => delete el.dataset.highlighted);
      highlightIndex = -1;
    });
  });

document.querySelectorAll('[data-command-trigger]:not([data-init])').forEach((trigger) => {
  trigger.dataset.init = '';
  const dialog = document.getElementById(trigger.dataset.commandTrigger);
  if (!dialog) return;
  trigger.addEventListener('click', () => {
    dialog.showModal();
    const input = dialog.querySelector('.command-input');
    if (input) input.focus();
  });
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
