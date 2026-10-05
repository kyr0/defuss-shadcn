/* -- Countdown component ------------------------------------------- */
// The rolling digits are CSS only (countdown.css reads --value). This module
// is the optional timer: a .countdown / .countdown-group with data-until
// (an ISO date) or data-duration (seconds) ticks its [data-unit] values down
// once a second, keeps each value's text (the accessible fallback) and the
// timer's label in sync, and exposes the named State API (AGENTS.md
// "State API"). Plain value countdowns get the API too - setState('default',
// { value }) is the CSS-only pattern's "update --value and the text".

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

/** default = as authored (a timer restarts from its data-until / data-duration);
 * running / paused / finished are the timer's life cycle. */
const countdownStates = ['default', 'running', 'paused', 'finished'];

const UNITS = [
  ['days', 86400],
  ['hours', 3600],
  ['minutes', 60],
  ['seconds', 1],
];
const isTimer = (el) => el.hasAttribute('data-until') || el.hasAttribute('data-duration');

/** Write one value: --value (drives the CSS roll) + the text. */
function writeValue(span, n) {
  const v = Math.max(0, Math.min(999, Math.round(n)));
  span.style.setProperty('--value', String(v));
  span.textContent = String(v);
}

/** The value spans a root owns (a group: every descendant .countdown's). */
const valuesOf = (el) =>
  el.classList.contains('countdown') ? [...dfDollar(el).find(':scope > span').toArray()] : [...dfDollar(el).find('.countdown > span').toArray()];

/** Seconds left → the present units, largest first; the largest absorbs the rest. */
function split(seconds, spans) {
  let rest = Math.max(0, Math.floor(seconds));
  const out = new Map();
  for (const [unit, size] of UNITS) {
    const span = spans.find((s) => s.dataset.unit === unit);
    if (!span) continue;
    const v = Math.floor(rest / size);
    out.set(span, v);
    rest -= v * size;
  }
  return out;
}

const fmt = (() => {
  const DF = (Intl as unknown as { DurationFormat?: new (l?: string, o?: object) => { format(d: object): string } }).DurationFormat;
  return DF ? new DF(undefined, { style: 'long' }) : null;
})();

/** The timer's accessible label ("2 days, 4 hours, …") - unless the author named it. */
function label(el, parts) {
  if (el._authorLabel) return;
  const d = {};
  for (const [span, v] of parts) d[span.dataset.unit] = v;
  const text = fmt ? fmt.format(d) : Object.entries(d).map(([u, v]) => `${v} ${u}`).join(', ');
  el.setAttribute('aria-label', text || '0');
}

function remaining(el) {
  if (el._paused != null) return el._paused;
  return Math.max(0, (el._deadline - Date.now()) / 1000);
}

function paintTimer(el) {
  const left = remaining(el);
  const parts = split(Math.ceil(left - 0.001), valuesOf(el));
  for (const [span, v] of parts) writeValue(span, v);
  label(el, parts);
  if (left <= 0 && el.dataset.stateName !== 'finished') finish(el);
}

function stop(el) {
  clearTimeout(el._tick);
  el._tick = 0;
}
/** Tick on the second boundary of the deadline, not a drifting interval. */
function schedule(el) {
  stop(el);
  paintTimer(el);
  if (el.dataset.stateName !== 'running') return;
  const ms = ((el._deadline - Date.now()) % 1000 + 1000) % 1000 || 1000;
  el._tick = setTimeout(() => schedule(el), ms + 5);
}

function finish(el) {
  stop(el);
  el._paused = 0;
  el.dataset.stateName = 'finished';
  for (const [span, v] of split(0, valuesOf(el))) writeValue(span, v);
  // Fires once when the countdown reaches zero.
  el.dispatchEvent(new CustomEvent('countdown:finished', { bubbles: true }));
}

/** The authored deadline (ms since epoch) of a timer. */
function authoredDeadline(el) {
  if (el.dataset.until) return Date.parse(el.dataset.until);
  return Date.now() + parseFloat(el.dataset.duration || '0') * 1000;
}

