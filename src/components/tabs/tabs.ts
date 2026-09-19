// -- Tabs -----------------------------------------------------
// ARIA-compliant keyboard navigation for [role="tablist"] elements, plus the
// named-state API bound per tab trigger, so agents/tests can activate a
// specific tab by name (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

// 'default' = this tab's authored selected state, 'active' = this tab selected
const tabsStates = ['default', 'active'];

/** Select one tab of a group and reveal its panel (single-selection model). */
const activateTab = (tab, triggers) => {
  triggers.forEach((t) => {
    t.setAttribute('aria-selected', 'false');
    t.setAttribute('tabindex', '-1');
    // selection is exclusive: every non-selected tab returns to 'default'
    t.dataset.stateName = 'default';
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if (panel) panel.hidden = true;
  });
  tab.setAttribute('aria-selected', 'true');
  tab.removeAttribute('tabindex');
  tab.dataset.stateName = 'active';
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  if (panel) panel.hidden = false;
};

/**
 * UI side of setState (per tab): 'active' selects this tab, 'default'
 * restores the authored selection snapshot taken at init.
 */
function triggerStateChange(tab, triggers, stateName, _config) {
  switch (stateName) {
    case 'default':
      if (tab._defaultSelected) activateTab(tab, triggers);
      else activateTab(triggers.find((t) => t._defaultSelected) || triggers[0], triggers);
      break;
    case 'active':
      if (!tab.disabled) activateTab(tab, triggers);
      break;
  }
}

/** Registry-level API; pass the tab trigger explicitly. Unknown names throw. */
export const tabsApi = {
  setState(tab, stateName, config = {}) {
    if (!tabsStates.includes(stateName)) {
      throw new Error(`tabs: unknown state "${stateName}" (supported: ${tabsStates.join(', ')})`);
    }
    const triggers = Array.from(
      tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'),
    );
    triggerStateChange(tab, triggers, stateName, config);
    // state lives on the ELEMENT, not the module (many tabs per page)
    tab._stateConfig = config;
  },
  getState(tab) {
    // reflect reality: clicks/keys change aria-selected without setState()
    return {
      name: tab.getAttribute('aria-selected') === 'true' ? 'active' : 'default',
      config: tab._stateConfig ?? {},
    };
  },
};

df$.tabsApi = tabsApi;
df$.tabsStates = tabsStates;

function init() {
document.querySelectorAll('[role="tablist"]:not([data-init])').forEach((tablist) => {
    tablist.dataset.init = '';
    if (!tablist.querySelector('.tab-trigger')) return;
    const triggers = Array.from(tablist.querySelectorAll('[role="tab"]'));
    // remember the authored selection so setState('default') restores it
    triggers.forEach((t) => {
      t._defaultSelected = t.getAttribute('aria-selected') === 'true';
      // bind-scope the api per tab: `$('#my-tab').api.setState('active')`
      t.api = {
        setState: (stateName, config) => tabsApi.setState(t, stateName, config),
        getState: () => tabsApi.getState(t),
      };
    });
    const orientation = tablist.getAttribute('aria-orientation') || 'horizontal';

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => { activateTab(trigger, triggers); });
      trigger.addEventListener('keydown', (e) => {
        const current = triggers.indexOf(trigger);
        let next;
        const forward = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
        const backward = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
        switch (e.key) {
          case forward:
            e.preventDefault();
            for (let i = 1; i <= triggers.length; i++) {
              const c = triggers[(current + i) % triggers.length];
              if (!c.disabled) { next = c; break; }
            }
            break;
          case backward:
            e.preventDefault();
            for (let i = 1; i <= triggers.length; i++) {
              const c = triggers[(current - i + triggers.length) % triggers.length];
              if (!c.disabled) { next = c; break; }
            }
            break;
          case 'Home':
            e.preventDefault();
            next = triggers.find((t) => !t.disabled);
            break;
          case 'End':
            e.preventDefault();
            next = triggers.slice().reverse().find((t) => !t.disabled);
            break;
        }
        if (next && !next.disabled) {
          activateTab(next, triggers);
          next.focus();
        }
      });
    });
});}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });