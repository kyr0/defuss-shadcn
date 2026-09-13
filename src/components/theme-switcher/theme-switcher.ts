// -- Theme Switcher --------------------------------------------
// Dropdown that switches the color theme by swapping ONE stylesheet:
// a <link id="theme-css"> pointing at a generated theme file
// (theme/<id>.css — same token shape as default-semantic-tokens.css).
// That is the entire mechanism: no JS token objects, no inline overrides —
// consumers ship theme files and this component loads/unloads them. Each
// theme file carries `:root` + `.dark` blocks, so dark-mode toggling needs
// no re-apply.

// Shared preamble (AGENTS.md "State API"); build.ts inlines it into the
// shipped .js, so this import never appears in dist/.
import { defussGlobals, safeShowPopover } from '../../shared/state-api.js';

const _defussShadcn = defussGlobals();

const themeSwitcherStates = ['default', 'open'];

const STORAGE_KEY = 'defuss-shadcn-color-theme';
const LINK_ID = 'theme-css';
const THEME_EVENT = 'defuss-theme-change';

/** Safe in private mode (storage can throw on write). */
function store(key?: string, value?: string) {
  try {
    if (key === undefined) return localStorage.getItem(STORAGE_KEY);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode — theme just won't persist */
  }
}

/**
 * Why: where theme files live is derived, not configured — the shipped
 * layout puts them one folder ABOVE the token file (dist/theme/<id>.css
 * beside dist/theme/utils/default-semantic-tokens.css), so they resolve as
 * `<tokens-dir>/../<id>.css` relative to the loaded token sheet.
 * `data-theme-base` on the .theme-switcher root overrides (explicit folder).
 */
function themeHref(root: HTMLElement, id: string): string {
  if (root.dataset.themeBase) return `${root.dataset.themeBase}/${id}.css`;
  const tokens = document.getElementById('tokens-css') ||
    document.querySelector('link[href*="default-semantic-tokens.css"]');
  // link.href (the property) is absolute → URL resolution is exact, incl.
  // the jsDelivr CDN URLs the docs mirror rewrites to
  if (tokens) return new URL(`../${id}.css`, (tokens as HTMLLinkElement).href).href;
  return `${id}.css`;
}

/** Apply a theme id by (re)loading its stylesheet. 'default' unloads it. */
function applyThemeId(root: HTMLElement, id: string) {
  let link = document.getElementById(LINK_ID);
  if (!id || id === 'default') {
    link?.remove();
    store(STORAGE_KEY, null);
    syncTrigger(root, 'default');
    document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { id: 'default' } }));
    return;
  }
  store(STORAGE_KEY, id);
  if (link && link.dataset.themeId === id) {
    syncTrigger(root, id); // already loaded — idempotent
    return;
  }
  link?.remove();
  link = document.createElement('link');
  link.id = LINK_ID;
  link.rel = 'stylesheet';
  link.dataset.themeId = id;
  link.href = themeHref(root, id);
  const tokens = document.getElementById('tokens-css') ||
    document.querySelector('link[href*="default-semantic-tokens.css"]');
  // insert right after the token sheet (later source order ⇒ the theme
  // overrides it); without a token sheet, append at the end of <head>
  if (tokens) tokens.insertAdjacentElement('afterend', link);
  else document.head.appendChild(link);
  syncTrigger(root, id);
  document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { id } }));
}

/** Reflect the active id in trigger dot/label + aria-checked across items. */
function syncTrigger(root: HTMLElement, id: string) {
  const trigger = root.querySelector<HTMLElement>('.theme-switcher-trigger');
  const items = Array.from(root.querySelectorAll<HTMLElement>('.theme-switcher-item'));
  const active = items.find((i) => i.dataset.themeId === id);
  items.forEach((i) => i.setAttribute('aria-checked', i === active ? 'true' : 'false'));
  if (!trigger) return;
  const dot = trigger.querySelector<HTMLElement>('.theme-switcher-dot');
  const label = trigger.querySelector<HTMLElement>('.theme-switcher-label');
  const first = active?.dataset.themeColors?.split(',')[0]?.trim();
  // 'default' (or unknown): no inline dot color — the CSS default IS --primary
  if (dot) dot.style.background = first || '';
  if (label && (active || id === 'default')) label.textContent = active?.dataset.themeLabel || 'Default';
  root.dataset.themeId = id;
}

/**
 * UI side of setState: 'default' hides the menu, 'open' shows it.
 * Open/close mechanics stay native (Popover API).
 */
function triggerStateChange(menu: HTMLElement, stateName: string, _config?: Record<string, unknown>) {
  switch (stateName) {
    case 'default':
      try { menu.hidePopover(); } catch { /* already closed */ }
      break;
    case 'open':
      // deferred show (safeShowPopover): showPopover() mid-exit crashes the
      // headless renderer (same guard as dropdown)
      safeShowPopover(menu);
      break;
  }
}

