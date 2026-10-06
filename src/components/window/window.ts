// -- Window -----------------------------------------------------
// A desktop-style window on a non-modal <dialog>: the browser owns open /
// close (the × is a <form method="dialog"> submit, so it works without
// script) and the close event; this runtime adds what it cannot do - moving
// the window by its title bar (pointer capture, arrow keys), raising the
// clicked window to the front, maximize / minimize - plus the named-state
// API (AGENTS.md "State API") and the imperative df$.shadcn.win.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** A window's place inside its desktop, px. */
interface WindowPosition {
  /** from the desktop's left edge */
  x: number;
  /** from the desktop's top edge */
  y: number;
}

/** What create() takes - the shape the skill documents. */
interface WindowCreateOptions {
  /** the title bar text (default 'Untitled') */
  title?: string;
  /** a Lucide icon name for the title bar */
  icon?: string;
  /** the body: a node, or text */
  content?: Node | string;
  /** the body as markup (used when content is not a node) */
  html?: string;
  /** a status bar line */
  statusbar?: string;
  /** the window's id */
  id?: string;
  /** left edge: px, or a CSS length (default: cascaded from the windows before it) */
  x?: number | string;
  /** top edge: px, or a CSS length */
  y?: number | string;
  /** width: px, or a CSS length */
  width?: number | string;
  /** height: px, or a CSS length */
  height?: number | string;
  /** the look of the title bar */
  chrome?: 'windows' | 'mac' | 'linux' | 'retro';
  /** the native resize handle (default true) */
  resizable?: boolean;
  /** the desktop to open in: element, id or selector (default: the .window-desktop, else the body) */
  parent?: HTMLElement | string;
  /** open in front, active (default true) */
  focus?: boolean;
  /** a body without padding (an app inside) */
  flush?: boolean;
}

/** What window-focus carries. */
interface WindowFocusDetail {
  /** the title of the window now in front */
  title: string;
}

const windowStates = ['default', 'maximized', 'minimized', 'closed'];

/** setState() configs per state. */
export interface WindowStateConfigs {
  /** Open at its normal size (opens a closed window). */
  default: {
    /** move it: the left edge, px inside its desktop (with y) */
    x?: number;
    /** move it: the top edge, px inside its desktop (with x) */
    y?: number;
  };
  /** Fills the desktop. */
  maximized: {
    /** reported by getState() until it closes: the left edge set last, px */
    x?: number;
    /** reported by getState() until it closes: the top edge set last, px */
    y?: number;
  };
  /** Rolled up to its title bar. */
  minimized: {
    /** reported by getState() until it closes: the left edge set last, px */
    x?: number;
    /** reported by getState() until it closes: the top edge set last, px */
    y?: number;
  };
  /** Closed - also after the close button or close(); it reopens at its normal size. */
  closed: {};
}

/** Stacking order is shared by every window on the page - a counter, not state. */
let topZ = 10;

/** How much of a window must stay inside its desktop, so it can be grabbed back. */
const KEEP = 48;

const resolve = (target) =>
  typeof target === 'string'
    ? dfDollar('#' + CSS.escape(target)).get(0) ?? dfDollar(target).get(0)
    : target;

const titleOf = (w) => dfDollar(w).find('.window-title').get(0)?.textContent?.trim() ?? '';

/** The window's position inside its desktop, in px. */
const posOf = (w): WindowPosition => ({ x: w.offsetLeft, y: w.offsetTop });

/**
 * Moves a window, keeping it reachable: at least KEEP px of GRABBABLE title
 * bar stay inside the desktop - the controls don't count, so a window pushed
 * to an edge never shows only its buttons.
 */
function moveTo(w, x, y) {
  const parent = w.offsetParent;
  const bar = dfDollar(w).find('.window-titlebar').get(0);
  if (parent) {
    const ctl = dfDollar(w).find('.window-controls').get(0)?.offsetWidth ?? 0;
    const maxX = parent.clientWidth - KEEP - ctl;
    const minX = KEEP + ctl - w.offsetWidth;
    const maxY = parent.clientHeight - (bar?.offsetHeight ?? KEEP);
    x = Math.min(Math.max(x, minX), maxX);
    y = Math.min(Math.max(y, 0), Math.max(maxY, 0));
  }
  w.style.setProperty('--window-x', `${Math.round(x)}px`);
  w.style.setProperty('--window-y', `${Math.round(y)}px`);
  return { x: Math.round(x), y: Math.round(y) };
}

