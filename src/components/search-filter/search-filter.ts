// -- Search & Filter -------------------------------------------
// The search box: a native <input type="search"> inside a frame with a
// leading icon and a clear (×) button. The runtime only does what CSS can't:
// knowing whether there is text (the × shows then), clearing it - by the
// button or Escape - and telling the page, through the same `input` event
// typing fires, so one listener handles both. The filter chips are CSS only.
// Plus the named-state API (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

const searchFilterStates = ['default', 'filled', 'searching'];

/** Sets the field's value and lets listeners know, exactly as typing would. */
function setValue(box, value) {
  const field = box._field;
  if (field.value === value) return;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * UI side of setState. Every state accepts `{ value }`. 'default' is the
 * empty box (it clears the field unless given a value); 'filled' has text;
 * 'searching' has text and a pending lookup - a spinner in place of the
 * icon, aria-busy on the field.
 */
function triggerStateChange(box, stateName, config) {
  const field = box._field;
  const value = typeof config.value === 'string' ? config.value : undefined;
  if (stateName === 'searching') field.setAttribute('aria-busy', 'true');
  else field.removeAttribute('aria-busy');
  switch (stateName) {
    case 'default':
      setValue(box, value ?? '');
      break;
    case 'filled':
    case 'searching':
      if (value !== undefined) setValue(box, value);
      break;
  }
}

/** Registry-level API; pass the .search-box element explicitly. Unknown names throw. */
export const searchFilterApi = {
  setState(box, stateName, config = {}) {
    if (!searchFilterStates.includes(stateName)) {
      throw new Error(
        `search-filter: unknown state "${stateName}" (supported: ${searchFilterStates.join(', ')})`,
      );
    }
    // named before the DOM changes: the input event a new value fires reads
    // it, and must not overwrite 'searching' with 'filled'
    box.dataset.stateName = stateName;
    box._stateConfig = config;
    triggerStateChange(box, stateName, config);
  },
  getState(box) {
    return { name: box.dataset.stateName || 'default', config: box._stateConfig ?? {} };
  },
};

df$.searchFilterApi = searchFilterApi;
df$.searchFilterStates = searchFilterStates;

/** Empties the field, keeps the caret in it, and says so. */
function clear(box) {
  searchFilterApi.setState(box, 'default', {});
  box._field.focus();
  box.dispatchEvent(new CustomEvent('search-clear', { bubbles: true }));
}

function init() {
  document.querySelectorAll('.search-box:not([data-init])').forEach((box) => {
    box.dataset.init = '';

    const field = box.querySelector(':scope > input');
    if (!field) return; // the input is authored, not generated — nothing to drive
    box._field = field;
    if (!field.getAttribute('enterkeyhint')) field.setAttribute('enterkeyhint', 'search');

    // typing (or a setValue) moves between empty and filled; a pending
    // 'searching' survives further typing - the page ends it
    field.addEventListener('input', () => {
      const name = box.dataset.stateName;
      if (field.value === '') {
        if (name !== 'default') searchFilterApi.setState(box, 'default', {});
      } else if (name !== 'searching' && name !== 'filled') {
        searchFilterApi.setState(box, 'filled', {});
      }
    });

    // Escape clears a filled box first; the default is prevented so an
    // enclosing dialog or popover closes only on the next Escape
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && field.value !== '') {
        e.preventDefault();
        e.stopPropagation();
        clear(box);
      }
    });

    box.querySelector(':scope > .search-box-clear')?.addEventListener('click', () => clear(box));

    // a click on the frame (icon, padding) lands in the field
    box.addEventListener('mousedown', (e) => {
      if (e.target !== field && !e.target.closest('button, a')) {
        e.preventDefault();
        field.focus();
      }
    });

    box.api = {
      setState: (stateName, config) => searchFilterApi.setState(box, stateName, config),
      getState: () => searchFilterApi.getState(box),
    };

    searchFilterApi.setState(box, field.value === '' ? 'default' : 'filled', {});
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
