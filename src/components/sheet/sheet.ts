// -- Sheet ----------------------------------------------------
// Wires [data-sheet-trigger] buttons to <dialog class="sheet"> elements,
// plus the named-state API so agents/tests can drive open/closed by name
// (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

const sheetStates = ['default', 'open'];

/**
 * UI side of setState: 'default' closes, 'open' opens modally. Native
 * <dialog> mechanics; close-focus-return is handled by the close listener.
 */
function triggerStateChange(sheet, stateName, _config) {
  switch (stateName) {
    case 'default':
      if (sheet.open) sheet.close();
      break;
    case 'open':
      if (!sheet.open) sheet.showModal();
      break;
  }
}

/** Registry-level API; pass the sheet element explicitly. Unknown names throw. */
export const sheetApi = {
  setState(sheet, stateName, config = {}) {
    if (!sheetStates.includes(stateName)) {
      throw new Error(`sheet: unknown state "${stateName}" (supported: ${sheetStates.join(', ')})`);
    }
    triggerStateChange(sheet, stateName, config);
    // state lives on the ELEMENT, not the module (multiple sheets per page)
    sheet.dataset.stateName = stateName;
    sheet._stateConfig = config;
  },
  getState(sheet) {
    return { name: sheet.dataset.stateName || 'default', config: sheet._stateConfig ?? {} };
  },
};

df$.sheetApi = sheetApi;
df$.sheetStates = sheetStates;

function init() {
document.querySelectorAll('[data-sheet-trigger]:not([data-init])').forEach((trigger) => {
  trigger.dataset.init = '';
  const sheet = document.getElementById(trigger.dataset.sheetTrigger);
  if (!sheet) return;
  trigger.addEventListener('click', () => {
    sheet._trigger = trigger;
    sheet.showModal();
  });
});
document.querySelectorAll('dialog.sheet:not([data-init])').forEach((sheet) => {
  sheet.dataset.init = '';
  // bind-scope the api per instance: `$('#sheet-right').api.setState('open')`
  sheet.api = {
    setState: (stateName, config) => sheetApi.setState(sheet, stateName, config),
    getState: () => sheetApi.getState(sheet),
  };
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) sheet.close();
  });
  sheet.querySelectorAll('[data-sheet-close]').forEach((btn) => {
    btn.addEventListener('click', () => { sheet.close(); });
  });
  sheet.addEventListener('close', () => {
    // `close` fires AFTER the exit transition (display allow-discrete), so a
    // fast re-open can beat it - a stale event must not downgrade an open
    // sheet back to 'default' or yank focus out of it while it's showing.
    if (sheet.open) return;
    // reflect the actual UI state: any close path (Escape, backdrop, close
    // button) returns the sheet to 'default', even when it wasn't setState'd
    sheet.dataset.stateName = 'default';
    if (sheet._trigger) sheet._trigger.focus();
  });
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
