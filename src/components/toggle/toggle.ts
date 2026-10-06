// -- Toggle ---------------------------------------------------
// Toggles aria-pressed on .toggle buttons, plus the named-state API so
// agents/tests can drive the pressed state by name (AGENTS.md "State API").
// Skips toggles inside .toggle-group - those are managed by toggle-group.js.
// The State API runs on a store per button (el.store, AGENTS.md "State
// through stores"); render(state) reproduces the authored markup 1:1.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const toggleStates = ['default', 'pressed'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state - the toggle's states take none. */
export interface ToggleStateConfigs {
  /** Not pressed (aria-pressed="false"). */
  default: {};
  /** Pressed (aria-pressed="true"). */
  pressed: {};
}

/**
 * The markup of a state - the one place a state becomes attributes. setState
 * runs it on the live button, render() on a detached copy of the authored
 * markup. 'default' is the authored aria-pressed value.
 */
function applyMarkup(toggle, stateName, defaultPressed) {
  dfDollar(toggle).attr('aria-pressed', stateName === 'pressed' ? 'true' : defaultPressed);
}

/** UI side of setState (AGENTS.md "State API"): the state's markup. */
function triggerStateChange(toggle, stateName, _config) {
  applyMarkup(toggle, stateName, toggle._defaultPressed ?? 'false');
}

/** Registry-level API; pass the toggle button explicitly. Unknown names throw. */
export const toggleApi = componentState({
  component: 'toggle',
  states: toggleStates,
  apply: (toggle, state) => triggerStateChange(toggle, state.name, state.config),
  // reflect reality: user clicks change aria-pressed without setState()
  read: (toggle, state) => ({ name: dfDollar(toggle).attr('aria-pressed') === 'true' ? 'pressed' : 'default', config: state.config }),
  markup: (toggle, state) => {
    const authored = state.model.attrs.find(([name]) => name === 'aria-pressed');
    applyMarkup(toggle, state.name, authored ? authored[1] : 'false');
  },
});

df$.toggleApi = toggleApi;
df$.toggleStates = toggleStates;

function init() {
  dfDollar('.toggle:not([data-init]):not(.toggle-group .toggle)').each((_i, toggle) => {
    dfDollar(toggle).data('init', '');
    // remember the authored pressed state so setState('default') can restore it
    toggle._defaultPressed = dfDollar(toggle).attr('aria-pressed') || 'false';
    // el.store + el.api: `$('#my-toggle').api.setState('pressed')`
    bindComponent(toggle, toggleApi, { name: toggle._defaultPressed === 'true' ? 'pressed' : 'default', config: {} });
    dfDollar(toggle).on('click', () => {
      dfDollar(toggle).attr('aria-pressed', String(dfDollar(toggle).attr('aria-pressed') !== 'true'));
    });
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
