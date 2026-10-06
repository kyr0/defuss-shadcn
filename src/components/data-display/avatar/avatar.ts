// -- Avatar ---------------------------------------------------
// Hides broken avatar images and shows the fallback, plus the named-state
// API bound per .avatar wrapper, so agents/tests can show the fallback
// without a network failure (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const avatarStates = ['default', 'error'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state - the avatar's states take none. */
export interface AvatarStateConfigs {
  /** The image shows (or only the fallback is authored). */
  default: {};
  /** The image failed to load - the fallback (initials, an icon) shows instead. */
  error: {};
}

/**
 * The markup of a state, for render(): the attributes every state writes -
 * the same as triggerStateChange does on the live element - applied to a
 * detached copy of the authored markup. The e2e render round trip proves
 * the two agree.
 */
function applyMarkup(el, stateName) {
  const img = dfDollar(el).find('.avatar-image');
  if (stateName === 'error') img.attr('data-error', '').css('display', 'none');
  else img.attr('data-error', null).css('display', '');
}

/**
 * UI side of setState (per wrapper): 'error' forces the broken-image look
 * (same DOM changes the error event makes); 'default' clears it, restoring
 * the image view. Wrappers without an <img> have nothing to toggle.
 */
function triggerStateChange(wrapper, stateName, _config) {
  const img = dfDollar(wrapper).find<HTMLImageElement>('.avatar-image').get(0);
  if (!img) return;
  switch (stateName) {
    case 'default':
      img.removeAttribute('data-error');
      img.style.display = '';
      break;
    case 'error':
      img.setAttribute('data-error', '');
      img.style.display = 'none';
      break;
  }
}

/** Registry-level API; pass the wrapper explicitly. Unknown names throw. */
export const avatarApi = componentState({
  component: 'avatar',
  states: avatarStates,
  apply: (wrapper, state) => triggerStateChange(wrapper, state.name, state.config),
  read: (wrapper, state) => {
    // reflect reality: a network failure flips it without setState()
    const img = dfDollar(wrapper).find<HTMLImageElement>('.avatar-image').get(0);
    const errored = img ? img.hasAttribute('data-error') : true;
    return {
      name: errored ? 'error' : 'default',
      config: state.config,
    };
  },
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.avatarApi = avatarApi;
df$.avatarStates = avatarStates;

function init() {
  dfDollar('.avatar:not([data-init])').toArray().forEach((wrapper) => {
  wrapper.dataset.init = '';
  // el.store + el.api (AGENTS.md "State through stores")
  bindComponent(wrapper, avatarApi);
  const img = dfDollar(wrapper).find<HTMLImageElement>('.avatar-image').get(0);
  if (!img) return;
  img.dataset.init = '';
  // catch images that errored BEFORE this script ran (module scripts are
  // deferred; a fast/local failure can beat init - image.ts does the same)
  if (img.complete && img.naturalWidth === 0) applyError();
  img.addEventListener('error', applyError);
  function applyError() {
    img.setAttribute('data-error', '');
    img.style.display = 'none';
    // network failure also moves the named state (keeps getState honest)
    wrapper.dataset.stateName = 'error';
  }
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
