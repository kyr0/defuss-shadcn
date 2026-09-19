// -- Sidebar --------------------------------------------------
// Toggle collapse, keyboard shortcut (Cmd+B), and mobile dialog,
// plus the named-state API bound per .app-sidebar (AGENTS.md "State API").
// The component's own data-state attribute ("expanded"/"collapsed") is the
// observable state; 'default' means the authored expanded view.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

const sidebarStates = ['default', 'collapsed'];

/**
 * UI side of setState: 'collapsed' docks the rail to icon-width (CSS key is
 * the documented data-state attribute); 'default' restores the authored
 * state (expanded unless the markup says otherwise).
 */
function triggerStateChange(sidebar, stateName, _config) {
  switch (stateName) {
    case 'default':
      sidebar.dataset.state = sidebar._defaultState ?? 'expanded';
      break;
    case 'collapsed':
      sidebar.dataset.state = 'collapsed';
      break;
  }
}

/** Registry-level API; pass the sidebar element explicitly. Unknown names throw. */
export const sidebarApi = {
  setState(sidebar, stateName, config = {}) {
    if (!sidebarStates.includes(stateName)) {
      throw new Error(`sidebar: unknown state "${stateName}" (supported: ${sidebarStates.join(', ')})`);
    }
    triggerStateChange(sidebar, stateName, config);
    // state lives on the ELEMENT, not the module (many sidebars per page)
    sidebar.dataset.stateName = stateName;
    sidebar._stateConfig = config;
  },
  getState(sidebar) {
    // reflect reality: trigger clicks and Cmd+B change data-state directly
    return {
      name: sidebar.dataset.state === 'collapsed' ? 'collapsed' : 'default',
      config: sidebar._stateConfig ?? {},
    };
  },
};

df$.sidebarApi = sidebarApi;
df$.sidebarStates = sidebarStates;

function init() {
document.querySelectorAll('.app-sidebar:not([data-init])').forEach((sidebar) => {
  sidebar.dataset.init = '';
  // snapshot the authored state + bind per sidebar: `$('#my-sidebar').api.setState('collapsed')`
  sidebar._defaultState = sidebar.dataset.state || 'expanded';
  sidebar.api = {
    setState: (stateName, config) => sidebarApi.setState(sidebar, stateName, config),
    getState: () => sidebarApi.getState(sidebar),
  };

  // -- Toggle button → collapse/expand -----------------------
  const triggerId = sidebar.id ? `[data-sidebar-trigger="${sidebar.id}"]` : '.sidebar-trigger';
  document.querySelectorAll(triggerId).forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const state = sidebar.dataset.state === 'collapsed' ? 'expanded' : 'collapsed';
      sidebar.dataset.state = state;
      // user interaction also moves the named state (keeps getState honest)
      sidebar.dataset.stateName = state === 'collapsed' ? 'collapsed' : 'default';
    });
  });

  // -- Auto-collapse wiring: correct state at first paint + on row resize --
  // observe the row (not the sidebar): the sidebar keeps its authored width
  // (flex-shrink: 0), so only the row's width reports available space.
  document.__sidebarAutoRo?.observe(sidebar.parentElement ?? sidebar);
  autoCollapseSidebar(sidebar);
});

// -- Mobile dialog triggers ----------------------------------
document.querySelectorAll('[data-sidebar-mobile]:not([data-init])').forEach((trigger) => {
  trigger.dataset.init = '';
  const dialog = document.getElementById(trigger.dataset.sidebarMobile);
  if (!dialog) return;

  trigger.addEventListener('click', () => {
    dialog.showModal();
  });

  // Close button inside the dialog
  dialog.querySelectorAll('.sidebar-mobile-close').forEach((btn) => {
    btn.addEventListener('click', () => { dialog.close(); });
  });
});
}

// -- Auto-collapse: too little room → dock to the rail ----------
// A full-width rail only stays useful with content beside it: once the
// sidebar's row (its parent) drops below AUTO_COLLAPSE_BELOW px the
// component docks itself to the icon rail, restoring above
// AUTO_COLLAPSE_ABOVE (hysteresis, so a scrollbar appearing never flickers
// it). An explicit choice always wins: trigger clicks, Cmd+B and
// api.setState all set dataset.stateName, and while that is set the auto
// behavior stays out. ponytail: threshold is px-based (authored default is
// 16rem); a custom --sidebar-width beyond ~24rem needs a larger constant.
const AUTO_COLLAPSE_BELOW = 24 * 16; // 384px
const AUTO_COLLAPSE_ABOVE = 28 * 16; // 448px

function autoCollapseSidebar(sidebar) {
  if (sidebar.dataset.stateName) return; // deliberate state — never fight it
  // available space = the sidebar's row (a .sidebar-layout or any container);
  // clientWidth of the parent, not the sidebar's own width (flex-shrink: 0
  // keeps the authored width and overflows instead of shrinking).
  const avail = (sidebar.parentElement ?? document.body).clientWidth || window.innerWidth;
  const collapsed = sidebar.dataset.state === 'collapsed';
  if (!collapsed && avail < AUTO_COLLAPSE_BELOW) sidebar.dataset.state = 'collapsed';
  else if (collapsed && avail >= AUTO_COLLAPSE_ABOVE) {
    sidebar.dataset.state = sidebar._defaultState ?? 'expanded';
  }
}

// One shared observer; each init() observes the sidebar's row, so container
// queries / layout resizes re-run the check without a window resize.
if (typeof ResizeObserver !== 'undefined' && !document.__sidebarAutoRo) {
  document.__sidebarAutoRo = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target.classList?.contains('app-sidebar')) autoCollapseSidebar(entry.target);
      entry.target.querySelectorAll?.('.app-sidebar').forEach(autoCollapseSidebar);
    }
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// -- Keyboard shortcut: Cmd+B / Ctrl+B ----------------------
if (!document.__sidebarKbInit) {
  document.__sidebarKbInit = true;
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      // Toggle the first sidebar found on the page
      const sidebar = document.querySelector('.app-sidebar');
      if (sidebar) {
        sidebar.dataset.state = sidebar.dataset.state === 'collapsed' ? 'expanded' : 'collapsed';
        // user decision — pins against the auto-collapse heuristic
        sidebar.dataset.stateName = sidebar.dataset.state === 'collapsed' ? 'collapsed' : 'default';
      }
    }
  });
}
