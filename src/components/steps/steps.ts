// -- Steps ----------------------------------------------------
// Turns the static step markup into a live progress tracker. The <ol class=
// "steps"> carries its contract as data attributes (data-active-step /
// data-error-step); this script maps them onto the items - steps before the
// active one render `data-status="complete"`, the active one `current`, an
// optional error step `error` - and makes data-clickable steps interactive
// (AGENTS.md "State API").
//
// Attribute-driven (same reason as pagination.ts): the sandbox bridge writes
// data attributes directly, and the MutationObserver turns an attribute write
// into a re-mapping, so the panel editor drives the component without any
// component-specific JS on the caller's side. Without this file the authored
// markup still renders correctly (progressive enhancement).

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const stepsStates = ['default'];

/** Read one numeric data attribute (camelCase key) with a fallback. */
const numAttr = (el: HTMLElement, key: string, fallback: number): number => {
  const v = parseInt(el.dataset[key] ?? '', 10);
  return Number.isFinite(v) ? v : fallback;
};

/**
 * Map the attribute contract onto the items: statuses + aria-current. Pure
 * function of the attributes - idempotent, safe to run after every change.
 */
function renderSteps(ol: HTMLElement): void {
  const items = Array.from((dfDollar(ol).find('.step').toArray() as HTMLElement[]));
  if (items.length === 0) return;
  const total = items.length;
  const active = Math.min(total, Math.max(1, numAttr(ol, 'activeStep', 1)));
  // two spellings of the error marker: a numeric index, or the literal "true"
  // (what a boolean checkbox mutation writes) meaning "the ACTIVE step failed"
  const raw = ol.dataset.errorStep ?? '';
  const error = raw === 'true' ? active : parseInt(raw, 10) || 0;
  // guarded write - same-value setAttribute fires a MO record (re-render loop)
  if (ol.dataset.activeStep !== String(active)) ol.dataset.activeStep = String(active);
  items.forEach((item, i) => {
    const n = i + 1;
    // an explicit error step overrides the positional status (one error only)
    const status = n === error ? 'error' : n < active ? 'complete' : n === active ? 'current' : null;
    if (status) item.dataset.status = status;
    else delete item.dataset.status;
    if (status === 'current') item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
}

/**
 * UI side of setState: 'default' applies an optional { activeStep|step|page,
 * errorStep|activeStepError, min?, size } config onto the attributes and
 * re-maps. activeStepError (boolean, per the panel) maps to the ERROR INDEX:
 * true marks the active step, false clears it.
 */
/**
 * The markup of a state, for render(): the tracker attributes the state's
 * config names - written only where they differ from what the markup already
 * says (getState() reports the derived values: activeStep 1, size md, … even
 * when none was authored) - then the same renderSteps() the live list runs on
 * setState. Applied to a detached copy of the authored markup.
 */
function applyMarkup(ol: HTMLElement, config: Record<string, unknown> = {}): void {
  if (config.activeStep !== undefined && numAttr(ol, 'activeStep', 1) !== Number(config.activeStep)) ol.dataset.activeStep = String(config.activeStep);
  if (config.errorStep !== undefined && numAttr(ol, 'errorStep', 0) !== Number(config.errorStep)) {
    if (Number(config.errorStep)) ol.dataset.errorStep = String(config.errorStep);
    else delete ol.dataset.errorStep;
  }
  if (config.size !== undefined && (ol.dataset.size ?? 'md') !== config.size) ol.dataset.size = String(config.size);
  if (ol.hasAttribute('data-active-step')) renderSteps(ol);
}

function triggerStateChange(ol: HTMLElement, stateName: string, config: Record<string, unknown> = {}): void {
  if (stateName !== 'default') return;
  // only what differs is written: setState(getState()) changes nothing (getState
  // reports the derived activeStep 1 / errorStep 0 even when none was authored)
  const a = config.activeStep ?? config.step ?? config.page;
  if (a !== undefined && numAttr(ol, 'activeStep', 1) !== Number(a)) ol.dataset.activeStep = String(a);
  if (config.errorStep !== undefined) {
    if (numAttr(ol, 'errorStep', 0) !== Number(config.errorStep)) {
      if (Number(config.errorStep)) ol.dataset.errorStep = String(config.errorStep);
      else delete ol.dataset.errorStep;
    }
  } else if (config.activeStepError === true) ol.dataset.errorStep = ol.dataset.activeStep ?? '1';
  else if (config.activeStepError === false) delete ol.dataset.errorStep;
  if (config.size !== undefined && (ol.dataset.size ?? 'md') !== config.size) ol.dataset.size = String(config.size);
  // the same opt-in as init: only a data-driven list is re-mapped - a static
  // list keeps its authored statuses (setState('default') must not erase them)
  if (ol.hasAttribute('data-active-step')) renderSteps(ol);
}

/** Registry-level API; pass the <ol> explicitly. Unknown names throw. */
export const stepsApi = componentState({
  component: 'steps',
  states: stepsStates,
  apply: (ol, state) => triggerStateChange(ol, state.name, state.config),
  read: (ol, state) => {
    // reflect reality: clicking a clickable step moves the tracker without setState()
    return {
      name: ol.dataset.stateName || 'default',
      config: {
        ...state.config,
        activeStep: numAttr(ol, 'activeStep', 1),
        activeStepError: numAttr(ol, 'errorStep', 0) === numAttr(ol, 'activeStep', 1) && numAttr(ol, 'errorStep', 0) !== 0,
        errorStep: numAttr(ol, 'errorStep', 0),
        size: ol.dataset.size ?? 'md',
      },
    };
  },
  markup: (el, state) => applyMarkup(el as HTMLElement, state.config),
});

df$.stepsApi = stepsApi;
df$.stepsStates = stepsStates;

function init(): void {
  (dfDollar('.steps:not([data-init])').toArray() as HTMLElement[]).forEach((ol) => {
    ol.dataset.init = '';
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(ol, stepsApi);

    // opt-in: only a data-driven <ol> (declaring data-active-step) is mapped —
    // authored data-status markup stays exactly as written (progressive
    // enhancement; the e2e fixture's static statuses stay stable)
    if (ol.hasAttribute('data-active-step')) renderSteps(ol);
    // attribute-driven re-map: panel edits (bridge writes data attrs) and
    // setState both land here - the attributes ARE the state
    new MutationObserver(() => {
      if (ol.hasAttribute('data-active-step')) renderSteps(ol);
    }).observe(ol, {
      attributes: true,
      attributeFilter: ['data-active-step', 'data-error-step', 'data-size'],
    });

    // data-clickable steps become a real control: click (and Enter/Space on the
    // focusable indicator) moves the tracker
    ol.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.step[data-clickable]');
      if (!item || !ol.contains(item)) return;
      const items = Array.from(dfDollar(ol).find('.step').toArray());
      ol.dataset.activeStep = String(items.indexOf(item) + 1);
      delete ol.dataset.errorStep; // navigating clears the error
    });
    ol.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const ind = (e.target as HTMLElement).closest<HTMLElement>('.step[data-clickable] .step-indicator');
      if (!ind) return;
      e.preventDefault();
      ind.click();
    });
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