/** Raises a window above every other and marks it the active one. */
function raise(w) {
  if (!w.open) return;
  if (w.hasAttribute('data-active') && Number(w.style.zIndex) === topZ) return;
  topZ += 1;
  w.style.zIndex = String(topZ);
  dfDollar('.window[data-active]').toArray().forEach((o) => { if (o !== w) o.removeAttribute('data-active'); });
  w.setAttribute('data-active', '');
  // Fires when a window comes to the front - its title.
  w.dispatchEvent(new CustomEvent<WindowFocusDetail>('window-focus', { bubbles: true, detail: { title: titleOf(w) } }));
}

/**
 * show() runs the dialog focusing steps - it moves focus into the window
 * (onto the focusable title bar), which paints a focus ring on a window the
 * user never touched and pulls focus away from whatever opened it. Opening
 * leaves focus where it was; pressing into the window focuses as usual.
 */
function showQuietly(w) {
  const prev = document.activeElement;
  w.show();
  if (prev && prev !== document.body && prev.isConnected && prev.focus) prev.focus({ preventScroll: true });
  else if (w.contains(document.activeElement)) document.activeElement.blur();
}

/** Hands "active" to the front-most open window left (after one closed). */
function activateTopmost() {
  const open = Array.from(dfDollar('.window[open]').toArray());
  if (!open.length) return;
  const top = open.reduce((a, b) => (Number(b.style.zIndex || 0) > Number(a.style.zIndex || 0) ? b : a));
  raise(top);
}

/** Maximize / minimize drop an inline size (from a native resize) and put it back after. */
function stashSize(w) {
  if (w._stash) return;
  w._stash = { width: w.style.width, height: w.style.height };
  w.style.width = '';
  w.style.height = '';
}
function restoreSize(w) {
  if (!w._stash) return;
  w.style.width = w._stash.width;
  w.style.height = w._stash.height;
  w._stash = null;
}

/**
 * The markup of a state, for render(): the attributes a state writes, applied
 * to a detached copy of the authored markup ('default' IS the authored
 * markup). The live element gets the same markup from triggerStateChange -
 * the e2e render round trip proves they agree.
 */
function applyMarkup(el, stateName) {
  const open = stateName !== 'closed';
  dfDollar(el).attr('open', open ? '' : null);
  dfDollar(el).attr('data-maximized', stateName === 'maximized' ? '' : null);
  dfDollar(el).attr('data-minimized', stateName === 'minimized' ? '' : null);
  dfDollar(el).find('.window-maximize').attr('aria-label', stateName === 'maximized' ? 'Restore' : 'Maximize');
  dfDollar(el).find('.window-minimize').attr('aria-label', stateName === 'minimized' ? 'Restore' : 'Minimize');
}

/**
 * UI side of setState. 'default' = open, normal size (opens a closed
 * window; `{ x, y }` moves it); 'maximized' fills the desktop; 'minimized'
 * rolls it up to its title bar; 'closed' closes the dialog.
 */
function triggerStateChange(w, stateName, config) {
  const maxBtn = dfDollar(w).find('.window-maximize').get(0);
  if (stateName !== 'closed' && !w.open) showQuietly(w);
  switch (stateName) {
    case 'default':
      w.removeAttribute('data-maximized');
      w.removeAttribute('data-minimized');
      restoreSize(w);
      if (config.x !== undefined && config.y !== undefined) moveTo(w, Number(config.x), Number(config.y));
      raise(w);
      break;
    case 'maximized':
      w.removeAttribute('data-minimized');
      stashSize(w);
      w.setAttribute('data-maximized', '');
      raise(w);
      break;
    case 'minimized':
      w.removeAttribute('data-maximized');
      stashSize(w);
      w.setAttribute('data-minimized', '');
      break;
    case 'closed':
      if (w.open) w.close(); // the close event hands "active" on
      // closed means closed: the size modes are not kept for the next open
      w.removeAttribute('data-maximized');
      w.removeAttribute('data-minimized');
      break;
  }
  if (maxBtn) maxBtn.setAttribute('aria-label', stateName === 'maximized' ? 'Restore' : 'Maximize');
  dfDollar(w).find('.window-minimize').get(0)?.setAttribute('aria-label', stateName === 'minimized' ? 'Restore' : 'Minimize');
}

