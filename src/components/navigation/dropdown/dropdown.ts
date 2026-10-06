// -- Dropdown Menu --------------------------------------------
// Wires [data-dropdown-trigger] buttons to popover menus with full keyboard
// navigation and ARIA support, nested submenus (.dropdown-sub, any depth),
// checkbox / radio items that toggle by click and by keyboard, disabled
// items, plus the named-state API so agents/tests can drive open/closed by
// name (AGENTS.md "State API"). Menubar (menubar.js) reuses all of it.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, safeShowPopover, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** What dropdown:select carries. */
interface DropdownSelectDetail {
  /** the chosen menu item */
  item: HTMLElement;
  /** its data-value, else its trimmed text */
  value: string;
  /** a checkbox / radio item: whether it is checked now (absent for a plain item) */
  checked?: boolean;
}

const dropdownStates = ['default', 'open'];

/** setState() configs per state - the dropdown's states take none. */
export interface DropdownStateConfigs {
  /** The menu closed. */
  default: {};
  /** The menu open (the popover shown). */
  open: {};
}

const ITEM = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
const isDisabled = (el) => el.disabled || el.getAttribute('aria-disabled') === 'true';
/** The items that belong to THIS menu - not those of its nested submenus. */
const itemsOf = (menu) => Array.from(dfDollar(menu).find(ITEM).toArray()).filter((i) => i.closest('[role="menu"]') === menu && !isDisabled(i));
const subOf = (trigger) => dfDollar(trigger).closest('.dropdown-sub').children('.dropdown-sub-content').get(0) ?? null;
/** The outermost menu of a (sub)menu - the one its trigger opened. */
const rootOf = (menu) => {
  let m = menu;
  while (m?.parentElement?.closest('.dropdown-content[popover]')) m = m.parentElement.closest('.dropdown-content[popover]');
  return m;
};
const HOVER_OPEN = 120;
const HOVER_CLOSE = 220;

/**
 * The markup of a state: none - 'open' lives in the top layer
 * (:popover-open), not in an attribute, so every state renders the authored
 * markup. render() stays the State API's markup function all the same.
 */
function applyMarkup(_el, _stateName) {}

/**
 * UI side of setState: 'default' hides, 'open' shows. Open/close mechanics
 * stay native (Popover API); the toggle listener keeps aria-expanded and
 * highlight in sync either way.
 */
function triggerStateChange(menu, stateName, _config) {
  switch (stateName) {
    case 'default':
      try { menu.hidePopover(); } catch { /* already closed */ }
      break;
    case 'open':
      // deferred show (safeShowPopover): showPopover() mid-exit (right after
      // light dismiss) crashes the headless renderer; exclusion stays native.
      safeShowPopover(menu);
      break;
  }
}

