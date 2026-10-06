// -- Navigation Menu -----------------------------------------
// CSS anchor positioning for dropdown navigation menus, plus the named-state
// API so agents/tests can drive menus open/closed by name (AGENTS.md
// "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, safeShowPopover, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const navigationMenuStates = ['default', 'open'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state - the navigation menu's states take none. */
export interface NavigationMenuStateConfigs {
  /** The panel closed. */
  default: {};
  /** The panel open. */
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
 * stay native (Popover API via popovertarget on the trigger).
 */
function triggerStateChange(content, stateName, _config) {
  switch (stateName) {
    case 'default':
      try { content.hidePopover(); } catch { /* already closed */ }
      break;
    case 'open':
      // deferred show (safeShowPopover): calling showPopover() on an element
      // mid-its-own exit animation - e.g. just light-dismissed by a sibling
      // trigger's click - crashed the headless renderer. Sibling exclusion
      // stays native via popover="auto".
      safeShowPopover(content);
      break;
  }
}

/** Registry-level API; pass the content element explicitly. Unknown names throw. */
export const navigationMenuApi = componentState({
  component: 'navigation-menu',
  states: navigationMenuStates,
  apply: (content, state) => triggerStateChange(content, state.name, state.config),
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.navigationMenuApi = navigationMenuApi;
df$.navigationMenuStates = navigationMenuStates;

function init() {
  // Wiring is per trigger→panel PAIR, not per wrapper: a consumer may compose
  // the menu inside another component (e.g. site-header's <nav>) without a
  // .nav-menu ancestor. Scanning wrappers left those panels unanchored —
  // position-anchor stayed 'normal' and the popover fell back to the viewport
  // top-left (reported twice: site-header Default + Sticky).
  dfDollar('.nav-menu-trigger[popovertarget]:not([data-init])').toArray().forEach((trigger) => {
    trigger.dataset.init = '';
    const content = dfDollar('#' + CSS.escape(trigger.getAttribute('popovertarget'))).get(0);
    if (!content) return;

    // CSS anchor positioning - unique name per trigger-content pair
    const anchorId = `--nav-menu-${content.id}`;
    trigger.style.anchorName = anchorId;
    content.style.positionAnchor = anchorId;
  });

  // bind-scope the api per content element: `$('#nav-products').api.setState('open')`
  dfDollar('.nav-menu-content[popover]:not([data-init])').toArray().forEach((content) => {
    content.dataset.init = '';
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(content, navigationMenuApi);
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
