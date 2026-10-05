/**
 * Why: every interactive component needs the same preamble (the df$.shadcn
 * registry + `$` query alias). Single-sourced here instead of duplicated in 28
 * files; the implementation is emitted ONCE inside core (§2 of
 * plans/defuss-query-morph-integration.md) - the component build binds imports to
 * the installed df$.shadcn.shared functions instead of inlining copies.
 * Contract: AGENTS.md "State API"; types: src/types/defuss-shadcn.d.ts.
 *
 * NOTE on names: components keep `const df$ = defussGlobals()` - that local
 * `df$` IS the df$.shadcn registry namespace, NOT the global callable factory.
 */
import { defussQuery } from './query.js';

export { defussQuery } from './query.js';
// the shared global-key API - components register document-level keyboard
// handlers through one flag-guarded listener instead of hand-rolling their own
export { bindGlobalKeys, isEditableTarget, type GlobalKeyHandler, type GlobalKeyOptions } from './keys.js';

// the presentation machinery rides the same binding path: components import it
// from this module, build.ts rewrites the import into df$.shadcn.shared
// bindings, and core's ddf$ install publishes the identical functions.
export {
  animateCount,
  clampIndex,
  coerceIndex,
  presentationScope,
  revealAttr,
  REVEAL_DIRECTIONS,
  type CountOptions,
  type PresentationScope,
  type RevealDirection,
} from './presentation.js';
// the motion controller rides the same binding path (df$.shadcn.shared) —
// the deck runtime uses it to replay entrances/draw-ins on slide activation
export { draw, entrance, type MotionOptions } from './motion.js';
// the imperative animation engine too - components (the animation canvas)
// play data-attribute-declared animations through the same registry agents
// reach as df$.anim
export { anim, animChannel, type AnimOptions, type AnimRegistry } from './anim.js';
// the render() half of the State API: snapshot the authored markup, rebuild
// it with a state applied (AGENTS.md "State API" → render)
export { elementModel, renderModel, RUNTIME_ATTRS, type ElementModel } from './render.js';
// the State API itself, built once on a defuss-store store per element
// (AGENTS.md "State through stores")
export { componentState, bindComponent, unbindComponent, type ComponentApi, type ComponentState, type StateSpec } from './component-state.js';
export { createStore, computed, persisted, reload, forget, persistOk, viewPersistence, type ViewPersistence } from './store.js';
// the big-data layer: a cached query source over defuss-dataview + the
// windowing maths (virtual list, data tree, data grid)
export { dataSource, parseFilter, filterText, cycleSort, type DataSource, type DataQuery, type DataResult, type TreeFields } from './dataview.js';
export { virtualWindow, sizerHeight, scrollTopFor, scrollIntoViewTop, MAX_SIZER_PX, OVERSCAN, type VirtualWindow } from './virtual.js';
// the theme resource loader too (the theme-switcher applies a theme's font
// <link>s through it right after mounting the theme stylesheet)
export { loadTheme, clearThemeLinks, type ThemeLinkNode } from './theme-links.js';

/**
 * Why: ensures our OWN sub-namespace on the installed runtime - never creates,
 * replaces or patches `df$` itself (core owns that, §2.1). Throws the shared
 * load-order error when core has not run, so a component loaded standalone
 * fails before any registry write or DOM mutation.
 */
export function defussGlobals(): DefussShadcnRegistry {
  const runtime = defussQuery() as ReturnType<typeof defussQuery> & {
    shadcn?: DefussShadcnRegistry;
  };
  const registry = (runtime.shadcn ??= {});
  if (typeof globalThis.$ !== 'function') globalThis.$ = document.querySelector.bind(document);
  return registry;
}

/**
 * Why: calling showPopover() on a popover while its exit transition is still
 * running - the exact setState('open') path right after a light dismiss,
 * whose display:none is delayed by `transition: display … allow-discrete` —
 * crashes the headless renderer (reproduced: headless Chromium dies outright,
 * popover + nav-menu + dropdown + tooltip share the CSS pattern). Wait until
 * the element's computed display has actually flipped to none (the exit
 * committed), then show. A stable-open element polls to the cap and the
 * guarded showPopover() is a harmless no-op. Emitted once inside core.
 */
export function safeShowPopover(el: HTMLElement): void {
  const show = (): void => {
    try { el.showPopover(); } catch { /* already open */ }
  };
  const displayed = (): boolean => getComputedStyle(el).display !== 'none';
  if (!displayed()) {
    show();
    return;
  }
  // displayed: either stably open (nothing to do) or mid-exit (must wait).
  // Cap the poll at ~500ms - longer than any component's exit transition.
  const deadline = performance.now() + 500;
  const tick = (): void => {
    if (!displayed() || performance.now() > deadline) show();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