/** Registry-level API; pass the menu element explicitly. Unknown names throw. */
export const dropdownApi = componentState({
  component: 'dropdown',
  states: dropdownStates,
  apply: (menu, state) => triggerStateChange(menu, state.name, state.config),
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.dropdownApi = dropdownApi;
df$.dropdownStates = dropdownStates;

let anchorSeq = 0;

function highlight(menu, item, focus = true) {
  itemsOf(menu).forEach((i) => { if (i !== item) i.removeAttribute('data-highlighted'); });
  if (item) {
    item.setAttribute('data-highlighted', '');
    if (focus) item.focus({ preventScroll: true });
  }
}

/** Checkbox / radio / plain item activation (click or Enter / Space). */
function activate(menu, item) {
  if (isDisabled(item)) return;
  const role = item.getAttribute('role');
  if (item.classList.contains('dropdown-sub-trigger')) { openSub(item, true); return; }
  if (role === 'menuitemcheckbox') {
    const checked = item.getAttribute('aria-checked') !== 'true';
    item.setAttribute('aria-checked', String(checked));
    // Fires when an item is chosen - the item, its value (data-value or its text) and, for a checkbox item, whether it is checked now.
    item.dispatchEvent(new CustomEvent<DropdownSelectDetail>('dropdown:select', { bubbles: true, detail: { item, value: item.dataset.value ?? item.textContent.trim(), checked } }));
    return; // stays open: toggling several options in one go
  }
  if (role === 'menuitemradio') {
    const group = item.closest('[role="group"]') ?? menu;
    dfDollar(group).find('[role="menuitemradio"]').toArray().forEach((r) => { if (r.closest('[role="menu"]') === menu) r.setAttribute('aria-checked', String(r === item)); });
    item.dispatchEvent(new CustomEvent<DropdownSelectDetail>('dropdown:select', { bubbles: true, detail: { item, value: item.dataset.value ?? item.textContent.trim(), checked: true } }));
    return;
  }
  item.dispatchEvent(new CustomEvent<DropdownSelectDetail>('dropdown:select', { bubbles: true, detail: { item, value: item.dataset.value ?? item.textContent.trim() } }));
  // a plain item acts and closes the whole menu tree
  try { rootOf(menu).hidePopover(); } catch { /* closed */ }
}

function openSub(trigger, focusFirst) {
  const sub = subOf(trigger);
  if (!sub || isDisabled(trigger)) return;
  clearTimeout(sub._closeTimer);
  sub._focusFirst = focusFirst;
  if (!sub.matches(':popover-open')) { try { sub.showPopover(); } catch { /* detached */ } }
  else if (focusFirst) highlight(sub, itemsOf(sub)[0]);
}
function closeSub(sub) {
  if (sub?.matches(':popover-open')) { try { sub.hidePopover(); } catch { /* closed */ } }
}

/** Behavior shared by a root menu and every submenu: pointer highlight,
 * hover-intent submenus, keyboard navigation, click activation. */
function wireMenu(menu) {
  if (menu._wired) return;
  menu._wired = true;
  const own = (e) => e.target instanceof Element && e.target.closest('[role="menu"]') === menu;
  const openSubs = () => Array.from(dfDollar(menu).find('.dropdown-sub-content').toArray()).filter((s) => s.parentElement.closest('[role="menu"]') === menu && s.matches(':popover-open'));

  menu.addEventListener('mousemove', (e) => {
    if (!own(e)) return;
    const item = e.target.closest(ITEM);
    if (!item || isDisabled(item)) return;
    if (!(item.hasAttribute('data-highlighted') && item === document.activeElement)) highlight(menu, item);
    // hover intent: open this item's submenu, close the others after a beat
    // (once per item entered - mousemove fires continuously)
    if (menu._hoverItem === item) return;
    menu._hoverItem = item;
    clearTimeout(menu._hoverTimer);
    const sub = item.classList.contains('dropdown-sub-trigger') ? subOf(item) : null;
    menu._hoverTimer = setTimeout(() => {
      openSubs().forEach((s) => { if (s !== sub) closeSub(s); });
      if (sub) openSub(item, false);
    }, sub ? HOVER_OPEN : HOVER_CLOSE);
  });
  menu.addEventListener('mouseleave', (e) => {
    clearTimeout(menu._hoverTimer);
    menu._hoverItem = null;
    // leaving toward an open submenu keeps its trigger highlighted
    const to = e.relatedTarget;
    if (to instanceof Element && to.closest('.dropdown-sub-content') && menu.contains(to)) return;
    itemsOf(menu).forEach((i) => { if (!(i.classList.contains('dropdown-sub-trigger') && subOf(i)?.matches(':popover-open'))) i.removeAttribute('data-highlighted'); });
  });
  // a press on a gap, a label or a disabled item keeps focus in the menu
  // (otherwise it falls to <body> and the arrow keys stop working)
  menu.addEventListener('mousedown', (e) => {
    if (!own(e)) return;
    const hit = e.target instanceof Element ? e.target.closest(`${ITEM}, input, textarea, select`) : null;
    if (!hit || isDisabled(hit)) e.preventDefault();
  });
  menu.addEventListener('click', (e) => {
    if (!own(e)) return;
    const item = e.target.closest(ITEM);
    if (!item) return;
    // no preventDefault: a link item (<a role="menuitem" href>) navigates
    activate(menu, item);
  });
  menu.addEventListener('keydown', (e) => {
    if (!own(e)) return;
    const items = itemsOf(menu);
    const current = items.indexOf(document.activeElement as HTMLElement);
    const isSub = menu.classList.contains('dropdown-sub-content');
    const rtl = getComputedStyle(menu).direction === 'rtl';
    const inward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const outward = rtl ? 'ArrowRight' : 'ArrowLeft';
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); highlight(menu, items[(current + 1) % items.length]); break;
      case 'ArrowUp': e.preventDefault(); highlight(menu, items[(current - 1 + items.length) % items.length]); break;
      case 'Home': e.preventDefault(); highlight(menu, items[0]); break;
      case 'End': e.preventDefault(); highlight(menu, items[items.length - 1]); break;
      case inward:
        if (document.activeElement?.classList.contains('dropdown-sub-trigger')) { e.preventDefault(); openSub(document.activeElement, true); }
        break;
      case outward:
        if (isSub) { e.preventDefault(); closeSub(menu); }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        if (isSub) closeSub(menu); else menu.hidePopover();
        break;
      case 'Tab':
        try { rootOf(menu).hidePopover(); } catch { /* closed */ }
        break;
      case 'Enter': case ' ':
        e.preventDefault();
        // a real click, so the item's own click handlers run too (the menu's
        // click listener then activates it)
        if (document.activeElement?.matches(ITEM) && !isDisabled(document.activeElement)) (document.activeElement as HTMLElement).click();
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const k = e.key.toLowerCase();
          const rest = items.slice(current + 1).concat(items.slice(0, current + 1));
          const match = rest.find((item) => item.textContent.trim().toLowerCase().startsWith(k));
          if (match) highlight(menu, match);
        }
    }
  });
}

