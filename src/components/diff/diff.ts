/* -- Diff component ------------------------------------------------ */
// Before/after comparison. The divider IS a native <input type="range"
// class="diff-range"> (keyboard, touch, screen-reader value for free); this
// module only mirrors its value into --diff-pos, makes the whole figure a
// drag surface (pointer capture), optionally follows the pointer on hover
// (data-follow="hover"), and exposes the named State API (AGENTS.md
// "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

/** default = the authored (or configured) position; before / after reveal
 * one side completely (item 1 at 100% / item 2 at 100%). */
const diffStates = ['default', 'before', 'after'];

const rangeOf = (el) => el.querySelector(':scope > .diff-range');

/** Paint: the range's value (0..100) → --diff-pos on the figure. */
function paint(el) {
  const range = rangeOf(el);
  if (!range) return;
  const min = parseFloat(range.min || '0');
  const max = parseFloat(range.max || '100');
  const pct = max === min ? 50 : ((parseFloat(range.value) - min) / (max - min)) * 100;
  el.style.setProperty('--diff-pos', `${pct}%`);
  // the observable state name follows the divider (drag / keys included)
  el.dataset.stateName = pct >= 100 ? 'before' : pct <= 0 ? 'after' : 'default';
}

/** Set the position in percent (clamped) and notify like a user edit. */
function setPosition(el, pct) {
  const range = rangeOf(el);
  if (!range) return;
  const min = parseFloat(range.min || '0');
  const max = parseFloat(range.max || '100');
  const value = min + (Math.min(100, Math.max(0, pct)) / 100) * (max - min);
  range.value = String(value);
  paint(el);
  range.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Pointer → percent along the figure's axis. */
function pointerPct(el, e) {
  const r = el.getBoundingClientRect();
  if (el.dataset.orientation === 'vertical') return ((e.clientY - r.top) / r.height) * 100;
  const x = ((e.clientX - r.left) / r.width) * 100;
  // RTL: the range runs right → left, so does the reveal
  return getComputedStyle(el).direction === 'rtl' ? 100 - x : x;
}

function triggerStateChange(el, stateName, config) {
  switch (stateName) {
    case 'default':
      setPosition(el, config?.position ?? el._defaultPosition ?? 50);
      break;
    case 'before':
      setPosition(el, 100);
      break;
    case 'after':
      setPosition(el, 0);
      break;
  }
}

/** Registry-level API; pass the .diff figure explicitly. Unknown names throw. */
export const diffApi = {
  setState(el, stateName, config = {}) {
    if (!diffStates.includes(stateName)) {
      throw new Error(`diff: unknown state "${stateName}" (supported: ${diffStates.join(', ')})`);
    }
    triggerStateChange(el, stateName, config);
    // state lives on the ELEMENT, not the module (many diffs per page)
    el.dataset.stateName = stateName;
    el._stateConfig = config;
  },
  getState(el) {
    // reflect reality: dragging moves the divider without setState()
    const pct = parseFloat(el.style.getPropertyValue('--diff-pos')) || 0;
    const name = pct >= 100 ? 'before' : pct <= 0 ? 'after' : 'default';
    return { name, config: { ...el._stateConfig, position: Math.round(pct * 100) / 100 } };
  },
};

df$.diffApi = diffApi;
df$.diffStates = diffStates;

function init() {
  document.querySelectorAll('.diff:not([data-init])').forEach((el) => {
    el.dataset.init = '';
    const range = rangeOf(el);
    if (!range) return;
    paint(el);
    el._defaultPosition = parseFloat(el.style.getPropertyValue('--diff-pos')) || 50;
    el.api = {
      setState: (stateName, config) => diffApi.setState(el, stateName, config),
      getState: () => diffApi.getState(el),
    };
    range.addEventListener('input', () => paint(el));
    // the range's fine step (0.1) keeps dragging smooth; the keyboard moves
    // in whole percent (Shift / Page Up/Down: 10)
    range.addEventListener('keydown', (e) => {
      const big = e.shiftKey ? 10 : 1;
      const deltas = { ArrowRight: big, ArrowUp: big, ArrowLeft: -big, ArrowDown: -big, PageUp: 10, PageDown: -10 };
      let d = deltas[e.key];
      if (d === undefined) return;
      e.preventDefault();
      const pct = parseFloat(el.style.getPropertyValue('--diff-pos')) || 0;
      // vertical: the range runs top → bottom, so Down moves the divider down
      if (el.dataset.orientation === 'vertical' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) d = -d;
      // RTL: ArrowLeft moves the divider left = toward the range's max
      if (el.dataset.orientation !== 'vertical' && getComputedStyle(el).direction === 'rtl' && e.key.startsWith('Arrow')) d = -d;
      setPosition(el, pct + d);
    });

    // drag anywhere on the figure (the range itself handles its own knob)
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target === range) return;
      // no compat mousedown: it would move focus off the range again
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = '';
      setPosition(el, pointerPct(el, e));
      range.focus({ preventScroll: true });
    });
    el.addEventListener('pointermove', (e) => {
      if (el.hasPointerCapture(e.pointerId) || (el.dataset.follow === 'hover' && e.pointerType === 'mouse')) {
        setPosition(el, pointerPct(el, e));
      }
    });
    const end = (e) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      delete el.dataset.dragging;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
