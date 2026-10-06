// -- Tabs -----------------------------------------------------
// ARIA-compliant keyboard navigation for [role="tablist"] elements, plus the
// named-state API (AGENTS.md "State API"), bound at two levels:
//   - per tab trigger: default / active / disabled, config { label, icon }
//   - per tablist:     default / active / disabled, config { index }
// so agents/tests can pick the selected tab, disable a tab, or rename and
// re-icon it by name - without knowing the markup.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

// per tab:     'default' = enabled, not picked (the authored selection stands),
//              'active' = selected, 'disabled' = not selectable
// per tablist: 'default' = everything as authored (selection, disabled flags,
//              labels, icons), 'active' = the tab at config.index selected,
//              'disabled' = every tab disabled
const tabsStates = ['default', 'active', 'disabled'];

/** setState() configs per state - bound on the tablist AND on every tab trigger; the config merges into the stored one. */
export interface TabsStateConfigs {
  /** Tablist: everything as authored (selection, disabled flags, labels, icons). A tab: enabled, not picked. */
  default: {
    /** a tab: its label text */
    label?: string;
    /** a tab: its icon (a Lucide name) */
    icon?: string;
    /** reported by getState() on the tablist: the selected tab's index */
    index?: number;
    /** reported by getState() on the tablist: the selected tab's id */
    id?: string;
  };
  /** Tablist: the tab at index (or with id) selected. A tab: selected, its panel shown (no-op while disabled). */
  active: {
    /** the tablist: the tab to select, 0-based */
    index?: number;
    /** the tablist: the tab to select, by id (when index is not given) */
    id?: string;
    /** a tab: its label text */
    label?: string;
    /** a tab: its icon (a Lucide name) */
    icon?: string;
  };
  /** Tablist: every tab disabled. A tab: not selectable, skipped by the arrow keys (a selected one hands the selection on). */
  disabled: {
    /** a tab: its label text */
    label?: string;
    /** a tab: its icon (a Lucide name) */
    icon?: string;
  };
}

// -- label + icon (content state) ---------------------------------------------
// The icon is the trigger's leading svg / img / <i data-lucide> / .tab-icon;
// the label is its .tab-label, else its own text nodes.
const ICON = ':scope > :is(svg, img, i, .tab-icon)';
const LUCIDE_NAME = /^[a-z][a-z0-9-]*$/;

const iconOf = (tab) => {
  const icon = dfDollar(tab).find(ICON).get(0);
  if (!icon) return '';
  return icon.getAttribute('data-lucide') ?? icon.textContent.trim();
};

