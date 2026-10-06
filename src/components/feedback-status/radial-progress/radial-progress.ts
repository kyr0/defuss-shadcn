/* -- Radial Progress component --------------------------------------- */
// The ring is CSS (radial-progress.css paints --value). This module is the
// optional runtime, mirroring progress.js: it keeps --value, the ARIA value,
// the label (percent / "x / n" / template) and the auto tone's data-level in
// sync with one source of truth - aria-valuenow over aria-valuemax -, glides
// linearly toward a new value, answers the same button commands
// (commandfor + command="--reset" …) and exposes the named State API
// (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent, textLocale } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** What progress:change carries. */
interface ProgressChangeDetail {
  /** the value (the --value custom property) */
  value: number;
  /** the max (data-max, default 100) */
  max: number;
  /** value / max, 0 to 1 */
  percent: number;
}

/** default = determinate at a value (as authored, or config.value);
 * indeterminate = no value (the spinning arc); complete = value == max. */
const radialProgressStates = ['default', 'indeterminate', 'complete'];

/** setState() configs per state (getState() reports value, max and the fraction done). */
export interface RadialProgressStateConfigs {
  /** Determinate; no config restores the authored value. */
  default: {
    /** the value to show (clamped to 0..max); getState() reports it */
    value?: number | null;
    /** ms to glide there linearly (default: jump) */
    duration?: number;
    /** a new total (aria-valuemax); getState() reports it */
    max?: number;
    /** reported by getState(): value / max, 0 to 1 (null while indeterminate) */
    percent?: number | null;
  };
  /** No value: aria-valuenow removed, a quarter arc spins. */
  indeterminate: {
    /** reported by getState(): null */
    value?: number | null;
    /** reported by getState(): the total */
    max?: number;
    /** reported by getState(): value / max, 0 to 1 (null while indeterminate) */
    percent?: number | null;
  };
  /** The value at max - progress:completed fires. */
  complete: {
    /** ms to glide to max (default: jump) */
    duration?: number;
    /** a new total */
    max?: number;
    /** reported by getState(): max */
    value?: number | null;
    /** reported by getState(): value / max, 0 to 1 (null while indeterminate) */
    percent?: number | null;
  };
}

const SELECTOR = '.radial-progress';
const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const maxOf = (el) => parseFloat(el.getAttribute('aria-valuemax') || '') || 100;
/** The value, or null while indeterminate (no aria-valuenow). */
const valueOf = (el) => (el.hasAttribute('aria-valuenow') ? parseFloat(el.getAttribute('aria-valuenow')) || 0 : null);
const clamp = (el, v) => Math.max(0, Math.min(maxOf(el), Number(v) || 0));
const round = (v) => Math.round(v * 10) / 10;

/** formatters in the text's locale (nearest [lang], else 'en') - never the browser's; one pair per locale */
const formats = new Map();
const fmtFor = (node) => {
  const locale = textLocale(node);
  if (!formats.has(locale)) {
    formats.set(locale, {
      pct: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
      num: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    });
  }
  return formats.get(locale);
};

/** The label text (data-format / data-template on the ring). */
function text(el) {
  const { pct: pctFmt, num: numFmt } = fmtFor(el);
  const v = valueOf(el);
  const max = maxOf(el);
  if (v == null) return el.dataset.indeterminate ?? '…';
  const tpl = el.dataset.template;
  if (tpl) {
    return tpl
      .replaceAll('{value}', numFmt.format(Math.round(v)))
      .replaceAll('{max}', numFmt.format(max))
      .replaceAll('{percent}', pctFmt.format(v / max));
  }
  switch (el.dataset.format) {
    case 'fraction': return `${numFmt.format(Math.round(v))} / ${numFmt.format(max)}`;
    case 'value': return numFmt.format(Math.round(v));
    default: return pctFmt.format(v / max);
  }
}

/** Where the label goes: a .radial-progress-value child, or the ring itself
 * when it holds plain text (an icon or other markup is left alone). */
function labelTarget(el) {
  const slot = dfDollar(el).find(':scope > .radial-progress-value').get(0);
  if (slot) return slot;
  return el.children.length === 0 ? el : null;
}

