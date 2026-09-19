/* -- Slider component ------------------------------------------- */
// Fill-track painting for native range inputs, plus the named-state API so
// agents/tests can enable/disable (and preset) a slider by name (AGENTS.md
// "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

const sliderStates = ['default', 'disabled'];

function updateSliderValue(el) {
  const min = parseFloat(el.min || 0);
  const max = parseFloat(el.max || 100);
  const value = parseFloat(el.value);
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  el.style.setProperty('--slider-value', `${percent}%`);
}

/**
 * UI side of setState: 'default' restores the authored enabled state and
 * optionally presets { value }; 'disabled' uses the native disabled
 * attribute (CSS :disabled styles it, keyboard/pointer go inert for free).
 */
function triggerStateChange(el, stateName, config) {
  switch (stateName) {
    case 'default':
      el.disabled = el._defaultDisabled ?? false;
      if (config?.value !== undefined) el.value = String(config.value);
      updateSliderValue(el);
      break;
    case 'disabled':
      el.disabled = true;
      break;
  }
}

/** Registry-level API; pass the input element explicitly. Unknown names throw. */
export const sliderApi = {
  setState(el, stateName, config = {}) {
    if (!sliderStates.includes(stateName)) {
      throw new Error(`slider: unknown state "${stateName}" (supported: ${sliderStates.join(', ')})`);
    }
    triggerStateChange(el, stateName, config);
    // state lives on the ELEMENT, not the module (many sliders per page)
    el.dataset.stateName = stateName;
    el._stateConfig = config;
  },
  getState(el) {
    // reflect reality: dragging/disabling changes the UI without setState()
    return {
      name: el.disabled ? 'disabled' : 'default',
      config: { ...el._stateConfig, value: el.value },
    };
  },
};

df$.sliderApi = sliderApi;
df$.sliderStates = sliderStates;

function init() {
  document.querySelectorAll('.slider:not([data-init])').forEach((el) => {
    el.dataset.init = '';
    // remember the authored disabled state so setState('default') restores it
    el._defaultDisabled = el.disabled;
    // bind-scope the api per instance: `$('#volume').api.setState('disabled')`
    el.api = {
      setState: (stateName, config) => sliderApi.setState(el, stateName, config),
      getState: () => sliderApi.getState(el),
    };
    updateSliderValue(el);
    el.addEventListener('input', () => updateSliderValue(el));
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