/** Registry-level API; pass the .window element explicitly. Unknown names throw. */
export const windowApi = componentState({
  component: 'window',
  states: windowStates,
  apply: (w, state) => {
    w.dataset.stateName = state.name;
    triggerStateChange(w, state.name, state.config);
  },
  read: (w, state) => {
    // the dialog is the truth: closed the moment it closes, before the
    // queued close event updates data-state-name
    const name = !w.open ? 'closed' : w.dataset.stateName || 'default';
    return { name, config: name === 'closed' ? {} : state.config };
  },
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.windowApi = windowApi;
df$.windowStates = windowStates;

/** Title-bar dragging: pointer capture, so a fast drag never loses the window. */
function bindDrag(w, bar) {
  bar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button, a, input, select, textarea')) return;
    raise(w);
    if (w.hasAttribute('data-maximized')) return;
    e.preventDefault();
    const start = posOf(w);
    const sx = e.clientX, sy = e.clientY;
    bar.setPointerCapture(e.pointerId);
    w.setAttribute('data-dragging', '');
    const onMove = (m) => moveTo(w, start.x + m.clientX - sx, start.y + m.clientY - sy);
    const onUp = () => {
      bar.removeEventListener('pointermove', onMove);
      bar.removeEventListener('pointerup', onUp);
      bar.removeEventListener('pointercancel', onUp);
      w.removeAttribute('data-dragging');
      // Fires after a window was dragged (or moved with the keyboard) - its position.
      w.dispatchEvent(new CustomEvent<WindowPosition>('window-move', { bubbles: true, detail: posOf(w) }));
    };
    bar.addEventListener('pointermove', onMove);
    bar.addEventListener('pointerup', onUp);
    bar.addEventListener('pointercancel', onUp);
  });

  // double-click the bar: maximize / restore, like every desktop
  bar.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    windowApi.setState(w, w.hasAttribute('data-maximized') ? 'default' : 'maximized', {});
  });

  // keyboard: the bar is focusable; arrows move (Shift = bigger steps)
  bar.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 64 : 16;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d || w.hasAttribute('data-maximized') || e.target !== bar) return;
    e.preventDefault();
    const p = posOf(w);
    moveTo(w, p.x + d[0], p.y + d[1]);
    w.dispatchEvent(new CustomEvent<WindowPosition>('window-move', { bubbles: true, detail: posOf(w) }));
  });
}

function init() {
  dfDollar('dialog.window:not([data-init])').toArray().forEach((w) => {
    w.dataset.init = '';
    const bar = dfDollar(w).find(':scope > .window-titlebar').get(0);
    if (bar) {
      if (!bar.hasAttribute('tabindex')) bar.tabIndex = 0;
      bindDrag(w, bar);
    }
    if (!w.hasAttribute('aria-labelledby') && !w.hasAttribute('aria-label')) {
      const title = dfDollar(w).find('.window-title').get(0);
      if (title) {
        if (!title.id) title.id = `window-title-${Math.random().toString(36).slice(2, 8)}`;
        w.setAttribute('aria-labelledby', title.id);
      }
    }

    // any press inside a window brings it to the front (capture: before
    // the content handles it); so does focus arriving by keyboard
    w.addEventListener('pointerdown', () => raise(w), true);
    w.addEventListener('focusin', () => raise(w));

    dfDollar(w).find('.window-maximize').get(0)?.addEventListener('click', () =>
      windowApi.setState(w, w.hasAttribute('data-maximized') ? 'default' : 'maximized', {}));
    // the × closes through the API too: the native form submit already
    // does it, but a page that cancels submits (a sandbox, a SPA) must not
    // strand the window open
    dfDollar(w).find('.window-close').get(0)?.addEventListener('click', (e) => {
      e.preventDefault();
      windowApi.setState(w, 'closed', {});
    });
    dfDollar(w).find('.window-minimize').get(0)?.addEventListener('click', () =>
      windowApi.setState(w, w.hasAttribute('data-minimized') ? 'default' : 'minimized', {}));

    // however it closed - the × (form method="dialog"), Escape-less
    // close(), the API - the state follows the dialog
    w.addEventListener('close', () => {
      // the event is queued: a window reopened meanwhile stays open
      if (w.open) return;
      w.dataset.stateName = 'closed';
      w.removeAttribute('data-active');
      w.removeAttribute('data-maximized');
      w.removeAttribute('data-minimized');
      activateTopmost();
    });

    // el.store + el.api (AGENTS.md "State through stores")

    bindComponent(w, windowApi);

    const initial = !w.open ? 'closed' : w.hasAttribute('data-maximized') ? 'maximized' : w.hasAttribute('data-minimized') ? 'minimized' : 'default';
    w.dataset.stateName = initial;
    // the buttons name what they do in the state the window starts in (an
    // authored maximized window's button restores it)
    dfDollar(w).find('.window-maximize').attr('aria-label', initial === 'maximized' ? 'Restore' : 'Maximize');
    dfDollar(w).find('.window-minimize').attr('aria-label', initial === 'minimized' ? 'Restore' : 'Minimize');
    if (w.open) {
      w.style.zIndex = String(++topZ);
      // the last authored open window starts active
      dfDollar('.window[data-active]').toArray().forEach((o) => o.removeAttribute('data-active'));
      w.setAttribute('data-active', '');
    }
  });
}