function paint(el) {
  const v = valueOf(el);
  const pct = v == null ? 0 : v / maxOf(el);
  // no value, no --value: the indeterminate arc (CSS) never reads it, and a
  // stale one would be markup no state describes
  if (v != null) el.style.setProperty('--value', String(round(pct * 100)));
  else el.style.removeProperty('--value');
  el.dataset.level = pct < 0.34 ? 'low' : pct < 0.67 ? 'mid' : 'high';
  el.toggleAttribute('data-complete', v != null && v >= maxOf(el));
  const target = labelTarget(el);
  const t = text(el);
  if (target) target.textContent = t;
  if (el.dataset.format === 'fraction' || el.dataset.template) el.setAttribute('aria-valuetext', t);
  else if (!el._authorValuetext) el.removeAttribute('aria-valuetext');
}

function stopTween(el) {
  if (el._raf) cancelAnimationFrame(el._raf);
  el._raf = 0;
  el.removeAttribute('data-running');
}

function setValue(el, v) {
  if (!el.hasAttribute('aria-valuemin')) el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuenow', String(round(v)));
  paint(el);
}

/** Settle on a value: the state name follows it (max → complete), events fire. */
function commit(el, v) {
  const before = el.dataset.stateName;
  setValue(el, v);
  const done = v >= maxOf(el);
  el.dataset.stateName = done ? 'complete' : 'default';
  // Fires when the value changes - value, max and the fraction done (0 to 1).
  el.dispatchEvent(new CustomEvent<ProgressChangeDetail>('progress:change', { bubbles: true, detail: { value: v, max: maxOf(el), percent: v / maxOf(el) } }));
  // Fires once when the value reaches max.
  if (done && before !== 'complete') el.dispatchEvent(new CustomEvent('progress:completed', { bubbles: true }));
}

/** Linear, time-based interpolation to `to` over `duration` ms. */
function tween(el, to, duration) {
  stopTween(el);
  const from = valueOf(el) ?? 0;
  if (!(duration > 0) || reducedMotion() || from === to) return commit(el, to);
  const t0 = performance.now();
  el.dataset.stateName = 'default';
  el.setAttribute('data-running', '');
  const frame = (now) => {
    const k = Math.min(1, (now - t0) / duration);
    if (k < 1) {
      setValue(el, from + (to - from) * k);
      el._raf = requestAnimationFrame(frame);
    } else {
      stopTween(el);
      commit(el, to);
    }
  };
  el._raf = requestAnimationFrame(frame);
}

const stepOf = (el) => parseFloat(el.dataset.step || '') || maxOf(el) / 10;
const durationOf = (el) => parseFloat(el.dataset.duration || '') || 3000;

/**
 * The markup of a state, for render(): the same setValue()/paint() the live
 * ring runs (everything they write lives on the ring itself), on a detached
 * copy of the authored markup.
 */
function applyMarkup(el, stateName, config) {
  const authored = valueOf(el);
  el._authorValuetext = el.hasAttribute('aria-valuetext') && !el.dataset.format && !el.dataset.template;
  if (!el.hasAttribute('aria-valuemin')) dfDollar(el).attr('aria-valuemin', '0');
  if (config?.max != null && Number(config.max) !== maxOf(el)) dfDollar(el).attr('aria-valuemax', String(config.max));
  if (stateName === 'indeterminate') {
    dfDollar(el).attr('aria-valuenow', null);
    paint(el);
  } else setValue(el, stateName === 'complete' ? maxOf(el) : clamp(el, config?.value != null ? config.value : authored ?? 0));
}

function triggerStateChange(el, stateName, config) {
  switch (stateName) {
    case 'default': {
      // only a max that differs is written: setState(getState()) changes nothing
      if (config.max != null && Number(config.max) !== maxOf(el)) el.setAttribute('aria-valuemax', String(config.max));
      const to = clamp(el, config.value != null ? config.value : el._authored ?? 0);
      if (config.duration > 0) tween(el, to, config.duration);
      else { stopTween(el); commit(el, to); }
      break;
    }
    case 'indeterminate':
      stopTween(el);
      el.removeAttribute('aria-valuenow');
      paint(el);
      el.dataset.stateName = 'indeterminate';
      break;
    case 'complete':
      if (config.duration > 0) tween(el, maxOf(el), config.duration);
      else { stopTween(el); commit(el, maxOf(el)); }
      break;
  }
}