/**
 * The markup of a state, for render(), on a detached copy of the authored
 * markup: a plain countdown's digits ({ value } / { values } in 'default'),
 * the zeros of 'finished'. A timer's digits and label follow the clock - they
 * are written by the tick, not by a state (runtime-owned, see the e2e).
 */
function applyMarkup(el, stateName, config) {
  const spans = valuesOf(el);
  if (stateName === 'finished') {
    for (const [span, v] of split(0, spans)) writeValue(span, v);
    return;
  }
  if (isTimer(el) || stateName !== 'default') return;
  if (config?.value !== undefined && spans[0]) writeValue(spans[0], config.value);
  if (config?.values) for (const span of spans) if (span.dataset.unit in config.values) writeValue(span, config.values[span.dataset.unit]);
}

function triggerStateChange(el, stateName, config) {
  // running / paused are a timer's life cycle - a plain value countdown has
  // no clock to run (scheduling one wrote NaN into its digits)
  if (!isTimer(el) && (stateName === 'running' || stateName === 'paused')) {
    el.dataset.stateName = stateName;
    return;
  }
  switch (stateName) {
    case 'default':
      if (isTimer(el)) {
        el._deadline = authoredDeadline(el);
        el._paused = el.hasAttribute('data-paused') ? (el._deadline - Date.now()) / 1000 : null;
        el.dataset.stateName = el._paused != null ? 'paused' : 'running';
        schedule(el);
      } else {
        const spans = valuesOf(el);
        if (config?.value !== undefined && spans[0]) writeValue(spans[0], config.value);
        if (config?.values) for (const s of spans) if (s.dataset.unit in config.values) writeValue(s, config.values[s.dataset.unit]);
        if (config?.value === undefined && !config?.values) el._authored?.forEach((v, s) => writeValue(s, v));
        el.dataset.stateName = 'default';
      }
      break;
    case 'running': {
      // resume, or start toward a new { until } / { duration }
      if (config?.until) el._deadline = Date.parse(config.until);
      else if (config?.duration != null) el._deadline = Date.now() + config.duration * 1000;
      else if (el._paused != null) el._deadline = Date.now() + el._paused * 1000;
      el._paused = null;
      el.dataset.stateName = 'running';
      schedule(el);
      break;
    }
    case 'paused':
      el._paused = remaining(el);
      el.dataset.stateName = 'paused';
      stop(el);
      paintTimer(el);
      break;
    case 'finished':
      finish(el);
      break;
  }
}

/** Registry-level API; pass the .countdown / .countdown-group explicitly. Unknown names throw. */
export const countdownApi = componentState({
  component: 'countdown',
  states: countdownStates,
  apply: (el, state) => triggerStateChange(el, state.name, state.config),
  read: (el, state) => {
    const values = {};
    valuesOf(el).forEach((s, i) => (values[s.dataset.unit || i] = parseFloat(s.style.getPropertyValue('--value')) || 0));
    const config = { ...state.config, values };
    if (isTimer(el)) config.remaining = Math.round(remaining(el));
    return { name: el.dataset.stateName || 'default', config };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config),
});

df$.countdownApi = countdownApi;
df$.countdownStates = countdownStates;

function init() {
  dfDollar('.countdown-group:not([data-init]), .countdown:not([data-init])').toArray().forEach((el) => {
    // a .countdown inside a timer group belongs to the group
    if (el.classList.contains('countdown') && !isTimer(el) && el.parentElement?.closest('.countdown-group[data-until], .countdown-group[data-duration]')) return;
    if (el.classList.contains('countdown-group') && !isTimer(el)) return;
    el.dataset.init = '';
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(el, countdownApi);
    el._authored = new Map(valuesOf(el).map((s) => [s, parseFloat(s.style.getPropertyValue('--value')) || 0]));
    if (isTimer(el)) {
      el._authorLabel = el.hasAttribute('aria-label');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'timer');
      triggerStateChange(el, 'default', {});
    } else {
      el.dataset.stateName = 'default';
    }
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
