// -- Toggle Group ---------------------------------------------
// Manages single/multiple selection and roving tabindex across .toggle
// buttons, plus the named-state API bound per group, so agents/tests can
// enable/disable a whole group by name (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const toggleGroupStates = ['default', 'disabled'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state - the toggle group's states take none. */
export interface ToggleGroupStateConfigs {
  /** Enabled. */
  default: {};
  /** Every item disabled (data-disabled on the group). */
  disabled: {};
}

/**
 * The markup of a state, for render(): the attributes every state writes -
 * the same as triggerStateChange does on the live element - applied to a
 * detached copy of the authored markup. The e2e render round trip proves
 * the two agree.
 */
function applyMarkup(el, stateName) {
  dfDollar(el).attr('data-disabled', stateName === 'disabled' ? '' : null);
}

/**
 * UI side of setState: 'disabled' mirrors the documented data-disabled
 * attribute (CSS kills pointer events + dims items); 'default' removes it.
 */
function triggerStateChange(group, stateName, _config) {
  switch (stateName) {
    case 'default':
      group.removeAttribute('data-disabled');
      break;
    case 'disabled':
      group.setAttribute('data-disabled', '');
      break;
  }
}

/** Registry-level API; pass the group element explicitly. Unknown names throw. */
export const toggleGroupApi = componentState({
  component: 'toggle-group',
  states: toggleGroupStates,
  apply: (group, state) => triggerStateChange(group, state.name, state.config),
  read: (group, state) => {
    return {
      name: group.hasAttribute('data-disabled') ? 'disabled' : 'default',
      config: state.config,
    };
  },
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.toggleGroupApi = toggleGroupApi;
df$.toggleGroupStates = toggleGroupStates;

function init() {
  dfDollar('.toggle-group:not([data-init])').toArray().forEach((group) => {
  group.dataset.init = '';
  // el.store + el.api (AGENTS.md "State through stores")
  bindComponent(group, toggleGroupApi);
  const type = group.getAttribute('data-type') || 'single';

  const getToggles = () => Array.from(dfDollar(group).find('.toggle:not(:disabled)').toArray());

  // Roving tabindex: only one item tabbable at a time
  const initTabindex = () => {
    const toggles = getToggles();
    if (toggles.length === 0) return;
    const pressed = toggles.find((t) => t.getAttribute('aria-pressed') === 'true');
    const active = pressed || toggles[0];
    toggles.forEach((t) => {
      t.setAttribute('tabindex', t === active ? '0' : '-1');
    });
  };

  initTabindex();

  group.addEventListener('click', (e) => {
    const toggle = e.target.closest('.toggle');
    if (!toggle || toggle.disabled || group.hasAttribute('data-disabled')) return;

    const toggles = getToggles();
    const pressed = toggle.getAttribute('aria-pressed') === 'true';

    if (type === 'single') {
      toggles.forEach((t) => t.setAttribute('aria-pressed', 'false'));
      if (!pressed) toggle.setAttribute('aria-pressed', 'true');
    } else {
      toggle.setAttribute('aria-pressed', String(!pressed));
    }

    // Update roving tabindex to current item
    toggles.forEach((t) => t.setAttribute('tabindex', t === toggle ? '0' : '-1'));
  });

  group.addEventListener('keydown', (e) => {
    const toggle = e.target.closest('.toggle');
    if (!toggle || group.hasAttribute('data-disabled')) return;

    const toggles = getToggles();
    const idx = toggles.indexOf(toggle);
    if (idx === -1) return;

    const vertical = group.getAttribute('data-orientation') === 'vertical';
    const fwd = vertical ? 'ArrowDown' : 'ArrowRight';
    const bwd = vertical ? 'ArrowUp' : 'ArrowLeft';
    let next;

    if (e.key === fwd) {
      e.preventDefault();
      next = (idx + 1) % toggles.length;
    } else if (e.key === bwd) {
      e.preventDefault();
      next = (idx - 1 + toggles.length) % toggles.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      next = toggles.length - 1;
    }

    if (next !== undefined) {
      toggles[idx].setAttribute('tabindex', '-1');
      toggles[next].setAttribute('tabindex', '0');
      toggles[next].focus();
    }
  });
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
