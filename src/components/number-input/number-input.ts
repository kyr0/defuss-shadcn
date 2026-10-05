// -- Number Input ---------------------------------------------
// Increment/decrement buttons for .number-input containers, plus the
// named-state API (AGENTS.md "State API"). The component's only observable
// state is the number itself, so 'default' carries an optional { value }
// preset and getState().config.value reports the live value.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const numberInputStates = ['default'];

// the editable field: <input type="number">, or the text field of a
// currency-masked wrapper (hidden outputs are never the field)
const getInput = (wrapper) => dfDollar(wrapper).find('input:not([type="hidden"])').get(0);

// -- Currency mask (data-currency on the wrapper) -----------------------------
// A native number input cannot show grouping, a locale's decimal comma or a
// currency symbol, so a currency field is <input type="text" inputmode=
// "decimal"> masked through Intl.NumberFormat: the LOCALE decides decimal and
// group separators, the symbol, its side and the fraction digits (EUR 2,
// JPY 0, …). data-locale picks it (else the nearest [lang], else the
// browser's); data-currency-display = symbol | narrowSymbol | code | name.

/** Everything the mask needs to know about a (currency, locale) pair. */
function currencyConfig(wrapper) {
  const currency = String(wrapper.dataset.currency || 'USD').toUpperCase();
  const locale = wrapper.dataset.locale || wrapper.closest('[lang]')?.getAttribute('lang') || navigator.language;
  const currencyDisplay = wrapper.dataset.currencyDisplay || 'symbol';
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay });
  const parts = money.formatToParts(1234567.5);
  const index = (type) => parts.findIndex((p) => p.type === type);
  const fraction = money.resolvedOptions().maximumFractionDigits ?? 2;
  return {
    locale,
    currency,
    fraction,
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
    symbol: parts.find((p) => p.type === 'currency')?.value ?? currency,
    prefix: index('currency') < index('integer'),
    grouping: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    fixed: new Intl.NumberFormat(locale, { minimumFractionDigits: fraction, maximumFractionDigits: fraction }),
  };
}

/**
 * Split typed text into integer + fraction digits. The locale's decimal
 * separator marks the fraction; the OTHER of "," / "." counts as decimal too
 * when it is followed by no more digits than the currency allows - so a
 * numpad "." in de-DE ("12." → "12,") works, while "1.234" (a group) stays
 * an integer. Everything else that isn't a digit is dropped.
 */
function parseMoney(text, cfg) {
  let dec = text.lastIndexOf(cfg.decimal);
  if (dec < 0 && cfg.fraction > 0) {
    const alt = cfg.decimal === ',' ? '.' : ',';
    const i = text.lastIndexOf(alt);
    // only digits after it, and no more than the currency's fraction digits
    if (i >= 0 && /^\d*$/.test(text.slice(i + 1)) && text.length - i - 1 <= cfg.fraction) dec = i;
  }
  if (cfg.fraction === 0) dec = -1;
  const int = (dec < 0 ? text : text.slice(0, dec)).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const frac = dec < 0 ? null : text.slice(dec + 1).replace(/\D/g, '').slice(0, cfg.fraction);
  return { int, frac };
}

/** Locale text for integer + fraction digits (grouped; BigInt: no float loss). */
const moneyText = (int, frac, cfg) =>
  (int ? cfg.grouping.format(BigInt(int)) : frac !== null ? '0' : '') + (frac !== null ? cfg.decimal + frac : '');

/** The machine value for forms / getState, normalised - "1234.5" whether the
 * field shows 1.234,5 or 1.234,50; '' when empty. */
const moneyValue = ({ int, frac }) => {
  if (!int && !frac) return '';
  const f = (frac ?? '').replace(/0+$/, '');
  return `${int || '0'}${f ? '.' + f : ''}`;
};

/**
 * Re-mask the field after typing, keeping the caret after the same number of
 * digits it followed before (grouping characters come and go under it).
 */
