/**
 * Why: every interactive component needs the same preamble (the df$.shadcn
 * registry + `$` query alias). Single-sourced here instead of duplicated in 28
 * files; the implementation is emitted ONCE inside core (§2 of
 * plans/defuss-query-morph-integration.md) — the component build binds imports to
 * the installed df$.shadcn.shared functions instead of inlining copies.
 * Contract: AGENTS.md "State API"; types: src/types/defuss-shadcn.d.ts.
 *
 * NOTE on names: components keep `const df$ = defussGlobals()` — that local
 * `df$` IS the df$.shadcn registry namespace, NOT the global callable factory.
 */
import { defussQuery } from './query.js';

export { defussQuery } from './query.js';

/**
 * Why: ensures our OWN sub-namespace on the installed runtime — never creates,
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
 * running — the exact setState('open') path right after a light dismiss,
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
  // Cap the poll at ~500ms — longer than any component's exit transition.
  const deadline = performance.now() + 500;
  const tick = (): void => {
    if (!displayed() || performance.now() > deadline) show();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