const labelOf = (tab) => {
  const label = dfDollar(tab).find(':scope > .tab-label').get(0);
  if (label) return label.textContent.trim();
  return Array.from(tab.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join('')
    .trim();
};

const setLabel = (tab, text) => {
  const label = dfDollar(tab).find(':scope > .tab-label').get(0);
  if (label) { label.textContent = text; return; }
  Array.from(tab.childNodes).forEach((n) => { if (n.nodeType === Node.TEXT_NODE) n.remove(); });
  tab.append(document.createTextNode(text));
};

/** A lucide name ("inbox") mounts <i data-lucide> for lucide to render; anything
 * else (an emoji, a glyph) becomes a <span class="tab-icon">; '' removes it. */
const setIcon = (tab, icon) => {
  dfDollar(tab).find(ICON).get(0)?.remove();
  if (!icon) return;
  const el = document.createElement(LUCIDE_NAME.test(icon) ? 'i' : 'span');
  el.className = 'tab-icon';
  el.setAttribute('aria-hidden', 'true');
  if (el.tagName === 'I') el.setAttribute('data-lucide', icon);
  else el.textContent = icon;
  tab.prepend(el);
  if (el.tagName === 'I') globalThis.lucide?.createIcons?.();
};

// only what differs is written: setState(getState()) changes nothing (setLabel
// rewrites the text node - the authored whitespace would be lost)
const applyContent = (tab, config) => {
  if (typeof config.label === 'string' && config.label !== labelOf(tab)) setLabel(tab, config.label);
  if (typeof config.icon === 'string' && config.icon !== iconOf(tab)) setIcon(tab, config.icon);
};

// -- selection ----------------------------------------------------------------
const triggersOf = (el) => {
  const list = el.getAttribute('role') === 'tablist' ? el : el.closest('[role="tablist"]');
  return Array.from(dfDollar(list).find('[role="tab"]').toArray());
};

/** Select one tab of a group and reveal its panel (single-selection model). */
const activateTab = (tab, triggers) => {
  triggers.forEach((t) => {
    t.setAttribute('aria-selected', 'false');
    t.setAttribute('tabindex', '-1');
    t.dataset.stateName = t.disabled ? 'disabled' : 'default';
    const panel = dfDollar('#' + CSS.escape(t.getAttribute('aria-controls'))).get(0);
    if (panel) panel.hidden = true;
  });
  tab.setAttribute('aria-selected', 'true');
  tab.removeAttribute('tabindex');
  tab.dataset.stateName = 'active';
  const panel = dfDollar('#' + CSS.escape(tab.getAttribute('aria-controls'))).get(0);
  if (panel) panel.hidden = false;
};

/** The next enabled tab after `from` (wrapping), or null. */
const nextEnabled = (from, triggers) => {
  const i = triggers.indexOf(from);
  for (let k = 1; k <= triggers.length; k++) {
    const c = triggers[(i + k) % triggers.length];
    if (!c.disabled && c !== from) return c;
  }
  return null;
};

const tabName = (tab) =>
  tab.disabled ? 'disabled' : tab.getAttribute('aria-selected') === 'true' ? 'active' : 'default';

/** Restore one tab to its init snapshot (disabled flag, label, icon). */
const restoreTab = (tab) => {
  tab.disabled = tab._authored.disabled;
  if (labelOf(tab) !== tab._authored.label) setLabel(tab, tab._authored.label);
  if (iconOf(tab) !== tab._authored.icon) setIcon(tab, tab._authored.icon);
  tab.dataset.stateName = tabName(tab);
};

const authoredTab = (triggers) => triggers.find((t) => t._authored.selected) || triggers.find((t) => !t.disabled);

/**
 * UI side of setState. `el` is a tab trigger or a tablist. Re-entering the
 * CURRENT state with a config applies just the config (rename / re-icon a
 * tab without touching the selection); a bare setState(name) always runs the
 * transition, so setState('default') is a full restore.
 */
function triggerStateChange(el, stateName, config) {
  const triggers = triggersOf(el);
  const isList = el.getAttribute('role') === 'tablist';
  const reenter = Object.keys(config).length > 0 && tabsApi.getState(el).name === stateName;

  if (isList) {
    if (!reenter) {
      switch (stateName) {
        case 'default': {
          triggers.forEach(restoreTab);
          const tab = authoredTab(triggers);
          if (tab) activateTab(tab, triggers);
          break;
        }
        case 'active':
          triggers.forEach((t) => { if (t.disabled && !t._authored.disabled) t.disabled = false; });
          break;
        case 'disabled':
          triggers.forEach((t) => { t.disabled = true; t.dataset.stateName = 'disabled'; });
          break;
      }
    }
    // config.index (or config.id) picks the selected tab
    const pick = typeof config.index === 'number' ? triggers[config.index]
      : typeof config.id === 'string' ? triggers.find((t) => t.id === config.id) : null;
    if (pick && !pick.disabled) activateTab(pick, triggers);
    return;
  }

  const tab = el;
  if (!reenter) {
    switch (stateName) {
      case 'default': {
        // enabled again; label + icon stay (a rename survives un-disabling) -
        // the tablist's 'default' is the full as-authored restore
        const wasSelected = tab.getAttribute('aria-selected') === 'true';
        tab.disabled = false;
        if (tab._authored.selected) activateTab(tab, triggers);
        else if (wasSelected) {
          const other = authoredTab(triggers.filter((t) => t !== tab)) || nextEnabled(tab, triggers);
          if (other && other !== tab) activateTab(other, triggers);
          else tab.setAttribute('aria-selected', 'false');
        }
        tab.dataset.stateName = tabName(tab);
        break;
      }
      case 'active':
        if (!tab.disabled) activateTab(tab, triggers);
        break;
      case 'disabled': {
        const wasSelected = tab.getAttribute('aria-selected') === 'true';
        tab.disabled = true;
        tab.dataset.stateName = 'disabled';
        // a disabled tab cannot stay selected: hand the selection on
        if (wasSelected) {
          const other = nextEnabled(tab, triggers);
          if (other) activateTab(other, triggers);
          tab.dataset.stateName = 'disabled';
        }
        break;
      }
    }
  }
  applyContent(tab, config);
}

// -- render(): the markup of a state, on a detached copy of the authored markup
/** activateTab()'s markup on the triggers (the panels live outside them). */
const selectMarkup = (tab, triggers) => {
  triggers.forEach((t) => dfDollar(t).attr('aria-selected', 'false').attr('tabindex', '-1'));
  dfDollar(tab).attr('aria-selected', 'true').attr('tabindex', null);
};
const selectedOf = (t) => dfDollar(t).attr('aria-selected') === 'true';
const disabledOf = (t) => dfDollar(t).attr('disabled') != null;

/** A tablist's state, as triggerStateChange writes it - the copy IS the
 *  authored markup, so 'default' only re-selects the authored tab. */
function listMarkup(list, stateName, config) {
  const triggers = dfDollar(list).find('[role="tab"]').toArray();
  if (stateName === 'default') {
    const tab = triggers.find(selectedOf) || triggers.find((t) => !disabledOf(t));
    if (tab) selectMarkup(tab, triggers);
  } else if (stateName === 'disabled') triggers.forEach((t) => dfDollar(t).attr('disabled', ''));
  const pick = typeof config?.index === 'number' ? triggers[config.index]
    : typeof config?.id === 'string' ? triggers.find((t) => t.id === config.id) : null;
  if (pick && !disabledOf(pick)) selectMarkup(pick, triggers);
}

/** One trigger's state: its disabled flag and its content. The selection is
 *  the GROUP's (a disabled tab hands it to a sibling, if one is enabled) -
 *  the tablist's render() carries it. */
function tabMarkup(tab, stateName, config) {
  if (stateName === 'active') dfDollar(tab).attr('disabled', null).attr('aria-selected', 'true').attr('tabindex', null);
  else dfDollar(tab).attr('disabled', stateName === 'disabled' ? '' : null);
  applyContent(tab, config ?? {});
}

/** Registry-level API; pass a tab trigger or a tablist explicitly. Unknown names throw. */
export const tabsApi = componentState({
  component: 'tabs',
  states: tabsStates,
  // the config merges into the stored one, but the DOM work takes only what
  // this call passed (a re-entered state with no config restores)
  apply: (el, state, _previous, incoming) => triggerStateChange(el, state.name, incoming),
  read: (el, state) => {
    // reflect reality: clicks/keys change aria-selected without setState()
    if (el.getAttribute('role') === 'tablist') {
      const triggers = triggersOf(el);
      const selected = triggers.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const authored = triggers.findIndex((t) => t._authored?.selected);
      const name = triggers.every((t) => t.disabled) ? 'disabled'
        : selected === authored || (authored < 0 && selected <= 0) ? 'default' : 'active';
      return { name, config: { ...state.config, index: selected, id: triggers[selected]?.id ?? '' } };
    }
    return {
      name: tabName(el),
      config: { ...state.config, label: labelOf(el), icon: iconOf(el) },
    };
  },
  markup: (el, state) => (el.getAttribute('role') === 'tablist' ? listMarkup : tabMarkup)(el, state.name, state.config),
  mergeConfig: true,
});

df$.tabsApi = tabsApi;
df$.tabsStates = tabsStates;

function init() {
// only tablists built from .tab-trigger are this component's - another
// component's tablist stays unclaimed. VERIFIED: (section-bundles.e2e, Papers)
// stamping every tablist marked BibTeX's format tabs data-init
dfDollar('[role="tablist"]:not([data-init]):has(.tab-trigger)').toArray().forEach((tablist) => {
    tablist.dataset.init = '';
    const triggers = Array.from(dfDollar(tablist).find('[role="tab"]').toArray());
    // remember the authored tab so setState('default') restores it
    triggers.forEach((t) => {
      t._authored = {
        selected: t.getAttribute('aria-selected') === 'true',
        disabled: t.disabled,
        label: labelOf(t),
        icon: iconOf(t),
      };
      // el.store + el.api (AGENTS.md "State through stores")
      bindComponent(t, tabsApi);
    });
    // …and per tablist: `$('#my-tabs').api.setState('active', { index: 2 })`
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(tablist, tabsApi);
    // tabs on the left / right side of the panel are a vertical tablist:
    // the ARIA orientation (and with it Up/Down keys) follows data-side
    const side = tablist.closest('.tabs')?.getAttribute('data-side');
    if ((side === 'left' || side === 'right') && !tablist.hasAttribute('aria-orientation')) {
      tablist.setAttribute('aria-orientation', 'vertical');
    }
    // read per key press: the side (and so the orientation) can change after init
    const vertical = () => {
      const now = tablist.closest('.tabs')?.getAttribute('data-side');
      if (now === 'left' || now === 'right') return true;
      if (now === 'top' || now === 'bottom') return false;
      return tablist.getAttribute('aria-orientation') === 'vertical';
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => { activateTab(trigger, triggers); });
      trigger.addEventListener('keydown', (e) => {
        const current = triggers.indexOf(trigger);
        let next;
        const forward = vertical() ? 'ArrowDown' : 'ArrowRight';
        const backward = vertical() ? 'ArrowUp' : 'ArrowLeft';
        switch (e.key) {
          case forward:
            e.preventDefault();
            for (let i = 1; i <= triggers.length; i++) {
              const c = triggers[(current + i) % triggers.length];
              if (!c.disabled) { next = c; break; }
            }
            break;
          case backward:
            e.preventDefault();
            for (let i = 1; i <= triggers.length; i++) {
              const c = triggers[(current - i + triggers.length) % triggers.length];
              if (!c.disabled) { next = c; break; }
            }
            break;
          case 'Home':
            e.preventDefault();
            next = triggers.find((t) => !t.disabled);
            break;
          case 'End':
            e.preventDefault();
            next = triggers.slice().reverse().find((t) => !t.disabled);
            break;
        }
        if (next && !next.disabled) {
          activateTab(next, triggers);
          next.focus();
        }
      });
    });
});}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