function maskMoney(wrapper, input, cfg) {
  const raw = input.value;
  const caret = input.selectionStart ?? raw.length;
  const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
  const parsed = parseMoney(raw, cfg);
  const text = moneyText(parsed.int, parsed.frac, cfg);
  if (text !== raw) {
    input.value = text;
    let pos = 0;
    for (let seen = 0; pos < text.length && seen < digitsBefore; pos++) if (/\d/.test(text[pos])) seen++;
    // typed the decimal separator right here: land after it
    if (text[pos] === cfg.decimal && raw.slice(0, caret).match(/[.,]$/)) pos++;
    input.setSelectionRange(pos, pos);
  }
  wrapper._moneyExact = moneyValue(parsed);
  writeMoneyOutput(wrapper, wrapper._moneyExact);
}

/** Commit (blur / Enter / step / preset): full fraction digits, "0" for empty int. */
function commitMoney(wrapper, input, cfg, number = null, remember = true) {
  const value = number ?? moneyValue(parseMoney(input.value, cfg));
  if (remember) wrapper._moneyExact = value === '' || !Number.isFinite(Number(value)) ? '' : String(Number(value));
  if (value === '' || !Number.isFinite(Number(value))) {
    input.value = '';
    writeMoneyOutput(wrapper, '');
    return;
  }
  input.value = cfg.fixed.format(Number(value));
  writeMoneyOutput(wrapper, moneyValue(parseMoney(input.value, cfg)));
}