/**
 * Builds a window element from options - the shape the skill documents.
 * @param options - title, body, place, size, look and where it opens
 * @returns the new window (a <dialog class="window">), open unless focus is false
 */
function create(options: WindowCreateOptions = {}): HTMLDialogElement {
  const {
    title = 'Untitled', icon, content, html, statusbar, id,
    x, y, width, height, chrome, resizable = true, parent, focus = true, flush = false,
  } = options;
  const host = resolve(parent) ?? dfDollar('.window-desktop').get(0) ?? document.body;
  const w = document.createElement('dialog');
  w.className = 'window';
  if (id) w.id = id;
  if (chrome) w.dataset.chrome = chrome;
  if (resizable) w.setAttribute('data-resizable', '');
  const count = dfDollar(host).find(':scope > .window').toArray().length;
  w.style.setProperty('--window-x', typeof x === 'number' ? `${x}px` : x ?? `${24 + (count % 8) * 28}px`);
  w.style.setProperty('--window-y', typeof y === 'number' ? `${y}px` : y ?? `${24 + (count % 8) * 28}px`);
  if (width !== undefined) w.style.setProperty('--window-w', typeof width === 'number' ? `${width}px` : width);
  if (height !== undefined) w.style.setProperty('--window-h', typeof height === 'number' ? `${height}px` : height);

  const bar = document.createElement('header');
  bar.className = 'window-titlebar';
  if (icon) {
    const i = document.createElement('i');
    i.className = 'window-icon';
    i.setAttribute('data-lucide', icon);
    bar.append(i);
  }
  const h = document.createElement('h2');
  h.className = 'window-title';
  h.textContent = title;
  const controls = document.createElement('form');
  controls.method = 'dialog';
  controls.className = 'window-controls';
  for (const [cls, label, type] of [['window-minimize', 'Minimize', 'button'], ['window-maximize', 'Maximize', 'button'], ['window-close', 'Close', 'submit']]) {
    const b = document.createElement('button');
    b.type = type;
    b.className = cls;
    b.setAttribute('aria-label', label);
    controls.append(b);
  }
  bar.append(h, controls);

  const body = document.createElement('div');
  body.className = 'window-body';
  if (flush) body.setAttribute('data-flush', '');
  if (content instanceof Node) body.append(content);
  else if (typeof html === 'string') body.append(document.createRange().createContextualFragment(html));
  else if (content !== undefined) body.textContent = String(content);
  w.append(bar, body);

  if (statusbar !== undefined) {
    const s = document.createElement('footer');
    s.className = 'window-statusbar';
    s.textContent = String(statusbar);
    w.append(s);
  }

  host.append(w);
  init();
  showQuietly(w);
  if (focus) windowApi.setState(w, 'default', {});
  if (icon) globalThis.lucide?.createIcons?.();
  return w;
}

/**
 * Windows (open unless `all`) inside `scope` (default: the page).
 * @param scope - a desktop element, its id or a selector (default: the page)
 * @param all - true: closed windows too
 * @returns the windows, in document order
 */
const list = (scope?: HTMLElement | string, all: boolean = false): HTMLDialogElement[] =>
  dfDollar(resolve(scope) ?? document).find(all ? '.window' : '.window[open]').toArray();

/**
 * Steps the open windows diagonally from the top-left, front-most last.
 * @param scope - a desktop element, its id or a selector (default: the page)
 * @param step - px between two windows (default 28)
 */
function cascade(scope?: HTMLElement | string, step: number = 28): void {
  list(scope)
    .sort((a, b) => Number(a.style.zIndex || 0) - Number(b.style.zIndex || 0))
    .forEach((w, i) => { windowApi.setState(w, 'default', {}); moveTo(w, 16 + i * step, 16 + i * step); });
}

/**
 * Lays the open windows side by side in a grid that fills their desktop.
 * @param scope - a desktop element, its id or a selector (default: the page)
 */
