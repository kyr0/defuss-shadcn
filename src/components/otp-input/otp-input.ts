// -- OTP Input ------------------------------------------------
// One real <input> under a row of slots. The input is the control — native
// paste, one-time-code autofill, selection, IME and form submission all keep
// working — and the slots are a mirror of its value, marked aria-hidden so the
// field is announced once, not once per digit. Plus the named-state API
// (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); build.ts inlines it into the
// shipped .js, so this import never appears in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const _defussShadcn = defussGlobals();

const otpInputStates = ['default', 'filled', 'invalid'];

/** Characters a field accepts, by data-pattern. */
const PATTERNS = {
  digits: /[^0-9]/g,
  alphanumeric: /[^a-zA-Z0-9]/g,
};

const lengthOf = (otp) => Math.max(1, parseInt(otp.dataset.length || '6', 10) || 6);

/** Strips anything the pattern disallows and trims to the field length. */
function clean(otp, raw) {
  const strip = PATTERNS[otp.dataset.pattern] ?? PATTERNS.digits;
  return raw.replace(strip, '').slice(0, lengthOf(otp));
}

/**
 * Paints the slots from the input's value and caret. Slots carry no text of
 * their own — they are a view, so a repaint can never disagree with the value
 * the form will submit.
 */
function paint(otp) {
  const field = otp._field;
  if (!field) return;
  const value = field.value;
  const focused = document.activeElement === field;
  // the caret sits at selectionStart; past the end it belongs to the last slot
  const caret = Math.min(field.selectionStart ?? value.length, lengthOf(otp) - 1);

  otp._slots.forEach((slot, i) => {
    const char = value[i] ?? '';
    slot.textContent = otp.hasAttribute('data-mask') && char ? '•' : char;
    slot.toggleAttribute('data-filled', char !== '');
    // the active slot stands in for the caret, which is invisible on the field
    slot.toggleAttribute('data-active', focused && i === caret && value.length < lengthOf(otp));
    slot.toggleAttribute('data-caret', focused && i === value.length && value.length < lengthOf(otp));
  });
}

/** Fires when the field reaches its full length, so a form can submit itself. */
function announceComplete(otp) {
  otp.dispatchEvent(
    new CustomEvent('otp-complete', { bubbles: true, detail: { value: otp._field.value } }),
  );
}

/**
 * UI side of setState. 'default' and 'filled' both accept `{ value }`; the
 * difference is what they mean to a reader, and 'filled' fills the field when
 * given no value of its own. 'invalid' marks the field aria-invalid.
 */
function triggerStateChange(otp, stateName, config) {
  const field = otp._field;
  switch (stateName) {
    case 'default':
      otp.removeAttribute('data-invalid');
      field.removeAttribute('aria-invalid');
      if (typeof config.value === 'string') field.value = clean(otp, config.value);
      break;
    case 'filled':
      otp.removeAttribute('data-invalid');
      field.removeAttribute('aria-invalid');
      if (typeof config.value === 'string') {
        field.value = clean(otp, config.value);
      } else if (field.value.length < lengthOf(otp)) {
        // asked to *show* a complete field with nothing to show — stand in with
        // zeros. Never overwrite a value that is already complete: this state
        // is also entered automatically the moment the user finishes typing.
        field.value = '0'.repeat(lengthOf(otp));
      }
      break;
    case 'invalid':
      otp.setAttribute('data-invalid', '');
      field.setAttribute('aria-invalid', 'true');
      if (typeof config.value === 'string') field.value = clean(otp, config.value);
      break;
  }
  paint(otp);
}

/** Registry-level API; pass the otp-input element explicitly. Unknown names throw. */
export const otpInputApi = {
  setState(otp, stateName, config = {}) {
    if (!otpInputStates.includes(stateName)) {
      throw new Error(
        `otp-input: unknown state "${stateName}" (supported: ${otpInputStates.join(', ')})`,
      );
    }
    triggerStateChange(otp, stateName, config);
    // state lives on the ELEMENT, not the module: a page may hold several
    // fields, each in a different state
    otp.dataset.stateName = stateName;
    otp._stateConfig = config;
  },
  getState(otp) {
    return { name: otp.dataset.stateName || 'default', config: otp._stateConfig ?? {} };
  },
};

_defussShadcn.otpInputApi = otpInputApi;
_defussShadcn.otpInputStates = otpInputStates;

function init() {
  document.querySelectorAll('.otp-input:not([data-init])').forEach((otp) => {
    otp.dataset.init = '';

    const field = otp.querySelector('input');
    if (!field) return; // the input is authored, not generated — nothing to drive
    otp._field = field;

    const length = lengthOf(otp);
    field.maxLength = length;
    if (!field.getAttribute('inputmode')) {
      field.setAttribute('inputmode', otp.dataset.pattern === 'alphanumeric' ? 'text' : 'numeric');
    }
    if (!field.getAttribute('autocomplete')) field.setAttribute('autocomplete', 'one-time-code');

    // slots mirror the value; aria-hidden so the field is announced once
    const groupSize = parseInt(otp.dataset.groupSize || '0', 10) || 0;
    otp._slots = [];
    const shell = document.createElement('div');
    shell.className = 'otp-input-slots';
    shell.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < length; i++) {
      if (groupSize && i > 0 && i % groupSize === 0) {
        const sep = document.createElement('div');
        sep.className = 'otp-input-separator';
        shell.appendChild(sep);
      }
      const slot = document.createElement('div');
      slot.className = 'otp-input-slot';
      shell.appendChild(slot);
      otp._slots.push(slot);
    }
    otp.appendChild(shell);

    const sync = () => {
      const cleaned = clean(otp, field.value);
      if (cleaned !== field.value) {
        const at = field.selectionStart;
        field.value = cleaned;
        // keep the caret where the typing left it, not at the end
        if (at !== null) field.setSelectionRange(Math.min(at, cleaned.length), Math.min(at, cleaned.length));
      }
      paint(otp);
      if (field.value.length === length) {
        // carry the value through, so the state change reports what the user
        // actually entered rather than re-deriving it
        otpInputApi.setState(otp, otp.hasAttribute('data-invalid') ? 'invalid' : 'filled', {
          value: field.value,
        });
        announceComplete(otp);
      }
    };

    field.addEventListener('input', sync);
    field.addEventListener('focus', () => paint(otp));
    field.addEventListener('blur', () => paint(otp));
    // arrows/clicks move the caret without firing input
    field.addEventListener('keyup', () => paint(otp));
    field.addEventListener('click', () => paint(otp));
    field.addEventListener('select', () => paint(otp));

    otp.api = {
      setState: (stateName, config) => otpInputApi.setState(otp, stateName, config),
      getState: () => otpInputApi.getState(otp),
    };

    otpInputApi.setState(otp, field.value.length === length ? 'filled' : 'default', {});
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