/** Mirror the machine value into input[data-number-output] (+ change) and the wrapper. */
function writeMoneyOutput(wrapper, value) {
  wrapper.dataset.value = value;
  dfDollar(wrapper).find('input[data-number-output]').toArray().forEach((out) => {
    if (out.value === value) return;
    out.value = value;
    out.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/** Show the locale's symbol on the locale's side (a unit label is created if missing). */
function placeCurrencySymbol(wrapper, input, cfg) {
  let unit = dfDollar(wrapper).find('.number-input-unit').get(0);
  if (!unit) {
    unit = document.createElement('label');
    unit.className = 'number-input-unit';
    if (input.id) unit.htmlFor = input.id;
  }
  unit.textContent = cfg.symbol;
  if (cfg.prefix && unit.nextElementSibling !== input) input.before(unit);
  if (!cfg.prefix && input.nextElementSibling !== unit) input.after(unit);
}

/** Set up (or re-set after data-locale / data-currency changes) a currency field. */
function setupCurrency(wrapper, input) {
  const cfg = currencyConfig(wrapper);
  wrapper._money = cfg;
  placeCurrencySymbol(wrapper, input, cfg);
  input.setAttribute('inputmode', cfg.fraction > 0 ? 'decimal' : 'numeric');
  // re-setup (locale / currency switch): render the remembered EXACT amount;
  // first setup: the authored value - a machine number ("1234.5") or
  // already-localised text ("1.234,50", e.g. a re-serialised field)
  if (wrapper._moneyExact !== undefined) {
    commitMoney(wrapper, input, cfg, wrapper._moneyExact, false);
    return;
  }
  const authored = (input.getAttribute('value') ?? '').trim();
  const machine = /^\d+(\.\d+)?$/.test(authored) ? authored : moneyValue(parseMoney(authored, cfg));
  commitMoney(wrapper, input, cfg, machine === '' ? '' : machine);
}

/**
 * Fixed decimals (data-decimals="N" on the wrapper): the value is shown with
 * exactly N fraction digits - 19 → "19.0", a step from 19.5 → "20.0" (native
 * stepUp() would print "20"). Applied on init, after every step, on commit
 * (change = blur/Enter - never mid-typing) and on setState presets. The
 * input's value stays a plain number string, so forms submit it unchanged.
 */
function formatDecimals(wrapper, input) {
  const d = parseInt(wrapper.dataset.decimals ?? '', 10);
  if (!Number.isFinite(d) || d < 0 || input.value === '') return;
  const n = input.valueAsNumber;
  if (!Number.isFinite(n)) return;
  const fixed = n.toFixed(d);
  if (input.value !== fixed) input.value = fixed;
}

/**
 * The markup of a state, for render(): the attributes a state writes, applied
 * to a detached copy of the authored markup ('default' IS the authored
 * markup). The live element gets the same markup from triggerStateChange -
 * the e2e render round trip proves they agree.
 */
function applyMarkup(_el, _stateName) {
  // one state, and it writes no markup: { value } sets the field's value (a
  // property) - every state renders the authored markup
}

/**
 * UI side of setState: 'default' optionally presets { value } through the
 * native input (events dispatched so listeners see the change).
 */
function triggerStateChange(wrapper, config) {
  const input = getInput(wrapper);
  if (!input) return;
  if (wrapper._money) {
    // currency: the machine number (1234.5), rendered per locale - { number }
    // (what getState() reports, so setState(getState()) changes nothing)
    // or { value }; getState's `value` is the DISPLAY text, never re-parsed
    const machine = config?.number !== undefined ? config.number : config?.value;
    if (machine === undefined) return;
    commitMoney(wrapper, input, wrapper._money, machine === '' ? '' : String(machine));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if (config?.value === undefined) return;
  input.value = String(config.value);
  formatDecimals(wrapper, input);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Registry-level API; pass the wrapper explicitly. Unknown names throw. */
export const numberInputApi = componentState({
  component: 'number-input',
  states: numberInputStates,
  apply: (wrapper, state) => triggerStateChange(wrapper, state.config),
  read: (wrapper, state) => {
    const input = getInput(wrapper);
    return {
      name: wrapper.dataset.stateName || 'default',
      // live value - reflects stepper clicks and typing, not just setState
      // currency fields add the machine value + currency/locale; value stays
      // what the field shows
      config: {
        ...state.config,
        value: input ? input.value : '',
        ...(wrapper._money ? { number: wrapper.dataset.value ?? '', currency: wrapper._money.currency, locale: wrapper._money.locale } : {}),
      },
    };
  },
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.numberInputApi = numberInputApi;
df$.numberInputStates = numberInputStates;

function init() {
  dfDollar('.number-input:not([data-init])').toArray().forEach((wrapper) => {
  wrapper.dataset.init = '';
  // el.store + el.api (AGENTS.md "State through stores")
  bindComponent(wrapper, numberInputApi);
  const input = getInput(wrapper);
  const decBtn = dfDollar(wrapper).find('[data-action="decrement"]').get(0);
  const incBtn = dfDollar(wrapper).find('[data-action="increment"]').get(0);
  if (!input) return;

  if (wrapper.hasAttribute('data-currency')) {
    setupCurrency(wrapper, input);
    input.addEventListener('input', (e) => {
      if ((e as InputEvent).isComposing) return;
      maskMoney(wrapper, input, wrapper._money);
    });
    input.addEventListener('blur', () => { commitMoney(wrapper, input, wrapper._money); });
    // steppers + ArrowUp/Down nudge by data-step (default 1), clamped to data-min / data-max
    const nudge = (direction) => {
      const step = Number(input.dataset.step || 1);
      const min = input.dataset.min === undefined ? -Infinity : Number(input.dataset.min);
      const max = input.dataset.max === undefined ? Infinity : Number(input.dataset.max);
      const current = Number(moneyValue(parseMoney(input.value, wrapper._money)) || 0);
      const next = Math.min(max, Math.max(min, Math.round((current + direction * step) * 1e6) / 1e6));
      commitMoney(wrapper, input, wrapper._money, String(next));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        nudge(e.key === 'ArrowUp' ? 1 : -1);
      }
    });
    if (decBtn) decBtn.addEventListener('click', () => { nudge(-1); });
    if (incBtn) incBtn.addEventListener('click', () => { nudge(1); });
    // switching locale / currency / display at runtime re-renders the same amount
    new MutationObserver(() => { setupCurrency(wrapper, input); }).observe(wrapper, { attributes: true, attributeFilter: ['data-locale', 'data-currency', 'data-currency-display'] });
    return;
  }

  formatDecimals(wrapper, input);
  // commit (blur / Enter) re-applies the fixed decimals to typed values
  input.addEventListener('change', () => { formatDecimals(wrapper, input); });

  const update = (direction) => {
    try {
      if (direction > 0) input.stepUp();
      else input.stepDown();
      formatDecimals(wrapper, input);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch { /* min/max boundary */ }
  };

  if (decBtn) decBtn.addEventListener('click', () => { update(-1); });
  if (incBtn) incBtn.addEventListener('click', () => { update(1); });
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
