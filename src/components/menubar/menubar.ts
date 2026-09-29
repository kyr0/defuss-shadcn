/* -- Menubar component ------------------------------------------------ */
// A .menubar[role="menubar"] of .menubar-trigger buttons, each wired to a
// dropdown menu by dropdown.js (data-dropdown-trigger - submenus, checkbox
// and radio items included). This module adds the menubar pattern (WAI-ARIA
// APG): one tab stop for the whole bar (roving tabindex), Left / Right /
// Home / End between the triggers, Down / Up / Enter opening a menu, Left /
// Right inside an open menu moving to the neighbouring menu, and - while a
// menu is open - hovering another trigger switching to its menu. Needs
// dropdown.js (all.js carries both).

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, safeShowPopover } from '../../shared/state-api.js';

const df$ = defussGlobals();

/** default = every menu closed; open = one menu open ({ menu: id | index }). */
const menubarStates = ['default', 'open'];

const triggersOf = (bar) => Array.from(bar.querySelectorAll('.menubar-trigger')).filter((t) => t.closest('.menubar') === bar && !t.disabled && t.getAttribute('aria-disabled') !== 'true');
const menuOf = (trigger) => document.getElementById(trigger.dataset.dropdownTrigger || trigger.getAttribute('popovertarget') || '');
const openMenuOf = (bar) => triggersOf(bar).map(menuOf).find((m) => m?.matches(':popover-open')) ?? null;

function setRoving(bar, active) {
  triggersOf(bar).forEach((t) => t.setAttribute('tabindex', t === active ? '0' : '-1'));
}

/** Open a trigger's menu (closing the other - popover="auto" does that
 * natively); focus its first item unless `quiet` (hover switching). */
function openMenu(bar, trigger, quiet = false) {
  const menu = menuOf(trigger);
  if (!menu) return;
  setRoving(bar, trigger);
  if (menu.matches(':popover-open')) { if (!quiet) focusItem(menu); return; }
  menu._noFocus = quiet;
  if (quiet) trigger.focus({ preventScroll: true });
  safeShowPopover(menu);
}

/** Focus the first (or last) own item of an open menu. */
function focusItem(menu, last = false) {
  const own = Array.from(menu.querySelectorAll('[role^="menuitem"]')).filter((x) => x.closest('[role="menu"]') === menu && !(x as HTMLButtonElement).disabled && x.getAttribute('aria-disabled') !== 'true');
  own.forEach((x) => x.removeAttribute('data-highlighted'));
  const item = last ? own.at(-1) : own[0];
  item?.setAttribute('data-highlighted', '');
  (item as HTMLElement | undefined)?.focus({ preventScroll: true });
}

function triggerStateChange(bar, stateName, config) {
  switch (stateName) {
    case 'default': {
      const open = openMenuOf(bar);
      if (open) { try { open.hidePopover(); } catch { /* closed */ } }
      break;
    }
    case 'open': {
      const ts = triggersOf(bar);
      const t = typeof config.menu === 'number' ? ts[config.menu] : config.menu ? ts.find((x) => x.dataset.dropdownTrigger === config.menu) : ts[0];
      if (t) openMenu(bar, t);
      break;
    }
  }
}

/** Registry-level API; pass the .menubar explicitly. Unknown names throw. */
export const menubarApi = {
  setState(bar, stateName, config = {}) {
    if (!menubarStates.includes(stateName)) {
      throw new Error(`menubar: unknown state "${stateName}" (supported: ${menubarStates.join(', ')})`);
    }
    bar._stateConfig = config;
    bar.dataset.stateName = stateName;
    triggerStateChange(bar, stateName, config);
  },
  getState(bar) {
    const open = openMenuOf(bar);
    return { name: open ? 'open' : 'default', config: { ...bar._stateConfig, menu: open?.id ?? null } };
  },
};

df$.menubarApi = menubarApi;
df$.menubarStates = menubarStates;

function init() {
  document.querySelectorAll('.menubar:not([data-init])').forEach((bar) => {
    bar.dataset.init = '';
    if (!bar.hasAttribute('role')) bar.setAttribute('role', 'menubar');
    bar.api = {
      setState: (stateName, config) => menubarApi.setState(bar, stateName, config),
      getState: () => menubarApi.getState(bar),
    };
    const triggers = triggersOf(bar);
    triggers.forEach((t) => { if (!t.hasAttribute('role')) t.setAttribute('role', 'menuitem'); });
    setRoving(bar, triggers[0]);

    // keep the state name honest whatever opened / closed a menu
    triggers.forEach((t) => {
      menuOf(t)?.addEventListener('toggle', () => { bar.dataset.stateName = openMenuOf(bar) ? 'open' : 'default'; });
    });

    // hover switching while a menu is open
    bar.addEventListener('pointerover', (e) => {
      const t = e.target instanceof Element ? e.target.closest('.menubar-trigger') : null;
      if (!t || t.closest('.menubar') !== bar || !triggersOf(bar).includes(t)) return;
      const open = openMenuOf(bar);
      if (open && menuOf(t) !== open) openMenu(bar, t, true);
    });

    bar.addEventListener('keydown', (e) => {
      const ts = triggersOf(bar);
      const rtl = getComputedStyle(bar).direction === 'rtl';
      const next = rtl ? 'ArrowLeft' : 'ArrowRight';
      const prev = rtl ? 'ArrowRight' : 'ArrowLeft';
      const onTrigger = e.target instanceof Element && e.target.classList.contains('menubar-trigger');
      const openMenuEl = openMenuOf(bar);
      const i = onTrigger ? ts.indexOf(e.target as Element) : ts.findIndex((t) => menuOf(t) === openMenuEl);
      if (i < 0) return;
      const step = (d) => ts[(i + d + ts.length) % ts.length];

      if (onTrigger) {
        // with a menu open (hover switching left focus on its trigger), the
        // arrows switch the open menu; otherwise they just move focus
        const moveTo = (t) => { if (openMenuEl) openMenu(bar, t); else { setRoving(bar, t); t.focus(); } };
        switch (e.key) {
          case next: e.preventDefault(); moveTo(step(1)); break;
          case prev: e.preventDefault(); moveTo(step(-1)); break;
          case 'Home': e.preventDefault(); setRoving(bar, ts[0]); ts[0].focus(); break;
          case 'End': e.preventDefault(); setRoving(bar, ts[ts.length - 1]); ts[ts.length - 1].focus(); break;
          case 'ArrowDown': case 'Enter': case ' ':
            e.preventDefault(); openMenu(bar, ts[i]); break;
          case 'ArrowUp': {
            e.preventDefault();
            const menu = menuOf(ts[i]);
            openMenu(bar, ts[i]);
            // up opens with the LAST item highlighted (after the open toggle)
            if (menu) setTimeout(() => focusItem(menu, true), 20);
            break;
          }
        }
        return;
      }
      // inside an open menu: left / right that the dropdown did not use
      // (a submenu trigger opens on right, a submenu closes on left) move to
      // the neighbouring menu
      if (e.defaultPrevented) return;
      if (e.key === next) { e.preventDefault(); openMenu(bar, step(1)); }
      else if (e.key === prev) { e.preventDefault(); openMenu(bar, step(-1)); }
    });
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
