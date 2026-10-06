// -- Color Picker ---------------------------------------------
// Shows the picked colour in the notation the page asks for (hex / rgb /
// hsl / oklch - data-format, optionally user-switchable), plus the named-state API
// (AGENTS.md "State API"). The picker's observable state is the chosen color,
// so 'default' carries an optional { value } preset and getState().config
// reports the live value.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const colorPickerStates = ['default'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state (getState() reports the colour in both notations). */
export interface ColorPickerStateConfigs {
  /** The picker with its colour. */
  default: {
    /** the colour, #rrggbb (the native input's value) */
    value?: string;
    /** the notation the field shows */
    format?: 'hex' | 'rgb' | 'hsl' | 'oklch';
    /** reported by getState(): the colour written in that notation */
    formatted?: string;
  };
}

const getInput = (picker) => dfDollar(picker).find('input[type="color"]').get(0);

/** Notations the picker can report. The native input always holds #rrggbb;
 *  the display (and data-color-output fields) carry the chosen notation. */
const COLOR_FORMATS = ['hex', 'rgb', 'hsl', 'oklch'];

/** Trim a number to `digits` decimals without trailing zeros (0.20 → "0.2"). */
const num = (n: number, digits: number) => String(Number(n.toFixed(digits)));

/**
 * Why: the value is meant to be USED - pasted into a stylesheet, a token file
 * or brand guidelines written in another notation. Converts the native
 * input's #rrggbb in CSS Color 4 syntax: rgb(99 102 241),
 * hsl(238.7 83.5% 66.7%), oklch(0.5854 0.2041 277.12) - the same shape as
 * this system's own oklch tokens. OKLCH via linear sRGB → OKLab (Björn
 * Ottosson's matrices); achromatic colours report chroma and hue as 0.
 * Precision is MEASURED, not cosmetic: pasting the text back must give the
 * picked colour. hsl at 1 decimal round-trips every 8-bit colour exactly
 * (whole numbers drift up to 5 steps); oklch needs L/C at 4 and H at 2
 * decimals to stay within one 8-bit step (3/3/1 drifts up to 8 - visible).
 * Trailing zeros are trimmed, so round colours stay short: hsl(0 100% 50%).
 */
function formatColor(hex: string, format: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const [r, g, b] = [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  switch (format) {
    case 'rgb':
      return `rgb(${r} ${g} ${b})`;
    case 'hsl': {
      const [rn, gn, bn] = [r / 255, g / 255, b / 255];
      const max = Math.max(rn, gn, bn);
      const min = Math.min(rn, gn, bn);
      const l = (max + min) / 2;
      const d = max - min;
      let h = 0;
      let sat = 0;
      if (d) {
        sat = d / (1 - Math.abs(2 * l - 1));
        h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
        h = (h * 60 + 360) % 360;
      }
      return `hsl(${num(h, 1)} ${num(sat * 100, 1)}% ${num(l * 100, 1)}%)`;
    }
    case 'oklch': {
      const lin = (c: number) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
      const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
      const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
      const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
      const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
      const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
      const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
      const C = Math.hypot(A, B);
      if (C < 0.00005) return `oklch(${num(L, 4)} 0 0)`;
      const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
      return `oklch(${num(L, 4)} ${num(C, 4)} ${num(H, 2)})`;
    }
    default:
      return `#${m[1].toLowerCase()}`;
  }
}

/** The picker's notation: data-format if it names a known one, else hex. */
const formatOf = (picker) => (COLOR_FORMATS.includes(picker.dataset.format) ? picker.dataset.format : 'hex');

/**
 * Render the value in the current notation: the display text, every
 * input[data-color-output] inside the picker (form submission, change fires)
 * and the switcher's selection.
 */
function syncValue(picker) {
  const input = getInput(picker);
  if (!input) return;
  const format = formatOf(picker);
  const text = formatColor(input.value, format);
  const display = dfDollar(picker).find('.color-picker-value').get(0);
  if (display && display.textContent !== text) display.textContent = text;
  dfDollar(picker).find('input[data-color-output]').toArray().forEach((out) => {
    if (out.value === text) return;
    out.value = text;
    out.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const switcher = dfDollar(picker).find('select.color-picker-format').get(0);
  if (switcher && switcher.value !== format) switcher.value = format;
}

/**
 * The markup of a state, for render(): the attributes a state writes, applied
 * to a detached copy of the authored markup ('default' IS the authored
 * markup). The live element gets the same markup from triggerStateChange -
 * the e2e render round trip proves they agree.
 */
function applyMarkup(el, config) {
  // the one state's markup is the value label: { format } (an attribute -
  // written only when it differs from the authored one) and { value } (the
  // input's property) feed the same syncValue() the live picker runs
  if (typeof config?.format === 'string' && COLOR_FORMATS.includes(config.format) && config.format !== formatOf(el)) dfDollar(el).attr('data-format', config.format);
  const input = getInput(el);
  if (input && typeof config?.value === 'string') input.value = config.value;
  syncValue(el);
}

/**
 * UI side of setState: 'default' optionally presets { value } through the
 * native color input (input event dispatched so the display stays in sync).
 */
function triggerStateChange(picker, config) {
  // only a format that differs is written: setState(getState()) changes nothing
  if (typeof config?.format === 'string' && COLOR_FORMATS.includes(config.format) && config.format !== formatOf(picker)) {
    picker.dataset.format = config.format;
    syncValue(picker);
  }
  const input = getInput(picker);
  if (!input || config?.value === undefined) return;
  input.value = String(config.value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Registry-level API; pass the wrapper explicitly. Unknown names throw. */
export const colorPickerApi = componentState({
  component: 'color-picker',
  states: colorPickerStates,
  apply: (picker, state) => triggerStateChange(picker, state.config),
  read: (picker, state) => {
    const input = getInput(picker);
    return {
      name: picker.dataset.stateName || 'default',
      // live value - reflects picking and typing, not just setState
      // value: the native #rrggbb; formatted: the same colour in the
      // picker's notation (format)
      config: {
        ...state.config,
        value: input ? input.value : '',
        format: formatOf(picker),
        formatted: input ? formatColor(input.value, formatOf(picker)) : '',
      },
    };
  },
  markup: (el, state) => applyMarkup(el, state.config),
});

df$.colorPickerApi = colorPickerApi;
df$.colorPickerStates = colorPickerStates;

function init() {
  dfDollar('.color-picker:not([data-init])').toArray().forEach((picker) => {
  picker.dataset.init = '';
  // el.store + el.api (AGENTS.md "State through stores")
  bindComponent(picker, colorPickerApi);
  const input = dfDollar(picker).find('input[type="color"]').get(0);
  if (!input) return;
  syncValue(picker);
  input.addEventListener('input', () => { syncValue(picker); });
  // user-switchable notation: <select class="color-picker-format">
  dfDollar(picker).find('select.color-picker-format').get(0)?.addEventListener('change', (e) => {
    picker.dataset.format = e.target.value;
    syncValue(picker);
  });
  // authors may flip data-format at runtime too
  new MutationObserver(() => syncValue(picker)).observe(picker, { attributes: true, attributeFilter: ['data-format'] });
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
