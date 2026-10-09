// -- Teaser ---------------------------------------------------
// A card that stands in for deferred content: its play button - or a click
// anywhere on the card - morphs the content of its <template class=
// "teaser-content"> into place through defuss-morph. Template content is
// inert, so nothing in it loads (no image, video, iframe, script) until then.
// States: default (the teaser) and played (the content); render(state)
// reproduces the markup of either (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent, settleTemplates } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const teaserStates = ['default', 'played'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state - the teaser's states take none. */
export interface TeaserStateConfigs {
  /** The teaser: the play button, the title and the text - the content is not loaded. */
  default: {};
  /** The content of the teaser's template, morphed in place of the teaser. */
  played: {};
}

/** The two markups a teaser switches between, read once from its authored state. */
interface TeaserParts {
  /** the authored inner markup - the teaser itself, its template included */
  teaser: string;
  /** the template's content - the markup that replaces the teaser when it plays */
  content: string;
}

/** both markups of a teaser in its authored (default) state */
function partsOf(el: HTMLElement): TeaserParts {
  const template = dfDollar(el).find('template.teaser-content');
  return { teaser: dfDollar(el).html() ?? '', content: template.length ? (template.html() ?? '') : '' };
}

/**
 * The markup of a state - the one place a state becomes markup. setState runs
 * it on the live teaser, render() on a detached copy of the authored markup.
 * It writes only what differs: re-entering the current state changes nothing.
 */
function applyMarkup(el: HTMLElement, stateName: string, parts: TeaserParts) {
  const played = stateName === 'played';
  if (played === el.hasAttribute('data-played')) return;
  // defuss-morph reconciles the children in place: the teaser becomes the content;
  // a template coming back (or one inside the content) gets its content as parsed
  const markup = played ? parts.content : parts.teaser;
  dfDollar(el).morph(markup);
  settleTemplates(el, markup);
  dfDollar(el).attr('data-played', played ? '' : null);
}

/** UI side of setState (AGENTS.md "State API"): the state's markup, from the parts read at init. */
function triggerStateChange(el: HTMLElement, stateName: string) {
  applyMarkup(el, stateName, el._teaser ?? partsOf(el));
}

/** Registry-level API; pass the teaser element explicitly. Unknown names throw. */
export const teaserApi = componentState<HTMLElement>({
  component: 'teaser',
  states: teaserStates,
  apply: (el, state) => triggerStateChange(el, state.name),
  read: (el, state) => ({ name: el.hasAttribute('data-played') ? 'played' : 'default', config: state.config }),
  markup: (el, state) => applyMarkup(el, state.name, partsOf(el)),
});

df$.teaserApi = teaserApi;
df$.teaserStates = teaserStates;

/** after a click the keyboard continues in the content: its first control, else the teaser itself */
function focusContent(el: HTMLElement) {
  const first = dfDollar(el).find('a[href], button, input, select, textarea, iframe, video[controls], [tabindex]:not([tabindex="-1"])').get(0) as HTMLElement | undefined;
  if (first) {
    first.focus({ preventScroll: true });
    return;
  }
  dfDollar(el).attr('tabindex', '-1');
  el.focus({ preventScroll: true });
}

function init() {
  dfDollar('.teaser:not([data-init])').each((_i, node) => {
    const el = node as HTMLElement;
    dfDollar(el).data('init', '');
    // both markups, read once while the teaser still shows its authored state
    el._teaser = partsOf(el);
    // el.store + el.api: `$('#intro').api.setState('played')`
    bindComponent(el, teaserApi, { name: el.hasAttribute('data-played') ? 'played' : 'default', config: {} });
    // the play button - or a click anywhere on the card that is not another control
    dfDollar(el).on('click', (e) => {
      if (el.hasAttribute('data-played')) return;
      const control = (e.target as Element).closest('a, button, input, select, textarea, summary, [contenteditable]');
      if (control && el.contains(control) && !control.matches('.play-button')) return;
      teaserApi.setState(el, 'played');
      focusContent(el);
    });
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