/** A submenu: anchored to its trigger's side, aria-expanded in sync,
 * focus to the first item when opened by keyboard, back to the trigger when
 * closed from inside. */
function wireSub(wrap) {
  const trigger = dfDollar(wrap).find(':scope > .dropdown-sub-trigger').get(0);
  const sub = dfDollar(wrap).find(':scope > .dropdown-sub-content').get(0);
  if (!trigger || !sub || sub._subWired) return;
  sub._subWired = true;
  sub.dataset.init = '';
  if (!sub.hasAttribute('popover')) sub.setAttribute('popover', 'auto');
  if (!sub.id) sub.id = `dropdown-sub-${++anchorSeq}`;
  const anchor = `--dropdown-sub-${anchorSeq}-${sub.id}`;
  trigger.style.anchorName = anchor;
  sub.style.positionAnchor = anchor;
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', sub.id);
  wireMenu(sub);
  sub.addEventListener('toggle', (e) => {
    const open = e.newState === 'open';
    trigger.setAttribute('aria-expanded', String(open));
    if (open) {
      trigger.setAttribute('data-highlighted', '');
      if (sub._focusFirst) highlight(sub, itemsOf(sub)[0]);
    } else {
      itemsOf(sub).forEach((i) => { i.removeAttribute('data-highlighted'); });
      if (sub.contains(document.activeElement) || document.activeElement === document.body) trigger.focus({ preventScroll: true });
    }
  });
  // back inside the submenu: keep it open
  sub.addEventListener('mouseenter', () => {
    const parent = trigger.closest<HTMLElement>('[role="menu"]');
    if (parent) clearTimeout(parent._hoverTimer);
    highlight(parent, trigger, false);
  });
}

function init() {
  dfDollar('[data-dropdown-trigger]:not([data-init])').toArray().forEach((trigger) => {
    trigger.dataset.init = '';
    const menu = dfDollar('#' + CSS.escape(trigger.dataset.dropdownTrigger)).get(0);
    if (!menu) return;

    // CSS anchor positioning - unique name per trigger-menu pair
    const anchorId = `--dropdown-${menu.id}`;
    trigger.style.anchorName = anchorId;
    menu.style.positionAnchor = anchorId;
    if (!trigger.hasAttribute('aria-haspopup')) trigger.setAttribute('aria-haspopup', 'menu');
    if (!trigger.hasAttribute('aria-controls')) trigger.setAttribute('aria-controls', menu.id);

    // Native declarative toggle. A JS `togglePopover()` click handler is
    // buggy for popover="auto": light dismiss closes the menu *before* the
    // click handler runs, so togglePopover re-opens it and the menu can
    // never be closed by clicking the trigger again. The popovertarget
    // command is dismiss-aware - the trigger button must be a <button>
    // (documented API) for the native command to apply.
    if (!trigger.hasAttribute('popovertarget')) trigger.setAttribute('popovertarget', menu.id);
    menu._trigger = trigger;
    menu.addEventListener('toggle', (e) => {
      if (e.target !== menu) return;
      const open = e.newState === 'open';
      trigger.setAttribute('aria-expanded', String(open));
      if (open) {
        const first = itemsOf(menu)[0];
        if (first && !menu._noFocus) highlight(menu, first);
        menu._noFocus = false;
      } else {
        itemsOf(menu).forEach((i) => { i.removeAttribute('data-highlighted'); });
        // focus back to the trigger - unless it moved on to another trigger
        // whose menu is open now (a menubar switching menus). The browser's
        // own popover focus restore may have put it on the trigger that
        // was focused when this menu opened; that one is taken back.
        const active = document.activeElement;
        const other = active instanceof Element && active !== trigger ? active.closest('[data-dropdown-trigger]') : null;
        const otherOpen = other ? dfDollar('#' + CSS.escape(other.getAttribute('data-dropdown-trigger'))).get(0)?.matches(':popover-open') : false;
        if (!otherOpen && (!active || active === document.body || menu.contains(active) || other)) trigger.focus({ preventScroll: true });
      }
    });
    wireMenu(menu);
    dfDollar(menu).find('.dropdown-sub').toArray().forEach(wireSub);
  });

  // submenus added later (dynamic menus)
  dfDollar('.dropdown-sub').toArray().forEach(wireSub);

  // bind-scope the api per menu instance: `$('#menu').api.setState('open')`
  dfDollar('.dropdown-content[popover]:not(.dropdown-sub-content):not([data-init])').toArray().forEach((menu) => {
    menu.dataset.init = '';
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(menu, dropdownApi);
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
