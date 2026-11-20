// -- Tray ---------------------------------------------------------
// The notification area at the end of a taskbar: small icon buttons (each may
// open a popover - native popovertarget - and carry a badge), a clock the
// runtime keeps (Intl, in the tray's language, with seconds and the date when
// asked) and a "show desktop" button that asks the Window Manager of its
// taskbar to minimize every window (and bring them back).
// VERIFIED: (tray.e2e) the clock reads in the language of the nearest [lang] (German with seconds and the date,
// en-US plain) and ticks on the full second.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

/** An element by id, through df$ (null when none has it). */
const byId = (id: string | null | undefined): HTMLElement | null =>
  (id ? (dfDollar('#' + CSS.escape(id)).get(0) as HTMLElement | undefined) : undefined) ?? null;

/** What add() takes. */
interface TrayItemOptions {
  /** the item's id */
  id: string;
  /** a Lucide icon name */
  icon: string;
  /** its accessible name (and tooltip) */
  label: string;
  /** a number or a short word shown on the icon */
  badge?: string | number;
  /** the id of a popover it opens */
  popover?: string;
}

const trayStates = ['default'];

/** setState() configs per state. */
export interface TrayStateConfigs {
  /** The tray - how its clock reads. */
  default: {
    /** the clock shows seconds (data-seconds) */
    seconds?: boolean;
    /** the clock shows the date under the time (data-date) */
    date?: boolean;
  };
}

const resolve = (target) =>
  typeof target === 'string' ? (dfDollar('#' + CSS.escape(target)).get(0) ?? dfDollar(target).get(0)) : target;

function applyMarkup(tray, _stateName, config) {
  if (config.seconds !== undefined) dfDollar(tray).attr('data-seconds', config.seconds ? '' : null);
  if (config.date !== undefined) dfDollar(tray).attr('data-date', config.date ? '' : null);
}

/** Writes the clock's time (and date) in the tray's language. */
function tick(tray: HTMLElement) {
  const clock = dfDollar(tray).find('.tray-clock').get(0) as HTMLTimeElement | undefined;
  if (!clock) return;
  const lang = tray.closest('[lang]')?.getAttribute('lang') || undefined;
  const now = new Date();
  const time = new Intl.DateTimeFormat(lang, {
    hour: 'numeric',
    minute: '2-digit',
    second: tray.hasAttribute('data-seconds') ? '2-digit' : undefined,
  }).format(now);
  const date = tray.hasAttribute('data-date') ? new Intl.DateTimeFormat(lang, { dateStyle: 'short' }).format(now) : '';
  const text = date ? `${time}\n${date}` : time;
  if (clock.textContent !== text) clock.textContent = text;
  clock.dateTime = now.toISOString().slice(0, tray.hasAttribute('data-seconds') ? 19 : 16);
}

/** The one function that changes the tray for a state: what the clock shows, then the clock itself. */
function triggerStateChange(tray, stateName, config) {
  applyMarkup(tray, stateName, config);
  tick(tray);
}

/** Registry-level API; pass the .tray element explicitly. Unknown names throw. */
export const trayApi = componentState({
  component: 'tray',
  states: trayStates,
  apply: (tray, state) => triggerStateChange(tray, state.name, state.config),
  read: (tray) => ({
    name: 'default',
    config: { seconds: tray.hasAttribute('data-seconds'), date: tray.hasAttribute('data-date') },
  }),
  markup: (el, state) => applyMarkup(el, state.name, state.config),
});

df$.trayApi = trayApi;
df$.trayStates = trayStates;

/** The Window Manager of the taskbar around the tray. */
const managerOf = (tray: HTMLElement): HTMLElement | null => {
  const id = (tray.closest('.taskbar') as HTMLElement | null)?.dataset.taskbarFor;
  return id ? byId(id) : null;
};

/**
 * Adds an icon to the tray (or updates the one with that id).
 * @param target - the .tray element, its id or a selector
 * @param options - id, icon, label, badge and the popover it opens
 * @returns the item, null when the target matches none
 */
const add = (target: string | HTMLElement, options: TrayItemOptions): HTMLButtonElement | null => {
  const tray = resolve(target);
  if (!tray) return null;
  let b = dfDollar(tray)
    .find<HTMLButtonElement>(`.tray-item[data-id="${CSS.escape(options.id)}"]`)
    .get(0);
  if (!b) {
    b = document.createElement('button');
    b.type = 'button';
    b.className = 'tray-item';
    b.dataset.id = options.id;
    const clock = dfDollar(tray).find('.tray-clock').get(0);
    if (clock) clock.before(b);
    else tray.append(b);
  }
  b.setAttribute('aria-label', options.label);
  b.title = options.label;
  dfDollar(b).html(`<i data-lucide="${options.icon}"></i>`);
  if (options.popover) b.setAttribute('popovertarget', options.popover);
  badge(b, options.badge ?? '');
  globalThis.lucide?.createIcons?.();
  return b;
};

/**
 * Removes an icon.
 * @param target - the .tray element, its id or a selector
 * @param id - the item's id
 * @returns whether an item went
 */
const remove = (target: string | HTMLElement, id: string): boolean => {
  const tray = resolve(target);
  const b = tray
    ? dfDollar(tray)
        .find(`.tray-item[data-id="${CSS.escape(id)}"]`)
        .get(0)
    : undefined;
  b?.remove();
  return !!b;
};

/**
 * Sets an item's badge.
 * @param item - the .tray-item element (or its tray's item id with the tray: use add())
 * @param value - a number or a short word; '' or 0 removes it
 */
function badge(item: HTMLElement, value: string | number): void {
  if (value === '' || value === 0) item.removeAttribute('data-badge');
  else item.dataset.badge = String(value);
}

/** df$.shadcn.tray - add, remove and badge tray icons. */
export const trayActions = { add, remove, badge };
df$.tray = trayActions;

function init() {
  dfDollar('.tray:not([data-init])')
    .toArray()
    .forEach((tray) => {
      tray.dataset.init = '';
      tick(tray);
      // a tick at every full second keeps the minute exact without a busy timer
      const loop = () => {
        if (!tray.isConnected) return;
        tick(tray);
        setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
      };
      setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
      tray.addEventListener('click', (e) => {
        if ((e.target as Element).closest('.tray-show-desktop')) {
          const m = managerOf(tray);
          if (m) df$.windowManager?.showDesktop(m);
        }
      });
      // el.store + el.api (AGENTS.md "State through stores")
      bindComponent(tray, trayApi);
    });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
