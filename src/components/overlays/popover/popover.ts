// -- Popover --------------------------------------------------
// CSS anchor positioning for popover components, plus the named-state API
// so agents/tests can drive open/closed by name (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, safeShowPopover, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const popoverStates = ['default', 'open'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state - the popover's states take none. */
export interface PopoverStateConfigs {
  /** Closed. */
  default: {};
  /** Open, anchored to its trigger. */
  open: {};
}

/**
 * The markup of a state: none - 'open' lives in the top layer
 * (:popover-open), not in an attribute, so every state renders the authored
 * markup. render() stays the State API's markup function all the same.
 */
function applyMarkup(_el, _stateName) {}

/**
 * UI side of setState: 'default' hides, 'open' shows. Open/close mechanics
 * stay native (Popover API); this only dispatches to show/hidePopover().
 */
function triggerStateChange(popover, stateName, _config) {
  switch (stateName) {
    case 'default':
      try { popover.hidePopover(); } catch { /* already closed */ }
      break;
    case 'open':
      // deferred show (safeShowPopover): showPopover() mid-exit (right after
      // light dismiss) crashes the headless renderer; exclusion stays native.
      safeShowPopover(popover);
      break;
  }
}

/** Registry-level API; pass the popover element explicitly. Unknown names throw. */
export const popoverApi = componentState({
  component: 'popover',
  states: popoverStates,
  apply: (popover, state) => triggerStateChange(popover, state.name, state.config),
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.popoverApi = popoverApi;
df$.popoverStates = popoverStates;

function init() {
  dfDollar('[popovertarget]:not([data-init])').toArray().forEach((trigger) => {
    const id = trigger.getAttribute('popovertarget');
    const popover = dfDollar('#' + CSS.escape(id)).get(0);
    // Ownership boundary (AGENTS.md "Each component owns its dialog", popover
    // edition): only claim triggers whose target is a .popover panel. Stamping
    // every [popovertarget] starved sibling components - navigation-menu's
    // triggers got claimed here, then skipped (panel isn't .popover), and
    // nav-menu's own :not([data-init]) scan never anchored them.
    if (!popover || !popover.classList.contains('popover')) return;
    trigger.dataset.init = '';

    // CSS anchor positioning - unique name per trigger-popover pair
    const anchorId = `--popover-${id}`;
    trigger.style.anchorName = anchorId;
    popover.style.positionAnchor = anchorId;
  });

  // bind-scope the api per popover instance: `$('#demo').api.setState('open')`
  dfDollar('.popover[popover]:not([data-init])').toArray().forEach((popover) => {
    popover.dataset.init = '';
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(popover, popoverApi);
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
