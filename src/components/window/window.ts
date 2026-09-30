// -- Window -----------------------------------------------------
// A desktop-style window on a non-modal <dialog>: the browser owns open /
// close (the × is a <form method="dialog"> submit, so it works without
// script) and the close event; this runtime adds what it cannot do - moving
// the window by its title bar (pointer capture, arrow keys), raising the
// clicked window to the front, maximize / minimize - plus the named-state
// API (AGENTS.md "State API") and the imperative df$.shadcn.win.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

const windowStates = ['default', 'maximized', 'minimized', 'closed'];

/** Stacking order is shared by every window on the page - a counter, not state. */
let topZ = 10;

/** How much of a window must stay inside its desktop, so it can be grabbed back. */
const KEEP = 48;

const resolve = (target) =>
  typeof target === 'string'
    ? document.getElementById(target) ?? document.querySelector(target)
    : target;

const titleOf = (w) => w.querySelector('.window-title')?.textContent?.trim() ?? '';

/** The window's position inside its desktop, in px. */
const posOf = (w) => ({ x: w.offsetLeft, y: w.offsetTop });

/**
 * Moves a window, keeping it reachable: at least KEEP px of GRABBABLE title
 * bar stay inside the desktop - the controls don't count, so a window pushed
 * to an edge never shows only its buttons.
 */
function moveTo(w, x, y) {
  const parent = w.offsetParent;
  const bar = w.querySelector('.window-titlebar');
  if (parent) {
    const ctl = w.querySelector('.window-controls')?.offsetWidth ?? 0;
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
  document.querySelectorAll('.window[data-active]').forEach((o) => { if (o !== w) o.removeAttribute('data-active'); });
  w.setAttribute('data-active', '');
  w.dispatchEvent(new CustomEvent('window-focus', { bubbles: true, detail: { title: titleOf(w) } }));
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
  const open = Array.from(document.querySelectorAll('.window[open]'));
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
 * UI side of setState. 'default' = open, normal size (opens a closed
 * window; `{ x, y }` moves it); 'maximized' fills the desktop; 'minimized'
 * rolls it up to its title bar; 'closed' closes the dialog.
 */
function triggerStateChange(w, stateName, config) {
  const maxBtn = w.querySelector('.window-maximize');
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
      break;
  }
  if (maxBtn) maxBtn.setAttribute('aria-label', stateName === 'maximized' ? 'Restore' : 'Maximize');
  w.querySelector('.window-minimize')?.setAttribute('aria-label', stateName === 'minimized' ? 'Restore' : 'Minimize');
}

/** Registry-level API; pass the .window element explicitly. Unknown names throw. */
export const windowApi = {
  setState(w, stateName, config = {}) {
    if (!windowStates.includes(stateName)) {
      throw new Error(`window: unknown state "${stateName}" (supported: ${windowStates.join(', ')})`);
    }
    w.dataset.stateName = stateName;
    w._stateConfig = config;
    triggerStateChange(w, stateName, config);
  },
  getState(w) {
    // the dialog is the truth: closed the moment it closes, before the
    // queued close event updates data-state-name
    const name = !w.open ? 'closed' : w.dataset.stateName || 'default';
    return { name, config: name === 'closed' ? {} : w._stateConfig ?? {} };
  },
};

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
      w.dispatchEvent(new CustomEvent('window-move', { bubbles: true, detail: posOf(w) }));
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
    w.dispatchEvent(new CustomEvent('window-move', { bubbles: true, detail: posOf(w) }));
  });
}

