// -- Color Picker ---------------------------------------------
// Syncs the hex value display with the color input, plus the named-state API
// (AGENTS.md "State API"). The picker's observable state is the chosen color,
// so 'default' carries an optional { value } preset and getState().config
// reports the live value.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

const colorPickerStates = ['default'];

const getInput = (picker) => picker.querySelector('input[type="color"]');

/**
 * UI side of setState: 'default' optionally presets { value } through the
 * native color input (input event dispatched so the display stays in sync).
 */
function triggerStateChange(picker, config) {
  const input = getInput(picker);
  if (!input || config?.value === undefined) return;
  input.value = String(config.value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Registry-level API; pass the wrapper explicitly. Unknown names throw. */
export const colorPickerApi = {
  setState(picker, stateName, config = {}) {
    if (!colorPickerStates.includes(stateName)) {
      throw new Error(`color-picker: unknown state "${stateName}" (supported: ${colorPickerStates.join(', ')})`);
    }
    triggerStateChange(picker, config);
    // state lives on the ELEMENT, not the module (many pickers per page)
    picker.dataset.stateName = stateName;
    picker._stateConfig = config;
  },
  getState(picker) {
    const input = getInput(picker);
    return {
      name: picker.dataset.stateName || 'default',
      // live value - reflects picking and typing, not just setState
      config: { ...picker._stateConfig, value: input ? input.value : '' },
    };
  },
};

df$.colorPickerApi = colorPickerApi;
df$.colorPickerStates = colorPickerStates;

function init() {
  document.querySelectorAll('.color-picker:not([data-init])').forEach((picker) => {
  picker.dataset.init = '';
  // bind-scope the api per instance: `$('#theme-color').api.setState('default', { value: '#ff0000' })`
  picker.api = {
    setState: (stateName, config) => colorPickerApi.setState(picker, stateName, config),
    getState: () => colorPickerApi.getState(picker),
  };
  const input = picker.querySelector('input[type="color"]');
  const display = picker.querySelector('.color-picker-value');
  if (!input || !display) return;

  display.textContent = input.value;
  input.addEventListener('input', () => {
    display.textContent = input.value;
  });
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
