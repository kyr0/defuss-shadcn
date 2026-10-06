// -- Alert Dialog ----------------------------------------------
// Wires [data-alert-dialog-trigger] buttons to <dialog class="alert-dialog">.
// Unlike regular dialogs: no backdrop-close, Escape key blocked. Named-state
// API per AGENTS.md "State API" (camelCase alert-dialog → alertDialogApi).

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const alertDialogStates = ['default', 'open'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state - the alert dialog's states take none. */
export interface AlertDialogStateConfigs {
  /** Closed. */
  default: {};
  /** Open as a modal (showModal()) - the background is inert until it is answered. */
  open: {};
}

/**
 * The markup of a state: 'open' carries `open`. render() applies it to a
 * detached copy; on the live element showModal()/close() (the native
 * protocol: top layer, focus, inert background) produce exactly this
 * attribute - the e2e render round trip proves they agree.
 */
function applyMarkup(el, stateName) {
  dfDollar(el).attr('open', stateName === 'open' ? '' : null);
}

/**
 * UI side of setState: 'default' closes, 'open' opens modally. Escape and
 * backdrop dismissal stay blocked by the listeners below; closing is
 * programmatic only (close buttons / api).
 */
function triggerStateChange(dialog, stateName, _config) {
  switch (stateName) {
    case 'default':
      if (dialog.open) dialog.close();
      break;
    case 'open':
      if (!dialog.open) dialog.showModal();
      break;
  }
}

/** Registry-level API; pass the dialog element explicitly. Unknown names throw. */
export const alertDialogApi = componentState({
  component: 'alert-dialog',
  states: alertDialogStates,
  apply: (dialog, state) => triggerStateChange(dialog, state.name, state.config),
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.alertDialogApi = alertDialogApi;
df$.alertDialogStates = alertDialogStates;

function init() {
/* Wire triggers */
dfDollar('[data-alert-dialog-trigger]:not([data-init])').toArray().forEach((trigger) => {
  trigger.dataset.init = '';
  const dialog = dfDollar('#' + CSS.escape(trigger.dataset.alertDialogTrigger)).get(0);
  if (!dialog) return;
  trigger.addEventListener('click', () => {
    dialog._trigger = trigger;
    dialog.showModal();
  });
});

/* Wire close buttons and block Escape */
dfDollar('dialog.alert-dialog:not([data-init])').toArray().forEach((dialog) => {
  dialog.dataset.init = '';
  // el.store + el.api (AGENTS.md "State through stores")
  bindComponent(dialog, alertDialogApi);
  /* Block Escape key */
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
  });

  /* Wire close buttons */
  dfDollar(dialog).find('[data-alert-dialog-close]').toArray().forEach((btn) => {
    btn.addEventListener('click', () => {
      dialog.close();
    });
  });

  /* Return focus to trigger */
  dialog.addEventListener('close', () => {
    // `close` fires AFTER the exit transition (display allow-discrete), so a
    // fast re-open can beat it - a stale event must not downgrade an open
    // dialog back to 'default' or yank focus out of it while it's showing.
    if (dialog.open) return;
    // reflect the actual UI state: close buttons (the only close path) or
    // setState('default') land the dialog back at 'default'
    dialog.dataset.stateName = 'default';
    if (dialog._trigger) dialog._trigger.focus();
  });
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