function init() {
  document.querySelectorAll('dialog.window:not([data-init])').forEach((w) => {
    w.dataset.init = '';
    const bar = w.querySelector(':scope > .window-titlebar');
    if (bar) {
      if (!bar.hasAttribute('tabindex')) bar.tabIndex = 0;
      bindDrag(w, bar);
    }
    if (!w.hasAttribute('aria-labelledby') && !w.hasAttribute('aria-label')) {
      const title = w.querySelector('.window-title');
      if (title) {
        if (!title.id) title.id = `window-title-${Math.random().toString(36).slice(2, 8)}`;
        w.setAttribute('aria-labelledby', title.id);
      }
    }

    // any press inside a window brings it to the front (capture: before
    // the content handles it); so does focus arriving by keyboard
    w.addEventListener('pointerdown', () => raise(w), true);
    w.addEventListener('focusin', () => raise(w));

    w.querySelector('.window-maximize')?.addEventListener('click', () =>
      windowApi.setState(w, w.hasAttribute('data-maximized') ? 'default' : 'maximized', {}));
    // the × closes through the API too: the native form submit already
    // does it, but a page that cancels submits (a sandbox, a SPA) must not
    // strand the window open
    w.querySelector('.window-close')?.addEventListener('click', (e) => {
      e.preventDefault();
      windowApi.setState(w, 'closed', {});
    });
    w.querySelector('.window-minimize')?.addEventListener('click', () =>
      windowApi.setState(w, w.hasAttribute('data-minimized') ? 'default' : 'minimized', {}));

    // however it closed - the × (form method="dialog"), Escape-less
    // close(), the API - the state follows the dialog
    w.addEventListener('close', () => {
      // the event is queued: a window reopened meanwhile stays open
      if (w.open) return;
      w.dataset.stateName = 'closed';
      w.removeAttribute('data-active');
      activateTopmost();
    });

    w.api = {
      setState: (stateName, config) => windowApi.setState(w, stateName, config),
      getState: () => windowApi.getState(w),
    };

    const initial = !w.open ? 'closed' : w.hasAttribute('data-maximized') ? 'maximized' : w.hasAttribute('data-minimized') ? 'minimized' : 'default';
    w.dataset.stateName = initial;
    if (w.open) {
      w.style.zIndex = String(++topZ);
      // the last authored open window starts active
      document.querySelectorAll('.window[data-active]').forEach((o) => o.removeAttribute('data-active'));
      w.setAttribute('data-active', '');
    }
  });
}

/** Builds a window element from options - the shape the skill documents. */
function create(options = {}) {
  const {
    title = 'Untitled', icon, content, html, statusbar, id,
    x, y, width, height, chrome, resizable = true, parent, focus = true, flush = false,
  } = options;
  const host = resolve(parent) ?? document.querySelector('.window-desktop') ?? document.body;
  const w = document.createElement('dialog');
  w.className = 'window';
  if (id) w.id = id;
  if (chrome) w.dataset.chrome = chrome;
  if (resizable) w.setAttribute('data-resizable', '');
  const count = host.querySelectorAll(':scope > .window').length;
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

/** Windows (open unless `all`) inside `scope` (default: the page). */
const list = (scope, all = false) =>
  Array.from((resolve(scope) ?? document).querySelectorAll(all ? '.window' : '.window[open]'));

/** Steps the open windows diagonally from the top-left, front-most last. */
function cascade(scope, step = 28) {
  list(scope)
    .sort((a, b) => Number(a.style.zIndex || 0) - Number(b.style.zIndex || 0))
    .forEach((w, i) => { windowApi.setState(w, 'default', {}); moveTo(w, 16 + i * step, 16 + i * step); });
}

/** Lays the open windows side by side in a grid that fills their desktop. */
function tile(scope) {
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
df$.win = {
  create,
  open: (t, config = {}) => { const w = resolve(t); if (w) windowApi.setState(w, 'default', config); return w; },
  close: (t) => { const w = resolve(t); if (w) windowApi.setState(w, 'closed', {}); return w; },
  focus: (t) => { const w = resolve(t); if (w?.open) raise(w); return w; },
  move: (t, x, y) => { const w = resolve(t); return w ? moveTo(w, x, y) : null; },
  resize: (t, width, height) => {
    const w = resolve(t);
    if (!w) return null;
    w.style.width = '';
    w.style.height = '';
    w.style.setProperty('--window-w', typeof width === 'number' ? `${width}px` : width);
    if (height !== undefined) w.style.setProperty('--window-h', typeof height === 'number' ? `${height}px` : height);
    return w;
  },
  maximize: (t) => { const w = resolve(t); if (w) windowApi.setState(w, 'maximized', {}); return w; },
  minimize: (t) => { const w = resolve(t); if (w) windowApi.setState(w, 'minimized', {}); return w; },
  restore: (t) => { const w = resolve(t); if (w) windowApi.setState(w, 'default', {}); return w; },
  toggleMaximize: (t) => {
    const w = resolve(t);
    if (w) windowApi.setState(w, w.hasAttribute('data-maximized') ? 'default' : 'maximized', {});
    return w;
  },
  active: () => document.querySelector('.window[open][data-active]'),
  list,
  cascade,
  tile,
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