/** Registry-level API; pass the menu element explicitly. Unknown names throw. */
export const themeSwitcherApi = {
  setState(menu: HTMLElement, stateName: string, config: Record<string, unknown> = {}) {
    if (!themeSwitcherStates.includes(stateName)) {
      throw new Error(`theme-switcher: unknown state "${stateName}" (supported: ${themeSwitcherStates.join(', ')})`);
    }
    triggerStateChange(menu, stateName, config);
    // state lives on the ELEMENT, not the module (multiple switchers per page)
    menu.dataset.stateName = stateName;
    menu._stateConfig = config;
  },
  getState(menu: HTMLElement) {
    return { name: menu.dataset.stateName || 'default', config: menu._stateConfig ?? {} };
  },
  /** Apply a theme on the switcher owning `menu` (link swap, see above). */
  select(menu: HTMLElement, id: string) {
    const root = menu.closest('.theme-switcher') as HTMLElement | null;
    if (!root) throw new Error('theme-switcher: menu is not inside a .theme-switcher root');
    applyThemeId(root, id);
  },
};

_defussShadcn.themeSwitcherApi = themeSwitcherApi;
_defussShadcn.themeSwitcherStates = themeSwitcherStates;

function init() {
  document.querySelectorAll<HTMLElement>('.theme-switcher-menu:not([data-init])').forEach((menu) => {
    menu.dataset.init = '';
    const root = menu.closest('.theme-switcher') as HTMLElement | null;
    // trigger = inside the root, or the declarative popovertarget owner
    const trigger = (root?.querySelector('.theme-switcher-trigger') ??
      (menu.id && document.querySelector(`[popovertarget="${menu.id}"]`))) as HTMLElement | null;
    const getItems = () => Array.from(menu.querySelectorAll<HTMLElement>('.theme-switcher-item'));

    // CSS anchor positioning — trigger names itself, menu follows
    if (trigger) {
      const anchorId = `--theme-switcher-${menu.id || 'menu'}`;
      trigger.style.anchorName = anchorId;
      menu.style.positionAnchor = anchorId;
    }

    // aria-expanded rides the popover's own toggle event
    menu.addEventListener('toggle', () => {
      trigger?.setAttribute('aria-expanded', menu.matches(':popover-open') ? 'true' : 'false');
      if (menu.matches(':popover-open')) {
        const first = getItems()[0];
        first?.focus();
        // the native popover show-command re-focuses the anchor AFTER this
        // handler; one rAF re-focus if it (or a sibling menu's light-dismiss
        // restore) won the race — guarded so a quick Tab-away isn't stolen
        if (first)
          requestAnimationFrame(() => {
            if (menu.matches(':popover-open') && document.activeElement === trigger) first.focus();
          });
      }
    });

    // dots visualized from data-theme-colors (keeps authored markup lean)
    getItems().forEach((item) => {
      const holder = item.querySelector('.theme-switcher-dots');
      if (holder && !holder.childElementCount) {
        for (const c of (item.dataset.themeColors || '').split(',').slice(0, 5)) {
          if (!c.trim()) continue;
          const s = document.createElement('span');
          s.style.background = c.trim();
          holder.appendChild(s);
        }
      }
    });

    // selection: click / Enter (buttons dispatch click natively for both)
    menu.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.theme-switcher-item');
      if (!item || !root) return;
      applyThemeId(root, item.dataset.themeId || 'default');
      menu.hidePopover();
      trigger?.focus();
    });

    // WAI-ARIA menu pattern: roving arrows, Home/End, Escape is native
    menu.addEventListener('keydown', (e) => {
      const items = getItems();
      const idx = items.indexOf(document.activeElement as HTMLElement);
      let next = -1;
      if (e.key === 'ArrowDown') next = idx < 0 ? 0 : (idx + 1) % items.length;
      else if (e.key === 'ArrowUp') next = idx < 0 ? 0 : (idx - 1 + items.length) % items.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = items.length - 1;
      if (next >= 0) {
        e.preventDefault();
        items[next].focus();
      }
    });

    // per-instance State API binding (state on the element, AGENTS.md)
    menu.api = {
      setState: (stateName, config) => themeSwitcherApi.setState(menu, stateName, config),
      getState: () => themeSwitcherApi.getState(menu),
    };

    // reflect the theme already active on the page (preloaded link or storage)
    if (root) {
      const initial =
        document.getElementById(LINK_ID)?.dataset.themeId || store() || 'default';
      if (initial !== 'default' || document.getElementById(LINK_ID)) syncTrigger(root, initial);
    }
  });
}

// one page-wide listener: any switcher (or the doc-site theme grid) may move
// the active theme — keep every switcher's trigger honest
document.addEventListener(THEME_EVENT, (e) => {
  const id = (e as CustomEvent<{ id?: string }>).detail?.id || 'default';
  document.querySelectorAll<HTMLElement>('.theme-switcher').forEach((root) => syncTrigger(root, id));
});

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
