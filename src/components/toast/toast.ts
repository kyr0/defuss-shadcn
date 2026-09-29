// -- Toast -----------------------------------------------------
// Programmatic toast notification API.
// Exposes df$.toast with show/success/warning/info/error/dismiss
// (AGENTS.md "No window globals" - everything lives under the one namespace).
// Named-state API (AGENTS.md "State API") bound to the region container:
// its observable state is which toasts are visible, so 'default' clears the
// region (same code path as toast.dismiss()) and getState() reports
// the live toast count.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
// defussQuery: the callable runtime for toast mounting/lifecycle (§3 of the
// morph integration plan - mount via query .append(), dismiss via .remove()).
// anim: the shared engine (df$.anim) - toasts can enter / leave with any of
// its named animations (options.animation)
import { defussGlobals, defussQuery, anim } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const toastStates = ['default'];

/**
 * UI side of setState: 'default' dismisses every visible toast, returning
 * the region to its authored (empty) state.
 */
function triggerStateChange(container, stateName, _config) {
  if (stateName !== 'default') return;
  container.querySelectorAll('.toast').forEach((el) => toastDismiss(el));
}

/** Registry-level API; pass the container explicitly. Unknown names throw. */
export const toastApi = {
  setState(container, stateName, config = {}) {
    if (!toastStates.includes(stateName)) {
      throw new Error(`toast: unknown state "${stateName}" (supported: ${toastStates.join(', ')})`);
    }
    triggerStateChange(container, stateName, config);
    // state lives on the ELEMENT, not the module (one region per page, but
    // SPA navigation may replace it)
    container.dataset.stateName = stateName;
    container._stateConfig = config;
  },
  getState(container) {
    return {
      name: container.dataset.stateName || 'default',
      // live count - reflects df$.toast.show() and auto-dismiss, not just setState
      config: { ...container._stateConfig, count: container.querySelectorAll('.toast').length },
    };
  },
};

df$.toastApi = toastApi;
df$.toastStates = toastStates;

const DURATION = 4000;
const MAX_VISIBLE = 3;

// Per-toast callbacks live in a WeakMap so the container's ONE delegated
// click listener can find them - dynamically created toasts never get their
// own listeners, so no per-element cleanup is ever needed.
const toastCallbacks = new WeakMap();

let toastContainer = document.getElementById('toast-container');
if (!toastContainer) {
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.className = 'toast-container';
  toastContainer.setAttribute('aria-label', 'Notifications');
  toastContainer.setAttribute('data-position', 'bottom-right');
  dfDollar(document.body).append(toastContainer); // query's exact mount op (§5.1)
}

/** Stack offset for each visible toast: toasts render in the top layer
 * (popover="manual"), so the container's flex layout can't position them —
 * CSS pins each to the corner and reads --toast-stack, which we measure here
 * (px of newer toasts below it + 0.5rem gaps, matching the container gap). */
const stackToasts = (container) => {
  const toasts = [...container.querySelectorAll('.toast:not([data-leaving])')];
  // pile (configure({ stack: 'pile' })): only the newest shows, the others
  // sit behind it - drawn as the shapes.css stack-* sheets on the newest -
  // until the pointer / focus enters the pile, which fans it out as a list
  const piled = container.dataset.stack === 'pile' && !container.hasAttribute('data-expanded') && toasts.length > 1;
  const top = (container.dataset.position || '').startsWith('top');
  const sheets = top ? 'stack-bottom' : 'stack-top';
  let offset = 0;
  // newest nearest the corner in a pile / expanded pile, oldest nearest in a list
  const order = container.dataset.stack === 'pile' ? [...toasts].reverse() : toasts;
  order.forEach((t, i) => {
    const newest = i === 0;
    t.style.setProperty('--toast-stack', `${piled ? 0 : offset}px`);
    t.toggleAttribute('data-piled', piled && !newest);
    t.classList.toggle(sheets, piled && newest);
    if (piled && newest) t.dataset.more = String(toasts.length - 1);
    else delete t.dataset.more;
    if (!piled) offset += t.getBoundingClientRect().height + 8;
  });
};

