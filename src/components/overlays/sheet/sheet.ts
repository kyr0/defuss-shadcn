// -- Sheet ----------------------------------------------------
// Wires [data-sheet-trigger] buttons to <dialog class="sheet"> elements,
// plus the named-state API so agents/tests can drive open/closed by name
// (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const sheetStates = ['default', 'open'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state - the sheet's states take none. */
export interface SheetStateConfigs {
  /** Closed. */
  default: {};
  /** Open as a modal panel from its side (showModal()). */
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

/** The state a sheet shows: its `open` - read back after every change, and the state it starts in. */
const shown = (sheet: HTMLDialogElement) => (sheet.open ? 'open' : 'default');

/** Registry-level API; pass the sheet element explicitly. Unknown names throw. */
export const sheetApi = componentState<HTMLDialogElement>({
  component: 'sheet',
  states: sheetStates,
  apply: (sheet, state) => triggerStateChange(sheet, state.name, state.config),
  // the state is the dialog's `open`, as the schema observes it: a trigger or
  // a native commandfor button opens it without setState
  read: (sheet, state) => ({ name: shown(sheet), config: state.config }),
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.sheetApi = sheetApi;
df$.sheetStates = sheetStates;

function init() {
dfDollar('[data-sheet-trigger]:not([data-init])').toArray().forEach((trigger) => {
  trigger.dataset.init = '';
  const sheet = dfDollar<HTMLDialogElement>('#' + CSS.escape(trigger.dataset.sheetTrigger)).get(0);
  if (!sheet) return;
  trigger.addEventListener('click', () => {
    sheet._trigger = trigger;
    sheet.showModal();
  });
});
dfDollar<HTMLDialogElement>('dialog.sheet:not([data-init])').toArray().forEach((sheet) => {
  sheet.dataset.init = '';
  // el.store + el.api (AGENTS.md "State through stores")
  bindComponent(sheet, sheetApi, { name: shown(sheet), config: {} });
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) sheet.close();
  });
  dfDollar(sheet).find('[data-sheet-close]').toArray().forEach((btn) => {
    btn.addEventListener('click', () => { sheet.close(); });
  });
  sheet.addEventListener('close', () => {
    // `close` fires AFTER the exit transition (display allow-discrete), so a
    // fast re-open can beat it - a stale event must not yank focus out of an
    // open sheet. The state itself follows `open` through read().
    if (sheet.open) return;
    if (sheet._trigger) sheet._trigger.focus();
  });
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
