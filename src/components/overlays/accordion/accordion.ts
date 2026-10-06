// -- Accordion -----------------------------------------------
// Single-open accordion behavior using native <details> elements, plus the
// named-state API so agents/tests can drive states by name (AGENTS.md "State
// API"), and render(): the authored markup reproduced from state, 1:1. Every
// DOM read and write goes through df$.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const accordionStates = ['default', 'all-open', 'all-closed'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state - the accordion's states take none. */
export interface AccordionStateConfigs {
  /** The items open as authored (each <details open>). */
  default: {};
  /** Every item open. */
  'all-open': {};
  /** Every item closed. */
  'all-closed': {};
}

/**
 * The markup of a state - the one place a state becomes `open` attributes.
 * setState runs it on the live accordion, render() on a detached copy of the
 * authored markup. 'default' is the authored open set: restored from
 * `defaults` on the live element; already in place on an authored copy
 * (`defaults` null).
 */
function applyMarkup(accordion, stateName, defaults) {
  dfDollar(accordion).find<HTMLDetailsElement>('.accordion-item').each((i, item) => {
    const open = stateName === 'all-open' ? true : stateName === 'all-closed' ? false : defaults ? defaults[i] : null;
    if (open !== null && open !== undefined) dfDollar(item).attr('open', open ? '' : null);
  });
}

/**
 * UI side of setState: syncs the DOM to a declared state. `_applying` suspends
 * the single-open/collapsible enforcement in the toggle listeners, otherwise
 * 'all-closed'/'all-open' would be undone by the enforcement. The `toggle`
 * event is queued (async), so the guard must outlive this function: it is
 * released on the next macrotask, after the queued toggle events have fired —
 * toggle-event tasks are queued synchronously by our `open` mutations, so they
 * always run before the timeout scheduled after them. The generation token
 * keeps back-to-back setState calls from releasing each other's guard.
 */
function triggerStateChange(accordion, stateName, _config) {
  const gen = (accordion._applyGen ?? 0) + 1;
  accordion._applyGen = gen;
  accordion._applying = true;
  applyMarkup(accordion, stateName, accordion._defaultOpen ?? []);
  // toggle events queue as tasks AFTER our mutations, before this timeout task
  setTimeout(() => {
    if (accordion._applyGen === gen) accordion._applying = false;
  }, 0);
}

/** Registry-level API; pass the accordion element explicitly. Unknown names throw. */
export const accordionApi = componentState({
  component: 'accordion',
  states: accordionStates,
  apply: (accordion, state) => triggerStateChange(accordion, state.name, state.config),
  markup: (el, state) => applyMarkup(el, state.name, null),
});

df$.accordionApi = accordionApi;
df$.accordionStates = accordionStates;

function init() {
  // the State API binds to EVERY accordion - all-open/all-closed are generic
  // batch states independent of the single-open behavior below; data-api is
  // this loop's own marker so data-init stays the exclusive-toggle marker
  dfDollar('.accordion:not([data-api])').each((_i, accordion) => {
    dfDollar(accordion).data('api', '');
    // snapshot the authored open set - that is the 'default' state to return to
    accordion._defaultOpen = dfDollar(accordion).find<HTMLDetailsElement>('.accordion-item').toArray().map((item) => item.open);
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(accordion, accordionApi);
  });
  dfDollar('.accordion[data-type="single"]:not([data-init])').each((_i, accordion) => {
    dfDollar(accordion).data('init', '');
    const items = dfDollar(accordion).find<HTMLDetailsElement>('.accordion-item').toArray();
    const collapsible = dfDollar(accordion).attr('data-collapsible') != null;
    items.forEach((item) => {
      // Cancellable pre-event: closing the LAST open item of a non-collapsible
      // single accordion is denied here, before the DOM changes. Reopening it
      // in the `toggle` handler instead would visibly flicker close→open now
      // that the ::details-content height transition animates.
      dfDollar(item).on('beforetoggle', (e) => {
        if (accordion._applying) return; // programmatic state change in progress
        if (e.newState !== 'closed' || collapsible) return;
        if (!items.some((i) => i !== item && i.open)) e.preventDefault();
      });
      dfDollar(item).on('toggle', () => {
        if (accordion._applying) return; // programmatic state change in progress
        if (item.open) {
          items.forEach((sibling) => {
            if (sibling !== item && sibling.open) sibling.open = false;
          });
        } else if (!collapsible) {
          // fallback for browsers without beforetoggle (which the deny above
          // needs): reopen, accepting the flicker - better than losing the
          // single-open guarantee. Modern browsers never reach this branch
          // because a denied beforetoggle fires no toggle event at all.
          if (!items.some((i) => i.open)) item.open = true;
        }
      });
    });
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