const toastDismiss = (el, callback) => {
  if (!el || !el.parentNode || el.hasAttribute('data-leaving')) return;
  const container = el.parentNode;
  const out = el._animation?.out;
  if (out && anim[out]) {
    el.setAttribute('data-leaving', '');
    stackToasts(container);
    anim[out].play(el, { duration: el._animation.duration ?? 350, direction: el._animation.direction }).finished.then(() => {
      try { el.hidePopover(); } catch {}
      dfDollar(el).remove();
      stackToasts(container);
      if (callback) callback();
    });
    return;
  }
  el.animate(
    [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(0.5rem)' }],
    { duration: 200, easing: 'ease', fill: 'forwards' }
  // dismissal through query's exact .remove() - AFTER the exit animation and
  // popover teardown (§5.2: removal still disposes owned state first)
  ).finished.then(() => { try { el.hidePopover(); } catch {} dfDollar(el).remove(); stackToasts(container); if (callback) callback(); });
};

const toastCreate = (options) => {
  const o = typeof options === 'string' ? { title: options } : options;
  const { title, description, variant, action, onDismiss, size, density, animation, aura } = o;
  const duration = o.duration != null ? o.duration : DURATION;
  const el = document.createElement('div'); el.className = 'toast';
  el.setAttribute('role', variant === 'destructive' ? 'alert' : 'status');
  el.setAttribute('aria-live', variant === 'destructive' ? 'assertive' : 'polite');
  el.setAttribute('aria-atomic', 'true'); el.setAttribute('popover', 'manual');
  if (variant) el.setAttribute('data-variant', variant);
  // size/density are pure CSS axes (width envelope / whitespace policy) —
  // forward them as data attributes the component stylesheet understands
  if (size) el.setAttribute('data-size', size);
  if (density) el.setAttribute('data-density', density);
  const icons = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    destructive: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>'
  };
  // Build toast DOM (§5.1 boundary: static icon markup rides query .html(),
  // user-supplied title/description stay literal text via .text() - never an
  // HTML sink, §5.2; insertions go through query's exact .append() ops)
  const contentEl = document.createElement('div');
  contentEl.className = 'toast-content';
  if (variant && icons[variant]) {
    // the query factory parses a leading-`<` string as markup (§5.2) - the
    // trusted static icon flows in through one query append op
    dfDollar(contentEl).append(dfDollar(icons[variant]));
  }
  const textDiv = document.createElement('div');
  textDiv.className = 'toast-text';
  if (title) { const p = document.createElement('p'); p.className = 'toast-title'; dfDollar(p).text(title); dfDollar(textDiv).append(p); }
  if (description) { const p = document.createElement('p'); p.className = 'toast-description'; dfDollar(p).text(description); dfDollar(textDiv).append(p); }
  dfDollar(contentEl).append(textDiv);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close'; closeBtn.setAttribute('aria-label', 'Dismiss'); closeBtn.dataset.toastClose = '';
  dfDollar(closeBtn).html('<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>');
  dfDollar(contentEl).append(closeBtn);
  // aura: the toast becomes the ring of light (shapes.css .aura), its
  // content sits on an inner surface
  let host = el;
  if (aura) {
    const style = aura === true ? '' : String(aura);
    el.classList.add('aura', 'aura-md');
    if (style) el.classList.add(`aura-${style}`);
    el.dataset.aura = style || 'default';
    host = document.createElement('div');
    host.className = 'toast-surface';
    dfDollar(el).append(host);
  }
  dfDollar(host).append(contentEl);
  if (action) {
    const actionsDiv = document.createElement('div'); actionsDiv.className = 'toast-actions';
    const actionBtn = document.createElement('button'); actionBtn.className = 'btn';
    actionBtn.setAttribute('data-variant', 'outline'); actionBtn.setAttribute('data-size', 'sm'); actionBtn.dataset.toastAction = '';
    dfDollar(actionBtn).text(action.label); // literal action label (§5.2)
    dfDollar(actionsDiv).append(actionBtn); dfDollar(host).append(actionsDiv);
  }
  // mount through query's exact .append() - the node itself is inserted
  // (identity + delegated listeners kept, §3 toast row of the morph plan)
  // animation: { in, out, direction, duration } - names from df$.anim
  // (fadeIn, slideIn, popIn, zoomIn, flipIn, blurIn, …); the CSS entrance
  // stands down while a named one plays
  if (animation) {
    el._animation = typeof animation === 'string' ? { in: animation } : animation;
    el.dataset.anim = '';
  }
  dfDollar(toastContainer).append(el); el.showPopover();
  stackToasts(toastContainer);
  const inName = el._animation?.in;
  if (inName && anim[inName]) anim[inName].play(el, { duration: el._animation.duration ?? 450, direction: el._animation.direction });
  toastCallbacks.set(el, { onDismiss, action });
  if (duration !== Infinity) setTimeout(() => { toastDismiss(el, onDismiss); }, duration);
  const toasts = toastContainer.querySelectorAll('.toast');
  // a pile holds more (they are sheets, not screen space)
  if (toasts.length > (toastContainer.dataset.stack === 'pile' ? 6 : MAX_VISIBLE)) toastDismiss(toasts[0]);
  return el;
};

