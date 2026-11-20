// -- Taskbar ------------------------------------------------------
// The bar along a desktop's edge: a Start Button, buttons of the page's own
// (launchers), one button per open window of the Window Manager it names
// (data-taskbar-for) and a Tray. The window buttons are the manager's model,
// rendered on every window-manager-change: pressed = the window in front, a
// click brings a window to the front or minimizes the one in front
// (df$.shadcn.windowManager.toggle). With a taskbar bound, the manager hides
// minimized windows - they live on their buttons.
// VERIFIED: (taskbar.e2e) a click on the front window's button minimizes it, on any other brings it to the front
// - the button asks the Window Manager (toggle), so the bar and the manager never disagree.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

/** An element by id, through df$ (null when none has it). */
const byId = (id: string | null | undefined): HTMLElement | null =>
  (id ? (dfDollar('#' + CSS.escape(id)).get(0) as HTMLElement | undefined) : undefined) ?? null;

/** Where the bar sits. */
type TaskbarPosition = 'bottom' | 'top' | 'left' | 'right';

const taskbarStates = ['default'];

/** setState() configs per state. */
export interface TaskbarStateConfigs {
  /** The bar - where it sits and how its buttons line up. */
  default: {
    /** the edge it sits on (data-position, default bottom) */
    position?: TaskbarPosition;
    /** the window buttons from the start, or centred with the Start Button (data-align, default start) */
    align?: 'start' | 'center';
  };
}

const POSITIONS = ['bottom', 'top', 'left', 'right'];

const managerOf = (bar: HTMLElement): HTMLElement | null => {
  const id = bar.dataset.taskbarFor;
  return id ? byId(id) : null;
};

/** The markup of a state: its position and alignment as data attributes. */
function applyMarkup(bar, _stateName, config) {
  if (config.position !== undefined)
    dfDollar(bar).attr('data-position', config.position === 'bottom' ? null : config.position);
  if (config.align !== undefined) dfDollar(bar).attr('data-align', config.align === 'start' ? null : config.align);
}

/** The one function that changes the bar for a state: its edge and its alignment. */
function triggerStateChange(bar, stateName, config) {
  if (config.position !== undefined && !POSITIONS.includes(config.position))
    throw new Error(`taskbar: no position ${config.position}`);
  applyMarkup(bar, stateName, config);
}

/** Registry-level API; pass the .taskbar element explicitly. Unknown names throw. */
export const taskbarApi = componentState({
  component: 'taskbar',
  states: taskbarStates,
  apply: (bar, state) => triggerStateChange(bar, state.name, state.config),
  read: (bar) => ({
    name: 'default',
    config: { position: bar.dataset.position || 'bottom', align: bar.dataset.align || 'start' },
  }),
  markup: (el, state) => applyMarkup(el, state.name, state.config),
});

df$.taskbarApi = taskbarApi;
df$.taskbarStates = taskbarStates;

/** One button per window: its icon, its title, pressed while it is in front. */
function render(bar: HTMLElement, windows) {
  const list = dfDollar(bar).find('.taskbar-windows').get(0) as HTMLElement | undefined;
  if (!list) return;
  const have = new Map(
    dfDollar(list)
      .find<HTMLButtonElement>(':scope > .taskbar-window')
      .toArray()
      .map((b) => [b.dataset.window, b]),
  );
  const keep = new Set<string>();
  for (const w of windows) {
    keep.add(w.id);
    let b = have.get(w.id);
    if (!b) {
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'taskbar-window';
      b.dataset.window = w.id;
      dfDollar(b).html(
        '<span class="taskbar-window-icon" aria-hidden="true"></span><span class="taskbar-window-title"></span>',
      );
    }
    list.append(b); // in the manager's order
    const icon = dfDollar(b).find('.taskbar-window-icon').get(0) as HTMLElement;
    // a Desktop glyph (it follows the look) or a Lucide icon
    const key = w.glyph ? `glyph:${w.glyph}` : w.icon;
    if (icon.dataset.icon !== key) {
      icon.dataset.icon = key;
      dfDollar(icon).html(
        w.glyph
          ? `<span class="desktop-glyph" data-glyph="${w.glyph}"></span>`
          : w.icon
            ? `<i data-lucide="${w.icon}"></i>`
            : '',
      );
    }
    const title = dfDollar(b).find('.taskbar-window-title').get(0) as HTMLElement;
    if (title.textContent !== w.title) title.textContent = w.title;
    b.title = w.title;
    b.setAttribute('aria-pressed', String(w.active && w.state !== 'minimized'));
    b.toggleAttribute('data-minimized', w.state === 'minimized');
  }
  for (const [id, b] of have) if (!keep.has(id)) b.remove();
  if (windows.some((w) => w.icon)) globalThis.lucide?.createIcons?.();
}

function bind(bar: HTMLElement) {
  const m = managerOf(bar);
  if (m) {
    m.setAttribute('data-taskbar', '');
    m.addEventListener('window-manager-change', (e) => render(bar, (e as CustomEvent).detail.windows));
    const model = df$.windowManager?.windows(m);
    if (model) render(bar, model);
  }
  bar.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('.taskbar-window') as HTMLElement | null;
    if (b?.dataset.window) df$.windowManager?.toggle(b.dataset.window);
  });
  // arrows move between the bar's buttons (one tab stop for the window list)
  bar.addEventListener('keydown', (e) => {
    const list = (e.target as Element).closest('.taskbar-windows');
    if (!list || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    const all = dfDollar(list).find<HTMLElement>('.taskbar-window').toArray();
    const at = all.indexOf(e.target as HTMLElement);
    const next =
      e.key === 'Home'
        ? all[0]
        : e.key === 'End'
          ? all.at(-1)
          : all[(at + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  });
}

/**
 * The Window Manager a taskbar shows.
 * @param target - the .taskbar element, its id or a selector
 * @returns its .window-manager, null when it names none
 */
const manager = (target: string | HTMLElement): HTMLElement | null => {
  const bar =
    typeof target === 'string'
      ? (byId(target) ?? (dfDollar(target).get(0) as HTMLElement | undefined) ?? null)
      : target;
  return bar ? managerOf(bar) : null;
};

/** df$.shadcn.taskbar - the bar's link to its desktop. */
export const taskbarActions = { manager };
df$.taskbar = taskbarActions;

function init() {
  dfDollar('.taskbar:not([data-init])')
    .toArray()
    .forEach((bar) => {
      bar.dataset.init = '';
      bind(bar);
      // el.store + el.api (AGENTS.md "State through stores")
      bindComponent(bar, taskbarApi);
    });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