function tile(scope?: HTMLElement | string): void {
  const wins = list(scope);
  if (!wins.length) return;
  const cols = Math.ceil(Math.sqrt(wins.length));
  const rows = Math.ceil(wins.length / cols);
  wins.forEach((w, i) => {
    windowApi.setState(w, 'default', {});
    const p = w.offsetParent;
    if (!p) return;
    const cw = p.clientWidth / cols, ch = p.clientHeight / rows;
    w.style.width = '';
    w.style.height = '';
    w.style.setProperty('--window-w', `${Math.floor(cw)}px`);
    w.style.setProperty('--window-h', `${Math.floor(ch)}px`);
    moveTo(w, (i % cols) * cw, Math.floor(i / cols) * ch);
  });
}

// the imperative API: df$.shadcn.win.* - every method takes an element,
// an id or a selector
/** df$.shadcn.win - create, arrange and drive windows. */
export const windowActions = {
  create,
  /**
   * Open a window (closed, minimized or not shown yet) - config is the state's config.
   * @param target - the .window element, its id or a selector
   * @param config - where it opens: { x, y } px
   * @returns the window, null when the target matches none
   */
  open: (target: string | HTMLElement, config: { x?: number; y?: number } = {}): HTMLDialogElement | null => { const w = resolve(target); if (w) windowApi.setState(w, 'default', config); return w; },
  /**
   * Close it (the closed state).
   * @param target - the .window element, its id or a selector
   * @returns the window, null when the target matches none
   */
  close: (target: string | HTMLElement): HTMLDialogElement | null => { const w = resolve(target); if (w) windowApi.setState(w, 'closed', {}); return w; },
  /**
   * Bring it to the front (the active window).
   * @param target - the .window element, its id or a selector
   * @returns the window, null when the target matches none
   */
  focus: (target: string | HTMLElement): HTMLDialogElement | null => { const w = resolve(target); if (w?.open) raise(w); return w; },
  /**
   * Move it to x, y (px, inside its desktop).
   * @param target - the .window element, its id or a selector
   * @param x - the left edge, px
   * @param y - the top edge, px
   * @returns where it landed (kept reachable inside its desktop), null when the target matches none
   */
  move: (target: string | HTMLElement, x: number, y: number): WindowPosition | null => { const w = resolve(target); return w ? moveTo(w, x, y) : null; },
  /**
   * Size it: width (and height) as px numbers or CSS lengths.
   * @param target - the .window element, its id or a selector
   * @param width - px, or a CSS length
   * @param height - px, or a CSS length; omitted, the height stays
   * @returns the window, null when the target matches none
   */
  resize: (target: string | HTMLElement, width: number | string, height?: number | string): HTMLDialogElement | null => {
    const w = resolve(target);
    if (!w) return null;
    w.style.width = '';
    w.style.height = '';
    w.style.setProperty('--window-w', typeof width === 'number' ? `${width}px` : width);
    if (height !== undefined) w.style.setProperty('--window-h', typeof height === 'number' ? `${height}px` : height);
    return w;
  },
  /**
   * Fill the desktop.
   * @param target - the .window element, its id or a selector
   * @returns the window, null when the target matches none
   */
  maximize: (target: string | HTMLElement): HTMLDialogElement | null => { const w = resolve(target); if (w) windowApi.setState(w, 'maximized', {}); return w; },
  /**
   * Minimize it to the taskbar.
   * @param target - the .window element, its id or a selector
   * @returns the window, null when the target matches none
   */
  minimize: (target: string | HTMLElement): HTMLDialogElement | null => { const w = resolve(target); if (w) windowApi.setState(w, 'minimized', {}); return w; },
  /**
   * Back to its normal size and place.
   * @param target - the .window element, its id or a selector
   * @returns the window, null when the target matches none
   */
  restore: (target: string | HTMLElement): HTMLDialogElement | null => { const w = resolve(target); if (w) windowApi.setState(w, 'default', {}); return w; },
  /**
   * Maximize it, or restore it when it is maximized.
   * @param target - the .window element, its id or a selector
   * @returns the window, null when the target matches none
   */
  toggleMaximize: (target: string | HTMLElement): HTMLDialogElement | null => {
    const w = resolve(target);
    if (w) windowApi.setState(w, w.hasAttribute('data-maximized') ? 'default' : 'maximized', {});
    return w;
  },
  /**
   * The window in front.
   * @returns the active open window, undefined when none is open
   */
  active: (): HTMLDialogElement | undefined => dfDollar('.window[open][data-active]').get(0),
  list,
  cascade,
  tile,
};
df$.win = windowActions;

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