// Delegated wiring: close/action clicks on ANY toast (including ones created
// later) are handled by one listener on the container. Guarded per container
// with data-init and re-run by the MutationObserver, per the component
// lifecycle contract (AGENTS.md) - survives SPA navigation replacing the body.
function init() {
  document.querySelectorAll('#toast-container:not([data-init])').forEach((container) => {
    container.dataset.init = '';
    // bind-scope the api per region: `$('#toast-container').api.setState('default')`
    container.api = {
      setState: (stateName, config) => toastApi.setState(container, stateName, config),
      getState: () => toastApi.getState(container),
    };
    // a pile fans out while the pointer or focus is inside it
    const expand = (on) => {
      if (container.dataset.stack !== 'pile') return;
      clearTimeout(container._collapse);
      if (on) {
        if (!container.hasAttribute('data-expanded')) { container.setAttribute('data-expanded', ''); stackToasts(container); }
      } else {
        container._collapse = setTimeout(() => { container.removeAttribute('data-expanded'); stackToasts(container); }, 250);
      }
    };
    container.addEventListener('pointerover', (e) => { if (e.target.closest('.toast')) expand(true); });
    container.addEventListener('pointerout', (e) => { if (!e.relatedTarget?.closest?.('.toast')) expand(false); });
    container.addEventListener('focusin', () => expand(true));
    container.addEventListener('focusout', (e) => { if (!e.relatedTarget?.closest?.('.toast')) expand(false); });
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-toast-close],[data-toast-action]');
      if (!btn) return;
      const toast = btn.closest('.toast');
      if (!toast) return;
      const cb = toastCallbacks.get(toast) ?? {};
      if (btn.hasAttribute('data-toast-action')) { if (cb.action) cb.action.onClick(); toastDismiss(toast); }
      else toastDismiss(toast, cb.onDismiss);
    });
  });
}

init();
new MutationObserver(init).observe(document.body, { childList: true, subtree: true });

/** Region options: stack 'list' (default, every toast visible) or 'pile'
 * (the newest in front, the others as sheets behind it - hover / focus fans
 * them out); position = the corner (bottom-right, bottom-left, top-right,
 * top-left, top-center, bottom-center). */
const toastConfigure = (opts = {}) => {
  if (opts.stack) toastContainer.dataset.stack = opts.stack;
  if (opts.position) toastContainer.setAttribute('data-position', opts.position);
  stackToasts(toastContainer);
  return { stack: toastContainer.dataset.stack || 'list', position: toastContainer.dataset.position };
};

df$.toast = {
  configure: toastConfigure,
  show: toastCreate,
  success: (o) => toastCreate(Object.assign(typeof o === 'string' ? { title: o } : o, { variant: 'success' })),
  warning: (o) => toastCreate(Object.assign(typeof o === 'string' ? { title: o } : o, { variant: 'warning' })),
  info: (o) => toastCreate(Object.assign(typeof o === 'string' ? { title: o } : o, { variant: 'info' })),
  error: (o) => toastCreate(Object.assign(typeof o === 'string' ? { title: o } : o, { variant: 'destructive' })),
  dismiss: () => { toastContainer.querySelectorAll('.toast').forEach((el) => { toastDismiss(el); }); }
};