/** Registry-level API; pass the .radial-progress explicitly. Unknown names throw. */
export const radialProgressApi = componentState({
  component: 'radial-progress',
  states: radialProgressStates,
  apply: (el, state) => triggerStateChange(el, state.name, state.config),
  read: (el, state) => {
    const v = valueOf(el);
    return {
      name: el.dataset.stateName || 'default',
      config: { ...state.config, value: v, max: maxOf(el), percent: v == null ? null : v / maxOf(el) },
    };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config),
});

df$.radialProgressApi = radialProgressApi;
df$.radialProgressStates = radialProgressStates;

/** The shared progress command vocabulary (see progress.js). */
function run(el, command) {
  const now = valueOf(el) ?? 0;
  switch (command) {
    case 'reset': radialProgressApi.setState(el, 'default', { value: 0 }); break;
    case 'increment': radialProgressApi.setState(el, 'default', { value: now + stepOf(el) }); break;
    case 'decrement': radialProgressApi.setState(el, 'default', { value: now - stepOf(el) }); break;
    case 'complete': radialProgressApi.setState(el, 'complete'); break;
    case 'indeterminate': radialProgressApi.setState(el, 'indeterminate'); break;
    case 'play': {
      // a full ring starts over from 0
      if (now >= maxOf(el)) setValue(el, 0);
      const rest = 1 - (valueOf(el) ?? 0) / maxOf(el);
      radialProgressApi.setState(el, 'default', { value: maxOf(el), duration: durationOf(el) * rest });
      break;
    }
    case 'pause': {
      const held = valueOf(el) ?? 0;
      stopTween(el);
      commit(el, held);
      break;
    }
  }
}
const COMMANDS = ['reset', 'increment', 'decrement', 'complete', 'indeterminate', 'play', 'pause'];

function init() {
  dfDollar(`${SELECTOR}:not([data-init])`).toArray().forEach((el) => {
    el.dataset.init = '';
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(el, radialProgressApi);
    el._authorValuetext = el.hasAttribute('aria-valuetext') && !el.dataset.format && !el.dataset.template;
    // CSS-only markup may carry only --value: adopt it as the value
    if (!el.hasAttribute('aria-valuenow') && el.style.getPropertyValue('--value') !== '' && el.getAttribute('role') === 'progressbar') {
      el.setAttribute('aria-valuenow', String((parseFloat(el.style.getPropertyValue('--value')) / 100) * maxOf(el)));
    }
    if (!el.hasAttribute('role')) el.setAttribute('role', 'progressbar');
    // a progressbar's minimum is 0: stated once, at init (setValue() keeps it)
    if (!el.hasAttribute('aria-valuemin')) el.setAttribute('aria-valuemin', '0');
    el._authored = valueOf(el);
    const v = valueOf(el);
    el.dataset.stateName = v == null ? 'indeterminate' : v >= maxOf(el) ? 'complete' : 'default';
    el.addEventListener('command', (e) => {
      const c = String((e as unknown as { command?: string }).command || '');
      if (c.startsWith('--')) run(el, c.slice(2));
    });
    for (const c of COMMANDS) el.addEventListener(`progress:${c}`, () => run(el, c));
    paint(el);
  });
}

// Browsers without the Invoker Commands API: the same buttons, by click.
if (!('commandForElement' in HTMLButtonElement.prototype) && !document.__radialProgressCommandInit) {
  document.__radialProgressCommandInit = true;
  document.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('button[commandfor][command^="--"]') : null;
    const el = btn && dfDollar('#' + CSS.escape(btn.getAttribute('commandfor'))).get(0);
    if (el?.matches(`${SELECTOR}[data-init]`)) run(el, btn.getAttribute('command').slice(2));
  });
}

// aria-valuenow / aria-valuemax written straight to the ring repaint it.
new MutationObserver((records) => {
  for (const r of records) {
    const el = r.target;
    if (el instanceof HTMLElement && el.matches(`${SELECTOR}[data-init]`) && !el._raf) {
      paint(el);
      const v = valueOf(el);
      el.dataset.stateName = v == null ? 'indeterminate' : v >= maxOf(el) ? 'complete' : 'default';
    }
  }
}).observe(document, { attributes: true, subtree: true, attributeFilter: ['aria-valuenow', 'aria-valuemax'] });

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
